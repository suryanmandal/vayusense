# Priority Phases: SIH26082

Latest UI scope correction: preserve original /dashboard/home; Phase6.2 model-backed workspace lives separately at /dashboard/forecast. Legacy home remains a labeled demo, not the model-backed page. No scientific acceptance gates changed.

## Latest Checkpoint: 2026-09-16

Phase 6.2 model-backed homepage integration is implemented. See MODEL_INTEGRATION_HANDOFF.md for acceptance evidence, local launch and remaining gates. New delhi_pm25_openmeteo_complete 2 service supplies PM2.5 baseline/XGBoost/experimental hybrid and live weather/CAMS seed. Old Phase5.1 module repair is superseded for deployment by this replacement; independent evaluation is still pending. Phase1.1 remains partial and Phase1.2, true coupling, inversion validation/stubble transport, multipollutant AQI, spatial forecasting and final evaluation remain open. Do not carry over historical completion claims as scientific acceptance. Requested old-folder removal remains blocked; verified recovery archive exists.

### Phase 6.2: Model-Backed Homepage [IMPLEMENTED - PM2.5 PROTOTYPE]

Mode selector (Baseline/XGBoost/Experimental Hybrid), explicit Live/Demo source, 72-hour comparison/scrub/playback, diagnostic weather, point map and provenance/export are connected to actual inference through a Next.js proxy. WRF-Chem unavailable until real outputs exist. Build, actual-model self-test, one live request and responsive browser checks passed at this checkpoint; see handoff for limits. Full parent Phase6 is not closed by point forecasts. Next: deploy both services, rehearse fallback, validate scientific outputs and integrate missing source/boundary/transport contracts.

Updated 2026-09-14. This replaces inherited all-completed milestones. Existing dashboard/backend assets are partial reuse, not completed SIH capabilities. P0 means critical dependency; P1 means required delivery work; P2 means optional after mandatory gates.

## Phase 0: Requirements and Evidence Audit [DOCUMENTED]

Priority P0. Delivered in this change: code-based assessment, corrected scoring, R1-R8 acceptance matrix and revised project documents. Documentation completion does not change implementation readiness.

Exit evidence: [assessment](SIH26082_Assessment.md), [requirements](Prd.md), architecture/design/rules/memory and scoped mockup notes. Official listing confirmation remains open because retrieval failed.

## Phase 1: NCR Foundation and Integration Repairs [IN PROGRESS]

P1-A checkpoint (2026-09-14): Delhi default selection, repaired satellite UI route, validated selected-location preview bounds throughout request/metadata/raster flow. Node bounds tests pass (2), frontend build passes (23 pages), and local malformed-bounds request returns 400. Remote provider success and visual UI are not verified. Preview extent is not official NCR geography. Schema migration, real observations and verified boundaries remain open; see TASKS.md. Phase exit gate has NOT passed.

Priority P0. Depends on Phase 0. Suggested owner: full-stack/data engineer.

- Replace Mumbai-centric runtime defaults and synthetic geometry with verified NCR boundaries/stations; retain an upwind regional domain.
- Unify SQL/SQLAlchemy schemas using migrations; exercise ingest -> SQL -> API -> UI.
- Fix satellite route mismatch and parameterize region; verify provider request and numeric product assumptions.
- Pin compatible H3 APIs; correct metric spatial queries; confirm copied Python/Node environments.
- Add explicit observed/forecast/replay/synthetic states and data-source metadata; remove unsupported live/accuracy claims from the active experience.

Exit: one provenance-tagged NCR observation reaches the UI through the shared schema; a failed or stale input is visibly flagged; satellite route is exercised; boundary source and station IDs are documented. A seed record cannot satisfy this gate. Covers R1/R2 foundation.

### Phase 1.1: Real NCR Data and Boundaries [PARTIALLY DELIVERED]

Assigned to Member 2 on 2026-09-14; both delivery folders reviewed 2026-09-15. Six Delhi daily reports (20 rows), two planning PDFs, source notes and a 227-city AQI snapshot delivered. Estimated full-phase coverage 55%, 45% remaining; see MEMBER2_REVIEW.md for the explicit rubric. Hourly sample, station IDs/coordinates, confirmed units/timezone/source metadata and executable boundary geometry remain open. Five reported daily intervals end after report generation and need completeness clarification. PDF fallback accepted as reference evidence; full phase exit NOT passed. Independent engineering continues.

### Phase 1.2: Schema and Observation Integration [IN PROGRESS]

Implemented a standalone Pydantic observation contract and batch validator with six passing tests. Contract documentation: backend/OBSERVATION_INPUT.md. Added frontend/scripts/inspect-db.mjs for read-only deployed-schema inspection. Its local execution found DATABASE_URL missing in frontend/.env.local; no database connection/migration occurred. The copied backend/.venv/bin/python3 also cannot execute; tests used the bundled Python runtime with Pydantic 2.13.5.

