from pathlib import Path
import pandas as pd
from app.model_service import load_model, model_info
from app.forecast import run_forecast

print('1/3 Loading production XGBoost model...')
load_model('production')
print('OK')
print('2/3 Reading bundled demo input...')
h=pd.read_csv('data/sample_pm_history_24h.csv')['pm25'].tolist()
w=pd.read_csv('data/sample_weather_72h.csv').to_dict('records')
print('OK')
print('3/3 Running 72-hour offline prediction...')
out=run_forecast(w,h,True)
assert len(out)==72
assert all(0 <= x['xgboost_pm25'] <= 999 for x in out)
Path('outputs').mkdir(exist_ok=True)
pd.DataFrame(out).to_csv('outputs/self_test_forecast.csv',index=False)
info=model_info()
print('OK')
print('\nSELF-TEST PASSED')
print(f"Hold-out RMSE: {info['evaluation']['xgboost']['rmse']:.2f} µg/m³")
print(f"Hold-out MAE : {info['evaluation']['xgboost']['mae']:.2f} µg/m³")
print(f"Hold-out R²  : {info['evaluation']['xgboost']['r2']:.3f}")
print('Forecast saved to outputs/self_test_forecast.csv')
