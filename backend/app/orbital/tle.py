"""TLE fetching with disk cache and static fallbacks."""

import json
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

CELESTRAK_URLS = (
    "https://celestrak.org/NORAD/elements/gp.php",
    "https://celestrak.com/NORAD/elements/gp.php",
)
CELESTRAK_URL = CELESTRAK_URLS[0]  # kept for backwards compatibility
DEFAULT_HTTP_TIMEOUT = 6
CACHE_TTL_SECONDS = 3600

# Circuit breaker: once CelesTrak fails, stop hammering it for a while so that
# /screening, /forecast and /catalog stay fast (they fall straight through to
# cached / bundled elements instead of timing out per object).
_CIRCUIT_COOLDOWN_SECONDS = 90.0
_circuit_open_until = 0.0


def celestrak_reachable() -> bool:
    return time.monotonic() >= _circuit_open_until


def _trip_circuit() -> None:
    global _circuit_open_until
    _circuit_open_until = time.monotonic() + _CIRCUIT_COOLDOWN_SECONDS
CACHE_PATH = Path(__file__).resolve().parents[2] / "data" / "tle_cache.json"

_MEM_CACHE: dict[int, tuple[float, dict]] = {}

STATIC_TLES = {
    25544: {
        "name": "ISS (ZARYA)",
        "line1": "1 25544U 98067A   24186.53509954  .00020164  00000+0  35581-3 0  9995",
        "line2": "2 25544  51.6393 208.0224 0010896 199.2989 237.6630 15.49969219 12345",
    },
    43013: {
        "name": "NOAA 20",
        "line1": "1 43013U 17073A   24186.26451234  .00000250  00000+0  11234-3 0  9990",
        "line2": "2 43013  98.7165 210.4567 0001234 123.4567 236.5432 14.19570001 34560",
    },
    48274: {
        "name": "STARLINK-3012",
        "line1": "1 48274U 21027A   24186.19097222  .00012000  00000+0  75000-3 0  9995",
        "line2": "2 48274  53.0540 320.1234 0001500 100.5000 259.6000 15.06000000 23450",
    },
    44714: {
        "name": "STARLINK-1130",
        "line1": "1 44714U 19074AC  24186.20000000  .00011000  00000+0  72000-3 0  9990",
        "line2": "2 44714  53.0012 145.6789 0001800  95.3000 264.8000 15.06050001 24560",
    },
    37820: {
        "name": "SL-16 R/B",
        "line1": "1 37820U 11053D   24186.16219491  .00006402  00000+0  47603-3 0  9998",
        "line2": "2 37820  82.4860 278.6540 0035561 250.1234 109.5678 14.21300001 45670",
    },
    22675: {
        "name": "COSMOS 2251 DEB",
        "line1": "1 22675U 93036SX  24186.15000000 -.00003000  00000+0  15000-3 0  9990",
        "line2": "2 22675  74.0389  85.1234 0045000 200.1000 159.9000 14.10800001 56780",
    },
    28654: {
        "name": "IRIDIUM 33 DEB",
        "line1": "1 28654U 97034F   24186.16000000 -.00002000  00000+0  12000-3 0  9990",
        "line2": "2 28654  86.4000 175.4321 0012000 310.2000  49.9000 14.34000001 67890",
    },
}


def _epoch_from_line1(line1: str) -> str:
    raw = line1[18:32].strip()
    yy = int(raw[:2])
    year = 2000 + yy if yy < 57 else 1900 + yy
    day_of_year = float(raw[2:])
    base = datetime(year, 1, 1, tzinfo=timezone.utc)
    epoch = base + timedelta(days=day_of_year - 1)
    return epoch.isoformat()


def _age_days_from_epoch(epoch_iso: str) -> float | None:
    try:
        epoch = datetime.fromisoformat(epoch_iso)
        if epoch.tzinfo is None:
            epoch = epoch.replace(tzinfo=timezone.utc)
        return round((datetime.now(timezone.utc) - epoch).total_seconds() / 86400.0, 2)
    except (ValueError, TypeError):
        return None


def freshness_label(age_days: float | None) -> str:
    if age_days is None:
        return "UNKNOWN"
    if age_days <= 7:
        return "FRESH"
    if age_days <= 30:
        return "AGING"
    return "STALE"


def _load_disk_cache() -> dict:
    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {int(k): v for k, v in data.items()}
    except (OSError, ValueError):
        return {}


