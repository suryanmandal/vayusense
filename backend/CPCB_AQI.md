# CPCB National Air Quality Index (NAQI) & Forecast Evaluation Engine

Documentation for **Phase 5 / Workstream E (Forecast Products, AQI and Baselines)**.

## Overview

The CPCB AQI and evaluation engine (`backend/src/cpcb_aqi_engine.py` and `backend/src/forecast_evaluation.py`) implements:
1. The **official Indian National Air Quality Index (NAQI)** standard published by the Central Pollution Control Board (CPCB, MoEFCC).
2. Continuous 72-hour forecast evaluation baselines (Persistence baseline and Willmott Index of Agreement metrics).

## 1. CPCB Sub-Index Calculation Formula

For any pollutant concentration $C_p$, the sub-index $I_p$ is calculated using linear piecewise interpolation between breakpoints:
$$I_p = \left[ \frac{I_{\text{hi}} - I_{\text{lo}}}{B_{\text{hi}} - B_{\text{lo}}} \right] \times (C_p - B_{\text{lo}}) + I_{\text{lo}}$$

Where:
- $B_{\text{hi}}, B_{\text{lo}}$: Breakpoint concentration upper and lower boundaries.
- $I_{\text{hi}}, I_{\text{lo}}$: AQI sub-index category boundaries corresponding to $[B_{\text{lo}}, B_{\text{hi}}]$.

### CPCB Criteria Pollutants & Breakpoint Table

| Category | AQI Range | $\text{PM}_{2.5}$ ($24\text{h}$) | $\text{PM}_{10}$ ($24\text{h}$) | $\text{NO}_2$ ($24\text{h}$) | $\text{O}_3$ ($8\text{h}$) | $\text{CO}$ ($8\text{h}$, $\text{mg/m}^3$) | $\text{SO}_2$ ($24\text{h}$) | $\text{NH}_3$ ($24\text{h}$) |
|---|---|---|---|---|---|---|---|---|
| **Good** | $0 - 50$ | $0 - 30$ | $0 - 50$ | $0 - 40$ | $0 - 50$ | $0 - 1.0$ | $0 - 40$ | $0 - 200$ |
| **Satisfactory** | $51 - 100$ | $31 - 60$ | $51 - 100$ | $41 - 80$ | $51 - 100$ | $1.1 - 2.0$ | $41 - 80$ | $201 - 400$ |
| **Moderate** | $101 - 200$ | $61 - 90$ | $101 - 250$ | $81 - 180$ | $101 - 168$ | $2.1 - 10$ | $81 - 380$ | $401 - 800$ |
| **Poor** | $201 - 300$ | $91 - 120$ | $251 - 350$ | $181 - 280$ | $169 - 208$ | $10.1 - 17$ | $381 - 800$ | $801 - 1200$ |
| **Very Poor** | $301 - 400$ | $121 - 250$ | $351 - 430$ | $281 - 400$ | $209 - 748$ | $17.1 - 34$ | $801 - 1600$ | $1201 - 1800$ |
| **Severe** | $401 - 500$ | $251 - 500+$ | $431 - 600+$ | $401 - 800+$ | $749 - 1000+$ | $34.1 - 50+$ | $1601 - 2000+$ | $1801 - 2400+$ |

## 2. Regulatory Aggregation & Completeness Rules

1. **Particulate Requirement**: At least one particulate matter ($\text{PM}_{2.5}$ or $\text{PM}_{10}$) must be measured.
2. **Minimum Pollutant Rule**: At least **3 criteria pollutants** must be validly measured to declare an official composite AQI.
3. **Composite AQI**: $\text{AQI} = \max(I_{\text{PM2.5}}, I_{\text{PM10}}, I_{\text{NO2}}, I_{\text{O3}}, \dots)$.
4. **Dominant Pollutant**: The species corresponding to the maximum sub-index.

## 3. Forecast Evaluation Metrics

- **Root Mean Square Error (RMSE)**: $\sqrt{\frac{1}{N}\sum(y_i - \hat{y}_i)^2}$
- **Mean Absolute Error (MAE)**: $\frac{1}{N}\sum |y_i - \hat{y}_i|$
- **Mean Bias**: $\frac{1}{N}\sum (\hat{y}_i - y_i)$
- **Fractional Bias (FB)**: $\frac{2(\hat{y} - y)}{\hat{y} + y} \times 100\%$
- **Willmott Index of Agreement (IOA)**:
  $$d = 1 - \frac{\sum (y_i - \hat{y}_i)^2}{\sum \left( |\hat{y}_i - \bar{y}| + |y_i - \bar{y}| \right)^2}$$
- **Persistence Baseline Model**: $\hat{y}(t + k) = y(t)$ for $k = 1, \dots, 72\text{ hours}$.

## Test Execution

```bash
PYTHONPATH="backend/.venv/lib/python3.9/site-packages:backend" python3 -m unittest discover -s backend/tests -p 'test_cpcb_aqi.py'
```
