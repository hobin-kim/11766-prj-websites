import os
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from sqlalchemy import text
from database import Base, engine, get_db
from models import Report, AppAccess
from parser import parse_ndjson
from llm import LLMClient

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Privacy Inspector API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_llm_client() -> LLMClient:
    api_key = os.environ.get("ANDREW_API_KEY", "sk-aC1WFE7UkEIwxdfUP34HUw")
    return LLMClient(api_key=api_key)


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #

class AppAccessOut(BaseModel):
    id: int
    bundle_id: str
    app_name: str
    categories: dict[str, int]
    access_count: int
    risk_score: float
    status: str
    analysis: str
    sample_entry: str | None
    model_config = {"from_attributes": True}


class ReportSummary(BaseModel):
    report_id: int
    filename: str
    uploaded_at: datetime
    app_count: int
    suspicious_count: int
    warning_count: int
    normal_count: int
    model_config = {"from_attributes": True}


class ReportOut(BaseModel):
    report_id: int
    filename: str
    uploaded_at: datetime
    app_accesses: list[AppAccessOut]
    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    report_id: int
    messages: list[dict]  # [{"role": "user"/"assistant", "content": "..."}]


class ChatResponse(BaseModel):
    reply: str


# --------------------------------------------------------------------------- #
# Analysis
# --------------------------------------------------------------------------- #

