"use client";

import React, { useState, useEffect } from "react";

interface RunItem {
  id: string;
  status: "Active" | "Archived";
  message: string;
  maxDepth?: number;
  learningRate?: number;
  type: "success" | "warning" | "stable";
}

export default function HyperlocalScenarioSandbox() {
  // Simulation parameters states
  const [trafficDensity, setTrafficDensity] = useState(0); // default 0
  const [industrialOutput, setIndustrialOutput] = useState(0); // default 0
  const [windSpeed, setWindSpeed] = useState(3.5); // default 3.5
  const [precipitation, setPrecipitation] = useState(0); // default 0

  // Re-run CTA button states
  const [isTuning, setIsTuning] = useState(false);
  const [tuningStatus, setTuningStatus] = useState<"idle" | "running" | "queued">("idle");

  // Training runs state
  const [runs] = useState<RunItem[]>([
    { id: "#142", status: "Active", message: "Status: Stable Convergence", maxDepth: 12, learningRate: 0.05, type: "stable" },
    { id: "#141", status: "Archived", message: "Status: Overfitted", type: "warning" },
    { id: "#140", status: "Archived", message: "Status: Success", type: "success" }
  ]);

  // Handle Hyperparameter run simulation
  const triggerTuning = () => {
    if (isTuning) return;
    setIsTuning(true);
    setTuningStatus("running");

    setTimeout(() => {
      setTuningStatus("queued");
      setTimeout(() => {
        setTuningStatus("idle");
        setIsTuning(false);
      }, 2000);
    }, 1500);
  };

  // Reset simulation parameters
  const handleResetParameters = () => {
    setTrafficDensity(0);
    setIndustrialOutput(0);
    setWindSpeed(3.5);
    setPrecipitation(0);
  };

  // Dynamic prediction trajectory from FastAPI backend
  const [backendTrajectory, setBackendTrajectory] = useState<number[] | null>(null);

  // Fetch real scenario prediction from FastAPI backend
  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        const trafficScalar = 1.0 + (trafficDensity / 100);
        const industrialScalar = 1.0 + (industrialOutput / 100);
        const res = await fetch("http://127.0.0.1:8000/api/v1/predict/scenario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            h3_index: "8838a1262dfffff",
            traffic_density_scalar: Math.max(0.1, trafficScalar),
            industrial_output_scalar: Math.max(0.1, industrialScalar),
            wind_speed_ms: windSpeed,
            base_pm25: 45.0
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.trajectory_12h) {
            setBackendTrajectory(data.trajectory_12h);
          }
        }
      } catch (err) {
        // Fallback to local calculation if backend is offline
      }
    };
    fetchPrediction();
  }, [trafficDensity, industrialOutput, windSpeed]);

  // Calculate dynamic line coordinates based on state variables or backend trajectory
  const getSimulatedPoints = () => {
    if (backendTrajectory && backendTrajectory.length >= 6) {
      // Map 12-hour backend trajectory to SVG coordinates
      return [
        { x: 0, y: Math.max(15, Math.min(190, 150 - (backendTrajectory[0] - 45.0))) },
        { x: 100, y: Math.max(15, Math.min(190, 150 - (backendTrajectory[2] - 45.0))) },
        { x: 200, y: Math.max(15, Math.min(190, 150 - (backendTrajectory[4] - 45.0))) },
        { x: 300, y: Math.max(15, Math.min(190, 150 - (backendTrajectory[6] - 45.0))) },
        { x: 400, y: Math.max(15, Math.min(190, 150 - (backendTrajectory[8] - 45.0))) },
        { x: 500, y: Math.max(15, Math.min(190, 150 - (backendTrajectory[10] - 45.0))) },
        { x: 600, y: Math.max(15, Math.min(190, 150 - (backendTrajectory[11] - 45.0))) }
      ];
    }

    const calculateY = (baseY: number, timeMultiplier: number) => {
      const trafficEffect = trafficDensity * 0.45 * timeMultiplier;
      const industrialEffect = industrialOutput * 0.65 * timeMultiplier;
      const windEffect = (3.5 - windSpeed) * 8.5 * timeMultiplier;
      const rainWashoutEffect = -precipitation * 12 * timeMultiplier;
      
      const totalDelta = trafficEffect + industrialEffect + windEffect + rainWashoutEffect;
      
      // Clamped Y coordinate inside SVG viewBox (200px height)
      return Math.max(15, Math.min(190, baseY - totalDelta));
    };

    return [
      { x: 0, y: calculateY(150, 0) },
      { x: 100, y: calculateY(145, 0.25) },
      { x: 200, y: calculateY(155, 0.5) },
      { x: 300, y: calculateY(80, 1.0) }, // T+6h (Peak area)
      { x: 400, y: calculateY(40, 1.2) },
      { x: 500, y: calculateY(60, 0.9) },
      { x: 600, y: calculateY(50, 0.95) }
    ];
  };

  const points = getSimulatedPoints();
  const pathD = `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y} L ${points[2].x},${points[2].y} L ${points[3].x},${points[3].y} L ${points[4].x},${points[4].y} L ${points[5].x},${points[5].y} L ${points[6].x},${points[6].y}`;
  const peakDelta = Math.round(150 - points[3].y);

  return (
    <div className="flex-grow flex flex-col lg:flex-row overflow-hidden w-full h-full relative">
      
      {/* Left Column (70% Width) */}
      <section className="w-[70%] h-full flex flex-col p-lg gap-lg overflow-y-auto custom-scrollbar bg-slate-950 flex-1 text-left">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <div className="glass-panel p-md rounded-lg flex flex-col justify-between border border-slate-800 bg-slate-900/60 backdrop-blur-md">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-xs">Predictive Precision (RMSE)</span>
            <div className="flex items-end justify-between">
              <span className="font-mono text-xl font-bold text-[#4edea3] tracking-tight">11.42 μg/m³</span>
              <div className="flex items-center text-primary mb-1">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0" }}>
                  arrow_downward
                </span>
                <span className="text-[10px] font-mono ml-xs">-1.4%</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-md rounded-lg flex flex-col justify-between border border-slate-800 bg-slate-900/60 backdrop-blur-md">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-xs">R-Squared Accuracy (R²)</span>
            <div className="flex items-end justify-between">
              <span className="font-mono text-xl font-bold text-[#4edea3] tracking-tight">0.894</span>
              <span className="text-[9px] text-slate-500 font-mono">Stable</span>
            </div>
          </div>

          <div className="glass-panel p-md rounded-lg flex flex-col justify-between border border-slate-800 bg-slate-900/60 backdrop-blur-md">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-xs">Mean Absolute Error (MAE)</span>
            <div className="flex items-end justify-between">
              <span className="font-mono text-xl font-bold text-[#4edea3] tracking-tight">8.19 μg/m³</span>
              <div className="h-6 w-12 bg-slate-800 rounded overflow-hidden flex items-center justify-center">
                <div className="w-full h-1 bg-primary/40"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Hyperlocal Scenario Sandbox Container */}
        <div className="glass-panel rounded-lg flex flex-col flex-1 min-h-[400px] border border-slate-800 bg-slate-900/60 backdrop-blur-md overflow-hidden">
          <div className="p-md border-b border-[#3c4a42]/30 flex justify-between items-center bg-slate-950/40">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Hyperlocal Scenario Sandbox</h3>
            <div className="flex items-center gap-xs px-sm py-1 bg-primary/10 border border-primary/20 rounded">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[9px] font-mono text-primary tracking-wider uppercase font-bold">Simulation Mode</span>
            </div>
          </div>

          <div className="flex flex-1 flex-col lg:flex-row h-full">
            {/* Left Panel: Simulation Parameter Matrix */}
            <div className="w-full lg:w-[45%] border-r border-[#3c4a42]/30 p-6 flex flex-col gap-6 bg-slate-950/20">
              <h4 className="text-xs font-bold text-white uppercase tracking-widest">
                Simulation Parameter Matrix
              </h4>
              
              <div className="flex flex-col gap-5 flex-1 justify-center">
                {/* Slider 1: Traffic Density */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-300">Traffic Gridlock Density</span>
                    <span className="text-primary font-mono text-xs font-bold">
                      {trafficDensity >= 0 ? `+${trafficDensity}%` : `${trafficDensity}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={trafficDensity}
                    onChange={(e) => setTrafficDensity(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Slider 2: Industrial Output */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-300">Industrial Emissions Level</span>
                    <span className="text-primary font-mono text-xs font-bold">
                      {industrialOutput >= 0 ? `+${industrialOutput}%` : `${industrialOutput}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={industrialOutput}
                    onChange={(e) => setIndustrialOutput(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Slider 3: Wind Velocity */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-300">Stagnant Wind Velocity</span>
                    <span className={`px-2 py-0.5 font-mono text-[9px] rounded border uppercase tracking-wider font-bold ${
                      windSpeed < 3 
                        ? 'bg-red-500/10 text-red-500 border-red-500/30' 
                        : 'bg-primary/20 text-primary border-primary/30'
                    }`}>
                      {windSpeed < 3 ? 'Low Dispersion' : 'High Dispersion'}
                    </span>
                  </div>
                  <div className="flex items-center gap-sm">
                    <input
                      type="range"
                      min="0.5"
                      max="15.0"
                      step="0.5"
                      value={windSpeed}
                      onChange={(e) => setWindSpeed(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <span className="text-white font-mono text-xs w-14 text-right font-bold">{windSpeed} m/s</span>
                  </div>
                </div>

                {/* Slider 4: Precipitation (Rainfall) */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-300">Extreme Precipitation (Rainfall Washout)</span>
                    <span className={`px-2 py-0.5 font-mono text-[9px] rounded border uppercase tracking-wider font-bold ${
                      precipitation > 5
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {precipitation > 5 ? 'Aerosol Washout Active' : 'Dry Conditions'}
                    </span>
                  </div>
                  <div className="flex items-center gap-sm">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={precipitation}
                      onChange={(e) => setPrecipitation(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <span className="text-white font-mono text-xs w-14 text-right font-bold">{precipitation} mm/h</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleResetParameters}
                className="mt-6 py-2 px-4 border border-primary/30 text-primary font-bold text-xs rounded hover:bg-primary/10 transition-colors uppercase tracking-widest"
              >
                Reset Parameters
              </button>
            </div>

            {/* Right Panel: Simulated AQI Delta Trajectory */}
            <div className="w-full lg:w-[55%] p-6 flex flex-col gap-4 relative bg-slate-950/10 justify-between">
              <div className="flex justify-between items-start">
                <h4 className="text-xs font-bold text-white uppercase tracking-widest">
                  Simulated AQI Delta Trajectory
                </h4>
                <span className="text-xs text-slate-400">Next 12 Hours</span>
              </div>

              <div className="flex-grow relative mt-md min-h-[220px] flex items-center justify-center">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 600 200">
                  <line stroke="#334155" strokeDasharray="4" strokeWidth="1" x1="0" x2="600" y1="150" y2="150"></line>
                  <text className="text-[10px] font-bold" fill="#86948a" x="5" y="142">
                    Current Real-World Baseline
                  </text>

                  <path
                    d={pathD}
                    fill="none"
                    stroke="#fc7c78"
                    strokeLinecap="round"
                    strokeWidth="4"
                    className="transition-all duration-300"
                  ></path>

                  <circle
                    cx={points[3].x}
                    cy={points[3].y}
                    fill="#fc7c78"
                    r="6"
                    className="animate-pulse"
                  ></circle>
                </svg>

                <div 
                  className="absolute bg-slate-900 border border-slate-700 p-1.5 rounded shadow-lg transition-all duration-300"
                  style={{ 
                    top: `${points[3].y - 45}px`, 
                    left: `270px` 
                  }}
                >
                  <span className="font-mono text-[9px] text-[#4edea3] font-bold whitespace-nowrap">
                    {peakDelta >= 0 ? `PROJECTED SPIKE: +${peakDelta} μg/m³ PM2.5` : `PROJECTED DROP: ${peakDelta} μg/m³ PM2.5`}
                  </span>
                </div>
              </div>

              <div className="flex justify-between mt-xs border-t border-slate-800 pt-2 font-mono text-[10px] text-slate-500">
                <span>T+0</span>
                <span>T+3h</span>
                <span className="font-bold text-white">T+6h (Peak)</span>
                <span>T+9h</span>
                <span>T+12h</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right Sidebar */}
      <aside className="w-full lg:w-[350px] h-full bg-slate-900/60 border-l border-[#3c4a42]/30 flex flex-col overflow-hidden shrink-0 text-left">
        <div className="p-lg flex flex-col gap-lg h-full overflow-y-auto custom-scrollbar">
          
          <div className="flex flex-col gap-xs">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">MLOps Control Engine</h2>
            <p className="text-[11px] text-slate-400 leading-relaxed">Active Model Architecture</p>
            <div className="p-2.5 bg-slate-950 rounded border border-slate-850 mt-xs">
              <p className="font-mono text-white text-xs leading-relaxed">
                Random Forest Regressor + XGBoost Ensemble
              </p>
            </div>
          </div>

          <div className="flex flex-col flex-grow overflow-hidden">
            <div className="flex items-center justify-between mb-md">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Recent Training Runs
              </h3>
              <span className="material-symbols-outlined text-slate-500 text-sm">history</span>
            </div>

            <div className="flex flex-col gap-sm overflow-y-auto custom-scrollbar pr-xs flex-1 max-h-[360px]">
              {runs.map((run, idx) => (
                <div 
                  key={idx}
                  className={`p-md rounded-lg flex flex-col gap-xs relative overflow-hidden group transition-all duration-300 ${
                    run.status === "Active" 
                      ? "bg-slate-950 border-l-4 border-primary border border-y-slate-850 border-r-slate-850 shadow-md" 
                      : "bg-slate-950/40 border border-slate-850 opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-white font-bold text-xs">{run.id}</span>
                    <span className={`px-1.5 py-0.5 font-mono text-[9px] rounded border uppercase tracking-wider ${
                      run.status === "Active"
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}>
                      {run.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-sm mt-1">
                    <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
                    <span className="text-white text-xs">{run.message}</span>
                  </div>

                  {run.maxDepth && (
                    <div className="grid grid-cols-2 gap-sm mt-sm">
                      <div className="bg-slate-900 p-1.5 rounded border border-slate-850">
                        <span className="block font-mono text-[9px] text-slate-500 uppercase">Max Depth</span>
                        <span className="font-mono text-xs text-white">{run.maxDepth}</span>
                      </div>
                      <div className="bg-slate-900 p-1.5 rounded border border-slate-850">
                        <span className="block font-mono text-[9px] text-slate-500 uppercase">Learning Rate</span>
                        <span className="font-mono text-xs text-white">{run.learningRate}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={triggerTuning}
            disabled={isTuning}
            className="mt-auto w-full py-3 px-4 text-slate-950 font-bold bg-primary hover:bg-[#4edea3] rounded flex items-center justify-center gap-sm hover:opacity-90 active:scale-[0.98] transition-all tracking-wider text-xs uppercase shadow-[0_0_12px_rgba(78,222,163,0.2)]"
          >
            {tuningStatus === "running" ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                <span>INITIALIZING ENGINE...</span>
              </>
            ) : tuningStatus === "queued" ? (
              <>
                <span className="material-symbols-outlined text-[18px]">check</span>
                <span>OPTIMIZATION QUEUED</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                <span>OPTIMIZE HYPERPARAMETERS</span>
              </>
            )}
          </button>
        </div>
      </aside>

    </div>
  );
}
