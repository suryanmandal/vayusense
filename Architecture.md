# Architecture: VayuSense SIH26082

Updated 2026-09-14. Existing assets below are source-audited; the target pipeline is proposed. See [assessment](SIH26082_Assessment.md) and [phases](Phases.md).

## Existing System

- Next.js 14/React, Mapbox and municipal context provide screens and selection state.
- Next.js API handlers provide SQL-backed SSE telemetry, satellite requests and audit exports.
- FastAPI `backend/src/main.py` initializes PostGIS and loads RF/XGBoost artifacts; scenario and agent routes use it.
- `backend/app/main.py` is a separate minimal app, not the forecast backend used by the root script.
- Python raster/H3 utilities and agent tools are scaffolding, not a demonstrated coupled assimilation pipeline.
- SQL and SQLAlchemy describe incompatible tables. Establish one migrated schema before sharing the database.

## Proposed Processing Flow

1. Ingest observations, meteorological initial/boundary fields, vertical profiles, chemical initial/boundary fields, anthropogenic/biogenic emissions and regional fire inputs.
2. Save raw inputs with source/version/time/checksum; normalize units and QC into versioned records.
3. Prepare terrain/land use, domains, meteorology, chemistry and mechanism-specific emissions for a pinned WRF-Chem configuration.
4. Execute spin-up then 72 forecast hours in a dedicated numerical worker. Transport/chemistry and aerosol-radiation feedback operate inside the coupled solver.
5. Extract hourly surface chemistry, weather and vertical diagnostics; retain native gridded output and provenance.
6. Diagnose inversions, compare controlled fire/coupling experiments, and optionally apply a separately validated ML bias correction.
7. Compute Indian AQI with averaging/completeness rules; publish gridded products and station series atomically per completed run.
8. Serve forecast maps, timelines, diagnostics and freshness state through FastAPI to Next.js.

RF/XGBoost may support baselines or postprocessing. They do not replace two-way numerical coupling. A backend response must identify which engine produced it.

## Numerical Worker

Run on a suitable Linux/HPC environment separate from web requests. Pin solver/compiler/libraries, geography, physics, chemical mechanism, emissions mappings and input checksums. Select a mechanism with the required gases and aerosol species; verify compatible radiation/photolysis/aerosol settings using that version's documentation.

Prototype a small domain and short experiment first. Benchmark wall time, memory, storage and spin-up sensitivity before fixing production nests and cadence. Atmospheric nesting and weather-chemistry feedback are distinct settings: demonstrating one does not demonstrate the other.

Controlled experiments:

| Experiment | Controlled change | Outputs to compare |
| --- | --- | --- |
| Coupling sensitivity | Aerosol radiative feedback on versus off, other settings and forcing fixed | Radiation, temperature, wind, PBL height and pollutant evolution |
| Burning sensitivity | Fire emissions on versus off, other inputs/configuration fixed | Transport, arrival and concentration differences over NCR |

Differences are modeled sensitivities, not uniquely proven source fractions; chemistry can be nonlinear. Preserve configurations, input hashes and run IDs for each pair.

## Proposed Storage and Contracts

Use PostGIS for boundaries, stations and spatial indexes. Store large numerical arrays as NetCDF or another suitable chunked format outside SQL, referenced by run manifests. Select an implementation after profiling; do not create SQL rows for every 3-D solver variable.

| Entity | Minimum fields |
| --- | --- |
| observation | station, location, species, value, units, valid time, received time, source, QC |
| model_run | run ID, issue time UTC, status, engine/version, domain, grid spacing, input/config hashes, spin-up, experiment, wall time |
| forecast | run ID, valid time UTC, lead hour, grid/cell/station, species/value/units, quality, native resolution, postprocessing version |
| inversion | run/cell/time, profile source, base/top above ground, depth, delta temperature, gradient, PBL height, diagnostic version |
| fire_input | detection ID/time/location, sensor, FRP if available, confidence, land context, emissions method and units, injection assumptions |
| evaluation | run/model, dataset/date/station split, pollutant, lead window, metric, sample count, missing fraction, baseline |

Store UTC; display Asia/Kolkata explicitly. Separate observed, forecast, replay and synthetic records. Persist AQI standard/version, contributing subindices, averaging interval and completeness alongside each AQI value.

## Proposed API Surface

These endpoints do not exist yet:

- `GET /api/v1/runs`: issued runs and publication status.
- `GET /api/v1/forecast`: run/location or region, hourly leads 1-72 and units.
- `GET /api/v1/forecast/tiles/{z}/{x}/{y}`: pollutant/time map products.
- `GET /api/v1/inversions`: profiles and metrics for selected run/time/location.
- `GET /api/v1/fires`: detections and time-dependent modeled plume products.
- `GET /api/v1/experiments`: paired run metadata and sensitivity results.
- `GET /api/v1/validation`: reproducible evaluation outputs.

Keep the existing scenario API explicitly labeled as a legacy experimental baseline until its data and horizon contract are corrected. Align the satellite UI request and handler route.

## Reliability

Use a job queue or scheduler with explicit queued/running/failed/complete states; numerical execution never occurs inside a browser request. Publish only complete validated outputs, retain the last successful run with a stale label, and never replace failed science products with unlabeled synthetic data.

Credentials stay server-side. Validate data formats, numerical units, missing values, CRS and geometry. For distance calculations use geography or an appropriate metric CRS; degrees are not meters. Pin or migrate H3 APIs consistently. Resolve the duplicate database definitions through migrations, not competing create-table routines.
