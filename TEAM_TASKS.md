# VayuSense SIH26082: Team Tasks

Prepared 2026-09-14 for six members including the team lead. Member 2's assignment was confirmed by the lead; other assignments remain proposed unless explicitly updated. No teammate deliverable has been reported complete.

Implementation update: P1-A has started Workstream A with Delhi defaults and satellite route/bounds repair. See [TASKS.md](TASKS.md) for actual code progress and [Memory.md](Memory.md) for resumption context. This does not imply that Members 2-6 have started their proposed assignments.

## Allocation Principle

Member 1 means you, the team lead; Members 2-6 are placeholders until real names and skills are mapped. Reassign a whole workstream to suit skills rather than changing the scientific requirement. Do not assume any member is already a WRF-Chem expert.

There are five necessary workstreams. Two people share the modeling/inversion work because it contains the greatest technical uncertainty. We are not creating six separate features just to occupy six people. When fewer tasks are ready, pair on a needed task, review another deliverable or practice the shared explanation; do not invent extra features.

Everyone reads [TEAM_HANDBOOK.md](TEAM_HANDBOOK.md). This is common preparation, not an additional specialist role. The assignments below give teammates useful research, data, prototype and verification work while the lead integrates the phase implementation.

## Assignment Overview

| Workstream | Assignment | Why needed | Starts now | Main phase link |
| --- | --- | --- | --- | --- |
| A. Integration and requirement evidence | Member 1: lead/integrator | Prevent conflicting contracts and unsupported completion claims | Yes | 1 and all gates |
| B. NCR observations and geography | Member 2: owner | We lack verified NCR observations and boundaries | Yes | 1-2, R1/R2 |
| C. Coupled modeling and inversion | Member 3: model owner; Member 4: profile/diagnostic partner | Solver feasibility and physical inversion outputs are core missing requirements | Yes, feasibility/preparation | 3-4, R4/R5 |
| D. Burning and emissions inputs | Member 5: owner | Fire markers alone cannot support a stubble-dispersion forecast | Yes | 2/4, R6 |
| E. AQI, validation and demo verification | Member 6: owner | We need correct index rules and credible tests before making accuracy claims | Yes, specification/fixtures | 5-7, R3/R7/R8 |

All workstreams are PLANNED. Role names describe responsibility, not demonstrated competence. If only three people have the necessary technical skills, use lead/reviewer pairs across these workstreams; do not force six independent implementations.

## Member 1: Integration and Evidence

**Task:** Own the shared application changes and decisions that connect the other members' outputs.

Start now:

1. Confirm the working statement and preserve an official copy if accessible. Record any differences from our supplied text.
2. Agree a minimal observation/run/forecast contract from Architecture.md so samples use consistent timestamps, units and IDs.
3. Integrate Phase 1 repairs: schema ownership/migrations, NCR defaults, satellite path and honest data status.
4. Maintain R1-R8 evidence/status and resolve input/configuration decisions raised by the other workstreams.

Deliverable: a short integration decision log, agreed sample contract, and reviewed changes with actual checks. Suggested future artifact: `team_outputs/A_integration.md`.

Done for the first handoff: the others know required fields, handoff format and accepted geographic scope; shared code ownership is clear. Done for Phase 1 requires its real observation-to-UI gate, not just the contract.

Dependencies: Members 2/5 supply real samples, Members 3/4 define model/profile needs, Member 6 reviews forecast/AQI semantics. Avoid owning all science personally: accept reviewed deliverables and connect them.

Must teach the team: how one input becomes a displayed forecast and which parts still do not exist.

## Member 2: Real NCR Data and Boundaries

Start with [MEMBER2_QUICK_START.md](MEMBER2_QUICK_START.md): exact official entry points, a small initial sample, accepted raw formats, source-note template and access/waiting guidance. The first delivery does not require coding or internal JSON normalization.

**Status: PARTIALLY DELIVERED / Phase 1.1 OPEN.** Both folders reviewed 2026-09-15: useful daily samples, reference PDFs and notes received. Estimated full-phase coverage 55%, with 45% remaining; [delivery review](MEMBER2_REVIEW.md) lists evidence, scoring and the focused follow-up request. Hourly data, station/source metadata and executable geography are not yet ready. Integration preparation continues as Phase 1.2. Internal normalization is not required from Member 2 for the collection handoff.

**Task:** Produce a verified, usable starting dataset and geography register.

Start now:

