# Vertical Atmospheric Inversion & Ventilation Diagnostics

Documentation for **Phase 4 / Workstream C & D (Inversion & Stubble Diagnostics)**.

## Overview

The inversion diagnostic engine (`backend/src/inversion_diagnostics.py`) processes vertical atmospheric sounding columns (radiosonde soundings or WRF-Chem model vertical columns) to diagnose temperature inversions, atmospheric stability, and surface ventilation over the Delhi NCR airshed.

## Physical Definitions & Methodology

### 1. Inversion Layer Detection & Categorization
An atmospheric inversion is diagnosed whenever the vertical temperature gradient is positive:
$$\frac{dT}{dz} > 0.1 \ ^\circ\text{C} / 100\text{ m}$$

- **Surface-Based Inversion (SBI)**:
  - Base altitude: $z_{\text{base}} \le 50\text{ m}$ AGL (originating from radiative surface cooling at night).
- **Elevated Inversion (EI)**:
  - Base altitude: $z_{\text{base}} > 50\text{ m}$ AGL (subsidence, frontal, or advective inversion layers aloft).

### 2. Inversion Strength Classification
Characterized by layer temperature jump ($\Delta T = T_{\text{top}} - T_{\text{base}}$) and gradient ($\gamma = \frac{\Delta T}{\Delta z}$):
- **Severe**: $\Delta T \ge 5.0\ ^\circ\text{C}$ or $\gamma \ge 3.0\ ^\circ\text{C}/100\text{m}$
- **Strong**: $\Delta T \ge 2.5\ ^\circ\text{C}$ or $\gamma \ge 1.5\ ^\circ\text{C}/100\text{m}$
- **Moderate**: $\Delta T \ge 1.0\ ^\circ\text{C}$ or $\gamma \ge 0.5\ ^\circ\text{C}/100\text{m}$
- **Weak**: $\Delta T < 1.0\ ^\circ\text{C}$

### 3. Ventilation Coefficient (VC) & Trapping Potential
Following Central Pollution Control Board (CPCB) standards:
$$\text{VC } (\text{m}^2/\text{s}) = \text{PBLH } (\text{m}) \times U_{\text{surface}} \ (\text{m/s})$$

- **Critical ($< 2000\text{ m}^2/\text{s}$)**: High air stagnation and severe trapping of particulate emissions.
- **Poor ($2000 - 4000\text{ m}^2/\text{s}$)**: Restricted vertical mixing and sluggish horizontal dispersion.
- **Moderate ($4000 - 6000\text{ m}^2/\text{s}$)**: Normal dispersion conditions.
- **Good ($\ge 6000\text{ m}^2/\text{s}$)**: Rapid pollutant dilution and dispersion.

## Combined Trapping Assessment
- **Severe Trapping**: Surface-based inversion present AND critical ventilation ($\text{VC} < 2000\text{ m}^2/\text{s}$ or $\text{PBLH} < 350\text{ m}$).
- **High Trapping**: Surface-based inversion present OR critical ventilation.
- **Moderate Trapping**: Elevated inversion layer present OR poor ventilation.
- **Low Trapping**: No inversion layers and good vertical mixing.

## CLI & Test Usage

Run unit tests:
```bash
PYTHONPATH="backend/.venv/lib/python3.9/site-packages:backend" python3 -m unittest discover -s backend/tests -p 'test_inversion_diagnostics.py'
```
