# Model Integration Handoff - 2026-09-16

LATEST USER CORRECTION: Original homepage restored at /dashboard/home. The new workspace is ONLY at /dashboard/forecast, accessible through Forecast Comparison navigation. Original home again receives demo fixtures from /api/forecast/72h, with truthful synthetic metadata. New model-backed /api/forecast/models is unchanged. Statements below about a shared homepage or HTTP410 are historical and superseded.

## Active Application

Homepage and /dashboard/forecast now share ForecastWorkspace.tsx. One mutually exclusive selector: Baseline, XGBoost, Experimental Hybrid; WRF-Chem is disabled because no solver or run artifacts are connected. Two independent switches would imply a supported WRF-only state that this package does not supply.

The trained model lives in `delhi_pm25_openmeteo_complete 2/models/xgboost_pm25_production.json`. Do NOT delete that package's internal data/models folders. The homepage uses `/api/forecast/models`, which proxies to this package's FastAPI service, never the legacy synthetic engine. Both the previous homepage implementation and forecast page remain as inactive functions to preserve other IDE work. A homepage snapshot is in tmp/home-before-model-integration.tsx. The old `/api/forecast/72h` endpoint returns HTTP 410 instead of fabricated solver output.

## Start Locally

From repository root, use two terminals:

```sh
cd "delhi_pm25_openmeteo_complete 2"
../.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

```sh
npm run dev --prefix frontend -- --hostname 127.0.0.1 --port 3100
```

Open http://127.0.0.1:3100/dashboard/home. The current preview uses `npm run start --prefix frontend -- --hostname 127.0.0.1 --port 3100` after a successful production build. Stop the preview before rebuilding; use dev for editing. Optional server-only FORECAST_SERVICE_URL changes the upstream (default http://127.0.0.1:8001). Deployment needs BOTH Next.js and the Python service; deploying Next.js alone will not run XGBoost. Root .venv was repaired with FastAPI/Uvicorn; Homebrew libomp installed to load XGBoost. The supplied package's Windows .venv is not used.

## Implemented and Checked

- Actual production XGBoost model loads and runs 72 recursive steps.
- Baseline uses the latest PM seed unchanged; experimental hybrid applies the package's parameterized aerosol transform and reruns XGBoost.
- Added a daylight guard: no shortwave cooling when radiation is zero/missing. This does not validate the parameterization.
- Live Open-Meteo weather and CAMS seed returned 72 hours through the new Next.js proxy. Current diagnostics included PBL, wind and pressure-level temperature difference. This was one successful local request, not uptime assurance.
- Explicit demo mode recomputes predictions from bundled sample inputs. Missing sample PBL/wind/profile data display Unavailable, never invented values. No silent live-to-demo fallback.
- Selected-mode concentration, shared-scale comparison chart, 72-hour scrub/playback, weather diagnostics, location map, provenance and JSON export.
- New request/selection cancels the prior request and clears stale results. Proxy checks 72 consecutive timestamps and finite nonnegative predictions; unsupported geographic coordinates return 400. This geographic envelope is NOT a verified NCR boundary.
- Production build passed before final small follow-up edits. Playwright Chrome tested 1440/768/390 widths: three modes, disabled WRF, hour 72, no workspace horizontal overflow and no page errors. Final checks recorded in Memory.md.

## Scientific Status: Do Not Overclaim

The package's own evaluation file reports one-hour XGBoost MAE 14.36 versus persistence 15.24, approximately 5.81% MAE improvement. We did not reproduce training or validate these reported artifacts independently. This is not an accuracy percentage, a 72-hour score or evidence of hybrid improvement.

PBL/WS are diagnostic variables, not trained features in this model. The hybrid modifies AT/SR; PBL adjustment does not feed trained weights. No WRF-Chem simulation, coupled-model calibration, plume transport, multipollutant forecasts or full CPCB AQI is connected. Pressure-level temperature differences require below-ground screening and are not verified surface inversion depth/severity. CAMS seeds are modeled concentrations, not CPCB measurements. Live weather differs from training meteorology. Full 72-hour validation remains open.

## Phase Disposition

| Phase | Current disposition |
|---|---|
| 1.1 real observations/boundaries | Still partial: model weights do not supply verified boundary vectors, station registry or raw-data provenance |
| 1.2 persistence/schema | Still open; new service does not reconcile the legacy DB |
| 2 input pipeline | Live weather + modeled PM seed connected; other required inputs remain open |
| 3 true coupled model | Still open; experimental parameterization is not WRF-Chem |
| 4 inversion/stubble | Pressure-level indicator connected; physical profile validation and transported fire plumes remain open |
| 5 / 5.1 forecasts/baselines | New PM2.5 model supersedes old module for serving; multipollutant/AQI and independent 72-hour evaluation remain open |
| 6 / 6.2 homepage integration | Model-backed workspace implemented; full spatial/coupled requirements remain open |
| 7 validation/submission | Smoke tests progress; scientific acceptance not complete |

## Requested Folder Cleanup

Requested root folders: data, ml model1, models, results, vayusense_ml_project. Permanent removal was blocked by safety review twice; ALL remain present. A recovery archive exists at tmp/retired-model-folders-20260916.tar.gz; all 49 regular source files were compared byte-for-byte via SHA-256 with archived contents successfully. The new serving path does not use those folders. Legacy synthetic engine's automatic ml model1 metadata dependency was removed. Further cleanup needs resolution of the safety review/explicit approval; do not silently bypass it. Keep the archive local (it contains project datasets/models).

## Before Submission

1. Rehearse Live and Demo modes and restart both services once.
2. Present baseline versus XGBoost honestly; describe Hybrid as experimental.
3. Do not select unsupported non-NCR regions or present the point map as high-resolution spatial predictions.
4. Prioritize stable demo/export and evidence documentation over new 3D effects or unvalidated numerical features.
5. Keep phase status honest; do not mark all pending phases complete based on model delivery.
