# Supplied ML Project Review

Reviewed 2026-09-15. Scope: `vayusense_ml_project`, not a fresh audit of all other IDE changes. Original delivery was not modified. Working requirements are the user's SIH26082 statement.

## Verdict and Estimate

Useful baseline/data contribution, NOT sufficient for the complete SIH system and NOT ready for production integration. Estimate: **25% coverage of the scientific forecasting requirements by this package; 75% remains outside or unfinished within it.** This is a subjective checklist score, not model accuracy, team effort, or overall application completion. Do not add it to earlier project percentages.

| Package requirement | Weight | Awarded |
|---|---:|---:|
| Traceable hourly NCR data and meteorology | 20 | 12 |
| Correct, reproducible and evaluated PM2.5 baseline | 20 | 10 |
| Operational, validated 72-hour forecast | 15 | 3 |
| PM10, O3, NOx forecasts and AQI | 10 | 0 |
| Spatial NCR forecasting and station/grid matching | 10 | 0 |
| Actual two-way meteorology/chemistry coupling | 15 | 0 |
| Inversion and stubble-emission transport | 10 | 0 |
| Total | 100 | 25 |

No credit here for dashboard/backend components elsewhere in the repository. A new whole-project percentage requires auditing those components and their integration too.

## Findings, Highest Priority First

1. **P1: Reported baseline advantage is misleading.** `src/train_pm25.py` uses `PM25_lag1h` against the next-hour target, despite calling it current-hour persistence. Recomputed saved XGBoost MAE/RMSE are 11.6314/17.9066 across 20,929 predictions, matching the supplied metrics. On the 20,848 rows with current PM25 available, proper current-value persistence gives MAE/RMSE **8.7179/14.7841**, versus XGBoost **11.6039/17.8611** on exactly those rows. The delivered model does not beat that baseline on this comparison. These are arithmetic checks on supplied labels, not a clean corrected re-evaluation.

2. **P1: Training and inference disagree about valid time.** `prepare_dataset.py` builds features at t to target t+1. `predict_72h.py:35` builds weather/time/lag features at future t but labels its output as t (line 75). Define forecast issue time, observation interval semantics and target valid time explicitly, then use one feature builder in both paths.

3. **P1: Station identity is lost in inference.** Training adds `station_*` one-hot columns. Inference sets only the raw `Station` string (line 39) and reindexes/fills absent model columns (lines 68-70); it never activates the selected station dummy. Reject unknown stations or define a tested fallback instead of silently imputing station identity.

4. **P1: Row offsets are not reliably hourly lags.** Dataset preparation uses row shifts without a complete hourly index. The delivered table has 1,717 within-station transitions longer than one hour. Inference additionally drops missing values before indexing lags (lines 44-46), compressing elapsed time. PM10/NO2/O3 append NaN and are then dropped, so their histories stay stale during recursion. It also accepts fewer than 72 rows, duplicate/gapped times, overlapping history and unfiltered multi-station weather without validation.

5. **P1: Data QC and reproducibility need repair.** O3 includes a -9999 sentinel at IIT_DELHI, 2025-12-06 13:00; `dropna` does not remove this. Supplied next-hour targets disagree with the supplied preparation script's simple next-row shift in 1,347 rows (NaNs compared equally). The training script does not write the delivered predictions or metadata artifacts. Preserve the originals and regenerate the complete pipeline with QC, artifact hashes, exact dependencies and documented cleaning rules before trusting model performance.

6. **P1: SIH's central scientific deliverables are absent from this package.** Only PM2.5 is predicted; PM10/NO2/O3 inputs are not their forecasts, and NO2 is not NOx. No coupled solver outputs, inversion profiles, stubble transport, AQI computation, spatial forecast field or validated 72-hour output is delivered. A PBL/weather feature is not proof of aerosol-to-weather feedback.

7. **P2: Data provenance and evaluation scope remain limited.** Weather header identifies one point (28.646748, 77.2748), Asia/Kolkata, reused for all stations. AQ source authenticity, raw-export lineage, pollutant units, station IDs/coordinates and AQ timestamp semantics were not established by the cleaned workbook. Need forecast weather available at issue time for operational validation, not hindsight weather. Current held-out period is May-August 2026; it does not establish held-out winter/stubble skill. Split on target valid time with boundary purging and rolling-origin evaluation.

## Verified Assets

- 129,301 engineered rows, 17 station labels, timestamps 2025-08-01 00:00 through 2026-08-01 22:00, no duplicate station/timestamp keys.
- PM25/PM10/NO2/O3 columns exist; missingness approximately 1.03%/1.87%/1.48%/1.54%, before sentinel QC.
- Complete-feature filtering retains 97,295 rows (75.25%): 76,366 train and 20,929 test; cutoff 2026-05-21 matches metadata.
- Saved predictions reproduce supplied model MAE/RMSE. This validates metric arithmetic only, not model provenance or hourly-label correctness.
- Clear README acknowledges representative-point weather and the distinction between ML and coupled modeling.

## Verification Limits

Read all three scripts, README, project notes, metadata and metrics. Used pandas/numpy to inspect data, workbook headers, missingness, time gaps, targets and recompute saved-prediction errors. Did not deserialize the joblib artifact, retrain, run the recursive forecast, access providers or verify raw government downloads. No application code, original data or model artifacts changed.

## Next Handoff

Implement Phase 5.1 in Phases.md first. Keep this package isolated until alignment, QC and baseline checks pass. Hourly-looking data materially expands the available inputs, but does not by itself close Member 2's provenance/boundary gate or Phase 1.1.
