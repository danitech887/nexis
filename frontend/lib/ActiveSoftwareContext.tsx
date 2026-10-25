"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { INITIAL_SOFTWARE_FLEET, SoftwareProject, getSoftwareById } from "./softwareFleet";

import { fetchEnrolledSoftwares, deEnrollSoftwareOnBackend, EnrolledSoftware } from "./backendApi";

interface ActiveSoftwareContextType {
  activeSoftware: SoftwareProject;
  setActiveSoftwareId: (id: string) => void;
  fleet: SoftwareProject[];
  enrollSoftware: (project: SoftwareProject) => void;
  deEnrollSoftware: (id: string) => Promise<void>;
  refreshFleet: () => Promise<void>;
}

const DEFAULT_EMPTY_FALLBACK: SoftwareProject = {
  id: "unassigned",
  name: "No Software Enrolled",
  category: "Web API",
  platform: "Ready for Enrollment",
  vitals: "OK",
  errorCount: 0,
  hasSpike: false,
  sastGrade: "A",
  healthScore: 100,
  description: "No monitored software targets enrolled in Nexis. Click '+ ENROLL' to add a system.",
  repoPath: "",
  lastDeployed: "Never",
  metrics: {
    cpu: "0%",
    memory: "0 MB",
    p99Latency: "0ms",
    activeSessions: "0",
  },
  scopedLogs: [],
  scopedCrashes: [],
  scopedSast: [],
  astHighlight: {
    rootClass: "NoTarget",
    loc: 0,
    methods: [],
  },
  aiFixSnippet: {
    title: "Enroll System",
    file: "enroll.sh",
    diffBefore: "",
    diffAfter: "",
    tests: [],
  },
};

const ActiveSoftwareContext = createContext<ActiveSoftwareContextType | undefined>(undefined);

export function ActiveSoftwareProvider({ children }: { children: React.ReactNode }) {
  const [fleet, setFleet] = useState<SoftwareProject[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Load from SQLite backend and merge with fleet
  const refreshFleet = async () => {
    try {
      const backendSoftwares = await fetchEnrolledSoftwares();
      if (backendSoftwares && backendSoftwares.length > 0) {
        const mappedList: SoftwareProject[] = backendSoftwares.map((b: EnrolledSoftware) => ({
          id: b.id,
          name: b.name,
          category: (b.category as any) || "Web API",
          platform: b.platform || "Generic Application",
          vitals: b.status === "DEGRADED" ? "Degraded" : "OK",
          errorCount: 0,
          hasSpike: false,
          sastGrade: "A",
          healthScore: b.health_score ?? 100,
          description: b.description || `Enterprise application managed by Nexis.`,
          repoPath: b.local_repo_path,
          repoUrl: b.repo_url,
          targetUrl: b.target_url,
          provider: b.provider || "custom",
          providerProjectId: b.provider_project_id,
          lastDeployed: "Active",
          metrics: {
            cpu: "12%",
            memory: "160 MB",
            p99Latency: "40ms",
            activeSessions: "100%",
          },
          scopedLogs: [
            {
              id: 1,
              ts: new Date().toISOString().slice(11, 23),
              level: "INFO",
              tag: "SQLite.Engine",
              msg: `Loaded software ${b.name} from Nexis SQLite metadata catalog.`,
            },
          ],
          scopedCrashes: [],
          scopedSast: [],
          astHighlight: {
            rootClass: "ApplicationModule",
            loc: 210,
            methods: [{ name: "init()", complexity: 1, lines: 12 }],
          },
          aiFixSnippet: {
            title: "Standard Monitoring",
            file: "config.json",
            diffBefore: "",
            diffAfter: "",
            tests: [],
          },
        }));

        setFleet(mappedList);
      } else {
        setFleet([]);
      }
    } catch (e) {
      console.warn("Could not sync with backend SQLite:", e);
      setFleet([]);
    }
  };

  useEffect(() => {
    refreshFleet();
    try {
      const savedId = localStorage.getItem("nexis_active_software_id");
      if (savedId) {
        setActiveId(savedId);
      }
    } catch {
      // Ignore
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
    setFleet((prev) => [project, ...prev.filter((p) => p.id !== project.id)]);
    setActiveSoftwareId(project.id);
    refreshFleet();
  };

  const deEnrollSoftware = async (id: string) => {
    try {
      await deEnrollSoftwareOnBackend(id);
    } catch (e) {
      console.warn("Failed to delete software on backend:", e);
    }
    setFleet((prev) => prev.filter((p) => p.id !== id));
    await refreshFleet();
  };

  const activeSoftware = fleet.find((p) => p.id === activeId) || fleet[0] || DEFAULT_EMPTY_FALLBACK;

  return (
    <ActiveSoftwareContext.Provider
      value={{
        activeSoftware,
        setActiveSoftwareId,
        fleet,
        enrollSoftware,
        deEnrollSoftware,
        refreshFleet,
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
      activeSoftware: DEFAULT_EMPTY_FALLBACK,
      setActiveSoftwareId: () => {},
      fleet: [],
      enrollSoftware: () => {},
      deEnrollSoftware: async () => {},
      refreshFleet: async () => {},
    };
  }
  return context;
}
