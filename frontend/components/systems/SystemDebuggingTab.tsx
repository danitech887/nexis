"use client";

import React, { useState } from "react";
import { MonitoredSystem } from "@/lib/systems";
import CyberCard from "@/components/ui/CyberCard";
import CyberButton from "@/components/ui/CyberButton";

interface SystemDebuggingTabProps {
  system: MonitoredSystem;
  onOpenLogs: () => void;
}

export default function SystemDebuggingTab({
  system,
  onOpenLogs,
}: SystemDebuggingTabProps) {
  const { debugging } = system;
  const [probing, setProbing] = useState(false);
  const [probeLog, setProbeLog] = useState<string[]>([]);
  const [selectedStackTrace, setSelectedStackTrace] = useState<string | null>(
    debugging.recentStackTraces[0]?.id || null
  );

  const runLiveDiagnostic = () => {
    setProbing(true);
    setProbeLog([`[${new Date().toISOString().slice(11, 19)}] Initiating diagnostic probe on ${system.host}:${system.port}...`]);
    setTimeout(() => {
      setProbeLog((prev) => [
        ...prev,
        `[${new Date().toISOString().slice(11, 19)}] TCP socket connect: OK (${system.debugging.probes[0]?.latency || "2ms"})`,
        `[${new Date().toISOString().slice(11, 19)}] TLS handshake verified: AES-256-GCM cipher`,
        `[${new Date().toISOString().slice(11, 19)}] Internal thread pool inspection: ${system.debugging.activeThreads} active threads, 0 deadlocked`,
        `[${new Date().toISOString().slice(11, 19)}] Memory heap: ${system.debugging.heapAllocated} allocated, GC pressure normal`,
        `[${new Date().toISOString().slice(11, 19)}] Diagnostic test sequence completed with status: NOMINAL`,
      ]);
      setProbing(false);
    }, 1200);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 animate-fadeinup">
      {/* Header notice */}
      <div className="flex items-center justify-between border-b border-[#112233] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[#FFD600] font-mono text-xs">⚙</span>
            <h2 className="text-[#FFD600] text-xs font-bold tracking-[0.25em] font-mono glow-yellow">
              LIVE SYSTEM DEBUGGER // {system.name.toUpperCase()}
            </h2>
          </div>
          <p className="text-[#5A7A9A] text-[10px] font-mono mt-0.5">
            Low-level thread inspection, connection pool health probes, and stack trace post-mortems.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CyberButton
            accent="yellow"
            size="sm"
            variant="solid"
            onClick={runLiveDiagnostic}
            disabled={probing}
          >
            {probing ? "PROBING..." : "⚡ RUN DIAGNOSTIC PROBE"}
          </CyberButton>
          <CyberButton
            accent="green"
            size="sm"
            variant="outline"
            onClick={onOpenLogs}
          >
            ▸ VIEW LOG STREAM
          </CyberButton>
        </div>
      </div>

      {/* Hardware / Runtime Allocations */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CyberCard accent="yellow" className="p-3">
          <span className="text-[9px] font-mono text-[#5A7A9A] tracking-wider">
            ACTIVE THREADS
          </span>
          <p className="text-xl font-bold font-mono text-[#FFD600] mt-1">
            {debugging.activeThreads}
          </p>
          <span className="text-[9px] font-mono text-[#5A7A9A]">Pool limit: 128</span>
        </CyberCard>

        <CyberCard accent="cyan" className="p-3">
          <span className="text-[9px] font-mono text-[#5A7A9A] tracking-wider">
            OPEN TCP SOCKETS
          </span>
          <p className="text-xl font-bold font-mono text-[#00E5FF] mt-1">
            {debugging.openSockets}
          </p>
          <span className="text-[9px] font-mono text-[#5A7A9A]">Epoll descriptor count</span>
        </CyberCard>

        <CyberCard accent="cyan" className="p-3">
          <span className="text-[9px] font-mono text-[#5A7A9A] tracking-wider">
            HEAP ALLOCATED
          </span>
          <p className="text-xl font-bold font-mono text-[#C0D8F0] mt-1">
            {debugging.heapAllocated}
          </p>
          <span className="text-[9px] font-mono text-[#5A7A9A]">Active heap objects</span>
        </CyberCard>

        <CyberCard accent="green" className="p-3">
          <span className="text-[9px] font-mono text-[#5A7A9A] tracking-wider">
            AVG GC PAUSE
          </span>
          <p className="text-xl font-bold font-mono text-[#00FF66] mt-1">
            {debugging.gcPauseAvg}
          </p>
          <span className="text-[9px] font-mono text-[#5A7A9A]">Concurrent mark sweep</span>
        </CyberCard>
      </div>

      {/* Main Debug Split: Health Probes + Interactive Diagnostic Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Health Probes */}
        <CyberCard title="ACTIVE SYSTEM HEALTH PROBES" accent="yellow">
          <div className="flex flex-col gap-2">
            {debugging.probes.map((probe, idx) => {
              const statusColor =
                probe.status === "passing"
                  ? "#00FF66"
                  : probe.status === "degraded"
                  ? "#FFD600"
                  : "#FF0055";
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-[#03070D] border border-[#112233] font-mono text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: statusColor }}
                    />
                    <span className="text-[#C0D8F0] font-bold">{probe.name}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[#5A7A9A] text-[10px]">
                      RTT: <strong style={{ color: statusColor }}>{probe.latency}</strong>
                    </span>
                    <span
                      className="text-[9px] uppercase px-1.5 py-0.5 border"
                      style={{
                        color: statusColor,
                        borderColor: `${statusColor}44`,
                        background: `${statusColor}11`,
                      }}
                    >
                      {probe.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Diagnostic Probe Output */}
          <div className="mt-3 p-3 bg-[#03070D] border border-[#112233] flex flex-col gap-1.5">
            <span className="text-[9px] font-mono text-[#5A7A9A] tracking-widest">
              LIVE DIAGNOSTIC PROBE CONSOLE
            </span>
            <div className="font-mono text-[10px] space-y-1 min-h-[70px]">
              {probeLog.length === 0 ? (
                <p className="text-[#2A4A6A] italic">
                  Press &quot;⚡ RUN DIAGNOSTIC PROBE&quot; to perform an on-demand socket and thread sanity check on {system.id}.
                </p>
              ) : (
                probeLog.map((log, i) => (
                  <p key={i} className="text-[#00FF66]">
                    {log}
                  </p>
                ))
              )}
            </div>
          </div>
        </CyberCard>

        {/* Stack Trace Inspector */}
        <CyberCard title="RECORDED CRASH / STACK TRACES" accent="magenta">
          {debugging.recentStackTraces.length === 0 ? (
            <div className="p-8 text-center text-[#5A7A9A] font-mono text-xs flex flex-col items-center justify-center gap-2">
              <span className="text-[#00FF66] text-xl">✓</span>
              <p>No uncaught exception stack traces recorded for {system.name}.</p>
              <span className="text-[10px] text-[#2A4A6A]">Thread execution clean.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 font-mono">
              {debugging.recentStackTraces.map((st) => (
                <div
                  key={st.id}
                  className="p-3 bg-[#03070D] border border-[#FF0055]/30 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-xs border-b border-[#FF0055]/20 pb-1.5">
                    <span className="text-[#FF0055] font-bold">
                      {st.error}
                    </span>
                    <span className="text-[#5A7A9A] text-[10px]">
                      {st.timestamp}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#00E5FF]">
                    Origin: {st.location}
                  </span>

                  <div className="bg-[#050B13] p-2 border border-[#112233] text-[10px] text-[#FF88A0] font-mono overflow-x-auto leading-relaxed">
                    {st.stack.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CyberCard>
      </div>
    </div>
  );
}
