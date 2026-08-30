# Orbital Guardian — Shared API Contract (v1)

All subagents MUST conform to this contract. Do not rename fields.

## Backend stack
- FastAPI app at `backend/app/main.py` (mounted by LEAD after subagents finish)
- All routes registered WITHOUT a prefix in routers; the frontend dev proxy
  strips `/api`, so e.g. router path `/auth/login` is called by frontend as `/api/auth/login`.

## Environment variables (`backend/.env`)
- DATABASE_URL  (default fallback: sqlite:///./orbital_guardian.db)
- JWT_SECRET_KEY
- JWT_ALGORITHM=HS256, JWT_EXPIRE_MINUTES=1440 (defaults fine)
- OPENAI_API_KEY / OPENAI_BASE_URL / LLM_MODEL (optional; LLM is optional)

## Auth (routers/auth.py)
- POST /auth/register  {name?, email, password} -> 200 {token: "...", user: {id, email, name}}
- POST /auth/login     {email, password}        -> 200 {token: "...", user: {id, email, name}}
- GET  /auth/me        Bearer JWT               -> {id, email, name}
- Errors: {detail: "message"} with proper status codes.
- Frontend expects `data.token` and `data.user`. Passwords hashed (passlib bcrypt).

## Forecast (routers/forecast.py)
- POST /forecast {objects:[25544,43013], horizon_hours:24, step_minutes:1}
```json
{
  "forecast": {"start_time": "ISO", "horizon_hours": 24, "step_minutes": 1, "total_points": 1441},
  "objects": [
    {"norad_id": 25544, "name": "ISS (ZARYA)",
     "points": [{"time": "ISO", "position": [x,y,z], "velocity": [vx,vy,vz]}]}
  ]
}
```
Positions/velocities ECI (TEME), km and km/s.

## Conjunction (routers/forecast.py)
- POST /conjunction {objects:[a,b], horizon_hours, step_minutes} ->
```json
{
  "object_a": {"norad_id": 25544, "name": "ISS (ZARYA)"},
  "object_b": {"norad_id": 43013, "name": "NOAA 20"},
  "coarse_tca": "ISO", "coarse_distance_km": 123.4,
  "tca": "ISO", "minimum_distance_km": 122.9,
  "position_a_at_tca": [x,y,z], "position_b_at_tca": [x,y,z],
  "relative_velocity_km_s": 10.2,
  "risk": "LOW"
}
```
- POST /screening {objects:[a,b,c,d], horizon_hours, step_minutes,
  threshold_km=5.0, within_hours=null} ->
  {"events": [<conjunction result + "flagged": bool>], "count": n,
   "threshold_km": 5.0, "within_hours": 24,
   "flagged_count": k, "flagged_pairs": [{object_a, object_b, tca,
   time_to_tca_hours, minimum_distance_km, risk}]}
  Unique pairs only (i<j), sorted ascending by minimum_distance_km.
  A pair is flagged when minimum_distance_km < threshold_km and its TCA
  falls within within_hours from now (within_hours defaults to horizon_hours).

## Risk classification (orbital/risk.py) — thresholds on minimum_distance_km
- < 1.0 km   -> CRITICAL
- < 5.0 km   -> HIGH
- < 25.0 km  -> MEDIUM
- else       -> LOW

## History (routers/history.py) — JWT protected
- POST /history   body = full /conjunction response JSON -> saved record with id
- GET  /history   -> [{id, object_a_name, object_b_name, tca, minimum_distance_km, risk, created_at}]
- GET /history/{id} -> full stored payload + metadata

## Chat (routers/chat.py)
- POST /chat {question: str, event?: <conjunction result JSON or null>}
-> {"answer": str, "sources": ["sgp4.md", ...]}

## Catalog
- GET /objects -> [{norad_id, name}] for a curated catalog list (ISS, NOAA 20, STARLINK, etc.)
- GET /health  -> {"status": "ok"} (public, no auth)

## JWT protection
Protected: /forecast, /conjunction, /screening, /history, /chat, /auth/me.
Public: /health, /objects, /docs.

## Orbital module contracts (backend/app/orbital/)
- tle.fetch_tle(norad_id:int) -> dict {norad_id, name, line1, line2, epoch}
  Celestrak GP query, cached to backend/data/tle_cache.json, bundled static
  fallback TLEs if network fails. Raise ValueError for unknown NORAD ID.
- propagate.generate_trajectory(tle_dict, start_dt, horizon_hours, step_minutes)
  -> list of {"time": ISO, "position": [x,y,z], "velocity": [vx,vy,vz]}
  Uses sgp4 library, TEME frame. Points = int(horizon_hours*60/step_minutes)+1.
- conjunction.find_closest_approach(traj_a, traj_b) ->
  {"tca": ISO, "distance_km": float} (coarse scan over trajectory points)
- conjunction.refine_tca(tle_a, tle_b, coarse_tca_dt) ->
  {"tca": ISO, "distance_km": float,
   "position_a": [...], "position_b": [...]} (SGP4 re-propagation at fine steps around TCA)
- risk.classify_risk(min_distance_km) -> "LOW"|"MEDIUM"|"HIGH"|"CRITICAL"
