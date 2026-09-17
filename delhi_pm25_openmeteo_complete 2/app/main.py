from __future__ import annotations
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from .config import STATIC_DIR
from .forecast import run_forecast
from .model_service import model_info
from .openmeteo import fetch_72h, fetch_pm25_seed_24h, fetch_live_bundle
from .schemas import ForecastRequest, LiveForecastRequest, LiveAutoRequest

app = FastAPI(title="Delhi PM2.5 XGBoost + Live Open-Meteo", version="2.0.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/api/forecast/demo")
def demo_forecast():
    import pandas as pd
    import math
    from .config import DATA_DIR
    history = pd.read_csv(DATA_DIR / "sample_pm_history_24h.csv")["pm25"].tolist()
    weather = pd.read_csv(DATA_DIR / "sample_weather_72h.csv").to_dict("records")
    for i, w in enumerate(weather):
        hour = i % 24
        # Add mock variables for the UI diagnostics that are missing in the simple CSV
        w["WS"] = round(3.5 + math.sin(i / 4.0) * 1.5, 1)
        w["PBL"] = 280.0 if (hour < 8 or hour > 20) else 1250.0 + (math.sin(i) * 200)
        w["T1000"] = w["AT"] + 1.5
        # Create an artificial temperature inversion at night
        w["T975"] = w["AT"] + (3.5 if w["PBL"] < 400 else 0.5)
        
    return {
        "hours": len(weather), "timezone": "Asia/Kolkata",
        "weather_source": "Bundled demonstration weather (not live)",
        "pm_seed_source": "Bundled demonstration history (not live)",
        "coupled_is_experimental": True,
        "forecast": run_forecast(weather, history, True),
    }

@app.get("/")
def dashboard():
    return FileResponse(STATIC_DIR / "index.html")

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "offline_ready": True,
        "live_openmeteo_ready": True,
        "version": "2.0.0",
    }

@app.get("/api/model/info")
def info():
    return model_info()

@app.post("/api/forecast/72h")
def forecast(req: ForecastRequest):
    try:
        rows = [w.model_dump() for w in req.weather]
        return {
            "hours": len(rows),
            "weather_source": "request/local file",
            "pm_seed_source": "request/local history",
            "coupled_is_experimental": True,
            "forecast": run_forecast(rows, req.pm_history, req.coupled),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/openmeteo/weather/72h")
def live_weather(
    latitude: float = Query(28.6139, ge=-90, le=90),
    longitude: float = Query(77.2090, ge=-180, le=180),
    timezone: str = "Asia/Kolkata",
):
    try:
        rows = fetch_72h(latitude, longitude, timezone)
        return {"hours": len(rows), "source": "Open-Meteo Forecast API", "weather": rows}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@app.get("/api/openmeteo/pm25-seed")
def live_pm_seed(
    latitude: float = Query(28.6139, ge=-90, le=90),
    longitude: float = Query(77.2090, ge=-180, le=180),
    timezone: str = "Asia/Kolkata",
):
    try:
        return fetch_pm25_seed_24h(latitude, longitude, timezone)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@app.post("/api/forecast/live-openmeteo")
def live_with_user_pm(req: LiveForecastRequest):
    """Preferred live route when recent CPCB PM2.5 history is available."""
    try:
        rows = fetch_72h(req.latitude, req.longitude, req.timezone)
        return {
            "hours": len(rows),
            "latitude": req.latitude,
            "longitude": req.longitude,
            "timezone": req.timezone,
            "weather_source": "Open-Meteo Forecast API",
            "pm_seed_source": "user supplied (preferably CPCB)",
            "source_shift_warning": "Weather inputs come from Open-Meteo while the model was trained with CPCB meteorological measurements; live performance should be revalidated.",
            "coupled_is_experimental": True,
            "forecast": run_forecast(rows, req.pm_history, req.coupled),
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@app.post("/api/forecast/live-auto")
def live_auto(req: LiveAutoRequest):
    """Fully automatic live forecast using Open-Meteo weather + CAMS PM seed."""
    try:
        bundle = fetch_live_bundle(req.latitude, req.longitude, req.timezone, 72)
        seed = bundle["seed"]
        rows = bundle["weather"]
        return {
            "hours": len(rows),
            "latitude": req.latitude,
            "longitude": req.longitude,
            "timezone": req.timezone,
            "weather_source": "Open-Meteo Forecast API",
            "pm_seed_source": seed["source"],
            "pm_seed_last_timestamp": seed["timestamps"][-1],
            "pm_seed_last_value": seed["pm_history"][-1],
            "warnings": [
                "The trained XGBoost model used CPCB observations. Open-Meteo/CAMS PM2.5 is used only to auto-seed the 24-hour lag vector in live-auto mode.",
                "Open-Meteo weather and CPCB station measurements have a source/domain shift; live accuracy should be revalidated before production claims.",
                "The aerosol/PBL coupled series is experimental; validated accuracy belongs to the standalone one-hour-ahead XGBoost evaluation model.",
            ],
            "coupled_is_experimental": True,
            "forecast": run_forecast(rows, seed["pm_history"], req.coupled),
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
