"use client";

import React, { useState, useEffect } from "react";
import { useMunicipal } from "@/context/MunicipalContext";
import { boundsAroundCenter, imageCoordinates } from "@/lib/satelliteBounds.mjs";

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

export default function SatelliteIngestionSync() {
  const { activeCorp } = useMunicipal();

  // Ingestion Processing Animation state (default to false until clicked)
  const [isProcessingPipeline, setIsProcessingPipeline] = useState(false);

  // Active Map style
  const [activeStyle, setActiveStyle] = useState<"monochrome" | "satellite" | "hybrid">("satellite");

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

  // PostGIS simulated live query stream
  const [queryIndex, setQueryIndex] = useState(0);
  const queries = [
    {
      sql: "SELECT ST_AsGeoJSON(geom)\nFROM caaqms_nodes\nWHERE spatial_status = 'ACTIVE';",
      streamId: "9X-214",
      result: "// Result: 247 geometries returned in 12ms"
    },
    {
      sql: "SELECT ST_Centroid(geom)\nFROM factory_perimeters\nWHERE compliance_level = 'CRITICAL';",
      streamId: "5Y-884",
      result: "// Result: 18 factory centroids computed in 8ms"
    },
    {
      sql: "SELECT ST_Intersection(roads.geom, grids.geom)\nFROM heavy_logistics_grids grids\nJOIN roads ON ST_Intersects(roads.geom, grids.geom);",
      streamId: "2A-352",
      result: "// Result: 142 intersected line segments in 34ms"
    }
  ];

  // Pipeline Ingestion Logs state
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([
    "ESA Copernicus Hub Sync Ready. Connection [IDLE]",
  ]);

  // Satellite Plume state
  const [plumeImage, setPlumeImage] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Map refs
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setQueryIndex((prev) => (prev + 1) % queries.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Mapbox GL JS Map initialization
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let mapInstance: any;

    import("mapbox-gl").then((mapboxglModule) => {
      const mapboxgl = mapboxglModule.default;
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

      mapInstance = new mapboxgl.Map({
        container: mapContainerRef.current!,
        style: activeStyle === "satellite" 
          ? "mapbox://styles/mapbox/satellite-v9" 
          : activeStyle === "hybrid"
          ? "mapbox://styles/mapbox/satellite-streets-v12"
          : "mapbox://styles/mapbox/dark-v11",
        center: activeCorpRef.current.center,
        zoom: 11.5,
        pitch: 60,
        bearing: -17.6,
        antialias: true,
        attributionControl: false
      });

      mapInstance.on("load", () => {
        add3DFeatures(mapInstance);
        function rotateCamera(timestamp: number) { if (!mapInstance) return; if (is3DModeRef.current && !isFlyingRef.current) { mapInstance.rotateTo((timestamp / 200) % 360, { duration: 0 }); } requestAnimationFrame(rotateCamera); } requestAnimationFrame(rotateCamera);

        if (activeCorpRef.current) {
          renderCorpBoundary(mapInstance, activeCorpRef.current);
        }
      });

      mapRef.current = mapInstance;
    });

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, []);

  // Sync active style updates
  useEffect(() => {
    if (!mapRef.current) return;

    let styleUrl = "mapbox://styles/mapbox/dark-v11";
    if (activeStyle === "satellite") {
      styleUrl = "mapbox://styles/mapbox/satellite-v9";
    } else if (activeStyle === "hybrid") {
      styleUrl = "mapbox://styles/mapbox/satellite-streets-v12";
    }

    mapRef.current.setStyle(styleUrl);
  }, [activeStyle]);

  // Store activeCorp ref to access in map load callback
  const activeCorpRef = React.useRef(activeCorp);
  useEffect(() => {
    activeCorpRef.current = activeCorp;
  }, [activeCorp]);

  // Helper function to draw dotted boundary outline
  const renderCorpBoundary = (map: any, corp: any) => {
    if (!map || !corp) return;

    map.flyTo({
      center: corp.center,
      zoom: 11.2,
        pitch: 60,
        bearing: -17.6,
        antialias: true,
      speed: 1.4,
      essential: true
    });

    const geojsonFeature = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [corp.boundaryPolygon]
      },
      properties: {
        name: corp.name,
        shortName: corp.shortName,
        aqi: corp.aqi,
        status: corp.status
      }
    };

    const outlineColor = corp.status === "Critical" ? "#ef4444" : corp.status === "Warning" ? "#f59e0b" : "#10b981";

    if (map.getSource("active-corp-boundary")) {
      (map.getSource("active-corp-boundary") as any).setData(geojsonFeature);
    } else {
      map.addSource("active-corp-boundary", {
        type: "geojson",
        data: geojsonFeature
      });

      // Outer Glow Underlay
      map.addLayer({
        id: "active-corp-boundary-glow",
        type: "line",
        source: "active-corp-boundary",
        paint: {
          "line-color": outlineColor,
          "line-width": 7,
          "line-blur": 3,
          "line-opacity": 0.4,
          "line-dasharray": [3, 2]
        }
      });

      // Dotted Border Line Overlay on Real Administrative Coastline Boundary
      map.addLayer({
        id: "active-corp-boundary-line",
        type: "line",
        source: "active-corp-boundary",
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": outlineColor,
          "line-width": 3.5,
          "line-opacity": 1.0,
          "line-dasharray": [3, 2] // Dotted border pattern along coastline
        }
      });
    }

    if (map.getLayer("active-corp-boundary-glow")) {
      map.setPaintProperty("active-corp-boundary-glow", "line-color", outlineColor);
    }
    if (map.getLayer("active-corp-boundary-line")) {
      map.setPaintProperty("active-corp-boundary-line", "line-color", outlineColor);
    }
  };

  // Sync active Municipal Corporation selection to Mapbox view & boundary outline
  useEffect(() => {
    if (!mapRef.current || !activeCorp) return;
    const map = mapRef.current;

    // Fly to new location
    isFlyingRef.current = true;
    map.flyTo({
      center: activeCorp.center,
      zoom: 11.2,
      essential: true
    });
    
    map.once("moveend", () => {
      isFlyingRef.current = false;
    });

    if (map.isStyleLoaded() || map.loaded()) {
      renderCorpBoundary(map, activeCorp);
    } else {
      map.once("load", () => renderCorpBoundary(map, activeCorp));
      map.once("style.load", () => renderCorpBoundary(map, activeCorp));
    }
  }, [activeCorp]);

  // Sync plume raster overlay onto Mapbox view
  useEffect(() => {
    if (!mapRef.current || !plumeImage || !metadata?.bounds) return;

    const map = mapRef.current;
    
    const updatePlumeSource = () => {
      if (map.getLayer('sentinel-plume-layer')) {
        map.removeLayer('sentinel-plume-layer');
      }
      if (map.getSource('sentinel-plume-source')) {
        map.removeSource('sentinel-plume-source');
      }

      map.addSource('sentinel-plume-source', {
        type: 'image',
        url: plumeImage,
        coordinates: imageCoordinates(metadata.bounds)
      });

      map.addLayer({
        id: 'sentinel-plume-layer',
        type: 'raster',
        source: 'sentinel-plume-source',
        paint: {
          'raster-opacity': 0.85
        }
      });
    };

    if (map.isStyleLoaded()) {
      updatePlumeSource();
    } else {
      map.once('style.load', updatePlumeSource);
    }
    return () => { map.off('style.load', updatePlumeSource); };
  }, [plumeImage, metadata]);

  // Pipeline Sync trigger handler querying real CDSE / Sentinel Hub backend APIs
  const handlePipelineSync = async () => {
    if (isProcessingPipeline) return;
    setIsProcessingPipeline(true);
    setErrorMessage(null);
    setPipelineLogs(["Initializing connection to Copernicus Data Space Ecosystem..."]);

    try {
      const response = await fetch("/api/geospatial/satellite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bounds: boundsAroundCenter(activeCorp.center) })
      });

      const resData = await response.json();
      if (!response.ok || resData.status === "error") {
        throw new Error(resData.message || "Failed to trigger satellite sync");
      }

      setPipelineLogs((prev) => [
        ...prev,
        "OIDC Authentication token verification... [OK]",
        "STAC Search: Selected dataset collection 'sentinel-5p-l2'...",
        `Isolated recent scene: ID = ${resData.data.metadata.sceneId}`,
        `Acquisition Timestamp: ${new Date(resData.data.metadata.datetime).toLocaleString()}`,
        `Cloud cover validation: ${resData.data.metadata.cloudCover.toFixed(2)}%`,
        "Rendering NO2 tropospheric column plume via Process API... [DONE]"
      ]);

      setPlumeImage(resData.data.image);
      setMetadata(resData.data.metadata);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Pipeline Sync Failed");
      setPipelineLogs((prev) => [
        ...prev,
        `[ERROR] Ingestion sync aborted: ${err.message || "Connection refused"}`
      ]);
    } finally {
      setIsProcessingPipeline(false);
    }
  };

  // Export Dataset Handler
  const handleExport = () => {
    const data = {
      timestamp: new Date().toISOString(),
      mapStyle: activeStyle,
      pipelineLogs,
      focusCoordinates: { lat: 19.0760, lon: 72.8777 },
      activeQueryStream: queries[queryIndex]
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `VayuSense_Pipeline_Export_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-grow flex flex-col md:flex-row overflow-hidden w-full h-full relative">
      
      {/* Main Map Viewport */}
      <section id="mapbox-vector-engine" className="relative flex-1 h-full bg-[#05080a] overflow-hidden border-r border-[#3c4a42]/30">
        <div className="absolute inset-0 z-0" ref={mapContainerRef}></div>
        <div className="map-grid-overlay absolute inset-0 pointer-events-none z-10"></div>

        {isProcessingPipeline && (
          <div className="absolute top-[20%] left-[20%] w-[50%] h-[50%] border border-cyan-500/40 z-20 pointer-events-none">
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>
            <div className="scanning-line"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
              <div className="bg-black/60 backdrop-blur-md border border-cyan-500/50 px-4 py-2 rounded shadow-2xl flex items-center gap-3">
                <span className="material-symbols-outlined text-cyan-400 text-sm animate-spin">refresh</span>
                <span className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase font-bold">
                  PROCESSING: CLOUD MASK REMOVAL FILTER (QA &gt; 0.50)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Floating AQI Hazard Legend */}
        <div className="absolute top-6 left-6 w-[260px] bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-lg shadow-2xl z-30 text-left font-mono text-[10px]">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">AQI Hazard Status Legend</span>
          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
              <span className="text-slate-300 font-semibold">Nominal</span>
            </div>
            <span className="text-[#10b981] font-bold">AQI ≤ 150</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
              <span className="text-slate-300 font-semibold">Warning Alert</span>
            </div>
            <span className="text-[#f59e0b] font-bold">150 &lt; AQI ≤ 200</span>
          </div>
          <div className="flex items-center justify-between py-1 pt-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-pulse"></span>
              <span className="text-red-400 font-bold">Critical Limit</span>
            </div>
            <span className="text-[#ef4444] font-bold">AQI &gt; 200</span>
          </div>
        </div>

        {/* Floating Style selector */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-1 z-30 text-left">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 flex flex-col min-w-[180px] rounded-lg shadow-xl">
            <button
              onClick={() => setIs3DMode(!is3DMode)}
              className={`text-left px-3 py-2 text-xs font-semibold rounded mb-1 flex items-center justify-between ${
                is3DMode
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "text-slate-400 hover:bg-slate-800 transition-all hover:text-white"
              }`}
            >
              <span>3D Cinematic View</span>
              <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
            </button>
            <div className="h-px bg-slate-800 my-1 mx-2"></div>
            <button
              onClick={() => setActiveStyle("satellite")}
              className={`text-left px-3 py-2 text-xs font-semibold rounded ${
                activeStyle === "satellite"
                  ? "bg-slate-800 text-primary border-l-2 border-primary"
                  : "text-slate-400 hover:bg-slate-800 transition-all hover:text-white"
              }`}
            >
              Spectral Satellite
            </button>
            <button
              onClick={() => setActiveStyle("hybrid")}
              className={`text-left px-3 py-2 text-xs font-semibold rounded ${
                activeStyle === "hybrid"
                  ? "bg-slate-800 text-primary border-l-2 border-primary"
                  : "text-slate-400 hover:bg-slate-800 transition-all hover:text-white"
              }`}
            >
              Hybrid Analytics
            </button>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-30">
          <div className="flex flex-col bg-slate-900 border border-slate-800 rounded shadow-md overflow-hidden">
            <button className="p-2 border-b border-slate-850 hover:bg-slate-800 text-white material-symbols-outlined text-[20px]">
              add
            </button>
            <button className="p-2 hover:bg-slate-800 text-white material-symbols-outlined text-[20px]">
              remove
            </button>
          </div>
          <button className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white material-symbols-outlined text-[20px] rounded shadow-md">
            my_location
          </button>
        </div>
      </section>

      {/* Right Sidebar */}
      <aside className="w-1/4 h-full bg-slate-900/60 backdrop-blur-sm border-l border-[#3c4a42]/30 flex flex-col overflow-y-auto custom-scrollbar shrink-0 text-left">
        <div className="p-6 border-b border-slate-800/80 bg-slate-900/40">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">
            Spatial Intelligence Metadata
          </h2>
          <div className="space-y-3">
            <div className="bg-slate-950 border border-slate-850 p-4 flex flex-col gap-1 rounded">
              <span className="text-[10px] font-bold text-primary uppercase tracking-tighter opacity-70">
                Focus Coordinates
              </span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-white text-sm font-semibold">LAT 19.0760° N</span>
                <span className="font-mono text-white text-sm font-semibold">LON 72.8777° E</span>
              </div>
            </div>
            
            {metadata ? (
              <div className="bg-slate-950 border border-slate-850 p-4 flex flex-col gap-2 rounded text-slate-300 font-mono text-[10px] leading-relaxed">
                <span className="text-[10px] font-bold text-[#4f46e5] uppercase tracking-tighter opacity-70 font-sans">
                  Sentinel-5P Metadata
                </span>
                <div className="truncate">ID: <span className="text-white font-bold select-all">{metadata.sceneId}</span></div>
                <div>Platform: <span className="text-white font-bold">{metadata.platform}</span></div>
                <div>Acquisition: <span className="text-white font-bold">{new Date(metadata.datetime).toLocaleString()}</span></div>
                <div>Cloud Cover: <span className="text-white font-bold">{metadata.cloudCover.toFixed(2)}%</span></div>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-850 p-4 rounded text-slate-500 font-mono text-[10px] text-center">
                Trigger Ingestion Sync to fetch latest CDSE metadata
              </div>
            )}

            {errorMessage && (
              <div className="bg-red-950/40 border border-red-900 p-4 rounded text-red-400 font-mono text-[10px] leading-relaxed">
                <div className="font-bold uppercase mb-1">Sync Error:</div>
                <div>{errorMessage}</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-grow p-6 space-y-6">
          <div>
            <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2 tracking-wider">
              <span className="material-symbols-outlined text-[18px] text-primary">analytics</span>
              ACTIVE ZONE TELEMETRY
            </h3>
            <div className="space-y-4">
              <div className="p-3 border-l-2 border-primary bg-slate-950/40 rounded-r border border-y-slate-850 border-r-slate-850">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">Central Hub</span>
                  <span className="text-primary font-mono text-xs font-semibold">88% CAP</span>
                </div>
                <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: "88%" }}></div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2 tracking-wider">
              <span className="material-symbols-outlined text-[18px] text-indigo-400">satellite_alt</span>
              SENTINEL INGESTION PIPELINE SYNC
            </h3>
            <div className="bg-slate-950 border border-primary/40 shadow-[0_0_15px_rgba(78,222,163,0.1)] p-4 rounded space-y-4">
              <button
                onClick={handlePipelineSync}
                disabled={isProcessingPipeline}
                className={`w-full py-2.5 text-white font-bold text-[11px] uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 rounded-sm ${
                  isProcessingPipeline 
                    ? "animate-pulse-indigo cursor-not-allowed bg-indigo-900" 
                    : "bg-[#4f46e5] hover:bg-[#6366f1] shadow-[0_0_10px_rgba(79,70,229,0.3)]"
                }`}
              >
                <span className={`material-symbols-outlined text-sm ${isProcessingPipeline ? 'animate-spin' : ''}`}>
                  sync
                </span>
                <span>
                  {isProcessingPipeline ? "INGESTING & DE-CLOUDING DATA..." : "TRIGGER PIPELINE SYNC"}
                </span>
              </button>

              <div className="bg-black/40 border border-slate-850 p-3 font-mono text-[10px] leading-relaxed text-slate-400 rounded min-h-[100px] flex flex-col justify-start gap-1 max-h-[140px] overflow-y-auto custom-scrollbar">
                {pipelineLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0 mt-1"></span>
                    <span className="leading-snug">{log}</span>
                  </div>
                ))}
                {isProcessingPipeline && (
                  <div className="text-cyan-400 font-bold animate-pulse text-[9px] mt-1">
                    [PIPELINE INGESTION PIPELINE RUNNING...]
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-tighter">
                <span>Last Sync: {isProcessingPipeline ? "Syncing..." : "0m ago"}</span>
                <span>Pipeline Latency: 0.8s</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2 tracking-wider">
              <span className="material-symbols-outlined text-[18px] text-primary">terminal</span>
              POSTGIS QUERY LOG
            </h3>
            <div className="bg-slate-950 border border-slate-850 p-4 font-mono text-xs leading-relaxed text-primary/80 overflow-x-auto rounded">
              <div className="flex items-center gap-2 mb-2 text-slate-400 opacity-60">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="font-semibold">QUERY_STREAM_ID: {queries[queryIndex].streamId}</span>
              </div>
              <code className="block whitespace-pre text-left">
                {queries[queryIndex].sql}
              </code>
              <div className="text-slate-500 opacity-50 mt-3 pt-2 border-t border-slate-800/40 text-[10px] whitespace-pre">
                {queries[queryIndex].result}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-850 bg-slate-900/40 shrink-0 mt-auto">
          <button 
            onClick={handleExport}
            className="w-full py-3 bg-primary text-slate-950 font-bold text-xs uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 rounded shadow-[0_0_12px_rgba(16,185,129,0.2)]"
          >
            <span className="material-symbols-outlined text-sm font-bold">download</span>
            <span>Export Dataset</span>
          </button>
        </div>
      </aside>

    </div>
  );
}
