"""Phase 3 / Workstream C: Coupled Atmospheric-Chemistry Model Architecture and Run Manifests.

Defines the Pydantic schema and manifests for WRF-Chem numerical runs,
domain definitions, chemical mechanism configurations, and controlled aerosol-feedback
experiment tracking.
"""

from __future__ import annotations

import argparse
import hashlib
import json
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


class GridDomain(BaseModel):
    """WRF-Chem horizontal grid and domain configuration."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)

    domain_id: int = Field(ge=1, le=5, description="Domain level: 1 for regional parent, 2 for nested NCR")
    name: str = Field(min_length=1, description="e.g. d01_regional_north_india or d02_delhi_ncr")
    grid_dx_m: float = Field(gt=0, description="Grid resolution in meters, e.g. 9000.0 (9km) or 3000.0 (3km)")
    grid_dy_m: float = Field(gt=0, description="Grid resolution in meters")
    e_we: int = Field(gt=10, description="Number of grid points in West-East direction")
    e_sn: int = Field(gt=10, description="Number of grid points in South-North direction")
    num_vert_levels: int = Field(ge=20, le=100, description="Number of eta vertical levels (e.g. 35-45)")
    ref_lat: float = Field(ge=-90, le=90)
    ref_lon: float = Field(ge=-180, le=180)
    parent_id: int = Field(ge=0, description="0 for outermost domain, 1 for d02 nested inside d01")
    parent_grid_ratio: int = Field(ge=1, description="Ratio to parent grid spacing (e.g. 3 for 9km -> 3km)")


class CoupledModelConfig(BaseModel):
    """Physics, chemistry, radiation and aerosol coupling flags in namelist."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    solver: Literal["WRF-Chem-v4.4.2", "WRF-Chem-v4.5.1", "WRF-Chem-v4.6.0", "SURROGATE-TEST"]
    chem_opt: int = Field(description="Chemistry option code e.g. 202 (MOZART-MOSAIC 4-bin) or 108 (RADM2-MADE/SORGAM)")
    chem_opt_name: str = Field(description="Human readable name e.g. MOZART_MOSAIC_4BIN or RADM2_MADE_SORGAM")
    phot_opt: int = Field(description="Photolysis scheme e.g. 3 (Fast-J) or 1 (Madronich)")
    rad_opt_lw: int = Field(description="Longwave radiation scheme e.g. 4 (RRTMG)")
    rad_opt_sw: int = Field(description="Shortwave radiation scheme e.g. 4 (RRTMG)")
    pbl_opt: int = Field(description="PBL scheme e.g. 1 (YSU) or 2 (MYJ)")
    aer_ra_feedback: Literal[0, 1] = Field(description="Aerosol direct radiative feedback: 1=ON, 0=OFF")
    aer_cu_feedback: Literal[0, 1] = Field(description="Aerosol indirect/cloud-interaction feedback: 1=ON, 0=OFF")
    fire_emiss_opt: Literal[0, 1] = Field(description="Biomass burning fire emissions: 1=ON, 0=OFF")
    bio_emiss_opt: int = Field(description="Biogenic emissions option e.g. 2 (MEGAN2.04)")
    dust_opt: int = Field(description="Dust emission option e.g. 1 (GOCART) or 3 (AFWA)")


