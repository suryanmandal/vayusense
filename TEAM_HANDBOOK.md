# VayuSense SIH26082: Team Handbook

Prepared 2026-09-14 for all six team members. Read this before specializing in your assigned task. This is a shared learning and interview-preparation document, not a claim that the proposed system is already built.

## 1. Project Identity and One-Minute Explanation

| Item | Working project information |
| --- | --- |
| Project | VayuSense, adapted from our earlier municipal air-quality prototype |
| Problem ID | SIH26082 |
| Title | Air Pollution-Weather Coupled Forecasting System (Delhi NCR Focus) |
| Organization / department | Ministry of Earth Sciences / National Centre for Medium Range Weather Forecasting |
| Category / theme | Software / Clean & Green Technology |
| Main output | High-resolution Delhi NCR air-quality forecasts for the next 72 hours |
| Defining requirement | Two-way interaction between weather and pollution, including inversion and stubble-burning transport |

These details follow the problem statement supplied by the team lead. The official listing was not independently retrievable during our audit. Do not present team preparation priorities as an official judging rubric.

Suggested explanation, in your own words:

> We are building VayuSense for Delhi NCR to forecast air quality for the next 72 hours. Weather changes how pollutants move and accumulate, while aerosols can change radiation and local weather. Our proposed system uses a coupled weather-chemistry model, adds diagnostics for temperature inversions and regional burning, and presents the results on a forecast dashboard. We are reusing our earlier web and GIS prototype; the coupled scientific pipeline and its validation are still being developed.

Update the final sentence when the evidence changes. Everyone should be able to give this explanation without reading it.

## 2. The Actual Problem

An air-quality observation tells us what a station measured at a particular time. A forecast estimates what may happen later. SIH26082 needs more than a map of current AQI: it needs a forecast that accounts for interactions between atmospheric physics and chemical transport.

In the supplied Delhi NCR scenario, a shallow, stable atmosphere can limit vertical mixing. Regional smoke may arrive while local emissions continue, allowing pollution to accumulate. Aerosols also interact with sunlight and atmospheric heating, which can change mixing and pollutant transport. The magnitude and even the direction of particular weather responses depend on conditions; we must calculate and evaluate them rather than promise that every episode behaves identically.

Delhi MCD is not all of NCR. Our display must cover the verified NCR area, including relevant surrounding cities, while the numerical domain must also include upwind sources and a transport buffer. Punjab and Haryana matter for the proposed burning analysis, but they are not the only possible pollution sources.

## 3. Vocabulary Everyone Must Understand

| Term | Plain-language meaning | Important distinction |
| --- | --- | --- |
| PM2.5 / PM10 | Particle size fractions with aerodynamic cutoffs of 2.5 / 10 micrometers | Concentration is commonly expressed in micrograms per cubic meter; it is not AQI |
| Aerosol | Suspended solid or liquid particles in air | Aerosols affect radiation differently depending on composition and conditions |
| O3 | Ozone; the target here is ozone near the ground | A satellite ozone column is not a surface ozone measurement |
| NOx | Usually NO plus NO2 in this modeling context | Preserve definitions and units; NOx is not interchangeable with NO2 |
| VOC | Volatile organic compound; some participate in ozone chemistry | Ozone needs precursor chemistry, not just a particle transport calculation |
| AQI | An index derived from pollutant concentrations using defined rules | It has no concentration units and is not model accuracy |
| Meteorology | Atmospheric conditions such as wind, temperature and humidity | Future weather fields are needed, not just current weather |
| PBL | Planetary boundary layer, the lower atmosphere influenced by the surface | PBL height describes a mixing-related layer; low PBL alone does not prove an inversion |
| Temperature inversion | A layer where temperature increases with height | Diagnose from a vertical profile, not a winter checkbox |
| Dispersion / transport | Mixing and movement of pollutants | A drawing of wind arrows is not a concentration forecast |
| Emissions inventory | Estimate of how much of each pollutant sources release in place and time | Emissions are a source rate, not ambient concentration |
| FRP | Fire radiative power, an observation associated with fire energy release | It is not directly the mass of smoke arriving in Delhi |
| Initial / boundary conditions | Starting atmospheric state / conditions entering the model domain | Poor inputs can limit forecast quality even with a good solver |
| Spin-up | Initial model adjustment period before the evaluated forecast | Do not count it as part of the promised 72-hour outlook |
| Grid spacing | Distance between numerical grid points/cells | Smaller rendered hexagons do not create finer physical forecast skill |
| Issue time / valid time | When a forecast run is issued / the time a prediction refers to | Store UTC, show the display timezone explicitly |
| Lead time | Time from forecast issue to forecast validity | Lead 72 is 72 hours ahead, not 72 charts or samples at arbitrary intervals |
| Hindcast | Running a forecast setup for a historical period | Useful for evaluation; identify it as historical |
| Baseline | A simple comparison forecast, such as persistence | Shows whether extra model complexity adds value |
| Provenance | Traceable origin and processing history of data/output | Essential for explaining any number shown to a judge |

