"""Standalone orbital engine tests. Run from repo root: python backend/tests/test_orbital.py"""

import math
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.orbital.conjunction import find_closest_approach, refine_tca
from app.orbital.propagate import generate_trajectory
from app.orbital.risk import classify_risk
from app.orbital.tle import fetch_tle


def main() -> None:
    results: list[tuple[str, bool]] = []

    print("TEST A: fetch_tle(25544)")
    try:
        tle = fetch_tle(25544)
        print(f"  PASS  name={tle['name']!r} epoch={tle['epoch']}")
        results.append(("A", True))
    except ValueError as exc:
        print(f"  FAIL  {exc}")
        results.append(("A", False))

    start = datetime(2026, 8, 25, 12, 0, 0, tzinfo=timezone.utc)

    print("TEST B: ISS trajectory 24h/1min")
    traj_iss = generate_trajectory(fetch_tle(25544), start, horizon_hours=24, step_minutes=1)
    speeds = [math.sqrt(sum(v * v for v in p["velocity"])) for p in traj_iss]
    finite = all(
        all(math.isfinite(x) for x in p["position"]) and all(math.isfinite(x) for x in p["velocity"])
        for p in traj_iss
    )
    avg_speed = sum(speeds) / len(speeds)
    ok = len(traj_iss) == 1441 and finite and abs(avg_speed - 7.6) <= 0.5
    print(f"  points={len(traj_iss)} (expect 1441) finite={finite} avg_speed={avg_speed:.3f} km/s")
    print(f"  {'PASS' if ok else 'FAIL'}")
    results.append(("B", ok))

    print("TEST C: NOAA 20 trajectory 24h/1min")
    tle_noaa = fetch_tle(43013)
    traj_noaa = generate_trajectory(tle_noaa, start, horizon_hours=24, step_minutes=1)
    ok = len(traj_noaa) == 1441
    print(f"  name={tle_noaa['name']!r} points={len(traj_noaa)} (expect 1441)")
    print(f"  {'PASS' if ok else 'FAIL'}")
    results.append(("C", ok))

    print("TEST D: find_closest_approach ISS vs NOAA 20")
    coarse = find_closest_approach(traj_iss, traj_noaa)
    ok = coarse["tca"] is not None and coarse["distance_km"] > 0
    print(f"  coarse_tca={coarse['tca']} coarse_distance_km={coarse['distance_km']:.3f}")
    print(f"  {'PASS' if ok else 'FAIL'}")
    results.append(("D", ok))

    print("TEST E: refine_tca around coarse TCA")
    coarse_dt = datetime.fromisoformat(coarse["tca"])
    refined = refine_tca(fetch_tle(25544), tle_noaa, coarse_dt)
    ok = (
        refined["distance_km"] <= coarse["distance_km"] * 1.05
        and len(refined["position_a"]) == 3
        and len(refined["position_b"]) == 3
    )
    print(
        f"  refined_tca={refined['tca']} refined_distance_km={refined['distance_km']:.3f} "
        f"(coarse {coarse['distance_km']:.3f}, ratio {refined['distance_km'] / coarse['distance_km']:.4f})"
    )
    print(f"  rel_velocity={refined['relative_velocity_km_s']:.3f} km/s |a|={len(refined['position_a'])} |b|={len(refined['position_b'])}")
    print(f"  {'PASS' if ok else 'FAIL'}")
    results.append(("E", ok))

    print("TEST F: classify_risk boundaries")
    checks = [(0.5, "CRITICAL"), (3.0, "HIGH"), (20.0, "MEDIUM"), (100.0, "LOW")]
    ok = all(classify_risk(d) == expected for d, expected in checks)
    detail = ", ".join(f"{d}->{classify_risk(d)}" for d, _ in checks)
    print(f"  {detail}")
    print(f"  {'PASS' if ok else 'FAIL'}")
    results.append(("F", ok))

    failed = [name for name, passed in results if not passed]
    print(f"\n{len(results) - len(failed)}/{len(results)} tests passed." + (f" FAILED: {failed}" if failed else ""))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
