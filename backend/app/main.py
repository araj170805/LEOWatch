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


# Default CelesTrak GROUPs pulled for the full tracking catalog: space stations,
# recent launches, GEO belt, and the four largest tracked debris clouds.
DEFAULT_GROUPS = [
    "stations",
    "last-30-days",
    "active-geosynchronous",
    "cosmos-2251-debris",
    "iridium-33-debris",
    "cosmos-1408-debris",
    "fengyun-1c-debris",
]

# ISO year cutoffs for "TLE age" freshness on the bulk list.
_DEB_GROUP = "-debris"


def _classify_gp(name: str, group: str) -> str:
    up = (name or "").upper()
    if group.endswith(_DEB_GROUP) or "DEB" in up:
        return "DEBRIS"
    if "R/B" in up or "ROCKET" in up:
        return "ROCKET BODY"
    if up.strip():
        return "PAYLOAD"
    return "UNKNOWN"


def _gp_row(rec: dict, group: str) -> dict | None:
    try:
        nid = int(rec["NORAD_CAT_ID"])
        mm = float(rec["MEAN_MOTION"])
        ecc = float(rec.get("ECCENTRICITY", 0.0))
        inc = float(rec.get("INCLINATION", 0.0))
        epoch = str(rec.get("EPOCH", "")) or None
    except (KeyError, ValueError, TypeError):
        return None
    name = str(rec.get("OBJECT_NAME", f"OBJECT {nid}")).strip()

    n_rad_s = mm * 2.0 * math.pi / 86400.0
    sma = (_MU / (n_rad_s * n_rad_s)) ** (1.0 / 3.0) if n_rad_s else None
    age = None
    if epoch:
        try:
            e = datetime.fromisoformat(epoch.replace("Z", "+00:00"))
            if e.tzinfo is None:
                e = e.replace(tzinfo=timezone.utc)
            age = round((datetime.now(timezone.utc) - e).total_seconds() / 86400.0, 2)
        except ValueError:
            age = None
    from app.orbital.tle import freshness_label

    return {
        "norad_id": nid,
        "name": name,
        "type": _classify_gp(name, group),
        "group": group,
        "altitude_km": round(sma - _EARTH_RADIUS_KM, 1) if sma else None,
        "apogee_km": round(sma * (1 + ecc) - _EARTH_RADIUS_KM, 1) if sma else None,
        "perigee_km": round(sma * (1 - ecc) - _EARTH_RADIUS_KM, 1) if sma else None,
        "inclination_deg": round(inc, 2),
        "eccentricity": round(ecc, 5),
        "period_min": round(1440.0 / mm, 1) if mm else None,
        "tle_epoch": epoch,
        "tle_age_days": age,
        "freshness": freshness_label(age),
        "intl_designator": rec.get("OBJECT_ID"),
    }


@app.get("/catalog")
def catalog(
    groups: str | None = None,
    q: str | None = None,
    type: str | None = None,  # noqa: A002 - matches query param name
    sort: str = "norad_id",
    order: str = "asc",
    page: int = 1,
    page_size: int = 100,
) -> dict:
    """Full tracking catalog from CelesTrak GROUP data (many objects at once).

    Each GROUP is fetched once as GP-JSON and cached ~6 h (memory + disk), so
    only the first call is slow. Filtering / sorting / pagination happen here so
    the client only transfers one page. Degrades to disk cache if CelesTrak is
    unreachable.
    """
    from concurrent.futures import ThreadPoolExecutor

    from app.orbital import tle as tle_mod

    group_list = [g.strip().lower() for g in (groups.split(",") if groups else DEFAULT_GROUPS) if g.strip()]
    group_list = group_list[:12]

    with ThreadPoolExecutor(max_workers=max(1, len(group_list))) as pool:
        fetched = list(pool.map(tle_mod.fetch_group, group_list))

    by_id: dict[int, dict] = {}
    for group, records in zip(group_list, fetched):
        for rec in records:
            row = _gp_row(rec, group)
            if row and row["norad_id"] not in by_id:
                by_id[row["norad_id"]] = row
    rows = list(by_id.values())

    counts = {"PAYLOAD": 0, "DEBRIS": 0, "ROCKET BODY": 0, "UNKNOWN": 0}
    for r in rows:
        counts[r["type"]] = counts.get(r["type"], 0) + 1
    total_all = len(rows)

    if type and type.upper() != "ALL":
        rows = [r for r in rows if r["type"] == type.upper()]
    if q:
        ql = q.strip().lower()
        rows = [r for r in rows if ql in r["name"].lower() or ql in str(r["norad_id"])]

    key = sort if sort in {"norad_id", "name", "altitude_km", "inclination_deg", "tle_age_days", "period_min"} else "norad_id"
    rows.sort(
        key=lambda r: (r.get(key) is None, r.get(key) if r.get(key) is not None else 0),
        reverse=(order == "desc"),
    )

    total = len(rows)
    page = max(1, page)
    page_size = max(1, min(page_size, 500))
    start = (page - 1) * page_size
    page_rows = rows[start : start + page_size]

    return {
        "objects": page_rows,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_unfiltered": total_all,
        "counts": counts,
        "groups": group_list,
        "celestrak_reachable": tle_mod.celestrak_reachable(),
        "data_label": "Live catalog data (CelesTrak GP)",
    }


@app.get("/catalog/featured")
def catalog_featured(fast: bool = True) -> dict:
    """The small curated set used for default screening / the 3D selector."""
    from concurrent.futures import ThreadPoolExecutor

    from app.orbital import tle as tle_mod

    def resolve(entry: dict) -> dict:
        row = {**entry, "type": classify_object(entry["name"]), "freshness": "UNKNOWN", "source": None}
        try:
            tle = tle_mod.peek_tle(entry["norad_id"]) if fast else tle_mod.fetch_tle(entry["norad_id"], timeout=5)
        except ValueError:
            tle = None
        if tle:
            row.update({
                "tle_epoch": tle.get("epoch"),
                "tle_age_days": tle.get("age_days"),
                "freshness": tle.get("freshness"),
                "source": tle.get("source"),
            })
        return row

    with ThreadPoolExecutor(max_workers=len(CATALOG)) as pool:
        items = list(pool.map(resolve, CATALOG))
    return {"objects": items, "count": len(items)}


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
