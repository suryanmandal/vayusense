import unittest
from src.observation_contract import Observation, validate_batch


def fixture(**changes):
    base = dict(schema_version="1.0", station_id="TEST-ONLY", longitude=77.2,
                latitude=28.6, species="PM2.5", value=45.0, unit="ug/m3",
                averaging_minutes=60, valid_time="2026-09-14T10:00:00+05:30",
                received_time="2026-09-14T05:00:00Z", source="unit-test",
                source_record_id="sample-1", raw_file="synthetic-fixture.json",
                raw_sha256="0" * 64, data_kind="synthetic", quality="unverified")
    base.update(changes)
    return base


class ObservationTests(unittest.TestCase):
    def test_normalizes_offset_and_keeps_provenance(self):
        record = Observation.model_validate(fixture())
        self.assertEqual(record.valid_time.isoformat(), "2026-09-14T04:30:00+00:00")
        self.assertEqual(record.data_kind, "synthetic")

    def test_rejects_bad_coordinates_numbers_and_units(self):
        for changes in [dict(longitude=181), dict(latitude=-91), dict(value=-1),
                        dict(value=float("nan")), dict(value=float("inf")), dict(value="45"),
                        dict(unit="ppb"), dict(averaging_minutes=0), dict(averaging_minutes=True)]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                Observation.model_validate(fixture(**changes))

    def test_requires_timezone_chronology_and_provenance(self):
        for changes in [dict(valid_time="2026-09-14T10:00:00"),
                        dict(received_time="2026-09-13T00:00:00Z"), dict(source=" "),
                        dict(raw_sha256="bad"), dict(species="AQI"), dict(unexpected=True)]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                Observation.model_validate(fixture(**changes))

    def test_missing_values_are_not_zero(self):
        self.assertIsNone(Observation.model_validate(fixture(value=None, quality="missing")).value)
        for changes in [dict(value=None), dict(quality="missing")]:
            with self.assertRaises(ValueError):
                Observation.model_validate(fixture(**changes))

    def test_nox_basis_and_gas_units(self):
        Observation.model_validate(fixture(species="NOx", unit="ppb", nox_basis="molar_sum"))
        Observation.model_validate(fixture(species="NOx", nox_basis="NO2_equivalent_mass"))
        Observation.model_validate(fixture(species="O3", unit="ppm"))
        for changes in [dict(species="NOx"), dict(nox_basis="molar_sum"),
                        dict(species="NOx", unit="ppb", nox_basis="NO2_equivalent_mass")]:
            with self.assertRaises(ValueError):
                Observation.model_validate(fixture(**changes))

    def test_duplicates_include_timezone_equivalence(self):
        with self.assertRaises(ValueError):
            validate_batch([fixture(), fixture(valid_time="2026-09-14T04:30:00Z")])
        self.assertEqual(len(validate_batch([fixture(), fixture(species="PM10")])), 2)
        for bad in [[], {}, None]:
            with self.assertRaises(ValueError):
                validate_batch(bad)


if __name__ == "__main__":
    unittest.main()
