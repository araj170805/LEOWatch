"""Proper Cloud Hybrid RAG Architecture for Space Debris / Orbital Guardian.

This is a standalone, self-contained RAG module that adds production-grade
Retrieval-Augmented Generation without modifying existing files.

Architecture Components:
1. Hierarchical Markdown Chunking with Header Breadcrumbs ([Doc > Section > Subsection])
2. BM25 Sparse Keyword Search for exact orbital terminology (TLE, TCA, SGP4, CDM, NORAD)
3. Cloud Dense Embeddings (Google Gemini text-embedding-004 / OpenAI) with persistent JSON disk cache
4. Reciprocal Rank Fusion (RRF) for merging Dense + Sparse rankings
5. Grounded LLM Context Synthesis (Gemini 3.7 Flash / OpenAI / Offline deterministic fallback)
"""

import json
import math
import os
import re
from collections import Counter
from pathlib import Path
from typing import Any

# Directory paths
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_KNOWLEDGE_DIR = _BACKEND_DIR / "knowledge"
if not _KNOWLEDGE_DIR.is_dir():
    _KNOWLEDGE_DIR = _BACKEND_DIR.parent / "knowledge"  # legacy layout fallback

_DATA_DIR = _BACKEND_DIR / "data"
_CACHE_FILE = _DATA_DIR / "rag_embeddings_cache.json"
_ENV_FILE = _BACKEND_DIR / ".env"


def _load_env():
    try:
        if not _ENV_FILE.is_file():
            return
        for line in _ENV_FILE.read_text(encoding="utf-8").splitlines():
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

_TOKEN_RE = re.compile(r"[a-z0-9]+")
CHUNK_TARGET_SIZE = 600

_STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
    "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
    "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
    "hasn't", "have", "haven't", "having", "he", "her", "here", "hers", "herself",
    "him", "himself", "his", "how", "i", "if", "in", "into", "is", "isn't", "it",
    "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
    "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
    "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't",
    "she", "should", "shouldn't", "so", "some", "such", "than", "that", "the",
    "their", "theirs", "them", "themselves", "then", "there", "these", "they",
    "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
    "wasn't", "we", "were", "weren't", "what", "when", "where", "which", "while",
    "who", "whom", "why", "with", "won't", "would", "wouldn't", "you", "your",
    "yours", "yourself", "yourselves"
}

SYSTEM_PROMPT = (
    "You are Orbital Guardian's AI Space Situational Awareness assistant. "
    "Answer the user's actual question directly and let the question decide the "
    "shape of the response.\n\n"
    "CRITICAL RULES:\n"
    "1. First identify the user's intent, then answer only that. Do NOT force a "
    "conjunction report (miss distance / relative velocity / risk score / TCA) "
    "into every reply. Include those quantities only when the question is "
    "specifically about the conjunction, the risk, timing, or the encounter "
    "geometry.\n"
    "2. For questions about an object's identity, mission, purpose, history, or "
    "importance, focus on that and use the REFERENCE KNOWLEDGE; do not append "
    "conjunction risk data unless asked.\n"
    "3. For conceptual questions (SGP4, orbital propagation, NORAD ID, space "
    "debris, Kessler Syndrome, inclination, etc.) give a clear educational "
    "explanation grounded in the REFERENCE KNOWLEDGE. Do not return a "
    "conjunction report.\n"
    "4. NEVER calculate, fabricate, or extrapolate orbital numbers. Only "
    "reference values explicitly present in SELECTED CONTEXT. If a value is "
    "unavailable, say: \"I don't have reliable data for that information.\" Do "
    "not invent it.\n"
    "5. SELECTED CONTEXT describes what the user currently has selected in the "
    "app. Use it to resolve references like \"this object\", \"this "
    "conjunction\", \"it\", or \"this\" only when the question actually refers "
    "to it; otherwise ignore it.\n"
    "6. Match depth to the question: simple question -> short answer; technical "
    "question -> more detail; complex question -> step-by-step. Use headings or "
    "bullets only when they aid readability. Do not turn every answer into a "
    "large report. Be concise, conversational, and technically accurate."
)


