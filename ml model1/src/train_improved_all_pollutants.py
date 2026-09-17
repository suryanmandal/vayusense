from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"
RESULT_DIR = BASE_DIR / "results"

AQ_FILE = DATA_DIR / "current_aq_hourly.csv"
WEATHER_FILE = DATA_DIR / "weather_forecast_72h.csv"

MEDIANS_FILE = MODEL_DIR / "all_pollutants_training_medians.json"

OUTPUT_FILE = DATA_DIR / "forecast_72h.csv"


# ============================================================
# MODELS
# ============================================================

MODEL_FILES = {
    "PM2.5": MODEL_DIR / "xgb_pm25_improved.joblib",
    "PM10": MODEL_DIR / "xgb_PM10_improved.joblib",
    "NO2": MODEL_DIR / "xgb_NO2_improved.joblib",
    "OZONE": MODEL_DIR / "xgb_OZONE_improved.joblib",
}


# ============================================================
# POLLUTANTS
# ============================================================

POLLUTANTS = [
    "PM2.5",
    "PM10",
    "NO2",
    "OZONE",
]


# ============================================================
# LOAD MODELS
# ============================================================

def load_models():

    models = {}

    for pollutant, path in MODEL_FILES.items():

        if not path.exists():
            raise FileNotFoundError(
                f"Model not found: {path}"
            )

        models[pollutant] = joblib.load(path)

        print(
            f"Loaded {pollutant} model: "
            f"{path.name}"
        )

    return models


# ============================================================
# LOAD TRAINING MEDIANS
# ============================================================

def load_training_medians():

    if not MEDIANS_FILE.exists():
        raise FileNotFoundError(
            f"Training medians file not found:\n{MEDIANS_FILE}"
        )

    with open(MEDIANS_FILE, "r") as f:
        medians = json.load(f)

    print(
        f"Loaded training medians: "
        f"{MEDIANS_FILE.name}"
    )

    return medians


# ============================================================
# LOAD AQ DATA
# ============================================================

def load_aq_data():

    if not AQ_FILE.exists():
        raise FileNotFoundError(
            f"AQ file not found:\n{AQ_FILE}"
        )

    df = pd.read_csv(AQ_FILE)

    if "timestamp" not in df.columns:
        raise ValueError(
            "current_aq_hourly.csv must contain a 'timestamp' column."
        )

    df["timestamp"] = pd.to_datetime(
        df["timestamp"],
        errors="coerce"
    )

    df = df.dropna(subset=["timestamp"])

    if "Station" not in df.columns:
        raise ValueError(
            "AQ data must contain a 'Station' column."
        )

    df = df.sort_values(
        ["Station", "timestamp"]
    ).reset_index(drop=True)

    print(
        f"AQ rows: {len(df):,}"
    )

    print(
        f"Stations: {df['Station'].nunique()}"
    )

    latest_time = df["timestamp"].max()

    print(
        f"Latest AQ timestamp: {latest_time}"
    )

    return df


# ============================================================
# LOAD WEATHER FORECAST
# ============================================================

def load_weather():

    if not WEATHER_FILE.exists():
        raise FileNotFoundError(
            f"Weather forecast file not found:\n{WEATHER_FILE}"
        )

    weather = pd.read_csv(WEATHER_FILE)

    if "time" in weather.columns:
        weather["timestamp"] = pd.to_datetime(
            weather["time"],
            errors="coerce"
        )
    elif "timestamp" in weather.columns:
        weather["timestamp"] = pd.to_datetime(
            weather["timestamp"],
            errors="coerce"
        )
    else:
        raise ValueError(
            "Weather file must contain 'time' or 'timestamp'."
        )

    weather = weather.dropna(
        subset=["timestamp"]
    )

    weather = weather.sort_values(
        "timestamp"
    ).reset_index(drop=True)

    print(
        f"Weather forecast rows: {len(weather)}"
    )

    print(
        f"Forecast starts: {weather['timestamp'].min()}"
    )

    print(
        f"Forecast ends: {weather['timestamp'].max()}"
    )

    return weather


# ============================================================
# WEATHER COLUMN NORMALIZATION
# ============================================================

def get_value(row, column, default=np.nan):

    if column in row.index:
        value = row[column]

        if pd.notna(value):
            try:
                return float(value)
            except:
                return default

    return default


# ============================================================
# CREATE MODEL FEATURES
# ============================================================

