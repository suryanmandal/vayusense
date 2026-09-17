# VayuSense for SIH26082

Air Pollution-Weather Coupled Forecasting System (Delhi NCR Focus).

Organization: Ministry of Earth Sciences (MoES). Department: National Centre for Medium Range Weather Forecasting (NCMRWF). Category: Software. Theme: Clean & Green Technology. These details follow the user-supplied statement; the SIH listing could not be independently retrieved on 2026-09-14.

## Current Status

VayuSense is a reusable municipal dashboard and backend prototype. It is not yet a validated 72-hour, two-way weather-chemistry forecasting system. The 2026-09-14 source audit estimates roughly 20-30% implemented requirement readiness, not an official SIH score or a measurement of engineering effort. No live data service or numerical model was run during this documentation audit.

Existing assets include Next.js/Mapbox screens, PostGIS scaffolding, an SSE database reader, a Copernicus request implementation, H3 helpers, and a PM2.5 ML scenario endpoint. Important gaps include real Delhi NCR ingestion, compatible database schemas, 72-hour multi-pollutant forecasts, coupled physics/chemistry, inversion diagnostics, fire emissions and transport, and measured validation.

## Documents

- [Implementation tracker](TASKS.md): completed checkpoints, verification commands and the next cross-IDE task. Read with Memory.md before resuming.
- [Team handbook](TEAM_HANDBOOK.md): shared project understanding, science, current status and judge-question preparation.
- [Team tasks](TEAM_TASKS.md): six-member allocation across five needed workstreams, immediate deliverables and handoffs.
- [SIH assessment](SIH26082_Assessment.md): evidence, corrected scoring, requirement coverage and scientific references.
- [Product requirements](Prd.md): scope and acceptance criteria.
- [Architecture](Architecture.md): existing components and proposed coupled workflow.
- [Priority phases](Phases.md): dependencies and completion gates.
- [Design](Design.md): Delhi NCR dashboard requirements.
- [Rules](Rules.md): scientific claims, data integrity and engineering checks.
- [Memory](Memory.md): current decisions and unresolved dependencies.

## Existing Development Commands

From the repository root:

```sh
npm run dev:frontend
npm run dev:backend
npm run build --prefix frontend
```

The backend script expects a working Python environment at `backend/.venv`, installed `backend/requirements.txt`, and an accessible PostGIS database. Its active entry point is `backend/src/main.py`; `backend/app/main.py` is a separate minimal service. Startup may train synthetic models if artifacts are absent.

Environment files are `backend/.env` and `frontend/.env.local`. Keep their values private. Configuration names can be inspected in source; credentials do not establish that a provider integration works. Copied dependencies and local service startup have not been revalidated in this audit.

The seed script creates Mumbai demonstration records, not live Delhi observations. The two database definitions currently conflict; resolve them before treating telemetry as integrated. See Phase 1.
