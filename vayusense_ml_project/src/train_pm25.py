import os
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.preprocessing import OneHotEncoder

# Data path points to the root augmented file which has our complete dataset
DATA = "data/vayusense_hourly_training_table_augmented.csv"
MODEL = "models/xgb_pm25_next_hour.joblib"
METRICS = "results/pm25_next_hour_metrics.csv"

# Ensure directories exist
os.makedirs("models", exist_ok=True)
os.makedirs("results", exist_ok=True)

print("Loading data...")
df = pd.read_csv(DATA, parse_dates=["timestamp"])
df = df.sort_values(["Station", "timestamp"]).reset_index(drop=True)

# Replace any sentinels (-9999) with NaN
df.replace(-9999, np.nan, inplace=True)

# Define feature subsets based on the augmented table columns
weather_features = [
    "temperature_2m",
    "relative_humidity_2m",
    "wind_speed_10m",
    "boundary_layer_height",
    "precipitation",
    "rain",
    "dew_point_2m",
    "cloud_cover",
    "pressure_msl",
    "wind_dir_sin",
    "wind_dir_cos",
]

pollution_features = []
for p in ["PM2.5", "PM10", "NO2", "OZONE"]:
    for lag in [1, 3, 6, 12, 24]:
        pollution_features.append(f"{p}_lag_{lag}h")

temporal_features = ["hour_sin", "hour_cos", "dow", "month"]
rolling_features = ["PM2.5_rolling_3h", "PM2.5_rolling_6h", "PM2.5_rolling_24h"]

features = weather_features + pollution_features + temporal_features + rolling_features

# Drop rows missing target or essential features (like recent lag)
work = df.dropna(subset=features + ["PM2.5_next_1h", "PM2.5"]).copy()

print(f"Data shape after dropping NaNs in required columns: {work.shape}")

# Chronological split (Phase 5.1 fixes: avoid leakage by sorting by time)
times = np.sort(work["timestamp"].unique())
cutoff = times[int(len(times) * 0.80)]

train = work[work.timestamp < cutoff].copy()
test = work[work.timestamp >= cutoff].copy()

# Robust Station Encoding
print("Encoding stations...")
station_encoder = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
train_station = station_encoder.fit_transform(train[["Station"]])
test_station = station_encoder.transform(test[["Station"]])

station_cols = station_encoder.get_feature_names_out(["Station"])
train_station_df = pd.DataFrame(train_station, columns=station_cols, index=train.index)
test_station_df = pd.DataFrame(test_station, columns=station_cols, index=test.index)

X_train = pd.concat([train[features], train_station_df], axis=1)
X_test = pd.concat([test[features], test_station_df], axis=1)

y_train = train["PM2.5_next_1h"].to_numpy()
y_test = test["PM2.5_next_1h"].to_numpy()

# Note: since we used dropna earlier on required columns, there should be no NaNs,
# but we compute medians for inference fallback just in case.
medians = X_train.median(numeric_only=True)
X_train = X_train.fillna(medians).fillna(0)
X_test = X_test.fillna(medians).fillna(0)

from sklearn.ensemble import HistGradientBoostingRegressor

print("Training HistGradientBoostingRegressor...")
model = HistGradientBoostingRegressor(
    max_iter=600,
    max_depth=7,
    learning_rate=0.04,
    random_state=42,
)

model.fit(X_train, y_train)
pred = model.predict(X_test)

mae = mean_absolute_error(y_test, pred)
rmse = np.sqrt(mean_squared_error(y_test, pred))
bias = np.mean(pred - y_test)

# Phase 5.1 fixes: TRUE persistence baseline.
# The previous baseline was predicting 't+1' using 't-1' (PM25_lag1h).
# True persistence is using 't' (current PM2.5) as prediction for 't+1'.
baseline = test["PM2.5"].to_numpy()
baseline_mae = mean_absolute_error(y_test, baseline)
baseline_rmse = np.sqrt(mean_squared_error(y_test, baseline))
baseline_bias = np.mean(baseline - y_test)

metrics = pd.DataFrame([
    {"model": "XGBoost", "MAE": mae, "RMSE": rmse, "Mean_Bias": bias},
    {"model": "True Persistence", "MAE": baseline_mae, "RMSE": baseline_rmse, "Mean_Bias": baseline_bias}
])
metrics.to_csv(METRICS, index=False)

# Save artifacts for reproducible inference
joblib.dump({
    "model": model,
    "features": list(features),
    "station_cols": list(station_cols),
    "station_encoder": station_encoder,
    "medians": medians.to_dict(),
}, MODEL)

print("\n--- Evaluation Metrics ---")
print(metrics.to_string(index=False))
print("\n--- Dataset Stats ---")
print(f"Train rows: {len(train):,}")
print(f"Test rows:  {len(test):,}")
print(f"Cutoff: {cutoff}")

