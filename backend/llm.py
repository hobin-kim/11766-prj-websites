import json
from openai import OpenAI


ANALYSIS_SYSTEM_PROMPT = """You are a mobile privacy security analyst specializing in iOS App Privacy Reports.

You will receive a JSON array of apps extracted from an iPhone's App Privacy Report, each containing:
- bundle_id: the app's bundle identifier
- app_name: human-readable name
- categories: a dict of data categories accessed and how many times (e.g. {"location": 12, "contacts": 3})
- access_count: total number of access events

Your task is to analyze each app and return a JSON array (same order, same length) where each element has:
- bundle_id: same as input
- risk_score: float 0.0–10.0 (one decimal place)
- status: "normal" | "warning" | "suspicious"
  - normal:     risk_score < 4.0
  - warning:    4.0 <= risk_score < 6.5
  - suspicious: risk_score >= 6.5
- analysis: 1–3 sentence explanation of why this app has that risk level and what the user should do (if anything)

Scoring guidance:
- Consider whether the accessed categories make sense for the app's purpose
- Multi-category access by messaging or social apps is more concerning than the same by camera/phone apps
- Very high access counts (100+) for background apps are suspicious
- Apple first-party apps (com.apple.*) generally get lower scores unless the access is truly anomalous
- Third-party apps accessing location, microphone, or camera warrant higher scrutiny
- Prefer specific, actionable analysis over generic descriptions

Return ONLY the JSON array, no markdown fences, no extra text."""


def build_chatbot_system_prompt(app_accesses: list[dict]) -> str:
    """
    Build a system prompt for the chatbot that includes the full report analysis
    as context, so the LLM can answer questions about the user's specific data.
    """
    context = json.dumps(app_accesses, ensure_ascii=False, indent=2)
    return f"""You are a privacy assistant helping a user understand their iPhone App Privacy Report.

Here is the complete analysis of their report:

{context}

Guidelines:
- Answer questions based only on the data above — do not invent app behavior not present in the report
- Be specific: reference actual app names, category counts, and risk scores from the data
- Give concrete, actionable recommendations (e.g. which settings to change)
- Keep responses concise and in plain language
- If asked about an app not in the report, say so clearly"""


class LLMClient:
    def __init__(
        self,
        api_key: str = "sk-aC1WFE7UkEIwxdfUP34HUw",
        base_url: str = "https://ai-gateway.andrew.cmu.edu/v1",
        model: str = "gpt-5-mini",
        max_history_tokens: int = 32000,
    ) -> None:
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        self.max_history_tokens = max_history_tokens

    def analyze_apps(self, apps: list[dict]) -> list[dict]:
        """
        Send parsed app data to the LLM and return per-app risk analysis.
        Each input dict must have: bundle_id, app_name, categories, access_count.
        Returns the same list enriched with: risk_score, status, analysis.
        """
        payload = json.dumps(apps, ensure_ascii=False)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": payload},
            ],
            temperature=0.2,
        )

        raw = response.choices[0].message.content.strip()

        try:
            results = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM returned invalid JSON: {e}\n\nRaw output:\n{raw}")

        if not isinstance(results, list) or len(results) != len(apps):
            raise ValueError(
                f"LLM returned {len(results) if isinstance(results, list) else 'non-list'} "
                f"items but expected {len(apps)}"
            )

        return results

    def chat(self, app_accesses: list[dict], messages: list[dict]) -> str:
        """
        Answer a user question about their privacy report.

        app_accesses: full analysis data from the DB (injected as system prompt context)
        messages: conversation history in OpenAI format [{"role": "user"/"assistant", "content": "..."}]
        Returns the assistant's reply as a plain string.
        """
        system_prompt = build_chatbot_system_prompt(app_accesses)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": system_prompt}, *messages],
            temperature=0.5,
        )

        return response.choices[0].message.content.strip()
