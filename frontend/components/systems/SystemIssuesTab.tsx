"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MonitoredSystem, SystemIssue } from "@/lib/systems";
import CyberCard from "@/components/ui/CyberCard";
import CyberButton from "@/components/ui/CyberButton";
import SeverityTag from "@/components/ui/SeverityTag";

interface SystemIssuesTabProps {
  system: MonitoredSystem;
  onOpenLogs: () => void;
}

export default function SystemIssuesTab({
  system,
  onOpenLogs,
}: SystemIssuesTabProps) {
  const [issues, setIssues] = useState<SystemIssue[]>(system.issues);

  const updateStatus = (id: string, newStatus: "open" | "investigating" | "mitigated") => {
    setIssues((prev) =>
      prev.map((iss) => (iss.id === id ? { ...iss, status: newStatus } : iss))
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 animate-fadeinup">
      {/* Header notice */}
      <div className="flex items-center justify-between border-b border-[#112233] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[#FF0055] font-mono text-xs">⚠</span>
            <h2 className="text-[#FF0055] text-xs font-bold tracking-[0.25em] font-mono glow-magenta">
              SYSTEM-RELATED ISSUES & ALERTS // {system.name.toUpperCase()}
            </h2>
          </div>
          <p className="text-[#5A7A9A] text-[10px] font-mono mt-0.5">
            Distinct incident tracking, anomaly triggers, and direct cross-links to Error Tracker.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/errors">
            <CyberButton accent="magenta" size="sm" variant="solid">
              ⚠ OPEN GLOBAL ERROR TRACKER
            </CyberButton>
          </Link>
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

      {/* Issues list */}
      <div className="flex flex-col gap-3">
        {issues.map((issue) => (
          <CyberCard
            key={issue.id}
            accent={issue.severity === "critical" ? "magenta" : "yellow"}
            className="p-4"
          >
            <div className="flex flex-col gap-3 font-mono">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <SeverityTag severity={issue.severity} />
                    <span className="text-[10px] text-[#5A7A9A]">{issue.id}</span>
                    <span className="text-[10px] text-[#2A4A6A]">
                      FIRST SEEN: {issue.time}
                    </span>
                    <span
                      className={`text-[9px] uppercase px-1.5 py-0.5 border ${
                        issue.status === "open"
                          ? "text-[#FF0055] border-[#FF0055]/40 bg-[#FF0055]/10"
                          : issue.status === "investigating"
                          ? "text-[#FFD600] border-[#FFD600]/40 bg-[#FFD600]/10"
                          : "text-[#00FF66] border-[#00FF66]/40 bg-[#00FF66]/10"
                      }`}
                    >
                      {issue.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#E0F0FF] mt-1">
                    {issue.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  {issue.status !== "investigating" && (
                    <CyberButton
                      accent="yellow"
                      size="sm"
                      variant="ghost"
                      onClick={() => updateStatus(issue.id, "investigating")}
                    >
                      INVESTIGATING
                    </CyberButton>
                  )}
                  {issue.status !== "mitigated" && (
                    <CyberButton
                      accent="green"
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(issue.id, "mitigated")}
                    >
                      MITIGATE
                    </CyberButton>
                  )}
                </div>
              </div>

              <div className="p-2.5 bg-[#03070D] border border-[#112233] text-xs text-[#C0D8F0] leading-relaxed">
                {issue.description}
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#5A7A9A] pt-1">
                <span>IMPACTED NODE: {system.host}:{system.port} ({system.region})</span>
                <Link
                  href="/errors"
                  className="text-[#00E5FF] hover:underline flex items-center gap-1"
                >
                  Inspect stack traces & correlated errors ▸
                </Link>
              </div>
            </div>
          </CyberCard>
        ))}

        {issues.length === 0 && (
          <div className="p-8 text-center text-[#5A7A9A] font-mono text-xs flex flex-col items-center justify-center gap-2 bg-[#070D16] border border-[#112233]">
            <span className="text-[#00FF66] text-xl">✓</span>
            <p>Zero active issues or anomalies reported for {system.name}.</p>
            <span className="text-[10px] text-[#2A4A6A]">
              Telemetry stream within baseline thresholds.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