def build_features(
    history,
    weather_row,
    station
):

    features = {}

    # --------------------------------------------------------
    # HISTORY
    # --------------------------------------------------------

    station_history = history[
        history["Station"] == station
    ].sort_values("timestamp")

    # Need historical observations
    if len(station_history) == 0:
        raise ValueError(
            f"No AQ history available for station: {station}"
        )

    # --------------------------------------------------------
    # LATEST VALUES
    # --------------------------------------------------------

    last = station_history.iloc[-1]

    # --------------------------------------------------------
    # POLLUTANT LATEST VALUES
    # --------------------------------------------------------

    for pollutant in POLLUTANTS:

        if pollutant in station_history.columns:

            series = pd.to_numeric(
                station_history[pollutant],
                errors="coerce"
            ).dropna()

            if len(series) > 0:

                # --------------------------------------------
                # Existing lags
                # --------------------------------------------

                for lag in [1, 3, 6, 12, 24]:

                    feature_name = (
                        f"{pollutant}_lag{lag}h"
                    )

                    if len(series) >= lag:

                        features[feature_name] = (
                            series.iloc[-lag]
                        )

                # --------------------------------------------
                # Extra lags
                # --------------------------------------------

                for lag in [2, 4, 8, 18, 48, 72]:

                    feature_name = (
                        f"{pollutant}_extra_lag{lag}h"
                    )

                    if len(series) >= lag:

                        features[feature_name] = (
                            series.iloc[-lag]
                        )

                # --------------------------------------------
                # Rolling features
                #
                # Training:
                # shift(1).rolling(window)
                #
                # During prediction, history ends at t-1,
                # therefore the last `window` historical
                # values represent the same information.
                # --------------------------------------------

                for window in [3, 6, 12, 24, 48]:

                    if len(series) >= window:

                        rolling_values = (
                            series.iloc[-window:]
                        )

                        features[
                            f"{pollutant}_roll{window}_mean"
                        ] = rolling_values.mean()

                        features[
                            f"{pollutant}_roll{window}_std"
                        ] = rolling_values.std()

                        features[
                            f"{pollutant}_roll{window}_min"
                        ] = rolling_values.min()

                        features[
                            f"{pollutant}_roll{window}_max"
                        ] = rolling_values.max()

                # --------------------------------------------
                # Pollution changes
                # --------------------------------------------

                if len(series) >= 2:

                    features[
                        f"{pollutant}_change1h"
                    ] = (
                        series.iloc[-1]
                        -
                        series.iloc[-2]
                    )

                if len(series) >= 4:

                    features[
                        f"{pollutant}_change3h"
                    ] = (
                        series.iloc[-1]
                        -
                        series.iloc[-4]
                    )

                # --------------------------------------------
                # Base pollutant feature
                # --------------------------------------------

                features[pollutant] = series.iloc[-1]

    # --------------------------------------------------------
    # WEATHER
    # --------------------------------------------------------

    temperature = get_value(
        weather_row,
        "temperature_2m"
    )

    humidity = get_value(
        weather_row,
        "relative_humidity_2m"
    )

    wind_speed = get_value(
        weather_row,
        "wind_speed_10m"
    )

    wind_direction = get_value(
        weather_row,
        "wind_direction_10m"
    )

    pressure = get_value(
        weather_row,
        "pressure_msl"
    )

    precipitation = get_value(
        weather_row,
        "precipitation"
    )

    rain = get_value(
        weather_row,
        "rain"
    )

    pbl = get_value(
        weather_row,
        "boundary_layer_height"
    )

    dew_point = get_value(
        weather_row,
        "dew_point_2m"
    )

    cloud_cover = get_value(
        weather_row,
        "cloud_cover"
    )

    # --------------------------------------------------------
    # Basic weather features
    # --------------------------------------------------------

    features["temperature_2m"] = temperature

    features["relative_humidity_2m"] = humidity

    features["wind_speed_10m"] = wind_speed

    features["pressure_msl"] = pressure

    features["precipitation"] = precipitation

    features["rain"] = rain

    features["boundary_layer_height"] = pbl

    features["dew_point_2m"] = dew_point

    features["cloud_cover"] = cloud_cover

    # --------------------------------------------------------
    # Wind components
    # --------------------------------------------------------

    if pd.notna(wind_direction) and pd.notna(wind_speed):

        direction_rad = np.deg2rad(
            wind_direction
        )

        features["wind_u"] = (
            wind_speed *
            np.sin(direction_rad)
        )

        features["wind_v"] = (
            wind_speed *
            np.cos(direction_rad)
        )

        features["wind_dir_sin"] = np.sin(
            direction_rad
        )

        features["wind_dir_cos"] = np.cos(
            direction_rad
        )

    # --------------------------------------------------------
    # Dew point depression
    # --------------------------------------------------------

    if (
        pd.notna(temperature)
        and pd.notna(dew_point)
    ):

        features["dew_point_depression"] = (
            temperature - dew_point
        )

    # --------------------------------------------------------
    # Weather changes
    #
    # For a live prediction, compare the future forecast
    # value with the latest available historical weather
    # when possible.
    # --------------------------------------------------------

    weather_history_columns = [
        "temperature_2m",
        "relative_humidity_2m",
        "wind_speed_10m",
        "pressure_msl",
        "boundary_layer_height",
    ]

    for column in weather_history_columns:

        change_name = (
            f"{column}_change1h"
        )

        if (
            column in history.columns
            and len(history) >= 1
        ):

            previous = pd.to_numeric(
                history[column],
                errors="coerce"
            ).dropna()

            if len(previous) > 0:

                current_weather = get_value(
                    weather_row,
                    column
                )

                if pd.notna(current_weather):

                    features[change_name] = (
                        current_weather
                        -
                        previous.iloc[-1]
                    )

    # --------------------------------------------------------
    # TIME FEATURES
    # --------------------------------------------------------

    timestamp = pd.Timestamp(
        weather_row["timestamp"]
    )

    hour = timestamp.hour

    dow = timestamp.dayofweek

    month = timestamp.month

    features["hour_sin"] = np.sin(
        2 * np.pi * hour / 24
    )

    features["hour_cos"] = np.cos(
        2 * np.pi * hour / 24
    )

    features["dow_sin"] = np.sin(
        2 * np.pi * dow / 7
    )

    features["dow_cos"] = np.cos(
        2 * np.pi * dow / 7
    )

    features["dow"] = dow

    features["month"] = month

    # --------------------------------------------------------
    # Station one-hot feature
    # --------------------------------------------------------

    features[f"station_{station}"] = 1

    return features


