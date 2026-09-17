import unittest
from src.fire_emissions import (
    DEFAULT_AGRICULTURAL_EMISSION_FACTORS,
    FireDetection,
    FireEmissionEstimate,
    calculate_emissions,
    estimate_injection_height,
    process_fire_batch,
)


def fire_fixture(**changes):
    base = dict(
        detection_id="FIRMS-VIIRS-20261015-001",
        latitude=30.375,
        longitude=75.855,
        acq_datetime="2026-10-15T08:30:00+05:30",
        satellite="NOAA-20",
        instrument="VIIRS",
        confidence="nominal",
        frp_mw=45.5,
        bright_ti4_k=342.1,
        bright_ti5_k=298.4,
        daynight="D",
        state_or_region="Punjab",
        source="NASA_FIRMS",
        raw_file="fire_nrt_J1V_C2_305012.csv",
        raw_sha256="a" * 64,
        data_kind="observed",
    )
    base.update(changes)
    return base


class FireEmissionsTests(unittest.TestCase):
    def test_fire_detection_utc_normalization(self):
        record = FireDetection.model_validate(fire_fixture())
        self.assertEqual(record.acq_datetime.isoformat(), "2026-10-15T03:00:00+00:00")
        self.assertEqual(record.satellite, "NOAA-20")
        self.assertEqual(record.state_or_region, "Punjab")

    def test_numeric_confidence_requires_value(self):
        with self.assertRaises(ValueError):
            FireDetection.model_validate(fire_fixture(confidence="numeric", confidence_value=None))

        record = FireDetection.model_validate(fire_fixture(confidence="numeric", confidence_value=85.0))
        self.assertEqual(record.confidence_value, 85.0)

    def test_rejects_invalid_coordinates_and_frp(self):
        for bad in [dict(latitude=95.0), dict(longitude=-190.0), dict(frp_mw=-5.0)]:
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                FireDetection.model_validate(fire_fixture(**bad))

    def test_emissions_calculation_accuracy(self):
        det = FireDetection.model_validate(fire_fixture(frp_mw=100.0))
        est = calculate_emissions(det, pblh_m=1000.0)

        # 100 MW * 0.368 kg/MJ = 36.8 kg/s biomass burned
        self.assertAlmostEqual(est.biomass_consumption_rate_kg_s, 36.8, places=2)

        # PM2.5 = 36.8 kg/s * 7.2 g/kg = 264.96 g/s
        self.assertAlmostEqual(est.emission_fluxes_g_s["PM2.5"], 264.96, places=1)
        # CO = 36.8 kg/s * 92.0 g/kg = 3385.6 g/s
        self.assertAlmostEqual(est.emission_fluxes_g_s["CO"], 3385.6, places=1)

        self.assertGreater(est.plume_top_m, est.plume_bottom_m)
        self.assertGreater(est.injection_layer_pbl_fraction, 0.0)

    def test_injection_height_bounds(self):
        bot, top, pbl_frac = estimate_injection_height(frp_mw=0.0)
        self.assertEqual(bot, 0.0)
        self.assertEqual(pbl_frac, 1.0)

        bot_high, top_high, frac_high = estimate_injection_height(frp_mw=500.0, pblh_m=800.0)
        self.assertGreater(top_high, bot_high)
        self.assertLessEqual(frac_high, 1.0)

    def test_process_fire_batch_and_deduplication(self):
        records = [
            fire_fixture(detection_id="FIRE-01", frp_mw=20.0),
            fire_fixture(detection_id="FIRE-02", frp_mw=30.0, state_or_region="Haryana"),
        ]
        detections, estimates = process_fire_batch(records)
        self.assertEqual(len(detections), 2)
        self.assertEqual(len(estimates), 2)

        # Duplicate ID should fail
        with self.assertRaises(ValueError):
            process_fire_batch([fire_fixture(detection_id="DUPLICATE"), fire_fixture(detection_id="DUPLICATE")])


if __name__ == "__main__":
    unittest.main()