class ModelRunManifest(BaseModel):
    """Traceable manifest and provenance record for a coupled simulation run."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, protected_namespaces=())

    run_id: str = Field(min_length=1, description="Unique run identifier e.g. RUN-20261015-00Z-FCST")
    issue_time_utc: AwareDatetime
    start_time_utc: AwareDatetime
    end_time_utc: AwareDatetime
    forecast_hours: int = Field(ge=1, le=120, description="Simulation horizon in hours (standard: 72)")
    spin_up_hours: int = Field(ge=0, le=48, description="Chemical/meteorological spin-up hours (e.g. 12 or 24)")
    experiment_type: Literal["operational_forecast", "coupling_sensitivity", "fire_sensitivity", "baseline_unbiased"]
    controlled_feedback_on: bool
    controlled_fires_on: bool
    domains: List[GridDomain]
    model_config_detail: CoupledModelConfig
    input_met_source: str = Field(description="e.g. NCEP_GFS_0p25 or ECMWF_IFS")
    input_chem_bdy_source: str = Field(description="e.g. CAMS_GLOBAL_NRT or WACCM")
    input_anthropogenic_inventory: str = Field(description="e.g. EDGAR-HTAPv3 / TERI-ARAI")
    input_fire_source: str = Field(description="e.g. NASA_FIRMS_VIIRS")
    input_hashes: Dict[str, str] = Field(description="SHA256 checksums of boundary conditions, namelists and fire files")
    status: Literal["configured", "running", "completed", "failed"]
    wall_clock_seconds: Optional[float] = Field(default=None, ge=0)
    compute_nodes: Optional[int] = Field(default=None, ge=1)
    cores_per_node: Optional[int] = Field(default=None, ge=1)
    output_netcdf_paths: List[str] = Field(default_factory=list)

    @field_validator("issue_time_utc", "start_time_utc", "end_time_utc")
    @classmethod
    def normalize_utc(cls, value: AwareDatetime) -> AwareDatetime:
        return value.astimezone(timezone.utc)

    @model_validator(mode="after")
    def validate_times_and_experiment(self):
        if self.end_time_utc <= self.start_time_utc:
            raise ValueError("end_time_utc must be after start_time_utc")

        # Verify flags match experiment type
        if self.experiment_type == "coupling_sensitivity":
            # Coupling sensitivity explicitly isolates aerosol radiation feedback
            if self.model_config_detail.aer_ra_feedback != (1 if self.controlled_feedback_on else 0):
                raise ValueError("model_config aer_ra_feedback must match controlled_feedback_on flag")
        elif self.experiment_type == "fire_sensitivity":
            if self.model_config_detail.fire_emiss_opt != (1 if self.controlled_fires_on else 0):
                raise ValueError("model_config fire_emiss_opt must match controlled_fires_on flag")
        return self


class HourlyCoupledOutput(BaseModel):
    """Hourly surface and layer metrics extracted from coupled WRF-Chem NetCDF."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)

    run_id: str
    valid_time_utc: AwareDatetime
    lead_hour: int = Field(ge=0, le=120)
    domain_id: int
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    # Meteorology variables
    t2_celsius: float = Field(ge=-50, le=60, description="2-meter temperature in Celsius")
    q2_g_kg: float = Field(ge=0, le=40, description="2-meter specific humidity (g/kg)")
    u10_m_s: float = Field(description="10-meter U-wind component (m/s)")
    v10_m_s: float = Field(description="10-meter V-wind component (m/s)")
    swdown_w_m2: float = Field(ge=0, le=1500, description="Downward shortwave flux at surface (W/m2)")
    pblh_m: float = Field(ge=10, le=6000, description="Planetary Boundary Layer Height (m AGL)")
    # Chemical species concentrations
    pm25_ug_m3: float = Field(ge=0, le=2000, description="Surface PM2.5 in ug/m3")
    pm10_ug_m3: float = Field(ge=0, le=4000, description="Surface PM10 in ug/m3")
    o3_ppb: float = Field(ge=0, le=500, description="Surface Ozone in ppb")
    no2_ppb: float = Field(ge=0, le=500, description="Surface NO2 in ppb")
    so2_ppb: float = Field(ge=0, le=500, description="Surface SO2 in ppb")
    co_ppm: float = Field(ge=0, le=100, description="Surface CO in ppm")
    aod_550nm: Optional[float] = Field(default=None, ge=0, le=5.0, description="Aerosol Optical Depth at 550nm")

    @field_validator("valid_time_utc")
    @classmethod
    def normalize_utc(cls, value: AwareDatetime) -> AwareDatetime:
        return value.astimezone(timezone.utc)


def compute_config_hash(content: str) -> str:
    """Compute sha256 hash of a namelist or configuration string."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def generate_ncr_standard_domains() -> List[GridDomain]:
    """Standard 2-domain nested configuration: d01 (9km North India) & d02 (3km Delhi NCR)."""
    d01 = GridDomain(
        domain_id=1,
        name="d01_regional_north_india",
        grid_dx_m=9000.0,
        grid_dy_m=9000.0,
        e_we=120,
        e_sn=110,
        num_vert_levels=38,
        ref_lat=28.6139,
        ref_lon=77.2090,
        parent_id=0,
        parent_grid_ratio=1,
    )
    d02 = GridDomain(
        domain_id=2,
        name="d02_delhi_ncr_nested",
        grid_dx_m=3000.0,
        grid_dy_m=3000.0,
        e_we=91,
        e_sn=91,
        num_vert_levels=38,
        ref_lat=28.6139,
        ref_lon=77.2090,
        parent_id=1,
        parent_grid_ratio=3,
    )
    return [d01, d02]
