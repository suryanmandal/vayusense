# VayuSense Augmented ML Dataset

This package adds the uploaded CPCB 1-hour merged reports to the existing hourly AQ dataset.

## Coverage
- CPCB source: 2023-01-01 00:00:00 to 2023-08-01 23:00:00
- Existing cleaned AQ: 2025-08-01 00:00:00 to 2026-08-01 23:00:00
- Combined rows: 315,300
- Stations: 55
- CPCB rows retained: 182,712
- Existing rows retained: 132,588

## Important
The CPCB file contains station-level meteorological variables (AT, RH, WD, BP, RF) and 1-hour observations. Some reports/stations are duplicated, so exact station-hour duplicates were removed.

The two source periods are not continuous: CPCB data is from 2023, while the existing cleaned dataset starts in 2025. Do not describe this as continuous 2023-2026 coverage.

## Next commands
1. Replace/add the files in your project `data/` folder.
2. Run:
   `python src\prepare_augmented_dataset.py`
3. Retrain all four pollutant models using the augmented training table.
4. Compare augmented vs previous metrics.

## Weather integration
CPCB station-level weather is preferred where available. Open-Meteo Delhi-point hourly weather is used as a fallback for later AQ records. `weather_source` records which source supplied the weather. This is not equivalent to full station-specific NCR forecast weather.
