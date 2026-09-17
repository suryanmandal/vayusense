# Engineering and Scientific Rules: SIH26082

Updated 2026-09-14. Applies to future project implementation. [Prd.md](Prd.md) defines acceptance; [SIH26082_Assessment.md](SIH26082_Assessment.md) records current evidence.

## Scientific Integrity

- Distinguish implemented, tested, externally verified, planned and synthetic behavior.
- Never call weather-feature ML a two-way coupled model. Preserve solver configuration and actual feedback experiments.
- Do not claim 72-hour forecasting from a label or repeated single-horizon prediction. Verify lead times and correctly aligned training labels.
- Report model metrics from versioned evaluation artifacts, with dataset/split, units, lead window and sample count. No hard-coded performance claims.
- Keep physical grid, satellite footprint and display/H3 resolution separate.
- Treat satellite columns, surface concentrations, NOx and NO2 as distinct quantities.
- Apply documented Indian AQI rules, completeness and averaging; no inherited generic EPA threshold.
- Diagnose inversion from vertical profiles with a stated method. Do not equate low PBL or a winter boolean with a measured inversion.
- Fire detections, agricultural attribution, emissions and modeled receptor impact are different stages. Fixed source fractions are not evidence.
- LLM explanations may summarize structured evidence; they do not generate scientific measurements or official orders.

## Data and Configuration

- Preserve source, acquisition/valid/received times, units, QC and processing version. Store UTC, display timezone explicitly.
- Raw inputs, numerical configurations and generated outputs need provenance and checksums. A SHA-256 checksum alone does not make a ledger immutable or a report legally binding.
- Use WGS84 GeoJSON coordinate order longitude/latitude; use geography or an appropriate projected CRS for meter distances.
- Use one migrated database schema across consumers. Pin dependencies compatible with called APIs.
- Keep credentials server-side and out of documentation, logs, source control and exports. Do not publish local environment files.
- Label stale, missing, replay and synthetic data. Never silently substitute fixtures after a provider or model failure.

## Engineering Checks

For application changes, run the relevant frontend production build (`npm run build --prefix frontend`) and backend/API checks appropriate to the changed behavior. Verify external integration through the actual UI/API path; credentials and a successful build are insufficient.

For numerical changes, retain reproducible runs and compare physical diagnostics; for forecast changes, verify horizon, units, chronology and AQI rules. Test meaningful failure and missing-data cases.

For documentation-only changes, validate Markdown links, coverage, consistency and the diff; a frontend build is not required. Do not repeat historical build claims as a current test result.

Preserve user work. Use focused changes and clearly mark proposed endpoints/modules as proposed. No phase is complete without linked evidence.
