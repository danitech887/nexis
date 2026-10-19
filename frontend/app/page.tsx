"use client";

import { useState } from "react";
import Link from "next/link";
import CyberCard from "@/components/ui/CyberCard";
import VitalsBadge from "@/components/shell/VitalsBadge";
import SeverityTag from "@/components/ui/SeverityTag";
import CyberButton from "@/components/ui/CyberButton";
import NexisLogo from "@/components/ui/NexisLogo";
import NexisLoader from "@/components/ui/NexisLoader";
import { useActiveSoftware } from "@/lib/ActiveSoftwareContext";

const GRADE_MAP: Record<string, { label: string; color: string }> = {
  A: { label: "A", color: "#00FF66" },
  B: { label: "B", color: "#00E5FF" },
  C: { label: "C", color: "#FFD600" },
  D: { label: "D", color: "#FF4400" },
  F: { label: "F", color: "#FF0055" },
};

export default function DashboardPage() {
  const { activeSoftware, fleet } = useActiveSoftware();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleRefresh = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1000);
  };

  // Generate dynamic subsystem modules based on active software category
  const activeSubsystems = activeSoftware.category === "Mobile"
    ? [
        { name: "Jetpack Compose UI", grade: "A", status: "online" as const },
        { name: "Room SQLite Local DB", grade: "D", status: "warn" as const, note: "ANR write locks" },
        { name: "WorkManager Sync", grade: "B", status: "online" as const },
        { name: "Retrofit Network Client", grade: "B", status: "online" as const },
        { name: "Security & KeyStore", grade: "C", status: "warn" as const, note: "Plaintext prefs" },
      ]
    : activeSoftware.category === "Desktop"
    ? [
        { name: "PyQt5 Event Loop", grade: "A", status: "online" as const },
        { name: "USB HID RFID Bridge", grade: "A", status: "online" as const },
        { name: "SQLite WAL Engine", grade: "A", status: "online" as const },
        { name: "Offline Sync Daemon", grade: "B", status: "online" as const },
      ]
    : [
        { name: "Gunicorn WSGI Workers", grade: "A", status: "online" as const },
        { name: "Django REST Endpoints", grade: "B", status: "online" as const },
        { name: "PostgreSQL Primary Pool", grade: "C", status: "warn" as const, note: "Connection resets" },
        { name: "Celery Task Broker", grade: "A", status: "online" as const },
        { name: "Redis Ingress Cache", grade: "A", status: "online" as const },
      ];

  const metrics = [
    { label: "CPU USAGE", value: activeSoftware.metrics.cpu, trend: "nominal", accent: "cyan" as const, warn: false },
    { label: "MEMORY", value: activeSoftware.metrics.memory, trend: "stable", accent: "cyan" as const, warn: false },
    {
      label: "ACTIVE ERRORS",
      value: String(activeSoftware.errorCount),
      trend: activeSoftware.hasSpike ? "SPIKE!" : "stable",
      accent: activeSoftware.errorCount > 20 ? ("magenta" as const) : ("green" as const),
      warn: activeSoftware.errorCount > 20,
    },
    { label: "THROUGHPUT", value: activeSoftware.metrics.activeSessions, trend: "+8%", accent: "green" as const, warn: false },
    {
      label: "P99 LATENCY",
      value: activeSoftware.metrics.p99Latency,
      trend: parseInt(activeSoftware.metrics.p99Latency) > 300 ? "+48ms" : "optimal",
      accent: parseInt(activeSoftware.metrics.p99Latency) > 300 ? ("yellow" as const) : ("cyan" as const),
      warn: parseInt(activeSoftware.metrics.p99Latency) > 300,
    },
    { label: "SAST GRADE", value: activeSoftware.sastGrade, trend: `${activeSoftware.scopedSast.length} alerts`, accent: "cyan" as const, warn: false },
  ];

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-4 animate-fadeinup font-mono">
      {/* Page title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#112233] pb-3">
        <div className="flex items-center gap-3">
          <NexisLogo size={32} accent="cyan" mode={isSyncing ? "loading" : "idle"} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[#00E5FF] text-sm font-bold tracking-[0.25em] glow-cyan">
                ◈ HUD VITALS // {activeSoftware.name.toUpperCase()}
              </h1>
              <span className="text-[10px] text-[#00FF66] bg-[#00FF66]/10 px-1.5 py-0.5 border border-[#00FF66]/30">
                MONITORING ACTIVE
              </span>
            </div>
            <p className="text-[#5A7A9A] text-[10px] tracking-widest mt-0.5">
              PLATFORM: <span className="text-[#C0D8F0] font-bold">{activeSoftware.platform}</span> · {activeSoftware.repoPath}
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
            status={isSyncing ? "warn" : activeSoftware.vitals === "OK" ? "online" : "warn"}
            label={isSyncing ? "SYNCING" : activeSoftware.vitals.toUpperCase()}
            accent={activeSoftware.vitals === "OK" ? "green" : "yellow"}
          />

          <CyberButton
            accent="cyan"
            size="sm"
            variant="ghost"
            disabled={isSyncing}
            onClick={handleRefresh}
          >
            {isSyncing ? "SYNCING…" : "⟳ REFRESH"}
          </CyberButton>
        </div>
      </div>

      {/* Sync banner when active */}
      {isSyncing && (
        <div className="p-2.5 bg-[#070D16] border border-[#00E5FF]/40 animate-fadeinup">
          <NexisLoader
            size="sm"
            compact
            accent="cyan"
            title="TELEMETRY BUFFER SYNC"
            subtitle={`POLLING ACTIVE AGENT ON ${activeSoftware.name.toUpperCase()}...`}
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
          title={`${activeSoftware.name.toUpperCase()} // SUBSYSTEM HEALTH`}
          accent="cyan"
          className="min-h-[200px]"
        >
          <div className="flex flex-col gap-1 p-2">
            {activeSubsystems.map((sub) => {
              const g = GRADE_MAP[sub.grade];
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
                  <VitalsBadge status={sub.status} label="" accent={sub.status === "online" ? "green" : "yellow"} />
                </div>
              );
            })}
          </div>
        </CyberCard>

        {/* Anomaly triggers for active software */}
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

            {activeSoftware.scopedCrashes.length === 0 && (
              <div className="p-8 text-center text-[#5A7A9A] text-xs">
                Zero active crash triggers reported for {activeSoftware.name}.
              </div>
            )}
          </div>
        </CyberCard>
      </div>
    </div>
  );
}
