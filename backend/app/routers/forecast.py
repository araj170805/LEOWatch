"""Forecast, conjunction, and screening routes."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.orbital import conjunction as conj
from app.orbital import risk as risk_mod
from app.orbital import tle as tle_mod
from app.orbital.propagate import generate_trajectory
from app.schemas import ConjunctionRequest, ForecastRequest, ScreeningRequest

# NOTE: forecast / conjunction / screening are PUBLIC scientific endpoints.
# They perform no per-user persistence, so they carry no auth dependency.
router = APIRouter()


def _sig(x: float, digits: int = 6) -> float:
    return float(f"{x:.{digits}g}")


def _round_vec(v: list[float], ndigits: int = 6) -> list[float]:
    return [round(x, ndigits) for x in v]


def _start_time() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(second=0, microsecond=0)


def _fetch_tle_or_none(norad_id: int):
    try:
        return tle_mod.fetch_tle(norad_id)
    except ValueError as exc:
        return exc


def _conjunction_event(
    id_a: int,
    id_b: int,
    tles: dict[int, dict],
    trajs: dict[int, list[dict]],
) -> dict:
    coarse = conj.find_closest_approach(trajs[id_a], trajs[id_b])
    coarse_dt = datetime.fromisoformat(coarse["tca"])
    refined = conj.refine_tca(tles[id_a], tles[id_b], coarse_dt)
    min_dist = _sig(refined["distance_km"])
    rel_v = _sig(refined["relative_velocity_km_s"])

    tca_dt = datetime.fromisoformat(refined["tca"])
    if tca_dt.tzinfo is None:
        tca_dt = tca_dt.replace(tzinfo=timezone.utc)
    time_to_tca_h = max(0.0, (tca_dt - datetime.now(timezone.utc)).total_seconds() / 3600.0)

    name_b = tles[id_b]["name"]
    scored = risk_mod.score_conjunction(min_dist, rel_v, time_to_tca_h, name_b)
    return {
        "object_a": {"norad_id": id_a, "name": tles[id_a]["name"]},
        "object_b": {"norad_id": id_b, "name": name_b},
        "coarse_tca": coarse["tca"],
        "coarse_distance_km": _sig(coarse["distance_km"]),
        "tca": refined["tca"],
        "time_to_tca_hours": round(time_to_tca_h, 3),
        "minimum_distance_km": min_dist,
        "position_a_at_tca": _round_vec(refined["position_a"]),
        "position_b_at_tca": _round_vec(refined["position_b"]),
        "relative_velocity_km_s": rel_v,
        "risk": scored["level"],
        "risk_score": scored["score"],
        "risk_factors": scored["factors"],
        "risk_method": scored["method"],
        "data_quality": {
            "object_a": {
                "source": tles[id_a].get("source"),
                "tle_epoch": tles[id_a].get("epoch"),
                "tle_age_days": tles[id_a].get("age_days"),
                "freshness": tles[id_a].get("freshness"),
            },
            "object_b": {
                "source": tles[id_b].get("source"),
                "tle_epoch": tles[id_b].get("epoch"),
                "tle_age_days": tles[id_b].get("age_days"),
                "freshness": tles[id_b].get("freshness"),
            },
        },
    }


@router.post("/forecast")
def forecast(body: ForecastRequest):
    start = _start_time()
    objects: list[dict] = []
    errors: list[dict] = []
    for norad_id in body.objects:
        try:
            tle = tle_mod.fetch_tle(norad_id)
            points = generate_trajectory(tle, start, body.horizon_hours, body.step_minutes)
            objects.append({"norad_id": norad_id, "name": tle["name"], "points": points})
        except (ValueError, RuntimeError) as exc:
            errors.append({"norad_id": norad_id, "error": str(exc)})
    if not objects:
        raise HTTPException(status_code=502, detail=f"All requested objects failed: {errors}")
    payload = {
        "forecast": {
            "start_time": start.isoformat(),
            "horizon_hours": body.horizon_hours,
            "step_minutes": body.step_minutes,
            "total_points": len(objects[0]["points"]),
        },
        "objects": objects,
    }
    if errors:
        payload["errors"] = errors
    return payload


@router.post("/conjunction")
def conjunction(body: ConjunctionRequest):
    if len(body.objects) != 2:
        raise HTTPException(status_code=400, detail="Exactly 2 object NORAD ids are required")
    id_a, id_b = body.objects
    tles: dict[int, dict] = {}
    for nid in (id_a, id_b):
        result = _fetch_tle_or_none(nid)
        if isinstance(result, Exception):
            raise HTTPException(status_code=404, detail=str(result))
        tles[nid] = result
    start = _start_time()
    trajs = {
        nid: generate_trajectory(tles[nid], start, body.horizon_hours, body.step_minutes)
        for nid in (id_a, id_b)
    }
    return _conjunction_event(id_a, id_b, tles, trajs)


@router.post("/screening")
def screening(body: ScreeningRequest):
    if len(body.objects) < 2:
        raise HTTPException(status_code=400, detail="At least 2 object NORAD ids are required")
    unique_ids = list(dict.fromkeys(body.objects))[:8]
    tles: dict[int, dict] = {}
    errors: list[dict] = []
    for nid in unique_ids:
        result = _fetch_tle_or_none(nid)
        if isinstance(result, Exception):
            errors.append({"norad_id": nid, "error": str(result)})
        else:
            tles[nid] = result
    if len(tles) < 2:
        raise HTTPException(status_code=502, detail=f"Need at least 2 resolvable objects; failures: {errors}")
    start = _start_time()
    trajs = {
        nid: generate_trajectory(tles[nid], start, body.horizon_hours, body.step_minutes)
        for nid in tles
    }
    events: list[dict] = []
    ids = list(tles.keys())
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            events.append(_conjunction_event(ids[i], ids[j], tles, trajs))
    events.sort(key=lambda e: e["minimum_distance_km"])
    return {"events": events, "count": len(events)}
