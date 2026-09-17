# Dashboard Design: VayuSense SIH26082

Updated 2026-09-14. Target design; implementation remains the inherited prototype. [Requirements](Prd.md) and [phases](Phases.md) determine scope.

## Primary Experience

Open on Delhi NCR forecast operations. Reuse the existing navigation and Mapbox integration with a compact, readable workspace. Make selected region, pollutant, model issue time, valid time, native grid spacing and run status visible.

The map occupies the main workspace. A fixed-height hourly timeline covers leads 1-72, with a separate observed/history context. A station/cell selection opens its time series and diagnostics. All layers and detail views share the same run and valid time.

## Required Views

| View | Required content | Evidence rule |
| --- | --- | --- |
| Forecast | AQI, PM2.5, PM10, O3, NOx/NO2 selector; station/cell series; uncertainty | Model-backed values, units and averaging windows |
| Weather | Temperature, wind, PBL height and surface radiation | Same run/time as chemical fields |
| Inversion | Vertical temperature profile, base/top/depth, strength and gradient | Diagnostic method and height reference; no inversion and missing data are distinct |
| Burning | Detections, acquisition time/confidence, modeled plume timeline and arrival | Separate detected fires from estimated emissions and transported pollution |
| Coupling comparison | Feedback-enabled/disabled pair and weather/chemistry differences | Matched experiment IDs; no guaranteed sign or improvement |
| Validation | Observed versus predicted values and metrics by pollutant/horizon | Held-out data, sample counts and generated results |
| Run status | Last completed run, input freshness, pending/failed cycle and replay state | No silent substitution with synthetic data |

## Semantics and Controls

Use Indian AQI categories and a labeled accessible legend; do not carry over the inherited EPA limit annotation. Distinguish concentration, pollutant subindex and aggregate AQI. Give NOx and NO2 their own identities.

Use a slider/stepper for forecast time, menus for pollutant/run selection, toggles for layers and tooltips for icon actions. Charts use explicit units and timestamps. Wind direction conventions and plume legends must be unambiguous.

A satellite NO2 column layer is labeled as a column product, never surface PM2.5. Fire hotspots and source-class symbols are annotations, not measured contribution percentages. Remove inherited fixed industry/traffic/dust percentages from scientific claims.

Observed, forecast, archived replay and synthetic demo states must be visibly distinct. Show unavailable values as unavailable, not zero or a fabricated smooth curve. Uncertainty bands require a documented source.

## Layout and Accessibility

Keep headings compact, text readable and numbers aligned. Use restrained neutral surfaces with semantic colors for AQI, selected series and warnings. Preserve familiar existing components where useful; the inherited dark palette is a reference, not a requirement for all future screens.

Avoid nested cards, decorative urgency effects and crowded map controls. Use collapsible panels, stable chart dimensions and responsive stacking on mobile. Every control must remain reachable without overlapping map legends or timeline labels. Color alone cannot communicate status.

## Existing Mockups

The ten `frontend/mockups/*/DESIGN.md` files are historical visual references. Each has a SIH26082 scope note. Their older colors, brand names and operational descriptions do not establish implemented functionality. This document takes precedence for the SIH redesign.

PDF exports should become forecast briefs carrying run/time, model/data provenance and limitations. A generated report does not acquire official authority from its styling.
