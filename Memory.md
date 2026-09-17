# Project Memory: SIH26082

## Latest UI Correction: Preserve Original Homepage

User requested original homepage restored, not replaced. /dashboard/home again renders the preserved MainControlRoom, including its explicitly labeled demo fixture. /dashboard/forecast keeps the new model-backed workspace and existing Forecast Comparison navigation. New responsive shell styling applies ONLY to /dashboard/forecast. Legacy /api/forecast/72h restored for original home, with truthful synthetic metadata rather than WRF solver claims. New /api/forecast/models remains unchanged. This supersedes prior notes saying both pages share the new workspace or that legacy endpoint returns410.

## Latest Integration: 2026-09-16

Final verification: production build passed (25 routes; external font optimization warnings only), new integration tests2/2 passed, supplied live mock test passed. Real live proxy returned72 rows again after restart; unsupported coordinates400 and retired synthetic route410 verified. Production-preview Chrome checks1440/768/390 passed. Screenshots tmp/forecast-*.png; map tiles rendered in visual check. Preview uses npm run start on3100 and updated model service8001. A browser rerun during build/dev overlap timed out; restarting with production build resolved it. Do not run next build against a concurrent next dev cache during testing.

New package delhi_pm25_openmeteo_complete 2 is the active serving model. Read MODEL_INTEGRATION_HANDOFF.md first. Main homepage and forecast route share ForecastWorkspace, using /api/forecast/models -> FastAPI port 8001; Next.js port 3100. Baseline/XGBoost/Experimental Hybrid selector; WRF-Chem disabled, no solver found. Actual model self-test and live 72h provider/proxy call passed. Installed libomp and root .venv FastAPI/Uvicorn. Demo input endpoint explicit; no silent fallback. Retired synthetic 72h endpoint returns410. Added sunlight guard to experimental transform. Playwright widths1440/768/390 passed mode/timeline/error/overflow checks. Phases 1.1, coupling, transport, multi-species AQI and validation remain OPEN, not completed by weights. Deletion of five old root folders BLOCKED by safety review; all remain, with verified 49-file recovery archive in tmp. Old package audit remains historical, not an assessment of the replacement. Preserve other IDE changes.

## Latest Review: ML Delivery, 2026-09-15

Inspected vayusense_ml_project; see ML_PROJECT_REVIEW.md. Useful next-hour PM2.5 baseline, not sufficient SIH forecasting. Package-only scientific coverage estimate 25% (75% open), NOT current whole-project readiness. 129,301 rows/17 stations; saved metrics reproduce, but correct persistence beats XGBoost on common rows (MAE 8.72 vs 11.60). Found inference time alignment/station encoding bugs, row-based hourly lags across gaps, -9999 O3 and 1,347 supplied-target/preparation discrepancies. No artifact loading/retraining or original edits. Added Phase 5.1 PENDING for repair/evaluation. Other IDE now marks Phase 6.1 UI DEMO complete in TASKS.md; preserved, not audited here. Phase 1.1 remains partial pending provenance and boundaries despite new hourly-looking data.

Last updated: 2026-09-14.

## Latest Planning Handoff: Homepage UI, 2026-09-15

User requested a phase for another IDE to implement the discussed homepage redesign. Added Phase 6.1 PENDING - READY TO START under Phase 6 in Phases.md, with exact scope, acceptance checks and a copyable implementation prompt. Goal: /dashboard/home map + synchronized 72-hour timeline + Forecast/Inversion/Burning tabs; compact four-source legend including crop-residue burning; separate weather layers; remove unsupported percentages and scientific claims. Inspect/reuse newer /dashboard/forecast work, preserve other IDE changes and keep demo/unavailable states explicit. This is documentation only; no UI code changed. Phase 1.1 remains partially delivered. UI-only completion must not close parent Phase 6 or scientific gates. Keep TASKS.md/Memory.md/Phases.md updated after implementation.

## Latest Review: Member 2 Delivery, 2026-09-15

Read both member2_delivery and member2_delivery_update without editing originals. Phase 1.1 now PARTIALLY DELIVERED, not awaiting initial delivery and not complete. MEMBER2_REVIEW.md records a transparent 55% full-phase coverage estimate (45% remaining), not personal effort/whole-project readiness. Six original CPCB-labeled workbooks have 20 daily rows, AvgPeriod 24H, 80/80 target pollutant cells populated; NH3/SO2 blank at Burari/Pusa. Five bins end after generation and may be partial-day summaries. Update adds detailed source_notes.md and a 227-city AQI snapshot, NOT hourly records or station coordinates. IDs/coordinates, verified units/timezone/URLs and usable vector boundaries remain open. Two planning PDFs accepted as historical reference fallback; current geography not verified. Member 2 need not implement internal normalization. Other IDE scientific code/task advances were noticed and preserved, not audited in this delivery review.

## Member 2 Clarification

Added MEMBER2_QUICK_START.md after confusion about sources/formats/waiting. First handoff: original CSV/XLSX/JSON plus source notes, small station sample; official boundary vector if available, otherwise reference PDF with vector availability explicitly open. Internal JSON conversion/hashing belongs to integration, not Member 2's first collection task. CPCB homepage and NCRPB entry points verified; CCR export timed out, OGD resource returned a sandbox disclaimer, and no activation SLA or usable vector download was verified. Phase 1.1 remains pending. See guide for exact links and limitations.

## Latest: P1-B, Member 2 Assigned

User assigned Member 2 the real NCR data/boundary task. Track it as Phase 1.1 PENDING until delivery/review. Continue independent Phase 1.2 schema/observation integration; do not wait idle or duplicate his acquisition work.

