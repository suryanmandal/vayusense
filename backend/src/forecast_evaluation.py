"""Phase 5 / Workstream E: 72-Hour Forecast Postprocessing & Baseline Evaluation Engine.

Implements:
1. Hourly 72-hour forecast product generator with AQI derivation per lead hour.
2. Standard evaluation baseline models:
   - Persistence baseline (y_hat(t+k) = y(t))
   - Climatological/diurnal rolling baseline
   - Baseline statistical metrics: RMSE, MAE, Bias, Pearson Correlation (r), Index of Agreement (IOA).
"""

from __future__ import annotations

import math
from typing import Dict, List, Literal, Optional, Tuple
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field


class EvaluationMetrics(BaseModel):
    """Statistical evaluation metrics for air quality forecasts against observed ground truth."""
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    pollutant: str
    lead_window: Literal["1-24h", "25-48h", "49-72h", "all_72h"]
    sample_count: int = Field(ge=1)
    rmse: float = Field(ge=0, description="Root Mean Squared Error (ug/m3 or ppb)")
    mae: float = Field(ge=0, description="Mean Absolute Error (ug/m3 or ppb)")
    mean_bias: float = Field(description="Mean Bias: Forecast - Observed")
    fractional_bias_pct: float = Field(description="Fractional Bias in %")
    correlation_r: float = Field(ge=-1.0, le=1.0, description="Pearson correlation coefficient")
    index_of_agreement: float = Field(ge=0.0, le=1.0, description="Willmott Index of Agreement (IOA)")


def compute_evaluation_metrics(
    observed: List[float],
    predicted: List[float],
    pollutant: str = "PM2.5",
    lead_window: Literal["1-24h", "25-48h", "49-72h", "all_72h"] = "all_72h",
) -> EvaluationMetrics:
    """Compute standard statistical model evaluation metrics against observed values."""
    if len(observed) != len(predicted):
        raise ValueError("Observed and predicted lists must have identical lengths")

    # Filter out None or invalid pairs
    valid_pairs = [(o, p) for o, p in zip(observed, predicted) if o is not None and p is not None]
    n = len(valid_pairs)
    if n == 0:
        raise ValueError("Cannot compute metrics with zero valid pairs")

    obs = [p[0] for p in valid_pairs]
    pred = [p[1] for p in valid_pairs]

    mean_obs = sum(obs) / n
    mean_pred = sum(pred) / n

    # Bias and MAE
    diffs = [p - o for o, p in valid_pairs]
    mean_bias = sum(diffs) / n
    mae = sum(abs(d) for d in diffs) / n
    mse = sum(d ** 2 for d in diffs) / n
    rmse = math.sqrt(mse)

    # Fractional Bias: 2 * (pred - obs) / (pred + obs)
    fb_list = [2.0 * (p - o) / (p + o) for o, p in valid_pairs if (p + o) > 0]
    fractional_bias = (sum(fb_list) / len(fb_list) * 100.0) if fb_list else 0.0

    # Pearson Correlation r
    var_o = sum((o - mean_obs) ** 2 for o in obs)
    var_p = sum((p - mean_pred) ** 2 for p in pred)
    if var_o > 1e-9 and var_p > 1e-9:
        cov = sum((o - mean_obs) * (p - mean_pred) for o, p in valid_pairs)
        r = cov / (math.sqrt(var_o) * math.sqrt(var_p))
        r = max(-1.0, min(1.0, r))
    else:
        r = 0.0

    # Willmott Index of Agreement (IOA)
    # d = 1 - [ sum((pred - obs)^2) / sum((|pred - mean_obs| + |obs - mean_obs|)^2) ]
    denom_ioa = sum((abs(p - mean_obs) + abs(o - mean_obs)) ** 2 for o, p in valid_pairs)
    if denom_ioa > 1e-9:
        ioa = 1.0 - (sum(d ** 2 for d in diffs) / denom_ioa)
        ioa = max(0.0, min(1.0, ioa))
    else:
        ioa = 1.0 if rmse < 1e-6 else 0.0

    return EvaluationMetrics(
        pollutant=pollutant,
        lead_window=lead_window,
        sample_count=n,
        rmse=round(rmse, 2),
        mae=round(mae, 2),
        mean_bias=round(mean_bias, 2),
        fractional_bias_pct=round(fractional_bias, 2),
        correlation_r=round(r, 3),
        index_of_agreement=round(ioa, 3),
    )


def compute_persistence_forecast(history_values: List[float], forecast_horizon_hours: int = 72) -> List[float]:
    """Generate persistence baseline: last known observed value carried forward."""
    if not history_values:
        raise ValueError("History values cannot be empty for persistence baseline")
    last_val = history_values[-1]
    return [last_val] * forecast_horizon_hours