Remaining: restore/configure local backend/database environment, inspect deployed schema, implement/test a versioned non-destructive migration, then connect observations to storage/API/UI. Member 2's real input is needed for end-to-end validation, not for contract/schema preparation. No ingestion endpoint or schema reconciliation is claimed complete.

## Phase 2: Observations, Weather and Emissions [PLANNED]

Priority P0. Depends on Phase 1 contracts; acquisition research can start immediately. Suggested owner: data engineer with atmospheric scientist.

- Establish permitted station data access for PM2.5, PM10, O3 and NO2/NOx availability; record actual coverage.
- Acquire weather initial/boundary conditions, vertical temperature/wind profiles and chemical boundaries appropriate to the model.
- Obtain anthropogenic/biogenic inventories and fire detections for Punjab/Haryana and other relevant upwind sources.
- Define QC, deduplication, unit conversion, mechanism speciation, emission timing and injection height assumptions.
- Retain raw input manifests and select archived winter burning/inversion and ozone episodes for reproducible evaluation.

Exit: repeatable, timestamped NCR dataset plus sufficient regional inputs for a model experiment; missing intervals and provider limitations quantified. FIRMS fire points alone do not close the emissions requirement. Covers R2 and inputs to R6.

## Phase 3: Real Coupled-Model Experiment [PLANNED]

Priority P0, highest scientific risk. Start compute/build feasibility in parallel with Phases 1-2; full experiment depends on Phase 2 inputs. Suggested owner: atmospheric model engineer.

- Pin WRF-Chem or a justified equivalent, build environment, compatible chemistry/aerosol/radiation/photolysis options and preprocessing.
- Run a small real-data case with spin-up and a controlled aerosol-feedback on/off pair.
- Retain hourly chemistry and meteorology; compare radiation, temperature, wind, PBL and pollutant response.
- Benchmark resources; choose regional/NCR grids and vertical resolution. Initial 9 km/3 km grid proposal is not an official requirement; assess 1 km feasibility later.
- Extend the successful configuration to 72 forecast hours and measure whether it can finish within the proposed 12-hour issue cadence.

Exit: reproducible model configuration, logs, raw outputs, input hashes, resource report and physically reviewed feedback comparison. A parameter switch without verified outputs or an ML feedback heuristic fails the gate. Covers R1/R3/R4 foundation.

## Phase 4: Inversion and Stubble Diagnostics [PLANNED]

Priority P0. Depends on Phase 2 data and Phase 3 model/profile outputs. Suggested owner: atmospheric scientist/backend engineer.

- Diagnose surface-based and elevated inversions from vertical temperature and height; report base/top/depth, delta temperature, gradient and algorithm definition.
- Publish PBL height and ventilation diagnostic with units and assumptions; low PBL alone is not proof of inversion.
- Convert fire information to emissions with agricultural context, uncertainty and injection assumptions.
- Produce time-dependent plumes using model transport, with projected NCR arrival and concentration sensitivity from fire-on/off runs.
- Test no-inversion, multiple-layer, missing-profile and no-fire cases.

Exit: traceable inversion metrics against reviewed profiles and a real burning episode with transported plume outputs and fire sensitivity. Animated arrows without concentration transport fail the gate. Covers R5/R6.

## Phase 5: Forecast Products, AQI and Baselines [PLANNED]

Priority P1, mandatory. Depends on Phase 3 outputs; AQI and evaluation contracts can begin earlier. Suggested owner: ML/backend engineer.

- Expose 72 consecutive hourly leads for PM2.5, PM10, O3 and NOx, plus weather; identify NO2 separately for AQI.
- Implement versioned CPCB subindices, averaging, completeness and category boundaries; supply pre-issue history.
- Build persistence and weather-only ML baselines using real, correctly aligned labels and chronological station/date holdouts.
- Replace inherited metric constants with generated evaluation artifacts; add uncertainty calibration where supported.
- Preserve native resolution and raw versus bias-corrected results.

Exit: contract checks for timestamps, horizon, units, missingness and AQI examples; measured baseline and model metrics by pollutant and lead window. Never close this phase by lengthening the existing loop alone. Covers R3/R8 foundation.

### Phase 5.1: Supplied ML Baseline Repair and Validation [PENDING - READY TO START]

Priority P1. Can start independently of full coupled outputs. Review completed 2026-09-15: ML_PROJECT_REVIEW.md. Preserve vayusense_ml_project originals and other IDE changes; implement in a separate integration area using existing backend conventions.

