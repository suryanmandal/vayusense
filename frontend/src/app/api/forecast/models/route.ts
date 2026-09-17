import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const source = query.get("source") || "live";
  if (!["live", "demo"].includes(source)) return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  const latitude = Number(query.get("lat") ?? 28.6139);
  const longitude = Number(query.get("lon") ?? 77.2090);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 27 || latitude > 30.5 || longitude < 75 || longitude > 79) {
    return NextResponse.json({ error: "Select a location in the Delhi NCR study region." }, { status: 400 });
  }
  const base = process.env.FORECAST_SERVICE_URL || "http://127.0.0.1:8000";
  try {
    const response = await fetch(`${base}/api/forecast/demo`, {
      method: "GET", headers: { "Content-Type": "application/json" },
      cache: "no-store", signal: AbortSignal.timeout(90000),
    });
    if (!response.ok) throw new Error("Forecast service unavailable");
    const payload = await response.json();
    const rows = payload.forecast;
    const fields = ["persistence_pm25", "xgboost_pm25", "coupled_experimental_pm25"];
    if (!Array.isArray(rows) || rows.length !== 72 || rows.some((row, i) => {
      const time = Date.parse(row.timestamp);
      return !Number.isFinite(time) || fields.some(key => typeof row[key] !== "number" || !Number.isFinite(row[key]) || row[key] < 0) ||
        (i > 0 && time - Date.parse(rows[i - 1].timestamp) !== 3600000);
    })) throw new Error("Invalid hourly horizon");
    return NextResponse.json({ ...payload, source, retrieved_at: new Date().toISOString(), latitude, longitude,
      wrf_available: false, spatial_scope: "Single location; not an H3 concentration field" });
  } catch {
    return NextResponse.json({ error: "Forecast unavailable. Check model service port 8000 and Open-Meteo connectivity. Demo inputs are available separately; no automatic substitution was made." }, { status: 503 });
  }
}