1. Identify permitted surface observation access and document which stations/species/time periods are actually available. Check PM2.5, PM10, O3 and NO2/NOx separately.
2. Obtain one small real NCR sample, preserving its original file/response and a normalized copy. Record station ID, coordinates, species, units, valid/received times, source and quality/missing flags.
3. Find a credible versioned NCR boundary and station coordinates; record CRS and coverage. Do not treat generated municipal shapes as verified borders.
4. Propose historical winter and ozone windows based on available coverage, without asserting pollution causes solely from high concentrations.

Deliverable: source register, raw/normalized sample, boundary source, variable dictionary and reproducible retrieval instructions. Suggested future artifact: `team_outputs/B_ncr_data.md`, with sample paths listed inside it.

Done: another member can trace and reproduce the sample, understands access conditions and missing data, and Member 1 can map it into the contract. A list of URLs or credentials alone is not enough.

If access is blocked: document the exact access limitation and provide a clearly labeled permitted historical alternative if available. Synthetic data cannot close the real-data gate. No need to wait for the app to be finished.

Reviewer/handoff: Member 6 checks units/time completeness; Member 1 integrates. Member 3 confirms temporal coverage fits a model case.

Must teach the team: where our observations come from, their coverage and why observation, forecast and satellite column data differ.

## Members 3 and 4: Coupled Model and Inversion

This is one shared workstream with two complementary tasks and one agreed experiment manifest.

### Member 3: Model Feasibility Owner

**Task:** Establish the smallest credible path to a real coupled run.

Start now:

1. Read official model documentation and identify a specific candidate version, supported chemistry/aerosol/radiation configuration and required input families.
2. Inventory available compute with the lead: OS, CPU, memory, storage, access and constraints. Do not assume the laptop can support the final nested operational run.
3. Write a build/preprocessing/run recipe and propose a small historical experiment using the team's available data.
4. Where resources are available, execute a small trial and record success/failure, logs, configuration and measured resource usage. Otherwise produce the exact unresolved dependency and next experiment.
5. Define a controlled feedback-on/off comparison and outputs needed to prove its effects. Full 72-hour execution follows a successful small test.

Deliverable: cited configuration rationale, input checklist, reproducible recipe and benchmark or blocker report. Suggested future artifact: `team_outputs/C_model.md`.

Done for preparation: another member can follow the recipe and identify every missing prerequisite. This does not close Phase 3. Phase 3 needs actual reproducible output and its acceptance evidence.

Handoff: give Member 4 output variable/height definitions, Member 5 required emission species/units, and Member 1 output format and run metadata. Request domain mentorship through the lead when needed; do not conceal a scientific configuration uncertainty.

Must teach the team: what coupling does, what the actual configuration enables and how the paired experiment tests it.

### Member 4: Inversion and Profile Partner

**Task:** Make the inversion method and its verification ready for model integration.

Start now:

1. Identify suitable real vertical temperature/height profiles for the proposed case, coordinating with Member 3 on location, time and height conventions.
2. Specify detection of surface-based/elevated inversions and outputs: base/top, depth, temperature difference, gradient, quality and PBL height kept distinct.
3. Create small labeled examples: no inversion, one inversion, elevated/multiple layers and missing levels. Synthetic examples are acceptable for method testing only.
4. Produce a small isolated diagnostic prototype or a precise worked method, with units and expected results. Review physical interpretation against primary references or a domain mentor.

Deliverable: profile source/sample, method note, examples with expected outputs, and prototype if feasible. Suggested future artifact: `team_outputs/C_inversion.md`.

Done for preparation: Member 3 can map model fields to the method and Member 6 can reproduce its example checks. Actual diagnostic acceptance still requires real profile/model output and review in Phase 4.

If model execution is pending: continue profile acquisition, worked examples and method review. Do not use that delay to add unrelated dashboard features.

Must teach the team: inversion versus low PBL, how strength is calculated and what missing profile data means.

## Member 5: Burning Inputs and Emissions

**Task:** Prepare fire information that can become model emissions, with an honest uncertainty chain.

Start now:

1. Obtain a small permitted FIRMS sample for a relevant upwind region and historical window; preserve acquisition time, coordinates, sensor, confidence and FRP where available.
2. Document quality filtering and agricultural context. Explain why every hotspot cannot automatically be called stubble burning.
3. Research a documented emissions estimation method and injection-height assumptions compatible with Member 3's mechanism. Identify units, temporal allocation and required species.
4. Register candidate non-fire emissions inventories and coverage gaps with Member 3; burning is only one input family.
5. Specify what a fire-on/off comparison holds fixed and what NCR arrival/concentration outputs it will examine.

Deliverable: reproducible fire sample, input dictionary, emissions-method note with sources/limitations and model mapping questions. Suggested future artifact: `team_outputs/D_burning.md`.

