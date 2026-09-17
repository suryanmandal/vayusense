# Delhi PM2.5 XGBoost + Live Open-Meteo

A locally runnable PM2.5 forecasting project containing the trained XGBoost weights, exact feature pipeline, offline CSV inference, live Open-Meteo ingestion, FastAPI backend, browser dashboard, evaluation metadata, and retraining script.

## What is validated vs experimental

The bundled chronological hold-out evaluation for the standalone one-hour-ahead XGBoost model is:

- RMSE: **28.03 µg/m³**
- MAE: **14.36 µg/m³**
- R²: **0.907**
- Within ±25 µg/m³: **85.65%**

These metrics do **not** automatically apply to the 72-hour recursive forecast, to Open-Meteo live inference, or to the experimental aerosol/PBL coupled series. The production model was retrained on all usable CPCB rows after the hold-out evaluation.

## Model features

The trained model consumes exactly these 16 features:

```text
AT, RH, wind_dir_sin, wind_dir_cos, SR, RF, BP,
hour_sin, hour_cos, doy_sin, doy_cos,
pm_lag_1, pm_lag_3, pm_lag_6, pm_lag_12, pm_lag_24
```

Live Open-Meteo mapping:

```text
temperature_2m        -> AT
relative_humidity_2m  -> RH
wind_direction_10m    -> WD -> sin/cos
shortwave_radiation   -> SR
rain                  -> RF
surface_pressure      -> BP
```

The live service additionally downloads `wind_speed_10m`, `boundary_layer_height`, `temperature_1000hPa`, `temperature_975hPa`, `temperature_950hPa`, and `geopotential_height_950hPa` for diagnostics/experimental physics. Those extra fields are not silently added to the trained XGBoost feature vector.

## 1. Extract the ZIP

Extract the project and open a terminal inside the project directory.

## 2. Windows setup

```bat
setup_windows.bat
```

Manual equivalent:

```bat
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 3. Linux/macOS setup

```bash
chmod +x setup_linux_mac.sh start_linux_mac.sh
./setup_linux_mac.sh
```

Manual equivalent:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Python 3.11 or 3.12 is recommended.

## 4. Verify the trained model offline

Windows:

```bat
.venv\Scripts\python self_test.py
```

Linux/macOS:

```bash
.venv/bin/python self_test.py
```

Expected ending:

```text
SELF-TEST PASSED
Hold-out RMSE: 28.03 µg/m³
Hold-out MAE : 14.36 µg/m³
Hold-out R²  : 0.907
```

## 5. Verify live Open-Meteo access

Windows:

```bat
.venv\Scripts\python live_check.py
```

Linux/macOS:

```bash
.venv/bin/python live_check.py
```

This checks both the Open-Meteo Forecast API and Open-Meteo Air Quality API from your computer.

## 6. Fully automatic live 72-hour forecast

Delhi defaults:

Windows:

```bat
.venv\Scripts\python cli.py live-auto --lat 28.6139 --lon 77.2090 --out outputs\live_auto_forecast.csv
```

Linux/macOS:

```bash
.venv/bin/python cli.py live-auto --lat 28.6139 --lon 77.2090 --out outputs/live_auto_forecast.csv
```

This mode uses:

```text
Open-Meteo Forecast API -> 72h meteorology
Open-Meteo Air Quality / CAMS -> previous 24 PM2.5 values
                         ↓
                  XGBoost recursive loop
                         ↓
                  72-hour forecast CSV
