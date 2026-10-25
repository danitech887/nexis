"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MonitoredSystem } from "@/lib/systems";
import SystemList from "@/components/systems/SystemList";
import SystemHeader, { SystemTab } from "@/components/systems/SystemHeader";
import SystemAnalysisTab from "@/components/systems/SystemAnalysisTab";
import SystemDebuggingTab from "@/components/systems/SystemDebuggingTab";
import SystemRecommendationsTab from "@/components/systems/SystemRecommendationsTab";
import SystemIssuesTab from "@/components/systems/SystemIssuesTab";
import CyberCard from "@/components/ui/CyberCard";
import CyberButton from "@/components/ui/CyberButton";
import TerminalStream from "@/components/terminal/TerminalStream";
import TerminalPrompt from "@/components/terminal/TerminalPrompt";

import { useActiveSoftware } from "@/lib/ActiveSoftwareContext";
import { getMonitoredSystemsForProject } from "@/lib/softwareFleet";
import {
  fetchTelemetryLogs,
  ingestTelemetryLog,
  clearBackendLogs,
  syncVercelApiLogs,
  syncCloudProviderLogs,
  TelemetryLogEntry,
} from "@/lib/backendApi";
import { cyberAudio } from "@/lib/cyberAudio";

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG" | "TRACE";
interface LogLine {
  id: number;
  ts: string;
  level: LogLevel;
  source: string;
  msg: string;
}

function formatToLocalTime(rawTs: string): string {
  if (!rawTs) return "";
  try {
    const iso = rawTs.includes("T")
      ? rawTs.endsWith("Z") ? rawTs : rawTs + "Z"
      : rawTs.replace(" ", "T") + "Z";
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const seconds = String(d.getSeconds()).padStart(2, "0");
      const ms = String(d.getMilliseconds()).padStart(3, "0");
      return `${hours}:${minutes}:${seconds}.${ms}`;
    }
  } catch {}
  return rawTs;
}

function resolveTargetSystem(evt: TelemetryLogEntry, systems: MonitoredSystem[]): MonitoredSystem {
  if (!systems || systems.length === 0) return {} as MonitoredSystem;
  const direct = systems.find((s) => s.id === evt.system_id);
  if (direct) return direct;

  const sysLower = (evt.system_id || "").toLowerCase();
  const tagUpper = (evt.tag || "").toUpperCase();

  // 1. Prioritize user actions, RUM, interactions, clicks, and navigation to COMPUTE/frontend
  if (
    tagUpper.startsWith("USER.") ||
    tagUpper.includes("INTERACTION") ||
    tagUpper.includes("NAVIGATION") ||
    tagUpper.includes("ACTION") ||
    tagUpper.includes("IDENTIFY") ||
    tagUpper.includes("CLICK") ||
    sysLower.includes("frontend") ||
    sysLower.includes("client") ||
    sysLower.includes("compute")
  ) {
    const s = systems.find((x) => x.tag === "COMPUTE");
    if (s) return s;
  }

  // 2. Ingress & edge gateways
  if (
    sysLower.includes("ingress") ||
    sysLower.includes("edge") ||
    tagUpper.includes("INGRESS") ||
    tagUpper.includes("VERCEL.EDGE")
  ) {
    const s = systems.find((x) => x.tag === "INGRESS");
    if (s) return s;
  }

  // 3. Storage & database layer
  if (
    sysLower.includes("storage") ||
    sysLower.includes("db") ||
    tagUpper.startsWith("SQL.") ||
    tagUpper.startsWith("WAL.")
  ) {
    const s = systems.find((x) => x.tag === "STORAGE");
    if (s) return s;
  }

  return (
    systems.find((s) => sysLower.includes(s.tag.toLowerCase())) ||
    systems.find((s) => evt.system_id && s.id.includes(evt.system_id)) ||
    systems[0]
  );
}

function LogsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activeSoftware } = useActiveSoftware();

  // Scoped Monitored Systems for the selected Active Target (5 Core Node Archetypes)
  const allSystems = useMemo(() => {
    return getMonitoredSystemsForProject(activeSoftware);
  }, [activeSoftware]);

  const requestedSystemId = searchParams.get("system");
  const initialSystem = useMemo(() => {
    if (requestedSystemId) {
      const match = allSystems.find((s) => s.id === requestedSystemId);
      if (match) return match;
    }
    return allSystems[0];
  }, [requestedSystemId, allSystems]);

  const [selectedSystem, setSelectedSystem] = useState<MonitoredSystem>(initialSystem);
  const [activeTab, setActiveTab] = useState<SystemTab>("logs");
  const [filter, setFilter] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | "USER" | "RUNTIME" | "BUILD">("ALL");
  const [paused, setPaused] = useState(false);
  const [cmdLog, setCmdLog] = useState<string[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [lastSyncTs, setLastSyncTs] = useState<string>("Connecting...");
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Logs keyed by system ID
  const [logsBySystem, setLogsBySystem] = useState<Record<string, LogLine[]>>({});
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // 1. Initial Load: Fetch persistent logs from backend SQLite
  const loadBackendLogs = useCallback(async () => {
    try {
      const backendEvents = await fetchTelemetryLogs({
        software_id: activeSoftware.id,
        limit: 200,
      });

      if (backendEvents && backendEvents.length > 0) {
        setIsBackendConnected(true);
        setLastSyncTs(new Date().toLocaleTimeString());

        // Group into systems
        setLogsBySystem((prev) => {
          let hasNew = false;
          let hasNewError = false;
          const grouped: Record<string, LogLine[]> = { ...prev };
          for (const evt of backendEvents) {
            const targetSys = resolveTargetSystem(evt, allSystems);

            const line: LogLine = {
              id: evt.id,
              ts: formatToLocalTime(evt.ts),
              level: evt.level as LogLevel,
              source: evt.source,
              msg: evt.msg,
            };

            const existing = grouped[targetSys.id] || [];
            if (!existing.some((l) => l.id === line.id)) {
              grouped[targetSys.id] = [...existing, line];
              hasNew = true;
              if (line.level === "ERROR") hasNewError = true;
            }

            // Always mirror into Unified Fleet Stream so all systems view shows all user actions
            const unifiedSys = allSystems[0];
            if (unifiedSys && unifiedSys.id !== targetSys.id) {
              const unifiedExisting = grouped[unifiedSys.id] || [];
              if (!unifiedExisting.some((l) => l.id === line.id)) {
                grouped[unifiedSys.id] = [...unifiedExisting, line];
              }
            }
          }
          if (hasNewError) {
            cyberAudio.errorDetected();
          } else if (hasNew) {
            cyberAudio.logBurst();
          }
          return grouped;
        });
      } else {
        setIsBackendConnected(true);
      }
    } catch {
      setIsBackendConnected(false);
    }
  }, [activeSoftware.id, allSystems]);

  // Sync when activeSoftware or requestedSystemId changes
  useEffect(() => {
    const currentSubsystems = getMonitoredSystemsForProject(activeSoftware);
    const primary = currentSubsystems[0];
    const match = requestedSystemId
      ? currentSubsystems.find((s) => s.id === requestedSystemId) || primary
      : primary;

    setSelectedSystem((prev) => (prev.id === match.id ? prev : match));
    loadBackendLogs();
  }, [activeSoftware.id, requestedSystemId, loadBackendLogs]);

  // 2. Real-Time Polling: Poll actual backend SQLite logs every 1.5 seconds
  useEffect(() => {
    if (paused) return;

    const interval = setInterval(async () => {
      try {
        const backendEvents = await fetchTelemetryLogs({
          software_id: activeSoftware.id,
          limit: 300,
        });

        if (backendEvents) {
          setIsBackendConnected(true);
          setLastSyncTs(new Date().toLocaleTimeString());

          if (backendEvents.length > 0) {
            setLogsBySystem((prev) => {
              let hasNew = false;
              let hasNewError = false;
              const grouped: Record<string, LogLine[]> = { ...prev };
              for (const evt of backendEvents) {
                const targetSys = resolveTargetSystem(evt, allSystems);

                const line: LogLine = {
                  id: evt.id,
                  ts: formatToLocalTime(evt.ts),
                  level: evt.level as LogLevel,
                  source: evt.source,
                  msg: evt.msg,
                };

                const existing = grouped[targetSys.id] || [];
                if (!existing.some((l) => l.id === line.id)) {
                  grouped[targetSys.id] = [...existing.slice(-400), line];
                  hasNew = true;
                  if (line.level === "ERROR") hasNewError = true;
                }

                // Always mirror into Unified Fleet Stream so all systems view shows all user actions
                const unifiedSys = allSystems[0];
                if (unifiedSys && unifiedSys.id !== targetSys.id) {
                  const unifiedExisting = grouped[unifiedSys.id] || [];
                  if (!unifiedExisting.some((l) => l.id === line.id)) {
                    grouped[unifiedSys.id] = [...unifiedExisting.slice(-400), line];
                  }
                }
              }
              if (hasNewError) {
                cyberAudio.errorDetected();
              } else if (hasNew) {
                cyberAudio.logBurst();
              }
              return grouped;
            });
          }
        }
      } catch {
        setIsBackendConnected(false);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [paused, selectedSystem, activeSoftware.id, allSystems]);

  const handleSelectSystem = (sys: MonitoredSystem) => {
    cyberAudio.cyberClick();
    setSelectedSystem(sys);
    setFilter("");
    setSelectedLevel("ALL");
    setCmdLog((prev) => [
      `> switched to system target: [${sys.tag}] ${sys.name} (${sys.host}:${sys.port})`,
      ...prev,
    ].slice(0, 20));

    // Update URL query param cleanly without reload
    const url = new URL(window.location.href);
    url.searchParams.set("system", sys.id);
    window.history.pushState({}, "", url.toString());
  };

  const [viewAllNodes, setViewAllNodes] = useState(true);

  const currentSystemLogs = useMemo(() => {
    if (viewAllNodes) {
      const all = Object.values(logsBySystem).flat();
      const seen = new Set<number>();
      const unique = all.filter((l) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      });
      return unique.sort((a, b) => a.id - b.id);
    }
    return logsBySystem[selectedSystem.id] || [];
  }, [viewAllNodes, logsBySystem, selectedSystem.id]);

  const handleClearLogs = async () => {
    cyberAudio.glitch();
    // Clear both frontend buffer and SQLite storage
    await clearBackendLogs(activeSoftware.id, selectedSystem.id);
    setLogsBySystem((prev) => ({
      ...prev,
      [selectedSystem.id]: [],
    }));
    setCmdLog((prev) => [`> buffer & SQLite storage cleared for ${selectedSystem.id}`, ...prev].slice(0, 20));
  };

  const handleExportLogs = () => {
    cyberAudio.successResolve();
    const content = currentSystemLogs
      .map((l) => `[${l.ts}] [${l.level}] [${l.source}] ${l.msg}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nexis-logs-${selectedSystem.id}-${new Date().toISOString().slice(0, 10)}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setCmdLog((prev) => [
      `> exported ${currentSystemLogs.length} lines for ${selectedSystem.id}`,
      ...prev,
    ].slice(0, 20));
  };

  const handleCommand = useCallback(
    async (cmd: string) => {
      const trimmed = cmd.trim();
      setCmdLog((l) => [`> ${trimmed}`, ...l].slice(0, 20));
      const [verb, ...args] = trimmed.split(" ");
      const lowerVerb = verb.toLowerCase();

      if (lowerVerb === "grep" || lowerVerb === "filter") {
        setFilter(args.join(" "));
      } else if (lowerVerb === "clear") {
        await handleClearLogs();
      } else if (lowerVerb === "level") {
        const lvl = args[0]?.toUpperCase() ?? "ALL";
        setSelectedLevel(lvl);
      } else if (lowerVerb === "emit" || lowerVerb === "log") {
        // Manual log injection through REPL directly to backend
        const userMsg = args.join(" ") || "Manual diagnostic ping from Nexis REPL";
        await ingestTelemetryLog({
          system_id: `${activeSoftware.id}:${selectedSystem.id}`,
          message: userMsg,
          level: "INFO",
          tag: "repl.console",
        });
        setCmdLog((l) => [`+ Ingested log to backend SQLite: "${userMsg}"`, ...l].slice(0, 20));
        loadBackendLogs();
      } else if (lowerVerb === "system" || lowerVerb === "target") {
        const targetId = args[0]?.toLowerCase();
        const match = allSystems.find(
          (s) => s.id === targetId || s.tag.toLowerCase() === targetId
        );
        if (match) {
          handleSelectSystem(match);
        } else {
          setCmdLog((l) => [
            `! System '${targetId}' not found. Available: ${allSystems.map((s) => s.id).join(", ")}`,
            ...l,
          ].slice(0, 20));
        }
      } else if (lowerVerb === "tab") {
        const requestedTab = args[0]?.toLowerCase() as SystemTab;
        if (["logs", "analysis", "debugging", "recommendations", "issues"].includes(requestedTab)) {
          setActiveTab(requestedTab);
        }
      } else if (lowerVerb === "pause") {
        setPaused(true);
      } else if (lowerVerb === "resume") {
        setPaused(false);
      } else if (lowerVerb === "sync") {
        await loadBackendLogs();
        setCmdLog((l) => [`✓ Synced with backend SQLite telemetry buffer`, ...l].slice(0, 20));
      } else if (lowerVerb === "vercel" || lowerVerb === "cloud" || lowerVerb === "render" || lowerVerb === "sync-cloud") {
        await handleSyncCloud();
      } else if (lowerVerb === "user" || lowerVerb === "actions" || lowerVerb === "rum") {
        setSelectedCategory("USER");
        setCmdLog((l) => [`> Filtered to Real User Action Stream`, ...l].slice(0, 20));
      } else if (lowerVerb === "runtime" || lowerVerb === "api") {
        setSelectedCategory("RUNTIME");
        setCmdLog((l) => [`> Filtered to Live Runtime & API Stream (Build logs hidden)`, ...l].slice(0, 20));
      } else if (lowerVerb === "build" || lowerVerb === "cicd") {
        setSelectedCategory("BUILD");
        setCmdLog((l) => [`> Filtered to Build & CI/CD logs`, ...l].slice(0, 20));
      } else if (lowerVerb === "all") {
        setSelectedCategory("ALL");
        setFilter("");
        setSelectedLevel("ALL");
        setCmdLog((l) => [`> Reset filters to ALL STREAMS`, ...l].slice(0, 20));
      } else if (lowerVerb === "help") {
        setCmdLog((l) => [
          "Available commands: user, runtime, build, all, grep <str>, level <ALL|INFO|WARN|ERROR>, emit <msg>, sync, cloud, vercel, clear, system <id>, tab <logs|analysis|debugging|recommendations|issues>, pause, resume",
          ...l,
        ].slice(0, 20));
      }
    },
    [selectedSystem, activeSoftware.id, activeSoftware.name, allSystems, loadBackendLogs]
  );

  const handleSyncCloud = async () => {
    setIsSyncingCloud(true);
    cyberAudio.startProcessing();
    try {
      // 1. Unified Cloud Provider Log Ingestion (Render, Vercel, Railway, etc.)
      const res = await syncCloudProviderLogs(activeSoftware.id);
      if (res && res.status === "success") {
        await loadBackendLogs();
        cyberAudio.stopProcessing();
        cyberAudio.successResolve();
        const count = res.ingested_count ?? res.lines_ingested ?? 0;
        const providerName = (res.provider || activeSoftware.provider || "Cloud").toUpperCase();
        setCmdLog((l) => [
          `✓ ${providerName} sync complete for ${activeSoftware.name}: ${count} new runtime logs ingested into SQLite.`,
          ...l,
        ].slice(0, 20));
      } else {
        // Fallback to legacy Vercel sync if provider sync returned fallback
        const vercelRes = await syncVercelApiLogs(activeSoftware.id);
        if (vercelRes && vercelRes.status === "success") {
          await loadBackendLogs();
          cyberAudio.stopProcessing();
          cyberAudio.successResolve();
          const count = vercelRes.ingested_count ?? vercelRes.total_ingested ?? 0;
          setCmdLog((l) => [
            `✓ Vercel API sync complete for ${activeSoftware.name}: ${count} new events ingested into SQLite.`,
            ...l,
          ].slice(0, 20));
        } else {
          cyberAudio.stopProcessing();
          cyberAudio.glitch();
          setCmdLog((l) => [
            `! Cloud sync for ${activeSoftware.name}: ${res?.message || vercelRes?.message || "No cloud credentials configured"}`,
            ...l,
          ].slice(0, 20));
        }
      }
    } catch (err: any) {
      cyberAudio.stopProcessing();
      cyberAudio.errorDetected();
      setCmdLog((l) => [`! Cloud sync error: ${err.message}`, ...l].slice(0, 20));
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Count genuine user interactions in current buffer
  const totalUserActions = useMemo(() => {
    return currentSystemLogs.filter((l) => {
      const lowerTag = l.source.toLowerCase();
      const lowerMsg = l.msg.toLowerCase();
      return (
        lowerTag.includes("user.") ||
        lowerTag.includes("ui.") ||
        lowerTag.includes("user_action") ||
        lowerMsg.includes("clicked") ||
        lowerMsg.includes("navigated") ||
        lowerMsg.includes("session initialized")
      );
    }).length;
  }, [currentSystemLogs]);

  // Compute filtered lines by text filter, level filter, and category
  const filteredLines = useMemo(() => {
    return currentSystemLogs.filter((line) => {
      const matchesLevel =
        selectedLevel === "ALL" || line.level === selectedLevel;
      const matchesText =
        !filter ||
        line.msg.toLowerCase().includes(filter.toLowerCase()) ||
        line.source.toLowerCase().includes(filter.toLowerCase()) ||
        line.level.toLowerCase().includes(filter.toLowerCase());

      let matchesCategory = true;
      const lowerTag = line.source.toLowerCase();
      const lowerMsg = line.msg.toLowerCase();
      const isUserAction =
        lowerTag.includes("user.") ||
        lowerTag.includes("ui.") ||
        lowerTag.includes("user_action") ||
        lowerMsg.includes("clicked") ||
        lowerMsg.includes("navigated") ||
        lowerMsg.includes("session initialized");

      const isBuildOrDeploy =
        lowerTag.includes("vercel.build") ||
        lowerTag.includes("vercel.deploy") ||
        lowerTag.includes("vercel.audit") ||
        lowerMsg.includes("building for production") ||
        lowerMsg.includes("modules transformed");

      if (selectedCategory === "USER") {
        matchesCategory = isUserAction;
      } else if (selectedCategory === "RUNTIME") {
        matchesCategory = !isBuildOrDeploy;
      } else if (selectedCategory === "BUILD") {
        matchesCategory = isBuildOrDeploy;
      }

      return matchesLevel && matchesText && matchesCategory;
    });
  }, [currentSystemLogs, filter, selectedLevel, selectedCategory]);

  const totalErrors = currentSystemLogs.filter((l) => l.level === "ERROR").length;
  const totalWarn = currentSystemLogs.filter((l) => l.level === "WARN").length;

  return (
    <div className="h-full flex flex-row min-h-0 animate-fadeinup overflow-hidden">
      {/* LEFT: Monitored Systems List */}
      <SystemList
        systems={allSystems}
        selectedSystemId={selectedSystem.id}
        onSelectSystem={(sys) => {
          handleSelectSystem(sys);
        }}
      />

      {/* RIGHT: Active System Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* System Header with Tab Selectors */}
        <SystemHeader
          system={selectedSystem}
          activeTab={activeTab}
          onTabChange={(tab) => {
            cyberAudio.cyberClick();
            setActiveTab(tab);
          }}
          paused={paused}
          onTogglePause={() => {
            cyberAudio.cyberClick();
            setPaused((p) => !p);
          }}
          onClearLogs={handleClearLogs}
          onExportLogs={handleExportLogs}
          logCount={currentSystemLogs.length}
        />

        {/* TAB 1: LOG STREAM */}
        {activeTab === "logs" && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Stream Toolbar */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-[#112233] bg-[#070D16] shrink-0 font-mono text-xs">
              <span className="text-[#00FF66] font-bold tracking-widest flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isBackendConnected ? "bg-[#00FF66] animate-ping" : "bg-[#FFD600]"}`} />
                {viewAllNodes ? "ALL NODES // COMBINED STREAM" : `${selectedSystem.tag} // LIVE LOGS`}
              </span>

              {/* Toggle Combined All Nodes vs Isolated Node */}
              <button
                type="button"
                onClick={() => setViewAllNodes((v) => !v)}
                className={`text-[9px] px-2 py-0.5 border font-mono transition-colors ${
                  viewAllNodes
                    ? "text-[#00FF66] bg-[#00FF66]/20 border-[#00FF66]/50 font-bold glow-green"
                    : "text-[#5A7A9A] bg-[#03070D] border-[#112233] hover:text-[#C0D8F0]"
                }`}
                title="Toggle between combined stream (user actions, database, ingress) or isolated node"
              >
                {viewAllNodes ? "⚡ VIEW: ALL NODES (COMBINED)" : `⚙ NODE: [${selectedSystem.tag}]`}
              </button>

              {/* Backend connection pill */}
              <span
                className={`text-[9px] px-1.5 py-0.5 border ${
                  isBackendConnected
                    ? "text-[#00FF66] bg-[#00FF66]/10 border-[#00FF66]/30"
                    : "text-[#FFD600] bg-[#FFD600]/10 border-[#FFD600]/30"
                }`}
              >
                {isBackendConnected ? `SQLITE INGEST (${lastSyncTs})` : "BUFFER OFFLINE"}
              </span>

              {/* Multi-cloud Provider Sync Button */}
              <CyberButton
                accent="cyan"
                size="sm"
                type="button"
                disabled={isSyncingCloud}
                onClick={handleSyncCloud}
              >
                {isSyncingCloud
                  ? "SYNCING..."
                  : `⚡ SYNC ${activeSoftware.provider ? activeSoftware.provider.toUpperCase() : "CLOUD"}`}
              </CyberButton>

              {/* Real User Telemetry / Tracker Integration Trigger */}
              <CyberButton
                accent="green"
                size="sm"
                type="button"
                onClick={() => setShowTrackerModal(true)}
              >
                ⚡ REAL USER TRACKER
              </CyberButton>

              <div className="h-4 w-px bg-[#112233]" />

              {/* Grep search */}
              <div className="relative">
                <input
                  className="bg-[#03070D] border border-[#112233] text-[#C0D8F0] text-[11px] font-mono px-2 py-1 w-52 focus:outline-none focus:border-[#00FF66] placeholder:text-[#2A4A6A]"
                  placeholder="grep pattern (e.g. timeout)..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                {filter && (
                  <button
                    onClick={() => setFilter("")}
                    className="absolute right-1.5 top-1 text-[#5A7A9A] hover:text-[#FF0055] text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Log Level Selectors */}
              <div className="flex items-center gap-1">
                {(["ALL", "ERROR", "WARN", "INFO", "DEBUG", "TRACE"] as const).map(
                  (lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setSelectedLevel(lvl)}
                      className={`px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider transition-colors border ${
                        selectedLevel === lvl
                          ? lvl === "ERROR"
                            ? "bg-[#FF0055]/20 text-[#FF0055] border-[#FF0055]"
                            : lvl === "WARN"
                            ? "bg-[#FFD600]/20 text-[#FFD600] border-[#FFD600]"
                            : "bg-[#00FF66]/20 text-[#00FF66] border-[#00FF66]"
                          : "text-[#5A7A9A] border-transparent hover:text-[#A0C0E0]"
                      }`}
                    >
                      {lvl}
                    </button>
                  )
                )}
              </div>

              {/* Stream Category Filter (User Actions vs Runtime vs Build) */}
              <div className="flex items-center gap-1 border-l border-[#112233] pl-2">
                <button
                  type="button"
                  onClick={() => {
                    cyberAudio.cyberClick();
                    setSelectedCategory("ALL");
                  }}
                  className={`px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider transition-colors border ${
                    selectedCategory === "ALL"
                      ? "bg-[#C0D8F0]/20 text-[#C0D8F0] border-[#C0D8F0]"
                      : "text-[#5A7A9A] border-transparent hover:text-[#A0C0E0]"
                  }`}
                >
                  ALL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cyberAudio.cyberClick();
                    setSelectedCategory("USER");
                  }}
                  className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider transition-colors border flex items-center gap-1 ${
                    selectedCategory === "USER"
                      ? "bg-[#00F0FF]/25 text-[#00F0FF] border-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                      : "text-[#5A7A9A] border-transparent hover:text-[#00F0FF]"
                  }`}
                  title="Filter to genuine user interactions, button clicks, route navigation, and UI errors"
                >
                  <span>👤 USER ACTIONS</span>
                  <span className={`text-[8px] px-1 rounded-sm font-bold ${selectedCategory === "USER" ? "bg-[#00F0FF] text-[#03070D]" : "bg-[#112233] text-[#A0C0E0]"}`}>
                    {totalUserActions}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cyberAudio.cyberClick();
                    setSelectedCategory("RUNTIME");
                  }}
                  className={`px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider transition-colors border ${
                    selectedCategory === "RUNTIME"
                      ? "bg-[#00FF66]/20 text-[#00FF66] border-[#00FF66]"
                      : "text-[#5A7A9A] border-transparent hover:text-[#A0C0E0]"
                  }`}
                  title="Live API requests, database queries, edge hits (excluding compiler build logs)"
                >
                  ⚡ RUNTIME
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cyberAudio.cyberClick();
                    setSelectedCategory("BUILD");
                  }}
                  className={`px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider transition-colors border ${
                    selectedCategory === "BUILD"
                      ? "bg-[#FFD600]/20 text-[#FFD600] border-[#FFD600]"
                      : "text-[#5A7A9A] border-transparent hover:text-[#A0C0E0]"
                  }`}
                  title="CI/CD compiler output and deployment logs"
                >
                  🔨 BUILD LOGS
                </button>
              </div>

              {/* Counts */}
              <div className="flex items-center gap-2 ml-auto">
                <Link
                  href="/errors"
                  className="text-[10px] text-[#FF0055] bg-[#FF0055]/15 px-2 py-0.5 border border-[#FF0055]/50 hover:bg-[#FF0055] hover:text-[#03070D] font-bold tracking-wider transition-colors flex items-center gap-1"
                  title="View and triage all active errors in the Error Remediation Module"
                >
                  <span>⚡ ERRORS:</span>
                  <span>{totalErrors}</span>
                  <span className="text-[8px]">➔</span>
                </Link>
                <span className="text-[10px] text-[#FFD600] bg-[#FFD600]/10 px-1.5 py-0.5 border border-[#FFD600]/30">
                  WARN: {totalWarn}
                </span>
                <span className="text-[10px] text-[#5A7A9A]">
                  SHOWING: {filteredLines.length} / {currentSystemLogs.length}
                </span>
              </div>
            </div>

            {/* Terminal Stream Body + Command Output */}
            <div className="flex flex-1 min-h-0">
              <CyberCard
                accent="green"
                noPadding
                className="flex-1 min-h-0 border-0 border-r border-[#112233] rounded-none"
              >
                <div className="flex flex-col h-full">
                  <TerminalStream
                    lines={filteredLines}
                    filter={filter}
                    maxHeight="100%"
                  />
                </div>
              </CyberCard>

              {/* Side Command & Event Console */}
              <div className="w-64 shrink-0 border-l border-[#112233] bg-[#03070D] flex flex-col font-mono select-none">
                <div className="px-3 py-1.5 border-b border-[#112233] bg-[#050B13] flex items-center justify-between">
                  <span className="text-[9px] text-[#5A7A9A] tracking-widest font-bold">
                    SYSTEM REPL / CMD
                  </span>
                  <span className="text-[8px] text-[#00FF66]">
                    {isBackendConnected ? "SQLITE SYNC" : "READY"}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
                  {cmdLog.map((c, i) => (
                    <p
                      key={i}
                      className={`text-[10px] font-mono leading-relaxed ${
                        c.startsWith("!")
                          ? "text-[#FF0055]"
                          : c.startsWith(">")
                          ? "text-[#00E5FF]"
                          : "text-[#00FF66]"
                      }`}
                    >
                      {c}
                    </p>
                  ))}
                  {cmdLog.length === 0 && (
                    <div className="text-[10px] text-[#2A4A6A] space-y-1">
                      <p>Active Target: {selectedSystem.tag}</p>
                      <p>Type commands below or use prompt shortcuts:</p>
                      <p className="text-[#3A5A7A]">emit &lt;msg&gt;  (send to backend)</p>
                      <p className="text-[#3A5A7A]">sync        (pull from SQLite)</p>
                      <p className="text-[#3A5A7A]">grep &lt;pattern&gt;</p>
                      <p className="text-[#3A5A7A]">level ERROR</p>
                    </div>
                  )}
                </div>

                {/* Quick Shortcuts */}
                <div className="p-2 border-t border-[#112233] bg-[#070D16] flex flex-wrap gap-1">
                  <button
                    onClick={() => handleCommand("sync")}
                    className="text-[9px] text-[#00FF66] hover:bg-[#00FF66]/10 px-1 py-0.5 border border-[#00FF66]/30"
                  >
                    :sync
                  </button>
                  <button
                    onClick={() => handleCommand("level ERROR")}
                    className="text-[9px] text-[#FF0055] hover:bg-[#FF0055]/10 px-1 py-0.5 border border-[#FF0055]/30"
                  >
                    :errors
                  </button>
                  <button
                    onClick={() => handleCommand("level WARN")}
                    className="text-[9px] text-[#FFD600] hover:bg-[#FFD600]/10 px-1 py-0.5 border border-[#FFD600]/30"
                  >
                    :warnings
                  </button>
                  <button
                    onClick={() => handleCommand("clear")}
                    className="text-[9px] text-[#5A7A9A] hover:bg-[#112233] px-1 py-0.5 border border-[#112233]"
                  >
                    :clear
                  </button>
                  <button
                    onClick={() => setActiveTab("analysis")}
                    className="text-[9px] text-[#00E5FF] hover:bg-[#00E5FF]/10 px-1 py-0.5 border border-[#00E5FF]/30"
                  >
                    :analysis
                  </button>
                </div>
              </div>
            </div>

            {/* Prompt */}
            <TerminalPrompt onCommand={handleCommand} />
          </div>
        )}

        {/* TAB 2: ANALYSIS */}
        {activeTab === "analysis" && (
          <SystemAnalysisTab
            system={selectedSystem}
            onOpenLogs={() => setActiveTab("logs")}
          />
        )}

        {/* TAB 3: DEBUGGING */}
        {activeTab === "debugging" && (
          <SystemDebuggingTab
            system={selectedSystem}
            onOpenLogs={() => setActiveTab("logs")}
          />
        )}

        {/* TAB 4: RECOMMENDATIONS */}
        {activeTab === "recommendations" && (
          <SystemRecommendationsTab
            system={selectedSystem}
            onOpenLogs={() => setActiveTab("logs")}
          />
        )}

        {/* TAB 5: SYSTEM ISSUES */}
        {activeTab === "issues" && (
          <SystemIssuesTab
            system={selectedSystem}
            onOpenLogs={() => setActiveTab("logs")}
          />
        )}

        {/* Real User Telemetry (RUM) Modal */}
        {showTrackerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#070D16] border border-[#00FF66]/40 w-full max-w-2xl font-mono text-xs shadow-2xl p-6 relative animate-fadeinup">
              <button
                type="button"
                onClick={() => setShowTrackerModal(false)}
                className="absolute top-4 right-4 text-[#5A7A9A] hover:text-[#FF0055] text-base"
              >
                ✕
              </button>

              <div className="flex items-center gap-2 mb-3 text-[#00FF66] font-bold text-sm">
                <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-ping" />
                REAL USER OBSERVABILITY (RUM TRACKER)
              </div>

              <p className="text-[#A0C0E0] mb-4 text-[11px] leading-relaxed">
                Zero-configuration, $0 free in-browser telemetry. Ingests genuine page navigation, button clicks, route changes (SPA pushState), and JavaScript crashes from any live application directly into your Nexis Fleet panel without mock data.
              </p>

              {/* SECTION 1: Test In Live Tab Immediately */}
              <div className="bg-[#03070D] border border-[#112233] p-3 mb-3">
                <div className="text-[#00F0FF] font-bold text-[11px] mb-1.5 flex items-center justify-between">
                  <span>1. TEST RIGHT NOW ON LIVE SITE (NO REDEPLOY)</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`const s=document.createElement('script');s.src='http://localhost:8000/api/v1/telemetry/tracker.js?id=${activeSoftware.id}';document.head.appendChild(s);`);
                      setCopiedSnippet(true);
                      setTimeout(() => setCopiedSnippet(false), 2000);
                    }}
                    className="text-[10px] text-[#00FF66] hover:underline"
                  >
                    {copiedSnippet ? "✓ COPIED CONSOLE SNIPPET" : "COPY SNIPPET"}
                  </button>
                </div>
                <p className="text-[#5A7A9A] text-[10px] mb-2">
                  Open your browser tab on <span className="text-[#C0D8F0]">{activeSoftware.targetUrl || "your live web app"}</span>, open DevTools Console (F12), and paste:
                </p>
                <div className="bg-[#010408] border border-[#112233] p-2 text-[#00FF66] text-[10px] break-all select-all font-mono">
                  {`const s=document.createElement('script');s.src='http://localhost:8000/api/v1/telemetry/tracker.js?id=${activeSoftware.id}';document.head.appendChild(s);`}
                </div>
              </div>

              {/* SECTION 2: Permanent Script Tag */}
              <div className="bg-[#03070D] border border-[#112233] p-3 mb-3">
                <div className="text-[#FFD600] font-bold text-[11px] mb-1.5 flex items-center justify-between">
                  <span>2. PERMANENT EMBED IN CODEBASE (INDEX.HTML / APP)</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`<script src="http://localhost:8000/api/v1/telemetry/tracker.js?id=${activeSoftware.id}" async></script>`);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 2000);
                    }}
                    className="text-[10px] text-[#00FF66] hover:underline"
                  >
                    {copiedScript ? "✓ COPIED SCRIPT TAG" : "COPY SCRIPT TAG"}
                  </button>
                </div>
                <p className="text-[#5A7A9A] text-[10px] mb-2">
                  Add this single tag to your <code className="text-[#C0D8F0]">index.html</code> (before &lt;/head&gt;). Automatically captures all SPA route transitions and user interactions:
                </p>
                <div className="bg-[#010408] border border-[#112233] p-2 text-[#FFD600] text-[10px] break-all select-all font-mono">
                  {`<script src="http://localhost:8000/api/v1/telemetry/tracker.js?id=${activeSoftware.id}" async></script>`}
                </div>
              </div>

              {/* SECTION 3: Live Verification Test */}
              <div className="flex items-center justify-between pt-2 border-t border-[#112233]">
                <div className="text-[10px] text-[#5A7A9A]">
                  Click to fire a test navigation event into the active log stream:
                </div>
                <CyberButton
                  accent="green"
                  size="sm"
                  type="button"
                  onClick={async () => {
                    await ingestTelemetryLog({
                      system_id: `${activeSoftware.id}-frontend`,
                      message: `User navigated to /teachers-portal/strands [Verified Live Probe]`,
                      level: "INFO",
                      tag: "User.Navigation",
                    });
                    setTestSent(true);
                    setTimeout(() => setTestSent(false), 2500);
                    await loadBackendLogs();
                  }}
                >
                  {testSent ? "✓ EVENT EMITTED!" : "⚡ SEND TEST EVENT"}
                </CyberButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LogsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center font-mono text-xs text-[#00FF66] bg-[#03070D]">
          INITIALIZING NEXIS TELEMETRY STREAM...
        </div>
      }
    >
      <LogsContent />
    </Suspense>
  );
}
