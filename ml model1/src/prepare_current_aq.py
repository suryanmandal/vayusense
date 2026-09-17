import pandas as pd
import numpy as np
from pathlib import Path

INPUT_FILE = Path("data/All_Air_Quality_Data_Merged_Single_Sheet.xlsx")
OUTPUT_FILE = Path("data/current_aq_hourly.csv")

TARGETS = ["PM2.5", "PM10", "NO2", "OZONE"]


def is_header(row):
    values = set(str(x).strip() for x in row if pd.notna(x))
    return (
        "From Date" in values
        and "To Date" in values
        and "PM2.5" in values
    )


print("Reading CPCB file...")

raw = pd.read_excel(
    INPUT_FILE,
    sheet_name="Merged Data",
    header=None
)

print("Rows:", len(raw))


# ---------------------------------------------------------
# Find repeated header rows
# ---------------------------------------------------------

header_rows = []

for i in range(len(raw)):
    if is_header(raw.iloc[i]):
        header_rows.append(i)

print("Header blocks found:", len(header_rows))


records = []


# ---------------------------------------------------------
# Parse each station/report block
# ---------------------------------------------------------

for block_index, header_row in enumerate(header_rows):

    if block_index + 1 < len(header_rows):
        end_row = header_rows[block_index + 1]
    else:
        end_row = len(raw)

    header_values = raw.iloc[header_row].tolist()

    # Find station name above header
    station = None

    for r in range(header_row - 1, max(-1, header_row - 10), -1):

        vals = [
            str(x).strip()
            for x in raw.iloc[r].tolist()
            if pd.notna(x)
        ]

        if not vals:
            continue

        text = " ".join(vals)

        if (
            "From Date" not in text
            and "AvgPeriod" not in text
            and len(text) > 3
        ):
            station = vals[0]
            break

    if station is None:
        station = f"UNKNOWN_STATION_{block_index}"

    # Create dataframe
    block = raw.iloc[
        header_row + 1:end_row
    ].copy()

    block.columns = header_values

    # Remove completely empty rows
    block = block.dropna(how="all")

    # Required columns
    required = [
        "From Date",
        "PM2.5",
        "PM10",
        "NO2",
        "OZONE"
    ]

    missing = [
        c for c in required
        if c not in block.columns
    ]

    if missing:
        print(
            f"Skipping block {block_index}: "
            f"missing {missing}"
        )
        continue

    # Keep only useful columns
    keep = [
        "From Date",
        "PM2.5",
        "PM10",
        "NO2",
        "OZONE"
    ]

    block = block[keep].copy()

    block["Station"] = station

    records.append(block)


# ---------------------------------------------------------
# Combine
# ---------------------------------------------------------

df = pd.concat(
    records,
    ignore_index=True
)

print("Raw parsed observations:", len(df))


# ---------------------------------------------------------
# Parse timestamps
# ---------------------------------------------------------

df["From Date"] = pd.to_datetime(
    df["From Date"],
    errors="coerce"
)

df = df.dropna(
    subset=["From Date"]
)


# ---------------------------------------------------------
# Convert pollutants to numeric
# ---------------------------------------------------------

for col in TARGETS:

    df[col] = pd.to_numeric(
        df[col],
        errors="coerce"
    )


# ---------------------------------------------------------
# Remove invalid pollutant rows
# ---------------------------------------------------------

df = df.dropna(
    subset=TARGETS,
    how="all"
)


# ---------------------------------------------------------
# Remove duplicate station/timestamp records
# ---------------------------------------------------------

df = (
    df.sort_values(
        ["Station", "From Date"]
    )
    .drop_duplicates(
        subset=["Station", "From Date"],
        keep="first"
    )
)


# ---------------------------------------------------------
# Create hourly timestamp
# ---------------------------------------------------------

df["timestamp"] = (
    df["From Date"]
    .dt.floor("h")
)


# ---------------------------------------------------------
# Count 15-minute records per hour
# ---------------------------------------------------------

counts = (
    df.groupby(
        ["Station", "timestamp"]
    )
    .size()
    .reset_index(
        name="record_count"
    )
)


df = df.merge(
    counts,
    on=["Station", "timestamp"],
    how="left"
)


# ---------------------------------------------------------
# IMPORTANT:
# Only retain complete 4 × 15-minute hours
# ---------------------------------------------------------

df = df[
    df["record_count"] == 4
].copy()


print(
    "Complete hourly periods:",
    len(df)
)


# ---------------------------------------------------------
# Aggregate 15-minute → hourly mean
# ---------------------------------------------------------

hourly = (
    df.groupby(
        ["Station", "timestamp"],
        as_index=False
    )[TARGETS]
    .mean()
)


# ---------------------------------------------------------
# Sort
# ---------------------------------------------------------

hourly = hourly.sort_values(
    ["Station", "timestamp"]
).reset_index(drop=True)


# ---------------------------------------------------------
# Save
# ---------------------------------------------------------

OUTPUT_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)

hourly.to_csv(
    OUTPUT_FILE,
    index=False
)


# ---------------------------------------------------------
# Summary
# ---------------------------------------------------------

print()
print("======================================")
print("CURRENT AQ PREPARATION COMPLETE")
print("======================================")

print(
    "Stations:",
    hourly["Station"].nunique()
)

print(
    "Hourly rows:",
    len(hourly)
)

print(
    "Start:",
    hourly["timestamp"].min()
)

print(
    "End:",
    hourly["timestamp"].max()
)

print()
print("Saved:")
print(OUTPUT_FILE)