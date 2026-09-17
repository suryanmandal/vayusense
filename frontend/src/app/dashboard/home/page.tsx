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
      map.addLayer(
        {
          'id': '3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 12,
          'paint': {
            'fill-extrusion-color': '#2a3b4c',
            'fill-extrusion-height': [
              'interpolate', ['linear'], ['zoom'],
              12, 0,
              15.05, ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate', ['linear'], ['zoom'],
              12, 0,
              15.05, ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.8
          }
        },
        labelLayerId
      );
  }
}

interface LogMessage {
  time: string;
  sender: "SensorAgent" | "SourceAttributionAgent" | "ComplianceAgent" | "System";
  content: string;
}

export default function MainControlRoom() {
  const { activeCorp } = useMunicipal();

  // Map Style State
  const [activeStyle, setActiveStyle] = useState<"monochrome" | "satellite" | "hybrid">("monochrome");

  // 3D View State
  const [is3DMode, setIs3DMode] = useState(true);
  const is3DModeRef = useRef(is3DMode);
  const isFlyingRef = useRef(false);
  
  useEffect(() => {
    is3DModeRef.current = is3DMode;
    if (mapRef.current) {
      const map = mapRef.current;
      if (is3DMode) {
        map.easeTo({ pitch: 60, duration: 1000 });
        if (map.getLayer('3d-buildings')) {
          map.setLayoutProperty('3d-buildings', 'visibility', 'visible');
        }
      } else {
        map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
        if (map.getLayer('3d-buildings')) {
          map.setLayoutProperty('3d-buildings', 'visibility', 'none');
        }
      }
    }
  }, [is3DMode]);

  // Floating Control Panel Accordion / Hamburger Menu State (allows collapsing panel for big screen map view)
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(true);

  // Telemetry Layer States
  const [layers, setLayers] = useState({
    iotSensors: true,
    satellitePlume: true,
    activeConstruction: true,
    industrialZone: true,
    trafficCorridor: true,
    constructionZone: true,
  });

  // Timeline playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [timelineVal, setTimelineVal] = useState(85);

  // Multi-Agent Reasoning Feed state
  const [terminalLogs, setTerminalLogs] = useState<LogMessage[]>([
    { time: "10:14:22", sender: "SensorAgent", content: "flagged PM2.5 threshold breach. Confidence: 98.4%" },
    { time: "10:14:23", sender: "SourceAttributionAgent", content: "executed satellite plume spatial clipping. Correlating with industrial zone polygon IND_88." },
    { time: "10:14:25", sender: "ComplianceAgent", content: "generated optimized inspector enforcement route. Awaiting dispatcher authorization." },
  ]);

  // Terminal scroll reference
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Dispatch Inspector state
  const [isDispatching, setIsDispatching] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  // Live Telemetry data state from SSE stream
  const [liveTelemetry, setLiveTelemetry] = useState<any[]>([]);

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Establish SSE stream listener
  useEffect(() => {
    const eventSource = new EventSource("/api/telemetry/stream");
    
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.status === "success" && Array.isArray(payload.data)) {
          setLiveTelemetry(payload.data);
        }
      } catch (err) {
        console.error("Error parsing telemetry stream message:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE stream connection error:", err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Update Multi-Agent Reasoning feed dynamically on critical breach updates
  useEffect(() => {
    if (liveTelemetry.length === 0) return;
    
    liveTelemetry.forEach((f) => {
      if (f.aqi_value > 200) {
        const now = new Date();
        const timeStr = now.toTimeString().split(" ")[0];
        
        setTerminalLogs((prev) => {
          const exists = prev.some(
            (log) => log.content.includes(f.industry_id) && log.content.includes("breach")
          );
          if (exists) return prev;
          
          return [
            ...prev,
            { 
              time: timeStr, 
              sender: "SensorAgent", 
              content: `Critical AQI breach detected at facility ${f.facility_name} (${f.industry_id}). Value: ${f.aqi_value}. Attributing emission dispersion patterns...` 
            }
          ];
        });
      }
    });
  }, [liveTelemetry]);

  // Store activeCorp ref to access in map load callback
  const activeCorpRef = useRef(activeCorp);
  useEffect(() => {
    activeCorpRef.current = activeCorp;
  }, [activeCorp]);

  // Helper function to render 3 Major Pollution Emission Factors GeoJSON Polygons/Corridors
  const renderEmissionFactorLayers = (map: any, corp: any) => {
    if (!map || !corp) return;

    const [centerLon, centerLat] = corp.center;

        // 1. Industrial Emissions & Power Generation (Yellow Triangle MultiPolygon)
    const industrialPolygon = [
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

        // 2. Transportation & Vehicular Exhaust (Cyan MultiLineString)
    const trafficCorridor = [
      [[centerLon - 0.03, centerLat - 0.01], [centerLon - 0.01, centerLat + 0.00]],
      [[centerLon + 0.01, centerLat + 0.01], [centerLon + 0.03, centerLat + 0.02]],
      [[centerLon - 0.01, centerLat + 0.02], [centerLon + 0.01, centerLat + 0.03]]
    ];

        // 3. Construction, Demolition & Road Dust (Purple Square MultiPolygon)
    const constructionSquare = [
      [ // Patch 1
        [[centerLon + 0.005, centerLat - 0.02], [centerLon + 0.015, centerLat - 0.02], [centerLon + 0.015, centerLat - 0.01], [centerLon + 0.005, centerLat - 0.01], [centerLon + 0.005, centerLat - 0.02]]
      ],
      [ // Patch 2
        [[centerLon - 0.025, centerLat - 0.005], [centerLon - 0.015, centerLat - 0.005], [centerLon - 0.015, centerLat + 0.005], [centerLon - 0.025, centerLat + 0.005], [centerLon - 0.025, centerLat - 0.005]]
      ]
    ];

    // Add Industrial Source
    if (map.getSource("factor-industrial")) {
      (map.getSource("factor-industrial") as any).setData({
        type: "Feature",
        geometry: { type: "MultiPolygon", coordinates: industrialPolygon },
        properties: { name: "Industrial & Power Emitter Zone" }
      });
    } else {
      map.addSource("factor-industrial", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "MultiPolygon", coordinates: industrialPolygon },
          properties: { name: "Industrial & Power Emitter Zone" }
        }
      });
      map.addLayer({
        id: "factor-industrial-fill",
        type: "fill",
        source: "factor-industrial",
        paint: { "fill-color": "#eab308", "fill-opacity": 0.3 }
      });
      map.addLayer({
        id: "factor-industrial-line",
        type: "line",
        source: "factor-industrial",
        paint: { "line-color": "#eab308", "line-width": 2.5, "line-dasharray": [2, 1] }
      });
    }

    // Add Transportation Source
    if (map.getSource("factor-traffic")) {
      (map.getSource("factor-traffic") as any).setData({
        type: "Feature",
        geometry: { type: "MultiLineString", coordinates: trafficCorridor },
        properties: { name: "Heavy Diesel Traffic Corridor" }
      });
    } else {
      map.addSource("factor-traffic", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "MultiLineString", coordinates: trafficCorridor },
          properties: { name: "Heavy Diesel Traffic Corridor" }
        }
      });
      map.addLayer({
        id: "factor-traffic-line",
        type: "line",
        source: "factor-traffic",
        paint: { "line-color": "#06b6d4", "line-width": 4.5, "line-opacity": 0.85 }
      });
    }

    // Add Construction Source
    if (map.getSource("factor-construction")) {
      (map.getSource("factor-construction") as any).setData({
        type: "Feature",
        geometry: { type: "MultiPolygon", coordinates: constructionSquare },
        properties: { name: "Fugitive Dust Construction Zone" }
      });
    } else {
      map.addSource("factor-construction", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "MultiPolygon", coordinates: constructionSquare },
          properties: { name: "Fugitive Dust Construction Zone" }
        }
      });
      map.addLayer({
        id: "factor-construction-fill",
        type: "fill",
        source: "factor-construction",
        paint: { "fill-color": "#a855f7", "fill-opacity": 0.25 }
      });
      map.addLayer({
        id: "factor-construction-line",
        type: "line",
        source: "factor-construction",
        paint: { "line-color": "#a855f7", "line-width": 2.5, "line-dasharray": [3, 2] }
      });
    }
  };

  // Helper function to draw dotted boundary outline
  const renderCorpBoundary = (map: any, corp: any) => {
    if (!map || !corp) return;

    map.flyTo({
      center: corp.center,
      zoom: 11.2,
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

    // Render 3 Major Emission Factors
    renderEmissionFactorLayers(map, corp);
  };

  // Mapbox GL JS map client initialization
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
        center: activeCorp ? activeCorp.center : [72.8347, 18.9220],
        zoom: 12.5,
        pitch: 60,
        bearing: -17.6,
        antialias: true,
        attributionControl: false
      });

      mapInstance.on("load", () => {
        add3DFeatures(mapInstance);
        
        // Start simple 3D rotation animation
        function rotateCamera(timestamp: number) {
          if (!mapInstance) return;
          if (is3DModeRef.current && !isFlyingRef.current) {
            mapInstance.rotateTo((timestamp / 200) % 360, { duration: 0 });
          }
          requestAnimationFrame(rotateCamera);
        }
        requestAnimationFrame(rotateCamera);

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

  // Update map style dynamically
  useEffect(() => {
    if (!mapRef.current) return;

    let styleUrl = "mapbox://styles/mapbox/dark-v11";
    if (activeStyle === "satellite") {
      styleUrl = "mapbox://styles/mapbox/satellite-v9";
    } else if (activeStyle === "hybrid") {
      styleUrl = "mapbox://styles/mapbox/satellite-streets-v12";
    }

    mapRef.current.setStyle(styleUrl);
    mapRef.current.once("style.load", () => {
      add3DFeatures(mapRef.current);
      if (activeCorpRef.current) {
        renderCorpBoundary(mapRef.current, activeCorpRef.current);
      }
    });
  }, [activeStyle]);

  // Sync active Municipal Corporation selection to Mapbox view & boundary outline
  useEffect(() => {
    if (!mapRef.current || !activeCorp) return;
    const map = mapRef.current;

    // Fly to new location
    isFlyingRef.current = true;
    map.flyTo({
      center: activeCorp.center,
      zoom: 10.5,
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

  // Mapbox Markers Update
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Only draw markers if layer is active
    if (!layers.iotSensors) return;

    liveTelemetry.forEach((facility) => {
      if (!facility.geometry || !facility.geometry.coordinates) return;
      const [lng, lat] = facility.geometry.coordinates;

      let colorClass = "bg-[#10b981]";
      let borderClass = "border-[#10b981]/50";
      let textClass = "text-[#10b981]";
      let statusText = "NOMINAL";
      const aqi = facility.aqi_value;

      if (aqi > 200) {
        colorClass = "bg-red-500 animate-pulse";
        borderClass = "border-red-500";
        textClass = "text-red-500";
        statusText = "CRITICAL LIMIT";
      } else if (aqi > 150) {
        colorClass = "bg-amber-500 animate-pulse";
        borderClass = "border-amber-500";
        textClass = "text-amber-500";
        statusText = "ALERT WARNING";
      }

      const el = document.createElement("div");
      el.className = "custom-marker";
      el.innerHTML = `
        <div class="relative flex flex-col items-center group cursor-pointer">
          <div class="absolute -inset-2 rounded-full ${aqi > 150 ? "bg-red-500/20 animate-ping" : ""} pointer-events-none"></div>
          <div class="w-4 h-4 rounded-full ${colorClass} border-2 border-slate-950 flex items-center justify-center shadow-lg relative z-10">
            <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
          </div>
          <span class="text-[9px] font-mono font-bold bg-slate-950/90 text-slate-300 px-1 py-0.5 border border-slate-800 rounded mt-1 z-10 select-none shadow">${facility.industry_id}</span>
          
          <div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 bg-slate-900/95 border ${borderClass} p-3 w-56 rounded-lg shadow-2xl hidden group-hover:block z-50 text-left backdrop-blur-md font-body-md">
            <div class="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
              <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono">${facility.industry_id}</span>
              <span class="px-1.5 py-0.5 rounded text-[8px] font-bold ${textClass} bg-slate-950 border border-current font-mono">${statusText}</span>
            </div>
            <div class="space-y-1 text-[11px] leading-relaxed">
              <div class="text-white font-semibold truncate">${facility.facility_name}</div>
              <div class="text-slate-400 flex justify-between font-mono">
                <span>AQI:</span>
                <span class="text-white font-bold">${aqi}</span>
              </div>
              <div class="text-slate-400 flex justify-between font-mono">
                <span>PM2.5:</span>
                <span class="text-white font-bold">${facility.pm25} µg/m³</span>
              </div>
              <div class="text-slate-400 flex justify-between font-mono">
                <span>PM10:</span>
                <span class="text-white font-bold">${facility.pm10} µg/m³</span>
              </div>
              <div class="text-[9px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-800/40">
                Type: ${facility.cluster_category}
              </div>
            </div>
          </div>
        </div>
      `;

      import("mapbox-gl").then((mapboxglModule) => {
        const mapboxgl = mapboxglModule.default;
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);
        markersRef.current.push(marker);
      });
    });
  }, [liveTelemetry, layers.iotSensors]);

  // Auto-scrolling the terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  // Timeline Auto-play effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setTimelineVal((prev) => (prev >= 100 ? 0 : prev + 1));
      }, 800);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Feed Simulation Effect: Adds new agent notes periodically
  useEffect(() => {
    const feedTemplates = [
      { sender: "SensorAgent" as const, content: "Recalibrated ground station sensors in cell MUM_042. Temperature delta +1.2C." },
      { sender: "SourceAttributionAgent" as const, content: "Identified shift in stack emission dispersion. Plume heading North-Northwest towards Worli Naka." },
      { sender: "ComplianceAgent" as const, content: "Cross-referenced factory operating permits. Stack IND_88 flagged for offline scrubber maintenance cycle." },
      { sender: "SensorAgent" as const, content: "Secondary verification complete. PM10 particulate ratio aligns with heavy petcoke combustion signature." },
      { sender: "ComplianceAgent" as const, content: "Emailed warning alert payload to BMC central municipal dispatch desk. Priority Level: RED." },
    ];

    let tIndex = 0;
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];
      const template = feedTemplates[tIndex % feedTemplates.length];
      
      setTerminalLogs((prev) => [
        ...prev,
        { time: timeStr, sender: template.sender, content: template.content }
      ]);
      tIndex++;
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const handleLayerToggle = (layer: keyof typeof layers) => {
    const updatedLayers = { ...layers, [layer]: !layers[layer] };
    setLayers(updatedLayers);

    // Toggle Mapbox layers
    if (mapRef.current) {
      const map = mapRef.current;
      if (layer === "industrialZone" && map.getLayer("factor-industrial-fill")) {
        map.setLayoutProperty("factor-industrial-fill", "visibility", updatedLayers.industrialZone ? "visible" : "none");
        map.setLayoutProperty("factor-industrial-line", "visibility", updatedLayers.industrialZone ? "visible" : "none");
      }
      if (layer === "trafficCorridor" && map.getLayer("factor-traffic-line")) {
        map.setLayoutProperty("factor-traffic-line", "visibility", updatedLayers.trafficCorridor ? "visible" : "none");
      }
      if (layer === "constructionZone" && map.getLayer("factor-construction-fill")) {
        map.setLayoutProperty("factor-construction-fill", "visibility", updatedLayers.constructionZone ? "visible" : "none");
        map.setLayoutProperty("factor-construction-line", "visibility", updatedLayers.constructionZone ? "visible" : "none");
      }
    }
  };

  const handleDispatch = () => {
    setIsDispatching(true);
    
    // Simulate Dispatch flow
    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];
      
      setTerminalLogs((prev) => [
        ...prev,
        { time: timeStr, sender: "System", content: "DISPATCH DISK: Route authorized. Dispatching units VAYU-MOBILE-1 and VAYU-MOBILE-3. Tracking active." }
      ]);
      
      setIsDispatching(false);
      setShowEvidence(true);
    }, 1500);
  };

  const downloadSimulatedReport = async () => {
    const jsPDFModule = await import("jspdf");
    const jsPDF = jsPDFModule.default;
    
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Dark Slate Header Banner
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.rect(0, 0, 210, 42, "F");

    // Neon Emerald Accent Strip
    doc.setFillColor(16, 185, 129); // #10b981
    doc.rect(0, 42, 210, 3, "F");

    // Title & Logo
    doc.setTextColor(78, 222, 163);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("VAYUSENSE", 14, 18);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("OFFICIAL MUNICIPAL ENVIRONMENTAL DISPATCH REPORT", 14, 26);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("Brihanmumbai Municipal Corporation (BMC) -- Clearance Level 4 Security Clearance", 14, 33);
    doc.text(`ISSUED: ${new Date().toLocaleString()} | ID: DISPATCH-MUM-042-${Date.now().toString().slice(-6)}`, 14, 38);

    // Section 1: Executive Summary & Anomaly Badge
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 52, 182, 38, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 52, 182, 38, 2, 2, "D");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("INCIDENT SUMMARY & DISPATCH DETAILS", 20, 60);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);

    doc.text("Target Sector / Grid:", 20, 68);
    doc.setFont("helvetica", "bold");
    doc.text("MUM_042 (Worli Naka Region)", 60, 68);

    doc.setFont("helvetica", "normal");
    doc.text("Air Quality Index (AQI):", 20, 75);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38); // Red
    doc.text("412 AQI (CRITICAL HAZARD)", 60, 75);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text("Assigned Enforcement Fleet:", 20, 82);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("VAYU-MOBILE-1 / VAYU-MOBILE-3", 67, 82);

    // Hazard Status Badge Box
    doc.setFillColor(239, 68, 68); // Red background badge
    doc.roundedRect(140, 60, 50, 20, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("CRITICAL BREACH", 145, 68);
    doc.setFontSize(7);
    doc.text("STATUTORY ACTION ACTIVE", 143, 74);

    // Section 2: Visual Source Attribution Breakdown (3 Major Factors)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("ATTRIBUTED EMISSION FACTORS & POLLUTANT MATRIX (50% / 30% / 20%)", 14, 100);

    // Factor 1: Industrial Emissions & Power Generation (~50%) [Yellow Triangle #eab308]
    doc.setFillColor(234, 179, 8);
    doc.triangle(15, 108, 18, 104, 21, 108, "F"); // Triangle shape marker
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(234, 179, 8);
    doc.text("1. Industrial Emissions & Power Generation (~50%) [SO2, NOx, PM2.5, Pb]", 23, 108);
    doc.setTextColor(15, 23, 42);
    doc.text("50%", 185, 108);
    doc.setFillColor(226, 232, 240);
    doc.rect(14, 111, 182, 5, "F");
    doc.setFillColor(234, 179, 8); // Bright Yellow
    doc.rect(14, 111, 182 * 0.50, 5, "F");

    // Factor 2: Transportation & Vehicular Exhaust (~30%) [Cyan Circle #06b6d4]
    doc.setFillColor(6, 182, 212);
    doc.circle(18, 123, 2, "F"); // Circle shape marker
    doc.setFont("helvetica", "bold");
    doc.setTextColor(6, 182, 212);
    doc.text("2. Transportation & Vehicular Exhaust (~30%) [NO2, Black Carbon]", 23, 124);
    doc.setTextColor(15, 23, 42);
    doc.text("30%", 185, 124);
    doc.setFillColor(226, 232, 240);
    doc.rect(14, 127, 182, 5, "F");
    doc.setFillColor(6, 182, 212); // Cyan
    doc.rect(14, 127, 182 * 0.30, 5, "F");

    // Factor 3: Construction, Demolition & Road Dust (~20%) [Purple Square #a855f7]
    doc.setFillColor(168, 85, 247);
    doc.rect(16, 138, 4, 4, "F"); // Square shape marker
    doc.setFont("helvetica", "bold");
    doc.setTextColor(168, 85, 247);
    doc.text("3. Construction, Demolition & Road Dust (~20%) [PM10 Fugitive Silt]", 23, 141);
    doc.setTextColor(15, 23, 42);
    doc.text("20%", 185, 141);
    doc.setFillColor(226, 232, 240);
    doc.rect(14, 144, 182, 5, "F");
    doc.setFillColor(168, 85, 247); // Purple
    doc.rect(14, 144, 182 * 0.20, 5, "F");

    // Section 3: Multi-Agent Reasoning Feed
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("MULTI-AGENT REASONING & AUDIT LOG TRAIL", 14, 158);

    doc.setFillColor(15, 23, 42);
    doc.roundedRect(14, 162, 182, 58, 2, 2, "F");

    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(78, 222, 163);
    doc.text("# SYSTEM AUTONOMOUS LOGISTICS REASONING LOGS", 18, 169);

    let startY = 176;
    terminalLogs.slice(0, 5).forEach((log) => {
      doc.setFont("courier", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(`[${log.time}]`, 18, startY);

      doc.setFont("courier", "bold");
      if (log.sender === "SensorAgent") doc.setTextColor(245, 158, 11);
      else if (log.sender === "SourceAttributionAgent") doc.setTextColor(34, 211, 238);
      else if (log.sender === "ComplianceAgent") doc.setTextColor(168, 85, 247);
      else doc.setTextColor(239, 68, 68);
      doc.text(`${log.sender}:`, 42, startY);

      doc.setFont("courier", "normal");
      doc.setTextColor(226, 232, 240);
      const splitText = doc.splitTextToSize(log.content, 110);
      doc.text(splitText[0], 78, startY);
      startY += 7;
    });

    // Section 4: Cryptographic SHA-256 Signatures & Approval Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("DIGITAL SIGNATURES & COMPLIANCE VERIFICATION", 14, 232);

    doc.setFillColor(241, 245, 249);
    doc.rect(14, 236, 182, 26, "F");

    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text("[SensorAgent Signature]:         SHA256::e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", 18, 242);
    doc.text("[SourceAttributionAgent Signature]: SHA256::8f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1", 18, 248);
    doc.text("[ComplianceAgent Signature]:     SHA256::0d1c8e7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0", 18, 254);

    // Official Seal / Footer Line
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.8);
    doc.line(14, 270, 196, 270);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("AUTHORIZATION: Dr. Abhijit K. Bhosale, IAS -- Municipal Command Director", 14, 276);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    doc.text("Legally Binding Statutory Dispatch Order issued under section 42(A) of Municipal Environmental Protection Act.", 14, 281);

    doc.save(`VayuSense_Enforcement_Dispatch_MUM_042_${Date.now()}.pdf`);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full h-full relative">
      
      {/* Left Column: Geospatial Map (70% on large viewports) */}
      <section className="flex-1 relative bg-obsidian border-r border-[#3c4a42]/30 flex flex-col h-full overflow-hidden">
        
        {/* Map Container */}
        <div className="flex-1 relative overflow-hidden bg-[#0a0f1c]" ref={mapContainerRef}>

          {/* Plume Overlay Simulator */}
          <div 
            className={`absolute inset-0 pointer-events-none transition-opacity duration-500 mix-blend-color-dodge ${layers.satellitePlume ? 'opacity-50' : 'opacity-0'}`}
            style={{
              background: "radial-gradient(circle at 35% 55%, rgba(245, 158, 11, 0.45) 0%, rgba(245, 158, 11, 0.05) 50%, transparent 70%)"
            }}
          />

          {/* Construction Dust Simulation Overlay */}
          <div 
            className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${layers.activeConstruction ? 'opacity-30' : 'opacity-0'}`}
            style={{
              background: "radial-gradient(circle at 45% 40%, rgba(148, 163, 184, 0.5) 0%, rgba(148, 163, 184, 0.1) 40%, transparent 60%)"
            }}
          />

          <div className="absolute inset-0 scanline pointer-events-none opacity-10"></div>
          
          {/* Map Coordinates Bottom Left */}
          <div className="absolute bottom-4 left-4 font-mono text-slate-400 text-[10px] bg-slate-950/85 px-2 py-1 border border-slate-800 backdrop-blur-sm z-20">
            LAT 18.9220 N | LON 72.8347 E | H3_RES 8 | ZOOM L15 | STACK: IoT + Sentinel5P
          </div>

          {/* Floating Map Controls & Telemetry Layers */}
          <div className="absolute top-4 left-4 w-80 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded shadow-xl overflow-hidden z-30 text-left transition-all duration-300">
            {/* Clickable Header acting as Hamburger Accordion Toggle */}
            <div 
              onClick={() => setIsControlPanelOpen((prev) => !prev)}
              className="px-3 py-2.5 border-b border-slate-800 flex justify-between items-center bg-slate-950/70 hover:bg-slate-950 cursor-pointer select-none transition-colors group"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px] group-hover:scale-110 transition-transform">
                  {isControlPanelOpen ? "menu_open" : "menu"}
                </span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  3 Major Emission Factors & Layers
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">
                  {isControlPanelOpen ? "expand_less" : "expand_more"}
                </span>
              </div>
            </div>

            {/* Collapsible Panel Content */}
            {isControlPanelOpen && (
              <div className="p-3 flex flex-col gap-2.5 animate-fadeIn">

                {/* Factor 1: Industrial Emissions */}
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 flex items-center justify-center text-[8px] font-bold text-slate-950">▲</span>
                    <span className="text-[11px] font-semibold text-yellow-400 group-hover:text-yellow-300 transition-colors">1. Industrial & Power (50%)</span>
                  </div>
                  <div className="relative" onClick={(e) => { e.stopPropagation(); handleLayerToggle("industrialZone"); }}>
                    <div className={`block w-8 h-4 rounded-full transition-colors ${layers.industrialZone ? 'bg-yellow-400' : 'bg-slate-800 border border-slate-700'}`}></div>
                    <div className={`dot absolute top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${layers.industrialZone ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                  </div>
                </label>

                {/* Factor 2: Transportation & Vehicular Exhaust */}
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 flex items-center justify-center text-[8px] font-bold text-slate-950">●</span>
                    <span className="text-[11px] font-semibold text-cyan-400 group-hover:text-cyan-300 transition-colors">2. Vehicular Exhaust (30%)</span>
                  </div>
                  <div className="relative" onClick={(e) => { e.stopPropagation(); handleLayerToggle("trafficCorridor"); }}>
                    <div className={`block w-8 h-4 rounded-full transition-colors ${layers.trafficCorridor ? 'bg-cyan-400' : 'bg-slate-800 border border-slate-700'}`}></div>
                    <div className={`dot absolute top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${layers.trafficCorridor ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                  </div>
                </label>

                {/* Factor 3: Construction & Dust */}
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 flex items-center justify-center text-[8px] font-bold text-slate-950">■</span>
                    <span className="text-[11px] font-semibold text-purple-400 group-hover:text-purple-300 transition-colors">3. Construction Dust (20%)</span>
                  </div>
                  <div className="relative" onClick={(e) => { e.stopPropagation(); handleLayerToggle("constructionZone"); }}>
                    <div className={`block w-8 h-4 rounded-full transition-colors ${layers.constructionZone ? 'bg-purple-400' : 'bg-slate-800 border border-slate-700'}`}></div>
                    <div className={`dot absolute top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${layers.constructionZone ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                  </div>
                </label>

                <div className="my-1 border-t border-slate-800"></div>

                {/* IoT Sensors */}
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#4edea3]"></span>
                    <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">IoT Ground Sensors</span>
                  </div>
                  <div className="relative" onClick={(e) => { e.stopPropagation(); handleLayerToggle("iotSensors"); }}>
                    <div className={`block w-8 h-4 rounded-full transition-colors ${layers.iotSensors ? 'bg-[#4edea3]' : 'bg-slate-800 border border-slate-700'}`}></div>
                    <div className={`dot absolute top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${layers.iotSensors ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                  </div>
                </label>

                {/* Sentinel-5P Satellite Plume */}
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse flex items-center justify-center text-[7px] text-white">📡</span>
                    <span className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">Sentinel-5P Satellite Plume</span>
                  </div>
                  <div className="relative" onClick={(e) => { e.stopPropagation(); handleLayerToggle("satellitePlume"); }}>
                    <div className={`block w-8 h-4 rounded-full transition-colors ${layers.satellitePlume ? 'bg-indigo-500' : 'bg-slate-800 border border-slate-700'}`}></div>
                    <div className={`dot absolute top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${layers.satellitePlume ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                  </div>
                </label>

                {/* Instructing Shape & Color Legend Box */}
                <div className="mt-2 pt-2 border-t border-slate-800 flex flex-col gap-1.5 font-mono text-[10px]">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Emission Factor Key & Shape Guide</span>
                  <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded border border-slate-850">
                    <span className="w-3 h-3 bg-yellow-400 text-slate-950 font-bold flex items-center justify-center text-[9px] rounded-sm shrink-0">▲</span>
                    <div className="flex flex-col text-left">
                      <span className="text-yellow-400 font-bold">Yellow Triangle Zone</span>
                      <span className="text-slate-400 text-[9px]">Industrial & Power (SO2, NOx, PM2.5, Pb)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded border border-slate-850">
                    <span className="w-3 h-3 bg-cyan-400 text-slate-950 font-bold flex items-center justify-center text-[9px] rounded-full shrink-0">●</span>
                    <div className="flex flex-col text-left">
                      <span className="text-cyan-400 font-bold">Cyan Circle Corridor</span>
                      <span className="text-slate-400 text-[9px]">Vehicular Exhaust (NO2, Black Carbon)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded border border-slate-850">
                    <span className="w-3 h-3 bg-purple-400 text-slate-950 font-bold flex items-center justify-center text-[9px] rounded-sm shrink-0">■</span>
                    <div className="flex flex-col text-left">
                      <span className="text-purple-400 font-bold">Purple Square Grid</span>
                      <span className="text-slate-400 text-[9px]">Construction & Dust (PM10 Silt)</span>
                    </div>
                  </div>
                </div>

                {/* AQI Status & Hazard Legend */}
                <div className="mt-2 pt-2 border-t border-slate-800 flex flex-col gap-1 font-mono text-[10px]">
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
            )}
          </div>


          {/* Floating Map Style Selector */}
          <div className="absolute bottom-16 right-4 glass-panel p-1.5 rounded-lg flex flex-col gap-1 border border-slate-800 z-30">
            <button
              onClick={() => setIs3DMode(!is3DMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                is3DMode
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "hover:bg-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
              <span>3D Cinematic View</span>
            </button>
            <div className="h-px bg-slate-800 my-1 mx-2"></div>
            <button
              onClick={() => setActiveStyle("monochrome")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                activeStyle === "monochrome"
                  ? "bg-primary-container/20 text-primary border border-primary/40"
                  : "hover:bg-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">map</span>
              <span>Monochrome Vector</span>
            </button>
            <button
              onClick={() => setActiveStyle("satellite")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                activeStyle === "satellite"
                  ? "bg-primary-container/20 text-primary border border-primary/40"
                  : "hover:bg-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">satellite_alt</span>
              <span>Spectral Satellite</span>
            </button>
            <button
              onClick={() => setActiveStyle("hybrid")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                activeStyle === "hybrid"
                  ? "bg-primary-container/20 text-primary border border-primary/40"
                  : "hover:bg-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">query_stats</span>
              <span>Hybrid Analytics</span>
            </button>
          </div>
        </div>

        {/* Bottom Playback Timeline */}
        <div className="h-12 bg-slate-900 border-t border-[#3c4a42]/30 flex items-center px-4 gap-4 shrink-0 z-20">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">
              {isPlaying ? "pause" : "play_arrow"}
            </span>
          </button>
          <div className="flex-1 relative flex items-center">
            <input
              type="range"
              min="0"
              max="100"
              value={timelineVal}
              onChange={(e) => {
                setTimelineVal(Number(e.target.value));
                setIsPlaying(false);
              }}
              className="w-full accent-primary cursor-pointer bg-slate-800 h-1 rounded outline-none appearance-none"
            />
          </div>
          <span className="text-mono text-slate-400 text-xs uppercase tracking-widest min-w-[120px] text-right font-bold">
            {isPlaying ? "Live Feed active" : `Frame T-${100 - timelineVal}m`}
          </span>
        </div>
      </section>

      {/* Right Column: Diagnostics & Actions (30% on large viewports) */}
      <aside className="w-full md:w-[30%] lg:w-[400px] bg-slate-950 flex flex-col h-full overflow-y-auto overflow-x-hidden border-l border-[#3c4a42]/30 custom-scrollbar shrink-0">
        <div className="p-4 flex flex-col gap-4 flex-1">
          <div className="mb-2 text-left">
            <h2 className="text-base font-bold text-white mb-1">Diagnostic Matrix</h2>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-bold uppercase tracking-wider rounded-sm">
                Cell: MUM_042
              </span>
              <span className="text-xs text-slate-400 font-semibold">Focus Area Isolation</span>
            </div>
          </div>

          {/* Source Attribution Card */}
          <div className="bg-slate-900 border border-[#3c4a42]/20 rounded flex flex-col">
            <div className="px-4 py-3 border-b border-[#3c4a42]/20 flex justify-between items-center bg-slate-950/40 text-left">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Source Attribution</h3>
              <span className="material-symbols-outlined text-slate-500 text-[16px]">pie_chart</span>
            </div>
            <div className="p-4 flex flex-col gap-4 text-left">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Industrial Stack Emissions</span>
                  <span className="font-mono text-amber-500">62%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[62%] rounded-full"></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Construction Fugitive Dust</span>
                  <span className="font-mono text-slate-400">20%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 w-[20%] rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Heavy Diesel Fleet Traffic</span>
                  <span className="font-mono text-slate-500">18%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-600 w-[18%] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* 72-Hour Forecast (PM2.5) */}
          <div className="bg-slate-900 border border-[#3c4a42]/20 rounded flex flex-col">
            <div className="px-4 py-3 border-b border-[#3c4a42]/20 flex justify-between items-center bg-slate-950/40 text-left">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">72-Hour Forecast (PM2.5)</h3>
              <span className="material-symbols-outlined text-slate-500 text-[16px]">show_chart</span>
            </div>
            <div className="p-4 relative h-40">
              <div className="absolute inset-0 m-4 border-l border-b border-[#3c4a42]/30">
                <div className="absolute -left-6 top-0 text-[9px] text-slate-500 font-mono font-bold">500</div>
                <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 font-mono font-bold">250</div>
                <div className="absolute -left-6 bottom-0 text-[9px] text-slate-500 font-mono font-bold">0</div>
                
                {/* EPA Limit line */}
                <div className="absolute left-0 top-1/4 w-full border-t border-dashed border-red-500/50 z-0">
                  <span className="absolute right-0 -top-4 text-[8px] text-red-500 font-mono font-bold">EPA LIMIT (150)</span>
                </div>

                {/* Spline charts background styling */}
                <div className="absolute inset-0 spline-chart z-10"></div>
                <div className="absolute inset-0 spline-chart-secondary z-10"></div>
                
                {/* Active timeline vertical indicator */}
                <div className="absolute left-[30%] top-0 h-full border-l border-white/20 z-20">
                  <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-slate-950 border-2 border-white rounded-full"></div>
                </div>
              </div>
              <div className="absolute bottom-2 right-4 text-[9px] font-mono text-slate-500 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
                Model RMSE: 11.42
              </div>
            </div>
          </div>

          {/* Multi-Agent Reasoning Feed Terminal */}
          <div className="bg-[#090e17] border border-[#3c4a42]/20 rounded flex flex-col flex-grow min-h-[200px]">
            <div className="px-3 py-2 border-b border-[#3c4a42]/20 bg-slate-900 flex justify-between items-center text-left">
              <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                Multi-Agent Reasoning Feed
              </h3>
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
              </div>
            </div>
            <div className="p-3 font-mono text-[11px] leading-relaxed text-slate-400 overflow-y-auto terminal-scroll max-h-[220px] flex-1 text-left">
              <div className="mb-2"><span className="text-slate-600"># INIT PROTOCOL VAYUSENSE_8.4.2</span></div>
              
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="mb-2 text-white">
                  <span className="text-slate-500">[{log.time}]</span> -{" "}
                  <span
                    className={
                      log.sender === "SensorAgent"
                        ? "text-amber-500 font-bold"
                        : log.sender === "SourceAttributionAgent"
                        ? "text-cyan-400 font-bold"
                        : log.sender === "ComplianceAgent"
                        ? "text-purple-400 font-bold"
                        : "text-red-500 font-bold"
                    }
                  >
                    {log.sender}
                  </span>{" "}
                  <span className="text-slate-300">{log.content}</span>
                </div>
              ))}
              
              <div ref={terminalEndRef} />
              <div className="mt-4 text-[#4edea3] flex items-center">
                &gt; _<span className="animate-pulse w-1 h-3.5 bg-[#4edea3] inline-block"></span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Trigger CTA */}
        <div className="p-4 border-t border-[#3c4a42]/30 bg-slate-900 mt-auto shrink-0 text-left">
          <button
            onClick={handleDispatch}
            disabled={isDispatching}
            className="w-full bg-[#4edea3] hover:bg-emerald-400 transition-all duration-300 text-slate-950 font-bold text-xs py-3.5 rounded shadow-[0_0_15px_rgba(78,222,163,0.3)] flex items-center justify-center gap-2 group relative overflow-hidden uppercase tracking-wider"
          >
            {isDispatching ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                <span>Compiling evidence package...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">send</span>
                <span>Dispatch route & export evidence</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Glassmorphism Evidence Modal Overlay */}
      {showEvidence && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border-[#4edea3]/30 bg-slate-900/95 w-full max-w-xl rounded-lg overflow-hidden shadow-2xl text-left">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified_user
                </span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Evidence Package Exported
                </h3>
              </div>
              <button 
                onClick={() => setShowEvidence(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4 font-mono text-xs text-slate-400">
              <div className="p-3 bg-slate-950 border border-slate-850 rounded">
                <p className="text-primary mb-2 font-bold uppercase tracking-wider"># SYSTEM AUTONOMOUS LOGISTICS AUTHORIZED</p>
                <div className="grid grid-cols-2 gap-2 leading-relaxed text-[11px]">
                  <div>Target Grid Cell:</div>
                  <div className="text-white font-bold">MUM_042 (Worli Naka)</div>
                  <div>Attributed Core Source:</div>
                  <div className="text-amber-500 font-semibold">Industrial Stack IND_88 (62%)</div>
                  <div>Reported Severity Level:</div>
                  <div className="text-red-500 font-bold">CRITICAL HAZARD (412 AQI)</div>
                  <div>Inspector Unit Routed:</div>
                  <div className="text-white font-semibold">VAYU-MOBILE-1 / VAYU-MOBILE-3</div>
                </div>
              </div>

              <div>
                <p className="text-white font-bold mb-2">INTEGRATED SECURE DIGITAL SIGNATURES</p>
                <div className="border border-slate-800 p-2.5 bg-slate-950 rounded text-[10px] space-y-1">
                  <div>[SensorAgent]: <span className="text-[#4edea3]">SHA256::e3b0c442...</span> VERIFIED</div>
                  <div>[SourceAttributionAgent]: <span className="text-[#4edea3]">SHA256::8f9a2b3c...</span> VERIFIED</div>
                  <div>[ComplianceAgent]: <span className="text-[#4edea3]">SHA256::0d1c8e7a...</span> VERIFIED</div>
                </div>
              </div>

              <div className="mt-4 flex gap-4">
                <button
                  onClick={downloadSimulatedReport}
                  className="flex-1 bg-primary text-slate-950 font-bold py-2 px-4 rounded text-center hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  <span>Download PDF Evidence Package</span>
                </button>
                <button
                  onClick={() => setShowEvidence(false)}
                  className="flex-1 border border-slate-800 text-white font-bold py-2 px-4 rounded text-center hover:bg-white/10 transition-colors text-xs uppercase tracking-wider"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
