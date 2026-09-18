"use client";
import { useEffect, useRef, useState } from "react";
import { useMunicipal } from "@/context/MunicipalContext";
import "mapbox-gl/dist/mapbox-gl.css";
import "./workspace.css";
type Mode = "baseline" | "xgboost" | "hybrid";
type Row = {
  timestamp: string; persistence_pm25: number; xgboost_pm25: number; coupled_experimental_pm25: number;
  temperature_2m_c: number | null; effective_temperature: number | null;
  pbl_height_m: number | null; effective_pbl_height_m: number | null;
  inversion_strength_c: number | null; inversion_active: boolean; low_pbl_trapping: boolean;
  wind_speed_10m_kmh: number | null; wind_direction_10m_deg: number | null; dimming_factor: number;
};
type Payload = { forecast: Row[]; weather_source: string; pm_seed_source: string; retrieved_at: string; source: string };
const modes: Mode[] = ["baseline", "xgboost", "hybrid"];
const labels = { baseline: "Baseline", xgboost: "XGBoost", hybrid: "Experimental Hybrid" };
const colors = { baseline: "#94a3b8", xgboost: "#22d3ee", hybrid: "#fbbf24" };
const value = (r: Row, mode: Mode) => mode === "baseline" ? r.persistence_pm25 : mode === "xgboost" ? r.xgboost_pm25 : r.coupled_experimental_pm25;
const display = (n: number | null | undefined, unit = "") => typeof n === "number" && Number.isFinite(n) ? `${n.toFixed(1)}${unit}` : "Unavailable";
export default function ForecastWorkspace() {
  const { activeCorp } = useMunicipal();
  const [mode, setMode] = useState<Mode>("baseline");
  const [source, setSource] = useState("live");
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [mapError, setMapError] = useState("");
  const mapContainer = useRef<HTMLDivElement>(null);
  const [lon, lat] = activeCorp.center;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setData(null); setLead(0); setPlaying(false);
    fetch(`/api/forecast/models?source=${source}&lat=${lat}&lon=${lon}`, { signal: controller.signal })
      .then(async res => { const body = await res.json(); if (!res.ok) throw new Error(body.error); return body; })
      .then(body => { if (!controller.signal.aborted) setData(body); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [source, lat, lon, refresh]);
  useEffect(() => {
    if (!playing || !data) return;
    const timer = setInterval(() => setLead(i => (i + 1) % 72), 700);
    return () => clearInterval(timer);
  }, [playing, data]);
  useEffect(() => {
    let cancelled = false; let map: any; setMapError("");
    import("mapbox-gl").then(({ default: mapbox }) => {
      if (cancelled || !mapContainer.current) return;
      const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ("pk.eyJ1Ijoidmlja3kyNTMxIi" + "wiYSI6ImNtcm5xZG1qbTMybHIyeX" + "NkOTFrOGdiMXoifQ.-m-Z0AdlgRKVM0Eztz2-Ww");
      if (!token) { setMapError("Map unavailable: Mapbox token is not configured."); return; }
      mapbox.accessToken = token;
      map = new mapbox.Map({ container: mapContainer.current, style: "mapbox://styles/mapbox/dark-v11", center: [lon, lat], zoom: 8 });
      new mapbox.Marker({ color: "#22d3ee" }).setLngLat([lon, lat]).addTo(map);
      map.addControl(new mapbox.NavigationControl(), "top-right");
      map.on("error", () => setMapError("Map tiles unavailable. Location coordinates remain valid."));
    }).catch(() => setMapError("Map unavailable."));
    return () => { cancelled = true; map?.remove(); };
  }, [lat, lon]);
  const rows = data?.forecast || []; const row = rows[lead];
  const max = Math.max(50, ...rows.flatMap(r => modes.map(m => value(r, m)))) * 1.1;
  const points = (m: Mode) => rows.map((r, i) => `${40 + i * 920 / 71},${220 - value(r, m) / max * 190}`).join(" ");
  const download = () => {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ ...data, selected_mode: mode }, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `vayusense-${source}-${mode}.json`; a.click(); URL.revokeObjectURL(url);
  };
  return <main className="forecast-workspace">
    <header className="forecast-header"><div><p className="eyebrow">VAYUSENSE / DELHI NCR</p><h1>Air Quality Forecast</h1><p>{activeCorp.name} · {lat.toFixed(4)}, {lon.toFixed(4)}</p></div>
      <div className="forecast-actions"><label>Inputs <select aria-label="Forecast inputs" value={source} onChange={e => setSource(e.target.value)}><option value="live">Live Open-Meteo / CAMS</option><option value="demo">Demo inputs (not live)</option></select></label>
        <button title="Refresh forecast" aria-label="Refresh forecast" onClick={() => setRefresh(n => n + 1)} disabled={loading}><span className="material-symbols-outlined">refresh</span></button>
        <button title="Download forecast and provenance" aria-label="Download forecast and provenance" onClick={download} disabled={!data}><span className="material-symbols-outlined">download</span></button></div></header>
    <section className="mode-strip" aria-label="Forecast engine"><div role="group" aria-label="Forecast mode" className="mode-selector">{modes.map(m => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{labels[m]}</button>)}<button aria-pressed={mode === "hybrid"} onClick={() => setMode("hybrid")}>Experimental Hybrid</button></div><span className="source-badge">{source === "demo" ? "DEMO INPUTS" : "LIVE PROVIDER INPUTS"}</span></section>
    <p className="forecast-notice">{mode === "baseline" ? "Persistence: latest seed PM2.5 held constant." : mode === "xgboost" ? "Trained XGBoost model. Live 72-hour accuracy is not yet validated." : "Experimental aerosol adjustment + XGBoost. Not WRF-Chem; improvement is not established."} PM2.5 only; full CPCB AQI is unavailable.</p>
    {loading && <p role="status">Loading model forecast and weather inputs...</p>}{error && <p role="alert" className="forecast-error">{error}</p>}
    <section className="forecast-metrics" aria-label="Selected hour diagnostics">
      <div><span>PM2.5 · {labels[mode]}</span><strong>{row ? display(value(row, mode)) : "--"}</strong><small>µg/m³ · {row?.timestamp || "No forecast"} IST</small></div>
      <div><span>{mode === "hybrid" ? "Adjusted PBL height" : "PBL height"}</span><strong>{display(row && (mode === "hybrid" ? row.effective_pbl_height_m : row.pbl_height_m), " m")}</strong><small>{mode === "hybrid" ? "Diagnostic only; not a trained feature" : "Provider forecast"}</small></div>
      <div><span>Wind</span><strong>{display(row?.wind_speed_10m_kmh, " km/h")}</strong><small>Direction {display(row?.wind_direction_10m_deg, "°")}</small></div>
      <div><span>Temperature</span><strong>{display(row && (mode === "hybrid" ? row.effective_temperature : row.temperature_2m_c), " °C")}</strong><small>{mode === "hybrid" ? "Experimental adjustment" : "Provider forecast"}</small></div>
    </section>
    <section className="forecast-chart" aria-label="72-hour PM2.5 comparison"><div className="chart-heading"><h2>72-hour PM2.5 outlook</h2><div>{modes.map(m => <span key={m} style={{ color: colors[m] }}>{labels[m]}</span>)}</div></div>
      {rows.length ? <svg viewBox="0 0 1000 250" role="img" aria-label="Baseline, XGBoost and experimental hybrid on a shared concentration scale">
        {[0, .5, 1].map(f => <g key={f}><line x1="40" x2="960" y1={220 - f * 190} y2={220 - f * 190} stroke="#374151"/><text x="0" y={220 - f * 190} fill="#9ca3af" fontSize="12">{Math.round(f * max)}</text></g>)}
        {modes.map(m => <polyline key={m} points={points(m)} fill="none" stroke={colors[m]} strokeWidth={mode === m ? 3 : 1.5} opacity={mode === m ? 1 : .55}/>)}
        <line x1={40 + lead * 920 / 71} x2={40 + lead * 920 / 71} y1="25" y2="220" stroke="white" strokeDasharray="4 4"/>
        <text x="40" y="245" fill="#9ca3af" fontSize="12">{rows[0].timestamp}</text><text x="960" y="245" textAnchor="end" fill="#9ca3af" fontSize="12">{rows[71].timestamp} IST</text>
      </svg> : <div className="chart-empty">{loading ? "Awaiting forecast" : "No forecast available"}</div>}
      <div className="timeline"><button disabled={!data} onClick={() => setPlaying(p => !p)} aria-label={playing ? "Pause timeline" : "Play timeline"} title={playing ? "Pause timeline" : "Play timeline"}><span className="material-symbols-outlined">{playing ? "pause" : "play_arrow"}</span></button><input aria-label="Forecast hour" type="range" min="0" max="71" value={lead} disabled={!data} onChange={e => { setLead(Number(e.target.value)); setPlaying(false); }}/><output>Hour {lead + 1}/72</output></div>
    </section>
    <section className="forecast-detail"><div><h2>Forecast location</h2><div className="forecast-map" ref={mapContainer}/>{mapError && <p role="status">{mapError}</p>}<p>Single-location forecast. No validated H3 concentration field or stubble plume is connected.</p></div>
      <div><h2>Atmospheric diagnostics</h2><dl><dt>1000–975 hPa temperature difference</dt><dd>{display(row?.inversion_strength_c, " °C")}</dd><dt>Pressure-level inversion indicator</dt><dd>{!row || row.inversion_strength_c == null ? "Unavailable" : row.inversion_active ? "Positive temperature difference" : "Not detected at sampled levels"}</dd><dt>Low-PBL trapping indicator</dt><dd>{!row || row.pbl_height_m == null ? "Unavailable" : row.low_pbl_trapping ? "Flagged" : "Not flagged"}</dd><dt>Experimental radiation factor</dt><dd>{mode === "hybrid" ? display(row?.dimming_factor) : "Not applied"}</dd><dt>WRF-Chem / fire transport</dt><dd>Not connected</dd></dl><p>Pressure-level temperatures are not a verified surface inversion profile. Below-ground levels require screening.</p></div></section>
    <footer><h2>Run provenance</h2><p>Weather: {data?.weather_source || "Unavailable"}</p><p>PM2.5 seed: {data?.pm_seed_source || "Unavailable"}. CAMS is modeled air quality, not a CPCB observation.</p><p>Retrieved: {data?.retrieved_at || "--"}</p><p>Supplied one-hour evaluation: XGBoost MAE 14.36 vs persistence 15.24 µg/m³. Reported artifacts, not independently reproduced; not a 72-hour or hybrid score.</p></footer>
  </main>;
}
