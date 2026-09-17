from __future__ import annotations
from copy import deepcopy
import math
from .model_service import predict_one


def _finite(x):
    try:
        return x is not None and math.isfinite(float(x))
    except Exception:
        return False


def atmospheric_diagnostics(weather: dict) -> dict:
    t1000 = weather.get("T1000")
    t975 = weather.get("T975")
    pbl = weather.get("PBL")
    inversion_strength = None
    inversion_active = False
    if _finite(t1000) and _finite(t975):
        inversion_strength = float(t975) - float(t1000)
        inversion_active = inversion_strength > 0
    # A low PBL is treated only as a diagnostic trapping indicator here.
    low_pbl = _finite(pbl) and float(pbl) < 400.0
    return {
        "inversion_strength_c": None if inversion_strength is None else round(inversion_strength, 3),
        "inversion_active": bool(inversion_active),
        "low_pbl_trapping": bool(low_pbl),
        "pbl_height_m": None if not _finite(pbl) else round(float(pbl), 1),
        "wind_speed_10m_kmh": None if not _finite(weather.get("WS")) else round(float(weather["WS"]), 2),
        "wind_direction_10m_deg": None if not _finite(weather.get("WD")) else round(float(weather["WD"]), 1),
    }


def physics_adjust(weather: dict, current_pm25: float) -> tuple[dict, dict]:
    """Experimental aerosol-feedback transform.

    Only AT and SR affect the trained XGBoost feature vector. PBL is adjusted
    for diagnostics only because PBL was not an input to the trained weights.
    Consequently, the coupled output is experimental and does not inherit the
    validated one-hour XGBoost accuracy metrics.
    """
    w = deepcopy(weather)
    factor = 1.0
    # This shortwave experiment must not cool the surface without sunlight.
    if current_pm25 > 150 and _finite(w.get("SR")) and float(w["SR"]) > 0:
        factor = max(0.4, 1.0 - current_pm25 / 1000.0)
        if _finite(w.get("SR")):
            w["SR"] = float(w["SR"]) * factor
        if _finite(w.get("AT")):
            w["AT"] = float(w["AT"]) - (1.0 - factor) * 2.0
        if _finite(w.get("PBL")):
            w["PBL"] = float(w["PBL"]) * max(0.5, factor)

    diag = atmospheric_diagnostics(w)
    diag.update({
        "dimming_factor": round(factor, 4),
        "effective_radiation": None if not _finite(w.get("SR")) else round(float(w["SR"]), 2),
        "effective_temperature": None if not _finite(w.get("AT")) else round(float(w["AT"]), 2),
        "effective_pbl_height_m": None if not _finite(w.get("PBL")) else round(float(w["PBL"]), 1),
    })
    return w, diag


def run_forecast(weather_rows: list[dict], pm_history: list[float], coupled: bool = True) -> list[dict]:
    if len(pm_history) < 24:
        raise ValueError("Need at least 24 chronological hourly PM2.5 values.")
    if not weather_rows:
        raise ValueError("Weather forecast is empty.")

    clean_history = []
    for x in pm_history:
        if not _finite(x):
            raise ValueError("PM2.5 history contains a non-numeric value.")
        clean_history.append(float(x))

    uncoupled_history = clean_history.copy()
    coupled_history = clean_history.copy()
    initial = float(clean_history[-1])
    out = []

    for weather in weather_rows:
        xgb = predict_one(weather, uncoupled_history, "production")
        uncoupled_history.append(xgb)

        if coupled:
            modified, diag = physics_adjust(weather, coupled_history[-1])
            coupled_pred = predict_one(modified, coupled_history, "production")
            coupled_history.append(coupled_pred)
        else:
            coupled_pred = xgb
            diag = atmospheric_diagnostics(weather)
            diag.update({
                "dimming_factor": 1.0,
                "effective_radiation": weather.get("SR"),
                "effective_temperature": weather.get("AT"),
                "effective_pbl_height_m": weather.get("PBL"),
            })

        out.append({
            "timestamp": str(weather["timestamp"]),
            "persistence_pm25": round(initial, 2),
            "xgboost_pm25": round(xgb, 2),
            "coupled_experimental_pm25": round(coupled_pred, 2),
            "temperature_2m_c": weather.get("AT"),
            "relative_humidity_2m_pct": weather.get("RH"),
            "surface_pressure_hpa": weather.get("BP"),
            **diag,
        })
    return out
