"""Conjunction detection: closest approach search and refinement."""

from datetime import datetime, timedelta

from app.orbital.propagate import generate_trajectory


def _dist(a: list[float], b: list[float]) -> float:
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def find_closest_approach(traj_a: list[dict], traj_b: list[dict]) -> dict:
    """Coarse closest approach over paired trajectory points."""
    best_tca = None
    best_d = None
    for pa, pb in zip(traj_a, traj_b):
        d = _dist(pa["position"], pb["position"])
        if best_d is None or d < best_d:
            best_d = d
            best_tca = pa["time"]
    return {"tca": best_tca, "distance_km": best_d}


def refine_tca(
    tle_a: dict,
    tle_b: dict,
    coarse_tca_dt: datetime,
    window_seconds: float = 120,
    step_seconds: float = 5,
) -> dict:
    """Re-propagate both objects at fine steps around the coarse TCA."""
    start = coarse_tca_dt - timedelta(seconds=window_seconds)
    horizon_hours = (2 * window_seconds) / 3600.0
    step_minutes = step_seconds / 60.0

    traj_a = generate_trajectory(tle_a, start, horizon_hours=horizon_hours, step_minutes=step_minutes)
    traj_b = generate_trajectory(tle_b, start, horizon_hours=horizon_hours, step_minutes=step_minutes)

    best_i = 0
    best_d = None
    for i, (pa, pb) in enumerate(zip(traj_a, traj_b)):
        d = _dist(pa["position"], pb["position"])
        if best_d is None or d < best_d:
            best_d = d
            best_i = i

    pa, pb = traj_a[best_i], traj_b[best_i]
    rel_v = _dist(pb["velocity"], pa["velocity"])
    return {
        "tca": pa["time"],
        "distance_km": best_d,
        "position_a": pa["position"],
        "position_b": pb["position"],
        "relative_velocity_km_s": rel_v,
    }
