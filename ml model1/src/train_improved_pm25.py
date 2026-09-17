import os
import json
import joblib
import numpy as np
import pandas as pd

from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# ============================================================
# PATHS
# ============================================================

INPUT_FILE = "data/vayusense_hourly_training_table_augmented.csv"

MODEL_DIR = "models"
RESULT_DIR = "results"

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)


# ============================================================
# LOAD DATA
# ============================================================

print("Loading augmented dataset...")

df = pd.read_csv(INPUT_FILE)

print(f"Rows loaded: {len(df):,}")
print(f"Columns: {len(df.columns)}")
print(f"Stations: {df['Station'].nunique()}")


# ============================================================
# TIMESTAMP
# ============================================================

df["timestamp"] = pd.to_datetime(
    df["timestamp"],
    errors="coerce"
)

df = df.sort_values(
    ["Station", "timestamp"]
).reset_index(drop=True)

print(
    f"Date range: {df['timestamp'].min()} -> "
    f"{df['timestamp'].max()}"
)


# ============================================================
# NUMERIC CONVERSION
# ============================================================

numeric_columns = [
    "PM2.5",
    "PM10",
    "NO2",
    "OZONE",
    "temperature_2m",
    "relative_humidity_2m",
    "wind_speed_10m",
    "wind_direction_10m",
    "pressure_msl",
    "precipitation",
    "boundary_layer_height",
    "rain",
    "dew_point_2m",
    "cloud_cover"
]

for col in numeric_columns:

    if col in df.columns:

        df[col] = pd.to_numeric(
            df[col],
            errors="coerce"
        )


# ============================================================
# ADDITIONAL WEATHER FEATURES
# ============================================================

print("Creating additional weather features...")

wind_rad = np.deg2rad(
    df["wind_direction_10m"]
)

df["wind_u"] = (
    -df["wind_speed_10m"] *
    np.sin(wind_rad)
)

df["wind_v"] = (
    -df["wind_speed_10m"] *
    np.cos(wind_rad)
)

df["dew_point_depression"] = (
    df["temperature_2m"] -
    df["dew_point_2m"]
)


# Weather changes by station
for col in [
    "temperature_2m",
    "relative_humidity_2m",
    "wind_speed_10m",
    "pressure_msl",
    "boundary_layer_height"
]:

    df[f"{col}_change1h"] = (
        df.groupby("Station")[col].diff(1)
    )


# ============================================================
# ADDITIONAL POLLUTION FEATURES
# ============================================================

print("Creating additional pollution features...")

pollutants = [
    "PM2.5",
    "PM10",
    "NO2",
    "OZONE"
]

extra_lags = [
    2, 4, 8, 18, 48, 72
]

for pollutant in pollutants:

    for lag in extra_lags:

        df[
            f"{pollutant}_extra_lag{lag}h"
        ] = (
            df.groupby("Station")[pollutant]
            .shift(lag)
        )


# ============================================================
# ROLLING STATISTICS
# ============================================================

rolling_windows = [
    3,
    6,
    12,
    24,
    48
]

for pollutant in pollutants:

    grouped = (
        df.groupby("Station")[pollutant]
    )

    for window in rolling_windows:

        shifted = grouped.shift(1)

        df[
            f"{pollutant}_roll{window}_mean"
        ] = (
            shifted.groupby(df["Station"])
            .transform(
                lambda x:
                x.rolling(window).mean()
            )
        )

        df[
            f"{pollutant}_roll{window}_std"
        ] = (
            shifted.groupby(df["Station"])
            .transform(
                lambda x:
                x.rolling(window).std()
            )
        )

        df[
            f"{pollutant}_roll{window}_min"
        ] = (
            shifted.groupby(df["Station"])
            .transform(
                lambda x:
                x.rolling(window).min()
            )
        )

        df[
            f"{pollutant}_roll{window}_max"
        ] = (
            shifted.groupby(df["Station"])
            .transform(
                lambda x:
                x.rolling(window).max()
            )
        )


# ============================================================
# RATE OF CHANGE
# ============================================================

for pollutant in pollutants:

    df[
        f"{pollutant}_change1h"
    ] = (
        df.groupby("Station")[pollutant]
        .diff(1)
    )

    df[
        f"{pollutant}_change3h"
    ] = (
        df.groupby("Station")[pollutant]
        .diff(3)
    )


