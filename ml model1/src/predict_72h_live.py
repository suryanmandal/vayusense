import pandas as pd
import numpy as np
import joblib
from pathlib import Path


# ============================================================
# VAYUSENSE - CORRECTED LIVE 72-HOUR FORECAST
# ============================================================

AQ_FILE = Path("data/current_aq_hourly.csv")
WEATHER_FILE = Path("data/weather_forecast_72h.csv")

MODEL_DIR = Path("models")
RESULT_FILE = Path("results/forecast_72h_live.csv")

POLLUTANTS = [
    "PM2.5",
    "PM10",
    "NO2",
    "OZONE"
]

MODEL_FILES = {
    "PM2.5": "xgb_pm25_improved.joblib",
    "PM10": "xgb_PM10_improved.joblib",
    "NO2": "xgb_NO2_improved.joblib",
    "OZONE": "xgb_OZONE_improved.joblib"
}


# ============================================================
# LOAD AQ DATA
# ============================================================

print("=" * 80)
print("VAYUSENSE - CORRECTED LIVE 72-HOUR FORECAST")
print("=" * 80)

print("\nLoading current AQ data...")

aq = pd.read_csv(AQ_FILE)

aq["timestamp"] = pd.to_datetime(
    aq["timestamp"],
    errors="coerce"
)

aq = aq.dropna(
    subset=["timestamp"]
)

aq = aq.sort_values(
    ["Station", "timestamp"]
).reset_index(drop=True)

print("AQ rows :", len(aq))
print("Stations:", aq["Station"].nunique())
print(
    "AQ range:",
    aq["timestamp"].min(),
    "->",
    aq["timestamp"].max()
)


# ============================================================
# NUMERIC CONVERSION
# ============================================================

for pollutant in POLLUTANTS:

    if pollutant in aq.columns:

        aq[pollutant] = pd.to_numeric(
            aq[pollutant],
            errors="coerce"
        )


# ============================================================
# LOAD WEATHER
# ============================================================

print("\nLoading weather forecast...")

weather = pd.read_csv(
    WEATHER_FILE
)

weather["timestamp"] = pd.to_datetime(
    weather["timestamp"],
    errors="coerce"
)

weather = weather.dropna(
    subset=["timestamp"]
)

weather = weather.sort_values(
    "timestamp"
).reset_index(drop=True)

print("Weather rows:", len(weather))

