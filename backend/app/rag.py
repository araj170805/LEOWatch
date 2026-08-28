"""Pure-Python TF-IDF retrieval over the knowledge base markdown docs."""

import math
import re
from collections import Counter
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parents[1]
_KNOWLEDGE_DIR = _BACKEND_DIR / "knowledge"
if not _KNOWLEDGE_DIR.is_dir():
    _KNOWLEDGE_DIR = _BACKEND_DIR.parent / "knowledge"  # legacy layout fallback
_TOKEN_RE = re.compile(r"[a-z0-9]+")
CHUNK_SIZE = 600


def _tokenize(text):
    return _TOKEN_RE.findall(text.lower())


def _load_docs():
    docs = []
    if not _KNOWLEDGE_DIR.is_dir():
        return docs
    for path in sorted(_KNOWLEDGE_DIR.glob("*.md")):
        try:
            raw = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        title = path.stem
        for line in raw.splitlines():
            line = line.strip()
            if line.startswith("#"):
                title = line.lstrip("#").strip()
                break
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", raw) if p.strip()]
        buf = []
        size = 0
        for para in paragraphs:
            if buf and size + len(para) > CHUNK_SIZE:
                chunks = "\n\n".join(buf)
                docs.append({"doc": path.name, "title": title, "text": chunks})
                buf, size = [], 0
            buf.append(para)
            size += len(para) + 2
            while len(buf) == 1 and size > CHUNK_SIZE * 1.5 and "\n" in buf[0]:
                cut = buf[0].rfind("\n", 0, CHUNK_SIZE)
                if cut <= 0:
                    break
                head, tail = buf[0][:cut], buf[0][cut:]
                docs.append({"doc": path.name, "title": title, "text": head})
                buf[0], size = tail.strip(), len(tail.strip())
        if buf:
            docs.append({"doc": path.name, "title": title,
                         "text": "\n\n".join(buf)})
    return docs


def _build_index(chunks):
    tf = []
    df = Counter()
    for chunk in chunks:
        counts = Counter(_tokenize(chunk["text"]))
        tf.append(counts)
        for term in counts:
            df[term] += 1
    n_docs = len(chunks) or 1
    idf = {term: math.log((n_docs + 1) / (count + 1)) + 1.0
           for term, count in df.items()}
    vectors = []
    for counts in tf:
        vec = {term: (freq * idf.get(term, 1.0))
               for term, freq in counts.items()}
        norm = math.sqrt(sum(w * w for w in vec.values())) or 1.0
        vectors.append({term: w / norm for term, w in vec.items()})
    return vectors, idf


_chunks = _load_docs()
_vectors, _idf = _build_index(_chunks)


def retrieve(query, k=4):
    """Return top-k chunks matching query: [{doc,title,text,score}]."""
    try:
        tokens = _tokenize(query)
        if not tokens or not _vectors:
            return []
        counts = Counter(tokens)
        qvec = {term: freq * _idf.get(term, 1.0) for term, freq in counts.items()}
        qnorm = math.sqrt(sum(w * w for w in qvec.values())) or 1.0
        qvec = {term: w / qnorm for term, w in qvec.items()}
        scored = []
        for idx, cvec in enumerate(_vectors):
            small, large = (qvec, cvec) if len(qvec) < len(cvec) else (cvec, qvec)
            score = sum(w * large.get(term, 0.0) for term, w in small.items())
            scored.append((score, idx))
        scored.sort(key=lambda pair: (-pair[0], pair[1]))
        results = []
        for score, idx in scored[: max(0, int(k))]:
            if score <= 0.0:
                continue
            chunk = dict(_chunks[idx])
            chunk["score"] = round(score, 6)
            results.append(chunk)
        return results
    except Exception:
        return []
