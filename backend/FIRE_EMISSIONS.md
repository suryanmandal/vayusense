# Agricultural Stubble Burning and Fire Emissions Pipeline

Documented as part of **Phase 2 / Workstream D (Emissions & Fire Data Processing)**.

## Overview

The fire emissions pipeline (`backend/src/fire_emissions.py`) ingests satellite active fire and thermal anomaly detections (NASA FIRMS / VIIRS / MODIS) for agricultural regions affecting Delhi NCR (Punjab, Haryana, UP, Rajasthan) and converts Fire Radiative Power (FRP) into:
1. **Biomass Consumption Rate** ($\text{kg/s}$ of dry agricultural residue burned)
2. **Speciated Pollutant Emission Fluxes** ($\text{g/s}$ for $\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{NO}_x$, $\text{CO}$, $\text{SO}_2$, $\text{VOC}$)
3. **Plume Rise & Vertical Injection Layer** ($\text{base}$, $\text{top}$, and boundary layer fraction)

## Methodology & References

### 1. Biomass Consumption from FRP
Following Wooster et al. (2005) smoke coefficient conversion:
$$\text{Biomass Rate } (\text{kg/s}) = \text{FRP } (\text{MW}) \times C_e$$
where $C_e = 0.368 \text{ kg/MJ}$ (Wooster et al. 2005).

### 2. Speciated Emission Factors (Andreae 2019 / Akagi et al. 2011)
Agricultural residue burning profile:
- $\text{PM}_{2.5}$: $7.2 \text{ g/kg}$ dry matter
- $\text{PM}_{10}$: $9.1 \text{ g/kg}$ dry matter
- $\text{NO}_x$ (as $\text{NO}_2$ equivalent): $3.1 \text{ g/kg}$ dry matter
- $\text{CO}$: $92.0 \text{ g/kg}$ dry matter
- $\text{SO}_2$: $0.8 \text{ g/kg}$ dry matter
- $\text{VOC}$: $18.5 \text{ g/kg}$ dry matter

### 3. Plume Injection Height
Using semi-empirical plume rise scaling parameterized for agricultural/grassland fires (Sofiev et al. 2012 / Freitas et al.):
$$H_{\text{top}} = 150 \times (\text{FRP}_{\text{MW}})^{0.35} \text{ (meters AGL)}$$
$$H_{\text{bottom}} = 0.3 \times H_{\text{top}}$$

Emissions are partitioned between the Planetary Boundary Layer (PBL) and the free troposphere based on the diagnosed PBL height ($\text{PBLH}$).

## CLI & Test Usage

Run unit tests:
```bash
PYTHONPATH="backend/.venv/lib/python3.9/site-packages:backend" python3 -m unittest discover -s backend/tests -p 'test_fire_emissions.py'
```

Process a JSON batch of fire detections:
```bash
PYTHONPATH="backend/.venv/lib/python3.9/site-packages:backend" python3 backend/src/fire_emissions.py <path_to_fire_batch.json> --pblh 1000
```
