# SIH26082 Evidence-Based Assessment

Audit date: 2026-09-14. Scope: first-party application source, configuration, project Markdown and the user's attached readiness image. No deployed service, private external project, actual model artifact provenance, live provider access, forecast execution or forecast accuracy was verified.

## Requirements Basis

The user supplied SIH26082: Air Pollution-Weather Coupled Forecasting System (Delhi NCR Focus), MoES/NCMRWF, Software, Clean & Green Technology. The [official listing](https://sih.gov.in/sih2026PS) could not be retrieved during this audit; search did not establish the individual listing. The supplied text is the working specification. Its image is an external estimate, not an official rubric or execution evidence. The referenced PDFs were not supplied.

The essential requirement is a high-resolution Delhi NCR forecast through 72 hours, using a two-way weather-chemistry framework, with PM2.5 and ground-level ozone central to the forecast; PM10 and NOx also belong in the workflow. Inversion strength and regional stubble-burning dispersion must be explicit outputs.

## Correcting the Image

Its arithmetic is:
`0.20*95 + 0.20*90 + 0.20*80 + 0.25*40 + 0.15*45 = 69.75%`.
Thus approximately 72% does not follow from its displayed values. More significantly, the claimed completion levels are not supported by the repository.

For an apples-to-apples comparison only, retain its unofficial weights:

| Pillar | Image match | Audit estimate | Weight | Weighted points |
| --- | ---: | ---: | ---: | ---: |
| High-resolution geospatial/dashboard | 95% | 65% | 20% | 13.00 |
| Telemetry/remote sensing | 90% | 35% | 20% | 7.00 |
| 72-hour forecasting | 80% | 15% | 20% | 3.00 |
| Two-way weather-chemistry coupling | 40% | 0% | 25% | 0.00 |
| Inversion/stubble tracking | 45% | 5% | 15% | 0.75 |
| Total | 69.75% calculated | | 100% | 23.75 |

These are reviewer judgments of implementation coverage, not measured scores, probabilities, official weights or forecasts of judging outcomes. Credit reflects reusable components, with low credit where an essential behavior is absent. A reasonable communication range is **20-30% implemented requirement readiness**, leaving roughly **70-80% of requirement coverage** to establish. That is not 70-80% of lines of code, cost or calendar time. UI reuse and scientific readiness are different quantities. No amount of UI scoring compensates for absent two-way coupling.

## Code Evidence

| Finding | Source evidence | Implication |
| --- | --- | --- |
| Map and selection components exist | `frontend/src/app/dashboard/home/page.tsx`; `frontend/src/context/MunicipalContext.tsx:27` defaults to MH | Reusable interface; pan-India selection is not validated NCR coverage |
| H3 resolution 8 helpers exist | `backend/src/services/raster_engine.py`, calls `geo_to_h3` and `h3_to_geo` | Indexing scaffold, not demonstrated high-resolution numerical forecasts; declared dependency permits incompatible newer H3 APIs |
| Ground feed is not established | `frontend/src/app/api/telemetry/stream/route.js` polls SQL; `frontend/src/lib/seed.js` inserts mock Mumbai records; vector page defines `mockSensors` | An SSE connection does not prove CPCB/CAAQMS ingestion |
| Database definitions conflict | `frontend/src/lib/schema.sql` uses integer facilities, industry_id, cluster_category and telemetry facility_id/created_at; `backend/src/models/spatial.py` uses UUID facilities, facility_id/category and telemetry h3_index/timestamp | Requires migrations and one schema before shared operation can be claimed |
| Satellite request implementation exists | `frontend/src/app/api/geospatial/satellite/route.js` requests Mumbai NO2 PNG imagery | Provider access, numeric assimilation and NCR configuration remain unverified |
| Satellite UI endpoint mismatch | Satellite page calls `/api/geospatial/satellite/sync`; handler is `/api/geospatial/satellite`; no sync handler or rewrite was found | Fix and exercise actual request path |
| Forecast API is 12 hours | `backend/src/api/routes.py:43` loops `range(1, 13)`; returns `trajectory_12h` | Not a 72-hour forecast; no timestamped gridded multi-pollutant outlook |
| Training defaults to synthetic data | `backend/src/ml/train_ensemble.py:19`; random features and algebraic `pm25_forecast_72h` target | A target name does not establish 72-hour predictive skill; provenance of existing binaries remains unverified |
| Training/inference horizon mismatch | A single synthetic target named 72h is recursively used as an hourly forecast; lag-24h remains baseline | Needs actual horizon-aligned labels and backtesting, not just changing 12 to 72 |
| Meteorology is fixed | Routes use wind direction 180, temperature 28, humidity 75 and inversion flag 0 | Not future meteorological forcing or diagnosed inversion |
| Headline forecast is decorative | `frontend/src/app/dashboard/home/page.tsx:1026` uses CSS spline classes and literal RMSE | A chart title is not proof of a forecast pipeline |
| Metrics cannot support accuracy claims | Routes return RMSE 11.42; training prints actual metrics and a separate fixed audit line | Replace displayed constants with reproducible evaluation artifacts |
| No coupled solver found | No WRF-Chem build/run assets, namelists, emissions preprocessors, chemical boundaries or model outputs in first-party source | No evidence of pollutant feedback into radiation, temperature, wind or PBL |
| No physical inversion or fire pipeline found | Boolean inversion training feature only; no vertical-profile diagnosis, FIRMS ingestion, biomass emissions or transported fire tracer | Both core scientific workflows remain to build |

## Scientific Distinctions

Weather variables fed to ML provide one-way statistical prediction. Demonstrating two-way coupling requires a compatible model configuration in which aerosols affect radiation and meteorology, which then affect transport and chemistry. Run controlled feedback-enabled and feedback-disabled experiments. The NCAR support discussion documents the aerosol-radiation feedback option and compatible radiation choices; configuration must be checked for the pinned model version. [NCAR WRF-Chem guidance](https://forum.mmm.ucar.edu/threads/does-the-shortwave-radiation-dudhia-scheme-ra_sw_physics-1-have-shortwave-radiation-feedback-direct-effect.12723/).

H3 resolution 8 has average hexagon area about 0.737 km2 and average edge length about 0.531 km; this is not proof of sub-kilometer model skill. Display remapping cannot create finer physical information. Label native grid spacing, satellite footprint and display resolution independently. [H3 cell statistics](https://h3geo.org/docs/core-library/restable/).

Sentinel-5P NO2 and ozone column products are not direct surface PM2.5 or ground-level ozone measurements. Preserve species, units, product identity and quality information; deriving surface concentrations requires a supported method and validation. [Copernicus product definitions](https://sentiwiki.copernicus.eu/web/s5p-products).

FIRMS provides satellite active-fire detections. Detections alone do not identify crop residue with certainty or quantify the resulting Delhi PM2.5 contribution. Add agricultural context, emissions estimation, injection assumptions and transport; evaluate fire-on versus fire-off sensitivity. [NASA active-fire data](https://firms.modaps.eosdis.nasa.gov/active_fire).

Indian AQI is calculated from pollutant subindices with specified averaging periods, including 8-hour CO/O3 and 24-hour values for other listed pollutants. CPCB also specifies minimum pollutant availability. Implement the full cited rules, completeness and boundary handling; do not relabel instantaneous PM2.5 as AQI or apply NO2 breakpoints directly to NOx. [CPCB AQI report](https://cpcb.nic.in/displaypdf.php?id=bWFudWFsLW1vbml0b3JpbmcvQVFJX05BTVBfUmVwX1NlcHRlbWJlcjIwMTYucGRm).

## What Counts as Full Alignment

The acceptance matrix in [Prd.md](Prd.md) defines completion. All mandatory requirements need executable behavior and retained evidence: data manifests, model configuration, reproducible runs, real 72-hour outputs, coupled sensitivity results, inversion profiles, transported fire impact and held-out evaluation. Complete requirement coverage is not 100% forecast accuracy or a guarantee of SIH selection.

The recommended approach is to keep the web application, establish trustworthy NCR data contracts, and start a small real coupled-model experiment immediately alongside ingestion. Scale after measuring compute needs. A replay of a genuine archived model run can support an honest demonstration; it does not establish a real-time production service. A synthetic feedback formula or an ML-only surrogate does not close the coupling requirement.
