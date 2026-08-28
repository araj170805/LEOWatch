"""SGP4 trajectory propagation."""

from datetime import datetime, timedelta

from sgp4.api import Satrec, jday as _jday


def generate_trajectory(
    tle_dict: dict,
    start_dt: datetime,
    horizon_hours: float = 24,
    step_minutes: float = 1,
) -> list[dict]:
    """Propagate a TLE into a list of ECI (TEME) state points."""
    satrec = Satrec.twoline2rv(tle_dict["line1"], tle_dict["line2"])
    n_points = int(horizon_hours * 60 / step_minutes) + 1
    step = timedelta(minutes=step_minutes)
    points: list[dict] = []
    for i in range(n_points):
        dt = start_dt + step * i
        jd, fr = _jday(
            dt.year, dt.month, dt.day, dt.hour, dt.minute,
            dt.second + dt.microsecond * 1e-6,
        )
        error, r, v = satrec.sgp4(jd, fr)
        if error != 0:
            raise RuntimeError(f"SGP4 error code {error} for NORAD {tle_dict.get('norad_id')}")
        points.append({
            "time": dt.isoformat(),
            "position": list(r),
            "velocity": list(v),
        })
    return points
