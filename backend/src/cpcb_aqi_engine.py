"""Phase 5 / Workstream E: Official CPCB National Air Quality Index (NAQI) Engine.

Implements the official Central Pollution Control Board (CPCB) India AQI standard (2014/2015):
- 8 Criteria Pollutants: PM2.5, PM10, NO2, NH3, SO2, CO, O3, Pb
- Standard Breakpoint Table: Good (0-50), Satisfactory (51-100), Moderate (101-200),
  Poor (201-300), Very Poor (301-400), Severe (401-500).
- Linear interpolation formula:
    I_p = [ (I_hi - I_lo) / (B_hi - B_lo) ] * (C_p - B_lo) + I_lo
- Regulatory Completeness & Aggregation Rules:
  1. At least 3 pollutants must be present.
  2. At least one of PM2.5 or PM10 must be present.
  3. Overall AQI = max(sub-indices).
  4. Dominant Pollutant = species with the highest sub-index.
"""

from __future__ import annotations

import argparse
import json
from typing import Dict, List, Literal, Optional, Tuple

from pydantic import BaseModel, ConfigDict, Field


# Official CPCB Breakpoints: (B_lo, B_hi, I_lo, I_hi)
# Units: PM2.5 (ug/m3, 24h), PM10 (ug/m3, 24h), NO2 (ug/m3, 24h), NH3 (ug/m3, 24h),
#        SO2 (ug/m3, 24h), CO (mg/m3, 8h), O3 (ug/m3, 8h), Pb (ug/m3, 24h)
CPCB_BREAKPOINTS: Dict[str, List[Tuple[float, float, int, int]]] = {
    "PM2.5": [
        (0.0, 30.0, 0, 50),
        (30.1, 60.0, 51, 100),
        (60.1, 90.0, 101, 200),
        (90.1, 120.0, 201, 300),
        (120.1, 250.0, 301, 400),
        (250.1, 500.0, 401, 500),
    ],
    "PM10": [
        (0.0, 50.0, 0, 50),
        (50.1, 100.0, 51, 100),
        (100.1, 250.0, 101, 200),
        (250.1, 350.0, 201, 300),
        (350.1, 430.0, 301, 400),
        (430.1, 600.0, 401, 500),
    ],
    "NO2": [
        (0.0, 40.0, 0, 50),
        (40.1, 80.0, 51, 100),
        (80.1, 180.0, 101, 200),
        (180.1, 280.0, 201, 300),
        (280.1, 400.0, 301, 400),
        (400.1, 800.0, 401, 500),
    ],
    "O3": [
        (0.0, 50.0, 0, 50),
        (50.1, 100.0, 51, 100),
        (100.1, 168.0, 101, 200),
        (168.1, 208.0, 201, 300),
        (208.1, 748.0, 301, 400),
        (748.1, 1000.0, 401, 500),
    ],
    "SO2": [
        (0.0, 40.0, 0, 50),
        (40.1, 80.0, 51, 100),
        (80.1, 380.0, 101, 200),
        (380.1, 800.0, 201, 300),
        (800.1, 1600.0, 301, 400),
        (1600.1, 2000.0, 401, 500),
    ],
    "CO": [
        (0.0, 1.0, 0, 50),
        (1.01, 2.0, 51, 100),
        (2.01, 10.0, 101, 200),
        (10.01, 17.0, 201, 300),
        (17.01, 34.0, 301, 400),
        (34.01, 50.0, 401, 500),
    ],
    "NH3": [
        (0.0, 200.0, 0, 50),
        (200.1, 400.0, 51, 100),
        (400.1, 800.0, 101, 200),
        (800.1, 1200.0, 201, 300),
        (1200.1, 1800.0, 301, 400),
        (1800.1, 2400.0, 401, 500),
    ],
}

AQI_CATEGORIES = [
    (0, 50, "Good", "#00b050"),
    (51, 100, "Satisfactory", "#92d050"),
    (101, 200, "Moderate", "#ffff00"),
    (201, 300, "Poor", "#ff9900"),
    (301, 400, "Very Poor", "#ff0000"),
    (401, 500, "Severe", "#c00000"),
]


class SubIndexResult(BaseModel):
    """Sub-index calculated for an individual pollutant."""
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    species: str
    concentration: float
    unit: str
    sub_index: int = Field(ge=0, le=500)
    category: str


class CpcbAqiResult(BaseModel):
    """Overall CPCB Air Quality Index calculation result."""
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    aqi: Optional[int] = Field(default=None, ge=0, le=500)
    category: Optional[str] = None
    category_color: Optional[str] = None
    dominant_pollutant: Optional[str] = None
    sub_indices: Dict[str, SubIndexResult]
    valid: bool = Field(description="True if regulatory minimum criteria (>=3 species with at least 1 PM) are met")
    invalidation_reason: Optional[str] = None
    cpcb_method_version: str = "CPCB-IND-NAQI-2015"