# ============================================================================
# 1. Hierarchical Markdown Chunking
# ============================================================================

def _tokenize(text: str, remove_stopwords: bool = False) -> list[str]:
    """Tokenize text into alphanumeric lowercase tokens."""
    tokens = _TOKEN_RE.findall(text.lower())
    if remove_stopwords:
        return [t for t in tokens if t not in _STOPWORDS and len(t) > 1]
    return tokens


def _parse_markdown_sections(text: str, doc_name: str) -> list[dict[str, Any]]:
    """Parse Markdown into structured hierarchical sections preserving header context."""
    lines = text.splitlines()
    doc_title = doc_name.replace("-", " ").replace(".md", "").title()
    sections = []
    current_h1 = doc_title
    current_h2 = ""
    current_lines = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("# "):
            if current_lines:
                sections.append({
                    "h1": current_h1,
                    "h2": current_h2,
                    "text": "\n".join(current_lines).strip(),
                })
                current_lines = []
            current_h1 = stripped.lstrip("#").strip()
            doc_title = current_h1
        elif stripped.startswith("## "):
            if current_lines:
                sections.append({
                    "h1": current_h1,
                    "h2": current_h2,
                    "text": "\n".join(current_lines).strip(),
                })
                current_lines = []
            current_h2 = stripped.lstrip("#").strip()
        elif stripped.startswith("### "):
            current_lines.append(f"\n**{stripped.lstrip('#').strip()}**")
        else:
            current_lines.append(line)

    if current_lines:
        sections.append({
            "h1": current_h1,
            "h2": current_h2,
            "text": "\n".join(current_lines).strip(),
        })

    return [s for s in sections if s["text"]]


def load_and_chunk_docs() -> list[dict[str, Any]]:
    """Load and chunk all Markdown files in the knowledge base."""
    chunks = []
    if not _KNOWLEDGE_DIR.is_dir():
        return chunks

    chunk_idx = 0
    for path in sorted(_KNOWLEDGE_DIR.glob("*.md")):
        try:
            raw = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue

        sections = _parse_markdown_sections(raw, path.name)
        for section in sections:
            h1 = section["h1"]
            h2 = section["h2"]
            breadcrumb = f"{h1} > {h2}" if h2 else h1
            text = section["text"]

            paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
            buf = []
            buf_len = 0

            for para in paragraphs:
                if buf and (buf_len + len(para)) > CHUNK_TARGET_SIZE:
                    chunk_text = "\n\n".join(buf)
                    chunks.append({
                        "id": f"{path.stem}_{chunk_idx}",
                        "doc": path.name,
                        "title": h1,
                        "section": h2 or h1,
                        "breadcrumb": breadcrumb,
                        "text": f"[{breadcrumb}]\n{chunk_text}",
                    })
                    chunk_idx += 1
                    buf = [para]
                    buf_len = len(para)
                else:
                    buf.append(para)
                    buf_len += len(para) + 2

            if buf:
                chunk_text = "\n\n".join(buf)
                chunks.append({
                    "id": f"{path.stem}_{chunk_idx}",
                    "doc": path.name,
                    "title": h1,
                    "section": h2 or h1,
                    "breadcrumb": breadcrumb,
                    "text": f"[{breadcrumb}]\n{chunk_text}",
                })
                chunk_idx += 1

    return chunks


# ============================================================================
# 2. Okapi BM25 Sparse Keyword Search
# ============================================================================

