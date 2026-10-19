"use client";

import React, { useState } from "react";
import { MonitoredSystem } from "@/lib/systems";
import CyberCard from "@/components/ui/CyberCard";
import CyberButton from "@/components/ui/CyberButton";
import SeverityTag from "@/components/ui/SeverityTag";

interface SystemRecommendationsTabProps {
  system: MonitoredSystem;
  onOpenLogs: () => void;
}

export default function SystemRecommendationsTab({
  system,
  onOpenLogs,
}: SystemRecommendationsTabProps) {
  const [appliedMap, setAppliedMap] = useState<Record<string, boolean>>({});
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const applyRecommendation = (id: string) => {
    setApplyingId(id);
    setTimeout(() => {
      setAppliedMap((prev) => ({ ...prev, [id]: true }));
      setApplyingId(null);
    }, 1200);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 animate-fadeinup">
      {/* Header notice */}
      <div className="flex items-center justify-between border-b border-[#112233] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[#00FF66] font-mono text-xs">✦</span>
            <h2 className="text-[#00FF66] text-xs font-bold tracking-[0.25em] font-mono glow-green">
              SYSTEM RECOMMENDATIONS & OPTIMIZATIONS // {system.name.toUpperCase()}
            </h2>
          </div>
          <p className="text-[#5A7A9A] text-[10px] font-mono mt-0.5">
            Targeted AI-generated architectural enhancements, configuration tuning, and auto-remediations.
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

      {/* Summary status banner */}
      <div className="p-3 bg-[#070D16] border border-[#00FF66]/30 flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-3">
          <span className="text-[#00FF66] font-bold text-sm">✦</span>
          <div>
            <p className="text-[#C0D8F0] font-bold">
              {system.recommendations.length} Active Recommendations for {system.tag}
            </p>
            <p className="text-[#5A7A9A] text-[10px]">
              Evaluated against real-time telemetry, connection saturation, and error rates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-[#5A7A9A]">
            AUTO-FIXABLE:{" "}
            <strong className="text-[#00FF66]">
              {system.recommendations.filter((r) => r.autoFixable).length}
            </strong>
          </span>
          <div className="h-3 w-px bg-[#112233]" />
          <span className="text-[#5A7A9A]">
            MANUAL REVIEW:{" "}
            <strong className="text-[#FFD600]">
              {system.recommendations.filter((r) => !r.autoFixable).length}
            </strong>
          </span>
        </div>
      </div>

      {/* List of recommendations */}
      <div className="flex flex-col gap-3">
        {system.recommendations.map((rec) => {
          const isApplied = appliedMap[rec.id];
          const isApplying = applyingId === rec.id;

          return (
            <CyberCard
              key={rec.id}
              accent={isApplied ? "green" : rec.severity === "critical" ? "magenta" : "cyan"}
              className="p-4"
            >
              <div className="flex flex-col gap-3 font-mono">
                {/* Title and tags */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <SeverityTag severity={rec.severity} />
                      <span className="text-[10px] text-[#00E5FF] bg-[#00E5FF]/10 px-1.5 py-0.5 border border-[#00E5FF]/30">
                        {rec.category.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-[#5A7A9A]">{rec.id}</span>
                    </div>

                    <h3 className="text-sm font-bold text-[#E0F0FF] mt-1">
                      {rec.title}
                    </h3>
                  </div>

                  {/* Action button */}
                  <div>
                    {isApplied ? (
                      <span className="px-3 py-1 bg-[#00FF66]/20 border border-[#00FF66] text-[#00FF66] text-xs font-bold flex items-center gap-1.5">
                        ✓ APPLIED
                      </span>
                    ) : (
                      <CyberButton
                        accent={rec.severity === "critical" ? "magenta" : "green"}
                        size="sm"
                        variant={rec.autoFixable ? "solid" : "outline"}
                        disabled={isApplying}
                        onClick={() => applyRecommendation(rec.id)}
                      >
                        {isApplying
                          ? "APPLYING..."
                          : rec.autoFixable
                          ? "⚡ AUTO APPLY FIX"
                          : "INSPECT & APPLY"}
                      </CyberButton>
                    )}
                  </div>
                </div>

                {/* Impact assessment */}
                <div className="p-2.5 bg-[#03070D] border border-[#112233] text-xs">
                  <span className="text-[#5A7A9A] text-[10px] block mb-0.5">
                    EXPECTED IMPACT:
                  </span>
                  <p className="text-[#00FF66]">{rec.impact}</p>
                </div>

                {/* Suggested Fix snippet */}
                <div className="p-2.5 bg-[#03070D] border border-[#112233] text-xs">
                  <span className="text-[#5A7A9A] text-[10px] block mb-0.5">
                    SUGGESTED IMPLEMENTATION:
                  </span>
                  <code className="text-[#C0D8F0] text-[11px] block bg-[#050B13] p-1.5 border border-[#112233]/60 rounded-none overflow-x-auto">
                    {rec.suggestedFix}
                  </code>
                </div>
              </div>
            </CyberCard>
          );
        })}

        {system.recommendations.length === 0 && (
          <div className="p-8 text-center text-[#5A7A9A] font-mono text-xs flex flex-col items-center justify-center gap-2 bg-[#070D16] border border-[#112233]">
            <span className="text-[#00FF66] text-xl">✦</span>
            <p>No open recommendations for {system.name}.</p>
            <span className="text-[10px] text-[#2A4A6A]">
              System runtime parameters are optimal.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
