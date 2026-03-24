# Privacy Inspector

An iOS App Privacy Report analyzer. Upload your `.ndjson` report and get per-app risk scores, category breakdowns, and AI-generated analysis powered by GPT.

---

## Architecture

```
Frontend  (Vite + React)   →  http://localhost:5173
Backend   (FastAPI)        →  http://localhost:8000
Database  (SQLite)         →  backend/privacy_inspector.db  (auto-created)
LLM       (gpt-5-mini)     →  CMU AI Gateway
```

CORS is pre-configured — the frontend can call the backend without any extra setup.

---

## Backend Pipeline

```
① Frontend uploads .ndjson file
        ↓  POST /analyze
② parser.py  — parse lines, group by bundle_id, count category accesses
        ↓  structured JSON (no scores yet)
③ LLM call   — all apps sent in one request to gpt-5-mini
        ↓  risk_score (0–10), status, analysis text per app
④ SQLite     — Report row + one AppAccess row per app saved
        ↓  JSON response
⑤ Frontend navigates to /analysis?reportId={id}
```

---

## Running the Frontend

```bash
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Running the Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The backend starts at **http://localhost:8000**.
The SQLite database (`privacy_inspector.db`) is created automatically on first run.

The LLM API key is configured in `backend/llm.py`. You can also override it with an environment variable:

```bash
ANDREW_API_KEY=your_key_here uvicorn main:app --reload
```

---

## URLs

### Frontend

| Page | URL |
|------|-----|
| Upload | http://localhost:5173/ |
| Analysis | http://localhost:5173/analysis?reportId={id} |
| Chatbot | http://localhost:5173/chatbot?reportId={id} |

### Backend

| URL | Description |
|-----|-------------|
| http://localhost:8000/docs | Swagger UI — interactive API explorer |
| http://localhost:8000/redoc | ReDoc API documentation |
| http://localhost:8000/admin | **DB viewer** — browse all reports and analysis results |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/analyze` | Upload NDJSON → parse → LLM analysis → save to DB → return results |
| `GET` | `/reports` | List all analyzed reports (summary) |
| `GET` | `/reports/{id}` | Full report with all app access details |
| `GET` | `/reports/{id}/raw` | Original NDJSON content (used as LLM context for chatbot) |

---

## Database

SQLite stored at `backend/privacy_inspector.db`.

| Table | Description |
|-------|-------------|
| `reports` | Filename, upload timestamp, full raw NDJSON content |
| `app_accesses` | Per-app results: bundle_id, categories, access_count, risk_score, status, LLM analysis text, sample entry |

Both the raw file and parsed results are stored — the raw content is available for passing as full context to the chatbot LLM.

---

## Status

| Feature | Status |
|---------|--------|
| NDJSON parsing | ✅ Done |
| LLM risk analysis (analysis page) | ✅ Done |
| SQLite persistence | ✅ Done |
| Admin DB viewer (`/admin`) | ✅ Done |
| Chatbot (LLM-connected) | 🔜 Planned |
