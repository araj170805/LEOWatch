"""Vercel serverless entry point for the Orbital Guardian FastAPI app."""

import os
import sys

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from app.main import app  # noqa: E402
from app.database import init_db  # noqa: E402

# Serverless platforms do not run lifespan/startup hooks reliably,
# so ensure tables exist at cold start.
try:
    init_db()
except Exception:  # noqa: BLE001
    pass

# Vercel's Python runtime looks for `app` on the handler module.
handler = app
