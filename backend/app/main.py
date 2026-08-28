"""Orbital Guardian — FastAPI application entry point.

Endpoint policy
---------------
PUBLIC  (no account): /catalog, /objects, /object/{id}, /forecast,
        /conjunction, /screening, /chat, /health
PROTECTED (account):   /history* (personal saved analyses)

TLE = orbital elements used for SGP4 propagation. TLE is NOT spacecraft
telemetry. The UI labels this data "latest available orbital data".
"""

import math
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import auth, chat, forecast, history


def _prewarm_tle_cache() -> None:
    """Warm the TLE cache for the seed catalog in the background so the first
    /catalog or /screening request isn't slow (and the circuit breaker trips
    quickly if CelesTrak is unreachable)."""
    from concurrent.futures import ThreadPoolExecutor

    from app.orbital import tle as tle_mod

    def _one(nid: int) -> None:
        try:
            tle_mod.fetch_tle(nid, timeout=6)
        except Exception:  # noqa: BLE001
            pass

    with ThreadPoolExecutor(max_workers=len(CATALOG)) as pool:
        list(pool.map(_one, [c["norad_id"] for c in CATALOG]))


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    import threading

    threading.Thread(target=_prewarm_tle_cache, daemon=True).start()
    yield


app = FastAPI(title="Orbital Guardian", version="1.1.0", lifespan=lifespan)

# CORS: explicit origins from CORS_ORIGINS + always allow localhost dev + any
# *.vercel.app deployment (preview and production) via regex, so the frontend
# works without extra configuration. If CORS_ORIGINS contains "*", open fully.
_explicit_origins = settings.cors_origins
_LOCAL_ORIGINS = [
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:3000", "http://127.0.0.1:3000",
    "http://localhost:4173", "http://127.0.0.1:4173",
]
if "*" in _explicit_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=sorted(set(_explicit_origins) | set(_LOCAL_ORIGINS)),
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Curated seed catalog. These NORAD ids resolve against live CelesTrak data;
# the static entries in app/orbital/tle.py are only a last-resort cache so the
# demo degrades gracefully (clearly labelled "bundled") rather than faking data.
CATALOG = [
    {"norad_id": 25544, "name": "ISS (ZARYA)", "type": "PAYLOAD"},
    {"norad_id": 43013, "name": "NOAA 20", "type": "PAYLOAD"},
    {"norad_id": 48274, "name": "STARLINK-3012", "type": "PAYLOAD"},
    {"norad_id": 44714, "name": "STARLINK-1130", "type": "PAYLOAD"},
    {"norad_id": 37820, "name": "SL-16 R/B", "type": "ROCKET BODY"},
    {"norad_id": 22675, "name": "COSMOS 2251 DEB", "type": "DEBRIS"},
    {"norad_id": 28654, "name": "IRIDIUM 33 DEB", "type": "DEBRIS"},
]

_EARTH_RADIUS_KM = 6378.137
_MU = 398600.4418  # km^3 / s^2


def classify_object(name: str) -> str:
    """Best-effort object class from the catalog name.

    Status/classification is a heuristic on the object name only — TLE data
    alone cannot confirm whether a payload is still operational.
    """
    up = (name or "").upper()
    if "DEB" in up:
        return "DEBRIS"
    if "R/B" in up or "ROCKET" in up:
        return "ROCKET BODY"
    if up.strip():
        return "PAYLOAD"
    return "UNKNOWN"


