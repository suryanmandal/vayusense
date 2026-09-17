"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MAHARASHTRA_MUNICIPAL_CORPS } from "@/lib/municipalData";
import { MunicipalProvider, useMunicipal } from "@/context/MunicipalContext";
import { generateMunicipalRegistryPdf } from "@/lib/generateMunicipalRegistryPdf";

interface SubOption {
  name: string;
  route: string;
  icon: string;
}

const SUB_OPTIONS: Record<string, SubOption[]> = {
  overview: [
    { name: "Main Control Room", route: "/dashboard/home", icon: "space_dashboard" },
    { name: "Forecast Workspace Overview", route: "/dashboard/home/overview", icon: "visibility" },
    { name: "72-Hour Forecast Comparison", route: "/dashboard/forecast", icon: "cyclone" }
  ],
  geospatial: [
    { name: "Dynamic Vector Layer Engine", route: "/dashboard/geospatial/vector", icon: "layers" },
    { name: "Satellite Ingestion Pipeline Sync", route: "/dashboard/geospatial/satellite", icon: "satellite" }
  ],
  mlops: [
    { name: "Model Validation Analytics Terminal", route: "/dashboard/ml-ops/validation", icon: "analytics" },
    { name: "Hyperlocal Scenario Sandbox", route: "/dashboard/ml-ops/sandbox", icon: "science" },
    { name: "Long-Term Prediction Engine 2.0", route: "/dashboard/ml-ops/sandbox-advanced", icon: "timeline" }
  ],
  "agent-logs": [
    { name: "Multi-Agent Network Topology Map", route: "/dashboard/agent-logs/topology", icon: "hub" },
    { name: "Regional Language Translation Hub", route: "/dashboard/agent-logs/translation", icon: "translate" },
    { name: "Immutable API System Log Exporter", route: "/dashboard/agent-logs/exporter", icon: "verified_user" }
  ],
  settings: [
    { name: "Command Configuration Panel", route: "/dashboard/settings", icon: "settings_applications" },
    { name: "Administrative Profile", route: "/dashboard/settings/profile", icon: "account_box" },
    { name: "Statutory Compliance Guardrails Override", route: "/dashboard/agent-logs/override", icon: "gavel" }
  ]
};

const CATEGORY_NAMES: Record<string, string> = {
  overview: "Primary Overview",
  geospatial: "Geospatial Controls",
  mlops: "MLOps Center",
  "agent-logs": "Agentic Operations",
  settings: "System Settings"
};

