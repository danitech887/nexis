"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import CyberCard from "@/components/ui/CyberCard";
import VitalsBadge from "@/components/shell/VitalsBadge";
import SeverityTag from "@/components/ui/SeverityTag";
import CyberButton from "@/components/ui/CyberButton";
import NexisLogo from "@/components/ui/NexisLogo";
import NexisLoader from "@/components/ui/NexisLoader";
import { useActiveSoftware } from "@/lib/ActiveSoftwareContext";
import { fetchVitalsForSoftware, LiveVitalsPayload } from "@/lib/backendApi";

const GRADE_MAP: Record<string, { label: string; color: string }> = {
  A: { label: "A", color: "#00FF66" },
  B: { label: "B", color: "#00E5FF" },
  C: { label: "C", color: "#FFD600" },
  D: { label: "D", color: "#FF4400" },
  F: { label: "F", color: "#FF0055" },
};

export default function DashboardPage() {
  const { activeSoftware, fleet, refreshFleet } = useActiveSoftware();
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveVitals, setLiveVitals] = useState<LiveVitalsPayload | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Connecting...");
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  // Poll live vitals from backend
  const loadLiveVitals = async () => {
    setIsSyncing(true);
    try {
      const data = await fetchVitalsForSoftware(activeSoftware.id);
      if (data) {
        setLiveVitals(data);
        setIsLiveConnected(true);
        setLastSyncTime(new Date().toLocaleTimeString());
      } else {
        setIsLiveConnected(false);
      }
    } catch {
      setIsLiveConnected(false);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadLiveVitals();
    // Auto-poll every 5 seconds for telemetry instrumentation
    const interval = setInterval(loadLiveVitals, 5000);
    return () => clearInterval(interval);
  }, [activeSoftware.id]);

  const handleManualRefresh = async () => {
    await refreshFleet();
    await loadLiveVitals();
  };

  // Merge live metrics with activeSoftware fallback
  const cpuDisplay = liveVitals?.metrics.cpu || activeSoftware.metrics.cpu;
  const memoryDisplay = liveVitals?.metrics.memory || activeSoftware.metrics.memory;
  const p99LatencyDisplay = liveVitals?.metrics.p99_latency || activeSoftware.metrics.p99Latency;
  const errorCountDisplay = liveVitals ? liveVitals.metrics.error_count : activeSoftware.errorCount;
  const hasSpikeDisplay = liveVitals ? liveVitals.metrics.has_spike : activeSoftware.hasSpike;
  const activeSessionsDisplay = liveVitals?.metrics.active_sessions || activeSoftware.metrics.activeSessions;
  const sastGradeDisplay = liveVitals?.metrics.sast_grade || activeSoftware.sastGrade;
  const overallVitals = liveVitals?.vitals || activeSoftware.vitals;

  // Subsystems from live backend or static platform fallback
  const renderedSubsystems = liveVitals?.subsystems && liveVitals.subsystems.length > 0
    ? liveVitals.subsystems
    : [
        { name: "Ingress Gateway Router", grade: "A", status: "online" as const },
        { name: "Application Runtime Pool", grade: "A", status: "online" as const },
        { name: "Persistence & Data Store", grade: "A", status: "online" as const },
        { name: "Async Job Dispatcher", grade: "A", status: "online" as const },
        { name: "Edge Cache / Buffer", grade: "A", status: "online" as const },
      ];

  const metrics = [
    { label: "CPU USAGE", value: cpuDisplay, trend: "host load", accent: "cyan" as const, warn: parseFloat(cpuDisplay) > 85 },
    { label: "MEMORY", value: memoryDisplay, trend: liveVitals?.metrics.memory_percent ? `${liveVitals.metrics.memory_percent} RAM` : "stable", accent: "cyan" as const, warn: false },
    {
      label: "ACTIVE ERRORS",
      value: String(errorCountDisplay),
      trend: hasSpikeDisplay ? "SPIKE!" : "stable",
      accent: errorCountDisplay > 10 ? ("magenta" as const) : ("green" as const),
      warn: errorCountDisplay > 10,
    },
    { label: "THROUGHPUT", value: activeSessionsDisplay, trend: "ingress", accent: "green" as const, warn: false },
    {
      label: "P99 LATENCY",
      value: p99LatencyDisplay,
      trend: parseInt(p99LatencyDisplay) > 300 ? "degraded" : "optimal",
      accent: parseInt(p99LatencyDisplay) > 300 ? ("yellow" as const) : ("cyan" as const),
      warn: parseInt(p99LatencyDisplay) > 300,
    },
    { label: "SAST GRADE", value: sastGradeDisplay, trend: `${activeSoftware.scopedSast.length} alerts`, accent: "cyan" as const, warn: false },
  ];

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-4 animate-fadeinup font-mono">
      {/* Page title & Live Sync Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#112233] pb-3">
        <div className="flex items-center gap-3">
          <NexisLogo size={32} accent={isLiveConnected ? "green" : "cyan"} mode={isSyncing ? "loading" : "idle"} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[#00E5FF] text-sm font-bold tracking-[0.25em] glow-cyan">
                ◈ HUD VITALS // {activeSoftware.name.toUpperCase()}
              </h1>
              <span
                className={`text-[10px] px-1.5 py-0.5 border ${
                  isLiveConnected
                    ? "text-[#00FF66] bg-[#00FF66]/10 border-[#00FF66]/30"
                    : "text-[#FFD600] bg-[#FFD600]/10 border-[#FFD600]/30"
                }`}
              >
                {isLiveConnected ? "LIVE BACKEND AGENT CONNECTED" : "OFFLINE / LOCAL CACHED"}
              </span>
            </div>
            <p className="text-[#5A7A9A] text-[10px] tracking-widest mt-0.5">
              PLATFORM: <span className="text-[#C0D8F0] font-bold">{activeSoftware.platform}</span> · {activeSoftware.repoPath}
              {liveVitals?.target_url && (
                <span className="ml-2 text-[#00E5FF]">[{liveVitals.target_url}]</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/projects">
            <CyberButton accent="green" size="sm" variant="solid">
              ⊞ SOFTWARE FLEET ({fleet.length})
            </CyberButton>
          </Link>

          <Link href="/logs">
            <CyberButton accent="cyan" size="sm" variant="outline">
              &gt;_ LOG STREAM
            </CyberButton>
          </Link>

          <VitalsBadge
            status={isSyncing ? "warn" : overallVitals === "OK" ? "online" : "warn"}
            label={isSyncing ? "SYNCING" : overallVitals.toUpperCase()}
            accent={overallVitals === "OK" ? "green" : "yellow"}
          />

          <CyberButton
            accent="cyan"
            size="sm"
            variant="ghost"
            disabled={isSyncing}
            onClick={handleManualRefresh}
          >
            {isSyncing ? "SYNCING…" : `⟳ REFRESH (${lastSyncTime})`}
          </CyberButton>
        </div>
      </div>

      {/* Sync banner when active */}
      {isSyncing && (
        <div className="p-2 bg-[#070D16] border border-[#00E5FF]/40 animate-fadeinup">
          <NexisLoader
            size="sm"
            compact
            accent="cyan"
            title="TELEMETRY BUFFER SYNC"
            subtitle={`POLLING LIVE METRICS FROM NEXIS ENGINE (PORT 8000)...`}
          />
        </div>
      )}

      {/* Metric tiles row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m) => (
          <CyberCard key={m.label} accent={m.accent} className="h-24">
            <div className="flex flex-col justify-between h-full p-2.5">
              <span className="text-[9px] text-[#5A7A9A] tracking-widest">{m.label}</span>
              <span
                className="text-2xl font-bold"
                style={{ color: m.warn ? "#FF0055" : "#E0F0FF" }}
              >
                {m.value}
              </span>
              <span
                className="text-[9px] font-bold"
                style={{ color: m.warn ? "#FF0055" : "#2A4A6A" }}
              >
                {m.trend}
              </span>
            </div>
          </CyberCard>
        ))}
      </div>

      {/* Main grid: Subsystems + Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Subsystem health grades */}
        <CyberCard
          title={`${activeSoftware.name.toUpperCase()} // SUBSYSTEM HEALTH (LIVE PROBE)`}
          accent="cyan"
          className="min-h-[200px]"
        >
          <div className="flex flex-col gap-1 p-2">
            {renderedSubsystems.map((sub) => {
              const g = GRADE_MAP[sub.grade] || GRADE_MAP.A;
              return (
                <div
                  key={sub.name}
                  className="flex items-center gap-3 py-2 px-2.5 border border-[#112233] hover:border-[#00FF66]/40 hover:bg-[#07131F] transition-all"
                >
                  <span
                    className="w-7 h-7 flex items-center justify-center font-bold text-sm border shrink-0"
                    style={{ color: g.color, borderColor: `${g.color}44`, background: `${g.color}0D` }}
                  >
                    {g.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-[#C0D8F0] truncate">{sub.name}</p>
                    {sub.note && (
                      <span className="text-[9px] text-[#FFD600]">{sub.note}</span>
                    )}
                  </div>
                  <VitalsBadge status={sub.status as any} label="" accent={sub.status === "online" ? "green" : "yellow"} />
                </div>
              );
            })}
          </div>
        </CyberCard>

        {/* Live Anomaly triggers & Incidents for active software */}
        <CyberCard
          title={`${activeSoftware.name.toUpperCase()} // INCIDENTS & ANOMALIES`}
          accent="magenta"
          headerRight={
            <Link
              href="/errors"
              className="text-[10px] text-[#FF0055] hover:underline"
            >
              Full Inspector ▸
            </Link>
          }
          className="min-h-[200px]"
        >
          <div className="flex flex-col gap-2 p-2">
            {/* Live Backend Incidents */}
            {liveVitals?.incidents && liveVitals.incidents.map((inc) => (
              <div
                key={inc.id}
                className="flex items-start gap-2 py-2 px-2.5 border border-[#FF0055]/30 hover:border-[#FF0055] bg-[#03070D] transition-colors"
              >
                <SeverityTag severity={inc.severity} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#C0D8F0] font-bold leading-tight">{inc.title}</p>
                  <p className="text-[9px] text-[#2A4A6A] mt-0.5">
                    {inc.id} · Last seen: {inc.last_seen} · at {inc.location}
                  </p>
                  <span className="text-[9px] text-[#FF88A0] block mt-1">
                    {inc.details}
                  </span>
                </div>
                <Link href="/errors">
                  <CyberButton accent="magenta" size="sm" variant="ghost">▸</CyberButton>
                </Link>
              </div>
            ))}

            {/* Static Scoped Crashes */}
            {activeSoftware.scopedCrashes.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-2 py-2 px-2.5 border border-[#FF0055]/30 hover:border-[#FF0055] bg-[#03070D] transition-colors"
              >
                <SeverityTag severity={a.severity} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#C0D8F0] font-bold leading-tight">{a.title}</p>
                  <p className="text-[9px] text-[#2A4A6A] mt-0.5">
                    {a.id} · Last seen: {a.lastSeen} · at {a.location}
                  </p>
                  {a.anrDetails && (
                    <span className="text-[9px] text-[#FF88A0] block mt-1">
                      Thread blocked: {a.anrDetails.blockedThread} ({a.anrDetails.durationMs}ms)
                    </span>
                  )}
                </div>
                <Link href="/errors">
                  <CyberButton accent="magenta" size="sm" variant="ghost">▸</CyberButton>
                </Link>
              </div>
            ))}

            {(!liveVitals?.incidents || liveVitals.incidents.length === 0) && activeSoftware.scopedCrashes.length === 0 && (
              <div className="p-8 text-center text-[#5A7A9A] text-xs">
                Zero active crash triggers or latency incidents reported for {activeSoftware.name}.
              </div>
            )}
          </div>
        </CyberCard>
      </div>
    </div>
  );
}
