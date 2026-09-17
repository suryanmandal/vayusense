"""Network-free verification of the Open-Meteo integration.

This does not replace `python live_check.py` on a machine with internet. It checks
mapping, 24h PM seed extraction, and end-to-end 72h prediction using mocked API
payloads shaped like Open-Meteo responses.
"""
from unittest.mock import patch
from datetime import datetime, timedelta

from app.openmeteo import fetch_72h, fetch_pm25_seed_24h, _CACHE
from app.forecast import run_forecast

start = datetime(2026, 9, 16, 2, 0)
times72 = [(start + timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M") for i in range(72)]
weather_payload = {
    "hourly": {
        "time": times72,
        "temperature_2m": [30.0 - 0.05*i for i in range(72)],
        "relative_humidity_2m": [55.0 + (i % 10) for i in range(72)],
        "wind_speed_10m": [8.0 + (i % 5) for i in range(72)],
        "wind_direction_10m": [(270 + i*2) % 360 for i in range(72)],
        "surface_pressure": [995.0 + (i % 3) for i in range(72)],
        "shortwave_radiation": [max(0.0, 700.0 * (1 - abs((i % 24)-12)/12)) for i in range(72)],
        "rain": [0.0]*72,
        "boundary_layer_height": [300.0 + 20*(i % 24) for i in range(72)],
        "temperature_1000hPa": [29.0 - 0.04*i for i in range(72)],
        "temperature_975hPa": [28.5 - 0.03*i for i in range(72)],
        "temperature_950hPa": [27.0 - 0.02*i for i in range(72)],
        "geopotential_height_950hPa": [500.0]*72,
    }
}

times25 = [(start - timedelta(hours=24) + timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M") for i in range(25)]
aq_payload = {"hourly": {"time": times25, "pm2_5": [110.0 + i for i in range(25)]}}


def fake_get_json(base, params, timeout=30):
    return aq_payload if "air-quality" in base else weather_payload


_CACHE.clear()
with patch("app.openmeteo._get_json", side_effect=fake_get_json):
    weather = fetch_72h()
    seed = fetch_pm25_seed_24h()

assert len(weather) == 72
assert len(seed["pm_history"]) == 24
assert weather[0]["AT"] == 30.0
assert weather[0]["WS"] == 8.0
assert weather[0]["PBL"] == 300.0
assert "T975" in weather[0]

rows = run_forecast(weather, seed["pm_history"], coupled=True)
assert len(rows) == 72
assert all(0 <= r["xgboost_pm25"] <= 999 for r in rows)
assert "pbl_height_m" in rows[0]
assert "inversion_active" in rows[0]
assert "wind_speed_10m_kmh" in rows[0]
print("LIVE MOCK TEST PASSED")
print(f"Rows: {len(rows)}")
print(f"First forecast: {rows[0]['xgboost_pm25']:.2f} µg/m³")
