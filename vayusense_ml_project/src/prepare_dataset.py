"""
Prepare VayuSense hourly AQ + weather dataset.

The supplied AQ workbook has metadata rows followed by hourly station observations.
The weather CSV has Open-Meteo metadata lines followed by an hourly table.
"""

import numpy as np
import pandas as pd

AQ_FILE = "data/Final_dataset_cleaned.xlsx"
WEATHER_FILE = "data/weather_hourly_open_meteo.csv"
OUTPUT = "data/vayusense_hourly_training_table.csv"

# AQ
raw = pd.read_excel(AQ_FILE, sheet_name=0, header=None)
aq = raw.iloc[2:, :11].copy()
aq.columns = ["Station","From Date","To Date","PM2.5","PM10","NO","NO2","NH3","SO2","CO","OZONE"]

aq["From Date"] = pd.to_datetime(aq["From Date"], errors="coerce", dayfirst=True)
aq = aq.dropna(subset=["Station","From Date"]).copy()

for c in aq.columns[3:]:
    aq[c] = pd.to_numeric(aq[c], errors="coerce")

aq["Station"] = aq["Station"].astype(str).str.strip()

# Exclude known non-NCR station if present.
aq = aq[~aq["Station"].str.lower().str.contains("lalbagh", na=False)]

aq["timestamp"] = aq["From Date"].dt.floor("h")

hourly = (
    aq.groupby(["Station","timestamp"], as_index=False)
      [["PM2.5","PM10","NO2","OZONE"]]
      .mean()
)

# Weather: first 3 lines are metadata/blank; line 4 is the header.
weather = pd.read_csv(WEATHER_FILE, skiprows=3)
weather["timestamp"] = pd.to_datetime(weather["time"], errors="coerce")
weather = weather.dropna(subset=["timestamp"]).copy()

weather_cols = [c for c in weather.columns if c not in ["time","timestamp"]]
weather = weather[["timestamp"] + weather_cols].drop_duplicates("timestamp")

df = hourly.merge(weather, on="timestamp", how="left")
df = df.sort_values(["Station","timestamp"]).reset_index(drop=True)
df = df.rename(columns={"PM2.5":"PM25", "OZONE":"O3"})

# Pollution lags
for col in ["PM25","PM10","NO2","O3"]:
    for lag in [1,3,6,12,24]:
        df[f"{col}_lag{lag}h"] = df.groupby("Station")[col].shift(lag)

# Rolling averages must use only information available before prediction time.
for window in [3,6,24]:
    df[f"PM25_roll{window}h"] = (
        df.groupby("Station")["PM25"]
          .transform(lambda s: s.shift(1).rolling(window, min_periods=window).mean())
    )

# Wind is circular.
rad = np.deg2rad(df["wind_direction_10m (°)"])
df["wind_dir_sin"] = np.sin(rad)
df["wind_dir_cos"] = np.cos(rad)

# Time features.
df["hour_sin"] = np.sin(2*np.pi*df["timestamp"].dt.hour/24)
df["hour_cos"] = np.cos(2*np.pi*df["timestamp"].dt.hour/24)
df["dow"] = df["timestamp"].dt.dayofweek
df["month"] = df["timestamp"].dt.month

# Next-hour target.
df["PM25_next_1h"] = df.groupby("Station")["PM25"].shift(-1)

df.to_csv(OUTPUT, index=False)
print(f"Saved {OUTPUT} with {len(df):,} rows.")
