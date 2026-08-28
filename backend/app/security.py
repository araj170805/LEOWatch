from datetime import datetime, timedelta, timezone
import json
import time

import requests
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import IntegrityError
from jose import JWTError, jwk as jose_jwk, jwt
from jose.utils import base64url_decode
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

import bcrypt

bearer_scheme = HTTPBearer(auto_error=False)

_JWKS_CACHE: dict = {"keys": [], "fetched_at": 0.0}
_JWKS_TTL_SECONDS = 3600


def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(sub: str, expires_minutes: int | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.JWT_EXPIRE_MINUTES
    )
    payload = {"sub": sub, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


def _fetch_jwks() -> list[dict]:
    now = time.time()
    if _JWKS_CACHE["keys"] and now - _JWKS_CACHE["fetched_at"] < _JWKS_TTL_SECONDS:
        return _JWKS_CACHE["keys"]
    url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        keys = resp.json().get("keys", [])
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc
    _JWKS_CACHE["keys"] = keys
    _JWKS_CACHE["fetched_at"] = now
    return keys


def _decode_token_header(token: str) -> dict:
    try:
        header_b64 = token.split(".", 1)[0]
        padded = header_b64 + "=" * (-len(header_b64) % 4)
        return json.loads(base64url_decode(padded.encode()))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


def decode_supabase_token(token: str) -> dict:
    """Verify a Supabase Auth access token.

    Supports asymmetric signing keys (ES256/RS256 via public JWKS) and the
    legacy HS256 shared JWT secret as fallback.
    """
    header = _decode_token_header(token)
    alg = header.get("alg", "")

    if alg == "HS256":
        if not settings.SUPABASE_JWT_SECRET:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        try:
            return jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except JWTError as exc:
            raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

    kid = header.get("kid")
    for attempt in (0, 1):
        for jwk_dict in _fetch_jwks():
            if kid and jwk_dict.get("kid") != kid:
                continue
            key = jose_jwk.construct(jwk_dict, algorithm=jwk_dict.get("alg"))
            try:
                return jwt.decode(
                    token,
                    key,
                    algorithms=[jwk_dict.get("alg") or "ES256"],
                    audience="authenticated",
                    options={"verify_aud": False},
                )
            except JWTError:
                break
        # Unknown/rotated kid — force JWKS refresh once.
        if attempt == 0:
            _JWKS_CACHE["keys"], _JWKS_CACHE["fetched_at"] = [], 0.0
    raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def _get_or_create_user(db: Session, email: str, name: str | None = None) -> User:
    user = get_user_by_email(db, email)
    if user is None:
        user = User(email=email, password_hash="", name=name)
        db.add(user)
        try:
            db.commit()
            db.refresh(user)
        except IntegrityError:
            # Concurrent request already created the row — re-read it.
            db.rollback()
            user = get_user_by_email(db, email)
            if user is None:
                raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    token = credentials.credentials

    if settings.SUPABASE_URL or settings.SUPABASE_JWT_SECRET:
        payload = decode_supabase_token(token)
        email = payload.get("email") or (payload.get("user_metadata") or {}).get("email")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        name = (payload.get("user_metadata") or {}).get("name")
        return _get_or_create_user(db, email, name)

    # Legacy local-JWT path (pre-Supabase). Remove once Supabase is configured.
    payload = decode_token(token)
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = get_user_by_email(db, email)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user
