"""Phase 4 / Workstream C & D: Vertical Atmospheric Inversion & Ventilation Diagnostic Engine.

Diagnoses surface-based and elevated temperature inversions from vertical soundings
or coupled model vertical column profiles (height, pressure, temperature).
Calculates inversion base, top, layer depth, lapse rate gradient (dT/dz),
Planetary Boundary Layer Height (PBLH), and the Ventilation Coefficient (VC).
"""

from __future__ import annotations

import argparse
import json
from datetime import timezone
from pathlib import Path
from typing import List, Literal, Optional

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    field_validator,
    model_validator,
)


class VerticalLevel(BaseModel):
    """Single level in an atmospheric vertical sounding or model column."""
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    height_m_agl: float = Field(ge=0, description="Height above ground level in meters")
    pressure_hpa: float = Field(gt=100, le=1100, description="Barometric pressure in hPa")
    temperature_celsius: float = Field(ge=-90, le=60, description="Air temperature in Celsius")
    dewpoint_celsius: Optional[float] = Field(default=None, ge=-90, le=60)
    wind_speed_m_s: Optional[float] = Field(default=None, ge=0, le=150)
    wind_direction_deg: Optional[float] = Field(default=None, ge=0, le=360)


class InversionLayer(BaseModel):
    """Identified temperature inversion layer (where temperature increases with height)."""
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    inversion_type: Literal["surface_based", "elevated"]
    base_height_m: float = Field(ge=0, description="Base height AGL in meters")
    top_height_m: float = Field(gt=0, description="Top height AGL in meters")
    depth_m: float = Field(gt=0, description="Layer thickness (top - base) in meters")
    base_temperature_c: float
    top_temperature_c: float
    delta_temperature_c: float = Field(gt=0, description="T_top - T_base (> 0 for an inversion)")
    lapse_rate_gradient_c_per_100m: float = Field(gt=0, description="Lapse rate gradient dT/dz in deg C / 100m")
    strength_category: Literal["weak", "moderate", "strong", "severe"]


class InversionDiagnosticResult(BaseModel):
    """Full diagnostic assessment of atmospheric stability, inversions, and ventilation."""
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    station_or_cell_id: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    valid_time_utc: AwareDatetime
    profile_source: Literal["radiosonde_sounding", "model_wrf_column", "reanalysis_era5", "synthetic_test"]
    pblh_m: float = Field(ge=10, le=6000, description="Planetary boundary layer height (m AGL)")
    surface_wind_speed_m_s: float = Field(ge=0, description="10m or surface wind speed in m/s")
    ventilation_coefficient_m2_s: float = Field(ge=0, description="PBLH * surface wind speed (m2/s)")
    ventilation_category: Literal["critical", "poor", "moderate", "good"]
    has_surface_inversion: bool
    has_elevated_inversion: bool
    num_inversion_layers: int = Field(ge=0)
    layers: List[InversionLayer] = Field(default_factory=list)
    trapping_potential: Literal["severe", "high", "moderate", "low"]
    algorithm_definition: str = Field(description="Description and threshold documentation of the diagnostic")

    @field_validator("valid_time_utc")
    @classmethod
    def normalize_utc(cls, value: AwareDatetime) -> AwareDatetime:
        return value.astimezone(timezone.utc)


def classify_inversion_strength(delta_t: float, gradient: float) -> Literal["weak", "moderate", "strong", "severe"]:
    """Categorize inversion strength based on temperature jump and vertical gradient (CPCB/WMO guidelines)."""
    if delta_t >= 5.0 or gradient >= 3.0:
        return "severe"
    elif delta_t >= 2.5 or gradient >= 1.5:
        return "strong"
    elif delta_t >= 1.0 or gradient >= 0.5:
        return "moderate"
    else:
        return "weak"


def classify_ventilation(vc_m2_s: float) -> Literal["critical", "poor", "moderate", "good"]:
    """Classify CPCB ventilation coefficient (VC = PBLH * Wind Speed).
    - Critical: VC < 2000 m2/s (Severe pollutant trapping)
    - Poor: 2000 <= VC < 4000 m2/s
    - Moderate: 4000 <= VC < 6000 m2/s
    - Good: VC >= 6000 m2/s (High dispersion)
    """
    if vc_m2_s < 2000.0:
        return "critical"
    elif vc_m2_s < 4000.0:
        return "poor"
    elif vc_m2_s < 6000.0:
        return "moderate"
    else:
        return "good"