required_weather = [
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

missing_weather = [
    c for c in required_weather
    if c not in weather.columns
]

if missing_weather:

    raise ValueError(
        f"Missing weather columns: {missing_weather}"
    )


# ============================================================
# LATEST AQ TIME
# ============================================================

latest_aq_time = aq["timestamp"].max()

print("\nLatest AQ timestamp:")
print(latest_aq_time)


# ============================================================
# FUTURE WEATHER
# ============================================================

forecast_weather = weather[
    weather["timestamp"] > latest_aq_time
].copy()

forecast_weather = forecast_weather.head(72)

if len(forecast_weather) != 72:

    raise ValueError(
        f"Expected 72 future weather rows, "
        f"but found {len(forecast_weather)}."
    )


print("\nForecast period:")
print(
    forecast_weather["timestamp"].min(),
    "->",
    forecast_weather["timestamp"].max()
)


# ============================================================
# LOAD MODELS
# ============================================================

print("\nLoading trained models...")

models = {}
feature_names = {}

for pollutant, filename in MODEL_FILES.items():

    model_path = MODEL_DIR / filename

    if not model_path.exists():

        raise FileNotFoundError(
            f"Model not found: {model_path}"
        )

    model = joblib.load(model_path)

    models[pollutant] = model

    if not hasattr(model, "feature_names_in_"):

        raise ValueError(
            f"{filename} does not contain feature_names_in_."
        )

    feature_names[pollutant] = list(
        model.feature_names_in_
    )

    print(
        f"{pollutant:8s} -> "
        f"{filename} -> "
        f"{len(feature_names[pollutant])} features"
    )


# ============================================================
# WEATHER FEATURE CREATION
# EXACTLY MATCHES TRAINING
# ============================================================

def create_weather_features(
    row,
    previous_weather=None
):

    features = {}

    # --------------------------------------------------------
    # Base weather
    # --------------------------------------------------------

    features["temperature_2m"] = (
        row["temperature_2m"]
    )

    features["relative_humidity_2m"] = (
        row["relative_humidity_2m"]
    )

    features["wind_speed_10m"] = (
        row["wind_speed_10m"]
    )

    features["pressure_msl"] = (
        row["pressure_msl"]
    )

    features["precipitation"] = (
        row["precipitation"]
    )

    features["boundary_layer_height"] = (
        row["boundary_layer_height"]
    )

    features["rain"] = (
        row["rain"]
    )

    features["dew_point_2m"] = (
        row["dew_point_2m"]
    )

    features["cloud_cover"] = (
        row["cloud_cover"]
    )

    # --------------------------------------------------------
    # Wind direction
    # --------------------------------------------------------

    wind_direction = row["wind_direction_10m"]

    wind_rad = np.deg2rad(
        wind_direction
    )

    features["wind_dir_sin"] = np.sin(
        wind_rad
    )

    features["wind_dir_cos"] = np.cos(
        wind_rad
    )

    # --------------------------------------------------------
    # Wind U / V
    # EXACTLY LIKE TRAINING
    # --------------------------------------------------------

    features["wind_u"] = (
        -row["wind_speed_10m"]
        * np.sin(wind_rad)
    )

    features["wind_v"] = (
        -row["wind_speed_10m"]
        * np.cos(wind_rad)
    )

    # --------------------------------------------------------
    # Dew point depression
    # --------------------------------------------------------

    features["dew_point_depression"] = (
        row["temperature_2m"]
        - row["dew_point_2m"]
    )

    # --------------------------------------------------------
    # Weather changes
    # EXACT TRAINING NAMES
    # --------------------------------------------------------

    if previous_weather is None:

        features[
            "temperature_2m_change1h"
        ] = 0.0

        features[
            "relative_humidity_2m_change1h"
        ] = 0.0

        features[
            "wind_speed_10m_change1h"
        ] = 0.0

        features[
            "pressure_msl_change1h"
        ] = 0.0

        features[
            "boundary_layer_height_change1h"
        ] = 0.0

    else:

        features[
            "temperature_2m_change1h"
        ] = (
            row["temperature_2m"]
            - previous_weather["temperature_2m"]
        )

        features[
            "relative_humidity_2m_change1h"
        ] = (
            row["relative_humidity_2m"]
            - previous_weather["relative_humidity_2m"]
        )

        features[
            "wind_speed_10m_change1h"
        ] = (
            row["wind_speed_10m"]
            - previous_weather["wind_speed_10m"]
        )

        features[
            "pressure_msl_change1h"
        ] = (
            row["pressure_msl"]
            - previous_weather["pressure_msl"]
        )

        features[
            "boundary_layer_height_change1h"
        ] = (
            row["boundary_layer_height"]
            - previous_weather["boundary_layer_height"]
        )

    return features


# ============================================================
# TIME FEATURES
# EXACTLY MATCHES TRAINING
# ============================================================

def create_time_features(
    timestamp
):

    features = {}

    hour = timestamp.hour

    day_of_week = timestamp.dayofweek

    month = timestamp.month

    # Training uses hour_sin/hour_cos
    features["hour_sin"] = np.sin(
        2 * np.pi * hour / 24
    )

    features["hour_cos"] = np.cos(
        2 * np.pi * hour / 24
    )

    # Training uses dow_sin/dow_cos
    features["dow_sin"] = np.sin(
        2 * np.pi * day_of_week / 7
    )

    features["dow_cos"] = np.cos(
        2 * np.pi * day_of_week / 7
    )

    # Training also uses raw dow/month
    features["dow"] = day_of_week

    features["month"] = month

    return features


# ============================================================
# BUILD FEATURES
# ============================================================

def build_features(
    history,
    station,
    timestamp,
    weather_row,
    previous_weather
):

    features = {}

    # --------------------------------------------------------
    # WEATHER
    # --------------------------------------------------------

    features.update(
        create_weather_features(
            weather_row,
            previous_weather
        )
    )

    # --------------------------------------------------------
    # TIME
    # --------------------------------------------------------

    features.update(
        create_time_features(
            timestamp
        )
    )

    # --------------------------------------------------------
    # EXISTING POLLUTION LAGS
    # EXACT TRAINING NAMES
    # --------------------------------------------------------

    existing_lags = [
        1,
        3,
        6,
        12,
        24
    ]

    for pollutant in POLLUTANTS:

        if pollutant not in history.columns:
            continue

        series = history[pollutant]

        for lag in existing_lags:

            name = (
                f"{pollutant}_lag_{lag}h"
            )

            if len(series) >= lag:

                features[name] = (
                    series.iloc[-lag]
                )

            else:

                features[name] = np.nan

    # --------------------------------------------------------
    # EXTRA POLLUTION LAGS
    # --------------------------------------------------------

    extra_lags = [
        2,
        4,
        8,
        18,
        48,
        72
    ]

    for pollutant in POLLUTANTS:

        if pollutant not in history.columns:
            continue

        series = history[pollutant]

        for lag in extra_lags:

            name = (
                f"{pollutant}_extra_lag{lag}h"
            )

            if len(series) >= lag:

                features[name] = (
                    series.iloc[-lag]
                )

            else:

                features[name] = np.nan

    # --------------------------------------------------------
    # ROLLING FEATURES
    # EXACT TRAINING LOGIC
    #
    # Training uses SHIFT(1) before rolling.
    #
    # For live prediction, history already ends
    # at the previous hour, therefore tail(window)
    # represents the equivalent previous observations.
    # --------------------------------------------------------

    rolling_windows = [
        3,
        6,
        12,
        24,
        48
    ]

    for pollutant in POLLUTANTS:

        if pollutant not in history.columns:
            continue

        series = history[pollutant]

        for window in rolling_windows:

            values = series.tail(
                window
            )

            features[
                f"{pollutant}_roll{window}_mean"
            ] = values.mean()

            features[
                f"{pollutant}_roll{window}_std"
            ] = values.std()

            features[
                f"{pollutant}_roll{window}_min"
            ] = values.min()

            features[
                f"{pollutant}_roll{window}_max"
            ] = values.max()

    # --------------------------------------------------------
    # POLLUTION CHANGE
    # EXACT TRAINING LOGIC
    # --------------------------------------------------------

    for pollutant in POLLUTANTS:

        if pollutant not in history.columns:
            continue

        series = history[pollutant]

        # change1h
        if len(series) >= 2:

            features[
                f"{pollutant}_change1h"
            ] = (
                series.iloc[-1]
                - series.iloc[-2]
            )

        else:

            features[
                f"{pollutant}_change1h"
            ] = np.nan

        # change3h
        if len(series) >= 4:

            features[
                f"{pollutant}_change3h"
            ] = (
                series.iloc[-1]
                - series.iloc[-4]
            )

        else:

            features[
                f"{pollutant}_change3h"
            ] = np.nan

    # --------------------------------------------------------
    # STATION ONE-HOT
    # --------------------------------------------------------

    station_name = str(station)

    for pollutant in POLLUTANTS:

        names = feature_names[pollutant]

        for name in names:

            if name.startswith("station_"):

                features[name] = (
                    1
                    if name
                    == f"station_{station_name}"
                    else 0
                )

    return features


# ============================================================
# ALIGN FEATURES WITH MODEL
# ============================================================

def prepare_model_input(
    features,
    names
):

    X = pd.DataFrame(
        [features]
    )

    # --------------------------------------------------------
    # Add missing model features
    # --------------------------------------------------------

    for name in names:

        if name not in X.columns:

            if name.startswith("station_"):

                X[name] = 0

            else:

                X[name] = np.nan

    # --------------------------------------------------------
    # Remove extra features
    # --------------------------------------------------------

    X = X[names].copy()

    # --------------------------------------------------------
    # Convert numeric
    # --------------------------------------------------------

    X = X.apply(
        pd.to_numeric,
        errors="coerce"
    )

    return X


# ============================================================
# PREDICTION
# ============================================================

def predict_pollutant(
    model,
    names,
    features
):

    X = prepare_model_input(
        features,
        names
    )

    prediction = model.predict(
        X
    )[0]

    # Concentration cannot be negative
    prediction = max(
        0.0,
        float(prediction)
    )

    return prediction


# ============================================================
# FORECAST
# ============================================================

results = []

stations = sorted(
    aq["Station"]
    .dropna()
    .unique()
)

print()
print("=" * 80)
print("STARTING CORRECTED 72-HOUR RECURSIVE FORECAST")
print("=" * 80)


for station_index, station in enumerate(
    stations,
    start=1
):

    print(
        f"\n[{station_index}/{len(stations)}] "
        f"{station}"
    )

    # --------------------------------------------------------
    # Station history
    # --------------------------------------------------------

    history = aq[
        aq["Station"] == station
    ].copy()

    history = history[
        history["timestamp"]
        <= latest_aq_time
    ].copy()

    history = history.sort_values(
        "timestamp"
    ).reset_index(drop=True)

    # Need at least 72 observations
    if len(history) < 72:

        print(
            f"Skipping - only "
            f"{len(history)} history rows."
        )

        continue

    # Keep enough history for maximum 72h lag
    history = history.tail(
        200
    ).copy()

    previous_weather = None

    # --------------------------------------------------------
    # 72-hour recursive prediction
    # --------------------------------------------------------

    for _, weather_row in (
        forecast_weather.iterrows()
    ):

        timestamp = (
            weather_row["timestamp"]
        )

        # ----------------------------------------------------
        # Build EXACT training features
        # ----------------------------------------------------

        features = build_features(
            history=history,
            station=station,
            timestamp=timestamp,
            weather_row=weather_row,
            previous_weather=previous_weather
        )

        predictions = {}

        # ----------------------------------------------------
        # Predict pollutants
        # ----------------------------------------------------

        for pollutant in POLLUTANTS:

            predictions[pollutant] = (
                predict_pollutant(
                    models[pollutant],
                    feature_names[pollutant],
                    features
                )
            )

        # ----------------------------------------------------
        # Store result
        # ----------------------------------------------------

        results.append({

            "Station": station,

            "timestamp": timestamp,

            "PM2.5":
                predictions["PM2.5"],

            "PM10":
                predictions["PM10"],

            "NO2":
                predictions["NO2"],

            "OZONE":
                predictions["OZONE"]
        })

        # ----------------------------------------------------
        # Add prediction to history
        # ----------------------------------------------------

        new_row = {

            "Station": station,

            "timestamp": timestamp,

            "PM2.5":
                predictions["PM2.5"],

            "PM10":
                predictions["PM10"],

            "NO2":
                predictions["NO2"],

            "OZONE":
                predictions["OZONE"]
        }

        # Add future weather
        for col in weather_row.index:

            if col != "timestamp":

                new_row[col] = (
                    weather_row[col]
                )

        history = pd.concat(
            [
                history,
                pd.DataFrame(
                    [new_row]
                )
            ],
            ignore_index=True
        )

        history = history.tail(
            200
        )

        previous_weather = weather_row


# ============================================================
# FINAL DATAFRAME
# ============================================================

forecast = pd.DataFrame(
    results
)

if forecast.empty:

    raise ValueError(
        "No forecasts were generated."
    )


forecast = forecast.sort_values(
    ["Station", "timestamp"]
).reset_index(drop=True)


# ============================================================
# SANITY CHECKS
# ============================================================

print()
print("=" * 80)
print("SANITY CHECK")
print("=" * 80)

for pollutant in POLLUTANTS:

    print(
        f"\n{pollutant}"
    )

    print(
        "Minimum:",
        forecast[pollutant].min()
    )

    print(
        "Maximum:",
        forecast[pollutant].max()
    )

    print(
        "Mean:",
        forecast[pollutant].mean()
    )


# ============================================================
# SAVE
# ============================================================

RESULT_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)

forecast.to_csv(
    RESULT_FILE,
    index=False
)


# ============================================================
# FINAL SUMMARY
# ============================================================

print()
print("=" * 80)
print("72-HOUR FORECAST COMPLETE")
print("=" * 80)

print(
    "\nStations forecast:",
    forecast["Station"].nunique()
)

print(
    "Forecast rows:",
    len(forecast)
)

print(
    "Expected rows:",
    forecast["Station"].nunique() * 72
)

print(
    "Forecast start:",
    forecast["timestamp"].min()
)

print(
    "Forecast end:",
    forecast["timestamp"].max()
)

print(
    "\nSaved:",
    RESULT_FILE
)

print("\nFirst 10 predictions:")

print(
    forecast.head(10).to_string(
        index=False
    )
)

print()
print("=" * 80)