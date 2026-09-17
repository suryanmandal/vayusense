# VayuSense ML — Air Quality Forecasting

## Objective
Build an hourly air-quality forecasting baseline for Delhi NCR using historical air-quality observations and hourly meteorological variables, with a path toward 72-hour forecasting.

## Current model
- Algorithm: XGBoost Regressor
- Target: next-hour PM2.5
- Split: chronological 80/20
- Input: previous pollution values + weather + time features + station
- Prototype test MAE: 11.63
- Prototype test RMSE: 17.91
- Persistence baseline MAE: 12.53
- Persistence baseline RMSE: 20.47

These metrics are prototype results. The current weather file is one representative Delhi location and is attached to all stations; final NCR modeling should use station/grid-matched weather.

## Data
- `data/Final_dataset_cleaned.xlsx`: cleaned hourly AQ dataset supplied for the project.
- `data/weather_hourly_open_meteo.csv`: hourly Open-Meteo weather/reanalysis data.
- `data/vayusense_hourly_training_table.csv`: engineered ML-ready hourly table.

## Folder structure
```
vayusense_ml_project/
├── data/
│   ├── Final_dataset_cleaned.xlsx
│   ├── weather_hourly_open_meteo.csv
│   └── vayusense_hourly_training_table.csv
├── models/
│   ├── xgb_pm25_next_hour.joblib
│   └── pm25_model_metadata.json
├── results/
│   ├── pm25_next_hour_metrics.csv
│   └── pm25_next_hour_predictions.csv
├── src/
│   ├── prepare_dataset.py
│   ├── train_pm25.py
│   └── predict_72h.py
├── requirements.txt
└── README.md
```

## Setup
```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
```

## Train
```bash
python src/train_pm25.py
```

## 72-hour forecasting
`src/predict_72h.py` contains the recursive forecasting structure. It expects a CSV containing the latest hourly station observations and future hourly weather forecast values. For each future hour, the previous predicted PM2.5 becomes a lagged input.

## Important modeling rule
Do not randomly shuffle time-series data. Train on earlier timestamps and test on later timestamps.

## VayuSense roadmap
1. Validate AQ data quality and station registry.
2. Use station/grid-matched weather.
3. Train separate models for PM2.5, PM10, NO2 and O3.
4. Add future weather forecasts.
5. Build and validate 72-hour multi-step forecasts.
6. Calculate AQI and category agreement.
7. Add spatial NCR maps.
8. Use WRF-Chem/physics-based coupling where available; ML should be described as baseline/post-processing rather than a replacement for atmospheric coupling.
