"""
Recursive 72-hour PM2.5 forecasting skeleton.

Required input:
- Latest historical hourly station data with the same engineered columns used by training.
- Future hourly weather forecast for each of the next 72 hours.

Important:
For hours after +1, predicted PM2.5 values become the pollution lag inputs.
Future weather must come from a forecast source; do not use future observed weather in a real-time prediction.
"""

import joblib
import numpy as np
import pandas as pd

MODEL_FILE = "models/xgb_pm25_next_hour.joblib"

def forecast_72h(history, future_weather, station):
    bundle = joblib.load(MODEL_FILE)
    model = bundle["model"]
    feature_names = bundle["features"]
    medians = pd.Series(bundle["medians"])

    hist = history[history["Station"] == station].copy()
    hist = hist.sort_values("timestamp").copy()
    future = future_weather.sort_values("timestamp").head(72).copy()

    # Add predictions to a working history.
    work = hist.copy()

    outputs = []

    for _, weather_row in future.iterrows():
        t = weather_row["timestamp"]

        # Build one row using current/future weather and pollution history.
        row = weather_row.to_dict()
        row["Station"] = station
        row["timestamp"] = t

        # Pollution lags are based on the latest available values in work.
        for pollutant in ["PM25","PM10","NO2","O3"]:
            values = work[work["Station"] == station][pollutant].dropna().tolist()
            for lag in [1,3,6,12,24]:
                row[f"{pollutant}_lag{lag}h"] = values[-lag] if len(values) >= lag else np.nan

        # PM2.5 rolling features.
        vals = work[work["Station"] == station]["PM25"].dropna().tolist()
        for window in [3,6,24]:
            row[f"PM25_roll{window}h"] = (
                np.mean(vals[-window:]) if len(vals) >= window else np.nan
            )

        # Time features.
        hour = t.hour
        row["hour_sin"] = np.sin(2*np.pi*hour/24)
        row["hour_cos"] = np.cos(2*np.pi*hour/24)
        row["dow"] = t.dayofweek
        row["month"] = t.month

        # Wind direction.
        if "wind_direction_10m (°)" in row:
            rad = np.deg2rad(row["wind_direction_10m (°)"])
            row["wind_dir_sin"] = np.sin(rad)
            row["wind_dir_cos"] = np.cos(rad)

        X = pd.DataFrame([row])
        X = X.reindex(columns=feature_names, fill_value=np.nan)
        X = X.fillna(medians).fillna(0)

        pred = float(model.predict(X)[0])
        pred = max(0.0, pred)

        outputs.append({"Station":station, "timestamp":t, "PM2.5_forecast":pred})

        # For a full multi-pollutant system, append predictions from PM10/NO2/O3 models too.
        new_row = {"Station":station, "timestamp":t, "PM25":pred}
        for p in ["PM10","NO2","O3"]:
            new_row[p] = np.nan
        work = pd.concat([work, pd.DataFrame([new_row])], ignore_index=True)

    return pd.DataFrame(outputs)

# Example usage:
# history = pd.read_csv("latest_hourly_history.csv", parse_dates=["timestamp"])
# future_weather = pd.read_csv("future_weather_72h.csv", parse_dates=["timestamp"])
# forecast = forecast_72h(history, future_weather, "Alipur")
# forecast.to_csv("results/pm25_forecast_72h.csv", index=False)
