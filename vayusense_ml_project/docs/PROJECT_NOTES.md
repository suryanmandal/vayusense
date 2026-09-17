# Project notes

## Current status
- Hourly AQ dataset prepared.
- Hourly weather dataset included.
- Next-hour PM2.5 XGBoost baseline trained.
- 72-hour recursive prediction code skeleton included.

## What remains
1. Train PM10, NO2 and O3 models.
2. Obtain future weather forecast inputs.
3. Improve weather spatial matching across NCR.
4. Validate 72-hour forecasts.
5. Calculate AQI and category agreement.
6. Add spatial/grid forecasting and, where available, physics-based coupling/WRF-Chem components.

## Avoid
- Random train/test splitting for time-series forecasting.
- Filling missing pollutant measurements with zero without evidence.
- Claiming the current one-location weather setup is a final spatial NCR model.
- Claiming XGBoost alone is two-way atmospheric coupling.
