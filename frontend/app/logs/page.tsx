"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MONITORED_SYSTEMS, MonitoredSystem, getSystemById } from "@/lib/systems";
import SystemList from "@/components/systems/SystemList";
import SystemHeader, { SystemTab } from "@/components/systems/SystemHeader";
import SystemAnalysisTab from "@/components/systems/SystemAnalysisTab";
import SystemDebuggingTab from "@/components/systems/SystemDebuggingTab";
import SystemRecommendationsTab from "@/components/systems/SystemRecommendationsTab";
import SystemIssuesTab from "@/components/systems/SystemIssuesTab";
import CyberCard from "@/components/ui/CyberCard";
import TerminalStream from "@/components/terminal/TerminalStream";
import TerminalPrompt from "@/components/terminal/TerminalPrompt";

import { useActiveSoftware } from "@/lib/ActiveSoftwareContext";
import { getMonitoredSystemsForProject } from "@/lib/softwareFleet";

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG" | "TRACE";
interface LogLine {
  id: number;
  ts: string;
  level: LogLevel;
  source: string;
  msg: string;
}

let idSequence = 1000;

function generateSystemLog(system: MonitoredSystem): LogLine {
  const levels: LogLevel[] = ["INFO", "INFO", "INFO", "DEBUG", "WARN", "ERROR", "TRACE"];
  const level = levels[Math.floor(Math.random() * levels.length)];
  let pool = system.sampleLogs.info;

  if (level === "WARN") pool = system.sampleLogs.warn;
  else if (level === "ERROR") pool = system.sampleLogs.error;
  else if (level === "DEBUG") pool = system.sampleLogs.debug;
  else if (level === "TRACE") pool = system.sampleLogs.trace;

  const msg = pool[Math.floor(Math.random() * pool.length)] || system.sampleLogs.info[0];

  return {
    id: idSequence++,
    ts: new Date().toISOString().replace("T", " ").slice(0, 23),
    level,
    source: `${system.id}:${system.port}`,
    msg,
  };
}