class BM25SearchEngine:
    """Okapi BM25 index with term-frequency saturation and document-length normalization."""

    def __init__(self, chunks: list[dict[str, Any]], k1: float = 1.5, b: float = 0.75):
        self.chunks = chunks
        self.k1 = k1
        self.b = b
        self.doc_len = []
        self.doc_freqs = Counter()
        self.term_freqs = []
        self.n_docs = len(chunks)
        self.avg_doc_len = 0.0
        self.idf = {}

        if self.n_docs > 0:
            total_len = 0
            for chunk in chunks:
                tokens = _tokenize(chunk["text"], remove_stopwords=False)
                length = len(tokens)
                self.doc_len.append(length)
                total_len += length
                tf = Counter(tokens)
                self.term_freqs.append(tf)
                for term in tf:
                    self.doc_freqs[term] += 1

            self.avg_doc_len = total_len / self.n_docs if self.n_docs > 0 else 1.0
            for term, count in self.doc_freqs.items():
                self.idf[term] = math.log(1.0 + (self.n_docs - count + 0.5) / (count + 0.5))

    def search(self, query: str) -> list[tuple[float, int]]:
        """Score documents against query. Returns list of (score, doc_index)."""
        tokens = _tokenize(query, remove_stopwords=False)
        if not tokens or self.n_docs == 0:
            return []

        scores = []
        for idx in range(self.n_docs):
            score = 0.0
            doc_tf = self.term_freqs[idx]
            d_len = self.doc_len[idx]

            for term in tokens:
                if term not in doc_tf:
                    continue
                idf = self.idf.get(term, 0.1)
                freq = doc_tf[term]
                numerator = freq * (self.k1 + 1.0)
                denominator = freq + self.k1 * (1.0 - self.b + self.b * (d_len / self.avg_doc_len))
                score += idf * (numerator / denominator)

            if score > 0.0:
                scores.append((score, idx))

        scores.sort(key=lambda x: x[0], reverse=True)
        return scores


# ============================================================================
# 3. Cloud Dense Vector Embeddings Engine (Gemini / OpenAI)
# ============================================================================

