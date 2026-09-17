# Live Open-Meteo Quick Start

The project now supports two live modes.

- `live-auto`: easiest end-to-end mode. Open-Meteo provides the next 72 hours of weather and Open-Meteo/CAMS supplies the previous 24 hourly PM2.5 values used to initialize the autoregressive lags.
- `live`: preferred when you have recent CPCB PM2.5 observations. Open-Meteo supplies weather, while your local CSV supplies the latest 24 PM2.5 values.

## Windows PowerShell / Command Prompt

```bat
cd delhi_pm25_openmeteo_complete
setup_windows.bat
.venv\Scripts\python self_test.py
.venv\Scripts\python live_check.py
.venv\Scripts\python cli.py live-auto --lat 28.6139 --lon 77.2090 --out outputs\live_auto_forecast.csv
start_windows.bat
```

Then open `http://127.0.0.1:8000`.

For recent CPCB PM history instead of the CAMS auto-seed:

```bat
.venv\Scripts\python cli.py live --history data\sample_pm_history_24h.csv --lat 28.6139 --lon 77.2090 --out outputs\live_cpcb_seed.csv
```

## Linux / macOS

```bash
cd delhi_pm25_openmeteo_complete
chmod +x setup_linux_mac.sh start_linux_mac.sh
./setup_linux_mac.sh
.venv/bin/python self_test.py
.venv/bin/python live_check.py
.venv/bin/python cli.py live-auto --lat 28.6139 --lon 77.2090 --out outputs/live_auto_forecast.csv
./start_linux_mac.sh
```

Then open `http://127.0.0.1:8000`.

## Useful live API routes

- `GET /api/openmeteo/weather/72h` — inspect mapped 72-hour live weather.
- `GET /api/openmeteo/pm25-seed` — inspect the 24-hour CAMS PM2.5 seed.
- `POST /api/forecast/live-auto` — fully automatic live forecast.
- `POST /api/forecast/live-openmeteo` — Open-Meteo weather with user-supplied PM2.5 history.
- `GET /docs` — interactive FastAPI Swagger UI.

The default coordinates are Delhi: `28.6139, 77.2090` and timezone `Asia/Kolkata`.
