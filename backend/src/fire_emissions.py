"""Stubble burning and fire emissions processing pipeline (Workstream D).

Converts satellite fire detections (e.g. NASA FIRMS / VIIRS) into normalized fire
records and estimates pollutant emission rates (PM2.5, PM10, NOx, CO, SO2) along
with plume injection heights based on Fire Radiative Power (FRP) and agricultural
biomass burning emission factors.
"""

from __future__ import annotations

import argparse
import json
import math
from datetime import timezone
from pathlib import Path
from typing import Dict, List, Literal, Optional

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    field_validator,
    model_validator,
)


# Default agricultural residue emission factors (g / kg dry biomass burned)
# Standard references: Andreae (2019), Akagi et al. (2011), CPCB agricultural burning profiles
DEFAULT_AGRICULTURAL_EMISSION_FACTORS: Dict[str, float] = {
    "PM2.5": 7.2,    # g / kg dry matter
    "PM10": 9.1,     # g / kg dry matter
    "NOx": 3.1,      # g / kg dry matter (as NO2 equivalent)
    "CO": 92.0,      # g / kg dry matter
    "SO2": 0.8,      # g / kg dry matter
    "VOC": 18.5,     # g / kg dry matter
}

# Biomass burning rate conversion factor: kg dry matter burned per Megajoule of radiative energy
# Standard Wooster et al. (2005) smoke coefficient C_e = 0.368 (+/- 0.015) kg / MJ
DEFAULT_SMOKE_COEFFICIENT_KG_PER_MJ = 0.368


class FireDetection(BaseModel):
    """Normalized single fire detection event from satellite sensors (VIIRS / MODIS)."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)

    detection_id: str = Field(min_length=1, description="Unique ID for detection")
    latitude: float = Field(ge=-90, le=90, strict=True)
    longitude: float = Field(ge=-180, le=180, strict=True)
    acq_datetime: AwareDatetime = Field(description="Detection timestamp in UTC")
    satellite: Literal["SNPP", "NOAA-20", "NOAA-21", "TERRA", "AQUA"]
    instrument: Literal["VIIRS", "MODIS"]
    confidence: Literal["low", "nominal", "high", "numeric"]
    confidence_value: Optional[float] = Field(default=None, ge=0, le=100)
    frp_mw: float = Field(ge=0, strict=True, description="Fire Radiative Power in MegaWatts (MW)")
    bright_ti4_k: Optional[float] = Field(default=None, ge=100, le=600, description="Brightness temperature (Kelvin)")
    bright_ti5_k: Optional[float] = Field(default=None, ge=100, le=600, description="Brightness temperature I5 (Kelvin)")
    daynight: Literal["D", "N"]
    state_or_region: Optional[str] = Field(default=None, description="e.g. Punjab, Haryana, UP, Rajasthan")
    source: str = Field(min_length=1, description="Data source provider e.g. NASA_FIRMS")
    raw_file: str = Field(min_length=1, description="Path or manifest ref to raw FIRMS source")
    raw_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    data_kind: Literal["observed", "replay", "synthetic"]

    @field_validator("acq_datetime")
    @classmethod
    def normalize_utc(cls, value: AwareDatetime) -> AwareDatetime:
        return value.astimezone(timezone.utc)

    @model_validator(mode="after")
    def validate_confidence(self):
        if self.confidence == "numeric" and self.confidence_value is None:
            raise ValueError("confidence_value is required when confidence is 'numeric'")
        return self


class FireEmissionEstimate(BaseModel):
    """Calculated emission flux and plume properties for a fire event."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)

    detection_id: str
    latitude: float
    longitude: float
    acq_datetime: AwareDatetime
    frp_mw: float
    biomass_consumption_rate_kg_s: float = Field(ge=0, description="kg/s of dry matter consumed")
    emission_fluxes_g_s: Dict[str, float] = Field(description="Pollutant emission fluxes in grams per second (g/s)")
    plume_bottom_m: float = Field(ge=0, description="Estimated plume base altitude above ground level (m)")
    plume_top_m: float = Field(ge=0, description="Estimated plume top altitude above ground level (m)")
    injection_layer_pbl_fraction: float = Field(ge=0, le=1.0, description="Fraction of emissions released within PBL vs free troposphere")
    method_provenance: str = Field(description="Citation or description of FRP conversion and plume rise algorithm")