function generateInitialLogs(system: MonitoredSystem, count = 25): LogLine[] {
  const logs: LogLine[] = [];
  const baseTime = Date.now() - count * 1500;
  for (let i = 0; i < count; i++) {
    const line = generateSystemLog(system);
    line.ts = new Date(baseTime + i * 1500).toISOString().replace("T", " ").slice(0, 23);
    logs.push(line);
  }
  return logs;
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
  const [paused, setPaused] = useState(false);
  const [cmdLog, setCmdLog] = useState<string[]>([]);

  // Maintain separate log histories for each system
  const [logsBySystem, setLogsBySystem] = useState<Record<string, LogLine[]>>(() => {
    const initial: Record<string, LogLine[]> = {};
    for (const sys of allSystems) {
      initial[sys.id] = generateInitialLogs(sys, 25);
    }
    return initial;
  });

  // Sync when activeSoftware changes
  useEffect(() => {
    const currentSubsystems = getMonitoredSystemsForProject(activeSoftware);
    const primary = currentSubsystems[0];
    const match = requestedSystemId
      ? currentSubsystems.find((s) => s.id === requestedSystemId) || primary
      : primary;

    setSelectedSystem(match);
    setLogsBySystem((prev) => {
      const updated = { ...prev };
      for (const sys of currentSubsystems) {
        if (!updated[sys.id]) {
          updated[sys.id] = generateInitialLogs(sys, 25);
        }
      }
      return updated;
    });
  }, [activeSoftware, requestedSystemId]);

  // Keep selectedSystem synced if search param changes
  useEffect(() => {
    if (requestedSystemId) {
      const match = allSystems.find((s) => s.id === requestedSystemId);
      if (match && match.id !== selectedSystem.id) {
        setSelectedSystem(match);
      }
    }
  }, [requestedSystemId, selectedSystem.id, allSystems]);

  // Periodic log emission for monitored systems
  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setLogsBySystem((prev) => {
        const currentLogs = prev[selectedSystem.id] || [];
        const newLine = generateSystemLog(selectedSystem);
        return {
          ...prev,
          [selectedSystem.id]: [...currentLogs.slice(-400), newLine],
        };
      });
    }, 900);

    return () => clearInterval(interval);
  }, [paused, selectedSystem]);

  const handleSelectSystem = (sys: MonitoredSystem) => {
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

  const currentSystemLogs = logsBySystem[selectedSystem.id] || [];

  const handleClearLogs = () => {
    setLogsBySystem((prev) => ({
      ...prev,
      [selectedSystem.id]: [],
    }));
    setCmdLog((prev) => [`> buffer cleared for ${selectedSystem.id}`, ...prev].slice(0, 20));
  };

  const handleExportLogs = () => {
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
    (cmd: string) => {
      const trimmed = cmd.trim();
      setCmdLog((l) => [`> ${trimmed}`, ...l].slice(0, 20));
      const [verb, ...args] = trimmed.split(" ");
      const lowerVerb = verb.toLowerCase();

      if (lowerVerb === "grep" || lowerVerb === "filter") {
        setFilter(args.join(" "));
      } else if (lowerVerb === "clear") {
        handleClearLogs();
      } else if (lowerVerb === "level") {
        const lvl = args[0]?.toUpperCase() ?? "ALL";
        setSelectedLevel(lvl);
      } else if (lowerVerb === "system" || lowerVerb === "target") {
        const targetId = args[0]?.toLowerCase();
        const match = MONITORED_SYSTEMS.find(
          (s) => s.id === targetId || s.tag.toLowerCase() === targetId
        );
        if (match) {
          handleSelectSystem(match);
        } else {
          setCmdLog((l) => [
            `! System '${targetId}' not found. Available: ${MONITORED_SYSTEMS.map((s) => s.id).join(", ")}`,
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
      } else if (lowerVerb === "help") {
        setCmdLog((l) => [
          "Available commands: grep <str>, level <ALL|INFO|WARN|ERROR|DEBUG>, clear, system <id>, tab <logs|analysis|debugging|recommendations|issues>, pause, resume",
          ...l,
        ].slice(0, 20));
      }
    },
    [selectedSystem]
  );

  // Compute filtered lines by text filter and level filter
  const filteredLines = useMemo(() => {
    return currentSystemLogs.filter((line) => {
      const matchesLevel =
        selectedLevel === "ALL" || line.level === selectedLevel;
      const matchesText =
        !filter ||
        line.msg.toLowerCase().includes(filter.toLowerCase()) ||
        line.source.toLowerCase().includes(filter.toLowerCase()) ||
        line.level.toLowerCase().includes(filter.toLowerCase());
      return matchesLevel && matchesText;
    });
  }, [currentSystemLogs, filter, selectedLevel]);

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
          onTabChange={setActiveTab}
          paused={paused}
          onTogglePause={() => setPaused((p) => !p)}
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
                <span className="w-1.5 h-1.5 bg-[#00FF66] rounded-full animate-ping" />
                {selectedSystem.tag} // LIVE LOGS
              </span>

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

              {/* Counts */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[10px] text-[#FF0055] bg-[#FF0055]/10 px-1.5 py-0.5 border border-[#FF0055]/30">
                  ERR: {totalErrors}
                </span>
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
                  <span className="text-[8px] text-[#00FF66]">READY</span>
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
                      <p className="text-[#3A5A7A]">grep &lt;pattern&gt;</p>
                      <p className="text-[#3A5A7A]">level ERROR</p>
                      <p className="text-[#3A5A7A]">clear</p>
                    </div>
                  )}
                </div>

                {/* Quick Shortcuts */}
                <div className="p-2 border-t border-[#112233] bg-[#070D16] flex flex-wrap gap-1">
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
                  <button
                    onClick={() => setActiveTab("debugging")}
                    className="text-[9px] text-[#FFD600] hover:bg-[#FFD600]/10 px-1 py-0.5 border border-[#FFD600]/30"
                  >
                    :debug
                  </button>
                </div>
              </div>
            </div>

            {/* Prompt */}
            <TerminalPrompt onCommand={handleCommand} />
          </div>
        )}

        {/* TAB 2: ANALYSIS (Handled Separately) */}
        {activeTab === "analysis" && (
          <SystemAnalysisTab
            system={selectedSystem}
            onOpenLogs={() => setActiveTab("logs")}
          />
        )}

        {/* TAB 3: DEBUGGING (Handled Separately) */}
        {activeTab === "debugging" && (
          <SystemDebuggingTab
            system={selectedSystem}
            onOpenLogs={() => setActiveTab("logs")}
          />
        )}

        {/* TAB 4: RECOMMENDATIONS (Handled Separately) */}
        {activeTab === "recommendations" && (
          <SystemRecommendationsTab
            system={selectedSystem}
            onOpenLogs={() => setActiveTab("logs")}
          />
        )}

        {/* TAB 5: SYSTEM ISSUES (Handled Separately) */}
        {activeTab === "issues" && (
          <SystemIssuesTab
            system={selectedSystem}
            onOpenLogs={() => setActiveTab("logs")}
          />
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
