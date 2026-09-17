import unittest
from backend.src.production_ml_engine import ProductionMLEngine

class TestProductionMLEngine(unittest.TestCase):
    def setUp(self):
        self.engine = ProductionMLEngine()

    def test_physical_guardrails_pm_ordering(self):
        # Even if PM2.5 is reported higher than PM10, PM10 must be enforced >= PM2.5
        bounded = self.engine.apply_physical_guardrails(
            pm25=120.0,
            pm10=80.0,
            no2=25.0,
            o3=30.0,
            co=1.0,
            so2=10.0
        )
        self.assertGreaterEqual(bounded["PM10"], bounded["PM2.5"])
        self.assertGreater(bounded["PM2.5"], 0.0)

    def test_72h_timeline_generation(self):
        weather = [{"timestamp": f"2026-09-15T{i:02d}:00:00Z", "boundary_layer_height": 700.0, "wind_speed_10m": 3.5, "temperature_2m": 25.0, "relative_humidity_2m": 55.0} for i in range(1, 73)]
        timeline = self.engine.generate_72h_forecast_timeline(
            station_id="Alipur",
            base_concentrations={"PM2.5": 85.0, "PM10": 160.0, "NO2": 32.0, "O3": 40.0, "CO": 1.1, "SO2": 12.0},
            weather_horizon=weather,
            fire_attribution_pct=22.0
        )
        self.assertEqual(len(timeline), 72)
        self.assertIn("naqi", timeline[0])
        self.assertIn("dominant_pollutant", timeline[0])
        self.assertEqual(timeline[0]["station_id"], "Alipur")
        self.assertTrue(timeline[0]["naqi"] > 0)
        self.assertIn("ventilation_coeff_m2s", timeline[0]["meteorology"])

if __name__ == "__main__":
    unittest.main()
