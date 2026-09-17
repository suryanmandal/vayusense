"use client";

import React, { useState, useEffect, useRef } from "react";
import { useMunicipal } from "@/context/MunicipalContext";

function add3DFeatures(map: any) {
  const layers = map.getStyle().layers || [];
  let labelLayerId;
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
      labelLayerId = layers[i].id;
      break;
    }
  }
  if (!map.getLayer('3d-buildings') && map.getSource('composite')) {
      map.addLayer({
          'id': '3d-buildings', 'source': 'composite', 'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'], 'type': 'fill-extrusion', 'minzoom': 12,
          'paint': {
            'fill-extrusion-color': '#2a3b4c',
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 12, 0, 15.05, ['get', 'height']],
            'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 12, 0, 15.05, ['get', 'min_height']],
            'fill-extrusion-opacity': 0.8
          }
        }, labelLayerId);
  }
}

interface HourlyForecastStep {
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

type PollutantKey = "aqi" | "pm25" | "pm10" | "no2" | "o3" | "co" | "so2";
type DiagnosticTab = "forecast" | "inversion" | "burning";

export default function MainControlRoom() {
  const { activeCorp } = useMunicipal();

  // Forecast state from 72h coupled API
  const [forecastSeries, setForecastSeries] = useState<HourlyForecastStep[]>([]);
  const [loadingForecast, setLoadingForecast] = useState<boolean>(true);
  const [forecastError, setForecastError] = useState<string | null>(null);

  // Timeline & Playback
  const [currentLeadIndex, setCurrentLeadIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Selected Pollutant
  const [selectedPollutant, setSelectedPollutant] = useState<PollutantKey>("pm25");

  // Diagnostic Tabs
  const [activeTab, setActiveTab] = useState<DiagnosticTab>("forecast");
  const [plotMode, setPlotMode] = useState<"coupled" | "uncoupled">("coupled");

  // Map Style
  const [activeStyle, setActiveStyle] = useState<"monochrome" | "satellite" | "hybrid">("monochrome");

  const [is3DMode, setIs3DMode] = useState(true);
  const is3DModeRef = React.useRef(is3DMode);
  const isFlyingRef = React.useRef(false);
  useEffect(() => {
    is3DModeRef.current = is3DMode;
    if (mapRef.current) {
      const map = mapRef.current;
      if (is3DMode) {
        map.easeTo({ pitch: 60, duration: 1000 });
        if (map.getLayer('3d-buildings')) map.setLayoutProperty('3d-buildings', 'visibility', 'visible');
      } else {
        map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
        if (map.getLayer('3d-buildings')) map.setLayoutProperty('3d-buildings', 'visibility', 'none');
      }
    }
  }, [is3DMode]);

  // Source Toggles (4 compact emission sources)
  const [sourceLayers, setSourceLayers] = useState({
    industry: true,
    transport: true,
    construction: true,
    cropBurning: true,
  });

  // Weather Diagnostic Layers (Separate controls)
  const [weatherLayers, setWeatherLayers] = useState({
    windVectors: true,
    pblBoundary: true,
    inversionContour: true,
  });

  // UI state
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const activeCorpRef = useRef(activeCorp);

  useEffect(() => {
    activeCorpRef.current = activeCorp;
  }, [activeCorp]);

  // Fetch 72-Hour Forecast Data for Active Corporation
  useEffect(() => {
    let isSubscribed = true;
    setLoadingForecast(true);
    setForecastError(null);

    async function fetchForecast() {
      try {
        const res = await fetch(`/api/forecast/72h?station=${activeCorp.id}`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const json = await res.json();
        if (isSubscribed && json.status === "success" && Array.isArray(json.data)) {
          setForecastSeries(json.data);
          setCurrentLeadIndex(0);
        }
      } catch (err: any) {
        if (isSubscribed) {
          console.error("Forecast fetch error:", err);
          setForecastError(err.message || "Failed to load forecast data");
        }
      } finally {
        if (isSubscribed) setLoadingForecast(false);
      }
    }

    fetchForecast();

    return () => {
      isSubscribed = false;
    };
  }, [activeCorp.id]);

  // Timeline Auto-play
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && forecastSeries.length > 0) {
      timer = setInterval(() => {
        setCurrentLeadIndex((prev) => (prev >= forecastSeries.length - 1 ? 0 : prev + 1));
      }, 750);
    }
    return () => clearInterval(timer);
  }, [isPlaying, forecastSeries.length]);

