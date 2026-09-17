# Product Requirements: VayuSense SIH26082

Updated 2026-09-14. Status: target specification, not a declaration of implemented features. Source and confidence limits: [assessment](SIH26082_Assessment.md).

## Purpose and Users

Build an Air Pollution-Weather Coupled Forecasting System for Delhi NCR for MoES/NCMRWF. Serve forecast analysts, air-quality researchers and regional response planners with an interpretable 72-hour outlook. Retain useful VayuSense interface and spatial components.

The core experience is a forecast map, hourly timeline, weather/chemistry diagnostics and regional burning impact. Pan-India directories, agent topology, translation and compliance tooling are secondary to this scope.

## Mandatory Acceptance Matrix

| ID | Requirement | Acceptance evidence | Current state | Phase |
| --- | --- | --- | --- | --- | --- |
| R1 | Delhi NCR high-resolution coverage | Versioned NCR boundary and regional source domain; grid definition and native/display resolution; forecast queries covering Delhi and NCR cities | Map shell only, Mumbai defaults | 1, 3, 6 |
| R2 | Real data workflow | Timestamped station, weather/profile and emissions ingestion; units, QC, provenance, missing/stale handling and repeatable ingest | Partial scaffolding, mock ground data | 1, 2 |
| R3 | Full 72-hour outlook | Every supported cell has 72 consecutive hourly valid times after issue time; PM2.5, PM10, O3, NOx and AQI products with explicit missing flags | 12-step PM2.5 scenario only | 3, 5 |
| R4 | Two-way weather-chemistry | Reproducible WRF-Chem or equivalent run; supported chemistry/aerosol/radiation configuration; feedback-on/off evidence for weather and pollutants | Absent | 3, 7 |
| R5 | Inversion tracking | Vertical profiles, inversion base/top/depth, temperature difference and gradient; PBL height and diagnosed ventilation | Placeholder boolean only | 4 |
| R6 | Stubble-burning transport | Quality-filtered detections plus agricultural context, emissions/injection method, transported plume evolution and NCR impact sensitivity | Absent | 2, 4 |
| R7 | Usable real-time dashboard | Data-backed map/timeline and diagnostics; issue/valid times, run status, provenance, stale/replay labels and error states | Reusable UI, scientific views missing | 6 |
| R8 | Demonstrated forecasting quality | Held-out dates/stations; baseline comparisons by pollutant and lead window; winter burning/inversion and ozone episodes; uncertainty evaluation | No verified real-world metrics | 5, 7 |

These acceptance details are project decisions derived from the supplied statement, not additional official SIH wording. No numerical grid size, update cadence or skill threshold was supplied by the organizer.

## Domain and Outputs

Delhi NCR is broader than Delhi MCD. Include Delhi, Gurugram, Faridabad, Noida, Greater Noida and Ghaziabad, and use a verified boundary for full coverage. The regional simulation must cover relevant upwind sources, including Punjab and Haryana, with adequate transport buffer.

Proposed benchmark: regional outer grid around 9 km and NCR inner grid around 3 km; investigate a 1 km nest only after timing and skill evaluation. Final resolution and vertical levels are Phase 3 decisions, not current achievements. Resolve the near-surface vertical structure needed for inversion diagnosis.

Produce hourly pollutant concentrations and temperature, wind, humidity, PBL height and shortwave radiation. Retain NO and NO2 where the mechanism supports them; document NOx definition and unit conversions. Generate Indian AQI from valid pollutant subindices with correct history and averaging. Store enough pre-issue observations/model history for early lead-time windows. Mark insufficient coverage rather than silently filling it.

## Product Behavior

Select region or station, run and valid hour. Compare forecast with observations when available. Inspect inversion profile, fire plume arrival/evolution, uncertainty and the coupled versus feedback-disabled experiment. Label coupled sensitivity as an experiment; do not automatically claim it improves accuracy.

Proposed operations target: issue a run every 12 hours, with a complete 72-hour forecast published before the next scheduled cycle. Benchmark feasibility and revise explicitly if needed. Refresh observation displays as provider data become available; a UI refresh is not a fresh model run.

Alerts identify forecast AQI category changes, strong inversion periods and modeled plume arrival, with time and uncertainty. They are informational forecasts, not autonomous regulatory orders. Thresholds and wording need domain review.

## Completion and Scope Control

Mandatory requirements R1-R8 must each link to implementation and verification artifacts before claiming full alignment. Distinguish live forecast, archived replay, baseline ML and synthetic demo modes.

Defer additional pan-India expansion, cosmetic agent feeds, automated closure notices and elaborate profile features. Existing reports can become forecast briefings with provenance. Improved forecast skill must be measured; no fixed RMSE or accuracy target is claimed from the inherited project.