Ground-level ozone forms through photochemical processes involving NOx and VOCs; it is not simply emitted as a smoke particle. This is why the chemical mechanism and its precursor inputs matter. [EPA ozone explanation](https://www.epa.gov/ozone-pollution-and-your-patients-health/what-ozone).

## 4. The Central Idea: Two-Way Coupling

One-way example: supply wind and temperature to an ML predictor, and obtain PM2.5. The prediction never changes the weather calculation.

Our proposed coupled workflow allows weather to influence transport, mixing and reactions, and allows modeled aerosol effects on radiation to influence meteorology again. The solver advances these processes through time. Chemical components can modify radiation and clouds, but the selected model configuration must support the interactions we claim. [NCAR physics documentation](https://www2.mmm.ucar.edu/wrf/site/documentation/users_guide/physics.html).

```text
Weather: wind, temperature, mixing, radiation
                 |
                 v
Pollutant transport and chemical evolution
                 |
                 v
Aerosol effects on radiation/heating
                 |
                 v
Changed meteorology -> further pollutant evolution
```

WRF-Chem is our proposed numerical framework, subject to a successful build and compatible scientific configuration. It is not currently implemented in this repository. A feedback switch alone is not evidence: we need output from controlled runs. Two-way grid nesting is also different from two-way weather-chemistry coupling.

We plan two matched experiments:

| Experiment | What changes | What it answers |
| --- | --- | --- |
| Feedback enabled versus disabled | Aerosol radiative feedback setting, with other forcing/configuration controlled | How did coupling change radiation, weather and pollutants in this case? |
| Fire emissions enabled versus disabled | Fire source emissions, with other inputs controlled | What modeled difference did burning produce over NCR? |

Run differences are sensitivity estimates, not automatically exact real-world source percentages. Improved accuracy must be tested against observations separately.

## 5. Inversions and Stubble Burning

For an inversion, inspect temperature versus height above ground. Report the diagnosed layer base/top, depth, temperature difference and gradient, with the method and profile source. For illustration only, a rise from 15 C to 18 C across a 200 m layer gives a temperature difference of 3 C and an average gradient of 1.5 C per 100 m. That arithmetic is not a universal strong-inversion threshold or a measurement from our app. Production diagnosis must handle elevated/multiple layers and missing profiles.

For burning, our planned chain is:

1. Acquire timestamped satellite fire detections and quality information.
2. Use agricultural context to assess whether detections plausibly relate to crop residue.
3. Estimate species emissions, timing and injection height using a documented method.
4. Feed those emissions into modeled transport and chemistry under evolving weather.
5. Show plume evolution, estimated NCR arrival and concentration sensitivity with uncertainty.

FIRMS provides fire detections, not a direct Delhi smoke-contribution measurement. Clouds, coverage, emissions assumptions and transport introduce limitations. [NASA active-fire products](https://firms.modaps.eosdis.nasa.gov/active_fire).

## 6. Data We Need and How We Use It

The following are required input categories and candidate sources, not claims that access is already configured.

| Input | Purpose | Evidence needed before calling it ready |
| --- | --- | --- |
| Station observations, e.g. permitted CPCB/CAAQMS data | Surface pollutants and held-out evaluation | Real sample, units, timestamps, station identity, access conditions and coverage |
| Weather fields and vertical profiles | Model initialization/boundaries and inversion diagnostics | Suitable variables, spatial/vertical coverage, forecast cycle and format |
| Chemical initial/boundary fields | Pollutants already present or entering the domain | Species mapping, units, coverage and compatible mechanism |
| Anthropogenic/biogenic inventory | Non-fire pollutant source inputs | Version, sector/species, spatial/time allocation and units |
| Fire detections and agricultural context | Regional burning emissions preparation | Quality, timing, location and a supported conversion method |
| Satellite column products | Additional spatial context and possible validated model constraints | Product identity, quality filtering and physically appropriate use |
| Boundary, terrain and land-use data | NCR selection and model preprocessing | Source/version, CRS, geometry and model compatibility |

Satellite NO2 columns cannot simply be relabeled as surface PM2.5. H3 can index data but cannot add information absent from a coarse input. [Copernicus products](https://sentiwiki.copernicus.eu/web/s5p-products), [H3 resolution statistics](https://h3geo.org/docs/core-library/restable/).

Acquiring data is not the same as assimilating it. Assimilation is a defined method for updating the modeled state using observations. Until such a method exists and is tested, describe our work as ingestion, preprocessing or comparison, as appropriate.

## 7. Proposed System From Input to Screen

```text
Observations + weather + chemistry boundaries + emissions
                         |
                 Validation and provenance
                         |
              Preprocessing and coupled worker
                         |
               Hourly forecast model outputs
                         |
       Inversion/fire diagnostics + AQI + evaluation
                         |
               FastAPI -> Next.js/Mapbox
```

| Component | Job | Current versus planned |
| --- | --- | --- |
| Next.js / React | Pages, controls and browser state | Existing prototype, scientific views need connection |
| Mapbox | Geographic map rendering | Existing; verified NCR layers still needed |
| FastAPI | Serve model products and structured results | Existing scenario API; forecast contracts planned |
| PostgreSQL / PostGIS | Structured records and geographic queries | Scaffolding exists; competing schemas need repair |
| H3 | Hexagonal spatial indexing | Helpers exist; API compatibility and use need verification |
| WRF-Chem worker | Coupled numerical forecast | Planned, separate from web request handling |
| Numerical file storage | Store large gridded model output | Planned; NetCDF or suitable chunked representation |
| RF / XGBoost | Baselines or validated postprocessing | Legacy synthetic-data scenario implementation exists |
| Scheduler and run registry | Track execution, failure and publication | Planned |

The model runs on suitable compute infrastructure. A web request reads prepared products; it does not run a 72-hour numerical experiment in the browser. Final compute cost and latency require a benchmark. The proposed 9 km/3 km grids, possible 1 km refinement and 12-hour issuance are team proposals, not official requirements or achieved performance.

Trace one selected cell through the system: choose run -> choose pollutant and valid hour -> read output for that location -> inspect units, QC and provenance -> show the map/series and relevant diagnostics. All views must use compatible run/time selections.

## 8. AQI and Forecast Validation

We plan to output hourly PM2.5, PM10, O3 and NOx, with NO2 identified separately where needed for AQI. Indian AQI requires pollutant-specific averaging, breakpoints and availability rules. It is not the instantaneous PM2.5 value. Early forecast hours need preceding history to construct valid averaging windows. [CPCB AQI report](https://cpcb.nic.in/displaypdf.php?id=bWFudWFsLW1vbml0b3JpbmcvQVFJX05BTVBfUmVwX1NlcHRlbWJlcjIwMTYucGRm).

Validation uses observations withheld from fitting/tuning, with chronological separation and station holdouts where appropriate. Compare with persistence and weather-only ML. Evaluate winter inversion/burning cases and ozone episodes, reporting results for leads 1-24, 25-48 and 49-72 hours.

| Measure | Meaning | How to explain it |
| --- | --- | --- |
| MAE | Mean absolute error | Average magnitude of error in the pollutant's units |
| RMSE | Root mean squared error | Gives greater weight to large errors |
| Mean bias | Average signed prediction error | Whether we tend to overpredict or underpredict |
| AQI category agreement | Agreement in category assignment | Must accompany concentration errors and sample counts |
| Interval coverage | How often observations fall in a stated prediction interval | Needed before claiming calibrated uncertainty |
| Runtime and freshness | Time to produce/publish output and age of inputs | Needed for an operational forecast claim |

Do not claim a numerical accuracy level before evaluation. Evaluate weather/PBL behavior and inversion diagnostics as well as pollutant concentration. A technically coupled model can still perform poorly with unsuitable emissions, settings or input data.

## 9. What Exists Today

The 2026-09-14 source audit found reusable screens, map integration, PostGIS/SSE scaffolding, satellite request code and a PM2.5 ML scenario endpoint. It did not verify live integrations, training provenance of model binaries or real-world predictive skill.

The current API returns 12 steps, defaults to fixed meteorological values, and the training script defaults to synthetic Mumbai data. The homepage 72-hour chart is decorative. No coupled solver, physical inversion diagnostic or fire-emission transport workflow was found. Satellite routing and shared database definitions also need repair.

Our internal estimate of 20-30% requirement readiness is subjective and not a competition score, forecast accuracy, or percentage of development time remaining. The earlier image's own arithmetic totals 69.75%, but its completion claims were unsupported. Present concrete completed features and open gaps instead of selling a percentage. Details: [source assessment](SIH26082_Assessment.md).

## 10. Likely Questions and Honest Answer Guides

These are preparation prompts, not predictions of the official judging process. Answer in your own words and point to evidence when it exists.

| Question | Core answer |
| --- | --- |
| What exactly are you solving? | A 72-hour NCR air-quality forecasting problem with weather-chemistry feedback, inversion and regional burning transport. |
| Why isn't an AQI map enough? | It shows a state; the requirement asks for future evolution and the physical processes affecting it. |
| What is new versus your previous project? | The previous project supplies a municipal UI/backend foundation. NCR scientific inputs, coupled modeling, diagnostics and real validation are the main additions. |
| Why isn't weather plus XGBoost sufficient? | Weather features can support a baseline, but their pollutant predictions do not themselves update the weather solver. |
| Why WRF-Chem? | It is the proposed framework for linked meteorology and chemistry. We still must prove a compatible build/configuration and a reproducible case. |
| Did you invent WRF-Chem? | No. Our contribution is the application workflow, regional configuration, data preparation, diagnostics, validation and usable forecast products we actually build. |
| What is your novelty versus existing forecasting services? | Our intended focus is transparent coupling/inversion/fire diagnostics linked to NCR forecasts. Novelty and comparative performance require a documented comparison; we claim neither world-first status nor superiority today. |
| How will you prove two-way coupling? | Show controlled feedback-on/off configurations and the resulting radiation, weather and pollutant outputs. |
| Does coupling guarantee better accuracy? | No. It represents relevant processes; measured comparison decides whether this configuration improves skill. |
| How do you detect an inversion? | Diagnose a temperature increase with height in a profile and report layer metrics, method and missing-data handling. |
| Is low PBL the same as inversion? | No. They are related mixing diagnostics but not interchangeable measurements. |
| How do you know a fire is stubble burning? | We need quality-filtered detections plus agricultural context; attribution has uncertainty. |
| How do you calculate burning's Delhi contribution? | Prepare emissions, model transport and compare controlled fire-on/off runs; label the result a modeled sensitivity. |
| Why include ozone? | It is explicitly required and involves photochemical precursor reactions, so a PM-only predictor cannot satisfy the statement. |
| Does the satellite measure surface PM2.5? | The current NO2 column product does not. Surface concentrations need appropriate data/model methods and validation. |
| Why 72 hours? | It is the stated forecast horizon; we must provide correctly timestamped outputs through it. |
| Does 72-hour horizon mean a 72-hour runtime? | No. Lead time is the predicted future; runtime is the time compute takes to produce it. |
| Why not just increase the current loop to 72? | The target alignment, future forcing, pollutants, coupling and evaluation would still be missing. |
| What does high resolution mean here? | Native numerical grid spacing and evaluated spatial behavior, stated separately from map display resolution. |
| Is H3 resolution 8 proof of high accuracy? | No. It is an indexing geometry, not a scientific accuracy measure. |
| Where do your data come from? | Explain the source register's verified samples and access status; distinguish candidates from operational connectors. |
| What happens when data or a model run fails? | Preserve the last complete run with an age/stale label and report failure. Do not silently fabricate fresh output. |
| Is your demo live? | State precisely whether it is a live forecast, an archived numerical replay, a baseline or synthetic data. |
| How accurate is it today? | We have no verified real-world accuracy to quote yet; inherited metric constants are not evaluation evidence. |
| Why do you need ML if there is a physics model? | ML can be a simple comparison or validated bias correction; it does not replace the coupling requirement. |
| What are the compute costs? | Unknown until measured. Present benchmark configuration, wall time and resources once available. |
| Who benefits and how? | Analysts and regional planners can inspect predicted pollution windows and their modeled weather/fire context; actual usefulness needs user feedback. |
| Does the system directly reduce emissions? | Forecasting supports decisions; it does not itself remove pollutants or establish the effect of a policy. |
| What happens to agents and compliance features? | They are secondary; they cannot substitute for required scientific outputs. |
| Can you guarantee perfect forecasts or SIH selection? | No. Requirement coverage, predictive skill and judging outcomes are separate. |
| What did you personally contribute? | Explain your real deliverable, decision, evidence and limitation, then describe how it connects to another member's work. |
| What if you don't know a detail? | State what you know, identify what remains unverified, and locate the relevant artifact. Do not invent an answer. |

## 11. Demo Story Every Member Should Practice

1. State the problem and identify the currently available demo mode.
2. Select an NCR location and show run issue time, selected valid time and resolution.
3. Inspect the 72-hour pollutant/AQI series when that feature exists; do not show the old chart as evidence.
4. Inspect an inversion profile and explain what the diagnostic actually measures.
5. Show fire inputs and modeled plume evolution, distinguishing detection from impact.
6. Compare controlled coupling experiments and explain their interpretation.
7. Open held-out evaluation, data provenance and one known limitation.

Until these features exist, use this as a proposed walkthrough. Never narrate absent steps as completed.

## 12. Shared Preparation Routine

Every member learns the problem, vocabulary, pipeline, current gaps and basic evaluation logic. Specialist ownership does not exempt anyone from explaining the overall system.

Run a short daily rotating teach-back: one person explains the problem, another explains a component outside their own assignment, and a third asks follow-up questions. Rotate until all six have done each role. Each workstream teaches its finding to the full group when handing it over.

Before a presentation, each member should be able to answer five random questions, trace one value to its source/run, explain one failure case, name one current limitation and describe their own contribution. This is a team practice check, not an official judging threshold.

Maintain a factual claim list: claim, evidence path, verification date, owner, and status. After a phase passes its gate, update this handbook and remove outdated current-state statements. Do not update a claim merely because a screen was added.

## 13. Where to Read Next

- [Task assignments](TEAM_TASKS.md): who starts what now and what counts as done.
- [Requirements](Prd.md): mandatory R1-R8 acceptance matrix.
- [Priority phases](Phases.md): dependencies and release gates.
- [Architecture](Architecture.md): storage, workers and proposed APIs.
- [Design](Design.md): dashboard behavior and visual semantics.
- [Rules](Rules.md): scientific and implementation standards.
- [Assessment](SIH26082_Assessment.md): detailed code evidence and additional primary references.

External references explain scientific concepts; they do not verify our implementation. The handbook intentionally includes unknowns so every member can explain the project accurately.