def diagnose_inversions_and_ventilation(
    levels: List[VerticalLevel],
    station_or_cell_id: str,
    latitude: float,
    longitude: float,
    valid_time_utc: AwareDatetime,
    pblh_m: float,
    surface_wind_speed_m_s: float,
    profile_source: Literal["radiosonde_sounding", "model_wrf_column", "reanalysis_era5", "synthetic_test"] = "radiosonde_sounding",
    min_gradient_threshold_c_per_100m: float = 0.1,
) -> InversionDiagnosticResult:
    """Diagnose vertical temperature inversions from ordered height levels.

    Identifies:
    1. Surface-based inversion: Inversion beginning at the lowest observation level (base <= 50m AGL).
    2. Elevated inversions: Inversions beginning aloft (base > 50m AGL).
    """
    if len(levels) < 2:
        raise ValueError("At least 2 vertical levels required to diagnose atmospheric inversion")

    # Sort strictly by altitude AGL
    sorted_levels = sorted(levels, key=lambda l: l.height_m_agl)

    layers: List[InversionLayer] = []
    i = 0
    n = len(sorted_levels)

    while i < n - 1:
        # Check if temperature increases with height (dT > 0)
        if sorted_levels[i + 1].temperature_celsius > sorted_levels[i].temperature_celsius:
            base_idx = i
            # Follow the inversion layer upwards to its peak temperature
            while (
                i < n - 1
                and sorted_levels[i + 1].temperature_celsius >= sorted_levels[i].temperature_celsius
            ):
                i += 1
            top_idx = i

            base_lvl = sorted_levels[base_idx]
            top_lvl = sorted_levels[top_idx]

            depth = top_lvl.height_m_agl - base_lvl.height_m_agl
            delta_t = top_lvl.temperature_celsius - base_lvl.temperature_celsius

            if depth > 0:
                gradient = (delta_t / depth) * 100.0  # deg C / 100m
                if gradient >= min_gradient_threshold_c_per_100m and delta_t > 0.05:
                    inv_type = "surface_based" if base_lvl.height_m_agl <= 50.0 else "elevated"
                    strength = classify_inversion_strength(delta_t, gradient)

                    layers.append(
                        InversionLayer(
                            inversion_type=inv_type,
                            base_height_m=round(base_lvl.height_m_agl, 1),
                            top_height_m=round(top_lvl.height_m_agl, 1),
                            depth_m=round(depth, 1),
                            base_temperature_c=round(base_lvl.temperature_celsius, 2),
                            top_temperature_c=round(top_lvl.temperature_celsius, 2),
                            delta_temperature_c=round(delta_t, 2),
                            lapse_rate_gradient_c_per_100m=round(gradient, 3),
                            strength_category=strength,
                        )
                    )
        i += 1

    has_surface = any(l.inversion_type == "surface_based" for l in layers)
    has_elevated = any(l.inversion_type == "elevated" for l in layers)

    # Ventilation Coefficient = PBL Height (m) * Wind Speed (m/s)
    vc = round(pblh_m * surface_wind_speed_m_s, 2)
    vc_cat = classify_ventilation(vc)

    # Assess overall trapping potential combining inversion presence and ventilation
    if has_surface and (vc_cat == "critical" or pblh_m < 350):
        trapping = "severe"
    elif has_surface or vc_cat == "critical":
        trapping = "high"
    elif has_elevated or vc_cat == "poor":
        trapping = "moderate"
    else:
        trapping = "low"

    return InversionDiagnosticResult(
        station_or_cell_id=station_or_cell_id,
        latitude=latitude,
        longitude=longitude,
        valid_time_utc=valid_time_utc,
        profile_source=profile_source,
        pblh_m=round(pblh_m, 1),
        surface_wind_speed_m_s=round(surface_wind_speed_m_s, 2),
        ventilation_coefficient_m2_s=vc,
        ventilation_category=vc_cat,
        has_surface_inversion=has_surface,
        has_elevated_inversion=has_elevated,
        num_inversion_layers=len(layers),
        layers=layers,
        trapping_potential=trapping,
        algorithm_definition="Diagnosed from dT/dz > 0.1 C/100m; Surface based if base <= 50m AGL; VC = PBLH * WSPD (CPCB standard)",
    )


def main():
    parser = argparse.ArgumentParser(description="Diagnose atmospheric inversions and ventilation from vertical soundings")
    parser.add_argument("input", type=Path, help="JSON file containing vertical soundings and profile metadata")
    args = parser.parse_args()

    try:
        raw_data = json.loads(args.input.read_text(encoding="utf-8"))
        levels = [VerticalLevel.model_validate(lvl) for lvl in raw_data["levels"]]
        result = diagnose_inversions_and_ventilation(
            levels=levels,
            station_or_cell_id=raw_data.get("station_id", "DELHI-SAFDRJUNG"),
            latitude=raw_data.get("latitude", 28.58),
            longitude=raw_data.get("longitude", 77.20),
            valid_time_utc=raw_data["valid_time_utc"],
            pblh_m=raw_data.get("pblh_m", 450.0),
            surface_wind_speed_m_s=raw_data.get("surface_wind_speed_m_s", 1.8),
            profile_source=raw_data.get("profile_source", "radiosonde_sounding"),
        )
        print(result.model_dump_json(indent=2))
    except (ValidationError, KeyError, ValueError, OSError) as exc:
        print(json.dumps({"error": str(exc)}))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