# ============================================================
# PREPARE MODEL INPUT
# ============================================================

def prepare_model_input(
    features,
    feature_names,
    pollutant,
    training_medians
):

    # Create one row and exactly match training columns.
    X = pd.DataFrame(
        [features]
    ).reindex(
        columns=feature_names
    )

    # Numeric conversion
    X = X.apply(
        pd.to_numeric,
        errors="coerce"
    )

    # --------------------------------------------------------
    # Station features
    #
    # Unknown/missing station dummy columns should be 0.
    # --------------------------------------------------------

    station_columns = [
        column
        for column in feature_names
        if column.startswith("station_")
    ]

    if station_columns:

        X[station_columns] = (
            X[station_columns].fillna(0)
        )

    # --------------------------------------------------------
    # TRAINING MEDIANS
    #
    # Use the exact medians calculated during training.
    # --------------------------------------------------------

    pollutant_medians = training_medians.get(
        pollutant,
        {}
    )

    for column in feature_names:

        if column in station_columns:
            continue

        if pd.isna(X.iloc[0][column]):

            median_value = pollutant_medians.get(
                column
            )

            if median_value is not None:

                X.loc[
                    X.index[0],
                    column
                ] = median_value

    return X


# ============================================================
# PREDICT ONE POLLUTANT
# ============================================================

def predict_pollutant(
    model,
    feature_names,
    features,
    pollutant,
    training_medians
):

    X = prepare_model_input(
        features,
        feature_names,
        pollutant,
        training_medians
    )

    prediction = model.predict(X)[0]

    # Pollution concentration cannot be negative.
    prediction = max(
        0.0,
        float(prediction)
    )

    return prediction


# ============================================================
# MAIN FORECAST
# ============================================================

