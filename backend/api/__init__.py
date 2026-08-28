"""Compatibility shim.

Some hosts auto-detect this folder and start ``uvicorn api:app``. Re-export
the real application so that entrypoint works too. The canonical entrypoint
remains ``uvicorn app.main:app``.
"""

import os
import sys

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from app.main import app  # noqa: E402

__all__ = ["app"]
