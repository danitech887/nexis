"use client";

import React from "react";
import { MonitoredSystem } from "@/lib/systems";
import VitalsBadge from "@/components/shell/VitalsBadge";
import CyberButton from "@/components/ui/CyberButton";

export type SystemTab = "logs" | "analysis" | "debugging" | "recommendations" | "issues";

interface SystemHeaderProps {
  system: MonitoredSystem;
  activeTab: SystemTab;
  onTabChange: (tab: SystemTab) => void;
  paused: boolean;
  onTogglePause: () => void;
  onClearLogs: () => void;
  onExportLogs: () => void;
  logCount: number;
}

export default function SystemHeader({
  system,
  activeTab,
  onTabChange,
  paused,
  onTogglePause,
  onClearLogs,
  onExportLogs,
  logCount,
}: SystemHeaderProps) {
  const statusAccent =
    system.status === "online"
      ? "green"
      : system.status === "warn"
      ? "yellow"
      : "magenta";

  return (
    <div className="border-b border-[#112233] bg-[#070D16] flex flex-col shrink-0 select-none">
      {/* Top Banner: System Profile */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#112233]/70">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-[#00FF66] bg-[#00FF66]/10 border border-[#00FF66]/30 px-1.5 py-0.5">
              {system.tag}
            </span>
            <h1 className="text-sm font-bold text-[#E0F0FF] tracking-wider font-mono">
              {system.name}
            </h1>
          </div>

          <div className="h-4 w-px bg-[#112233]" />

          <div className="flex items-center gap-2 text-[10px] font-mono text-[#5A7A9A]">
            <span className="text-[#00E5FF]">{system.host}:{system.port}</span>
            <span>·</span>
            <span>{system.region}</span>
            <span>·</span>
            <span className="text-[#3A5A7A]">{system.version}</span>
            <span>·</span>
            <span>UPTIME: <strong className="text-[#00FF66]">{system.uptime}</strong></span>
          </div>

          <VitalsBadge
            status={system.status}
            label={system.status.toUpperCase()}
            accent={statusAccent}
          />
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          {activeTab === "logs" && (
            <>
              <CyberButton
                accent="green"
                size="sm"
                variant={paused ? "solid" : "outline"}
                onClick={onTogglePause}
              >
                {paused ? "▸ RESUME STREAM" : "⏸ PAUSE STREAM"}
              </CyberButton>

              <CyberButton
                accent="cyan"
                size="sm"
                variant="ghost"
                onClick={onExportLogs}
              >
                ⬇ EXPORT
              </CyberButton>

              <CyberButton
                accent="magenta"
                size="sm"
                variant="ghost"
                onClick={onClearLogs}
              >
                CLEAR
              </CyberButton>
            </>
          )}
        </div>
      </div>

      {/* Navigation Tabs - Cleanly separates Logs from Analysis, Debugging, Recommendations, and Issues */}
      <div className="flex items-center justify-between px-4 bg-[#050B13] text-xs font-mono">
        <div className="flex items-center">
          <button
            onClick={() => onTabChange("logs")}
            className={`px-3 py-2 border-b-2 font-bold tracking-wider transition-colors flex items-center gap-2 ${
              activeTab === "logs"
                ? "border-[#00FF66] text-[#00FF66] bg-[#00FF66]/10 glow-green"
                : "border-transparent text-[#5A7A9A] hover:text-[#C0D8F0]"
            }`}
          >
            <span>▸ LOG STREAM</span>
            <span className="text-[9px] bg-[#112233] px-1.5 py-0.2 rounded text-[#A0C0E0]">
              {logCount}
            </span>
          </button>

          <button
            onClick={() => onTabChange("analysis")}
            className={`px-3 py-2 border-b-2 font-bold tracking-wider transition-colors flex items-center gap-2 ${
              activeTab === "analysis"
                ? "border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/10 glow-cyan"
                : "border-transparent text-[#5A7A9A] hover:text-[#C0D8F0]"
            }`}
          >
            <span>☵ ANALYSIS</span>
            <span className="text-[9px] text-[#00E5FF]">
              {system.analysis.avgLatency}
            </span>
          </button>

          <button
            onClick={() => onTabChange("debugging")}
            className={`px-3 py-2 border-b-2 font-bold tracking-wider transition-colors flex items-center gap-2 ${
              activeTab === "debugging"
                ? "border-[#FFD600] text-[#FFD600] bg-[#FFD600]/10 glow-yellow"
                : "border-transparent text-[#5A7A9A] hover:text-[#C0D8F0]"
            }`}
          >
            <span>⚙ DEBUGGING</span>
            <span className="text-[9px] text-[#FFD600]">
              {system.debugging.probes.length} PROBES
            </span>
          </button>

          <button
            onClick={() => onTabChange("recommendations")}
            className={`px-3 py-2 border-b-2 font-bold tracking-wider transition-colors flex items-center gap-2 ${
              activeTab === "recommendations"
                ? "border-[#00FF66] text-[#00FF66] bg-[#00FF66]/10 glow-green"
                : "border-transparent text-[#5A7A9A] hover:text-[#C0D8F0]"
            }`}
          >
            <span>✦ RECOMMENDATIONS</span>
            {system.recommendations.length > 0 && (
              <span className="text-[9px] bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/40 px-1 py-0.2">
                {system.recommendations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange("issues")}
            className={`px-3 py-2 border-b-2 font-bold tracking-wider transition-colors flex items-center gap-2 ${
              activeTab === "issues"
                ? "border-[#FF0055] text-[#FF0055] bg-[#FF0055]/10 glow-magenta"
                : "border-transparent text-[#5A7A9A] hover:text-[#C0D8F0]"
            }`}
          >
            <span>⚠ SYSTEM ISSUES</span>
            {system.issues.length > 0 && (
              <span className="text-[9px] bg-[#FF0055]/20 text-[#FF0055] border border-[#FF0055]/40 px-1 py-0.2 font-bold">
                {system.issues.length}
              </span>
            )}
          </button>
        </div>

        <div className="text-[10px] text-[#3A5A7A]">
          SYS_ID: <span className="text-[#00E5FF]">{system.id}</span>
        </div>
      </div>
    </div>
  );
}
