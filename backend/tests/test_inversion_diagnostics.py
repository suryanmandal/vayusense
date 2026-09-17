import unittest
from datetime import datetime, timezone
from src.inversion_diagnostics import (
    InversionDiagnosticResult,
    InversionLayer,
    VerticalLevel,
    classify_inversion_strength,
    classify_ventilation,
    diagnose_inversions_and_ventilation,
)


class InversionDiagnosticsTests(unittest.TestCase):
    def setUp(self):
        self.t_valid = datetime(2026, 12, 10, 0, 0, tzinfo=timezone.utc)

    def test_strong_surface_inversion_case(self):
        # Typical Delhi winter midnight sounding: strong surface inversion
        levels = [
            VerticalLevel(height_m_agl=0.0, pressure_hpa=1010.0, temperature_celsius=8.5, wind_speed_m_s=0.8),
            VerticalLevel(height_m_agl=150.0, pressure_hpa=995.0, temperature_celsius=12.0, wind_speed_m_s=1.2),
            VerticalLevel(height_m_agl=300.0, pressure_hpa=978.0, temperature_celsius=14.5, wind_speed_m_s=2.0),
            VerticalLevel(height_m_agl=500.0, pressure_hpa=955.0, temperature_celsius=13.0, wind_speed_m_s=3.5),
            VerticalLevel(height_m_agl=1000.0, pressure_hpa=900.0, temperature_celsius=9.0, wind_speed_m_s=5.0),
            VerticalLevel(height_m_agl=2000.0, pressure_hpa=800.0, temperature_celsius=1.5, wind_speed_m_s=7.0),
        ]

        result = diagnose_inversions_and_ventilation(
            levels=levels,
            station_or_cell_id="DELHI-SAFDARJUNG",
            latitude=28.58,
            longitude=77.20,
            valid_time_utc=self.t_valid,
            pblh_m=280.0,
            surface_wind_speed_m_s=0.8,
            profile_source="radiosonde_sounding",
        )

        self.assertTrue(result.has_surface_inversion)
        self.assertEqual(result.num_inversion_layers, 1)
        layer = result.layers[0]
        self.assertEqual(layer.inversion_type, "surface_based")
        self.assertEqual(layer.base_height_m, 0.0)
        self.assertEqual(layer.top_height_m, 300.0)
        self.assertEqual(layer.delta_temperature_c, 6.0)
        self.assertEqual(layer.strength_category, "severe")
        self.assertEqual(result.ventilation_category, "critical")
        self.assertEqual(result.trapping_potential, "severe")

    def test_no_inversion_unstable_daytime_case(self):
        # Summer/afternoon well-mixed convective boundary layer (normal lapse rate)
        levels = [
            VerticalLevel(height_m_agl=0.0, pressure_hpa=1005.0, temperature_celsius=32.0, wind_speed_m_s=4.0),
            VerticalLevel(height_m_agl=500.0, pressure_hpa=950.0, temperature_celsius=27.5, wind_speed_m_s=5.5),
            VerticalLevel(height_m_agl=1000.0, pressure_hpa=900.0, temperature_celsius=22.8, wind_speed_m_s=7.0),
            VerticalLevel(height_m_agl=2000.0, pressure_hpa=800.0, temperature_celsius=13.5, wind_speed_m_s=10.0),
        ]

        result = diagnose_inversions_and_ventilation(
            levels=levels,
            station_or_cell_id="DELHI-ITO",
            latitude=28.62,
            longitude=77.24,
            valid_time_utc=self.t_valid,
            pblh_m=1800.0,
            surface_wind_speed_m_s=4.0,
            profile_source="model_wrf_column",
        )

        self.assertFalse(result.has_surface_inversion)
        self.assertFalse(result.has_elevated_inversion)
        self.assertEqual(result.num_inversion_layers, 0)
        self.assertEqual(result.ventilation_category, "good")
        self.assertEqual(result.trapping_potential, "low")

    def test_multiple_elevated_inversion_layers(self):
        # Multiple elevated layers case (subsidence aloft)
        levels = [
            VerticalLevel(height_m_agl=0.0, pressure_hpa=1010.0, temperature_celsius=20.0),
            VerticalLevel(height_m_agl=200.0, pressure_hpa=990.0, temperature_celsius=18.0),
            # Elevated Inversion Layer 1 (200m -> 500m)
            VerticalLevel(height_m_agl=500.0, pressure_hpa=955.0, temperature_celsius=21.0),
            VerticalLevel(height_m_agl=800.0, pressure_hpa=920.0, temperature_celsius=17.0),
            # Elevated Inversion Layer 2 (800m -> 1200m)
            VerticalLevel(height_m_agl=1200.0, pressure_hpa=880.0, temperature_celsius=19.5),
            VerticalLevel(height_m_agl=2000.0, pressure_hpa=800.0, temperature_celsius=11.0),
        ]

        result = diagnose_inversions_and_ventilation(
            levels=levels,
            station_or_cell_id="DELHI-AIRPORT",
            latitude=28.56,
            longitude=77.10,
            valid_time_utc=self.t_valid,
            pblh_m=900.0,
            surface_wind_speed_m_s=3.0,
        )

        self.assertFalse(result.has_surface_inversion)
        self.assertTrue(result.has_elevated_inversion)
        self.assertEqual(result.num_inversion_layers, 2)
        self.assertEqual(result.layers[0].inversion_type, "elevated")
        self.assertEqual(result.layers[0].base_height_m, 200.0)
        self.assertEqual(result.layers[1].inversion_type, "elevated")
        self.assertEqual(result.layers[1].base_height_m, 800.0)

    def test_ventilation_coefficient_categories(self):
        self.assertEqual(classify_ventilation(1500.0), "critical")
        self.assertEqual(classify_ventilation(3200.0), "poor")
        self.assertEqual(classify_ventilation(5000.0), "moderate")
        self.assertEqual(classify_ventilation(7500.0), "good")


if __name__ == "__main__":
    unittest.main()
