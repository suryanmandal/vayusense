"""Run this on your internet-connected machine to verify Open-Meteo access."""
from app.openmeteo import fetch_72h, fetch_pm25_seed_24h

print("Checking Open-Meteo Forecast API...")
w = fetch_72h()
print(f"OK: {len(w)} weather hours, {w[0]['timestamp']} -> {w[-1]['timestamp']}")
print(f"First weather row: AT={w[0]['AT']} RH={w[0]['RH']} WD={w[0]['WD']} WS={w[0]['WS']} PBL={w[0]['PBL']}")
print("Checking Open-Meteo Air Quality API PM2.5 seed...")
s = fetch_pm25_seed_24h()
print(f"OK: {len(s['pm_history'])} PM2.5 history values")
print(f"Latest seed: {s['pm_history'][-1]:.2f} µg/m³ at {s['timestamps'][-1]}")
print("LIVE OPEN-METEO CHECK PASSED")
