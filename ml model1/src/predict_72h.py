import os
import json
import joblib
import numpy as np
import pandas as pd

from datetime import timedelta


# ============================================================
# CONFIGURATION
# ============================================================

DATA_FILE = "data/vayusense_hourly_training_table_augmented.csv"

MODEL_DIR = "models"
RESULT_DIR = "results"

os.makedirs(RESULT_DIR, exist_ok=True)


# ============================================================
# MODEL FILES
# ============================================================

MODEL_FILES = {
    "PM2.5": "xgb_pm25_improved.joblib",
    "PM10": "xgb_PM10_improved.joblib",
    "NO2": "xgb_NO2_improved.joblib",
    "OZONE": "xgb_OZONE_improved.joblib"
}


# ============================================================
# LOAD DATA
# ============================================================

print("=" * 75)
print("VAYUSENSE - 72 HOUR AIR QUALITY FORECAST")
print("=" * 75)

print("\nLoading AQ dataset...")

df = pd.read_csv(DATA_FILE)

df["timestamp"] = pd.to_datetime(
    df["timestamp"],
    errors="coerce"
)

df = df.dropna(
    subset=["timestamp"]
)

df = df.sort_values(
    ["Station", "timestamp"]
).reset_index(drop=True)

print(
    f"Rows loaded : {len(df):,}"
)

print(
    f"Stations    : {df['Station'].nunique()}"
)

print(
    f"Latest AQ   : {df['timestamp'].max()}"
)


# ============================================================
# LOAD MODELS
# ============================================================

print("\nLoading trained models...")

models = {}

for pollutant, filename in MODEL_FILES.items():

    path = os.path.join(
        MODEL_DIR,
        filename
    )

    if not os.path.exists(path):

        raise FileNotFoundError(
            f"Model not found: {path}"
        )

    models[pollutant] = joblib.load(
        path
    )

    print(
        f"Loaded {pollutant}: {filename}"
    )


# ============================================================
# GET MODEL FEATURE NAMES
# ============================================================

print("\nReading model feature structure...")

model_feature_names = {}

for pollutant, model in models.items():

    if hasattr(
        model,
        "feature_names_in_"
    ):

        model_feature_names[pollutant] = (
            list(model.feature_names_in_)
        )

        print(
            f"{pollutant}: "
            f"{len(model_feature_names[pollutant])} features"
        )

    else:

        raise RuntimeError(
            f"Cannot determine feature names "
            f"for {pollutant} model."
        )


# ============================================================
# NUMERIC POLLUTION COLUMNS
# ============================================================

pollutant_columns = [
    "PM2.5",
    "PM10",
    "NO2",
    "OZONE"
]


for col in pollutant_columns:

    df[col] = pd.to_numeric(
        df[col],
        errors="coerce"
    )


# ============================================================
# WEATHER COLUMNS
# ============================================================