# ============================================================
# TARGET
# ============================================================

# Target already exists in the augmented dataset

target = "PM2.5_next_1h"


# ============================================================
# BASE WEATHER FEATURES
# ============================================================

weather_features = [

    "temperature_2m",
    "relative_humidity_2m",

    "wind_speed_10m",
    "wind_u",
    "wind_v",

    "pressure_msl",
    "precipitation",

    "boundary_layer_height",

    "rain",

    "dew_point_2m",
    "dew_point_depression",

    "cloud_cover",

    "temperature_2m_change1h",
    "relative_humidity_2m_change1h",
    "wind_speed_10m_change1h",
    "pressure_msl_change1h",
    "boundary_layer_height_change1h"
]


# ============================================================
# EXISTING WEATHER FEATURES
# ============================================================

existing_features = [

    "wind_dir_sin",
    "wind_dir_cos",

    "hour_sin",
    "hour_cos",

    "dow",
    "month"
]


# ============================================================
# POLLUTION LAG FEATURES
# ============================================================

pollution_features = []


# Existing lags from prepared dataset

for pollutant in pollutants:

    for lag in [
        1,
        3,
        6,
        12,
        24
    ]:

        pollution_features.append(
            f"{pollutant}_lag_{lag}h"
        )


# Additional lags

for pollutant in pollutants:

    for lag in extra_lags:

        pollution_features.append(
            f"{pollutant}_extra_lag{lag}h"
        )


# ============================================================
# ROLLING FEATURES
# ============================================================

rolling_features = []

for pollutant in pollutants:

    for window in rolling_windows:

        rolling_features.extend([

            f"{pollutant}_roll{window}_mean",

            f"{pollutant}_roll{window}_std",

            f"{pollutant}_roll{window}_min",

            f"{pollutant}_roll{window}_max"
        ])


# ============================================================
# CHANGE FEATURES
# ============================================================

change_features = []

for pollutant in pollutants:

    change_features.extend([

        f"{pollutant}_change1h",

        f"{pollutant}_change3h"
    ])


# ============================================================
# FINAL FEATURES
# ============================================================

feature_cols = (
    weather_features
    + existing_features
    + pollution_features
    + rolling_features
    + change_features
)


# Remove features that don't exist

feature_cols = [
    col
    for col in feature_cols
    if col in df.columns
]


print(
    f"Number of features: {len(feature_cols)}"
)


# ============================================================
# VALID DATA
# ============================================================

required_columns = (
    feature_cols
    + [
        target,
        "Station",
        "timestamp"
    ]
)

df_model = df[
    required_columns
].copy()

df_model = df_model.dropna(
    subset=feature_cols + [target]
)

print(
    f"Rows after feature cleaning: "
    f"{len(df_model):,}"
)


# ============================================================
# CHRONOLOGICAL SPLIT
# ============================================================

unique_times = np.sort(
    df_model["timestamp"].unique()
)

cutoff_index = int(
    len(unique_times) * 0.80
)

cutoff_time = unique_times[
    cutoff_index
]

train = df_model[
    df_model["timestamp"] < cutoff_time
].copy()

test = df_model[
    df_model["timestamp"] >= cutoff_time
].copy()


print("\nChronological split")
print("-" * 50)

print(
    f"Train rows : {len(train):,}"
)

print(
    f"Test rows  : {len(test):,}"
)

print(
    f"Cutoff     : {cutoff_time}"
)


# ============================================================
# STATION ONE-HOT ENCODING
# ============================================================

train_station = pd.get_dummies(
    train["Station"],
    prefix="station"
)

test_station = pd.get_dummies(
    test["Station"],
    prefix="station"
)

test_station = test_station.reindex(
    columns=train_station.columns,
    fill_value=False
)


X_train = pd.concat(
    [
        train[feature_cols].reset_index(
            drop=True
        ),
        train_station.reset_index(
            drop=True
        )
    ],
    axis=1
)

X_test = pd.concat(
    [
        test[feature_cols].reset_index(
            drop=True
        ),
        test_station.reset_index(
            drop=True
        )
    ],
    axis=1
)


y_train = train[target]

y_test = test[target]


# ============================================================
# NUMERIC CONVERSION
# ============================================================

X_train = X_train.apply(
    pd.to_numeric,
    errors="coerce"
)