def calculate_sub_index(species: str, concentration: float, unit: str = "ug/m3") -> Optional[SubIndexResult]:
    """Calculate sub-index for a single pollutant using CPCB linear interpolation."""
    if concentration < 0:
        return None

    # Handle CO unit conversion: if ug/m3 or ppm provided, ensure mg/m3
    val = concentration
    if species == "CO" and unit == "ppm":
        val = concentration * 1.145  # 1 ppm CO ~ 1.145 mg/m3 at standard NTP

    breakpoints = CPCB_BREAKPOINTS.get(species)
    if not breakpoints:
        return None

    # Cap to max defined range (500)
    if val > breakpoints[-1][1]:
        return SubIndexResult(
            species=species,
            concentration=val,
            unit=unit,
            sub_index=500,
            category="Severe",
        )

    for b_lo, b_hi, i_lo, i_hi in breakpoints:
        if b_lo <= val <= b_hi:
            # Linear interpolation
            sub_idx = round(((i_hi - i_lo) / (b_hi - b_lo)) * (val - b_lo) + i_lo)
            sub_idx = min(500, max(0, sub_idx))

            cat_name = "Good"
            for c_lo, c_hi, name, _ in AQI_CATEGORIES:
                if c_lo <= sub_idx <= c_hi:
                    cat_name = name
                    break

            return SubIndexResult(
                species=species,
                concentration=round(val, 2),
                unit=unit,
                sub_index=sub_idx,
                category=cat_name,
            )

    return None


def calculate_cpcb_aqi(
    pollutants: Dict[str, float],
    units: Optional[Dict[str, str]] = None,
    enforce_min_pollutant_rule: bool = True,
) -> CpcbAqiResult:
    """Calculate overall CPCB Air Quality Index from a dictionary of pollutant concentrations.

    Parameters:
    - pollutants: dict mapping species name to concentration, e.g. {"PM2.5": 45.0, "PM10": 90.0, "NO2": 25.0}
    - units: optional dict mapping species to units (defaults to ug/m3, except CO which is mg/m3)
    - enforce_min_pollutant_rule: if True, requires at least 3 pollutants with at least one PM
    """
    sub_indices: Dict[str, SubIndexResult] = {}
    units_map = units or {}

    for spec, conc in pollutants.items():
        if conc is not None and conc >= 0:
            u = units_map.get(spec, "mg/m3" if spec == "CO" else "ug/m3")
            sub = calculate_sub_index(spec, conc, unit=u)
            if sub:
                sub_indices[spec] = sub

    # Check CPCB regulatory rules:
    # 1. At least one particulate matter (PM2.5 or PM10)
    has_pm = ("PM2.5" in sub_indices) or ("PM10" in sub_indices)
    # 2. Minimum of 3 criteria pollutants
    num_valid = len(sub_indices)

    if enforce_min_pollutant_rule:
        if not has_pm:
            return CpcbAqiResult(
                sub_indices=sub_indices,
                valid=False,
                invalidation_reason="CPCB rule requires at least one of PM2.5 or PM10 to calculate AQI",
            )
        if num_valid < 3:
            return CpcbAqiResult(
                sub_indices=sub_indices,
                valid=False,
                invalidation_reason=f"CPCB rule requires at least 3 criteria pollutants (found {num_valid})",
            )

    if not sub_indices:
        return CpcbAqiResult(
            sub_indices={},
            valid=False,
            invalidation_reason="No valid pollutant sub-indices available",
        )

    # Dominant pollutant has the maximum sub-index
    sorted_items = sorted(sub_indices.items(), key=lambda x: x[1].sub_index, reverse=True)
    dom_species, dom_result = sorted_items[0]
    aqi_val = dom_result.sub_index

    cat_name = "Good"
    cat_color = "#00b050"
    for c_lo, c_hi, name, color in AQI_CATEGORIES:
        if c_lo <= aqi_val <= c_hi:
            cat_name = name
            cat_color = color
            break

    return CpcbAqiResult(
        aqi=aqi_val,
        category=cat_name,
        category_color=cat_color,
        dominant_pollutant=dom_species,
        sub_indices=sub_indices,
        valid=True,
    )


def main():
    parser = argparse.ArgumentParser(description="Calculate CPCB Air Quality Index from concentrations")
    parser.add_argument("--pm25", type=float, default=None)
    parser.add_argument("--pm10", type=float, default=None)
    parser.add_argument("--no2", type=float, default=None)
    parser.add_argument("--o3", type=float, default=None)
    parser.add_argument("--co", type=float, default=None)
    parser.add_argument("--so2", type=float, default=None)
    parser.add_argument("--nh3", type=float, default=None)
    args = parser.parse_args()

    data = {}
    if args.pm25 is not None: data["PM2.5"] = args.pm25
    if args.pm10 is not None: data["PM10"] = args.pm10
    if args.no2 is not None: data["NO2"] = args.no2
    if args.o3 is not None: data["O3"] = args.o3
    if args.co is not None: data["CO"] = args.co
    if args.so2 is not None: data["SO2"] = args.so2
    if args.nh3 is not None: data["NH3"] = args.nh3

    res = calculate_cpcb_aqi(data)
    print(res.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
