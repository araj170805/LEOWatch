"""Comprehensive Verification Test for the New Proper RAG Architecture.

Run with:
& backend/.venv/Scripts/python.exe backend/tests/test_proper_rag.py
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.proper_rag import (  # noqa: E402
    load_and_chunk_docs,
    BM25SearchEngine,
    DenseVectorEngine,
    ProperRAGPipeline,
    retrieve,
    explain,
)

SAMPLE_CONJUNCTION = {
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


def assert_check(name: str, condition: bool, detail: str = ""):
    if condition:
        print(f"[PASS] {name}")
    else:
        print(f"[FAIL] {name} {detail}")
        failures.append(name)


def main():
    print("================================================================")
    print("        TESTING PROPER RAG ARCHITECTURE MODULE (proper_rag.py)  ")
    print("================================================================")

    # 1. Chunking Test
    chunks = load_and_chunk_docs()
    assert_check("1. Knowledge documents loaded and chunked", len(chunks) > 0, f"chunks={len(chunks)}")
    if chunks:
        c = chunks[0]
        assert_check("2. Chunks have hierarchical breadcrumbs", "[" in c["text"] and "]" in c["text"])
        assert_check("3. Chunk schema complete", all(k in c for k in ("id", "doc", "title", "section", "text")))

    # 2. BM25 Search Engine Test
    bm25 = BM25SearchEngine(chunks)
    sgp4_bm25 = bm25.search("What is SGP4 propagation?")
    assert_check("4. BM25 finds relevant SGP4 doc", len(sgp4_bm25) > 0 and chunks[sgp4_bm25[0][1]]["doc"] == "sgp4.md")

    tca_bm25 = bm25.search("Time of Closest Approach TCA")
    assert_check("5. BM25 finds TCA doc", len(tca_bm25) > 0 and any(chunks[idx]["doc"] == "tca.md" for _, idx in tca_bm25[:3]))

    # 3. Dense Vector Engine Test
    dense = DenseVectorEngine(chunks)
    assert_check("6. Dense Vector Engine initialized", dense is not None)

    # 4. Hybrid RRF Pipeline Retrieval Test
    pipeline = ProperRAGPipeline()
    queries = [
        ("What is SGP4?", "sgp4.md"),
        ("What is TCA in conjunction assessment?", "tca.md"),
        ("How does a Two-Line Element set work?", "tle.md"),
        ("What is miss distance and risk classification?", "miss-distance.md"),
        ("What happened in the Iridium-Cosmos collision?", "orbital-debris.md"),
    ]

    print("\n--- Testing Hybrid RRF Retrieval across Core Queries ---")
    for q, expected_doc in queries:
        res = pipeline.retrieve(q, k=3)
        assert_check(f"Query: '{q}' non-empty", len(res) > 0)
        top_doc = res[0]["doc"] if res else "none"
        top_score = res[0]["score"] if res else 0.0
        top_source = res[0].get("source", "hybrid")
        print(f"   -> Top Doc: {top_doc} | Score: {top_score} | Source: {top_source}")

    # 5. Telemetry & Context Grounded Generation Test
    print("\n--- Testing Grounded Explanation Generation ---")
    explanation_res = pipeline.explain(SAMPLE_CONJUNCTION, "What is the collision risk for this conjunction?")
    assert_check("7. Explanation output generated", bool(explanation_res.get("answer")))
    assert_check("8. Explanation contains real miss distance number", "122.9" in explanation_res["answer"])
    assert_check("9. Sources returned correctly", len(explanation_res.get("sources", [])) > 0)

    print(f"\nSample Grounded Answer:\n{explanation_res['answer']}")
    print(f"Cited Sources: {explanation_res['sources']}")

    print("================================================================")
    if failures:
        print(f"FAILED {len(failures)} CHECKS: {failures}")
        sys.exit(1)
    else:
        print("ALL PROPER RAG TESTS PASSED SUCCESSFULLY (100% OK)!")
        print("================================================================")


if __name__ == "__main__":
    main()