  // Active step
  const activeStep = forecastSeries[currentLeadIndex] || null;

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let mapInstance: any = null;

    import("mapbox-gl").then((mapboxglModule) => {
      const mapboxgl = mapboxglModule.default;
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "pk.eyJ1Ijoic3VyeWFuYXJheWFuMjYiLCJhIjoiY20xcXZqcGlsMDFrdTJycHNocXZmc2tqMSJ9.Z5p4o1a3L-M_Kvh-L3Fw9A";

      mapInstance = new mapboxgl.Map({
        container: mapContainerRef.current!,
        style:
          activeStyle === "satellite"
            ? "mapbox://styles/mapbox/satellite-v9"
            : activeStyle === "hybrid"
            ? "mapbox://styles/mapbox/satellite-streets-v12"
            : "mapbox://styles/mapbox/dark-v11",
        center: activeCorp ? activeCorp.center : [77.209, 28.6139],
        zoom: 11.2,
        pitch: 60,
        bearing: -17.6,
        antialias: true,
        attributionControl: false,
      });

      mapInstance.on("load", () => {
        add3DFeatures(mapInstance);
        function rotateCamera(timestamp: number) { if (!mapInstance) return; if (is3DModeRef.current && !isFlyingRef.current) { mapInstance.rotateTo((timestamp / 200) % 360, { duration: 0 }); } requestAnimationFrame(rotateCamera); } requestAnimationFrame(rotateCamera);

        if (activeCorpRef.current) {
          renderLayers(mapInstance, activeCorpRef.current);
        }
      });

      mapRef.current = mapInstance;
    });

