from __future__ import annotations
from collections import deque
from math import cos, pi, sin
from typing import Iterable
import numpy as np
import pandas as pd

FEATURES = [
    "AT", "RH", "wind_dir_sin", "wind_dir_cos", "SR", "RF", "BP",
    "hour_sin", "hour_cos", "doy_sin", "doy_cos",
    "pm_lag_1", "pm_lag_3", "pm_lag_6", "pm_lag_12", "pm_lag_24",
]

def _float(value):
    if value is None or value == "":
        return np.nan
    try:
        return float(value)
    except (TypeError, ValueError):
        return np.nan

def _lag(history: Iterable[float], hours: int) -> float:
    h = list(history)
    if not h:
        return np.nan
    return float(h[-hours]) if len(h) >= hours else np.nan

def feature_row(weather: dict, pm_history: Iterable[float]) -> dict[str, float]:
    ts = pd.Timestamp(weather["timestamp"])
    wd = _float(weather.get("WD"))
    wd_rad = wd * pi / 180.0 if np.isfinite(wd) else np.nan
    hour = ts.hour + ts.minute / 60.0
    doy = ts.dayofyear
    return {
        "AT": _float(weather.get("AT")),
        "RH": _float(weather.get("RH")),
        "wind_dir_sin": sin(wd_rad) if np.isfinite(wd_rad) else np.nan,
        "wind_dir_cos": cos(wd_rad) if np.isfinite(wd_rad) else np.nan,
        "SR": _float(weather.get("SR")),
        "RF": _float(weather.get("RF")),
        "BP": _float(weather.get("BP")),
        "hour_sin": sin(2 * pi * hour / 24.0),
        "hour_cos": cos(2 * pi * hour / 24.0),
        "doy_sin": sin(2 * pi * doy / 365.25),
        "doy_cos": cos(2 * pi * doy / 365.25),
        "pm_lag_1": _lag(pm_history, 1),
        "pm_lag_3": _lag(pm_history, 3),
        "pm_lag_6": _lag(pm_history, 6),
        "pm_lag_12": _lag(pm_history, 12),
        "pm_lag_24": _lag(pm_history, 24),
    }

def as_frame(row: dict[str, float]) -> pd.DataFrame:
    return pd.DataFrame([[row[c] for c in FEATURES]], columns=FEATURES)