```

The Air Quality seed makes the system fully automatic, but it is CAMS model output rather than a CPCB station measurement. When recent CPCB PM2.5 is available, prefer the next mode.

## 7. Live weather + CPCB PM2.5 seed (preferred)

Create a CSV with at least 24 chronological hourly values:

```csv
timestamp,pm25
2026-09-15T01:00,121.4
2026-09-15T02:00,125.2
...
```

Then run:

Windows:

```bat
.venv\Scripts\python cli.py live --history data\my_pm_history.csv --lat 28.6139 --lon 77.2090 --out outputs\live_cpcb_seed.csv
```

Linux/macOS:

```bash
.venv/bin/python cli.py live --history data/my_pm_history.csv --lat 28.6139 --lon 77.2090 --out outputs/live_cpcb_seed.csv
```

## 8. Start FastAPI + dashboard

Windows:

```bat
start_windows.bat
```

Linux/macOS:

```bash
./start_linux_mac.sh
```

Open:

```text
http://127.0.0.1:8000
```

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

The dashboard includes a **Run Live Open-Meteo 72h** button with editable latitude/longitude.

## 9. Live API endpoints

### Fully automatic

`POST /api/forecast/live-auto`

Example body:

```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "timezone": "Asia/Kolkata",
  "coupled": true
}
```

### Live weather with your recent CPCB PM2.5

`POST /api/forecast/live-openmeteo`

```json
{
  "pm_history": [120,121,119,123,125,128,130,129,131,135,140,144,142,139,137,135,134,138,141,145,149,151,153,155],
  "latitude": 28.6139,
  "longitude": 77.2090,
  "timezone": "Asia/Kolkata",
  "coupled": true
}
```

### Inspect live weather

`GET /api/openmeteo/weather/72h?latitude=28.6139&longitude=77.2090&timezone=Asia/Kolkata`

### Inspect automatic PM2.5 seed

`GET /api/openmeteo/pm25-seed?latitude=28.6139&longitude=77.2090&timezone=Asia/Kolkata`

## 10. Download raw live inputs from the terminal

Weather:

```bash
python cli.py fetch-weather --lat 28.6139 --lon 77.2090 --out outputs/openmeteo_weather_72h.csv
```

PM2.5 seed:

```bash
python cli.py fetch-pm-seed --lat 28.6139 --lon 77.2090 --out outputs/openmeteo_pm25_seed_24h.csv
```

If the virtual environment is not activated, replace `python` with `.venv\Scripts\python` on Windows or `.venv/bin/python` on Linux/macOS.

## 11. Offline fallback

The live API is optional. You can still run without internet:

```bash
python cli.py demo
```

or with your own local files:

```bash
python cli.py forecast --history data/my_pm_history.csv --weather data/my_weather_72h.csv --out outputs/my_forecast.csv
```

Required local weather columns:

```text
timestamp,AT,RH,WD,SR,RF,BP
```

## 12. Output fields

Live results contain:

```text
timestamp
persistence_pm25
xgboost_pm25
coupled_experimental_pm25
temperature_2m_c
relative_humidity_2m_pct
surface_pressure_hpa
inversion_strength_c
inversion_active
low_pbl_trapping
pbl_height_m
wind_speed_10m_kmh
wind_direction_10m_deg
dimming_factor
effective_radiation
effective_temperature
effective_pbl_height_m
```

## 13. Project structure

```text
app/
  main.py             FastAPI routes
  openmeteo.py        Live Forecast + Air Quality API client and TTL cache
  forecast.py         Recursive XGBoost + experimental physics feedback
  features.py         Exact 16-feature transformation
  model_service.py    Loads the bundled XGBoost weights
models/
  xgboost_pm25_production.json
  xgboost_pm25_evaluation.json
  evaluation_metrics.json
  production_metadata.json
static/
  index.html           Browser dashboard
  app.js
training/
  train_from_merged_xlsx.py
cli.py                 Terminal interface
self_test.py           Offline trained-model verification
live_check.py          Real Open-Meteo connectivity test
live_mock_test.py      Network-free Open-Meteo integration test
```

## Scientific/deployment note

The evaluated model was trained from CPCB records. Substituting Open-Meteo meteorology introduces a data-source/domain shift, and using CAMS PM2.5 as the automatic lag seed introduces another. Therefore the bundled hold-out metrics must not be presented as validated live Open-Meteo 72-hour accuracy. The project exposes the live pipeline operationally; a separate historical Open-Meteo backtest should be run before making a live accuracy claim.
