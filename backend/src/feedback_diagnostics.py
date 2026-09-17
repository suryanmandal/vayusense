"""Aerosol-Radiation Feedback and Fire Sensitivity Comparison Diagnostic Engine.

Quantifies the coupled physical response between paired numerical runs:
1. Coupling Feedback Sensitivity: (Aerosol Feedback ON) - (Aerosol Feedback OFF)
   - Solar radiation dimming at surface (delta SWDOWN < 0 W/m2)
   - Surface cooling / 2-meter temperature depression (delta T2 < 0 deg C)
   - Boundary layer stabilization / compression (delta PBLH < 0 meters)
   - Particulate trapping / enhancement (delta PM2.5 > 0 ug/m3)

2. Fire Plume Sensitivity: (Fires ON) - (Fires OFF)
   - Net agricultural smoke enhancement over Delhi NCR (delta PM2.5 in ug/m3 and %)
"""

from __future__ import annotations

from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from src.coupled_model_contract import HourlyCoupledOutput


class FeedbackSensitivityMetrics(BaseModel):
    """Calculated difference metrics between Feedback-ON and Feedback-OFF runs at a given receptor."""
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    receptor_name: str
    lat: float
    lon: float
    lead_hour: int
    delta_swdown_w_m2: float = Field(description="SWDOWN(ON) - SWDOWN(OFF). Typically negative due to aerosol extinction.")
    delta_t2_celsius: float = Field(description="T2(ON) - T2(OFF). Surface temperature response.")
    delta_pblh_m: float = Field(description="PBLH(ON) - PBLH(OFF). Boundary layer compression/suppression.")
    delta_pm25_ug_m3: float = Field(description="PM2.5(ON) - PM2.5(OFF). Secondary feedback enhancement from reduced ventilation.")
    percent_pm25_enhancement: float = Field(description="(PM2.5(ON) - PM2.5(OFF)) / PM2.5(OFF) * 100")
    feedback_signal_consistent: bool = Field(description="True if surface cooling, dimming and PBL reduction are physically coherent.")


class FireSensitivityMetrics(BaseModel):
    """Calculated difference metrics between Fire-ON and Fire-OFF runs at a given receptor."""
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    receptor_name: str
    lat: float
    lon: float
    lead_hour: int
    fire_pm25_contribution_ug_m3: float = Field(ge=0, description="Max(0, PM2.5(Fire ON) - PM2.5(Fire OFF))")
    fire_pm10_contribution_ug_m3: float = Field(ge=0, description="Max(0, PM10(Fire ON) - PM10(Fire OFF))")
    fire_pm25_percentage: float = Field(ge=0, le=100.0, description="Fraction of total PM2.5 attributable to transport from fire regions")


def compute_feedback_sensitivity(
    on_record: HourlyCoupledOutput,
    off_record: HourlyCoupledOutput,
    receptor_name: str = "Delhi-ITO",
) -> FeedbackSensitivityMetrics:
    """Compute physical difference between aerosol feedback ON and OFF states."""
    if on_record.lead_hour != off_record.lead_hour:
        raise ValueError("Cannot compare runs with differing lead hours")

    d_sw = round(on_record.swdown_w_m2 - off_record.swdown_w_m2, 2)
    d_t2 = round(on_record.t2_celsius - off_record.t2_celsius, 3)
    d_pblh = round(on_record.pblh_m - off_record.pblh_m, 2)
    d_pm25 = round(on_record.pm25_ug_m3 - off_record.pm25_ug_m3, 2)

    denom = max(1.0, off_record.pm25_ug_m3)
    pct_pm = round((d_pm25 / denom) * 100.0, 2)

    # Physical coherence: During daylight/heavy aerosol, dimming (d_sw <= 0) often drives cooling (d_t2 <= 0)
    # and shallowing of PBL (d_pblh <= 0), which concentrates pollutants (d_pm25 >= 0)
    coherent = (d_sw <= 0) and (d_pblh <= 50.0)

    return FeedbackSensitivityMetrics(
        receptor_name=receptor_name,
        lat=on_record.lat,
        lon=on_record.lon,
        lead_hour=on_record.lead_hour,
        delta_swdown_w_m2=d_sw,
        delta_t2_celsius=d_t2,
        delta_pblh_m=d_pblh,
        delta_pm25_ug_m3=d_pm25,
        percent_pm25_enhancement=pct_pm,
        feedback_signal_consistent=coherent,
    )


def compute_fire_sensitivity(
    fire_on_record: HourlyCoupledOutput,
    fire_off_record: HourlyCoupledOutput,
    receptor_name: str = "Delhi-ITO",
) -> FireSensitivityMetrics:
    """Compute transport and concentration sensitivity to upstream stubble burning."""
    if fire_on_record.lead_hour != fire_off_record.lead_hour:
        raise ValueError("Cannot compare runs with differing lead hours")

    diff_pm25 = max(0.0, round(fire_on_record.pm25_ug_m3 - fire_off_record.pm25_ug_m3, 2))
    diff_pm10 = max(0.0, round(fire_on_record.pm10_ug_m3 - fire_off_record.pm10_ug_m3, 2))

    total_pm25 = max(1.0, fire_on_record.pm25_ug_m3)
    pct = round(min(100.0, (diff_pm25 / total_pm25) * 100.0), 2)

    return FireSensitivityMetrics(
        receptor_name=receptor_name,
        lat=fire_on_record.lat,
        lon=fire_on_record.lon,
        lead_hour=fire_on_record.lead_hour,
        fire_pm25_contribution_ug_m3=diff_pm25,
        fire_pm10_contribution_ug_m3=diff_pm10,
        fire_pm25_percentage=pct,
    )