function HeaderControlsLeft() {
  const {
    selectedState,
    setSelectedState,
    selectedCorpId,
    setSelectedCorpId,
    availableStates,
    availableCorps,
    activeCorp
  } = useMunicipal();

  return (
    <div className="flex items-center gap-2">
      {/* 1. State Selector Dropdown */}
      <div className="flex items-center bg-[#090e17] border border-slate-700/60 rounded px-2.5 py-1 gap-1.5 text-[11px] font-mono">
        <span className="material-symbols-outlined text-[14px] text-primary">map</span>
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
        >
          {availableStates.map((st) => (
            <option key={st.code} value={st.code} className="bg-slate-900 text-white">
              {st.name}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Municipal Corporation Selector Dropdown */}
      <div className="flex items-center bg-[#090e17] border border-slate-700/60 rounded px-2.5 py-1 gap-1.5 text-[11px] font-mono">
        <span className="material-symbols-outlined text-[14px] text-amber-400">domain</span>
        <select
          value={selectedCorpId}
          onChange={(e) => setSelectedCorpId(e.target.value)}
          className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer max-w-[220px] truncate"
        >
          {/* Smart Auto-Select Option */}
          <option value="AUTO_HIGHEST" className="bg-slate-900 text-amber-400 font-bold">
            ⚡ AUTO-HIGHEST AQI ({activeCorp.shortName} - {activeCorp.aqi} AQI)
          </option>

          <option disabled className="bg-slate-950 text-slate-500 font-bold">
            --- ALL {availableCorps.length} MUNICIPAL CORPORATIONS ---
          </option>

          {availableCorps.map((corp) => (
            <option key={corp.id} value={corp.id} className="bg-slate-900 text-white">
              [{corp.id}] {corp.shortName} -- {corp.aqi} AQI
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function MunicipalRegistryPdfButton() {
  const { selectedState, availableCorps } = useMunicipal();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await generateMunicipalRegistryPdf(selectedState);
    } catch (err) {
      console.error("Error generating municipal registry PDF:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      title={`Download Official Statutory ${availableCorps.length} Municipal Corporations Directory PDF`}
      className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 border border-primary/40 rounded-full text-[10px] font-bold font-mono text-primary transition-all active:scale-95 shrink-0"
    >
      <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
      <span>{isGenerating ? "GENERATING PDF..." : `${availableCorps.length} CORP REGISTRY PDF`}</span>
    </button>
  );
}

function SystemSearchBar() {
  const router = useRouter();
  const { setSelectedCorpId, setSelectedState } = useMunicipal();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const systemPages = useMemo(() => [
    { name: "72-Hour Coupled Air Quality Forecast", route: "/dashboard/forecast", icon: "cyclone", category: "Forecast" },
    { name: "Main Control Room Overview", route: "/dashboard/home", icon: "space_dashboard", category: "Dashboard" },
    { name: "Forecast Workspace Overview", route: "/dashboard/home/overview", icon: "visibility", category: "Dashboard" },
    { name: "Dynamic Vector Layer Engine", route: "/dashboard/geospatial/vector", icon: "layers", category: "Geospatial" },
    { name: "Satellite Ingestion Pipeline Sync", route: "/dashboard/geospatial/satellite", icon: "satellite", category: "Geospatial" },
    { name: "Model Validation Analytics Terminal", route: "/dashboard/ml-ops/validation", icon: "analytics", category: "MLOps" },
    { name: "Hyperlocal Scenario Sandbox", route: "/dashboard/ml-ops/sandbox", icon: "science", category: "MLOps" },
    { name: "Long-Term Prediction Engine 2.0", route: "/dashboard/ml-ops/sandbox-advanced", icon: "timeline", category: "MLOps" },
    { name: "Multi-Agent Network Topology Map", route: "/dashboard/agent-logs/topology", icon: "hub", category: "Agentic Operations" },
    { name: "Regional Language Translation Hub", route: "/dashboard/agent-logs/translation", icon: "translate", category: "Agentic Operations" },
    { name: "Immutable API System Log Exporter", route: "/dashboard/agent-logs/exporter", icon: "verified_user", category: "Agentic Operations" },
    { name: "Statutory Compliance Guardrails Override", route: "/dashboard/agent-logs/override", icon: "gavel", category: "Security" },
    { name: "Command Configuration Panel", route: "/dashboard/settings", icon: "settings_applications", category: "Settings" },
    { name: "Administrative Profile", route: "/dashboard/settings/profile", icon: "account_box", category: "Settings" }
  ], []);

  // Cmd+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter municipal corps & pages
  const matchedCorps = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return MAHARASHTRA_MUNICIPAL_CORPS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [query]);

  const matchedPages = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return systemPages.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [query, systemPages]);

  const handleSelectCorp = (corpId: string) => {
    setSelectedState("MH");
    setSelectedCorpId(corpId);
    setQuery("");
    setIsOpen(false);
  };

  const handleSelectPage = (route: string) => {
    router.push(route);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="relative hidden sm:block">
      <div className="flex items-center bg-[#0e1511] px-3 py-1 border border-[#3c4a42]/40 rounded-lg focus-within:border-primary transition-all">
        <span className="material-symbols-outlined text-slate-400 text-sm mr-1.5">search</span>
        <input
          ref={inputRef}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          className="bg-transparent border-none focus:outline-none focus:ring-0 text-xs text-white w-44 placeholder-slate-500 font-mono"
          placeholder="Search system (Cmd+K)..."
          type="text"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-slate-500 hover:text-white text-xs ml-1">
            ✕
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim() && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-10 w-96 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-2xl z-50 overflow-hidden text-left p-2 space-y-3"
        >
          {matchedCorps.length === 0 && matchedPages.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 font-mono text-center">
              No matching municipal corps or system pages found for &quot;{query}&quot;.
            </div>
          ) : (
            <>
              {matchedCorps.length > 0 && (
                <div>
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest px-2 block mb-1">
                    Municipal Corporations ({matchedCorps.length})
                  </span>
                  <div className="space-y-1">
                    {matchedCorps.map((corp) => (
                      <button
                        key={corp.id}
                        onClick={() => handleSelectCorp(corp.id)}
                        className="w-full flex items-center justify-between p-2 rounded hover:bg-slate-800 transition-colors text-left group"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white group-hover:text-primary transition-colors">
                            [{corp.id}] {corp.shortName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{corp.district} District</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            corp.aqi > 200
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : corp.aqi > 150
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {corp.aqi} AQI
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {matchedPages.length > 0 && (
                <div>
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest px-2 block mb-1 border-t border-slate-800 pt-2">
                    System Navigation Pages ({matchedPages.length})
                  </span>
                  <div className="space-y-1">
                    {matchedPages.map((page) => (
                      <button
                        key={page.route}
                        onClick={() => handleSelectPage(page.route)}
                        className="w-full flex items-center gap-2.5 p-2 rounded hover:bg-slate-800 transition-colors text-left group"
                      >
                        <span className="material-symbols-outlined text-sm text-primary group-hover:scale-110 transition-transform">
                          {page.icon}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white group-hover:text-primary transition-colors">
                            {page.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{page.category}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function HeaderRightSection() {
  return (
    <div className="flex items-center gap-md">
      {/* Functional Interactive System Search Bar */}
      <SystemSearchBar />

      <div className="px-3 py-1 bg-emerald-500/10 border border-primary/30 rounded-full flex items-center gap-1.5 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
        <span className="text-[9px] font-bold text-primary tracking-widest uppercase">SYSTEM ACTIVE</span>
      </div>

      {/* Header Controls Right: 29 Corp Registry PDF Button */}
      <MunicipalRegistryPdfButton />

      <button className="text-on-surface-variant hover:text-primary transition-colors p-1 flex items-center justify-center">
        <span className="material-symbols-outlined text-[20px]">notifications</span>
      </button>
      <button className="text-on-surface-variant hover:text-primary transition-colors p-1 flex items-center justify-center">
        <span className="material-symbols-outlined text-[20px]">account_circle</span>
      </button>
    </div>
  );
}

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeModule, setActiveModule] = useState<string>("overview");

  // Sync activeModule based on route pathname
  useEffect(() => {
    if (pathname.includes("/dashboard/geospatial")) {
      setActiveModule("geospatial");
    } else if (pathname.includes("/dashboard/ml-ops")) {
      setActiveModule("mlops");
    } else if (pathname.includes("/dashboard/settings")) {
      setActiveModule("settings");
    } else if (pathname.includes("/dashboard/agent-logs/override")) {
      setActiveModule("settings");
    } else if (pathname.includes("/dashboard/agent-logs")) {
      setActiveModule("agent-logs");
    } else {
      setActiveModule("overview");
    }
  }, [pathname]);

  return (
    <MunicipalProvider>
      <div className={`${pathname === "/dashboard/forecast" ? "forecast-shell" : ""} bg-[#0f172a] h-screen w-screen flex flex-col overflow-hidden text-on-surface font-body-md relative`}>
        
        {/* TopNavBar */}
        <header className="fixed top-0 w-full z-50 h-16 bg-slate-900 border-b border-[#3c4a42]/30 flex justify-between items-center px-md shrink-0">
          <div className="flex items-center gap-5">
            <span className="font-display-lg text-lg font-bold text-primary tracking-tight">VayuSense</span>
            
            {/* Header Controls Left: State & Municipal Corp Dropdowns */}
            <HeaderControlsLeft />

            <nav className="hidden xl:flex items-center gap-md">
              <Link 
                className={`font-body-md text-xs px-3 py-1 rounded transition-colors uppercase tracking-wider ${
                  pathname === "/dashboard/home" ? "text-primary border-b-2 border-primary pb-0.5 font-semibold" : "text-on-surface-variant hover:text-primary"
                }`} 
                href="/dashboard/home"
              >
                Dashboard
              </Link>
              <Link 
                className={`font-body-md text-xs px-3 py-1 rounded transition-colors uppercase tracking-wider ${
                  pathname.startsWith("/dashboard/geospatial") ? "text-primary border-b-2 border-primary pb-0.5 font-semibold" : "text-on-surface-variant hover:text-primary"
                }`} 
                href="/dashboard/geospatial/vector"
              >
                Analytics
              </Link>
              <Link 
                className={`font-body-md text-xs px-3 py-1 rounded transition-colors uppercase tracking-wider ${
                  pathname === "/dashboard/agent-logs/override" ? "text-primary border-b-2 border-primary pb-0.5 font-semibold" : "text-on-surface-variant hover:text-primary"
                }`} 
                href="/dashboard/agent-logs/override"
              >
                Emergency
              </Link>
              <Link 
                className={`font-body-md text-xs px-3 py-1 rounded transition-colors uppercase tracking-wider ${
                  pathname === "/dashboard/agent-logs/exporter" ? "text-primary border-b-2 border-primary pb-0.5 font-semibold" : "text-on-surface-variant hover:text-primary"
                }`} 
                href="/dashboard/agent-logs/exporter"
              >
                Archive
              </Link>
            </nav>
          </div>

          {/* Header Controls Right */}
          <HeaderRightSection />
        </header>

        {/* Main Split Layout container */}
        <div className="flex flex-1 pt-16 overflow-hidden relative">
          
          {/* SideNavBar - 64px rail */}
          <aside className="fixed left-0 top-16 h-full w-16 bg-[#0e1511] border-r border-[#3c4a42]/30 flex flex-col items-center py-md space-y-lg z-40 shrink-0">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-all active:scale-90 ${sidebarOpen ? 'text-primary' : 'text-on-surface-variant'}`}
              title="Toggle Menu"
            >
              <span className="material-symbols-outlined text-[22px]">
                {sidebarOpen ? "menu_open" : "menu"}
              </span>
            </button>

            <nav className="flex flex-col gap-sm w-full items-center">
              
              {/* Overview Module link */}
              <button 
                onClick={() => {
                  setActiveModule("overview");
                  setSidebarOpen(true);
                }}
                className={`w-full flex justify-center py-2.5 transition-all active:scale-90 ${
                  activeModule === "overview" 
                    ? "text-primary border-l-4 border-primary bg-emerald-500/10 font-bold" 
                    : "text-on-surface-variant hover:bg-slate-800"
                }`}
                title="Overview"
              >
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: activeModule === "overview" ? "'FILL' 1" : "'FILL' 0" }}>
                  home
                </span>
              </button>

              {/* Geospatial Module link */}
              <button 
                onClick={() => {
                  setActiveModule("geospatial");
                  setSidebarOpen(true);
                }}
                className={`w-full flex justify-center py-2.5 transition-all active:scale-90 ${
                  activeModule === "geospatial" 
                    ? "text-primary border-l-4 border-primary bg-emerald-500/10 font-bold" 
                    : "text-on-surface-variant hover:bg-slate-800"
                }`}
                title="Geospatial"
              >
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: activeModule === "geospatial" ? "'FILL' 1" : "'FILL' 0" }}>
                  satellite_alt
                </span>
              </button>

              {/* MLOps Module link */}
              <button 
                onClick={() => {
                  setActiveModule("mlops");
                  setSidebarOpen(true);
                }}
                className={`w-full flex justify-center py-2.5 transition-all active:scale-90 ${
                  activeModule === "mlops" 
                    ? "text-primary border-l-4 border-primary bg-emerald-500/10 font-bold" 
                    : "text-on-surface-variant hover:bg-slate-800"
                }`}
                title="MLOps"
              >
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: activeModule === "mlops" ? "'FILL' 1" : "'FILL' 0" }}>
                  psychology
                </span>
              </button>

              {/* Agentic Operations Module link */}
              <button 
                onClick={() => {
                  setActiveModule("agent-logs");
                  setSidebarOpen(true);
                }}
                className={`w-full flex justify-center py-2.5 transition-all active:scale-90 ${
                  activeModule === "agent-logs" 
                    ? "text-primary border-l-4 border-primary bg-emerald-500/10 font-bold" 
                    : "text-on-surface-variant hover:bg-slate-800"
                }`}
                title="Agentic Operations"
              >
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: activeModule === "agent-logs" ? "'FILL' 1" : "'FILL' 0" }}>
                  local_police
                </span>
              </button>
            </nav>

            <div className="mt-auto pb-20 w-full flex justify-center">
              <button 
                onClick={() => {
                  setActiveModule("settings");
                  setSidebarOpen(true);
                }}
                className={`w-full flex justify-center py-2.5 transition-all active:scale-90 ${
                  activeModule === "settings" 
                    ? "text-primary border-l-4 border-primary bg-emerald-500/10 font-bold" 
                    : "text-on-surface-variant hover:bg-slate-800"
                }`}
                title="Settings"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeModule === "settings" ? "'FILL' 1" : "'FILL' 0" }}>
                  settings
                </span>
              </button>
            </div>
          </aside>

          {/* Dynamic Flyout Sub-navigation Drawer (240px) */}
          <div 
            className={`fixed left-16 top-16 h-full bg-[#111827]/95 border-r border-[#1f2937] z-30 flex flex-col p-md transition-all duration-300 overflow-hidden ${
              sidebarOpen ? "w-[240px] opacity-100" : "w-0 opacity-0 pointer-events-none"
            }`}
          >
            <div className="mb-lg select-none shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {CATEGORY_NAMES[activeModule] || "Controls"}
              </span>
            </div>

            <nav className="flex flex-col gap-xs flex-1 overflow-y-auto custom-scrollbar">
              {SUB_OPTIONS[activeModule]?.map((option) => {
                const isActive = pathname === option.route;
                return (
                  <Link
                    key={option.route}
                    href={option.route}
                    className={`flex items-center gap-2 p-2 rounded-lg transition-all text-left group ${
                      isActive 
                        ? "bg-emerald-500/10 border-l-2 border-primary text-primary" 
                        : "text-slate-400 hover:bg-slate-800 hover:text-emerald-400"
                    }`}
                  >
                    <span className={`material-symbols-outlined text-sm shrink-0 ${isActive ? 'text-primary' : 'text-slate-500 group-hover:text-primary'}`}>
                      {option.icon}
                    </span>
                    <span className="text-xs font-semibold leading-relaxed truncate">
                      {option.name}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area Workspace wrapper slot */}
          <main 
            className={`flex-1 bg-[#0f172a] h-full relative overflow-hidden transition-all duration-300 flex flex-col ${
              sidebarOpen ? "ml-[304px]" : "ml-16"
            }`}
          >
            {children}
          </main>
        </div>

      </div>
    </MunicipalProvider>
  );
}
