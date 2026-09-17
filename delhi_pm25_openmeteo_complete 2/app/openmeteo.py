from __future__ import annotations

import json
import time
from dataclasses import dataclass
from threading import Lock
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

WEATHER_BASE = "https://api.open-meteo.com/v1/forecast"
AIR_QUALITY_BASE = "https://air-quality-api.open-meteo.com/v1/air-quality"
DEFAULT_TZ = "Asia/Kolkata"

# Open-Meteo variables. The CPCB-trained XGBoost model consumes AT/RH/WD/SR/RF/BP.
# WS/PBL/pressure-level temperatures are retained for diagnostics and the
# experimental physics layer but are not additional XGBoost inputs.
WEATHER_VARIABLES = [
    "temperature_2m",
    "relative_humidity_2m",
    "wind_speed_10m",
    "wind_direction_10m",
    "surface_pressure",
    "shortwave_radiation",
    "rain",
    "boundary_layer_height",
    "temperature_1000hPa",
    "temperature_975hPa",
    "temperature_950hPa",
    "geopotential_height_950hPa",
]


@dataclass
class _CacheEntry:
    expires_at: float
    value: object


_CACHE: dict[tuple, _CacheEntry] = {}
_CACHE_LOCK = Lock()


def _cache_get(key: tuple):
    now = time.monotonic()
    with _CACHE_LOCK:
        item = _CACHE.get(key)
        if not item:
            return None
        if item.expires_at <= now:
            _CACHE.pop(key, None)
            return None
        return item.value


def _cache_set(key: tuple, value, ttl_seconds: int):
    with _CACHE_LOCK:
        _CACHE[key] = _CacheEntry(time.monotonic() + ttl_seconds, value)


def _get_json(base: str, params: dict, timeout: int = 30) -> dict:
    url = f"{base}?{urlencode(params)}"
    req = Request(url, headers={"User-Agent": "delhi-pm25-xgboost-local/2.0"})
    try:
        with urlopen(req, timeout=timeout) as r:
            payload = json.load(r)
    except HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")[:1000]
        raise RuntimeError(f"Open-Meteo HTTP {e.code}: {detail}") from e
    except URLError as e:
        raise RuntimeError(f"Could not reach Open-Meteo: {e.reason}") from e
    if isinstance(payload, dict) and payload.get("error"):
        raise RuntimeError(f"Open-Meteo error: {payload.get('reason', payload)}")
    return payload


def _safe_at(series: dict, name: str, i: int):
    values = series.get(name)
    if not isinstance(values, list) or i >= len(values):
        return None
    return values[i]


def fetch_72h(
    latitude: float = 28.6139,
    longitude: float = 77.2090,
    timezone: str = DEFAULT_TZ,
    hours: int = 72,
    cache_ttl_seconds: int = 7200,
) -> list[dict]:
    """Fetch live Open-Meteo weather and map it to the trained CPCB feature keys.

    The core XGBoost feature mapping is:
      temperature_2m -> AT
      relative_humidity_2m -> RH
      wind_direction_10m -> WD
      shortwave_radiation -> SR
      rain -> RF
      surface_pressure -> BP

    Extra variables are preserved for physics/inversion diagnostics.
    """
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        raise ValueError("Invalid latitude/longitude.")
    if hours < 1 or hours > 168:
        raise ValueError("hours must be between 1 and 168.")

    key = ("weather", round(latitude, 4), round(longitude, 4), timezone, hours)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": ",".join(WEATHER_VARIABLES),
        "forecast_hours": hours,
        "timezone": timezone,
        "wind_speed_unit": "kmh",
    }
    payload = _get_json(WEATHER_BASE, params)
    hourly = payload.get("hourly") or {}
    times = hourly.get("time") or []
    if len(times) < hours:
        raise RuntimeError(f"Open-Meteo returned only {len(times)} hourly weather rows; expected {hours}.")

    rows: list[dict] = []
    for i, ts in enumerate(times[:hours]):
        rows.append({
            "timestamp": ts,
            "AT": _safe_at(hourly, "temperature_2m", i),
            "RH": _safe_at(hourly, "relative_humidity_2m", i),
            "WS": _safe_at(hourly, "wind_speed_10m", i),
            "WD": _safe_at(hourly, "wind_direction_10m", i),
            "SR": _safe_at(hourly, "shortwave_radiation", i),
            "RF": _safe_at(hourly, "rain", i),
            "BP": _safe_at(hourly, "surface_pressure", i),
            "PBL": _safe_at(hourly, "boundary_layer_height", i),
            "T1000": _safe_at(hourly, "temperature_1000hPa", i),
            "T975": _safe_at(hourly, "temperature_975hPa", i),
            "T950": _safe_at(hourly, "temperature_950hPa", i),
            "Z950": _safe_at(hourly, "geopotential_height_950hPa", i),
        })

    _cache_set(key, rows, cache_ttl_seconds)
    return rows


def fetch_pm25_seed_24h(
    latitude: float = 28.6139,
    longitude: float = 77.2090,
    timezone: str = DEFAULT_TZ,
    cache_ttl_seconds: int = 1800,
) -> dict:
    """Fetch the previous 24 hourly Open-Meteo/CAMS PM2.5 values.

    This makes live-auto completely self-contained, but it is a model-to-model
    seed (CAMS PM2.5), not a CPCB station observation. Supplying recent CPCB
    PM2.5 values remains preferable when available.
    """
    key = ("aq-seed", round(latitude, 4), round(longitude, 4), timezone)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": "pm2_5",
        "past_hours": 24,
        # Request one forecast step so the endpoint works consistently; below
        # we explicitly keep only historical entries when >24 rows are returned.
        "forecast_hours": 1,
        "timezone": timezone,
        "domains": "cams_global",
    }
    payload = _get_json(AIR_QUALITY_BASE, params)
    hourly = payload.get("hourly") or {}
    times = hourly.get("time") or []
    vals = hourly.get("pm2_5") or []
    pairs = [(t, v) for t, v in zip(times, vals) if v is not None]
    if len(pairs) < 24:
        raise RuntimeError(f"Open-Meteo Air Quality returned only {len(pairs)} valid PM2.5 points; need 24.")

    # The API is chronological. With past_hours=24 + forecast_hours=1, the final
    # item may be the forecast/current boundary, so select the 24 entries just
    # before it when possible. If exactly 24 are returned, use them all.
    historical = pairs[-25:-1] if len(pairs) >= 25 else pairs[-24:]
    if len(historical) < 24:
        historical = pairs[-24:]

    result = {
        "timestamps": [t for t, _ in historical],
        "pm_history": [float(v) for _, v in historical],
        "source": "Open-Meteo Air Quality / CAMS Global",
        "domain": "cams_global",
    }
    _cache_set(key, result, cache_ttl_seconds)
    return result


def fetch_live_bundle(
    latitude: float = 28.6139,
    longitude: float = 77.2090,
    timezone: str = DEFAULT_TZ,
    hours: int = 72,
) -> dict:
    """Fetch live weather and a 24-hour PM2.5 seed in one call."""
    return {
        "weather": fetch_72h(latitude, longitude, timezone, hours),
        "seed": fetch_pm25_seed_24h(latitude, longitude, timezone),
        "latitude": latitude,
        "longitude": longitude,
        "timezone": timezone,
    }
