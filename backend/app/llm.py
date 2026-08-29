"""LLM-backed explanation of pre-computed conjunction analysis with a
deterministic template fallback when no API key is configured."""

import json
import os
from pathlib import Path

import requests

_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"

SYSTEM_PROMPT = (
    "You explain pre-computed orbital analysis. NEVER calculate, invent, "
    "or estimate orbital quantities (TCA, distances, positions, velocities, "
    "risk). Only reference numbers explicitly provided in the CONJUNCTION "
    "DATA. If data is missing say it is unavailable."
)


def _load_env():
    try:
        if not _ENV_PATH.is_file():
            return
        for line in _ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key, value = key.strip(), value.strip()
            if key and value:
                os.environ.setdefault(key, value)
    except Exception:
        pass


_load_env()


def _fmt(value):
    return f"{value:.3f}" if isinstance(value, float) else str(value)


def _template_answer(event, question):
    if not event:
        return ("No conjunction data was provided, so I can't describe a "
                f"specific event. Your question was: \"{question}\". Ask about "
                "concepts such as TCA, miss distance, SGP4, TLEs, screening, "
                "or debris environment and I can explain them.")
    name_a = event.get("object_a", {}).get("name", "Object A")
    name_b = event.get("object_b", {}).get("name", "Object B")
    tca = event.get("tca") or event.get("coarse_tca")
    dist = event.get("minimum_distance_km")
    risk = event.get("risk")
    rel_v = event.get("relative_velocity_km_s")
    parts = [
        f"At TCA {tca}, {name_a} and {name_b} are separated by "
        f"{_fmt(dist)} km" if dist is not None else None,
        f"with a relative velocity of {_fmt(rel_v)} km/s"
        if rel_v is not None else None,
        f"classified RISK level {risk}" if risk else None,
    ]
    summary = ", ".join(p for p in parts if p) + "."
    guidance = {
        "CRITICAL": "This separation is extremely small; an avoidance "
                    "maneuver would normally be considered immediately.",
        "HIGH": "This separation warrants close monitoring and maneuver "
                "planning.",
        "MEDIUM": "This separation is within typical screening volumes and "
                  "should be monitored as updated tracking arrives.",
        "LOW": "This separation is well outside typical screening volumes "
               "and no action is generally required.",
    }
    extra = guidance.get(risk, "")
    note = ""
    coarse_d = event.get("coarse_distance_km")
    refined_d = event.get("minimum_distance_km")
    if coarse_d is not None and refined_d is not None and coarse_d != refined_d:
        note = (f" Note the refined analysis adjusted the distance from "
                f"{_fmt(coarse_d)} km to {_fmt(refined_d)} km.")
    answer = summary + (" " + extra).rstrip() + note
    return answer.rstrip()


def explain(event, question, context_docs=None):
    """Explain a conjunction event using retrieved knowledge snippets."""
    try:
        api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not api_key:
            return _template_answer(event, question)
        base_url = (os.environ.get("OPENAI_BASE_URL", "")
                    or "https://api.openai.com/v1").strip().rstrip("/")
        model = os.environ.get("LLM_MODEL") or "gpt-4o-mini"

        doc_snippets = []
        for doc in (context_docs or [])[:4]:
            doc_snippets.append(
                f"### {doc.get('title', doc.get('doc', 'document'))}\n"
                f"{doc.get('text', '')}"
            )
        event_json = json.dumps(event, indent=2) if event else "(no event data)"
        user_content = (
            f"QUESTION: {question}\n\nCONJUNCTION DATA:\n{event_json}\n\n"
            f"REFERENCE KNOWLEDGE:\n" + ("\n\n".join(doc_snippets) or "(none)")
        )
        resp = requests.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
                "temperature": 0.2,
                "max_tokens": 500,
            },
            timeout=30,
        )
        resp.raise_for_status()
        payload = resp.json()
        content = payload["choices"][0]["message"]["content"]
        if content and content.strip():
            return content.strip()
        return _template_answer(event, question)
    except Exception:
        return _template_answer(event, question)
