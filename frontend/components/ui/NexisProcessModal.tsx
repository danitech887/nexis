"use client";

import React, { useState } from "react";
import NexisLogo, { NexisLogoAccent, NexisLogoMode, NexisLogoSize } from "./NexisLogo";
import NexisLoader, { NexisOverlayLoader } from "./NexisLoader";
import CyberButton from "./CyberButton";
import CyberCard from "./CyberCard";

interface NexisProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NexisProcessModal({ isOpen, onClose }: NexisProcessModalProps) {
  const [selectedAccent, setSelectedAccent] = useState<NexisLogoAccent>("cyan");
  const [selectedMode, setSelectedMode] = useState<NexisLogoMode>("loading");
  const [selectedSize, setSelectedSize] = useState<NexisLogoSize>("xl");
  const [viewType, setViewType] = useState<"emblem" | "banner">("emblem");
  const [showOverlayLoader, setShowOverlayLoader] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#03070D]/80 backdrop-blur-md animate-fadeinup">
        {/* Background Grid */}
        <div className="absolute inset-0 cyber-grid-bg opacity-30 pointer-events-none" />

        <div className="relative w-full max-w-2xl bg-[#070D16] border border-[#00E5FF]/40 shadow-[0_0_30px_rgba(0,229,255,0.2)] p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#112233] pb-3">
            <div className="flex items-center gap-3">
              <NexisLogo size={32} accent={selectedAccent} mode={selectedMode} />
              <div>
                <h2 className="text-[#00E5FF] text-sm font-bold tracking-[0.25em] glow-cyan">
                  NEXIS CORE // EMBLEM & LOADER LAB
                </h2>
                <p className="text-[#5A7A9A] text-[10px] tracking-widest mt-0.5">
                  WORKSPACE LOGO & ANIMATED TELEMETRY SUITE
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#5A7A9A] hover:text-[#FF0055] font-mono text-base font-bold transition-colors px-2 py-1"
            >
              ✕
            </button>
          </div>

          {/* View Type Toggle (Emblem vs Full Banner) */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#03070D] border border-[#112233]">
            <span className="text-[10px] font-mono text-[#5A7A9A] tracking-widest">
              ASSET FORMAT:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setViewType("emblem")}
                className={`px-3 py-1 text-[10px] font-mono font-bold tracking-widest border transition-all ${
                  viewType === "emblem"
                    ? "border-[#00E5FF] bg-[#00E5FF]/15 text-[#00E5FF]"
                    : "border-[#112233] text-[#5A7A9A] hover:text-[#E0F0FF]"
                }`}
              >
                ◈ RADAR EMBLEM
              </button>
              <button
                onClick={() => setViewType("banner")}
                className={`px-3 py-1 text-[10px] font-mono font-bold tracking-widest border transition-all ${
                  viewType === "banner"
                    ? "border-[#00E5FF] bg-[#00E5FF]/15 text-[#00E5FF]"
                    : "border-[#112233] text-[#5A7A9A] hover:text-[#E0F0FF]"
                }`}
              >
                ⬡ FULL BRAND BANNER
              </button>
            </div>
          </div>

          {/* Interactive Live Hero Showcase */}
          <div className="flex flex-col items-center justify-center py-6 px-4 bg-[#03070D] border border-[#112233] relative overflow-hidden min-h-[190px]">
            <span className="absolute top-2 left-2 text-[9px] font-mono text-[#2A4A6A] tracking-widest">
              LIVE_VIEWPORT // {selectedMode.toUpperCase()} // {selectedAccent.toUpperCase()}
            </span>

            <NexisLogo
              size={selectedSize}
              accent={selectedAccent}
              mode={selectedMode}
              useBanner={viewType === "banner"}
              showLabel={viewType === "emblem"}
              labelPosition="bottom"
              statusText={
                selectedMode === "loading"
                  ? "SYSTEM.SYNCHRONIZING [ 84% ]"
                  : selectedMode === "error"
                  ? "CRITICAL PURGE IN PROGRESS"
                  : "SYSTEM STATUS: OPERATIONAL"
              }
              interactive
            />
          </div>

