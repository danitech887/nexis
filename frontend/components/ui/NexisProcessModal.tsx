"use client";

import React, { useState } from "react";
import NexisLogo, { NexisLogoAccent, NexisLogoMode, NexisLogoSize } from "./NexisLogo";
import NexisLoader, { NexisOverlayLoader } from "./NexisLoader";
import CyberButton from "./CyberButton";
import CyberCard from "./CyberCard";
import { cyberAudio } from "@/lib/cyberAudio";

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
  const [isLoopingProcessing, setIsLoopingProcessing] = useState(false);

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

          {/* Cyberpunk Audio Synthesizer & Sound FX Matrix */}
          <CyberCard title="CYBERPUNK AUDIO SYNTHESIZER & SOUND FX MATRIX" accent="cyan">
            <div className="flex flex-col gap-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-[#5A7A9A]">
                  Zero-latency Web Audio procedural synthesis engine powering telemetry logs, error alarms, and neural processing loops.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const next = cyberAudio.toggleMute();
                    setSelectedAccent(next ? "magenta" : "cyan");
                  }}
                  className={`px-2.5 py-1 text-[10px] border font-bold tracking-wider transition-all cursor-pointer ${
                    cyberAudio.getMuted()
                      ? "border-[#FF0055] bg-[#FF0055]/15 text-[#FF0055]"
                      : "border-[#00FF66] bg-[#00FF66]/15 text-[#00FF66]"
                  }`}
                >
                  {cyberAudio.getMuted() ? "🔇 AUDIO MUTED" : "🔊 AUDIO LIVE"}
                </button>
              </div>

              {/* Soundboard Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => cyberAudio.terminalKey()}
                  className="px-3 py-2 text-left border border-[#112233] bg-[#03070D] hover:border-[#00E5FF] hover:bg-[#00E5FF]/10 text-[#C0D8F0] hover:text-[#00E5FF] transition-all cursor-pointer group"
                >
                  <div className="text-[10px] font-bold">⌨ HACKER KEYSTROKE</div>
                  <div className="text-[9px] text-[#5A7A9A] group-hover:text-[#A0D0FF]">Terminal chatter / mechanical tap</div>
                </button>

                <button
                  type="button"
                  onClick={() => cyberAudio.logBurst()}
                  className="px-3 py-2 text-left border border-[#112233] bg-[#03070D] hover:border-[#00FF66] hover:bg-[#00FF66]/10 text-[#C0D8F0] hover:text-[#00FF66] transition-all cursor-pointer group"
                >
                  <div className="text-[10px] font-bold text-[#00FF66]">📡 LOG PACKET BURST</div>
                  <div className="text-[9px] text-[#5A7A9A] group-hover:text-[#A0FFA0]">High-freq telemetry stream arrival</div>
                </button>

                <button
                  type="button"
                  onClick={() => cyberAudio.errorDetected()}
                  className="px-3 py-2 text-left border border-[#112233] bg-[#03070D] hover:border-[#FFD600] hover:bg-[#FFD600]/10 text-[#C0D8F0] hover:text-[#FFD600] transition-all cursor-pointer group"
                >
                  <div className="text-[10px] font-bold text-[#FFD600]">⚠ ERROR IDENTIFICATION</div>
                  <div className="text-[9px] text-[#5A7A9A] group-hover:text-[#FFE0A0]">Dissonant glitch drop alert</div>
                </button>

                <button
                  type="button"
                  onClick={() => cyberAudio.threatAlert()}
                  className="px-3 py-2 text-left border border-[#112233] bg-[#03070D] hover:border-[#FF0055] hover:bg-[#FF0055]/10 text-[#C0D8F0] hover:text-[#FF0055] transition-all cursor-pointer group"
                >
                  <div className="text-[10px] font-bold text-[#FF0055]">🚨 CRITICAL THREAT ALARM</div>
                  <div className="text-[9px] text-[#5A7A9A] group-hover:text-[#FFA0B0]">Pulsed intrusion / fatal crash siren</div>
                </button>

                <button
                  type="button"
                  onClick={() => cyberAudio.dataBurst()}
                  className="px-3 py-2 text-left border border-[#112233] bg-[#03070D] hover:border-[#00E5FF] hover:bg-[#00E5FF]/10 text-[#C0D8F0] hover:text-[#00E5FF] transition-all cursor-pointer group"
                >
                  <div className="text-[10px] font-bold text-[#00E5FF]">📡 DATA BURST</div>
                  <div className="text-[9px] text-[#5A7A9A] group-hover:text-[#A0D0FF]">
                    High-speed electronic packet sweep
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => cyberAudio.scanSweep()}
                  className="px-3 py-2 text-left border border-[#112233] bg-[#03070D] hover:border-[#00E5FF] hover:bg-[#00E5FF]/10 text-[#C0D8F0] hover:text-[#00E5FF] transition-all cursor-pointer group"
                >
                  <div className="text-[10px] font-bold">🔍 TARGET SCAN / LOCK</div>
                  <div className="text-[9px] text-[#5A7A9A] group-hover:text-[#A0D0FF]">Radar sweep & AST node focus</div>
                </button>

                <button
                  type="button"
                  onClick={() => cyberAudio.patchApplied()}
                  className="px-3 py-2 text-left border border-[#112233] bg-[#03070D] hover:border-[#00FF66] hover:bg-[#00FF66]/10 text-[#C0D8F0] hover:text-[#00FF66] transition-all cursor-pointer group"
                >
                  <div className="text-[10px] font-bold text-[#00FF66]">✦ PATCH DEPLOY / RESOLVE</div>
                  <div className="text-[9px] text-[#5A7A9A] group-hover:text-[#A0FFA0]">Ascending cyber triad resolve</div>
                </button>

                <button
                  type="button"
                  onClick={() => cyberAudio.glitch()}
                  className="px-3 py-2 text-left border border-[#112233] bg-[#03070D] hover:border-[#FF0055] hover:bg-[#FF0055]/10 text-[#C0D8F0] hover:text-[#FF0055] transition-all cursor-pointer group"
                >
                  <div className="text-[10px] font-bold text-[#FF88A0]">⚡ SIGNAL GLITCH</div>
                  <div className="text-[9px] text-[#5A7A9A] group-hover:text-[#FFA0B0]">Interference burst & purge drop</div>
                </button>

                <button
                  type="button"
                  onClick={() => cyberAudio.powerUp()}
                  className="px-3 py-2 text-left border border-[#112233] bg-[#03070D] hover:border-[#00E5FF] hover:bg-[#00E5FF]/10 text-[#C0D8F0] hover:text-[#00E5FF] transition-all cursor-pointer group"
                >
                  <div className="text-[10px] font-bold text-[#00E5FF]">☢ REACTOR POWER-UP</div>
                  <div className="text-[9px] text-[#5A7A9A] group-hover:text-[#A0D0FF]">Subharmonic spin-up sweep</div>
                </button>
              </div>
            </div>
          </CyberCard>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-[#112233]">
            <CyberButton
              accent={selectedAccent}
              size="sm"
              onClick={() => {
                cyberAudio.powerUp();
                setShowOverlayLoader(true);
              }}
            >
              ⛶ TRIGGER FULLSCREEN OVERLAY LOADER
            </CyberButton>

            <CyberButton
              accent="cyan"
              variant="outline"
              size="sm"
              onClick={() => {
                cyberAudio.cyberClick();
                if (isLoopingProcessing) {
                  cyberAudio.stopProcessing();
                  setIsLoopingProcessing(false);
                }
                onClose();
              }}
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
