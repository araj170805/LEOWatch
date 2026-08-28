"""Deterministic heuristic risk ranking for conjunction events.

This is an OPERATIONAL HEURISTIC PRIORITY score (0-100), NOT a formal
Probability of Collision (Pc). All numbers here are computed deterministically
from the conjunction geometry produced by the SGP4 + refinement pipeline.
The AI layer only *explains* these numbers; it never computes them.
"""

CRITICAL_KM = 1.0
HIGH_KM = 5.0
MEDIUM_KM = 25.0


def classify_risk(min_distance_km: float) -> str:
    if min_distance_km < CRITICAL_KM:
        return "CRITICAL"
    if min_distance_km < HIGH_KM:
        return "HIGH"
    if min_distance_km < MEDIUM_KM:
        return "MEDIUM"
    return "LOW"


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def score_conjunction(
    min_distance_km: float,
    relative_velocity_km_s: float | None = None,
    time_to_tca_hours: float | None = None,
    object_type: str | None = None,
) -> dict:
    """Return a heuristic 0-100 priority score plus its contributing factors.

    Each factor is normalised 0..1 (1 = worse) so the UI can render bars.
    Weights are fixed and documented so the ranking stays explainable.
    """
    # Miss distance: dominant factor. 0 km -> 1.0, >= 50 km -> 0.0
    f_distance = _clamp(1.0 - (min_distance_km / 50.0))

    # Relative velocity: higher closing speed -> less warning, worse outcome.
    # 0 km/s -> 0.0, >= 15 km/s -> 1.0
    rv = relative_velocity_km_s or 0.0
    f_velocity = _clamp(rv / 15.0)

    # Time to TCA: sooner -> higher operational urgency.
    # <= 2 h -> 1.0, >= 72 h -> 0.0
    tt = time_to_tca_hours if time_to_tca_hours is not None else 72.0
    f_time = _clamp(1.0 - ((tt - 2.0) / 70.0))

    # Object type: uncontrolled debris / rocket bodies cannot manoeuvre.
    otype = (object_type or "").upper()
    if "DEB" in otype:
        f_type = 1.0
    elif "R/B" in otype or "ROCKET" in otype:
        f_type = 0.8
    else:
        f_type = 0.3

    weights = {"distance": 0.5, "velocity": 0.2, "time": 0.2, "type": 0.1}
    raw = (
        f_distance * weights["distance"]
        + f_velocity * weights["velocity"]
        + f_time * weights["time"]
        + f_type * weights["type"]
    )
    score = round(raw * 100)

    return {
        "score": score,
        "level": classify_risk(min_distance_km),
        "factors": {
            "miss_distance": round(f_distance, 3),
            "relative_velocity": round(f_velocity, 3),
            "time_to_tca": round(f_time, 3),
            "object_type": round(f_type, 3),
        },
        "method": "Operational heuristic risk ranking — not formal Probability of Collision (Pc).",
    }
