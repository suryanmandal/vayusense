@echo off
if not exist .venv (
  echo Virtual environment missing. Run setup_windows.bat first.
  exit /b 1
)
call .venv\Scripts\activate
python run.py
