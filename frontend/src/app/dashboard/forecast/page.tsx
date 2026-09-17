"use client";

import React, { useState, useEffect } from "react";
import { useMunicipal } from "@/context/MunicipalContext";

interface HourlyStep {
  lead_hour: number;
  valid_time: string;
  species: {
    pm25: number;
    pm25_feedback_off: number;
    pm10: number;
    no2: number;
    o3: number;
    co: number;
    so2: number;
  };
  aqi: {
    value: number;
    category: string;
    color: string;
    dominant_pollutant: string;
  };
  diagnostics: {
    pblh_m: number;
    wind_speed_ms: number;
    ventilation_coefficient_m2s: number;
    ventilation_category: string;
    has_surface_inversion: boolean;
    fire_attribution_pct: number;
    fire_pm25_ug_m3: number;
  };
}

export { default } from "../home/ForecastWorkspace";

function LegacyForecastDashboardPage() {
  const { activeCorp } = useMunicipal();
  const [forecastData, setForecastData] = useState<HourlyStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLeadHour, setCurrentLeadHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<"pm25" | "pm10" | "no2" | "o3" | "aqi">("pm25");
  const [showFeedbackDiff, setShowFeedbackDiff] = useState(false);
  const [showFirePlume, setShowFirePlume] = useState(true);

  // Fetch 72-Hour Forecast Data
  useEffect(() => {
    async function loadForecast() {
      setLoading(true);
      try {
        const res = await fetch(`/api/forecast/72h?station=${activeCorp.id}`);
        const json = await res.json();
        if (json.status === "success" && Array.isArray(json.data)) {
          setForecastData(json.data);
        }
      } catch (err) {
        console.error("Failed to load 72h forecast data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadForecast();
  }, [activeCorp.id]);

  // Timeline Auto-play Loop
  useEffect(() => {
    let timer: any;
    if (isPlaying && forecastData.length > 0) {
      timer = setInterval(() => {
        setCurrentLeadHour((prev) => (prev >= forecastData.length - 1 ? 0 : prev + 1));
      }, 700);
    }
    return () => clearInterval(timer);
  }, [isPlaying, forecastData.length]);

  const activeStep = forecastData[currentLeadHour] || null;

  if (loading || !activeStep) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 p-8 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="font-mono text-sm tracking-wider text-slate-400">
            LOADING COUPLED 72-HOUR FORECAST ENGINE (WRF-CHEM NCR)...
          </span>
        </div>
      </div>
    );
  }

  const validDate = new Date(activeStep.valid_time);

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto bg-slate-950 p-4 font-sans text-slate-100">
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/40">
            <span className="material-symbols-outlined text-2xl">cyclone</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide text-white flex items-center gap-2">
              72-Hour Coupled Air Quality Forecast Terminal
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                WRF-Chem v4.5.1 [9km/3km]
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Target Airshed: <span className="text-primary font-semibold">{activeCorp.name}</span> | Domain: d02_delhi_ncr
            </p>
          </div>
        </div>

        {/* Global Forecast Metrics Bar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Valid Time:</span>
            <span className="font-mono text-xs font-bold text-amber-400">
              {validDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Lead:</span>
            <span className="font-mono text-xs font-bold text-primary">T+{activeStep.lead_hour}h</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Diagnostic & Metrics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Left Card: CPCB Composite AQI Status */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>CPCB NAQI Index</span>
            <span className="material-symbols-outlined text-sm text-primary">verified</span>
          </span>
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-xl font-mono text-2xl font-black text-slate-950 shadow-lg"
              style={{ backgroundColor: activeStep.aqi.color }}
            >
              {activeStep.aqi.value}
            </div>
            <div>
              <div className="text-sm font-bold uppercase" style={{ color: activeStep.aqi.color }}>
                {activeStep.aqi.category}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Dominant: <span className="text-white font-semibold">{activeStep.aqi.dominant_pollutant}</span>
              </div>
            </div>
          </div>

          <div className="mt-2 space-y-1.5 border-t border-slate-800/80 pt-2 text-xs font-mono">
            <div className="flex justify-between text-slate-300">
              <span>PM2.5 (Coupled ON):</span>
              <span className="font-bold text-white">{activeStep.species.pm25} µg/m³</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>PM2.5 (Feedback OFF):</span>
              <span className="text-slate-400">{activeStep.species.pm25_feedback_off} µg/m³</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>PM10:</span>
              <span className="font-bold text-white">{activeStep.species.pm10} µg/m³</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>NO₂:</span>
              <span className="font-bold text-white">{activeStep.species.no2} µg/m³</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>O₃:</span>
              <span className="font-bold text-white">{activeStep.species.o3} ppb</span>
            </div>
          </div>
        </div>

        {/* Middle Card: Aerosol-Radiation Feedback Sensitivity */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Aerosol Feedback Δ</span>
            <span className="material-symbols-outlined text-sm text-cyan-400">compare_arrows</span>
          </span>
          <div className="flex flex-col gap-2">
            <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-mono block">Concentration Enhancement:</span>
              <div className="text-lg font-bold font-mono text-cyan-400">
                +{activeStep.species.pm25 - activeStep.species.pm25_feedback_off} µg/m³
                <span className="text-xs text-slate-400 font-normal ml-1">
                  (+{(((activeStep.species.pm25 - activeStep.species.pm25_feedback_off) / activeStep.species.pm25_feedback_off) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="text-xs font-mono text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                <span>Two-way radiative dimming active</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                <span>Boundary layer suppression resolved</span>
              </div>
            </div>
          </div>
        </div>

        {/* Third Card: Inversion & Boundary Layer Stability */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Stability & Ventilation</span>
            <span className="material-symbols-outlined text-sm text-amber-400">air</span>
          </span>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
              <span className="text-xs font-mono text-slate-400">PBL Height:</span>
              <span className="font-mono text-sm font-bold text-amber-400">{activeStep.diagnostics.pblh_m} m AGL</span>
            </div>
            <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
              <span className="text-xs font-mono text-slate-400">Ventilation Coeff:</span>
              <span className="font-mono text-sm font-bold text-white">
                {activeStep.diagnostics.ventilation_coefficient_m2s} m²/s
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-mono text-slate-400">Surface Inversion:</span>
              {activeStep.diagnostics.has_surface_inversion ? (
                <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-400 border border-rose-500/30 font-mono">
                  PRESENT (TRAPPING)
                </span>
              ) : (
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/30 font-mono">
                  NONE (MIXED)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Fourth Card: Agricultural Burning Attribution */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Stubble Fire Attribution</span>
            <span className="material-symbols-outlined text-sm text-orange-400">local_fire_department</span>
          </span>
          <div className="flex flex-col gap-2">
            <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-mono block">Transboundary Smoke Load:</span>
              <div className="text-lg font-bold font-mono text-orange-400">
                {activeStep.diagnostics.fire_pm25_ug_m3} µg/m³
                <span className="text-xs text-slate-400 font-normal ml-1">
                  ({activeStep.diagnostics.fire_attribution_pct}% of total)
                </span>
              </div>
            </div>
            <div className="text-[11px] font-mono text-slate-400 leading-relaxed">
              Model source region: Punjab & Haryana agricultural clusters with FRP-scaled vertical injection.
            </div>
          </div>
        </div>
      </div>

      {/* 72-Hour Interactive Timeline Slider & Playback Controller */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-slate-950 font-bold hover:bg-primary/90 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-xl">{isPlaying ? "pause" : "play_arrow"}</span>
            </button>
            <button
              onClick={() => setCurrentLeadHour(0)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-xs font-mono text-slate-300 hover:text-white"
            >
              Reset T+0
            </button>
            <span className="text-xs font-mono text-slate-300 ml-2">
              Timeline Step: <span className="text-primary font-bold">Hour {activeStep.lead_hour} of 72</span>
            </span>
          </div>

          {/* Layer Mode Selectors */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFeedbackDiff(!showFeedbackDiff)}
              className={`px-3 py-1 rounded-full text-xs font-mono border transition-all ${
                showFeedbackDiff
                  ? "bg-cyan-500/20 border-cyan-500 text-cyan-400"
                  : "bg-slate-950 border-slate-800 text-slate-400"
              }`}
            >
              Aerosol Feedback ON/OFF View
            </button>
            <button
              onClick={() => setShowFirePlume(!showFirePlume)}
              className={`px-3 py-1 rounded-full text-xs font-mono border transition-all ${
                showFirePlume
                  ? "bg-orange-500/20 border-orange-500 text-orange-400"
                  : "bg-slate-950 border-slate-800 text-slate-400"
              }`}
            >
              Fire Transport Plume Overlay
            </button>
          </div>
        </div>

        {/* Scrubbing Range Slider */}
        <input
          type="range"
          min="0"
          max={forecastData.length - 1}
          value={currentLeadHour}
          onChange={(e) => setCurrentLeadHour(parseInt(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-primary"
        />

        {/* 72-Hour Miniature Bar Sparkline */}
        <div className="flex h-12 w-full items-end gap-0.5 overflow-hidden rounded bg-slate-950 p-1 border border-slate-800/60">
          {forecastData.map((step, idx) => {
            const heightPct = Math.min(100, Math.max(10, (step.species.pm25 / 300) * 100));
            const isSelected = idx === currentLeadHour;
            return (
              <div
                key={step.lead_hour}
                onClick={() => setCurrentLeadHour(idx)}
                title={`T+${step.lead_hour}h: ${step.species.pm25} µg/m³ (AQI: ${step.aqi.value})`}
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: isSelected ? "#38bdf8" : step.aqi.color,
                  opacity: isSelected ? 1 : 0.65,
                }}
                className="flex-1 rounded-t-xs cursor-pointer transition-all hover:opacity-100"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