          {/* Configuration Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Mode selection */}
            <CyberCard accent={selectedAccent} title="OPERATIONAL MODE">
              <div className="flex flex-col gap-1.5 mt-1">
                {(["idle", "loading", "error"] as NexisLogoMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSelectedMode(mode)}
                    className={`px-2 py-1 text-left font-mono text-[10px] tracking-wider uppercase border transition-all ${
                      selectedMode === mode
                        ? "border-[#00E5FF] bg-[#00E5FF]/10 text-[#00E5FF] font-bold"
                        : "border-[#112233] text-[#5A7A9A] hover:border-[#1A3A5A]"
                    }`}
                  >
                    {mode === "loading" ? "⚡ Loading (Counter-Spin)" : mode === "idle" ? "◉ Idle (Ambient)" : "⚠ Error / Purge"}
                  </button>
                ))}
              </div>
            </CyberCard>

            {/* Accent theme selection */}
            <CyberCard accent={selectedAccent} title="COLOR SPECTRUM">
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                {(["cyan", "green", "magenta", "yellow"] as NexisLogoAccent[]).map((acc) => (
                  <button
                    key={acc}
                    onClick={() => setSelectedAccent(acc)}
                    className={`px-2 py-1 text-center font-mono text-[10px] tracking-wider uppercase border transition-all ${
                      selectedAccent === acc
                        ? "border-[#00E5FF] bg-[#00E5FF]/10 text-[#E0F0FF] font-bold"
                        : "border-[#112233] text-[#5A7A9A] hover:border-[#1A3A5A]"
                    }`}
                  >
                    {acc}
                  </button>
                ))}
              </div>
            </CyberCard>

            {/* Size scale */}
            <CyberCard accent={selectedAccent} title="SCALE PRESET">
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(["xs", "sm", "md", "lg", "xl"] as NexisLogoSize[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`flex-1 py-1 text-center font-mono text-[10px] tracking-wider uppercase border transition-all ${
                      selectedSize === s
                        ? "border-[#00E5FF] bg-[#00E5FF]/10 text-[#00E5FF] font-bold"
                        : "border-[#112233] text-[#5A7A9A] hover:border-[#1A3A5A]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </CyberCard>
          </div>

          {/* Process Telemetry Example Card */}
          <CyberCard title="INLINE PROCESS LOADER INTEGRATION" accent={selectedAccent}>
            <NexisLoader
              size="md"
              accent={selectedAccent}
              title="TELEMETRY INGESTION PIPELINE"
              subtitle="AGGREGATING HIGH-FREQUENCY TIME-SERIES METRICS..."
              processSteps={[
                "DISPATCHING RPC PAYLOAD TO DISTRIBUTED NODES...",
                "VERIFYING SHA-256 INTEGRITY CHECKSUMS...",
                "RECOMPUTING CYCLOMATIC GRAPHS & TAINT SINKS...",
                "FLUSHING EVENT INGRESS BUFFER...",
              ]}
            />
          </CyberCard>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-[#112233]">
            <CyberButton
              accent={selectedAccent}
              size="sm"
              onClick={() => setShowOverlayLoader(true)}
            >
              ⛶ TRIGGER FULLSCREEN OVERLAY LOADER
            </CyberButton>

            <CyberButton
              accent="cyan"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              CLOSE LAB
            </CyberButton>
          </div>
        </div>
      </div>

      {/* Simulated Fullscreen System Overlay Loader */}
      {showOverlayLoader && (
        <NexisOverlayLoader
          visible={showOverlayLoader}
          accent={selectedAccent}
          title="NEXIS CORE // GLOBAL SYNCHRONIZATION"
          subtitle="COMMENCING FULL-SYSTEM CRYPTOGRAPHIC TELEMETRY PURGE..."
          onCancel={() => setShowOverlayLoader(false)}
        />
      )}
    </>
  );
}
