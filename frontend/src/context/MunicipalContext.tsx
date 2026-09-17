"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import {
  STATES_LIST,
  StateOption,
  MunicipalCorporation,
  getMunicipalCorpsForState,
  getHighestAqiCorpForState
} from "@/lib/municipalData";

interface MunicipalContextType {
  selectedState: string; // State code e.g. "MH"
  setSelectedState: (code: string) => void;
  selectedCorpId: string; // Corp ID e.g. "MH-MC-01" or "AUTO_HIGHEST"
  setSelectedCorpId: (id: string) => void;
  availableStates: StateOption[];
  availableCorps: MunicipalCorporation[];
  activeCorp: MunicipalCorporation; // The currently active/resolved Municipal Corporation
  isAutoHighest: boolean;
}

const MunicipalContext = createContext<MunicipalContextType | undefined>(undefined);

export function MunicipalProvider({ children }: { children: React.ReactNode }) {
  const [selectedState, setSelectedStateState] = useState<string>("NCR");
  const [selectedCorpId, setSelectedCorpIdState] = useState<string>("NCR-01");

  const availableStates = STATES_LIST;

  const availableCorps = useMemo(() => {
    return getMunicipalCorpsForState(selectedState);
  }, [selectedState]);

  const activeCorp = useMemo(() => {
    if (selectedCorpId === "AUTO_HIGHEST") {
      return getHighestAqiCorpForState(selectedState);
    }
    const found = availableCorps.find((c) => c.id === selectedCorpId);
    return found || getHighestAqiCorpForState(selectedState);
  }, [selectedState, selectedCorpId, availableCorps]);

  const handleSetSelectedState = (stateCode: string) => {
    setSelectedStateState(stateCode);
    setSelectedCorpIdState("AUTO_HIGHEST"); // Reset to auto highest on state change
  };

  const handleSetSelectedCorpId = (corpId: string) => {
    setSelectedCorpIdState(corpId);
  };

  return (
    <MunicipalContext.Provider
      value={{
        selectedState,
        setSelectedState: handleSetSelectedState,
        selectedCorpId,
        setSelectedCorpId: handleSetSelectedCorpId,
        availableStates,
        availableCorps,
        activeCorp,
        isAutoHighest: selectedCorpId === "AUTO_HIGHEST"
      }}
    >
      {children}
    </MunicipalContext.Provider>
  );
}

export function useMunicipal() {
  const context = useContext(MunicipalContext);
  if (!context) {
    throw new Error("useMunicipal must be used within a MunicipalProvider");
  }
  return context;
}