X_test = X_test.apply(
    pd.to_numeric,
    errors="coerce"
)


# ============================================================
# IMPUTATION
# ============================================================

medians = X_train.median()

X_train = X_train.fillna(
    medians
)

X_test = X_test.fillna(
    medians
)


# ============================================================
# XGBOOST
# ============================================================

print("\nTraining improved XGBoost...")

model = XGBRegressor(

    n_estimators=1000,

    max_depth=6,

    learning_rate=0.03,

    min_child_weight=3,

    subsample=0.85,

    colsample_bytree=0.85,

    reg_alpha=0.05,

    reg_lambda=1.0,

    objective="reg:squarederror",

    random_state=42,

    n_jobs=2
)


model.fit(
    X_train,
    y_train
)


# ============================================================
# PREDICTION
# ============================================================

print("Generating predictions...")

pred = model.predict(
    X_test
)

# PM2.5 cannot be negative

pred = np.maximum(
    pred,
    0
)


# ============================================================
# METRICS
# ============================================================

mae = mean_absolute_error(
    y_test,
    pred
)

rmse = np.sqrt(
    mean_squared_error(
        y_test,
        pred
    )
)

r2 = r2_score(
    y_test,
    pred
)

bias = np.mean(
    pred - y_test
)


# ============================================================
# PERSISTENCE BASELINE
# ============================================================

persistence = test[
    "PM2.5_lag_1h"
].values

valid_persistence = (
    ~pd.isna(persistence)
)

persistence = persistence[
    valid_persistence
]

persistence_actual = y_test.values[
    valid_persistence
]


persistence_mae = mean_absolute_error(
    persistence_actual,
    persistence
)

persistence_rmse = np.sqrt(
    mean_squared_error(
        persistence_actual,
        persistence
    )
)

persistence_bias = np.mean(
    persistence -
    persistence_actual
)


# ============================================================
# RESULTS
# ============================================================

print("\n")
print("=" * 60)

print(
    "IMPROVED PM2.5 MODEL RESULTS"
)

print("=" * 60)

print(
    f"MAE              : {mae:.4f}"
)

print(
    f"RMSE             : {rmse:.4f}"
)

print(
    f"R²               : {r2:.4f}"
)

print(
    f"Mean Bias        : {bias:.4f}"
)

print("\nPersistence baseline")

print(
    f"MAE              : "
    f"{persistence_mae:.4f}"
)

print(
    f"RMSE             : "
    f"{persistence_rmse:.4f}"
)

print(
    f"Mean Bias        : "
    f"{persistence_bias:.4f}"
)

print("=" * 60)


# ============================================================
# IMPROVEMENT OVER PERSISTENCE
# ============================================================

improvement = (
    (persistence_mae - mae)
    / persistence_mae
) * 100

print(
    f"\nMAE improvement over "
    f"persistence: {improvement:.2f}%"
)


# ============================================================
# SAVE MODEL
# ============================================================

model_path = os.path.join(
    MODEL_DIR,
    "xgb_pm25_improved.joblib"
)

joblib.dump(
    model,
    model_path
)


# ============================================================
# SAVE METRICS
# ============================================================

metrics = pd.DataFrame([

    {
        "Model": "Improved XGBoost",
        "MAE": mae,
        "RMSE": rmse,
        "R2": r2,
        "Mean_Bias": bias
    },

    {
        "Model": "Persistence",
        "MAE": persistence_mae,
        "RMSE": persistence_rmse,
        "R2": np.nan,
        "Mean_Bias": persistence_bias
    }

])


metrics.to_csv(
    os.path.join(
        RESULT_DIR,
        "pm25_improved_metrics.csv"
    ),
    index=False
)


# ============================================================
# SAVE METADATA
# ============================================================

metadata = {

    "target": target,

    "n_features":
        len(feature_cols),

    "train_rows":
        len(train),

    "test_rows":
        len(test),

    "cutoff":
        str(cutoff_time),

    "mae":
        float(mae),

    "rmse":
        float(rmse),

    "r2":
        float(r2),

    "mean_bias":
        float(bias)

}


with open(
    os.path.join(
        MODEL_DIR,
        "pm25_improved_metadata.json"
    ),
    "w"
) as f:

    json.dump(
        metadata,
        f,
        indent=4
    )


print(
    "\nModel and results saved successfully."
)