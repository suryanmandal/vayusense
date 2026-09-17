# SIH26082 Implementation Tracker

Updated 2026-09-14. Read this and Memory.md first in any IDE. Phase 1: IN PROGRESS. TEAM_TASKS.md contains proposed human assignments; this file tracks actual code progress.

## Current Subphases

- **Latest UI correction:** original /dashboard/home restored at user request. New model-backed workspace stays separate at /dashboard/forecast. Legacy home uses explicitly synthetic /api/forecast/72h; new page uses /api/forecast/models. No scientific phase status changed.

- **Phase 6.2 IMPLEMENTED - model-backed PM2.5 workspace (2026-09-16):** See MODEL_INTEGRATION_HANDOFF.md. Baseline/XGBoost/experimental hybrid share real service output; explicit Live/Demo selection, timeline, PBL/wind/profile indicator, provenance/export. WRF-Chem unavailable, not a working toggle. Live provider/proxy and actual-model self-test passed. Legacy synthetic 72h route retired. Full parent phase remains open.
- **Cleanup BLOCKED:** five requested old root folders remain after safety rejection; verified recovery archive in tmp. No new serving dependency on them. Do not delete the replacement package's internal models/data.
- **Phase 5.1 replacement serving path integrated, validation OPEN:** old package fixes superseded for deployment, not magically completed. Supplied newer one-hour metrics are not independent 72-hour/hybrid validation. Phase1.1 still partial; real station provenance and official vectors not supplied by this integration.

- **Phase 5.1 COMPLETED:** Repaired and validated the supplied ML baseline in `vayusense_ml_project`. Corrected target/feature time alignment (no leakage), implemented strict chronological split, applied `OneHotEncoder` for station encoding, and correctly established true persistence baseline comparison (which outperformed the ML model, as expected for un-tuned baselines). Model switched to `HistGradientBoostingRegressor` for macOS compatibility. Artifacts generated and metrics recorded.

- **Phase 6.1 COMPLETED (UI DEMO FIXTURE):** Homepage Forecast Workspace Redesign implemented at [page.tsx](frontend/src/app/dashboard/home/page.tsx). Includes compact 4-source legend (Industry, Transport, Construction, Crop-Residue Burning), separate weather/meteorology controls (Wind, PBLH, Inversion), synchronized 72-hour timeline connected to [72h API](frontend/src/app/api/forecast/72h/route.ts), full criteria pollutant selector bar (CPCB NAQI, PM2.5, PM10, NO2, O3, CO, SO2), and 3-tab diagnostic matrix (72h Forecast, Inversion Profile, Stubble Plume). Build passed cleanly. Explicit DEMO FIXTURE tag and provenance metadata displayed. Parent Phase 6 remains open pending live observation/boundary integration.

Member 2 source/format/access instructions: MEMBER2_QUICK_START.md. Accept preserved raw downloads first; normalize during integration. No data delivery or source-access success is implied by this guide.

- **Phase 1.1 PARTIALLY DELIVERED (reviewed 2026-09-15):** both folders inspected; estimated 55% complete / 45% remaining. Read MEMBER2_REVIEW.md. Daily samples and PDF fallback accepted as reference inputs; hourly data, metadata and vector geography remain open. Extra update workbook is city AQI, not station coordinates. No full phase closure.
- **Phase 1.2 IN PROGRESS:** Independent schema/observation integration. Standalone contract implemented and six tests pass. Read-only DB inspector added; migration remains pending.

## Latest Checkpoint: P1-B & Workstream C/D/E Advances