def main():

    print("\n" + "=" * 70)
    print("VAYUSENSE - 72 HOUR AIR QUALITY FORECAST")
    print("=" * 70)

    # --------------------------------------------------------
    # Load
    # --------------------------------------------------------

    aq = load_aq_data()

    weather = load_weather()

    models = load_models()

    training_medians = load_training_medians()

    # --------------------------------------------------------
    # Validate weather
    # --------------------------------------------------------

    if len(weather) == 0:

        raise ValueError(
            "No future weather data available."
        )

    # --------------------------------------------------------
    # Limit to 72 forecast hours
    # --------------------------------------------------------

    weather = weather.sort_values(
        "timestamp"
    ).head(72).copy()

    # --------------------------------------------------------
    # Stations
    # --------------------------------------------------------

    stations = sorted(
        aq["Station"]
        .dropna()
        .unique()
    )

    print(
        f"\nForecast stations: {len(stations)}"
    )

    print(
        f"Forecast hours: {len(weather)}"
    )

    print(
        f"Expected predictions: "
        f"{len(stations) * len(weather):,}"
    )

    # --------------------------------------------------------
    # Model feature names
    # --------------------------------------------------------

    model_feature_names = {}

    for pollutant, model in models.items():

        if hasattr(model, "feature_names_in_"):

            model_feature_names[pollutant] = list(
                model.feature_names_in_
            )

        else:

            raise ValueError(
                f"{pollutant} model does not contain "
                "feature_names_in_."
            )

        print(
            f"{pollutant}: "
            f"{len(model_feature_names[pollutant])} features"
        )

    # --------------------------------------------------------
    # Recursive forecasting
    #
    # IMPORTANT:
    # After predicting an hour, append the prediction to
    # station history so the next hour can use the predicted
    # pollution value as a lag.
    # --------------------------------------------------------

    results = []

    working_history = aq.copy()

    for hour_index, weather_row in weather.iterrows():

        forecast_time = pd.Timestamp(
            weather_row["timestamp"]
        )

        print(
            f"\rForecasting "
            f"{forecast_time} "
            f"({hour_index + 1}/{len(weather)})",
            end=""
        )

        for station in stations:

            station_features = build_features(
                working_history,
                weather_row,
                station
            )

            prediction_row = {
                "Station": station,
                "timestamp": forecast_time,
            }

            predictions = {}

            # ------------------------------------------------
            # Predict each pollutant
            # ------------------------------------------------

            for pollutant in POLLUTANTS:

                prediction = predict_pollutant(
                    models[pollutant],
                    model_feature_names[pollutant],
                    station_features,
                    pollutant,
                    training_medians
                )

                predictions[pollutant] = prediction

                prediction_row[pollutant] = prediction

            results.append(
                prediction_row
            )

            # ------------------------------------------------
            # Append predictions to working history
            #
            # This enables recursive 72-hour forecasting.
            # ------------------------------------------------

            new_history = {
                "Station": station,
                "timestamp": forecast_time,
            }

            for pollutant in POLLUTANTS:

                new_history[pollutant] = (
                    predictions[pollutant]
                )

            # Add weather values too
            for column in [
                "temperature_2m",
                "relative_humidity_2m",
                "wind_speed_10m",
                "wind_direction_10m",
                "pressure_msl",
                "precipitation",
                "rain",
                "boundary_layer_height",
                "dew_point_2m",
                "cloud_cover",
            ]:

                new_history[column] = get_value(
                    weather_row,
                    column
                )

            working_history = pd.concat(
                [
                    working_history,
                    pd.DataFrame([new_history])
                ],
                ignore_index=True
            )

    print("\n")

    # --------------------------------------------------------
    # Create output
    # --------------------------------------------------------

    forecast = pd.DataFrame(
        results
    )

    forecast = forecast.sort_values(
        ["Station", "timestamp"]
    ).reset_index(drop=True)

    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    forecast.to_csv(
        OUTPUT_FILE,
        index=False
    )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print("=" * 70)
    print("FORECAST COMPLETE")
    print("=" * 70)

    print(
        f"Rows generated: {len(forecast):,}"
    )

    print(
        f"Stations: {forecast['Station'].nunique()}"
    )

    print(
        f"Hours: {forecast['timestamp'].nunique()}"
    )

    print(
        f"Forecast start: "
        f"{forecast['timestamp'].min()}"
    )

    print(
        f"Forecast end: "
        f"{forecast['timestamp'].max()}"
    )

    print("\nPrediction statistics:")

    for pollutant in POLLUTANTS:

        print(
            f"\n{pollutant}"
        )

        print(
            f"  Min : "
            f"{forecast[pollutant].min():.2f}"
        )

        print(
            f"  Max : "
            f"{forecast[pollutant].max():.2f}"
        )

        print(
            f"  Mean: "
            f"{forecast[pollutant].mean():.2f}"
        )

    print(
        f"\nSaved forecast to:"
    )

    print(
        OUTPUT_FILE
    )

    # --------------------------------------------------------
    # Sample
    # --------------------------------------------------------

    print("\nSample forecast:")

    print(
        forecast.head(10).to_string(
            index=False
        )
    )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    main()