weather_columns = [
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


for col in weather_columns:

    if col in df.columns:

        df[col] = pd.to_numeric(
            df[col],
            errors="coerce"
        )


# ============================================================
# WEATHER FALLBACK
# ============================================================

# For this first demonstration, we use the most recent
# available weather values for each station.

print(
    "\nPreparing latest weather conditions..."
)


# ============================================================
# HELPER: CREATE FEATURES
# ============================================================

def create_features(history, timestamp):

    """
    Create the same feature structure used during training.
    """

    station = history["Station"].iloc[-1]

    row = history.iloc[-1].copy()

    result = {}

    # --------------------------------------------------------
    # Weather
    # --------------------------------------------------------

    temperature = row.get(
        "temperature_2m",
        np.nan
    )

    humidity = row.get(
        "relative_humidity_2m",
        np.nan
    )

    wind_speed = row.get(
        "wind_speed_10m",
        np.nan
    )

    wind_direction = row.get(
        "wind_direction_10m",
        np.nan
    )

    pressure = row.get(
        "pressure_msl",
        np.nan
    )

    precipitation = row.get(
        "precipitation",
        np.nan
    )

    pbl = row.get(
        "boundary_layer_height",
        np.nan
    )

    rain = row.get(
        "rain",
        np.nan
    )

    dew_point = row.get(
        "dew_point_2m",
        np.nan
    )

    cloud_cover = row.get(
        "cloud_cover",
        np.nan
    )


    result["temperature_2m"] = temperature

    result[
        "relative_humidity_2m"
    ] = humidity

    result[
        "wind_speed_10m"
    ] = wind_speed

    result[
        "pressure_msl"
    ] = pressure

    result[
        "precipitation"
    ] = precipitation

    result[
        "boundary_layer_height"
    ] = pbl

    result["rain"] = rain

    result[
        "dew_point_2m"
    ] = dew_point

    result[
        "cloud_cover"
    ] = cloud_cover


    # --------------------------------------------------------
    # Wind components
    # --------------------------------------------------------

    if pd.notna(wind_direction):

        wind_rad = np.deg2rad(
            wind_direction
        )

        wind_u = (
            -wind_speed *
            np.sin(wind_rad)
        )

        wind_v = (
            -wind_speed *
            np.cos(wind_rad)
        )

    else:

        wind_u = np.nan
        wind_v = np.nan


    result["wind_u"] = wind_u
    result["wind_v"] = wind_v


    # --------------------------------------------------------
    # Dew point depression
    # --------------------------------------------------------

    result[
        "dew_point_depression"
    ] = (
        temperature -
        dew_point
    )


    # --------------------------------------------------------
    # Weather changes
    # --------------------------------------------------------

    if len(history) >= 2:

        previous = history.iloc[-2]

        result[
            "temperature_2m_change1h"
        ] = (
            temperature -
            previous.get(
                "temperature_2m",
                np.nan
            )
        )

        result[
            "relative_humidity_2m_change1h"
        ] = (
            humidity -
            previous.get(
                "relative_humidity_2m",
                np.nan
            )
        )

        result[
            "wind_speed_10m_change1h"
        ] = (
            wind_speed -
            previous.get(
                "wind_speed_10m",
                np.nan
            )
        )

        result[
            "pressure_msl_change1h"
        ] = (
            pressure -
            previous.get(
                "pressure_msl",
                np.nan
            )
        )

        result[
            "boundary_layer_height_change1h"
        ] = (
            pbl -
            previous.get(
                "boundary_layer_height",
                np.nan
            )
        )

    else:

        for col in [
            "temperature_2m_change1h",
            "relative_humidity_2m_change1h",
            "wind_speed_10m_change1h",
            "pressure_msl_change1h",
            "boundary_layer_height_change1h"
        ]:

            result[col] = 0


    # --------------------------------------------------------
    # Wind direction encoding
    # --------------------------------------------------------

    result[
        "wind_dir_sin"
    ] = np.sin(
        np.deg2rad(wind_direction)
    )

    result[
        "wind_dir_cos"
    ] = np.cos(
        np.deg2rad(wind_direction)
    )


    # --------------------------------------------------------
    # Time features
    # --------------------------------------------------------

    hour = timestamp.hour

    dow = timestamp.dayofweek

    month = timestamp.month


    result["hour_sin"] = np.sin(
        2 * np.pi * hour / 24
    )

    result["hour_cos"] = np.cos(
        2 * np.pi * hour / 24
    )

    result["dow_sin"] = np.sin(
        2 * np.pi * dow / 7
    )

    result["dow_cos"] = np.cos(
        2 * np.pi * dow / 7
    )

    result["dow"] = dow

    result["month"] = month


    # --------------------------------------------------------
    # Pollution lag features
    # --------------------------------------------------------

    lag_values = [
        1,
        3,
        6,
        12,
        24
    ]

    extra_lags = [
        2,
        4,
        8,
        18,
        48,
        72
    ]


    for pollutant in pollutant_columns:

        values = history[
            pollutant
        ].dropna().values


        # Existing lags

        for lag in lag_values:

            col = (
                f"{pollutant}_lag_{lag}h"
            )

            if len(values) >= lag:

                result[col] = values[-lag]

            else:

                result[col] = np.nan


        # Extra lags

        for lag in extra_lags:

            col = (
                f"{pollutant}_extra_lag{lag}h"
            )

            if len(values) >= lag:

                result[col] = values[-lag]

            else:

                result[col] = np.nan


    # --------------------------------------------------------
    # Rolling statistics
    # --------------------------------------------------------

    windows = [
        3,
        6,
        12,
        24,
        48
    ]


    for pollutant in pollutant_columns:

        values = (
            history[pollutant]
            .dropna()
        )


        for window in windows:

            if len(values) >= window:

                recent = (
                    values
                    .iloc[-window:]
                )

                result[
                    f"{pollutant}_roll{window}_mean"
                ] = recent.mean()

                result[
                    f"{pollutant}_roll{window}_std"
                ] = recent.std()

                result[
                    f"{pollutant}_roll{window}_min"
                ] = recent.min()

                result[
                    f"{pollutant}_roll{window}_max"
                ] = recent.max()

            else:

                result[
                    f"{pollutant}_roll{window}_mean"
                ] = np.nan

                result[
                    f"{pollutant}_roll{window}_std"
                ] = np.nan

                result[
                    f"{pollutant}_roll{window}_min"
                ] = np.nan

                result[
                    f"{pollutant}_roll{window}_max"
                ] = np.nan


    # --------------------------------------------------------
    # Pollution change
    # --------------------------------------------------------

    for pollutant in pollutant_columns:

        values = (
            history[pollutant]
            .dropna()
            .values
        )


        if len(values) >= 2:

            result[
                f"{pollutant}_change1h"
            ] = (
                values[-1] -
                values[-2]
            )

        else:

            result[
                f"{pollutant}_change1h"
            ] = np.nan


        if len(values) >= 4:

            result[
                f"{pollutant}_change3h"
            ] = (
                values[-1] -
                values[-4]
            )

        else:

            result[
                f"{pollutant}_change3h"
            ] = np.nan


    # --------------------------------------------------------
    # Station encoding
    # --------------------------------------------------------

    station_feature = (
        f"station_{station}"
    )

    result[station_feature] = 1


    return result


# ============================================================
# AQI CALCULATION
# ============================================================

def calculate_pm25_aqi(pm25):

    """
    Indian-style PM2.5 AQI breakpoints.
    Used as a project-level approximation for now.
    """

    if pd.isna(pm25):
        return np.nan

    if pm25 <= 30:
        return pm25 * 50 / 30

    elif pm25 <= 60:
        return 50 + (
            (pm25 - 30) * 50 / 30
        )

    elif pm25 <= 90:
        return 100 + (
            (pm25 - 60) * 100 / 30
        )

    elif pm25 <= 120:
        return 200 + (
            (pm25 - 90) * 100 / 30
        )

    elif pm25 <= 250:
        return 300 + (
            (pm25 - 120) * 100 / 130
        )

    else:
        return 400 + min(
            (pm25 - 250) * 100 / 130,
            100
        )


def aqi_category(aqi):

    if pd.isna(aqi):
        return "Unknown"

    if aqi <= 50:
        return "Good"

    elif aqi <= 100:
        return "Satisfactory"

    elif aqi <= 200:
        return "Moderate"

    elif aqi <= 300:
        return "Poor"

    elif aqi <= 400:
        return "Very Poor"

    else:
        return "Severe"


# ============================================================
# FORECAST ONE STATION
# ============================================================

def forecast_station(
    station_history,
    station_name,
    hours=72
):

    history = (
        station_history
        .sort_values("timestamp")
        .copy()
        .reset_index(drop=True)
    )


    # Need sufficient history

    if len(history) < 72:

        print(
            f"WARNING: {station_name} "
            f"has only {len(history)} rows."
        )


    latest_time = (
        history["timestamp"].max()
    )


    forecasts = []


    # --------------------------------------------------------
    # Recursive forecasting
    # --------------------------------------------------------

    for step in range(1, hours + 1):

        forecast_time = (
            latest_time +
            timedelta(hours=step)
        )


        # Create features using ONLY history
        # available before forecast_time

        feature_dict = create_features(
            history,
            forecast_time
        )


        predictions = {}


        # ----------------------------------------------------
        # Predict all pollutants
        # ----------------------------------------------------

        for pollutant, model in models.items():

            feature_names = (
                model_feature_names[
                    pollutant
                ]
            )


            # Build exact model input

            X = pd.DataFrame(
                [feature_dict]
            )


            # Add missing model features

            for feature in feature_names:

                if feature not in X.columns:

                    X[feature] = np.nan


            # Remove extra columns

            X = X[
                feature_names
            ]


            # Convert numeric

            X = X.apply(
                pd.to_numeric,
                errors="coerce"
            )


            # Fill missing values with 0 temporarily.
            #
            # The trained model itself doesn't know the
            # training medians, so this is a conservative
            # fallback for the first working pipeline.

            X = X.fillna(0)


            prediction = model.predict(X)[0]


            prediction = max(
                float(prediction),
                0
            )


            predictions[pollutant] = (
                prediction
            )


        # ----------------------------------------------------
        # Add predictions to history
        # ----------------------------------------------------

        new_row = {
            "Station":
                station_name,

            "timestamp":
                forecast_time,

            "PM2.5":
                predictions["PM2.5"],

            "PM10":
                predictions["PM10"],

            "NO2":
                predictions["NO2"],

            "OZONE":
                predictions["OZONE"]
        }


        # Carry forward latest weather

        latest_weather = (
            history.iloc[-1]
        )


        for col in weather_columns:

            if col in history.columns:

                new_row[col] = (
                    latest_weather[col]
                )


        # Add forecast row

        history = pd.concat(
            [
                history,
                pd.DataFrame([new_row])
            ],
            ignore_index=True
        )


        # ----------------------------------------------------
        # AQI
        # ----------------------------------------------------

        pm25 = (
            predictions["PM2.5"]
        )


        aqi = calculate_pm25_aqi(
            pm25
        )


        forecasts.append({

            "timestamp":
                forecast_time,

            "Station":
                station_name,

            "PM2.5":
                predictions["PM2.5"],

            "PM10":
                predictions["PM10"],

            "NO2":
                predictions["NO2"],

            "OZONE":
                predictions["OZONE"],

            "AQI":
                aqi,

            "AQI_Category":
                aqi_category(aqi)

        })


    return forecasts


# ============================================================
# RUN FORECAST
# ============================================================

print("\nStarting recursive 72-hour forecasting...")

all_forecasts = []


stations = (
    df["Station"]
    .dropna()
    .unique()
)


for i, station in enumerate(stations, start=1):

    print(
        f"\n[{i}/{len(stations)}] "
        f"Forecasting {station}"
    )


    station_history = (
        df[
            df["Station"] == station
        ]
        .sort_values("timestamp")
        .copy()
    )


    # Keep only a reasonable recent history
    #
    # 100 hours is enough for the 72h lag features.

    station_history = (
        station_history
        .tail(200)
        .copy()
    )


    try:

        station_forecast = forecast_station(
            station_history,
            station,
            hours=72
        )


        all_forecasts.extend(
            station_forecast
        )


        print(
            f"Completed {station}"
        )


    except Exception as e:

        print(
            f"ERROR for {station}: {e}"
        )


# ============================================================
# SAVE FORECAST
# ============================================================

forecast_df = pd.DataFrame(
    all_forecasts
)


output_file = os.path.join(
    RESULT_DIR,
    "forecast_72h.csv"
)


forecast_df.to_csv(
    output_file,
    index=False
)


# ============================================================
# SUMMARY
# ============================================================

print("\n")
print("=" * 75)
print("72-HOUR FORECAST COMPLETED")
print("=" * 75)

print(
    f"Forecast rows : "
    f"{len(forecast_df):,}"
)

print(
    f"Stations      : "
    f"{forecast_df['Station'].nunique()}"
)

print(
    f"Forecast from : "
    f"{forecast_df['timestamp'].min()}"
)

print(
    f"Forecast to   : "
    f"{forecast_df['timestamp'].max()}"
)

print(
    f"Output file   : "
    f"{output_file}"
)

print("=" * 75)


# ============================================================
# DISPLAY SAMPLE
# ============================================================

if len(forecast_df) > 0:

    print("\nSample forecast:")

    print(
        forecast_df.head(20).to_string(
            index=False
        )
    )


# ============================================================
# AQI SUMMARY
# ============================================================

if len(forecast_df) > 0:

    print("\nAQI Category distribution:")

    print(
        forecast_df[
            "AQI_Category"
        ]
        .value_counts()
        .to_string()
    )


print("\n72-hour forecasting finished.")