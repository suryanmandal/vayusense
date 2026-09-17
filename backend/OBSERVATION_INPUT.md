# Phase 1.2 Observation Contract

Version 1.0 is implemented in src/observation_contract.py using Pydantic 2, already declared in requirements.txt. It can validate normalized samples without booting the ML server or connecting to PostGIS.

Member 2: preserve the real raw data and source metadata first. Raw provider files do not need to match this format; the integration step creates a JSON array with one record per species/station/time. Do not fabricate missing metadata. Use null plus missing quality for a missing concentration, not zero.

Required fields: schema_version (1.0), station_id, longitude, latitude, species (PM2.5/PM10/O3/NO2/NOx), value, unit (ug/m3, ppb or ppm), averaging_minutes, valid_time, received_time, source, source_record_id, raw_file, raw_sha256, data_kind and quality.

Times require a timezone and normalize to UTC; valid_time means the END of the reported averaging interval. received_time cannot precede it. Coordinates use WGS84. Particles require ug/m3; gas unit conversion is deliberately not performed without suitable assumptions. NOx requires nox_basis: molar_sum for ppb/ppm, NO2_equivalent_mass for ug/m3. Other species must omit that field.

data_kind is observed, replay or synthetic. quality is unverified, valid, suspect or missing. Use unverified until the documented QC procedure passes. A historical observation remains observed; replay describes explicitly replayed records. Keep source times intact. No default upgrades a record to valid or live.

raw_file identifies the retained original input; raw_sha256 is its lowercase SHA-256 checksum. The validator checks format, NOT file existence, checksum content, scientific truth, NCR membership, permissions or QC correctness. These remain integration/reviewer checks. Negative/sentinel readings must be handled in normalization while preserving the raw input.

From backend, in a working Python environment with Pydantic 2:

```sh
python -m src.observation_contract path/to/normalized-observations.json
python -m unittest discover -s tests -p 'test_observation_contract.py'
```

This is a data-validation component, not an ingest API, persistence layer or completed migration. The old telemetry tables remain unchanged. Duplicate identities in a batch are rejected; cross-batch deduplication is a persistence responsibility.
