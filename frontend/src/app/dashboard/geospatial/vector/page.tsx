"use client";

import React, { useState, useEffect } from "react";
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

export default function GeospatialDataControls() {
  const { activeCorp } = useMunicipal();

  // View Mode: 'monochrome' (standard vector base map) or 'satellite' (active satellite plume map)
  const [viewMode, setViewMode] = useState<"monochrome" | "satellite">("monochrome");

  // Ingestion Processing Animation state
  const [isProcessingPipeline, setIsProcessingPipeline] = useState(false);

  // Layer states
  const [caaQmsNodes, setCaaQmsNodes] = useState(true);
  const [trafficGrids, setTrafficGrids] = useState(false);
  const [factoryPerimeters, setFactoryPerimeters] = useState(true);
  const [sentinelPlume, setSentinelPlume] = useState(false);

  // Active Map style
  const [activeStyle, setActiveStyle] = useState<"monochrome" | "satellite" | "hybrid">("monochrome");

  const [is3DMode, setIs3DMode] = useState(true);
  const is3DModeRef = React.useRef(is3DMode);
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

  // Map refs
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);

  // Setup Mapbox GL JS map client and custom GeoJSON vector layers
  const setupMapLayers = (map: any) => {
    // 1. Traffic Segments Layer (LineStrings)
    map.addSource('traffic-grids-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: { type: 'LineString', coordinates: [[72.8250, 18.9150], [72.8350, 18.9200], [72.8450, 18.9250], [72.8550, 19.0100]] } },
          { type: 'Feature', geometry: { type: 'LineString', coordinates: [[72.8400, 18.9500], [72.8500, 18.9550], [72.8550, 18.9800]] } }
        ]
      }
    });

    map.addLayer({
      id: 'traffic-grids-layer',
      type: 'line',
      source: 'traffic-grids-source',
      paint: {
        'line-color': '#f59e0b',
        'line-width': 3,
        'line-dasharray': [2, 2],
        'line-opacity': 0.6
      },
      layout: {
        visibility: trafficGrids ? 'visible' : 'none'
      }
    });

    // 2. Factory Perimeters Layer (Polygons)
    map.addSource('factory-perimeters-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[72.8400, 18.9600], [72.8500, 18.9650], [72.8480, 18.9750], [72.8380, 18.9700], [72.8400, 18.9600]]] } },
          { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[72.8550, 19.0150], [72.8650, 19.0200], [72.8600, 19.0300], [72.8500, 19.0250], [72.8550, 19.0150]]] } }
        ]
      }
    });

    map.addLayer({
      id: 'factory-perimeters-layer',
      type: 'fill',
      source: 'factory-perimeters-source',
      paint: {
        'fill-color': '#fc7c78',
        'fill-opacity': 0.1
      },
      layout: {
        visibility: factoryPerimeters ? 'visible' : 'none'
      }
    });

    map.addLayer({
      id: 'factory-perimeters-outline',
      type: 'line',
      source: 'factory-perimeters-source',
      paint: {
        'line-color': '#fc7c78',
        'line-width': 1.5,
        'line-dasharray': [4, 2]
      },
      layout: {
        visibility: factoryPerimeters ? 'visible' : 'none'
      }
    });
  };

  // Map initialization
  React.useEffect(() => {
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
        center: [72.8347, 18.9220],
        zoom: 11.5,
        pitch: 60,
        bearing: -17.6,
        antialias: true,
        attributionControl: false
      });

      mapRef.current = mapInstance;

      mapInstance.on('style.load', () => {
        setupMapLayers(mapInstance);
        if (activeCorpRef.current) {
          renderCorpBoundary(mapInstance, activeCorpRef.current);
        }
      });
    });

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, []);

  // Update map style dynamically
  React.useEffect(() => {
    if (!mapRef.current) return;

    let styleUrl = "mapbox://styles/mapbox/dark-v11";
    if (activeStyle === "satellite") {
      styleUrl = "mapbox://styles/mapbox/satellite-v9";
    } else if (activeStyle === "hybrid") {
      styleUrl = "mapbox://styles/mapbox/satellite-streets-v12";
    }

    mapRef.current.setStyle(styleUrl);
  }, [activeStyle]);

  // Sync Traffic Grids Layer visibility
  React.useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (map.getLayer('traffic-grids-layer')) {
      map.setLayoutProperty('traffic-grids-layer', 'visibility', trafficGrids ? 'visible' : 'none');
    }
  }, [trafficGrids]);

  // Sync Factory Perimeters Layer visibility
  React.useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (map.getLayer('factory-perimeters-layer')) {
      map.setLayoutProperty('factory-perimeters-layer', 'visibility', factoryPerimeters ? 'visible' : 'none');
      map.setLayoutProperty('factory-perimeters-outline', 'visibility', factoryPerimeters ? 'visible' : 'none');
    }
  }, [factoryPerimeters]);

  // CAAQMS Markers Update
  React.useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!caaQmsNodes) return;

    const mockSensors = [
      { id: "MUM_001", aqi: 42, lng: 72.8347, lat: 18.9220, name: "Worli Ground Station" },
      { id: "MUM_042", aqi: 412, lng: 72.8300, lat: 18.9300, name: "Worli-Naka Intersection" },
      { id: "MUM_101", aqi: 180, lng: 72.8580, lat: 19.0180, name: "Wadala Terminal Station" }
    ];

    mockSensors.forEach((facility) => {
      let colorClass = "bg-[#10b981]";
      let borderClass = "border-[#10b981]/50";
      let textClass = "text-[#10b981]";
      let statusText = "NOMINAL";

      if (facility.aqi > 200) {
        colorClass = "bg-red-500 animate-pulse";
        borderClass = "border-red-500";
        textClass = "text-red-500";
        statusText = "CRITICAL LIMIT";
      } else if (facility.aqi > 150) {
        colorClass = "bg-amber-500 animate-pulse";
        borderClass = "border-amber-500";
        textClass = "text-amber-500";
        statusText = "ALERT WARNING";
      }

      const el = document.createElement("div");
      el.className = "custom-marker";
      el.innerHTML = `
        <div class="relative flex flex-col items-center group cursor-pointer font-body-md">
          <div class="absolute -inset-2 rounded-full ${facility.aqi > 150 ? "bg-red-500/20 animate-ping" : ""} pointer-events-none"></div>
          <div class="w-4 h-4 rounded-full ${colorClass} border-2 border-slate-950 flex items-center justify-center shadow-lg relative z-10">
            <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
          </div>
          <span class="text-[9px] font-mono font-bold bg-slate-950/90 text-slate-300 px-1 py-0.5 border border-slate-800 rounded mt-1 z-10 select-none shadow">${facility.id}</span>
          
          <div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 bg-slate-900/95 border ${borderClass} p-3 w-56 rounded-lg shadow-2xl hidden group-hover:block z-50 text-left backdrop-blur-md">
            <div class="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
              <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono">${facility.id}</span>
              <span class="px-1.5 py-0.5 rounded text-[8px] font-bold ${textClass} bg-slate-950 border border-current font-mono">${statusText}</span>
            </div>
            <div class="space-y-1 text-[11px] leading-relaxed">
              <div class="text-white font-semibold truncate">${facility.name}</div>
              <div class="text-slate-400 flex justify-between font-mono">
                <span>AQI:</span>
                <span class="text-white font-bold">${facility.aqi}</span>
              </div>
            </div>
          </div>
        </div>
      `;

      import("mapbox-gl").then((mapboxglModule) => {
        const mapboxgl = mapboxglModule.default;
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([facility.lng, facility.lat])
          .addTo(mapRef.current);
      });
    });
  }, [caaQmsNodes]);

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
    map.flyTo({
      center: activeCorp.center,
      zoom: 11.2,
      essential: true
    });

    if (map.isStyleLoaded() || map.loaded()) {
      renderCorpBoundary(map, activeCorp);
    } else {
      map.once("load", () => renderCorpBoundary(map, activeCorp));
      map.once("style.load", () => renderCorpBoundary(map, activeCorp));
    }
  }, [activeCorp]);

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
    },
    {
      sql: "UPDATE active_zones\nSET aqi = 412, last_audited = NOW()\nWHERE zone_id = 'MUM_042';",
      streamId: "7D-109",
      result: "// Result: 1 row updated in 4ms"
    },
    {
      sql: "SELECT ST_Buffer(geom, 1000)\nFROM factory_perimeters\nWHERE emissions > 300;",
      streamId: "4C-501",
      result: "// Result: 5 buffers calculated in 15ms"
    }
  ];

  // Pipeline Ingestion Logs state
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([
    "ESA Copernicus Hub Sync Ready. Connection [IDLE]",
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setQueryIndex((prev) => (prev + 1) % queries.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Style change handler (binds viewMode to monochrome or satellite)
  const handleStyleChange = (style: "monochrome" | "satellite" | "hybrid") => {
    setActiveStyle(style);
    if (style === "monochrome") {
      setViewMode("monochrome");
    } else {
      setViewMode("satellite");
    }
  };

  // Pipeline Sync handler
  const handlePipelineSync = () => {
    if (isProcessingPipeline) return;
    setIsProcessingPipeline(true);
    setViewMode("satellite");
    setActiveStyle("satellite");
    setPipelineLogs([]);

    // Log Stream Sequence
    setTimeout(() => {
      setPipelineLogs((prev) => [
        ...prev,
        "ESA Copernicus Data Hub Connection Established... [OK]"
      ]);
    }, 100);

    setTimeout(() => {
      setPipelineLogs((prev) => [
        ...prev,
        "Dataset Stream: Sentinel-5P TROPOMI Level-3 (NO2/SO2) Gas Concentration..."
      ]);
    }, 1000);

    setTimeout(() => {
      setPipelineLogs((prev) => [
        ...prev,
        "Raster Matrix: Processing 44km footprint tiles over region centroid..."
      ]);
    }, 2000);

    setTimeout(() => {
      setPipelineLogs((prev) => [
        ...prev,
        "Distortion Filter: Executing cloud-masking algorithms (QA value > 0.50)... [ACTIVE]"
      ]);
    }, 3000);

    setTimeout(() => {
      setPipelineLogs((prev) => [
        ...prev,
        "Raster Realignment: Mapping 2D thermal plumes to Uber H3 coordinates... [DONE]"
      ]);
      setIsProcessingPipeline(false);
    }, 4000);
  };

  // Export Dataset Handler
  const handleExport = () => {
    const data = {
      timestamp: new Date().toISOString(),
      activeLayers: { caaQmsNodes, trafficGrids, factoryPerimeters, sentinelPlume },
      mapStyle: activeStyle,
      viewMode,
      pipelineSyncedLogs: pipelineLogs,
      focusCoordinates: { lat: 19.0760, lon: 72.8777 },
      activeQueryStream: queries[queryIndex]
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `VayuSense_Satellite_Export_${Date.now()}.json`;
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

        {/* Floating PostGIS Control Card */}
        <div className="absolute top-6 left-6 w-[320px] bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-2xl z-30 text-left">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">layers</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">Geospatial Matrix Filter</h2>
            </div>
            <button className="material-symbols-outlined text-slate-500 text-xs hover:text-white">more_vert</button>
          </div>
          <div className="p-2 flex flex-col gap-1">
            <div 
              onClick={() => setCaaQmsNodes(!caaQmsNodes)}
              className={`flex items-center justify-between p-2 hover:bg-slate-800 transition-colors group cursor-pointer ${!caaQmsNodes ? 'opacity-40' : ''}`}
            >
              <span className="text-xs font-semibold text-slate-300">IoT Ground Sensors (CAAQMS)</span>
              <div className={`w-8 h-4 border rounded-full relative transition-colors ${caaQmsNodes ? 'bg-primary/30 border-primary' : 'bg-slate-950 border-slate-700'}`}>
                <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all ${caaQmsNodes ? 'right-0.5 bg-primary' : 'left-0.5 bg-slate-500'}`}></div>
              </div>
            </div>

            <div 
              onClick={() => setTrafficGrids(!trafficGrids)}
              className={`flex items-center justify-between p-2 hover:bg-slate-800 transition-colors group cursor-pointer ${!trafficGrids ? 'opacity-45' : ''}`}
            >
              <span className="text-xs font-semibold text-slate-300">Heavy Logistics Traffic Grids</span>
              <div className={`w-8 h-4 border rounded-full relative transition-colors ${trafficGrids ? 'bg-primary/30 border-primary' : 'bg-slate-950 border-slate-700'}`}>
                <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all ${trafficGrids ? 'right-0.5 bg-primary' : 'left-0.5 bg-slate-500'}`}></div>
              </div>
            </div>

            <div 
              onClick={() => setFactoryPerimeters(!factoryPerimeters)}
              className={`flex items-center justify-between p-2 hover:bg-slate-800 transition-colors group cursor-pointer ${!factoryPerimeters ? 'opacity-45' : ''}`}
            >
              <span className="text-xs font-semibold text-slate-300">Industrial & Factory Perimeters</span>
              <div className={`w-8 h-4 border rounded-full relative transition-colors ${factoryPerimeters ? 'bg-primary/30 border-primary' : 'bg-slate-950 border-slate-700'}`}>
                <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all ${factoryPerimeters ? 'right-0.5 bg-primary' : 'left-0.5 bg-slate-500'}`}></div>
              </div>
            </div>

            <div 
              onClick={() => setSentinelPlume(!sentinelPlume)}
              className={`flex items-center justify-between p-2 hover:bg-slate-800 transition-colors group cursor-pointer ${!sentinelPlume ? 'opacity-45' : ''}`}
            >
              <span className="text-xs font-semibold text-slate-300">Sentinel-5P Tropospheric Column</span>
              <div className={`w-8 h-4 border rounded-full relative transition-colors ${sentinelPlume ? 'bg-primary/30 border-primary' : 'bg-slate-950 border-slate-700'}`}>
                <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all ${sentinelPlume ? 'right-0.5 bg-primary' : 'left-0.5 bg-slate-500'}`}></div>
              </div>
            </div>

            {/* AQI Status & Hazard Legend */}
            <div className="mt-2 pt-3 border-t border-slate-800 p-2 flex flex-col gap-1.5 font-mono text-[10px]">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">AQI Hazard Status Legend</span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                  <span className="text-slate-300 font-semibold">Nominal</span>
                </div>
                <span className="text-[#10b981] font-bold">AQI ≤ 150</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
                  <span className="text-slate-300 font-semibold">Warning Alert</span>
                </div>
                <span className="text-[#f59e0b] font-bold">150 &lt; AQI ≤ 200</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-pulse"></span>
                  <span className="text-red-400 font-bold">Critical Limit</span>
                </div>
                <span className="text-[#ef4444] font-bold">AQI &gt; 200</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Style selectors */}
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
              onClick={() => handleStyleChange("monochrome")}
              className={`text-left px-3 py-2 text-xs font-semibold rounded ${
                activeStyle === "monochrome"
                  ? "bg-slate-800 text-primary border-l-2 border-primary"
                  : "text-slate-400 hover:bg-slate-800 transition-all hover:text-white"
              }`}
            >
              Monochrome Vector
            </button>
            <button
              onClick={() => handleStyleChange("satellite")}
              className={`text-left px-3 py-2 text-xs font-semibold rounded ${
                activeStyle === "satellite"
                  ? "bg-slate-800 text-primary border-l-2 border-primary"
                  : "text-slate-400 hover:bg-slate-800 transition-all hover:text-white"
              }`}
            >
              Spectral Satellite
            </button>
            <button
              onClick={() => handleStyleChange("hybrid")}
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
          <div className="bg-slate-950 border border-slate-850 p-4 flex flex-col gap-1 rounded">
            <span className="text-[10px] font-bold text-primary uppercase tracking-tighter opacity-70">
              Focus Coordinates
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-white text-base font-semibold">LAT 19.0760° N</span>
              <span className="font-mono text-white text-base font-semibold">LON 72.8777° E</span>
            </div>
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

          <div>
            <h3 className="text-xs font-bold text-white mb-3 tracking-wider">
              SYSTEM ALERTS
            </h3>
            <div className="flex items-start gap-3 p-3 bg-red-950/20 border border-red-500/30 rounded">
              <span className="material-symbols-outlined text-red-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                warning
              </span>
              <div className="flex-1">
                <p className="text-xs text-red-400 font-bold">Anomalous Particle Peak</p>
                <p className="text-[11px] text-slate-400 leading-snug mt-1">
                  Zone 4 (Vashi Industrial) showing 300% PM2.5 delta increase over T-minus 10m.
                </p>
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
