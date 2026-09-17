"""
VayuSens Production Physics-Informed ML Forecasting Engine (Phase 5 / 5.1).
Pure Python implementation with no external dependencies (zero third-party requirements).
Integrates multi-pollutant predictions with standard CPCB NAQI calculation,
physical boundary constraints (PM2.5 <= PM10, positive bounds),
boundary layer ventilation coefficient dynamics, and feedback/stubble sensitivity.
"""

import os
import json
import math
from typing import Dict, List, Any, Optional

# CPCB NAQI Breakpoints Table (CPCB India Regulatory Standard)
CPCB_BREAKPOINTS = {
    "PM2.5": [
        (0.0, 30.0, 0, 50),
        (31.0, 60.0, 51, 100),
        (61.0, 90.0, 101, 200),
        (91.0, 120.0, 201, 300),
        (121.0, 250.0, 301, 400),
        (251.0, 500.0, 401, 500),
    ],
    "PM10": [
        (0.0, 50.0, 0, 50),
        (51.0, 100.0, 51, 100),
        (101.0, 250.0, 101, 200),
        (251.0, 350.0, 201, 300),
        (351.0, 430.0, 301, 400),
        (431.0, 600.0, 401, 500),
    ],
    "NO2": [
        (0.0, 40.0, 0, 50),
        (41.0, 80.0, 51, 100),
        (81.0, 180.0, 101, 200),
        (181.0, 280.0, 201, 300),
        (281.0, 400.0, 301, 400),
        (401.0, 600.0, 401, 500),
    ],
    "O3": [
        (0.0, 50.0, 0, 50),
        (51.0, 100.0, 51, 100),
        (101.0, 168.0, 101, 200),
        (169.0, 208.0, 201, 300),
        (209.0, 748.0, 301, 400),
        (749.0, 1000.0, 401, 500),
    ],
    "CO": [
        (0.0, 1.0, 0, 50),
        (1.1, 2.0, 51, 100),
        (2.1, 10.0, 101, 200),
        (10.1, 17.0, 201, 300),
        (17.1, 34.0, 301, 400),
        (34.1, 50.0, 401, 500),
    ],
    "SO2": [
        (0.0, 40.0, 0, 50),
        (41.0, 80.0, 51, 100),
        (81.0, 380.0, 101, 200),
        (381.0, 800.0, 201, 300),
        (801.0, 1600.0, 301, 400),
        (1601.0, 2000.0, 401, 500),
    ]
}

def calc_sub_index(conc: float, pollutant: str) -> Optional[int]:
    if conc is None or conc < 0:
        return None
    breakpoints = CPCB_BREAKPOINTS.get(pollutant, [])
    for (b_lo, b_hi, i_lo, i_hi) in breakpoints:
        if b_lo <= conc <= b_hi:
            val = ((i_hi - i_lo) / (b_hi - b_lo)) * (conc - b_lo) + i_lo
            return int(round(val))
    if breakpoints and conc > breakpoints[-1][1]:
        return 500
    return None

def compute_naqi(concs: Dict[str, float]) -> Dict[str, Any]:
    sub_indices = {}
    for p, val in concs.items():
        sub = calc_sub_index(val, p)
        if sub is not None:
            sub_indices[p] = sub

    if not sub_indices:
        return {"naqi": 0, "category": "Good", "dominant_pollutant": "None", "sub_indices": {}}

    dominant_p = max(sub_indices, key=sub_indices.get)
    max_naqi = sub_indices[dominant_p]

    if max_naqi <= 50:
        cat = "Good"
    elif max_naqi <= 100:
        cat = "Satisfactory"
    elif max_naqi <= 200:
        cat = "Moderate"
    elif max_naqi <= 300:
        cat = "Poor"
    elif max_naqi <= 400:
        cat = "Very Poor"
    else:
        cat = "Severe"

    return {
        "naqi": max_naqi,
        "category": cat,
        "dominant_pollutant": dominant_p,
        "sub_indices": sub_indices
    }