- Record raw/cleaned provenance, station IDs/coordinates, units, timezone, interval semantics, checksums and cleaning lineage. Mask sentinels with QC flags, not zero replacement. Reconcile 1,347 target discrepancies against the delivered preparation script.
- Reindex each station to an hourly timeline; preserve missingness; construct lags and targets by timestamps. Define issue time and target valid time, and share tested feature construction between training/inference.
- Encode station identity consistently; reject unsupported stations and malformed future weather. Require 72 unique consecutive future hours, correct weather location, and no observations after issue time.
- Regenerate data/model/metadata/predictions/metrics reproducibly. Compare with current-observation persistence on identical rows; fit preprocessing only on training data, split/purge by label valid time and include held-out winter/stubble and ozone-season cases.
- Evaluate genuine recursive 72-hour forecasts without future pollution observations; resolve stale PM10/NO2/O3 inputs explicitly. Report metrics by station/species and 1-24/25-48/49-72-hour lead windows. Add multi-species outputs and AQI through existing contracts in subsequent Phase 5 work, not unsupported labels.
- Test missing hours, sentinels, station one-hot vectors, first-step alignment, recursive lag advancement, duplicate/short weather horizons and split boundaries.

Exit: reproducible corrected baseline and 72-hour evaluation artifacts, tests passing, explicit provenance/limitations and documented comparison against persistence. Do not require or claim improvement unless measured. This subphase does not prove coupled modeling, close parent Phase 5 or close Member 2's boundary/provenance task. Update Memory.md/TASKS.md/Phases.md at each checkpoint.

## Phase 6: Delhi NCR Forecast Dashboard [PLANNED]

Priority P1, mandatory. Depends on Phase 5 contracts and Phase 4 diagnostics; layouts can proceed using clearly labeled fixtures. Suggested owner: frontend engineer.

- Make NCR forecast map the main experience, with station/cell selection and an hourly 72-hour timeline.
- Add PM2.5/PM10/O3/NOx/AQI layers, weather/PBL layers, inversion profile and stubble-plume views.
- Show issue/valid times, native/display resolution, run and source provenance, freshness and uncertainty.
- Add coupling/fire experiment comparisons, observation versus forecast charts and informational forecast alerts.
- Verify desktop/mobile layout and real API interactions; support missing data, failed runs and archived replay.

Exit: user can trace a selected forecast and inversion/fire signal back to the published model run; map/time/species changes remain synchronized. Covers R1/R7 and presentation of R3-R6.

### Phase 6.1: Homepage Forecast Workspace Redesign [PENDING - READY TO START]

Added 2026-09-15 at the user's request for implementation in another IDE. Priority P1. Owner: frontend implementer, reviewed by team lead. May start independently of Phase 1.1 using explicit demo fixtures or unavailable states; verified scientific outputs are required for full Phase 6 completion.

**Objective:** transform /dashboard/home into a Delhi NCR map + 72-hour timeline + diagnostic panel workspace. Reuse existing application components and inspect the newer /dashboard/forecast page before editing to avoid duplicate dashboards or conflicting state. Preserve unrelated changes made by other IDEs.

**Required changes:**

1. Replace the three large color/shape explanation boxes with a compact collapsible Emission Sources legend containing four functional toggles: Industry & Power (yellow triangle), Road Transport (cyan marker/road corridor), Construction & Road Dust (purple square), and Crop-Residue Burning (distinct fire icon). Names describe sources, not shapes. Keep supported pollutant descriptions in secondary details/tooltips; do not imply universal measured coverage.
2. Remove unsupported fixed source percentages and hard-coded accuracy claims from the homepage. Distinguish observed fire detections from estimated agricultural attribution and modeled plume impact. Source locations without verified data must be absent or explicitly demo-only.
3. Provide separate weather-layer controls for wind, PBL height and inversion. These are not emission sources. Every enabled layer needs a visible legend and data availability status.
4. Add a compact top context bar with NCR location, selected run, issue time, selected valid time and observed/forecast/replay/demo status. Display native grid spacing separately from map/H3 resolution when known.
5. Make the map the main surface. Add a pollutant selector: AQI, PM2.5, PM10, O3, NO2 and NOx where supported. Clearly distinguish index versus concentration units, and NO2 versus NOx. Unsupported products show unavailable, never invented values.
6. Add a fixed-height hourly 72-hour slider/stepper with playback controls and lead/valid-time labels. Map, chart and diagnostics share selected location, run, pollutant and valid hour. Use actual timestamped fixture/API series, not a decorative CSS curve.
7. Add compact Forecast, Inversion and Burning tabs in the diagnostic panel. Forecast shows selected-location series and evidence-backed uncertainty if available. Inversion shows vertical profile, layer metrics and PBL separately. Burning shows detections, modeled transport/arrival when available and provenance.
8. Put model validation and coupling/fire experiment comparisons in a secondary area or link to the existing forecast/validation routes. Move agent logs, directories and compliance exports out of the primary homepage space while preserving access through existing navigation.

