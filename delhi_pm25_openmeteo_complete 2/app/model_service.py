from __future__ import annotations
import json
from functools import lru_cache
import numpy as np
from xgboost import XGBRegressor
from .config import PRODUCTION_MODEL, EVALUATION_MODEL, METRICS, PRODUCTION_METADATA
from .features import feature_row, as_frame

@lru_cache(maxsize=2)
def load_model(kind: str = "production") -> XGBRegressor:
    path = PRODUCTION_MODEL if kind == "production" else EVALUATION_MODEL
    model = XGBRegressor()
    model.load_model(path)
    return model

def predict_one(weather: dict, pm_history: list[float], kind: str = "production") -> float:
    if len(pm_history) < 24:
        raise ValueError("At least 24 hourly PM2.5 history values are required.")
    row = feature_row(weather, pm_history)
    pred = float(load_model(kind).predict(as_frame(row))[0])
    return float(np.clip(pred, 0.0, 999.0))

def model_info() -> dict:
    return {
        "evaluation": json.loads(METRICS.read_text()),
        "production": json.loads(PRODUCTION_METADATA.read_text()),
        "deployment_model": PRODUCTION_MODEL.name,
        "note": "Reported accuracy belongs to the chronological hold-out evaluation model. The deployment model was retrained on all usable data after evaluation.",
    }