@app.post("/analyze", response_model=ReportOut)
async def analyze_report(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Pipeline:
      1. Receive NDJSON file
      2. parse_ndjson() → group by bundle_id, count category accesses
      3. LLM → risk_score, status, analysis text per app (one API call)
      4. SQLite → persist Report + AppAccess rows
      5. Return JSON → frontend navigates to /analysis?reportId=X
    """
    if not (file.filename or "").endswith((".ndjson", ".jsonl")):
        raise HTTPException(status_code=400, detail="Only .ndjson or .jsonl files are accepted.")

    raw_bytes = await file.read()
    try:
        content = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded.")

    if not content.strip():
        raise HTTPException(status_code=400, detail="File is empty.")

    parsed_apps = parse_ndjson(content)
    if not parsed_apps:
        raise HTTPException(status_code=422, detail="No privacy access entries found in file.")

    llm = get_llm_client()
    app_inputs = [
        {"bundle_id": a.bundle_id, "app_name": a.app_name,
         "categories": a.categories, "access_count": a.access_count}
        for a in parsed_apps
    ]
    try:
        llm_results = llm.analyze_apps(app_inputs)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM analysis failed: {e}")

    llm_by_id = {r["bundle_id"]: r for r in llm_results}

    report = Report(filename=file.filename, file_content=content)
    db.add(report)
    db.flush()

    app_accesses: list[AppAccess] = []
    for parsed, llm_res in zip(parsed_apps, llm_results):
        matched = llm_by_id.get(parsed.bundle_id, llm_res)
        record = AppAccess(
            report_id=report.id,
            bundle_id=parsed.bundle_id,
            app_name=parsed.app_name,
            categories=parsed.categories,
            access_count=parsed.access_count,
            risk_score=float(matched.get("risk_score", 5.0)),
            status=matched.get("status", "warning"),
            analysis=matched.get("analysis", ""),
            sample_entry=parsed.sample_entry,
        )
        db.add(record)
        app_accesses.append(record)

    db.commit()
    db.refresh(report)
    for r in app_accesses:
        db.refresh(r)

    app_accesses.sort(key=lambda a: a.risk_score, reverse=True)
    return ReportOut(
        report_id=report.id, filename=report.filename, uploaded_at=report.uploaded_at,
        app_accesses=[AppAccessOut.model_validate(a) for a in app_accesses],
    )


# --------------------------------------------------------------------------- #
# Reports CRUD
# --------------------------------------------------------------------------- #

@app.get("/reports", response_model=list[ReportSummary])
def list_reports(db: Session = Depends(get_db)):
    """Return a summary list of all analyzed reports."""
    reports = db.query(Report).order_by(Report.uploaded_at.desc()).all()
    return [
        ReportSummary(
            report_id=r.id, filename=r.filename, uploaded_at=r.uploaded_at,
            app_count=len(r.app_accesses),
            suspicious_count=sum(1 for a in r.app_accesses if a.status == "suspicious"),
            warning_count=sum(1 for a in r.app_accesses if a.status == "warning"),
            normal_count=sum(1 for a in r.app_accesses if a.status == "normal"),
        )
        for r in reports
    ]


@app.get("/reports/{report_id}", response_model=ReportOut)
def get_report(report_id: int, db: Session = Depends(get_db)):
    """Return a full report with all app access details."""
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    sorted_accesses = sorted(report.app_accesses, key=lambda a: a.risk_score, reverse=True)
    return ReportOut(
        report_id=report.id, filename=report.filename, uploaded_at=report.uploaded_at,
        app_accesses=[AppAccessOut.model_validate(a) for a in sorted_accesses],
    )


def _vacuum():
    """Run VACUUM on the SQLite file to reclaim disk space.
    Must be executed outside any transaction, so we use a raw autocommit connection."""
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text("VACUUM"))


@app.delete("/reports/{report_id}", status_code=204)
def delete_report(report_id: int, db: Session = Depends(get_db)):
    """Delete a single report and all its app access records, then compact the DB file."""
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    db.delete(report)
    db.commit()
    _vacuum()


@app.delete("/reports", status_code=204)
def delete_all_reports(db: Session = Depends(get_db)):
    """Delete every report in the database, then compact the DB file."""
    db.query(AppAccess).delete()
    db.query(Report).delete()
    db.commit()
    _vacuum()


@app.get("/reports/{report_id}/raw")
def get_report_raw(report_id: int, db: Session = Depends(get_db)):
    """Return the original NDJSON content — full context for the chatbot LLM."""
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    return {"report_id": report.id, "filename": report.filename, "content": report.file_content}


# --------------------------------------------------------------------------- #
# Chatbot
# --------------------------------------------------------------------------- #

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Answer a user question about their privacy report.
    Injects the full report analysis as LLM system prompt context.
    """
    report = db.get(Report, req.report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")

    app_accesses = [
        {
            "app_name": a.app_name,
            "bundle_id": a.bundle_id,
            "categories": a.categories,
            "access_count": a.access_count,
            "risk_score": a.risk_score,
            "status": a.status,
            "analysis": a.analysis,
        }
        for a in sorted(report.app_accesses, key=lambda a: a.risk_score, reverse=True)
    ]

    llm = get_llm_client()
    try:
        reply = llm.chat(app_accesses, req.messages)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM chat failed: {e}")

    return ChatResponse(reply=reply)


# --------------------------------------------------------------------------- #
# Admin UI
# --------------------------------------------------------------------------- #

ADMIN_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Privacy Inspector — Admin</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f8fafc;color:#1e293b}
  header{background:#fff;border-bottom:1px solid #e2e8f0;padding:16px 32px;display:flex;align-items:center;gap:12px}
  header h1{font-size:18px;font-weight:600}
  header span{font-size:13px;color:#64748b}
  main{max-width:1100px;margin:32px auto;padding:0 24px}

  /* Pipeline */
  .pipeline{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:28px}
  .pipeline h2{font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:16px}
  .steps{display:grid;grid-template-columns:1fr auto 1fr auto 1fr auto 1fr auto 1fr auto 1fr;align-items:start;gap:0 6px}
  .step-col{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0}
  .box{background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;font-size:11.5px;text-align:center;width:100%}
  .box.llm{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
  .box.db{background:#f0fdf4;border-color:#86efac;color:#15803d}
  .arrow{color:#94a3b8;font-size:13px;padding-top:7px;align-self:start}
  .step-desc{font-size:11px;color:#64748b;line-height:1.5;text-align:center}
  .step-desc strong{display:block;font-size:11px;color:#374151;margin-bottom:2px}

  /* Section header */
  .sec-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  .sec-title{font-size:15px;font-weight:600}
  .btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:7px;font-size:13px;cursor:pointer;border:none;font-weight:500;transition:background .15s}
  .btn-ghost{background:none;color:#64748b;border:1px solid #e2e8f0}
  .btn-ghost:hover{background:#f1f5f9}
  .btn-danger{background:#fee2e2;color:#b91c1c}
  .btn-danger:hover{background:#fecaca}
  .btn-sm{padding:4px 10px;font-size:12px}

  /* Table */
  table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
  th{text-align:left;padding:10px 16px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;background:#f8fafc;border-bottom:1px solid #e2e8f0}
  td{padding:11px 16px;font-size:13px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
  tr:last-child td{border-bottom:none}
  .report-row{cursor:pointer}
  .report-row:hover td{background:#f8fafc}
  .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:500}
  .badge.suspicious{background:#fee2e2;color:#b91c1c}
  .badge.warning{background:#fef9c3;color:#a16207}
  .badge.normal{background:#dcfce7;color:#15803d}

  /* Detail panel */
  .detail-row{display:none}
  .detail-row.open{display:table-row}
  .detail-cell{padding:0!important;background:#f8fafc}
  .detail-inner{padding:16px 20px;border-top:1px solid #e2e8f0}
  .app-grid{display:grid;gap:10px}
  .app-card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px}
  .app-card-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px}
  .app-name{font-size:14px;font-weight:500}
  .app-bundle{font-size:11px;color:#94a3b8;font-family:monospace}
  .cats{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}
  .cat{background:#e0f2fe;color:#0369a1;border-radius:4px;padding:2px 7px;font-size:11px}
  .analysis{font-size:12px;color:#475569;line-height:1.6}

  .empty{text-align:center;padding:48px;color:#94a3b8;font-size:13px}
  .chevron{display:inline-block;transition:transform .2s;font-style:normal}
  .chevron.open{transform:rotate(90deg)}

</style>
</head>
<body>
<header>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  <h1>Privacy Inspector</h1>
  <span>Admin</span>
</header>

<main>
  <div class="pipeline">
    <h2>Pipeline</h2>
    <div class="steps">
      <div class="step-col">
        <div class="box">① .ndjson upload</div>
        <div class="step-desc">User uploads the App Privacy Report file from the frontend</div>
      </div>
      <span class="arrow">→</span>
      <div class="step-col">
        <div class="box">② POST /analyze</div>
        <div class="step-desc">Frontend sends the file to the backend API to start analysis</div>
      </div>
      <span class="arrow">→</span>
      <div class="step-col">
        <div class="box">③ parser</div>
        <div class="step-desc">Parses the NDJSON file into structured data</div>
      </div>
      <span class="arrow">→</span>
      <div class="step-col">
        <div class="box llm">④ LLM API</div>
        <div class="step-desc">Sends parsed data to the LLM to generate analysis of app reports</div>
      </div>
      <span class="arrow">→</span>
      <div class="step-col">
        <div class="box db">⑤ SQLite</div>
        <div class="step-desc">Stores the report and all analysis results in a database</div>
      </div>
      <span class="arrow">→</span>
      <div class="step-col">
        <div class="box">⑥ Analysis Page</div>
        <div class="step-desc">Frontend displays the results; chatbot can also query the same report</div>
      </div>
    </div>
  </div>

  <div class="sec-header">
    <div class="sec-title" id="report-count">Reports</div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-ghost" onclick="loadReports()">↻ Refresh</button>
      <button class="btn btn-danger" onclick="deleteAll()">🗑 Delete All</button>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th></th>
        <th>ID</th>
        <th>Filename</th>
        <th>Uploaded</th>
        <th>Apps</th>
        <th>🔴</th><th>🟡</th><th>🟢</th>
        <th></th>
      </tr>
    </thead>
    <tbody id="body">
      <tr><td colspan="9" class="empty">Loading…</td></tr>
    </tbody>
  </table>
</main>

<script>
async function loadReports() {
  const body = document.getElementById('body');
  body.innerHTML = '<tr><td colspan="9" class="empty">Loading…</td></tr>';
  try {
    const reports = await fetchJSON('/reports');
    document.getElementById('report-count').textContent =
      `Reports (${reports.length})`;
    if (!reports.length) {
      body.innerHTML = '<tr><td colspan="9" class="empty">No reports yet.</td></tr>';
      return;
    }
    body.innerHTML = '';
    reports.forEach(r => {
      const chevronId = `chev-${r.report_id}`;
      const detailId  = `detail-${r.report_id}`;
      const row = makeEl('tr', 'report-row');
      row.innerHTML = `
        <td><i class="chevron" id="${chevronId}">›</i></td>
        <td><strong>#${r.report_id}</strong></td>
        <td>${r.filename}</td>
        <td>${new Date(r.uploaded_at).toLocaleString()}</td>
        <td>${r.app_count}</td>
        <td><span class="badge suspicious">${r.suspicious_count}</span></td>
        <td><span class="badge warning">${r.warning_count}</span></td>
        <td><span class="badge normal">${r.normal_count}</span></td>
        <td style="display:flex;gap:6px;flex-wrap:wrap">
          <a class="btn btn-ghost btn-sm" href="/admin/reports/${r.report_id}/raw" target="_blank" onclick="event.stopPropagation()">Raw</a>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteOne(${r.report_id})">Delete</button>
        </td>`;
      const detail = makeEl('tr', 'detail-row');
      detail.id = detailId;
      detail.innerHTML = `<td colspan="9" class="detail-cell">
        <div class="detail-inner" id="inner-${r.report_id}">Loading…</div></td>`;
      row.onclick = () => toggle(r.report_id);
      body.appendChild(row);
      body.appendChild(detail);
    });
  } catch(e) {
    body.innerHTML = `<tr><td colspan="9" class="empty">Error: ${e.message}</td></tr>`;
  }
}

async function toggle(id) {
  const detail  = document.getElementById(`detail-${id}`);
  const chevron = document.getElementById(`chev-${id}`);
  const isOpen  = detail.classList.contains('open');
  detail.classList.toggle('open', !isOpen);
  chevron.classList.toggle('open', !isOpen);
  if (!isOpen) {
    const inner = document.getElementById(`inner-${id}`);
    if (inner.textContent === 'Loading…') {
      const data = await fetchJSON(`/reports/${id}`);
      inner.innerHTML = renderApps(data.app_accesses);
    }
  }
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderApps(apps) {
  if (!apps.length) return '<p class="empty">No app data.</p>';
  return '<div class="app-grid">' + apps.map(a => {
    const cats = Object.entries(a.categories)
      .map(([k,v]) => `<span class="cat">${esc(k)} ×${v}</span>`).join('');
    return `<div class="app-card">
      <div class="app-card-header">
        <div>
          <div class="app-name">${esc(a.app_name)}</div>
          <div class="app-bundle">${esc(a.bundle_id)}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge ${esc(a.status)}">${esc(a.status)}</span>
          <span style="font-size:12px;color:#64748b">risk ${esc(a.risk_score)}</span>
        </div>
      </div>
      <div class="cats">${cats}</div>
      <div class="analysis">${esc(a.analysis)}</div>
    </div>`;
  }).join('') + '</div>';
}

async function deleteOne(id) {
  if (!confirm(`Delete report #${id}?`)) return;
  await fetch(`/reports/${id}`, { method: 'DELETE' });
  loadReports();
}

async function deleteAll() {
  if (!confirm('Delete ALL reports? This cannot be undone.')) return;
  await fetch('/reports', { method: 'DELETE' });
  loadReports();
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function makeEl(tag, cls) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}

loadReports();
</script>
</body>
</html>"""


@app.get("/", include_in_schema=False)
def root_redirect():
    return RedirectResponse(url="/admin")


@app.get("/admin", response_class=HTMLResponse, include_in_schema=False)
def admin_ui():
    return HTMLResponse(content=ADMIN_HTML)


@app.get("/admin/reports/{report_id}/raw", response_class=HTMLResponse, include_in_schema=False)
def admin_raw(report_id: int, db: Session = Depends(get_db)):
    """Serve raw NDJSON content as a pretty-printed HTML page."""
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")

    import json as _json
    lines_html = ""
    for line in report.file_content.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            pretty = _json.dumps(_json.loads(line), ensure_ascii=False, indent=2)
        except Exception:
            pretty = line
        # Escape HTML special characters
        pretty = pretty.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        lines_html += f'<pre class="entry">{pretty}</pre>\n'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Raw Report #{report_id} — {report.filename}</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0f172a;color:#e2e8f0;padding:24px}}
  header{{display:flex;align-items:center;gap:16px;margin-bottom:20px;flex-wrap:wrap}}
  h1{{font-size:15px;font-weight:600;color:#f8fafc}}
  .meta{{font-size:12px;color:#64748b}}
  a.back{{font-size:12px;color:#60a5fa;text-decoration:none;border:1px solid #1e3a5f;border-radius:6px;padding:5px 12px}}
  a.back:hover{{background:#1e3a5f}}
  .entry{{font-family:ui-monospace,monospace;font-size:11.5px;line-height:1.7;color:#94a3b8;
          white-space:pre-wrap;word-break:break-all;border-bottom:1px solid #1e293b;padding:12px 0}}
  .entry:last-child{{border-bottom:none}}
</style>
</head>
<body>
<header>
  <a class="back" href="/admin">← Admin</a>
  <h1>Report #{report_id} — {report.filename}</h1>
  <span class="meta">{report.uploaded_at.strftime("%Y-%m-%d %H:%M:%S")}</span>
</header>
{lines_html}
</body>
</html>"""
    return HTMLResponse(content=html)
