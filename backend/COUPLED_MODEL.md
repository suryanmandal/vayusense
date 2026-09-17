# Coupled Model Architecture and Experiment Manifest

Documentation for **Phase 3 / Workstream C (Coupled Model & Feedback Experimentation)**.

## Overview

Phase 3 establishes the numerical weather and atmospheric chemistry integration layer based on **WRF-Chem (Weather Research and Forecasting with Chemistry)** to model two-way coupled meteorology-aerosol-photolysis interactions over Northern India and the Delhi National Capital Region (NCR).

## Model Configuration & Domains

### 1. Nested Domain Configuration
- **Parent Domain (`d01_regional_north_india`)**:
  - Horizontal Grid Spacing ($\Delta x, \Delta y$): $9\text{ km}$ ($120 \times 110$ grid cells)
  - Extent: Regional Northern India (covering stubble burning source regions in Punjab, Haryana, and upwind transport pathways).
- **Nested Domain (`d02_delhi_ncr_nested`)**:
  - Horizontal Grid Spacing ($\Delta x, \Delta y$): $3\text{ km}$ ($91 \times 91$ grid cells)
  - Extent: Delhi NCR metropolitan region.
  - Parent Grid Ratio: $1:3$ nesting.
- **Vertical Grid**:
  - $38$ terrain-following $\eta$ (eta) vertical levels, with concentrated vertical resolution near the surface ($\le 1.5\text{ km}$) to resolve atmospheric inversions and boundary layer dynamics.

### 2. Chemistry, Aerosol & Radiation Schemes
- **Chemical Mechanism**: `chem_opt = 202` (MOZART gas-phase chemistry coupled with MOSAIC 4-bin sectional aerosol module) or `chem_opt = 108` (RADM2-MADE/SORGAM).
- **Photolysis Scheme**: `phot_opt = 3` (Fast-J photolysis, responsive to aerosol optical depth and cloud attenuation).
- **Radiation**: `ra_lw_physics = 4`, `ra_sw_physics = 4` (RRTMG Longwave & Shortwave radiation).
- **Planetary Boundary Layer**: `bl_pbl_physics = 1` (YSU) or `2` (MYJ).
- **Two-Way Aerosol Coupling**:
  - `aer_ra_feedback = 1`: Aerosol direct radiative effect (scattering and absorption altering surface solar insolation and heating rates).
  - `aer_cu_feedback = 1`: Aerosol indirect effect (cloud droplet activation and albedo perturbation).

## Controlled Experimentation Framework

### 1. Aerosol-Radiation Feedback Experiment (Coupling ON vs OFF)
To isolate and measure how heavy winter haze alters local weather and worsens stagnation:
$$\Delta \text{SWDOWN} = \text{SWDOWN}_{\text{Feedback-ON}} - \text{SWDOWN}_{\text{Feedback-OFF}} \quad (\text{W/m}^2)$$
$$\Delta T_2 = T_{2,\text{Feedback-ON}} - T_{2,\text{Feedback-OFF}} \quad (^\circ\text{C})$$
$$\Delta \text{PBLH} = \text{PBLH}_{\text{Feedback-ON}} - \text{PBLH}_{\text{Feedback-OFF}} \quad (\text{m})$$
$$\Delta \text{PM}_{2.5} = \text{PM}_{2.5,\text{Feedback-ON}} - \text{PM}_{2.5,\text{Feedback-OFF}} \quad (\mu\text{g/m}^3)$$

*Physical Mechanism*: Surface dimming ($\Delta \text{SWDOWN} < 0$) causes surface cooling ($\Delta T_2 < 0$) and boundary layer shallowing ($\Delta \text{PBLH} < 0$), further trapping particulate emissions near the ground.

### 2. Stubble Burning Sensitivity Experiment (Fires ON vs OFF)
Quantifies the exact transboundary smoke load transported to Delhi NCR receptors:
$$\text{Fire Contribution } (\mu\text{g/m}^3) = \max(0, \text{PM}_{2.5,\text{Fire-ON}} - \text{PM}_{2.5,\text{Fire-OFF}})$$
$$\text{Fire Attribution } (\%) = \left(\frac{\text{Fire Contribution}}{\text{Total }\text{PM}_{2.5,\text{Fire-ON}}}\right) \times 100$$

## Automated Tooling & Code Modules

- **`backend/src/coupled_model_contract.py`**: Pydantic schema for grid domains, namelist parameters, run manifests, and hourly coupled output records.
- **`backend/src/namelist_generator.py`**: Automated Fortran `namelist.input` generator enforcing strict consistency between run manifests and simulation configurations.
- **`backend/src/feedback_diagnostics.py`**: Diagnostic differential engine calculating feedback dimming, temperature depression, boundary layer suppression, and fire plume attribution.

## Test Suite Execution

Run unit tests:
```bash
PYTHONPATH="backend/.venv/lib/python3.9/site-packages:backend" python3 -m unittest discover -s backend/tests -p 'test_coupled_model.py'
```
