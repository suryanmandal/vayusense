import unittest
import pandas as pd
from app.config import DATA_DIR
from app.forecast import run_forecast, physics_adjust

class IntegrationTests(unittest.TestCase):
    def test_daylight_only_adjustment(self):
        for radiation in (0, None):
            weather = {"AT": 20, "SR": radiation, "PBL": 500}
            adjusted, _ = physics_adjust(weather, 300)
            self.assertEqual(adjusted, weather)
        original = {"AT": 20, "SR": 600, "PBL": 500}
        adjusted, _ = physics_adjust(original, 300)
        self.assertLess(adjusted["SR"], original["SR"])
        self.assertEqual(original["SR"], 600)

    def test_actual_model_rollout(self):
        history = pd.read_csv(DATA_DIR / "sample_pm_history_24h.csv").pm25.tolist()
        weather = pd.read_csv(DATA_DIR / "sample_weather_72h.csv").to_dict("records")
        rows = run_forecast(weather, history, True)
        self.assertEqual(len(rows), 72)
        self.assertEqual(len({r["timestamp"] for r in rows}), 72)
        self.assertTrue(all(r["persistence_pm25"] == round(history[-1], 2) for r in rows))
        self.assertTrue(all(0 <= r["xgboost_pm25"] <= 999 for r in rows))
        self.assertTrue(all(0 <= r["coupled_experimental_pm25"] <= 999 for r in rows))

if __name__ == "__main__":
    unittest.main()