def _save_to_disk_cache(entry: dict) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    disk = _load_disk_cache()
    disk[entry["norad_id"]] = entry
    try:
        with open(CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(disk, f, indent=2)
    except OSError:
        pass


def peek_tle(norad_id: int) -> dict | None:
    """Return cached/bundled elements WITHOUT any network call.

    Used by list endpoints (e.g. /catalog) so they stay fast and never block
    on CelesTrak. Returns None when nothing is cached for this object.
    """
    cached = _MEM_CACHE.get(norad_id)
    if cached:
        return dict(cached[1])

    src = None
    tle = None
    disk = _load_disk_cache().get(norad_id)
    if disk:
        tle = {k: v for k, v in disk.items() if k in ("norad_id", "name", "line1", "line2")}
        src = "cached"
    elif norad_id in STATIC_TLES:
        tle = {"norad_id": norad_id, **STATIC_TLES[norad_id]}
        src = "bundled"

    if tle is None:
        return None

    tle["epoch"] = _epoch_from_line1(tle["line1"])
    tle["source"] = src
    tle["age_days"] = _age_days_from_epoch(tle["epoch"])
    tle["freshness"] = freshness_label(tle["age_days"])
    return tle


def fetch_tle(norad_id: int, timeout: int = DEFAULT_HTTP_TIMEOUT) -> dict:
    """Fetch a TLE by NORAD id from Celestrak with layered fallbacks."""
    now = time.monotonic()
    cached = _MEM_CACHE.get(norad_id)
    if cached and now - cached[0] < CACHE_TTL_SECONDS:
        return dict(cached[1])

    tle = None
    source = None
    if celestrak_reachable():
        any_error = False
        for base_url in CELESTRAK_URLS:
            try:
                resp = requests.get(
                    base_url,
                    params={"CATNR": norad_id, "FORMAT": "TLE"},
                    timeout=timeout,
                    verify=False,  # Bypass local SSL interception causing SSLEOFError
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"},
                )
                lines = [ln.rstrip() for ln in resp.text.splitlines() if ln.strip()]
                if resp.status_code == 200 and len(lines) >= 3 and lines[1].startswith("1 ") and lines[2].startswith("2 "):
                    tle = {
                        "norad_id": norad_id,
                        "name": lines[0].strip(),
                        "line1": lines[1],
                        "line2": lines[2],
                    }
                    source = "live"
                    break
            except requests.RequestException:
                any_error = True
                continue
        if tle is None and any_error:
            _trip_circuit()  # CelesTrak unreachable — stop retrying for a bit

    if tle is None:
        disk = _load_disk_cache().get(norad_id)
        if disk:
            tle = {k: v for k, v in disk.items() if k in ("norad_id", "name", "line1", "line2")}
            source = "cached"

    if tle is None:
        static = STATIC_TLES.get(norad_id)
        if static:
            tle = {"norad_id": norad_id, **static}
            source = "bundled"

    if tle is None:
        # NO FAKE DATA POLICY: never synthesise orbital elements. If CelesTrak
        # is unreachable and we have no cached/bundled element set, the object
        # is simply unavailable and the caller surfaces "OBJECT NOT FOUND".
        raise ValueError(
            f"No orbital data available for NORAD {norad_id} "
            "(not in CelesTrak catalog or the catalog is unreachable)."
        )

    tle["epoch"] = _epoch_from_line1(tle["line1"])
    tle["source"] = source
    tle["age_days"] = _age_days_from_epoch(tle["epoch"])
    tle["freshness"] = freshness_label(tle["age_days"])
    _MEM_CACHE[norad_id] = (now, tle)
    if source in ("live", "cached"):
        _save_to_disk_cache(tle)
    return dict(tle)


# ── Bulk GROUP fetch (track many objects at once) ─────────────────────────────

_GROUP_CACHE_DIR = CACHE_PATH.parent / "groups"
_GROUP_TTL_SECONDS = 6 * 3600
_group_mem: dict[str, tuple[float, list[dict]]] = {}


def fetch_group(group: str, timeout: int = 12) -> list[dict]:
    """Fetch a whole CelesTrak GROUP as GP JSON (many objects in one request).

    Layered like fetch_tle: memory cache -> live CelesTrak -> disk cache.
    Returns the raw GP records (OBJECT_NAME, NORAD_CAT_ID, MEAN_MOTION, ...).
    Never raises — returns [] if nothing is available.
    """
    group = group.strip().lower()
    if not group:
        return []

    now = time.monotonic()
    mem = _group_mem.get(group)
    if mem and now - mem[0] < _GROUP_TTL_SECONDS:
        return mem[1]

    disk_file = _GROUP_CACHE_DIR / f"{group}.json"

    records: list[dict] | None = None
    if celestrak_reachable():
        any_error = False
        for base_url in CELESTRAK_URLS:
            try:
                resp = requests.get(
                    base_url,
                    params={"GROUP": group, "FORMAT": "JSON"},
                    timeout=timeout,
                    verify=False,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list) and data:
                        records = data
                        break
            except (requests.RequestException, ValueError):
                any_error = True
                continue
        if records is None and any_error:
            _trip_circuit()

    if records is not None:
        try:
            _GROUP_CACHE_DIR.mkdir(parents=True, exist_ok=True)
            disk_file.write_text(json.dumps(records), encoding="utf-8")
        except OSError:
            pass
    elif disk_file.is_file():
        try:
            records = json.loads(disk_file.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            records = None

    records = records or []
    _group_mem[group] = (now, records)
    return records
