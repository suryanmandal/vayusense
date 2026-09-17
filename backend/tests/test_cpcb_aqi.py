import unittest
from src.cpcb_aqi_engine import (
    CPCB_BREAKPOINTS,
    CpcbAqiResult,
    calculate_cpcb_aqi,
    calculate_sub_index,
)
from src.forecast_evaluation import (
    compute_evaluation_metrics,
    compute_persistence_forecast,
)


class CpcbAqiEngineTests(unittest.TestCase):
    def test_sub_index_pm25_calculation(self):
        # 15 ug/m3 -> Good (0-50 range)
        sub = calculate_sub_index("PM2.5", 15.0)
        self.assertIsNotNone(sub)
        self.assertEqual(sub.sub_index, 25)
        self.assertEqual(sub.category, "Good")

        # 45 ug/m3 -> Satisfactory (51-100 range)
        sub = calculate_sub_index("PM2.5", 45.0)
        self.assertEqual(sub.sub_index, 75)
        self.assertEqual(sub.category, "Satisfactory")

        # 185 ug/m3 -> Very Poor (301-400 range)
        sub = calculate_sub_index("PM2.5", 185.0)
        self.assertEqual(sub.sub_index, 350)
        self.assertEqual(sub.category, "Very Poor")

        # Extreme value > 500 ug/m3 capped at 500
        sub_high = calculate_sub_index("PM2.5", 650.0)
        self.assertEqual(sub_high.sub_index, 500)
        self.assertEqual(sub_high.category, "Severe")

    def test_overall_aqi_and_dominant_pollutant(self):
        # Delhi winter case: PM2.5 very high, PM10 high, NO2 moderate
        data = {
            "PM2.5": 210.0,  # sub-index ~ 370 (Very Poor)
            "PM10": 320.0,   # sub-index ~ 270 (Poor)
            "NO2": 65.0,     # sub-index ~ 82 (Satisfactory)
            "O3": 40.0,      # sub-index ~ 40 (Good)
            "CO": 1.5,       # sub-index ~ 75 (Satisfactory)
        }
        res = calculate_cpcb_aqi(data)
        self.assertTrue(res.valid)
        self.assertEqual(res.dominant_pollutant, "PM2.5")
        self.assertEqual(res.category, "Very Poor")
        self.assertGreaterEqual(res.aqi, 360)

    def test_cpcb_regulatory_minimum_rule(self):
        # Case 1: Missing particulate matter (only NO2, SO2, CO) -> Invalid
        bad_no_pm = {"NO2": 50.0, "SO2": 20.0, "CO": 1.2}
        res_no_pm = calculate_cpcb_aqi(bad_no_pm)
        self.assertFalse(res_no_pm.valid)
        self.assertIn("PM2.5 or PM10", res_no_pm.invalidation_reason)

        # Case 2: Only 2 pollutants present (PM2.5 and NO2) -> Invalid (<3 criteria pollutants)
        bad_two = {"PM2.5": 50.0, "NO2": 30.0}
        res_two = calculate_cpcb_aqi(bad_two)
        self.assertFalse(res_two.valid)
        self.assertIn("at least 3 criteria pollutants", res_two.invalidation_reason)

        # Case 3: 3 pollutants with PM2.5 -> Valid
        good_three = {"PM2.5": 50.0, "NO2": 30.0, "O3": 25.0}
        res_three = calculate_cpcb_aqi(good_three)
        self.assertTrue(res_three.valid)


class ForecastEvaluationTests(unittest.TestCase):
    def test_statistical_metrics_calculation(self):
        observed = [50.0, 60.0, 70.0, 80.0, 90.0]
        predicted = [52.0, 58.0, 75.0, 78.0, 95.0]

        metrics = compute_evaluation_metrics(observed, predicted, pollutant="PM2.5", lead_window="1-24h")
        self.assertEqual(metrics.sample_count, 5)
        self.assertGreater(metrics.correlation_r, 0.95)
        self.assertGreater(metrics.index_of_agreement, 0.95)
        # diffs: +2, -2, +5, -2, +5 -> sum = 8 -> mean = 1.6
        self.assertAlmostEqual(metrics.mean_bias, 1.6, places=1)

    def test_persistence_baseline(self):
        history = [45.0, 50.0, 55.0]
        fcst = compute_persistence_forecast(history, forecast_horizon_hours=72)
        self.assertEqual(len(fcst), 72)
        self.assertEqual(fcst[0], 55.0)
        self.assertEqual(fcst[-1], 55.0)


if __name__ == "__main__":
    unittest.main()