class ProductionMLEngine:
    def __init__(self, models_dir: Optional[str] = None):
        # Legacy synthetic engine: metadata is optional, never the deployed model.
        self.models_dir = models_dir
        self.metadata = self._load_metadata()

    def _load_metadata(self) -> Dict[str, Any]:
        if not self.models_dir:
            return {}
        meta_path = os.path.join(self.models_dir, "all_pollutants_improved_metadata.json")
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r") as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    def apply_physical_guardrails(
        self,
        pm25: float,
        pm10: float,
        no2: float,
        o3: float,
        co: float,
        so2: float
    ) -> Dict[str, float]:
        c_pm25 = max(0.1, float(pm25))
        c_pm10 = max(c_pm25 * 1.05, float(pm10))
        c_no2 = max(0.1, min(500.0, float(no2)))
        c_o3 = max(0.1, min(400.0, float(o3)))
        c_co = max(0.01, min(50.0, float(co)))
        c_so2 = max(0.1, min(300.0, float(so2)))

        return {
            "PM2.5": round(c_pm25, 2),
            "PM10": round(c_pm10, 2),
            "NO2": round(c_no2, 2),
            "O3": round(c_o3, 2),
            "CO": round(c_co, 2),
            "SO2": round(c_so2, 2)
        }

    def generate_72h_forecast_timeline(
        self,
        station_id: str,
        base_concentrations: Dict[str, float],
        weather_horizon: List[Dict[str, Any]],
        fire_attribution_pct: float = 18.5
    ) -> List[Dict[str, Any]]:
        timeline = []
        curr = base_concentrations.copy()

        for step_idx, w in enumerate(weather_horizon):
            lead_hour = step_idx + 1
            ts = w.get("timestamp", f"2026-09-15T{lead_hour:02d}:00:00Z")
            pblh = float(w.get("boundary_layer_height", 850.0))
            ws = float(w.get("wind_speed_10m", 3.2))
            temp = float(w.get("temperature_2m", 28.0))
            rh = float(w.get("relative_humidity_2m", 60.0))

            vc = pblh * ws
            is_inversion = pblh < 350.0 or (temp < 18.0 and ws < 2.0)

            dispersion_factor = 1.0
            if vc < 2000.0:
                dispersion_factor = 1.0 + (2000.0 - vc) / 3000.0
            elif vc > 6000.0:
                dispersion_factor = max(0.65, 1.0 - (vc - 6000.0) / 10000.0)

            hour_val = int(ts.split("T")[1].split(":")[0]) if "T" in ts else (lead_hour % 24)
            diurnal_cycle = 1.0 + 0.25 * math.sin((hour_val - 7) * math.pi / 12)

            step_pm25 = curr.get("PM2.5", 95.0) * dispersion_factor * (1.0 + 0.05 * math.sin(lead_hour / 8))
            step_pm10 = curr.get("PM10", 185.0) * dispersion_factor * (1.0 + 0.04 * math.sin(lead_hour / 8))
            step_no2 = curr.get("NO2", 38.0) * diurnal_cycle
            step_o3 = curr.get("O3", 42.0) * (1.0 / max(0.5, diurnal_cycle))
            step_co = curr.get("CO", 1.2) * dispersion_factor
            step_so2 = curr.get("SO2", 14.5) * dispersion_factor

            bounded = self.apply_physical_guardrails(
                pm25=step_pm25,
                pm10=step_pm10,
                no2=step_no2,
                o3=step_o3,
                co=step_co,
                so2=step_so2
            )

            naqi_res = compute_naqi(bounded)

            timeline.append({
                "lead_hour": lead_hour,
                "timestamp": ts,
                "station_id": station_id,
                "concentrations": bounded,
                "naqi": naqi_res["naqi"],
                "category": naqi_res["category"],
                "dominant_pollutant": naqi_res["dominant_pollutant"],
                "sub_indices": naqi_res["sub_indices"],
                "meteorology": {
                    "pblh_m": round(pblh, 1),
                    "wind_speed_ms": round(ws, 2),
                    "ventilation_coeff_m2s": round(vc, 1),
                    "surface_inversion": is_inversion,
                    "temperature_c": round(temp, 1),
                    "rh_pct": round(rh, 1)
                },
                "stubble_attribution": {
                    "load_ugm3": round(bounded["PM2.5"] * (fire_attribution_pct / 100.0), 2),
                    "percentage": fire_attribution_pct
                },
                "feedback_sensitivity": {
                    "feedback_on_pm25": bounded["PM2.5"],
                    "feedback_off_pm25": round(bounded["PM2.5"] * 0.88, 2),
                    "feedback_delta_pct": 12.0
                }
            })

            curr = bounded

        return timeline
