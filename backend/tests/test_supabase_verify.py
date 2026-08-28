import base64
import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("SUPABASE_URL", "https://mzffrkhsxxiejpxmczha.supabase.co")

from cryptography.hazmat.primitives.asymmetric import ec
from jose import jwt

from app.security import _JWKS_CACHE, decode_supabase_token


def b64u(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


# 1) Ephemeral P-256 key pair -> JWK dicts (same shape as Supabase JWKS)
priv = ec.generate_private_key(ec.SECP256R1())
pub_nums = priv.public_key().public_numbers()
priv_nums = priv.private_numbers()

pub_jwk = {
    "kty": "EC",
    "crv": "P-256",
    "x": b64u(pub_nums.x.to_bytes(32, "big")),
    "y": b64u(pub_nums.y.to_bytes(32, "big")),
    "kid": "test-kid",
    "use": "sig",
    "alg": "ES256",
}
priv_jwk = {
    **pub_jwk,
    "d": b64u(priv_nums.private_value.to_bytes(32, "big")),
}

# 2) Stub the JWKS cache so no network call happens
_JWKS_CACHE["keys"] = [pub_jwk]
_JWKS_CACHE["fetched_at"] = time.time() + 9999

# 3) Sign a token the way Supabase does
token = jwt.encode(
    {
        "sub": "user-uuid-123",
        "email": "test@example.com",
        "aud": "authenticated",
        "role": "authenticated",
    },
    priv_jwk,
    algorithm="ES256",
    headers={"kid": "test-kid"},
)

payload = decode_supabase_token(token)
assert payload["email"] == "test@example.com", payload
assert payload["sub"] == "user-uuid-123"

# 4) Tampered token must fail
try:
    decode_supabase_token(token[:-4] + "AAAA")
except Exception:
    pass
else:
    raise AssertionError("tampered token was accepted")

print("JWKS/ES256 verification OK")
