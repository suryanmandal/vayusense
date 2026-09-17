from __future__ import annotations
import argparse, json
from pathlib import Path
import pandas as pd
from app.forecast import run_forecast
from app.model_service import model_info
from app.openmeteo import fetch_72h, fetch_pm25_seed_24h, fetch_live_bundle

REQ_WEATHER = ["timestamp", "AT", "RH", "WD", "SR", "RF", "BP"]


def load_history(path: str) -> list[float]:
    df = pd.read_csv(path)
    col = "pm25" if "pm25" in df.columns else df.columns[-1]
    values = pd.to_numeric(df[col], errors="coerce").dropna().tolist()
    if len(values) < 24:
        raise ValueError("History file must contain at least 24 valid PM2.5 values.")
    return values[-24:]


def load_weather(path: str) -> list[dict]:
    df = pd.read_csv(path)
    missing = [c for c in REQ_WEATHER if c not in df.columns]
    if missing:
        raise ValueError(f"Weather CSV is missing columns: {missing}")
    return df.to_dict("records")


def save_forecast(rows, out):
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(rows).to_csv(out, index=False)
    print(f"Saved {len(rows)} forecast rows to {out}")


def print_live_summary(rows, seed_source, seed_value):
    first = rows[0]
    peak = max(rows, key=lambda x: x["xgboost_pm25"])
    print(f"PM seed source: {seed_source}")
    print(f"Latest seed PM2.5: {seed_value:.2f} µg/m³")
    print(f"First XGBoost forecast: {first['xgboost_pm25']:.2f} µg/m³ at {first['timestamp']}")
    print(f"72h XGBoost peak: {peak['xgboost_pm25']:.2f} µg/m³ at {peak['timestamp']}")


def main():
    ap = argparse.ArgumentParser(description="Delhi PM2.5 XGBoost + Open-Meteo tools")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("info", help="Show bundled model/evaluation metadata")

    d = sub.add_parser("demo", help="Run fully offline bundled demo")
    d.add_argument("--out", default="outputs/demo_forecast.csv")
    d.add_argument("--no-coupled", action="store_true")

    f = sub.add_parser("forecast", help="Run from local PM history + local weather CSV")
    f.add_argument("--weather", required=True)
    f.add_argument("--history", required=True)
    f.add_argument("--out", default="outputs/forecast.csv")
    f.add_argument("--no-coupled", action="store_true")

    l = sub.add_parser("live", help="Live Open-Meteo weather + your local/CPCB 24h PM history")
    l.add_argument("--history", required=True)
    l.add_argument("--lat", type=float, default=28.6139)
    l.add_argument("--lon", type=float, default=77.2090)
    l.add_argument("--timezone", default="Asia/Kolkata")
    l.add_argument("--out", default="outputs/live_forecast.csv")
    l.add_argument("--no-coupled", action="store_true")

    a = sub.add_parser("live-auto", help="Fully automatic: Open-Meteo weather + CAMS PM2.5 lag seed")
    a.add_argument("--lat", type=float, default=28.6139)
    a.add_argument("--lon", type=float, default=77.2090)
    a.add_argument("--timezone", default="Asia/Kolkata")
    a.add_argument("--out", default="outputs/live_auto_forecast.csv")
    a.add_argument("--no-coupled", action="store_true")

    w = sub.add_parser("fetch-weather", help="Download current Open-Meteo 72h weather to CSV")
    w.add_argument("--lat", type=float, default=28.6139)
    w.add_argument("--lon", type=float, default=77.2090)
    w.add_argument("--timezone", default="Asia/Kolkata")
    w.add_argument("--out", default="outputs/openmeteo_weather_72h.csv")

    s = sub.add_parser("fetch-pm-seed", help="Download Open-Meteo/CAMS 24h PM2.5 seed to CSV")
    s.add_argument("--lat", type=float, default=28.6139)
    s.add_argument("--lon", type=float, default=77.2090)
    s.add_argument("--timezone", default="Asia/Kolkata")
    s.add_argument("--out", default="outputs/openmeteo_pm25_seed_24h.csv")

    args = ap.parse_args()
    if args.cmd == "info":
        print(json.dumps(model_info(), indent=2)); return

    if args.cmd == "demo":
        history = load_history("data/sample_pm_history_24h.csv")
        weather = load_weather("data/sample_weather_72h.csv")
        rows = run_forecast(weather, history, not args.no_coupled)
        save_forecast(rows, args.out); return

    if args.cmd == "forecast":
        rows = run_forecast(load_weather(args.weather), load_history(args.history), not args.no_coupled)
        save_forecast(rows, args.out); return

    if args.cmd == "live":
        history = load_history(args.history)
        weather = fetch_72h(args.lat, args.lon, args.timezone)
        rows = run_forecast(weather, history, not args.no_coupled)
        save_forecast(rows, args.out)
        print_live_summary(rows, "local/CPCB file", history[-1]); return

    if args.cmd == "live-auto":
        bundle = fetch_live_bundle(args.lat, args.lon, args.timezone, 72)
        history = bundle["seed"]["pm_history"]
        rows = run_forecast(bundle["weather"], history, not args.no_coupled)
        save_forecast(rows, args.out)
        print_live_summary(rows, bundle["seed"]["source"], history[-1]); return

    if args.cmd == "fetch-weather":
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        pd.DataFrame(fetch_72h(args.lat, args.lon, args.timezone)).to_csv(args.out, index=False)
        print(f"Saved live Open-Meteo weather to {args.out}"); return

    if args.cmd == "fetch-pm-seed":
        seed = fetch_pm25_seed_24h(args.lat, args.lon, args.timezone)
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        pd.DataFrame({"timestamp": seed["timestamps"], "pm25": seed["pm_history"]}).to_csv(args.out, index=False)
        print(f"Saved Open-Meteo/CAMS PM2.5 seed to {args.out}"); return


if __name__ == "__main__":
    main()