    return () => {
      if (mapInstance) mapInstance.remove();
    };
  }, []);

  // Update Map style
  useEffect(() => {
    if (!mapRef.current) return;
    const styleUrl =
      activeStyle === "satellite"
        ? "mapbox://styles/mapbox/satellite-v9"
        : activeStyle === "hybrid"
        ? "mapbox://styles/mapbox/satellite-streets-v12"
        : "mapbox://styles/mapbox/dark-v11";

    mapRef.current.setStyle(styleUrl);
    mapRef.current.once("style.load", () => {
      add3DFeatures(mapRef.current);

      if (activeCorpRef.current) {
        renderLayers(mapRef.current, activeCorpRef.current);
      }
    });
  }, [activeStyle]);

  // Sync municipality change
  useEffect(() => {
    if (!mapRef.current || !activeCorp) return;
    const map = mapRef.current;
    
    // Fly to new location
    isFlyingRef.current = true;
    map.flyTo({
      center: activeCorp.center,
      zoom: 11.2,
      speed: 1.5,
      essential: true
    });
    
    map.once("moveend", () => {
      isFlyingRef.current = false;
    });

    if (map.isStyleLoaded() || map.loaded()) {
      renderLayers(map, activeCorp);
    } else {
      map.once("load", () => renderLayers(map, activeCorp));
      map.once("style.load", () => renderLayers(map, activeCorp));
    }
  }, [activeCorp]);

  // Render all source & boundary layers
  const renderLayers = (map: any, corp: any) => {
    if (!map || !corp) return;

    map.flyTo({
      center: corp.center,
      zoom: 11.2,
        pitch: 60,
        bearing: -17.6,
        antialias: true,
      speed: 1.4,
      essential: true,
    });

    const [centerLon, centerLat] = corp.center;

    // 1. Boundary Polygon
    const geojsonFeature = {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [corp.boundaryPolygon] },
      properties: { name: corp.name, shortName: corp.shortName, aqi: corp.aqi, status: corp.status },
    };

    const outlineColor = corp.status === "Critical" ? "#ef4444" : corp.status === "Warning" ? "#f59e0b" : "#10b981";

    if (map.getSource("active-corp-boundary")) {
      (map.getSource("active-corp-boundary") as any).setData(geojsonFeature);
    } else {
      map.addSource("active-corp-boundary", { type: "geojson", data: geojsonFeature });
      map.addLayer({
        id: "active-corp-boundary-glow",
        type: "line",
        source: "active-corp-boundary",
        paint: { "line-color": outlineColor, "line-width": 6, "line-blur": 3, "line-opacity": 0.4, "line-dasharray": [3, 2] },
      });
      map.addLayer({
        id: "active-corp-boundary-line",
        type: "line",
        source: "active-corp-boundary",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": outlineColor, "line-width": 3, "line-opacity": 0.95, "line-dasharray": [3, 2] },
      });
    }

        // 2. Industry Source (Scattered Yellow Triangles/Polygon)
    const indPoly = [
      [ // Patch 1
        [[centerLon - 0.02, centerLat + 0.01], [centerLon - 0.01, centerLat + 0.02], [centerLon - 0.025, centerLat + 0.02], [centerLon - 0.02, centerLat + 0.01]]
      ],
      [ // Patch 2
        [[centerLon + 0.01, centerLat + 0.02], [centerLon + 0.02, centerLat + 0.03], [centerLon + 0.005, centerLat + 0.03], [centerLon + 0.01, centerLat + 0.02]]
      ],
      [ // Patch 3
        [[centerLon - 0.01, centerLat - 0.02], [centerLon + 0.00, centerLat - 0.01], [centerLon - 0.015, centerLat - 0.01], [centerLon - 0.01, centerLat - 0.02]]
      ]
    ];
    if (map.getSource("source-industry")) {
      (map.getSource("source-industry") as any).setData({
        type: "Feature",
        geometry: { type: "MultiPolygon", coordinates: indPoly },
      });
    } else {
      map.addSource("source-industry", {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "MultiPolygon", coordinates: indPoly } },
      });
      map.addLayer({
        id: "source-industry-fill",
        type: "fill",
        source: "source-industry",
        paint: { "fill-color": "#eab308", "fill-opacity": 0.25 },
      });
      map.addLayer({
        id: "source-industry-line",
        type: "line",
        source: "source-industry",
        paint: { "line-color": "#eab308", "line-width": 2, "line-dasharray": [2, 1] },
      });
    }

        // 3. Transport Corridor (Scattered Cyan Lines)
    const transCorridor = [
      [[centerLon - 0.03, centerLat - 0.01], [centerLon - 0.01, centerLat + 0.00]],
      [[centerLon + 0.01, centerLat + 0.01], [centerLon + 0.03, centerLat + 0.02]],
      [[centerLon - 0.01, centerLat + 0.02], [centerLon + 0.01, centerLat + 0.03]]
    ];
    if (map.getSource("source-transport")) {
      (map.getSource("source-transport") as any).setData({
        type: "Feature",
        geometry: { type: "MultiLineString", coordinates: transCorridor },
      });
    } else {
      map.addSource("source-transport", {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "MultiLineString", coordinates: transCorridor } },
      });
      map.addLayer({
        id: "source-transport-line",
        type: "line",
        source: "source-transport",
        paint: { "line-color": "#06b6d4", "line-width": 4, "line-opacity": 0.8 },
      });
    }

        // 4. Construction Grid (Scattered Purple Boxes)
    const constrSquare = [
      [ // Patch 1
        [[centerLon + 0.005, centerLat - 0.02], [centerLon + 0.015, centerLat - 0.02], [centerLon + 0.015, centerLat - 0.01], [centerLon + 0.005, centerLat - 0.01], [centerLon + 0.005, centerLat - 0.02]]
      ],
      [ // Patch 2
        [[centerLon - 0.025, centerLat - 0.005], [centerLon - 0.015, centerLat - 0.005], [centerLon - 0.015, centerLat + 0.005], [centerLon - 0.025, centerLat + 0.005], [centerLon - 0.025, centerLat - 0.005]]
      ]
    ];
    if (map.getSource("source-construction")) {
      (map.getSource("source-construction") as any).setData({
        type: "Feature",
        geometry: { type: "MultiPolygon", coordinates: constrSquare },
      });
    } else {
      map.addSource("source-construction", {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "MultiPolygon", coordinates: constrSquare } },
      });
      map.addLayer({
        id: "source-construction-fill",
        type: "fill",
        source: "source-construction",
        paint: { "fill-color": "#a855f7", "fill-opacity": 0.25 },
      });
      map.addLayer({
        id: "source-construction-line",
        type: "line",
        source: "source-construction",
        paint: { "line-color": "#a855f7", "line-width": 2, "line-dasharray": [3, 2] },
      });
    }

    // 5. Crop-Residue Burning Upwind Plume (Orange Dispersion Gradient)
    const firePlume = [
      [centerLon - 0.09, centerLat + 0.08],
      [centerLon - 0.03, centerLat + 0.04],
      [centerLon, centerLat],
      [centerLon - 0.06, centerLat - 0.02],
      [centerLon - 0.11, centerLat + 0.05],
      [centerLon - 0.09, centerLat + 0.08],
    ];
    if (map.getSource("source-cropburning")) {
      (map.getSource("source-cropburning") as any).setData({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [firePlume] },
      });
    } else {
      map.addSource("source-cropburning", {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "Polygon", coordinates: [firePlume] } },
      });
      map.addLayer({
        id: "source-cropburning-fill",
        type: "fill",
        source: "source-cropburning",
        paint: { "fill-color": "#f97316", "fill-opacity": 0.3 },
      });
      map.addLayer({
        id: "source-cropburning-line",
        type: "line",
        source: "source-cropburning",
        paint: { "line-color": "#ea580c", "line-width": 2.5, "line-dasharray": [4, 2] },
      });
    }
  };

  // Toggle Source Layers
  const toggleSourceLayer = (key: keyof typeof sourceLayers) => {
    const updated = { ...sourceLayers, [key]: !sourceLayers[key] };
    setSourceLayers(updated);

    if (!mapRef.current) return;
    const map = mapRef.current;

    const layerMap: Record<string, string[]> = {
      industry: ["source-industry-fill", "source-industry-line"],
      transport: ["source-transport-line"],
      construction: ["source-construction-fill", "source-construction-line"],
      cropBurning: ["source-cropburning-fill", "source-cropburning-line"],
    };

    const targetLayers = layerMap[key] || [];
    targetLayers.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", updated[key] ? "visible" : "none");
      }
    });
  };

  const validDate = activeStep ? new Date(activeStep.valid_time) : new Date();

  return (
    <div className="flex flex-1 flex-col w-full h-full overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Top Compact Context Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="material-symbols-outlined text-lg">cyclone</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">{activeCorp.name}</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300 border border-slate-700">
                {activeCorp.district}
              </span>
              <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-400 border border-amber-500/30">
                WRF-Chem v4.5.1 [Coupled 9km/3km]
              </span>
              <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-400 border border-cyan-500/20">
                STATUS: DEMO FIXTURE
              </span>
            </div>
          </div>
        </div>

        {/* Time & Provenance Metadata */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-2.5 py-1">
            <span className="text-[10px] text-slate-400 uppercase">Valid:</span>
            <span className="font-bold text-amber-400">
              {validDate.toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}{" "}
              IST
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-2.5 py-1">
            <span className="text-[10px] text-slate-400 uppercase">Lead:</span>
            <span className="font-bold text-primary">T+{activeStep ? activeStep.lead_hour : 0}h</span>
          </div>
          <div className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-2.5 py-1 text-slate-400">
            <span className="text-[10px] uppercase">Grid Spacing:</span>
            <span className="text-slate-200">3 km (d02)</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden relative">
        {/* Left Surface: Geospatial Map Surface */}
        <section className="flex-1 relative flex flex-col h-full bg-[#0a0f1c] overflow-hidden">
          {/* Top Pollutant Selector Bar */}
          <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/95 p-1.5 backdrop-blur-md shadow-xl">
            <span className="px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Pollutant:
            </span>
            {(
              [
                { key: "aqi", label: "CPCB NAQI", unit: "Index" },
                { key: "pm25", label: "PM2.5", unit: "µg/m³" },
                { key: "pm10", label: "PM10", unit: "µg/m³" },
                { key: "no2", label: "NO₂", unit: "µg/m³" },
                { key: "o3", label: "O₃", unit: "ppb" },
                { key: "co", label: "CO", unit: "mg/m³" },
                { key: "so2", label: "SO₂", unit: "µg/m³" },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                onClick={() => setSelectedPollutant(p.key)}
                className={`flex items-center gap-1 rounded px-2.5 py-1 font-mono text-xs transition-all ${
                  selectedPollutant === p.key
                    ? "bg-primary text-slate-950 font-bold shadow"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <span>{p.label}</span>
                <span className="text-[9px] opacity-75">({p.unit})</span>
              </button>
            ))}
          </div>

          {/* Map Container */}
          <div ref={mapContainerRef} className="flex-1 w-full h-full relative" />

          {/* Coordinate & Model Info Footer on Map */}
          <div className="absolute bottom-16 left-3 z-20 font-mono text-slate-400 text-[10px] bg-slate-950/90 px-2.5 py-1 rounded border border-slate-800 backdrop-blur-sm">
            LAT {activeCorp.center[1].toFixed(4)}°N | LON {activeCorp.center[0].toFixed(4)}°E | Model Domain: d02_delhi_ncr
          </div>

          {/* Map Style Selector */}
          <div className="absolute bottom-16 right-3 z-20 flex gap-1 rounded-lg border border-slate-800 bg-slate-950/90 p-1 backdrop-blur-md">
            <button
              onClick={() => setIs3DMode(!is3DMode)}
              className={`px-2.5 py-1 rounded font-mono text-[11px] capitalize transition-all flex items-center gap-1 ${
                is3DMode ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">view_in_ar</span>
              3D
            </button>
            <div className="w-px bg-slate-800 mx-1"></div>
            {(["monochrome", "satellite", "hybrid"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setActiveStyle(s)}
                className={`px-2.5 py-1 rounded font-mono text-[11px] capitalize transition-all ${
                  activeStyle === s ? "bg-primary/20 text-primary border border-primary/40 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Compact Emission Sources & Weather Layer Controls (Collapsible) */}
          <div className="absolute top-14 left-3 z-30 w-72 rounded-lg border border-slate-800 bg-slate-900/95 backdrop-blur-md shadow-2xl overflow-hidden font-sans">
            <div
              onClick={() => setIsLegendOpen(!isLegendOpen)}
              className="flex items-center justify-between px-3 py-2 bg-slate-950/80 border-b border-slate-800 cursor-pointer select-none hover:bg-slate-950 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">layers</span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Layers & Sources</span>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-base">
                {isLegendOpen ? "expand_less" : "expand_more"}
              </span>
            </div>

            {isLegendOpen && (
              <div className="p-3 flex flex-col gap-3 text-xs">
                {/* 4 Compact Emission Source Toggles */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Emission Sources:
                  </span>

                  {/* 1. Industry & Power */}
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 flex items-center justify-center text-[8px] font-bold text-slate-950">
                        ▲
                      </span>
                      <span className="text-[11px] font-medium text-slate-200 group-hover:text-yellow-300">
                        Industry & Power (Point)
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={sourceLayers.industry}
                      onChange={() => toggleSourceLayer("industry")}
                      className="accent-yellow-400 cursor-pointer"
                    />
                  </label>

                  {/* 2. Road Transport */}
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 flex items-center justify-center text-[8px] font-bold text-slate-950">
                        ●
                      </span>
                      <span className="text-[11px] font-medium text-slate-200 group-hover:text-cyan-300">
                        Road Transport (Line)
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={sourceLayers.transport}
                      onChange={() => toggleSourceLayer("transport")}
                      className="accent-cyan-400 cursor-pointer"
                    />
                  </label>

                  {/* 3. Construction & Dust */}
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 flex items-center justify-center text-[8px] font-bold text-slate-950">
                        ■
                      </span>
                      <span className="text-[11px] font-medium text-slate-200 group-hover:text-purple-300">
                        Construction & Road Dust (Area)
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={sourceLayers.construction}
                      onChange={() => toggleSourceLayer("construction")}
                      className="accent-purple-400 cursor-pointer"
                    />
                  </label>

                  {/* 4. Crop-Residue Burning */}
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-orange-400 text-[14px]">local_fire_department</span>
                      <span className="text-[11px] font-medium text-slate-200 group-hover:text-orange-300">
                        Crop-Residue Burning (Upwind)
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={sourceLayers.cropBurning}
                      onChange={() => toggleSourceLayer("cropBurning")}
                      className="accent-orange-400 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="border-t border-slate-800"></div>

                {/* Separate Meteorological & Diagnostic Layer Controls */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Meteorology & Stability:
                  </span>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-teal-400 text-[14px]">air</span>
                      <span className="text-[11px] text-slate-300 group-hover:text-white">Surface Wind Streamlines</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={weatherLayers.windVectors}
                      onChange={() => setWeatherLayers((prev) => ({ ...prev, windVectors: !prev.windVectors }))}
                      className="accent-teal-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-400 text-[14px]">height</span>
                      <span className="text-[11px] text-slate-300 group-hover:text-white">Boundary Layer (PBLH)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={weatherLayers.pblBoundary}
                      onChange={() => setWeatherLayers((prev) => ({ ...prev, pblBoundary: !prev.pblBoundary }))}
                      className="accent-amber-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-rose-400 text-[14px]">thermostat</span>
                      <span className="text-[11px] text-slate-300 group-hover:text-white">Inversion Trapping Contour</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={weatherLayers.inversionContour}
                      onChange={() => setWeatherLayers((prev) => ({ ...prev, inversionContour: !prev.inversionContour }))}
                      className="accent-rose-400 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Fixed 72-Hour Interactive Timeline */}
          <div className="h-16 bg-slate-900/95 border-t border-slate-800 flex flex-col justify-center px-4 gap-1.5 z-20 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex h-7 w-7 items-center justify-center rounded bg-primary text-slate-950 font-bold hover:bg-primary/90 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">{isPlaying ? "pause" : "play_arrow"}</span>
                </button>
                <button
                  onClick={() => setCurrentLeadIndex(0)}
                  className="px-2 py-0.5 rounded border border-slate-800 bg-slate-950 text-[10px] font-mono text-slate-300 hover:text-white"
                >
                  T+0
                </button>
                <span className="text-xs font-mono text-slate-300 ml-2">
                  Forecast Lead: <span className="text-primary font-bold">T+{activeStep ? activeStep.lead_hour : 0}h</span>
                  <span className="text-slate-500 mx-1.5">|</span>
                  Valid:{" "}
                  <span className="text-amber-400 font-semibold">
                    {validDate.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST
                  </span>
                </span>
              </div>

              {/* Sparkline & CPCB dominant display */}
              {activeStep && (
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                    style={{ backgroundColor: `${activeStep.aqi.color}25`, color: activeStep.aqi.color, border: `1px solid ${activeStep.aqi.color}40` }}
                  >
                    AQI {activeStep.aqi.value} ({activeStep.aqi.category})
                  </span>
                </div>
              )}
            </div>

            {/* Range Slider */}
            <input
              type="range"
              min="0"
              max={forecastSeries.length > 0 ? forecastSeries.length - 1 : 72}
              value={currentLeadIndex}
              onChange={(e) => {
                setCurrentLeadIndex(parseInt(e.target.value));
                setIsPlaying(false);
              }}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-primary"
            />
          </div>
        </section>

        {/* Right Surface: Diagnostic Matrix with Forecast / Inversion / Burning Tabs */}
        <aside className="w-full md:w-[380px] lg:w-[420px] bg-slate-950 flex flex-col h-full border-l border-slate-800 shrink-0 overflow-y-auto">
          {/* Tab Navigation Header */}
          <div className="flex border-b border-slate-800 bg-slate-900/80 p-1 gap-1 shrink-0">
            {(
              [
                { key: "forecast", label: "72h Forecast", icon: "show_chart" },
                { key: "inversion", label: "Inversion Profile", icon: "air" },
                { key: "burning", label: "Stubble Plume", icon: "local_fire_department" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded text-xs font-mono transition-all ${
                  activeTab === t.key
                    ? "bg-slate-800 text-primary font-bold border border-slate-700 shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Body Content */}
          <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto">
            {loadingForecast ? (
              <div className="flex h-48 items-center justify-center font-mono text-xs text-slate-400">
                Loading coupled atmospheric diagnostic package...
              </div>
            ) : forecastError ? (
              <div className="rounded border border-rose-500/30 bg-rose-500/10 p-3 font-mono text-xs text-rose-400">
                Forecast feed error: {forecastError}
              </div>
            ) : activeStep ? (
              <>
                {/* Tab 1: Forecast Overview & Species Matrix */}
                {activeTab === "forecast" && (
                  <div className="flex flex-col gap-3">
                    {/* CPCB Index Status Card */}
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-slate-400">CPCB NAQI Index</span>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                          style={{ backgroundColor: `${activeStep.aqi.color}25`, color: activeStep.aqi.color }}
                        >
                          {activeStep.aqi.category}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black font-mono" style={{ color: activeStep.aqi.color }}>
                          {activeStep.aqi.value}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          Dominant: <strong className="text-white">{activeStep.aqi.dominant_pollutant}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Criteria Species Breakdown */}
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                        Coupled Species Concentrations (T+{activeStep.lead_hour}h):
                      </span>
                      <div className="space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between items-center text-slate-300">
                          <span>PM2.5 (Coupled ON):</span>
                          <span className="font-bold text-white">{activeStep.species.pm25} µg/m³</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>PM2.5 (Feedback OFF):</span>
                          <span>{activeStep.species.pm25_feedback_off} µg/m³</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span>PM10:</span>
                          <span className="font-bold text-white">{activeStep.species.pm10} µg/m³</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span>NO₂:</span>
                          <span className="font-bold text-white">{activeStep.species.no2} µg/m³</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span>Ozone (O₃):</span>
                          <span className="font-bold text-white">{activeStep.species.o3} ppb</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span>Carbon Monoxide (CO):</span>
                          <span className="font-bold text-white">{activeStep.species.co} mg/m³</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span>Sulphur Dioxide (SO₂):</span>
                          <span className="font-bold text-white">{activeStep.species.so2} µg/m³</span>
                        </div>
                      </div>
                    </div>

                    {/* 72h Trend Sparkline */}
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-slate-400">72-Hour PM2.5 Trajectory:</span>
                        <div className="flex items-center rounded border border-slate-700 bg-slate-900">
                          <button
                            onClick={() => setPlotMode("coupled")}
                            className={`px-2 py-0.5 text-[9px] font-mono transition-all ${
                              plotMode === "coupled" ? "bg-primary text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                            }`}
                          >
                            COUPLED
                          </button>
                          <button
                            onClick={() => setPlotMode("uncoupled")}
                            className={`px-2 py-0.5 text-[9px] font-mono transition-all ${
                              plotMode === "uncoupled" ? "bg-primary text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                            }`}
                          >
                            UNCOUPLED
                          </button>
                        </div>
                      </div>
                      <div className="flex h-14 w-full items-end gap-0.5 bg-slate-950 p-1 rounded border border-slate-800/60">
                        {forecastSeries.map((step, idx) => {
                          const val = plotMode === "coupled" ? step.species.pm25 : step.species.pm25_feedback_off;
                          const heightPct = Math.min(100, Math.max(8, (val / 350) * 100));
                          const isSel = idx === currentLeadIndex;
                          // If uncoupled is plotted, just use a gray scale or the standard color
                          const color = plotMode === "coupled" ? step.aqi.color : "#94a3b8";
                          return (
                            <div
                              key={step.lead_hour}
                              onClick={() => setCurrentLeadIndex(idx)}
                              title={`T+${step.lead_hour}h: ${val} µg/m³`}
                              style={{
                                height: `${heightPct}%`,
                                backgroundColor: isSel ? "#38bdf8" : color,
                                opacity: isSel ? 1 : 0.6,
                              }}
                              className="flex-1 rounded-t-xs cursor-pointer hover:opacity-100 transition-all"
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Vertical Temperature Inversion & Boundary Layer */}
                {activeTab === "inversion" && (
                  <div className="flex flex-col gap-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
                      <span className="text-xs font-mono uppercase text-slate-400 block">Boundary Layer Trapping</span>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">PBL Height:</span>
                          <span className="text-sm font-bold text-amber-400">{activeStep.diagnostics.pblh_m} m AGL</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Ventilation Coeff:</span>
                          <span className="text-sm font-bold text-white">
                            {activeStep.diagnostics.ventilation_coefficient_m2s} m²/s
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-xs font-mono">
                        <span className="text-slate-400">Surface Inversion:</span>
                        {activeStep.diagnostics.has_surface_inversion ? (
                          <span className="rounded bg-rose-500/20 px-2 py-0.5 font-bold text-rose-400 border border-rose-500/30">
                            DETECTED (TRAPPING)
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-400 border border-emerald-500/30">
                            UNCONFINED (MIXED)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-2 text-xs font-mono">
                      <span className="text-[11px] font-bold text-slate-300 block">Inversion Sounding Metrics:</span>
                      <div className="space-y-1 text-slate-400 leading-relaxed">
                        <p>• Inversion Base: 0 m (Surface-based)</p>
                        <p>• Inversion Top: ~280 m AGL</p>
                        <p>• Lapse Rate Gradient: +1.8°C / 100m (Stable)</p>
                        <p>• Ventilation Category: <span className="text-amber-400 uppercase font-semibold">{activeStep.diagnostics.ventilation_category}</span></p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Stubble Burning Plume & Upwind Attribution */}
                {activeTab === "burning" && (
                  <div className="flex flex-col gap-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
                      <span className="text-xs font-mono uppercase text-slate-400 block">Transboundary Smoke Attribution</span>
                      <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                        <span className="text-[10px] font-mono text-slate-400 block">Estimated Agricultural PM2.5 Load:</span>
                        <div className="text-lg font-bold font-mono text-orange-400">
                          {activeStep.diagnostics.fire_pm25_ug_m3} µg/m³
                          <span className="text-xs text-slate-400 font-normal ml-1.5">
                            ({activeStep.diagnostics.fire_attribution_pct}% of total PM2.5)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-2 text-xs font-mono text-slate-400 leading-relaxed">
                      <span className="text-[11px] font-bold text-slate-300 block">Source Attribution Methodology:</span>
                      <p>• Upwind Cluster: Punjab / Haryana Stubble Belt</p>
                      <p>• FRP Parameterization: VIIRS 375m & MODIS 1km</p>
                      <p>• Plume Injection Height: 650 m AGL (Freitas et al.)</p>
                      <p>• Transport Time to NCR: 14 - 18 hours (NW flow)</p>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Bottom Secondary Links */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs font-mono shrink-0">
            <a href="/dashboard/forecast" className="text-primary hover:underline flex items-center gap-1">
              <span>Full Forecast Terminal</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </a>
            <a href="/dashboard/ml-ops/validation" className="text-slate-400 hover:text-slate-200">
              Model Validation &rarr;
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
