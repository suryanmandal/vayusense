"use client";

import React, { useState, useEffect, useRef } from "react";
import { useMunicipal } from "@/context/MunicipalContext";

export default function LongTermPredictionSandbox() {
  const { activeCorp } = useMunicipal();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  // 4 Core Levers with manual input boxes
  const [tempShift, setTempShift] = useState<number>(0); // -5 to +5
  const [precipitation, setPrecipitation] = useState<number>(0); // 0 to 50
  const [windSpeed, setWindSpeed] = useState<number>(3); // 0 to 20
  const [emissions, setEmissions] = useState<number>(0); // -50 to +50

  // 6-Month Trajectory
  const [points, setPoints] = useState<{x: number, y: number}[]>([]);
  const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

  // Initialize Mapbox for 3D Weather/Atmosphere visualization
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let mapInstance: any = null;

    import("mapbox-gl").then((mapboxglModule) => {
      const mapboxgl = mapboxglModule.default;
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ("pk.eyJ1Ijoidmlja3kyNTMxIi" + "wiYSI6ImNtcm5xZG1qbTMybHIyeX" + "NkOTFrOGdiMXoifQ.-m-Z0AdlgRKVM0Eztz2-Ww");

      mapInstance = new mapboxgl.Map({
        container: mapContainerRef.current!,
        style: "mapbox://styles/mapbox/satellite-v9",
        center: activeCorp ? activeCorp.center : [77.209, 28.6139],
        zoom: 14,
        pitch: 80, // High pitch for horizon view
        bearing: 45,
        antialias: true,
        attributionControl: false,
      });

      mapInstance.on("load", () => {
        // Add 3D Terrain
        mapInstance.addSource('mapbox-dem', {
          'type': 'raster-dem',
          'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
          'tileSize': 512,
          'maxzoom': 14
        });
        mapInstance.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });

        // Add 3D Buildings
        mapInstance.addLayer({
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 12,
          paint: {
            "fill-extrusion-color": "#aaa",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.8,
          },
        });

        // Add Sky Layer
        mapInstance.addLayer({
          'id': 'sky',
          'type': 'sky',
          'paint': {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 90.0],
            'sky-atmosphere-sun-intensity': 15
          }
        });

        // Add initial fog
        mapInstance.setFog({
          'range': [0.5, 3],
          'color': '#ffffff',
          'high-color': '#245bdf',
          'space-color': '#000000',
          'star-intensity': 0.1
        });

        // Start slow rotation
        function rotateCamera(timestamp: number) {
          if (!mapInstance) return;
          mapInstance.rotateTo((timestamp / 400) % 360, { duration: 0 });
          requestAnimationFrame(rotateCamera);
        }
        requestAnimationFrame(rotateCamera);
      });

      mapRef.current = mapInstance;
    });

    return () => {
      if (mapInstance) mapInstance.remove();
    };
  }, [activeCorp]);

  // Update Atmosphere & Weather based on Levers
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (!map.isStyleLoaded()) return;

    // Calculate Atmospheric values
    // Precipitation -> Stormy/Dark
    // Emissions -> Smoggy/Brown
    // Temp -> Sun intensity & color

    let fogColor = '#ffffff';
    let highColor = '#245bdf'; // blue sky
    let sunIntensity = 15;
    let range = [0.5, 3]; // visibility

    if (precipitation > 20) {
      // Stormy
      fogColor = '#475569'; // dark slate
      highColor = '#1e293b'; // very dark
      sunIntensity = 0;
      range = [0, 1.5]; // Low visibility
    } else if (emissions > 20) {
      // Smoggy
      fogColor = '#a16207'; // dirty brown/yellow
      highColor = '#713f12';
      sunIntensity = 5;
      range = [0, 1]; // Very low visibility
    } else if (tempShift > 2) {
      // Hot / Sunny
      fogColor = '#fef08a'; // yellow tint
      sunIntensity = 25;
    }

    try {
      map.setFog({
        'range': range,
        'color': fogColor,
        'high-color': highColor,
        'space-color': '#000000',
        'star-intensity': precipitation > 20 ? 0 : 0.2
      });

      if (map.getLayer('sky')) {
        map.setPaintProperty('sky', 'sky-atmosphere-sun-intensity', sunIntensity);
      }
    } catch (e) {
      // Ignore if style not fully ready
    }

    // Update Graph Trajectory
    const baseCurve = [120, 180, 240, 230, 150, 110];
    const newPoints = baseCurve.map((base, idx) => {
      const effect = (tempShift * 5) - (precipitation * 2) - (windSpeed * 3) + (emissions * 1.5);
      return {
        x: (idx / 5) * 600,
        y: Math.max(20, Math.min(180, 180 - ((base + effect) * 0.4))) 
      };
    });
    setPoints(newPoints);

  }, [tempShift, precipitation, windSpeed, emissions]);

  const pathD = points.length > 0 
    ? `M ${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L ${p.x},${p.y}`).join(" ")
    : "";

  return (
    <div className="flex-grow flex flex-col lg:flex-row overflow-hidden w-full h-full relative p-6 gap-6 bg-slate-950">
      
      {/* Left Panel: 3D Visualization & Graph */}
      <section className="w-[65%] h-full flex flex-col gap-6">
        
        {/* 3D Atmosphere Viewer */}
        <div className="glass-panel rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden relative h-[350px] shadow-lg">
          <div className="absolute top-0 left-0 w-full p-3 bg-gradient-to-b from-slate-950/80 to-transparent z-10 flex justify-between items-start pointer-events-none">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">3D Atmospheric Digital Twin</h2>
              <p className="text-[10px] font-mono text-slate-400">Live Simulation: {activeCorp.name}</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-950/50 px-2 py-1 rounded border border-slate-700 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full animate-pulse bg-[#4edea3]"></span>
              <span className="text-[9px] font-bold font-mono text-white uppercase tracking-widest">
                {precipitation > 20 ? 'THUNDERSTORM / CLOUDBURST' : emissions > 20 ? 'SEVERE SMOG WARNING' : tempShift > 2 ? 'HEATWAVE / CLEAR' : 'NOMINAL CONDITIONS'}
              </span>
            </div>
          </div>
          
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* CSS Weather Overlays based on state */}
          {precipitation > 0 && (
            <div 
              className="absolute inset-0 pointer-events-none opacity-50 z-20"
              style={{
                background: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="20"><line x1="0" y1="0" x2="5" y2="10" stroke="%23ffffff" stroke-width="1" opacity="0.6"/></svg>') repeat`,
                backgroundSize: '30px 30px',
                animation: `rain ${21 - (precipitation * 0.4)}ms linear infinite`
              }}
            />
          )}

          <style dangerouslySetInnerHTML={{__html: `
            @keyframes rain {
              from { background-position: 0 0; }
              to { background-position: 20px 100px; }
            }
          `}} />
        </div>

        {/* 6 Month Trajectory Graph */}
        <div className="glass-panel flex-1 rounded-lg border border-slate-800 bg-slate-900/60 p-6 flex flex-col">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">6-Month AQI Projection Trajectory</h3>
          <div className="flex-1 relative flex flex-col justify-between">
            <div className="flex-grow relative flex items-center justify-center">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 -20 600 220">
                <line stroke="#334155" strokeDasharray="4" strokeWidth="1" x1="0" x2="600" y1="120" y2="120"></line>
                <text className="text-[10px] font-bold" fill="#86948a" x="5" y="112">Baseline Average</text>
                
                <path d={pathD} fill="none" stroke="#4edea3" strokeLinecap="round" strokeWidth="4" className="transition-all duration-500"></path>

                {points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="5" fill="#1e293b" stroke="#4edea3" strokeWidth="2" className="transition-all duration-500" />
                ))}
              </svg>
            </div>
            <div className="flex justify-between mt-sm border-t border-slate-800 pt-2 font-mono text-[10px] text-slate-400">
              {months.map((m, i) => <span key={i}>{m}</span>)}
            </div>
          </div>
        </div>

      </section>

      {/* Right Sidebar: 4 Levers */}
      <aside className="w-[35%] h-full bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col overflow-hidden text-left shadow-lg">
        <div className="p-6 border-b border-slate-800 bg-slate-950/40">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Scenario Levers</h2>
          <p className="text-[10px] text-slate-400 mt-1">Adjust macroscopic parameters to simulate atmospheric changes.</p>
        </div>

        <div className="p-6 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
          
          {/* Lever 1 */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#f59e0b]">thermostat</span>
                Temperature Shift
              </label>
              <div className="flex items-center gap-1">
                <input 
                  type="number" 
                  value={tempShift} 
                  onChange={(e) => setTempShift(Number(e.target.value))} 
                  className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono text-center outline-none focus:border-primary"
                />
                <span className="text-[10px] text-slate-500 font-mono">°C</span>
              </div>
            </div>
            <input type="range" min="-5" max="5" step="0.5" value={tempShift} onChange={(e) => setTempShift(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-[#f59e0b]" />
          </div>

          {/* Lever 2 */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-blue-400">rainy</span>
                Precipitation / Cloudburst
              </label>
              <div className="flex items-center gap-1">
                <input 
                  type="number" 
                  value={precipitation} 
                  onChange={(e) => setPrecipitation(Number(e.target.value))} 
                  className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono text-center outline-none focus:border-blue-400"
                />
                <span className="text-[10px] text-slate-500 font-mono">mm/h</span>
              </div>
            </div>
            <input type="range" min="0" max="50" step="1" value={precipitation} onChange={(e) => setPrecipitation(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-blue-400" />
          </div>

          {/* Lever 3 */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-slate-300">air</span>
                Wind Dispersion
              </label>
              <div className="flex items-center gap-1">
                <input 
                  type="number" 
                  value={windSpeed} 
                  onChange={(e) => setWindSpeed(Number(e.target.value))} 
                  className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono text-center outline-none focus:border-slate-300"
                />
                <span className="text-[10px] text-slate-500 font-mono">m/s</span>
              </div>
            </div>
            <input type="range" min="0" max="20" step="0.5" value={windSpeed} onChange={(e) => setWindSpeed(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-slate-300" />
          </div>

          {/* Lever 4 */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#eab308]">factory</span>
                Industrial Emissions
              </label>
              <div className="flex items-center gap-1">
                <input 
                  type="number" 
                  value={emissions} 
                  onChange={(e) => setEmissions(Number(e.target.value))} 
                  className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono text-center outline-none focus:border-[#eab308]"
                />
                <span className="text-[10px] text-slate-500 font-mono">%</span>
              </div>
            </div>
            <input type="range" min="-50" max="50" step="1" value={emissions} onChange={(e) => setEmissions(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-[#eab308]" />
          </div>

        </div>

        <div className="p-6 mt-auto border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={() => {
              setTempShift(0);
              setPrecipitation(0);
              setWindSpeed(3);
              setEmissions(0);
            }}
            className="w-full py-3 px-4 text-slate-950 font-bold bg-[#4edea3] hover:bg-primary rounded text-xs uppercase shadow-[0_0_12px_rgba(78,222,163,0.3)] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            Reset Sandbox
          </button>
        </div>
      </aside>

    </div>
  );
}
