"""Standalone test for the RAG retrieval and LLM explanation modules.

Run from repo root: python backend/tests/test_rag.py
"""

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

os.environ.pop("OPENAI_API_KEY", None)

from app.llm import explain  # noqa: E402
from app.rag import retrieve  # noqa: E402

SAMPLE_EVENT = {
    "object_a": {"norad_id": 25544, "name": "ISS (ZARYA)"},
    "object_b": {"norad_id": 43013, "name": "NOAA 20"},
    "coarse_tca": "2026-08-25T12:00:00Z",
    "coarse_distance_km": 123.4,
    "tca": "2026-08-25T11:59:58Z",
    "minimum_distance_km": 122.9,
    "position_a_at_tca": [1000.0, 2000.0, 3000.0],
    "position_b_at_tca": [1100.0, 2050.0, 2980.0],
    "relative_velocity_km_s": 10.2,
    "risk": "LOW",
}

failures = []


def check(name, condition, detail=""):
    if condition:
        print(f"PASS {name}")
    else:
        print(f"FAIL {name} {detail}")
        failures.append(name)


results_tca = retrieve("What is TCA?", k=4)
check("tca.md in TCA results",
      any(r["doc"] == "tca.md" for r in results_tca),
      f"got {[r['doc'] for r in results_tca]}")
check("TCA results non-empty", len(results_tca) > 0)

results_sgp4 = retrieve("What does SGP4 do?", k=4)
check("sgp4.md in SGP4 results",
      any(r["doc"] == "sgp4.md" for r in results_sgp4),
      f"got {[r['doc'] for r in results_sgp4]}")

for q in ("What is a two-line element set?",
          "How does conjunction screening work?",
          "What was the Iridium Cosmos collision?"):
    res = retrieve(q, k=3)
    check(f"non-empty answers for '{q}'", len(res) > 0,
          f"got {res}")
    print(f"  sample Q: {q}")
    if res:
        top = res[0]
        snippet = top["text"].replace("\n", " ")[:160]
        print(f"  top source: {top['doc']} (score {top['score']}): {snippet}...")

answer = explain(SAMPLE_EVENT, "Explain this conjunction.", results_tca)
check("template answer non-empty", bool(answer.strip()))
check("answer contains real minimum_distance_km value",
      "122.9" in answer, f"answer={answer!r}")

empty_answer = explain(None, "What is SGP4?", [])
check("fallback answer with no event non-empty", bool(empty_answer.strip()))

retrieve_result = retrieve("", k=4)
check("empty query returns list without raising", isinstance(retrieve_result, list))

print()
if failures:
    print(f"{len(failures)} FAILURE(S): {failures}")
    sys.exit(1)
print("ALL TESTS PASSED")
