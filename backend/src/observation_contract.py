"""Normalized surface observations; independent of database/model startup."""

from __future__ import annotations

import argparse
import json
from datetime import timezone
from pathlib import Path
from typing import Literal, Optional, Union

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator


class Observation(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)

    schema_version: Literal["1.0"]
    station_id: str = Field(min_length=1)
    longitude: float = Field(ge=-180, le=180, strict=True)
    latitude: float = Field(ge=-90, le=90, strict=True)
    species: Literal["PM2.5", "PM10", "O3", "NO2", "NOx"]
    value: Optional[float] = Field(default=None, ge=0, strict=True)
    unit: Literal["ug/m3", "ppb", "ppm"]
    averaging_minutes: int = Field(gt=0, strict=True)
    valid_time: AwareDatetime
    received_time: AwareDatetime
    source: str = Field(min_length=1)
    source_record_id: str = Field(min_length=1)
    raw_file: str = Field(min_length=1, description="Reference to preserved raw input, not credentials")
    raw_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    data_kind: Literal["observed", "replay", "synthetic"]
    quality: Literal["unverified", "valid", "suspect", "missing"]
    nox_basis: Optional[Literal["molar_sum", "NO2_equivalent_mass"]] = None

    @field_validator("valid_time", "received_time")
    @classmethod
    def normalize_utc(cls, value):
        return value.astimezone(timezone.utc)

    @model_validator(mode="after")
    def check_semantics(self):
        if self.received_time < self.valid_time:
            raise ValueError("received_time precedes observation valid_time")
        if (self.value is None) != (self.quality == "missing"):
            raise ValueError("null value requires missing quality and vice versa")
        if self.species in ("PM2.5", "PM10") and self.unit != "ug/m3":
            raise ValueError("particulate concentration requires ug/m3")
        if self.species == "NOx":
            expected = "NO2_equivalent_mass" if self.unit == "ug/m3" else "molar_sum"
            if self.nox_basis != expected:
                raise ValueError("NOx basis must match concentration units")
        elif self.nox_basis is not None:
            raise ValueError("nox_basis applies only to NOx")
        return self


def validate_batch(records):
    if not isinstance(records, list) or not records:
        raise ValueError("Input must be a nonempty JSON array of observations")
    observations = [Observation.model_validate(record) for record in records]
    seen = set()
    for record in observations:
        key = (record.source, record.source_record_id, record.station_id,
               record.species, record.valid_time, record.averaging_minutes, record.data_kind)
        if key in seen:
            raise ValueError("Duplicate observation identity in batch")
        seen.add(key)
    return observations


def main():
    parser = argparse.ArgumentParser(description="Validate a normalized observation JSON array without database access")
    parser.add_argument("input", type=Path)
    args = parser.parse_args()
    try:
        records = validate_batch(json.loads(args.input.read_text(encoding="utf-8")))
    except ValidationError as exc:
        # Print locations/types only; raw input may contain private source metadata.
        print(json.dumps({"valid": False, "errors": [
            {"field": list(e["loc"]), "type": e["type"]} for e in exc.errors()
        ]}))
        raise SystemExit(1)
    except (ValueError, OSError):
        print(json.dumps({"valid": False, "error": "Unreadable JSON, empty/non-array input or duplicate observations"}))
        raise SystemExit(1)
    print(json.dumps({"valid": True, "records": len(records),
                      "data_kinds": sorted({r.data_kind for r in records})}))


if __name__ == "__main__":
    main()
