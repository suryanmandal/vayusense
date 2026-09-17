from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"
DATA_DIR = ROOT / "data"
STATIC_DIR = ROOT / "static"
OUTPUT_DIR = ROOT / "outputs"
PRODUCTION_MODEL = MODEL_DIR / "xgboost_pm25_production.json"
EVALUATION_MODEL = MODEL_DIR / "xgboost_pm25_evaluation.json"
FEATURE_COLUMNS = MODEL_DIR / "feature_columns.json"
METRICS = MODEL_DIR / "evaluation_metrics.json"
PRODUCTION_METADATA = MODEL_DIR / "production_metadata.json"