- [x] backend/src/observation_contract.py validates species/units, finite concentrations, coordinates, aware timestamps, chronology, provenance fields, missingness and NOx basis; normalizes timestamps to UTC and rejects duplicate batch identities. Compatible with Python 3.9+.
- [x] backend/OBSERVATION_INPUT.md documents the handoff format and its limitations.
- [x] backend/src/fire_emissions.py & backend/FIRE_EMISSIONS.md implement agricultural stubble burning FRP-to-emissions (PM2.5, PM10, NOx, CO, SO2, VOC) & plume injection height parameterization (Phase 2 / Workstream D).
- [x] backend/src/coupled_model_contract.py, backend/src/namelist_generator.py, backend/src/feedback_diagnostics.py & backend/COUPLED_MODEL.md implement WRF-Chem coupled numerical architecture, domain nesting (9km/3km), namelist generation, and paired Feedback ON/OFF & Fire ON/OFF sensitivity diagnostics (Phase 3 / Workstream C).
- [x] backend/src/inversion_diagnostics.py & backend/INVERSION_DIAGNOSTICS.md implement vertical sounding temperature inversion diagnosis (surface vs elevated, base/top, lapse gradient dT/dz) and CPCB Ventilation Coefficient (VC = PBLH * WSPD) pollutant trapping diagnostics (Phase 4 / Workstream C & D).
- [x] backend/src/cpcb_aqi_engine.py, backend/src/forecast_evaluation.py & backend/CPCB_AQI.md implement official Indian CPCB National Air Quality Index (NAQI) sub-index interpolation, regulatory completeness rules (>=3 species with >=1 PM), dominant pollutant detection, persistence baselines, and Willmott Index of Agreement / RMSE evaluation metrics (Phase 5 / Workstream E).
- [x] frontend/src/app/dashboard/forecast/page.tsx & frontend/src/app/api/forecast/72h/route.ts implement the 72-Hour Coupled Air Quality Forecast Dashboard terminal with scrubbing timeline, aerosol-radiation feedback comparison, boundary layer inversion tracking, and stubble fire attribution telemetry (Phase 6 UI).
- [x] backend/tests/: 25 unit tests passing across all scientific backend modules.
- [x] frontend/scripts/inspect-db.mjs provides read-only schema metadata inspection without printing credentials or server error details.
- [ ] Deployed schema inspection: blocked by missing DATABASE_URL in frontend/.env.local. No migration or data mutation performed.
- [ ] Copied backend Python environment: backend/.venv/bin/python3 cannot execute. Repair/recreate a working environment before running the main server.
- [ ] Persistence, ingestion API, cross-batch deduplication and full NCR integration remain unimplemented.

Run inspector from frontend: `node --env-file=.env.local scripts/inspect-db.mjs`. Run contract tests from backend: `python -m unittest discover -s tests -p 'test_observation_contract.py'`. Do not invent a connection string or print environment values. The validator verifies data shape/semantics only; raw-file checksums, scientific QC and source truth still require verification.

## P1-A Completed

- [x] Default selection DL instead of MH.
- [x] Satellite UI calls implemented POST /api/geospatial/satellite.
- [x] Validated bounds flow from selected municipality through catalogue/processing requests and metadata to raster corners.
- [x] Source/product/retrieval metadata added. Extent is a preview, not a verified NCR boundary.
- [x] Node tests pass (2); production build passes (23 pages); local invalid-bounds POST returns 400.

## Next, in Order

1. Reconcile frontend SQL and Python ORM through a versioned, non-destructive migration. Inspect deployed schema and all consumers first without exposing credentials. Do not drop tables or reseed existing data.
2. Establish observation contract: station/location, species, value/units, valid/received times, source, QC and observed/replay/synthetic state. Acquire permitted real NCR sample and connect SQL -> API -> UI.
3. Replace generated boundaries with verified NCR geography and source/version metadata. Delhi MCD alone is not NCR; preview extent does not establish coverage.
4. Verify successful satellite access through UI/API. Review catalogue ordering, QA and freshness. Remaining inherited issues: static coordinates/export labels, mock SQL display, style-change raster restoration and request/selection races.
5. Verify the complete Phase 1 acceptance gate before marking complete. Start data acquisition/model feasibility in parallel as Phases.md specifies.

## Commands and Limits

```sh
node --test frontend/tests/satelliteBounds.test.mjs
npm run build --prefix frontend
npm run dev --prefix frontend -- --hostname 127.0.0.1 --port 3100
```

Satellite POST requires JSON bounds [west, south, east, north]. Missing/malformed/reversed bounds return 400 before provider access. Selected municipality center uses a +/-0.25-degree preview. Successful remote provider processing and UI rendering have NOT been verified. Build reported Google font download optimization warnings but succeeded. Existing data/model claims remain unverified.

## Resume Discipline

Update Memory.md, this file and Phases.md after every bounded implementation checkpoint: exact changes, commands/results, blockers and next action. Preserve existing uncommitted work. Do not reread dependencies or expose .env values to reconstruct context. Scientific completion requires actual evidence, not a build or label change.
