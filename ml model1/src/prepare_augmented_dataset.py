import os
import numpy as np
import pandas as pd

INPUT = "data/vayusense_aq_combined_with_weather_2023_2026.csv"
OUTPUT = "data/vayusense_hourly_training_table_augmented.csv"

df = pd.read_csv(INPUT)
df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
df = df.dropna(subset=["Station","timestamp"]).sort_values(["Station","timestamp"]).copy()

numeric = ["PM2.5","PM10","NO","NO2","NH3","SO2","CO","OZONE",
           "temperature_2m","relative_humidity_2m","wind_speed_10m",
           "wind_direction_10m","boundary_layer_height","precipitation",
           "rain","dew_point_2m","cloud_cover","pressure_msl"]
for c in numeric:
    if c in df.columns:
        df[c] = pd.to_numeric(df[c], errors="coerce")

rad = np.deg2rad(df["wind_direction_10m"])
df["wind_dir_sin"] = np.sin(rad)
df["wind_dir_cos"] = np.cos(rad)

df["hour_sin"] = np.sin(2*np.pi*df["timestamp"].dt.hour/24)
df["hour_cos"] = np.cos(2*np.pi*df["timestamp"].dt.hour/24)
df["dow"] = df["timestamp"].dt.dayofweek
df["month"] = df["timestamp"].dt.month

for pollutant in ["PM2.5","PM10","NO2","OZONE"]:
    for lag in [1,3,6,12,24]:
        df[f"{pollutant}_lag_{lag}h"] = df.groupby("Station")[pollutant].shift(lag)

for window in [3,6,24]:
    df[f"PM2.5_rolling_{window}h"] = (
        df.groupby("Station")["PM2.5"]
          .transform(lambda s: s.shift(1).rolling(window, min_periods=1).mean())
    )

for pollutant in ["PM2.5","PM10","NO2","OZONE"]:
    df[f"{pollutant}_next_1h"] = df.groupby("Station")[pollutant].shift(-1)

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
df.to_csv(OUTPUT, index=False)
print(f"Saved {OUTPUT} with {len(df):,} rows.")
