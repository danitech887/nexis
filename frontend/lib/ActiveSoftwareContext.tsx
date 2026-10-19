"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { INITIAL_SOFTWARE_FLEET, SoftwareProject, getSoftwareById } from "./softwareFleet";

interface ActiveSoftwareContextType {
  activeSoftware: SoftwareProject;
  setActiveSoftwareId: (id: string) => void;
  fleet: SoftwareProject[];
  enrollSoftware: (project: SoftwareProject) => void;
}

const ActiveSoftwareContext = createContext<ActiveSoftwareContextType | undefined>(undefined);

export function ActiveSoftwareProvider({ children }: { children: React.ReactNode }) {
  const [fleet, setFleet] = useState<SoftwareProject[]>(INITIAL_SOFTWARE_FLEET);
  const [activeId, setActiveId] = useState<string>("shulebase-android");

  // Load from localStorage on client mount if available
  useEffect(() => {
    try {
      const savedId = localStorage.getItem("nexis_active_software_id");
      if (savedId && fleet.some((p) => p.id === savedId)) {
        setActiveId(savedId);
      }
      const savedFleet = localStorage.getItem("nexis_custom_fleet");
      if (savedFleet) {
        const parsed = JSON.parse(savedFleet);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFleet((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newItems = parsed.filter((p: SoftwareProject) => !existingIds.has(p.id));
            return [...prev, ...newItems];
          });
        }
      }
    } catch {
      // Fallback
    }
  }, []);

  const setActiveSoftwareId = (id: string) => {
    setActiveId(id);
    try {
      localStorage.setItem("nexis_active_software_id", id);
    } catch {
      // Ignore
    }
  };

  const enrollSoftware = (project: SoftwareProject) => {
    setFleet((prev) => {
      const updated = [project, ...prev];
      try {
        localStorage.setItem("nexis_custom_fleet", JSON.stringify(updated.filter((p) => !INITIAL_SOFTWARE_FLEET.some((init) => init.id === p.id))));
      } catch {
        // Ignore
      }
      return updated;
    });
    setActiveSoftwareId(project.id);
  };

  const activeSoftware = fleet.find((p) => p.id === activeId) || fleet[0];

  return (
    <ActiveSoftwareContext.Provider
      value={{
        activeSoftware,
        setActiveSoftwareId,
        fleet,
        enrollSoftware,
      }}
    >
      {children}
    </ActiveSoftwareContext.Provider>
  );
}

export function useActiveSoftware() {
  const context = useContext(ActiveSoftwareContext);
  if (!context) {
    return {
      activeSoftware: INITIAL_SOFTWARE_FLEET[0],
      setActiveSoftwareId: () => {},
      fleet: INITIAL_SOFTWARE_FLEET,
      enrollSoftware: () => {},
    };
  }
  return context;
}