**Implementation boundaries:** inspect frontend/src/app/dashboard/home/page.tsx, dashboard/layout.tsx, dashboard/forecast/page.tsx, api/forecast/72h/route.ts, MunicipalContext.tsx and Design.md. Audit whether the existing forecast route supplies synthetic or real results before using it. Reuse suitable logic; do not assume a filename or prior task checkbox proves physical modeling. Do not alter backend science, raw Member 2 files, credentials or database schemas for this UI task.

**Data-independent milestone:** layouts, interaction state and clearly labeled demo/unavailable modes can complete now. Fixture timestamps and values must be deterministic and distinguishable from observations. Never interpolate the submitted daily reports into purported hourly observations. Provider failures must not silently switch to demo data.

**Acceptance checklist:**

- [ ] Four compact source toggles replace large explanation cards; weather controls remain separate.
- [ ] Layer toggles, selection, timeline and tabs work; each meaningful control changes the corresponding view or explains unavailable data.
- [ ] All visible views share run/time/location; obsolete asynchronous responses cannot overwrite a newer selection.
- [ ] No unsupported source percentages, live badges, RMSE, uncertainty or verified-boundary claims remain in the redesigned homepage.
- [ ] Loading, empty, unavailable, stale, failed and explicit demo states are implemented; no pollutant value is fabricated to fill a gap.
- [ ] Keyboard-accessible controls and named icons/tooltips; readable legends and units; no clipped or overlapping text at 390px mobile, 768px tablet and 1440px desktop widths.
- [ ] npm run build --prefix frontend passes. Focused interaction checks cover toggles, timeline synchronization and failure states; Playwright screenshots confirm map/chart layout on desktop and mobile. If external map tiles are unavailable, record that limitation and verify the fallback rather than claiming complete map rendering.
- [ ] Record changed files, commands/results, screenshot paths and remaining integration gaps in TASKS.md and Memory.md. Start a local preview on an available port and provide its URL.

Exit: reviewed homepage UI meets this checklist. If only demo-backed behavior is verified, mark Phase 6.1 UI COMPLETE - DEMO DATA, leaving parent Phase 6 and scientific requirements open. Do not imply that this redesign completes forecasting or raises measured scientific accuracy.

**Copyable prompt for the other IDE:**

> Read Memory.md, TASKS.md, Design.md and Phase 6.1 in Phases.md. Implement the homepage forecast workspace redesign at /dashboard/home, inspecting and reusing the existing /dashboard/forecast work where appropriate. Preserve unrelated changes. Build the compact four-source legend, separate weather layers, synchronized 72-hour timeline, pollutant selection and Forecast/Inversion/Burning panel. Use explicit demo or unavailable states until verified data exists; remove unsupported percentages and accuracy claims. Run the build and focused desktop/mobile interaction checks, provide a preview URL, and update Memory.md, TASKS.md and Phases.md with exact results and remaining gaps. Do not mark the parent scientific phases complete from this UI work.

## Phase 7: Validation, Operations and Submission Evidence [PLANNED]

Priority P0 final release gate. Depends on Phases 3-6. Suggested owners: whole team with domain reviewer.

- Evaluate held-out winter inversion/burning and ozone episodes, stations and lead windows 1-24, 25-48 and 49-72 hours.
- Report PM2.5/PM10/O3 and supported NOx metrics, AQI categories, weather/PBL diagnostics, sample counts, gaps and baseline comparisons.
- Assess coupling and fire sensitivities; report neutral/worse skill honestly instead of asserting improvement.
- Schedule repeatable cycles; test failure/retry/stale data, complete publication and compute latency.
- Package configurations, input manifests, output artifacts, reproducible commands, evaluation and a genuine archived fallback demonstration.
- Review R1-R8 against evidence before changing any status to complete.

Exit: every mandatory requirement has executable evidence and stated limitations; at least two consecutive operational cycles meet the agreed publication target, or real-time readiness remains explicitly open. Scientific quality criteria are agreed before evaluating the final holdout, not invented after seeing results.

## Phase 8: Optional Enhancements [DEFERRED]

Priority P2. Translation, additional cities, expanded agents, elaborate profiles and compliance workflow polish follow mandatory acceptance. They cannot substitute for coupling, inversion, burning transport or validation.

## Critical Path and Dependencies

Start data-access confirmation and coupled-model compute feasibility immediately. These determine achievable scope more than further UI polish. No calendar estimate is committed without team capacity, deadline, data availability and a numerical benchmark. Model configuration and emissions quality need atmospheric expertise.

Completion requires a change reference, runnable check or artifact, date and owner. Mockups, credentials, file presence and pre-existing COMPLETED labels are not verification.
