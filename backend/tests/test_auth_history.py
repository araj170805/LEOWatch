"""Standalone integration test for auth + history routes."""

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
os.environ["DATABASE_URL"] = "sqlite:///./test_og.db"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-tests-only"

for db_file in (BACKEND_DIR / "test_og.db",):
    if db_file.exists():
        db_file.unlink()

import uuid
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import init_db
from app.routers import auth as auth_router_module
from app.routers import history as history_router_module

# Override test settings
settings = get_settings()
settings.DATABASE_URL = "sqlite:///./test_og.db"
settings.JWT_SECRET_KEY = "test-secret-key-for-tests-only"
settings.SUPABASE_URL = ""
settings.SUPABASE_JWT_SECRET = ""

app = FastAPI()
app.include_router(auth_router_module.router)
app.include_router(history_router_module.router)
init_db()

client = TestClient(app)

results = []


def check(name, condition, extra=""):
    results.append((name, bool(condition)))
    status = "PASS" if condition else f"FAIL {extra}"
    print(f"[{status}] {name}")


def main() -> int:
    uid = uuid.uuid4().hex[:6]
    creds = {"name": "Alice", "email": f"alice_{uid}@example.com", "password": "supersecret1"}

    r = client.post("/auth/register", json=creds)
    check("register 200", r.status_code == 200, r.text)
    body = r.json() if r.status_code == 200 else {}
    token = body.get("token", "")
    user = body.get("user", {})
    check(
        "register returns token + user{id,email,name}",
        token and user.get("id") and user.get("email") == creds["email"] and "name" in user,
        str(body),
    )

    r = client.post("/auth/register", json=creds)
    check("duplicate register 409", r.status_code == 409, r.text)

    r = client.post("/auth/login", json={"email": creds["email"], "password": creds["password"]})
    check("login 200 with token+user", r.status_code == 200 and "token" in r.json(), r.text)

    r = client.post("/auth/login", json={"email": creds["email"], "password": "wrongpass"})
    check("bad login 401", r.status_code == 401, r.text)

    headers = {"Authorization": f"Bearer {token}"}
    r = client.get("/auth/me", headers=headers)
    check(
        "/auth/me 200",
        r.status_code == 200 and r.json().get("email") == creds["email"],
        r.text,
    )

    r = client.get("/auth/me")
    check("/auth/me without token 401", r.status_code == 401, r.text)

    event = {
        "object_a": {"norad_id": 25544, "name": "ISS (ZARYA)"},
        "object_b": {"norad_id": 43013, "name": "NOAA 20"},
        "coarse_tca": "2026-08-25T12:00:00Z",
        "coarse_distance_km": 123.4,
        "tca": "2026-08-25T12:00:01Z",
        "minimum_distance_km": 122.9,
        "position_a_at_tca": [1000.0, 2000.0, 3000.0],
        "position_b_at_tca": [1010.0, 2010.0, 3010.0],
        "relative_velocity_km_s": 10.2,
        "risk": "LOW",
    }
    r = client.post("/history", json=event, headers=headers)
    check("POST /history saved id", r.status_code == 200 and r.json().get("saved") is True, r.text)
    saved_id = r.json().get("id") if r.status_code == 200 else None

    r = client.post("/history", json=event)
    check("POST /history without token 401", r.status_code == 401, r.text)

    r = client.get("/history", headers=headers)
    ok = (
        r.status_code == 200
        and isinstance(r.json(), list)
        and len(r.json()) == 1
        and r.json()[0]["object_a_name"] == "ISS (ZARYA)"
        and r.json()[0]["risk"] == "LOW"
        and r.json()[0]["satellite_a_norad_id"] == 25544
    )
    check("GET /history summaries", ok, r.text)

    r = client.get(f"/history/{saved_id}", headers=headers) if saved_id else None
    ok = (
        r is not None
        and r.status_code == 200
        and r.json()["payload"]["object_b"]["norad_id"] == 43013
        and r.json()["minimum_distance_km"] == 122.9
    )
    check(f"GET /history/{saved_id} payload+metadata", ok, r.text if r else "no id")

    # second user must not see first user's record
    client.post(
        "/auth/register", json={"email": "bob@example.com", "password": "bobsecret99"}
    )
    rb = client.post("/auth/login", json={"email": "bob@example.com", "password": "bobsecret99"})
    bob_headers = {"Authorization": f"Bearer {rb.json()['token']}"}
    r = client.get(f"/history/{saved_id}", headers=bob_headers) if saved_id else None
    check("other user's item 404", r is not None and r.status_code == 404, r.text if r else "no id")

    r = client.get("/history/999999", headers=headers)
    check("missing item 404", r.status_code == 404, r.text)

    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    print(f"\n{passed}/{total} checks passed")
    return 0 if passed == total else 1


if __name__ == "__main__":
    code = main()
    try:
        engine_file = BACKEND_DIR / "test_og.db"
        if engine_file.exists():
            engine_file.unlink()
    except Exception as exc:
        print(f"note: could not delete test_og.db ({exc})")
    sys.exit(code)
