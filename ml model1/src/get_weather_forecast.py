import requests
import pandas as pd
from pathlib import Path

# =========================================================
# VayuSense - Future Weather Forecast
# =========================================================

LATITUDE = 28.646748
LONGITUDE = 77.2748

AQ_FILE = Path("data/current_aq_hourly.csv")
OUTPUT_FILE = Path("data/weather_forecast_72h.csv")

URL = "https://api.open-meteo.com/v1/forecast"


# =========================================================
# Find latest AQ timestamp
# =========================================================

aq = pd.read_csv(AQ_FILE)

aq["timestamp"] = pd.to_datetime(
    aq["timestamp"]
)

latest_aq = aq["timestamp"].max()

print("=" * 60)
print("VAYUSENSE - WEATHER FORECAST")
print("=" * 60)

print()
print("Latest AQ timestamp:")
print(latest_aq)


# =========================================================
# Request 96 hours
# =========================================================

params = {
    "latitude": LATITUDE,
    "longitude": LONGITUDE,

    "hourly": ",".join([
        "temperature_2m",
        "relative_humidity_2m",
        "wind_speed_10m",
        "wind_direction_10m",
        "boundary_layer_height",
        "precipitation",
        "rain",
        "dew_point_2m",
        "cloud_cover",
        "pressure_msl"
    ]),

    "forecast_hours": 96,

    "timezone": "Asia/Kolkata"
}


print()
print("Requesting weather forecast...")


try:

    response = requests.get(
        URL,
        params=params,
        timeout=30
    )

    response.raise_for_status()

    data = response.json()

except requests.exceptions.RequestException as e:

    print()
    print("ERROR downloading weather:")
    print(e)

    raise SystemExit(1)


# =========================================================
# Convert to DataFrame
# =========================================================

weather = pd.DataFrame(
    data["hourly"]
)

weather["timestamp"] = pd.to_datetime(
    weather["time"]
)

weather.drop(
    columns=["time"],
    inplace=True
)


# =========================================================
# Select weather AFTER latest AQ
# =========================================================

weather = weather[
    weather["timestamp"] > latest_aq
].copy()


# Sort
weather = weather.sort_values(
    "timestamp"
)


# Take exactly next 72 hours
weather = weather.head(72)


# =========================================================
# Check availability
# =========================================================

if len(weather) < 72:

    print()
    print("ERROR:")
    print(
        f"Only {len(weather)} future weather hours available."
    )

    print(
        "Latest AQ:",
        latest_aq
    )

    print(
        "Weather ends:",
        weather["timestamp"].max()
    )

    raise SystemExit(1)


# =========================================================
# Select columns
# =========================================================

columns = [
    "timestamp",
    "temperature_2m",
    "relative_humidity_2m",
    "wind_speed_10m",
    "wind_direction_10m",
    "boundary_layer_height",
    "precipitation",
    "rain",
    "dew_point_2m",
    "cloud_cover",
    "pressure_msl"
]

weather = weather[columns]


# =========================================================
# Save
# =========================================================

OUTPUT_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)

weather.to_csv(
    OUTPUT_FILE,
    index=False
)


# =========================================================
# Display
# =========================================================

print()
print("=" * 60)
print("WEATHER FORECAST READY")
print("=" * 60)

print()
print("Latest AQ:")
print(latest_aq)

print()
print("Forecast starts:")
print(weather["timestamp"].min())

print()
print("Forecast ends:")
print(weather["timestamp"].max())

print()
print("Weather rows:")
print(len(weather))

print()
print("Saved:")
print(OUTPUT_FILE)

print()
print("=" * 60)