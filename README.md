# Orbital Guardian

Space Situational Awareness · satellite & debris tracking · SGP4 orbital
propagation · conjunction screening · heuristic risk ranking · AI/RAG copilot.

```
.
├── backend/     FastAPI + SGP4 + conjunction engine + RAG  →  deploy to Render
│   ├── app/           application code (routers, orbital/, rag)
│   ├── knowledge/     curated RAG markdown knowledge base
│   ├── data/          TLE cache + RAG embedding cache (runtime)
│   ├── tests/         standalone test suites
│   ├── requirements.txt
│   ├── render.yaml is at repo root
│   └── .env.example
└── frontend/    React 18 + Vite + CesiumJS + Tailwind      →  deploy to Vercel
    ├── src/
    ├── public/
    ├── vercel.json
    └── .env.example
```

---

## Local development

### Backend (port 8000)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env      # then fill in keys (optional — see below)
uvicorn app.main:app --reload --port 8000
```
or run `backend\run_backend.bat`.

### Frontend (port 5173)
```powershell
cd frontend
npm install
npm run dev
```
or run `frontend\run_frontend.bat`. Vite proxies `/api` → `http://127.0.0.1:8000`,
so no frontend env vars are needed locally.

### Tests
```powershell
cd backend
.\run_tests.ps1
```

---



---


## Technology stack
- **Frontend**: React 18, React Router, CesiumJS, Framer Motion, TailwindCSS, Vite
- **Backend**: FastAPI, `sgp4`, SQLAlchemy, Pydantic, bcrypt + JWT auth
- **Orbital data**: CelesTrak GP/TLE elements (latest available — *not* live telemetry)
- **AI**: Google Gemini (explanation only) + hybrid RAG (BM25 + optional dense
  embeddings + Reciprocal Rank Fusion) over the curated `backend/knowledge/` base.
  The deterministic engine computes every orbital number; Gemini only explains them.