class DenseVectorEngine:
    """Manages dense embeddings with Google Gemini / OpenAI and local JSON disk caching."""

    def __init__(self, chunks: list[dict[str, Any]]):
        self.chunks = chunks
        self.embeddings: list[list[float]] = []
        self.is_ready = False
        self._init_embeddings()

    def _get_api_keys(self) -> tuple[str, str, str]:
        gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
        openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
        openai_base = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").strip().rstrip("/")
        return gemini_key, openai_key, openai_base

    def _fetch_gemini_embeddings(self, texts: list[str], api_key: str) -> list[list[float]] | None:
        """Fetch embeddings via google-genai SDK or direct REST API."""
        model_name = os.environ.get("EMBEDDING_MODEL", "text-embedding-004")
        
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            result = client.models.embed_content(model=model_name, contents=texts)
            if hasattr(result, "embeddings") and result.embeddings:
                return [list(e.values) for e in result.embeddings]
        except Exception:
            pass

        try:
            import requests
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:batchEmbedContents?key={api_key}"
            payload = [{"model": f"models/{model_name}", "content": {"parts": [{"text": t}]}} for t in texts]
            resp = requests.post(url, json={"requests": payload}, timeout=20)
            if resp.status_code == 200:
                return [item["values"] for item in resp.json().get("embeddings", [])]
        except Exception:
            pass

        return None

    def _fetch_openai_embeddings(self, texts: list[str], api_key: str, base_url: str) -> list[list[float]] | None:
        """Fetch embeddings via OpenAI embeddings API."""
        try:
            import requests
            model_name = os.environ.get("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
            resp = requests.post(
                f"{base_url}/embeddings",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"input": texts, "model": model_name},
                timeout=20,
            )
            if resp.status_code == 200:
                return [item["embedding"] for item in resp.json().get("data", [])]
        except Exception:
            pass
        return None

    def _fetch_query_embedding(self, query: str) -> list[float] | None:
        gemini_key, openai_key, openai_base = self._get_api_keys()
        if gemini_key:
            res = self._fetch_gemini_embeddings([query], gemini_key)
            if res and len(res) > 0:
                return res[0]
        if openai_key:
            res = self._fetch_openai_embeddings([query], openai_key, openai_base)
            if res and len(res) > 0:
                return res[0]
        return None

    def _load_cache(self) -> dict[str, list[float]] | None:
        if not _CACHE_FILE.is_file():
            return None
        try:
            data = json.loads(_CACHE_FILE.read_text(encoding="utf-8"))
            return data.get("embeddings")
        except Exception:
            return None

    def _save_cache(self, emb_dict: dict[str, list[float]]):
        try:
            _DATA_DIR.mkdir(parents=True, exist_ok=True)
            _CACHE_FILE.write_text(
                json.dumps({"count": len(emb_dict), "embeddings": emb_dict}, indent=2),
                encoding="utf-8",
            )
        except Exception:
            pass

    def _init_embeddings(self):
        if not self.chunks:
            return

        cached = self._load_cache()
        if cached and len(cached) == len(self.chunks):
            self.embeddings = [cached.get(c["id"], []) for c in self.chunks]
            if all(self.embeddings):
                self.is_ready = True
                return

        gemini_key, openai_key, openai_base = self._get_api_keys()
        texts = [c["text"] for c in self.chunks]
        computed = None

        if gemini_key:
            computed = self._fetch_gemini_embeddings(texts, gemini_key)
        elif openai_key:
            computed = self._fetch_openai_embeddings(texts, openai_key, openai_base)

        if computed and len(computed) == len(self.chunks):
            self.embeddings = computed
            self.is_ready = True
            emb_dict = {c["id"]: vec for c, vec in zip(self.chunks, computed)}
            self._save_cache(emb_dict)

    def search(self, query: str) -> list[tuple[float, int]]:
        """Score chunks using cosine similarity."""
        if not self.is_ready or not self.embeddings:
            return []

        q_vec = self._fetch_query_embedding(query)
        if not q_vec:
            return []

        q_norm = math.sqrt(sum(x * x for x in q_vec)) or 1.0
        scores = []

        for idx, d_vec in enumerate(self.embeddings):
            if not d_vec:
                continue
            dot = sum(a * b for a, b in zip(q_vec, d_vec))
            d_norm = math.sqrt(sum(x * x for x in d_vec)) or 1.0
            cos_sim = dot / (q_norm * d_norm)
            if cos_sim > 0.0:
                scores.append((cos_sim, idx))

        scores.sort(key=lambda x: x[0], reverse=True)
        return scores


# ============================================================================
# 4. Hybrid Reciprocal Rank Fusion (RRF) Retrieval Pipeline
# ============================================================================

