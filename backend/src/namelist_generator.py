"""Namelist generator and validator for WRF-Chem runs.

Produces standard, reproducible `namelist.input` configurations for:
1. Operational 72-hour forecast run
2. Controlled Aerosol-Radiation Feedback Sensitivity experiment (Feedback ON vs OFF)
3. Controlled Stubble Burning Fire Sensitivity experiment (Fires ON vs OFF)
"""

from __future__ import annotations

from typing import Dict, List, Tuple
from src.coupled_model_contract import CoupledModelConfig, GridDomain, ModelRunManifest


def render_namelist_input(
    manifest: ModelRunManifest,
    max_dom: int = 2,
) -> str:
    """Generate reproducible Fortran namelist.input string matching the run manifest."""
    cfg = manifest.model_config_detail
    d01, d02 = manifest.domains[0], manifest.domains[1]

    # Calculate run time breakdown
    total_hours = manifest.forecast_hours + manifest.spin_up_hours
    run_days = total_hours // 24
    run_hours = total_hours % 24

    st = manifest.start_time_utc
    et = manifest.end_time_utc

    namelist = f"""&time_control
 run_days                            = {run_days},
 run_hours                           = {run_hours},
 run_minutes                         = 0,
 run_seconds                         = 0,
 start_year                          = {st.year}, {st.year},
 start_month                         = {st.month:02d}, {st.month:02d},
 start_day                           = {st.day:02d}, {st.day:02d},
 start_hour                          = {st.hour:02d}, {st.hour:02d},
 end_year                            = {et.year}, {et.year},
 end_month                           = {et.month:02d}, {et.month:02d},
 end_day                             = {et.day:02d}, {et.day:02d},
 end_hour                            = {et.hour:02d}, {et.hour:02d},
 interval_seconds                    = 21600,
 input_from_file                     = .true., .true.,
 history_interval                    = 60, 60,
 frames_per_outline                  = 1, 1,
 restart                             = .false.,
 restart_interval                    = 1440,
 io_form_history                     = 2,
 io_form_restart                     = 2,
 io_form_input                       = 2,
 io_form_boundary                    = 2,
/

&domains
 time_step                           = 45,
 time_step_fract_num                 = 0,
 time_step_fract_den                 = 1,
 max_dom                             = {max_dom},
 e_we                                = {d01.e_we}, {d02.e_we},
 e_sn                                = {d01.e_sn}, {d02.e_sn},
 e_vert                              = {d01.num_vert_levels}, {d02.num_vert_levels},
 p_top_requested                     = 5000,
 num_metgrid_levels                  = 34,
 num_metgrid_soil_levels             = 4,
 dx                                  = {d01.grid_dx_m:.1f}, {d02.grid_dx_m:.1f},
 dy                                  = {d01.grid_dy_m:.1f}, {d02.grid_dy_m:.1f},
 grid_id                             = 1, 2,
 parent_id                           = 0, 1,
 i_parent_start                      = 1, 35,
 j_parent_start                      = 1, 32,
 parent_grid_ratio                   = 1, 3,
 parent_time_step_ratio              = 1, 3,
 feedback                            = 1,
 smooth_option                       = 0,
/

&physics
 mp_physics                          = 8, 8,
 ra_lw_physics                       = {cfg.rad_opt_lw}, {cfg.rad_opt_lw},
 ra_sw_physics                       = {cfg.rad_opt_sw}, {cfg.rad_opt_sw},
 radt                                = 9, 3,
 sf_sfclay_physics                   = 1, 1,
 sf_surface_physics                  = 2, 2,
 bl_pbl_physics                      = {cfg.pbl_opt}, {cfg.pbl_opt},
 bldt                                = 0, 0,
 cu_physics                          = 5, 0,
 cudt                                = 0, 0,
 isfflx                              = 1,
 ifsnow                              = 1,
 icloud                              = 1,
 surface_input_source                = 1,
 num_soil_layers                     = 4,
 aer_ra_feedback                     = {cfg.aer_ra_feedback}, {cfg.aer_ra_feedback},
 aer_cu_feedback                     = {cfg.aer_cu_feedback}, {cfg.aer_cu_feedback},
/

&chem
 chem_opt                            = {cfg.chem_opt}, {cfg.chem_opt},
 bio_emiss_opt                       = {cfg.bio_emiss_opt}, {cfg.bio_emiss_opt},
 phot_opt                            = {cfg.phot_opt}, {cfg.phot_opt},
 dust_opt                            = {cfg.dust_opt}, {cfg.dust_opt},
 biomass_burn_opt                    = {cfg.fire_emiss_opt}, {cfg.fire_emiss_opt},
 gas_chem                            = 1, 1,
 aerchem_onoff                       = 1, 1,
 chemdt                              = 0, 0,
/
"""
    return namelist.strip()