Done for preparation: Member 3 can evaluate compatibility and identify unresolved conversions; Member 2 can align location/time. A hotspot map alone does not close the task's emissions component or the plume requirement.

If conversion cannot yet be supported: mark the method unresolved and provide the missing inputs. Do not invent a universal FRP-to-Delhi-PM2.5 multiplier. Actual transport waits for the numerical model, but input preparation can start now.

Must teach the team: detection -> possible agricultural source -> estimated emissions -> modeled transport -> receptor sensitivity.

## Member 6: AQI and Independent Verification

**Task:** Define correct expected behavior and credible evaluation before results arrive.

Start now:

1. Read the CPCB AQI method and produce a referenced rule sheet covering pollutant identity, units, averaging, breakpoints, completeness and missing data. Review early forecast hours that need preceding history.
2. Prepare worked reference examples and boundary/missing-data cases with expected results. Check NO2 versus NOx and concentration versus AQI explicitly.
3. Write an evaluation plan with chronological/station holdouts, persistence/weather-only baselines, pollutant metrics and lead windows 1-24, 25-48, 49-72. Ask Member 2 which cases are supported by real data.
4. Prepare a dashboard acceptance checklist for selected run/time/species, stale and failed data, replay labels and provenance. Review whether the lead's implemented behavior matches it as phases land.

Deliverable: cited AQI examples, evaluation specification and demo/claim checklist. Suggested future artifact: `team_outputs/E_validation.md`.

Done for preparation: Members 1/2 review units and timestamp assumptions, and model owners can see exactly how outputs will be evaluated. Do not fill the results table with hypothetical accuracy values.

Later: execute evaluation on untouched holdouts and verify the connected dashboard. This role is substantive QA/scientific verification, not just making slides.

Must teach the team: how we know a forecast is useful, why the inherited RMSE is not evidence, and how AQI is derived.

## Handoffs and Work Order

| Milestone | Needed handoffs | Acceptance |
| --- | --- | --- |
| First coordination meeting | All six read handbook; lead maps names/skills to roles | Everyone can state the problem and current status; no claim that roles reflect known skills |
| First work session | A contract; B source/sample attempt; C configuration/profile plan; D fire sample/method; E AQI/test outline | Concrete files or a specific evidence-backed blocker, not just verbal progress |
| Input review | B/D provide provenance and samples; C confirms compatibility; E checks units/time | Agreed case and documented input gaps |
| Small model case | C run outputs and diagnostics, using compatible B/D inputs | Reproducible logs/output; no requirement closed by preparation alone |
| Forecast integration | A connects products; E tests contract and UI | Phase-specific acceptance passes with actual evidence |
| Presentation rehearsal | Each workstream teaches the others; rotate questioner and presenter | All members can explain the full system and their real contribution |

No calendar deadlines are invented here because the competition deadline and members' availability were not supplied. The lead can set dates after the first coordination meeting. Independent preparation starts immediately; full model and validation work follows its dependencies.

## Submission Format for Every Task

The `team_outputs` paths above are suggested deliverables to create when work is performed; they do not exist merely because this plan names them. Avoid uploading raw credentials or entire copied environments.

Each handoff should contain:

1. Question or requirement addressed and relevant phase/R-ID.
2. Work completed, with exact artifact paths and source links.
3. Raw versus normalized/synthetic status, units and timestamps where relevant.
4. Steps another person can use to reproduce or verify the result.
5. Result, limitations and exact blocker if any.
6. Next consumer, named reviewer and review status.
7. A short explanation suitable for teaching the rest of the team.

Use statuses PLANNED, IN PROGRESS, READY FOR REVIEW, VERIFIED or BLOCKED. VERIFIED means the named reviewer reproduced the relevant check; it does not automatically mean the entire linked phase is complete.

## Avoiding Duplicate Work

Member 1 owns shared integration files by default. Others work on their assigned evidence, samples and isolated prototypes; agree shared-file changes at handoff. Within Workstream C, Member 3 owns model configuration and Member 4 owns inversion-method artifacts.

If only three tasks remain actionable, assign three owners and use the other members as paired reviewers/learners on those tasks. Do not start translation, agent animation, profile polish or speculative extra cities just to keep people busy. A completed owner takes the next needed review or helps resolve a blocker.

## Common Team Responsibility

Each day, briefly share what changed, show the artifact, explain one limitation and name the next handoff. Rotate cross-topic questions from the handbook. Before the final demo, each member must explain a component outside their own workstream and distinguish current results from planned behavior.

This allocation prepares real inputs and verification for [Phases.md](Phases.md); it does not replace its acceptance gates or authorize unrequested spending, external outreach or deployment.