class ProperRAGPipeline:
    """Full Production RAG Pipeline uniting Chunking, BM25, Dense Vectors, RRF, and LLM."""

    def __init__(self):
        self.chunks = load_and_chunk_docs()
        self.bm25 = BM25SearchEngine(self.chunks)
        self.dense = DenseVectorEngine(self.chunks)

    def retrieve(self, query: str, k: int = 4) -> list[dict[str, Any]]:
        """Perform Hybrid Retrieval combining BM25 keyword matching and Dense Embeddings with RRF."""
        if not query or not self.chunks:
            return []

        try:
            bm25_ranked = self.bm25.search(query)
            dense_ranked = self.dense.search(query)

            rrf_constant = 60.0
            combined_scores: dict[int, float] = Counter()
            source_tags: dict[int, str] = {}

            # Dense contribution
            for rank, (_, doc_idx) in enumerate(dense_ranked):
                combined_scores[doc_idx] += 1.0 / (rrf_constant + rank + 1)
                source_tags[doc_idx] = "dense"

            # BM25 contribution
            for rank, (_, doc_idx) in enumerate(bm25_ranked):
                combined_scores[doc_idx] += 1.0 / (rrf_constant + rank + 1)
                source_tags[doc_idx] = "hybrid" if doc_idx in source_tags else "bm25"

            # Fallback if both scores are 0
            if not combined_scores:
                tokens = set(_tokenize(query, remove_stopwords=True))
                for idx, chunk in enumerate(self.chunks):
                    chunk_tokens = set(_tokenize(chunk["text"], remove_stopwords=True))
                    overlap = len(tokens & chunk_tokens)
                    if overlap > 0:
                        combined_scores[idx] = float(overlap)
                        source_tags[idx] = "fallback"

            sorted_docs = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
            results = []

            for doc_idx, score in sorted_docs[: max(1, int(k))]:
                chunk_data = dict(self.chunks[doc_idx])
                chunk_data["score"] = round(score, 6)
                chunk_data["source"] = source_tags.get(doc_idx, "hybrid")
                results.append(chunk_data)

            return results
        except Exception:
            return [dict(c) for c in self.chunks[:max(1, int(k))]]

    def explain(
        self,
        event: dict[str, Any] | None,
        question: str,
        k: int = 4,
        history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        """Retrieve relevant context and generate a grounded response."""
        context_docs = self.retrieve(question, k=k)
        
        gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
        openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
        openai_base = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").strip().rstrip("/")

        # Format retrieved knowledge
        doc_snippets = []
        sources = []
        for doc in context_docs:
            title = doc.get("breadcrumb") or doc.get("title") or doc.get("doc", "Doc")
            text = doc.get("text", "")
            doc_snippets.append(f"### Context: {title}\n{text}")
            if doc.get("doc") and doc["doc"] not in sources:
                sources.append(doc["doc"])

        reference_knowledge = "\n\n".join(doc_snippets) if doc_snippets else "(No specific documentation matched)"
        event_json = json.dumps(event, indent=2) if event else "(nothing currently selected)"

        convo = ""
        for turn in (history or [])[-6:]:
            role = turn.get("role", "user")
            text = (turn.get("text") or turn.get("content") or "").strip()
            if text:
                convo += f"{role.upper()}: {text}\n"
        convo_block = f"CONVERSATION SO FAR:\n{convo}\n" if convo else ""

        user_prompt = (
            f"{convo_block}"
            f"USER QUESTION: {question}\n\n"
            f"SELECTED CONTEXT (the object/conjunction the user has selected in "
            f"the app — use only if the question refers to it):\n{event_json}\n\n"
            f"REFERENCE KNOWLEDGE:\n{reference_knowledge}\n\n"
            "Answer the user's question directly. Determine intent first, then "
            "include only the information that intent needs."
        )

        answer = None

        # Try Gemini
        if gemini_key:
            try:
                from google import genai
                from google.genai import types
                model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
                client = genai.Client(api_key=gemini_key)
                response = client.models.generate_content(
                    model=model,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        temperature=0.2,
                        max_output_tokens=700,
                    ),
                )
                if response and response.text:
                    answer = response.text.strip()
            except Exception:
                pass

        # Try OpenAI
        if not answer and openai_key:
            try:
                import requests
                model = os.environ.get("LLM_MODEL", "gpt-4o-mini")
                resp = requests.post(
                    f"{openai_base}/chat/completions",
                    headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.2,
                        "max_tokens": 700,
                    },
                    timeout=20,
                )
                if resp.status_code == 200:
                    answer = resp.json()["choices"][0]["message"]["content"].strip()
            except Exception:
                pass

        # Deterministic Fallback Template
        if not answer:
            answer = self._template_answer(event, question, context_docs)

        return {
            "answer": answer,
            "sources": sources,
            "retrieved_chunks": context_docs,
        }

    @staticmethod
    def _is_conjunction_question(question: str) -> bool:
        """Heuristic: does the question actually ask about the encounter/risk?"""
        q = (question or "").lower()
        keywords = (
            "conjunction", "collide", "collision", "miss distance", "separation",
            "close approach", "closest approach", "tca", "time of closest",
            "relative velocity", "risk", "risky", "danger", "dangerous",
            "maneuver", "manoeuvre", "avoid", "probability of collision", "pc ",
            "how close", "hit", "crash",
        )
        return any(kw in q for kw in keywords)

    def _template_answer(
        self,
        event: dict[str, Any] | None,
        question: str,
        context_docs: list[dict[str, Any]] | None = None,
    ) -> str:
        """Deterministic fallback used only when no LLM answer is available.

        Keeps the intent-aware contract: a conjunction summary is produced only
        for conjunction-style questions; otherwise the best retrieved knowledge
        snippet is surfaced instead of a fixed risk template.
        """
        wants_conjunction = self._is_conjunction_question(question)

        if not event or not wants_conjunction:
            for doc in context_docs or []:
                text = (doc.get("text") or "").strip()
                # Drop the leading "[Breadcrumb]" line added during chunking.
                if text.startswith("["):
                    text = text.split("\n", 1)[-1].strip()
                if text:
                    return text
            if not event:
                return (
                    "I don't have reliable data for that yet. Ask about orbital "
                    "concepts (SGP4, orbital propagation, NORAD ID, inclination, "
                    "space debris, Kessler Syndrome) or select an object or "
                    "conjunction and ask about it."
                )
            return "I don't have reliable data for that information."

        name_a = event.get("object_a", {}).get("name", "Object A")
        name_b = event.get("object_b", {}).get("name", "Object B")
        tca = event.get("tca") or event.get("coarse_tca") or "TBD"
        dist = event.get("minimum_distance_km")
        risk = event.get("risk")
        rel_v = event.get("relative_velocity_km_s")

        def _fmt(val):
            return f"{val:.3f}" if isinstance(val, float) else str(val)

        parts = [
            f"At predicted TCA ({tca}), {name_a} and {name_b} have a miss distance of {_fmt(dist)} km"
            if dist is not None else None,
            f"relative velocity of {_fmt(rel_v)} km/s" if rel_v is not None else None,
            f"classified at {risk} risk" if risk else None,
        ]
        summary = ", with a ".join(p for p in parts if p) + "."

        guidance = {
            "CRITICAL": " This separation is dangerously small; collision avoidance maneuvers should be initiated.",
            "HIGH": " This separation warrants close monitoring and maneuver planning.",
            "MEDIUM": " This separation is within screening thresholds; continuous observation recommended.",
            "LOW": " This separation is clear of operational screening thresholds.",
        }
        extra = guidance.get(risk, "")
        return f"{summary}{extra}".strip()


