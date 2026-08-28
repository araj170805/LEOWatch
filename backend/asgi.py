"""Generic ASGI entrypoint: ``uvicorn asgi:app``.

Equivalent to the canonical ``uvicorn app.main:app``.
"""

from app.main import app

__all__ = ["app"]