Added backend/src/observation_contract.py, backend/tests/test_observation_contract.py and backend/OBSERVATION_INPUT.md: standalone Pydantic 2 contract, JSON-array CLI, timezone normalization, species/unit/NOx checks, provenance/missingness and batch deduplication. Six unit tests pass. No persistence or ingestion API yet. Added frontend/scripts/inspect-db.mjs (read-only metadata). Running it with frontend/.env.local stopped because DATABASE_URL is absent; deployed schema remains unknown and no migration was applied.

Environment: backend/.venv/bin/python3 fails with no such file. Tests ran from backend using /Users/suryanarayanmandal/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest discover -s tests -p 'test_observation_contract.py' (Pydantic 2.13.5). Other IDEs can use a working Python environment with Pydantic 2 from requirements.txt.

Next: configure/restore local DB and Python environment without exposing secrets; inspect schema; implement/test non-destructive migration and persistence. Member 2 input joins later for real-data validation. Update TASKS.md and Phases.md on every checkpoint. Frontend app code was unchanged in P1-B; no new frontend build required for the standalone inspector/contract. P1-A build result below is historical to that checkpoint.

## Resume Here: P1-A Checkpoint

Phase 1 is IN PROGRESS. Default selection is now Delhi. Satellite request route matches its handler; validated bounds pass through catalogue/processing requests and metadata to image coordinates. Helpers: frontend/src/lib/satelliteBounds.mjs. Tests: frontend/tests/satelliteBounds.test.mjs. POST /api/geospatial/satellite now requires JSON bounds [west, south, east, north]. The +/-0.25-degree municipality preview is NOT a verified NCR boundary.

Verification: Node tests passed (2); frontend production build passed (23 pages), with Google font optimization download warnings. Local reversed-bounds POST returned HTTP 400 before provider access. Preview started at http://127.0.0.1:3100; restart if absent. No successful remote provider, visual UI, real ingestion or database verification yet.

Next: TASKS.md lists ordered work, starting with non-destructive schema reconciliation and a provenance-tagged real observation path. Phases 2-7 remain planned. Update Memory.md, TASKS.md and Phases.md at every implementation checkpoint for efficient cross-IDE continuation. Environment files, database contents and model artifacts were unchanged.

The assessment, handbook and PDF reflect the earlier audit. Use this checkpoint and TASKS.md for current implementation status; historical findings below are retained as the baseline.

## Active Objective

Adapt the copied VayuSense project to SIH26082, Air Pollution-Weather Coupled Forecasting System (Delhi NCR Focus), for MoES/NCMRWF. Implementation has started; see the latest checkpoint above.

Working requirements come from the user's supplied problem statement. The SIH website could not be retrieved to verify its individual listing. The attached scoring image is an external estimate, not an official scoring rubric.

## Audit Findings to Preserve

- The image's displayed numbers total 69.75%, not approximately 72%.
- Current source-based implementation estimate is 20-30%, with illustrative weighted midpoint 23.75%. This is subjective requirement coverage, not accuracy, time remaining or an official score.
- Next.js/Mapbox UI, H3 utilities, PostGIS/SSE and API scaffolding are reusable.
- Training defaults to synthetic Mumbai data; binary training provenance is not verified.
- Scenario inference is 12 hours with fixed weather/inversion values; the homepage 72-hour plot is decorative.
- No real two-way coupled solver, physical inversion diagnosis or fire-emission transport workflow was found.
- Satellite requests are Mumbai-specific and the UI calls a nonexistent sync path.
- Frontend SQL and backend SQLAlchemy schemas conflict.
- Local credentials exist but were not used as proof of live data readiness.

Detailed evidence: [SIH26082_Assessment.md](SIH26082_Assessment.md).

## Decisions

Reuse the product shell and build the scientific pipeline around a real WRF-Chem or equivalent experiment. Start compute feasibility and data access early. ML can supply baselines and validated bias correction.

Prioritize NCR scope, data/schema repairs, coupled meteorology/chemistry, inversion/fire transport, 72-hour products/AQI, dashboard integration and evaluation. New requirements have IDs R1-R8. All implementation phases remain planned.

Initial 9 km/3 km domains, possible 1 km refinement and 12-hour issuance are proposals pending compute and science review, not SIH-mandated numbers or achieved capabilities.

## Open Dependencies

Official listing confirmation; team/deadline and compute capacity; permitted station/weather/chemical boundary inputs; suitable emissions inventory and speciation; model version and compatible schemes; verified NCR boundary; profile data and held-out winter/ozone cases.

No provider access, model execution, measured accuracy or fresh application build was verified in the documentation audit. The former claim of a successful 23-route build is historical and is not carried forward as current evidence.

## Documentation Change Record

Revised all seven root project Markdown files, added the evidence assessment and added SIH scope notes to all ten first-party mockup design documents. Dependency/generated Markdown is outside project documentation scope.

No application code, environment values, model artifacts or database records were changed. See [Phases.md](Phases.md) for the next implementation gates.

## Team Preparation

The team has six members including the lead. Added [TEAM_HANDBOOK.md](TEAM_HANDBOOK.md) for shared understanding and judge-question practice, and [TEAM_TASKS.md](TEAM_TASKS.md) for requirement-driven work. Member 1 provisionally means the lead; Members 2-6 need mapping to actual names/skills. Five needed workstreams use a two-person modeling/inversion pair. Assignments are proposals with immediate deliverables, reviewers and dependencies, not dispatched or completed work. Do not invent extra tasks just to keep every person independently occupied.