# Singleton instance
import logging as _logging
_log = _logging.getLogger("orbital_guardian.rag")

try:
    rag_pipeline = ProperRAGPipeline()
    _log.info(
        "[RAG] Initialized: %d chunks loaded, dense_ready=%s",
        len(rag_pipeline.chunks),
        rag_pipeline.dense.is_ready,
    )
    if not rag_pipeline.chunks:
        _log.warning("[RAG] No knowledge chunks found! Check knowledge/ directory path.")
    if not rag_pipeline.dense.is_ready:
        _log.warning("[RAG] Dense embeddings not ready — check GEMINI_API_KEY in backend/.env")
except Exception as _e:
    _log.error("[RAG] Failed to initialize pipeline: %s", _e)
    # Create a minimal fallback pipeline
    rag_pipeline = ProperRAGPipeline.__new__(ProperRAGPipeline)
    rag_pipeline.chunks = []
    rag_pipeline.bm25 = BM25SearchEngine([])
    rag_pipeline.dense = DenseVectorEngine.__new__(DenseVectorEngine)
    rag_pipeline.dense.chunks = []
    rag_pipeline.dense.embeddings = []
    rag_pipeline.dense.is_ready = False


def retrieve(query: str, k: int = 4) -> list[dict[str, Any]]:
    """Standalone retrieve function for external consumption."""
    return rag_pipeline.retrieve(query, k=k)


def explain(
    event: dict[str, Any] | None,
    question: str,
    k: int = 4,
    history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Standalone explain function for external consumption."""
    return rag_pipeline.explain(event, question, k=k, history=history)
