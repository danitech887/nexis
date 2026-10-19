"use client";

import React from "react";
import { MonitoredSystem } from "@/lib/systems";
import CyberCard from "@/components/ui/CyberCard";
import CyberButton from "@/components/ui/CyberButton";

interface SystemAnalysisTabProps {
  system: MonitoredSystem;
  onOpenLogs: () => void;
}

export default function SystemAnalysisTab({
  system,
  onOpenLogs,
}: SystemAnalysisTabProps) {
  const { analysis } = system;

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 animate-fadeinup">
      {/* Header notice showing clear separation */}
      <div className="flex items-center justify-between border-b border-[#112233] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[#00E5FF] font-mono text-xs">☵</span>
            <h2 className="text-[#00E5FF] text-xs font-bold tracking-[0.25em] font-mono glow-cyan">
              SYSTEM ANALYSIS & TELEMETRY // {system.name.toUpperCase()}
            </h2>
          </div>
          <p className="text-[#5A7A9A] text-[10px] font-mono mt-0.5">
            Isolated performance benchmarks, latency distributions, and runtime profiling metrics.
          </p>
        </div>

        <CyberButton
          accent="green"
          size="sm"
          variant="outline"
          onClick={onOpenLogs}
        >
          ▸ SWITCH TO LOG STREAM
        </CyberButton>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <CyberCard accent="cyan" className="p-3">
          <span className="text-[9px] font-mono text-[#5A7A9A] tracking-wider">
            AVG LATENCY
          </span>
          <p className="text-xl font-bold font-mono text-[#00E5FF] mt-1">
            {analysis.avgLatency}
          </p>
          <span className="text-[9px] font-mono text-[#00FF66]">✓ SLA compliant</span>
        </CyberCard>

        <CyberCard accent="yellow" className="p-3">
          <span className="text-[9px] font-mono text-[#5A7A9A] tracking-wider">
            P99 LATENCY
          </span>
          <p className="text-xl font-bold font-mono text-[#FFD600] mt-1">
            {analysis.p99Latency}
          </p>
          <span className="text-[9px] font-mono text-[#5A7A9A]">99th percentile</span>
        </CyberCard>

        <CyberCard accent="green" className="p-3">
          <span className="text-[9px] font-mono text-[#5A7A9A] tracking-wider">
            THROUGHPUT
          </span>
          <p className="text-xl font-bold font-mono text-[#00FF66] mt-1">
            {analysis.throughput}
          </p>
          <span className="text-[9px] font-mono text-[#5A7A9A]">Active ingress</span>
        </CyberCard>

        <CyberCard accent={parseFloat(analysis.errorRate) > 1 ? "magenta" : "cyan"} className="p-3">
          <span className="text-[9px] font-mono text-[#5A7A9A] tracking-wider">
            ERROR RATE
          </span>
          <p
            className={`text-xl font-bold font-mono mt-1 ${
              parseFloat(analysis.errorRate) > 1
                ? "text-[#FF0055]"
                : "text-[#00E5FF]"
            }`}
          >
            {analysis.errorRate}
          </p>
          <span className="text-[9px] font-mono text-[#5A7A9A]">HTTP 5xx & exceptions</span>
        </CyberCard>

        <CyberCard accent="cyan" className="p-3">
          <span className="text-[9px] font-mono text-[#5A7A9A] tracking-wider">
            MEMORY USAGE
          </span>
          <p className="text-xl font-bold font-mono text-[#C0D8F0] mt-1">
            {analysis.memoryUsage.split("/")[0].trim()}
          </p>
          <span className="text-[9px] font-mono text-[#5A7A9A]">
            Cap: {analysis.memoryUsage.split("/")[1]?.trim() || "N/A"}
          </span>
        </CyberCard>

        <CyberCard accent="cyan" className="p-3">
          <span className="text-[9px] font-mono text-[#5A7A9A] tracking-wider">
            CPU LOAD
          </span>
          <p className="text-xl font-bold font-mono text-[#C0D8F0] mt-1">
            {analysis.cpuUsage}
          </p>
          <span className="text-[9px] font-mono text-[#5A7A9A]">Core utilization</span>
        </CyberCard>
      </div>

      {/* Latency & Traffic Distribution Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CyberCard title="LATENCY DISTRIBUTION & P99 SPREAD" accent="cyan">
          <div className="flex flex-col gap-3 font-mono text-xs">
            <div className="flex items-center justify-between text-[#5A7A9A] text-[10px]">
              <span>TIER</span>
              <span>HISTOGRAM DENSITY</span>
              <span>PERCENTILE</span>
            </div>

            {[
              { tier: "< 10ms", width: "70%", count: "14.2K req", color: "#00FF66" },
              { tier: "10ms - 50ms", width: "22%", count: "4.1K req", color: "#00E5FF" },
              { tier: "50ms - 200ms", width: "6%", count: "1.2K req", color: "#FFD600" },
              { tier: "> 200ms", width: "2%", count: "190 req", color: "#FF0055" },
            ].map((row) => (
              <div key={row.tier} className="flex items-center gap-3">
                <span className="w-24 text-[10px] text-[#A0C0E0]">{row.tier}</span>
                <div className="flex-1 h-3 bg-[#03070D] border border-[#112233] p-0.5">
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: row.width, background: row.color }}
                  />
                </div>
                <span className="w-16 text-right text-[10px] text-[#5A7A9A]">
                  {row.count}
                </span>
              </div>
            ))}

            <div className="mt-2 p-2 bg-[#03070D] border border-[#112233] text-[10px] text-[#5A7A9A]">
              Estimated jitter: <span className="text-[#00E5FF]">±4.2ms</span> | TCP Handshake: <span className="text-[#00FF66]">0.8ms</span>
            </div>
          </div>
        </CyberCard>

        {/* System Insights & Anomaly Analysis */}
        <CyberCard title="OBSERVABILITY INSIGHTS & ANOMALIES" accent="green">
          <div className="flex flex-col gap-2.5">
            {analysis.insights.map((insight, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-[#03070D] border border-[#112233] hover:border-[#00FF66]/40 transition-colors flex items-start gap-2.5"
              >
                <span className="text-[#00FF66] font-mono text-xs mt-0.5">◈</span>
                <p className="text-[11px] font-mono text-[#C0D8F0] leading-relaxed">
                  {insight}
                </p>
              </div>
            ))}

            <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-[#5A7A9A] pt-2 border-t border-[#112233]">
              <span>SAMPLING FREQUENCY: 100% REALTIME</span>
              <span className="text-[#00FF66]">INGESTION NOMINAL</span>
            </div>
          </div>
        </CyberCard>
      </div>
    </div>
  );
}