def _orbital_state(tle: dict) -> dict:
    """Derive instantaneous orbital state + geometry from a TLE via SGP4."""
    from app.orbital.propagate import generate_trajectory

    now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    pts = generate_trajectory(tle, now, 0, 1)
    p = pts[0]["position"]
    v = pts[0]["velocity"]
    r = math.sqrt(sum(c * c for c in p))
    speed = math.sqrt(sum(c * c for c in v))
    altitude = round(r - _EARTH_RADIUS_KM, 2)

    line2 = tle["line2"]
    inclination = float(line2[8:16])
    eccentricity = float("0." + line2[26:33].strip())
    mean_motion = float(line2[52:63])  # revs / day
    period_min = round(1440.0 / mean_motion, 2) if mean_motion else None

    # Semi-major axis from mean motion -> apogee / perigee altitudes.
    n_rad_s = mean_motion * 2 * math.pi / 86400.0
    sma = (_MU / (n_rad_s * n_rad_s)) ** (1.0 / 3.0) if n_rad_s else None
    apogee = round(sma * (1 + eccentricity) - _EARTH_RADIUS_KM, 2) if sma else None
    perigee = round(sma * (1 - eccentricity) - _EARTH_RADIUS_KM, 2) if sma else None

    return {
        "position_eci_km": [round(c, 3) for c in p],
        "velocity_eci_km_s": [round(c, 6) for c in v],
        "altitude_km": altitude,
        "speed_km_s": round(speed, 4),
        "inclination_deg": round(inclination, 4),
        "eccentricity": eccentricity,
        "mean_motion_rev_day": mean_motion,
        "period_min": period_min,
        "apogee_km": apogee,
        "perigee_km": perigee,
        "frame": "TEME/ECI (SGP4 native)",
        "epoch_utc": now.isoformat(),
    }


@app.get("/")
def root() -> dict:
    return {"service": "Orbital Guardian", "status": "ok"}


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/objects")
def objects() -> list[dict]:
    return CATALOG


@app.get("/catalog")
def catalog(fast: bool = False) -> dict:
    """Seed catalog with the LATEST AVAILABLE orbital data per object.

    Pulls live CelesTrak elements for all objects in parallel (results are
    memory-cached for 1 h by the TLE layer, so only the first call is slow).
    Each object independently falls back to disk cache, then bundled elements,
    so the list always renders even if CelesTrak is unreachable.
    Pass ?fast=true to skip the network and read caches only.
    """
    from concurrent.futures import ThreadPoolExecutor

    from app.orbital import tle as tle_mod

    def resolve(entry: dict) -> dict:
        row = {
            **entry,
            "type": classify_object(entry["name"]),
            "tle_epoch": None,
            "tle_age_days": None,
            "freshness": "UNKNOWN",
            "source": None,
        }
        try:
            tle = tle_mod.peek_tle(entry["norad_id"]) if fast else tle_mod.fetch_tle(entry["norad_id"], timeout=5)
        except ValueError:
            tle = None
        if tle:
            row.update(
                {
                    "tle_epoch": tle.get("epoch"),
                    "tle_age_days": tle.get("age_days"),
                    "freshness": tle.get("freshness"),
                    "source": tle.get("source"),
                }
            )
        return row

    with ThreadPoolExecutor(max_workers=len(CATALOG)) as pool:
        items = list(pool.map(resolve, CATALOG))

    live = sum(1 for it in items if it["source"] == "live")
    return {
        "objects": items,
        "count": len(items),
        "live_count": live,
        "data_label": "Latest available orbital data (CelesTrak)",
    }


@app.get("/object/{norad_id}")
def get_object_details(norad_id: int) -> dict:
    from app.orbital import tle as tle_mod

    try:
        tle = tle_mod.fetch_tle(norad_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    try:
        state = _orbital_state(tle)
    except Exception as exc:  # noqa: BLE001 — SGP4 propagation failure
        raise HTTPException(status_code=422, detail=f"SGP4 propagation failed: {exc}") from exc

    name = tle.get("name", f"OBJECT {norad_id}")
    intl_designator = tle["line1"][9:17].strip()

    return {
        # identity
        "id": norad_id,
        "norad_id": norad_id,
        "name": name,
        "type": classify_object(name),
        "international_designator": intl_designator or None,
        # orbital state
        "altitudeKm": state["altitude_km"],
        "inclinationDeg": state["inclination_deg"],
        "period": f"{state['period_min']} min" if state["period_min"] else "Unknown",
        "orbital_state": state,
        # data quality
        "data_source": "CelesTrak" if tle.get("source") == "live" else f"{tle.get('source')} cache",
        "tle_epoch": tle.get("epoch"),
        "tle_age_days": tle.get("age_days"),
        "freshness": tle.get("freshness"),
        "lastUpdated": tle.get("epoch"),
        # provenance note
        "note": "TLE orbital elements propagated locally with SGP4 — not spacecraft telemetry.",
    }


app.include_router(auth.router)
app.include_router(forecast.router)
app.include_router(history.router)
app.include_router(chat.router)