def estimate_injection_height(frp_mw: float, pblh_m: float = 1200.0) -> tuple[float, float, float]:
    """Estimate plume injection height (bottom, top in meters AGL) and PBL fraction from FRP.

    Uses semi-empirical Sofiev et al. (2012) / Freitas et al. plume rise scaling:
    H_top ~ alpha * (FRP)^beta
    For agricultural fires in Punjab/Haryana (typically 5 - 100 MW), plumes stay predominantly
    within the boundary layer unless meteorological instability and very high FRP (> 200 MW) occur.
    """
    if frp_mw <= 0:
        return (0.0, 50.0, 1.0)

    # Plume top empirical parameterization for agricultural/grassland burning
    # Baseline: Top ~ 150 * (FRP_MW ** 0.35)
    plume_top = min(3500.0, max(50.0, 150.0 * math.pow(frp_mw, 0.35)))
    plume_bottom = max(0.0, plume_top * 0.3)

    if plume_top <= pblh_m:
        pbl_fraction = 1.0
    else:
        # If top exceeds PBLH, partition proportionally
        pbl_fraction = max(0.2, pblh_m / plume_top)

    return (round(plume_bottom, 1), round(plume_top, 1), round(pbl_fraction, 3))


def calculate_emissions(
    detection: FireDetection,
    emission_factors: Optional[Dict[str, float]] = None,
    smoke_coefficient: float = DEFAULT_SMOKE_COEFFICIENT_KG_PER_MJ,
    pblh_m: float = 1200.0,
) -> FireEmissionEstimate:
    """Calculate hourly/instantaneous pollutant emission rates and injection properties."""
    ef = emission_factors or DEFAULT_AGRICULTURAL_EMISSION_FACTORS

    # FRP is in MW = MegaJoules per second (MJ/s)
    # Biomass burning rate (kg/s) = FRP (MJ/s) * smoke_coefficient (kg/MJ)
    biomass_rate_kg_s = detection.frp_mw * smoke_coefficient

    # Emission rate (g/s) = biomass_rate (kg/s) * EF (g/kg)
    fluxes = {
        species: round(biomass_rate_kg_s * factor, 4)
        for species, factor in ef.items()
    }

    plume_bot, plume_top, pbl_frac = estimate_injection_height(detection.frp_mw, pblh_m=pblh_m)

    return FireEmissionEstimate(
        detection_id=detection.detection_id,
        latitude=detection.latitude,
        longitude=detection.longitude,
        acq_datetime=detection.acq_datetime,
        frp_mw=detection.frp_mw,
        biomass_consumption_rate_kg_s=round(biomass_rate_kg_s, 4),
        emission_fluxes_g_s=fluxes,
        plume_bottom_m=plume_bot,
        plume_top_m=plume_top,
        injection_layer_pbl_fraction=pbl_frac,
        method_provenance="Wooster (2005) C_e=0.368 kg/MJ; Andreae (2019) EF; Sofiev (2012) Plume Rise",
    )


def process_fire_batch(
    raw_records: List[dict],
    pblh_m: float = 1200.0,
) -> tuple[List[FireDetection], List[FireEmissionEstimate]]:
    """Validate a batch of fire detections and generate emission estimates."""
    if not isinstance(raw_records, list) or not raw_records:
        raise ValueError("Input must be a non-empty array of fire detections")

    detections: List[FireDetection] = []
    estimates: List[FireEmissionEstimate] = []
    seen_ids = set()

    for item in raw_records:
        det = FireDetection.model_validate(item)
        if det.detection_id in seen_ids:
            raise ValueError(f"Duplicate fire detection_id '{det.detection_id}' in batch")
        seen_ids.add(det.detection_id)

        est = calculate_emissions(det, pblh_m=pblh_m)
        detections.append(det)
        estimates.append(est)

    return detections, estimates


def main():
    parser = argparse.ArgumentParser(description="Process satellite fire detections into emission estimates")
    parser.add_argument("input", type=Path, help="JSON file containing list of FireDetection objects")
    parser.add_argument("--pblh", type=float, default=1200.0, help="Planetary boundary layer height in meters")
    args = parser.parse_args()

    try:
        raw_data = json.loads(args.input.read_text(encoding="utf-8"))
        detections, estimates = process_fire_batch(raw_data, pblh_m=args.pblh)
    except ValidationError as exc:
        print(json.dumps({
            "valid": False,
            "errors": [{"field": list(e["loc"]), "type": e["type"]} for e in exc.errors()]
        }))
        raise SystemExit(1)
    except (ValueError, OSError) as exc:
        print(json.dumps({"valid": False, "error": str(exc)}))
        raise SystemExit(1)

    total_frp = sum(d.frp_mw for d in detections)
    total_pm25_flux_kg_hr = sum(e.emission_fluxes_g_s.get("PM2.5", 0.0) for e in estimates) * 3600 / 1000.0

    print(json.dumps({
        "valid": True,
        "count": len(detections),
        "total_frp_mw": round(total_frp, 2),
        "total_pm25_flux_kg_hr": round(total_pm25_flux_kg_hr, 2),
        "states": sorted(list({d.state_or_region for d in detections if d.state_or_region})),
        "data_kinds": sorted(list({d.data_kind for d in detections})),
    }))


if __name__ == "__main__":
    main()
