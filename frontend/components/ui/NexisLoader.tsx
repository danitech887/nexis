"use client";

import React, { useEffect, useState } from "react";
import NexisLogo, { NexisLogoAccent, NexisLogoSize } from "./NexisLogo";

export interface NexisLoaderProps {
  /** Size of the animated logo */
  size?: NexisLogoSize;
  /** Primary accent color */
  accent?: NexisLogoAccent;
  /** Primary title or process name */
  title?: string;
  /** Dynamic or custom status subtitle */
  subtitle?: string;
  /** Array of step messages to cycle through */
  processSteps?: string[];
  /** Whether to show a progress percentage (indeterminate or controlled 0-100) */
  progress?: number;
  /** Indeterminate animated cyber bar */
  indeterminate?: boolean;
  /** Compact inline presentation */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const DEFAULT_STEPS = [
  "INITIALIZING_NEXIS_SUBSYSTEM...",
  "SYNCHRONIZING_TELEMETRY_PIPELINE...",
  "PARSING_AST_DEPENDENCY_GRAPH...",
  "VERIFYING_CRYPTOGRAPHIC_PAYLOAD...",
  "ESTABLISHING_SECURE_RPC_TUNNEL...",
  "STREAMING_NEXIS_VITALS...",
];

export default function NexisLoader({
  size = "lg",
  accent = "cyan",
  title = "PROCESSING PIPELINE",
  subtitle,
  processSteps = DEFAULT_STEPS,
  progress,
  indeterminate = true,
  compact = false,
  className = "",
}: NexisLoaderProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [fakeHex, setFakeHex] = useState("0x00000000");

  useEffect(() => {
    if (!processSteps || processSteps.length <= 1) return;
    const interval = setInterval(() => {
      setStepIdx((prev) => (prev + 1) % processSteps.length);
      setFakeHex("0x" + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0").toUpperCase());
    }, 1800);
    return () => clearInterval(interval);
  }, [processSteps]);

  const activeMessage = subtitle || processSteps[stepIdx] || "EXECUTING...";

  const ACCENT_TEXT: Record<NexisLogoAccent, string> = {
    cyan: "text-[#00E5FF]",
    green: "text-[#00FF66]",
    magenta: "text-[#FF0055]",
    yellow: "text-[#FFD600]",
  };

  const ACCENT_BORDER: Record<NexisLogoAccent, string> = {
    cyan: "border-[#00E5FF]/30",
    green: "border-[#00FF66]/30",
    magenta: "border-[#FF0055]/30",
    yellow: "border-[#FFD600]/30",
  };

  const ACCENT_BG: Record<NexisLogoAccent, string> = {
    cyan: "bg-[#00E5FF]",
    green: "bg-[#00FF66]",
    magenta: "bg-[#FF0055]",
    yellow: "bg-[#FFD600]",
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 font-mono ${className}`}>
        <NexisLogo size={size || "sm"} accent={accent} mode="loading" />
        <div className="flex flex-col text-left">
          <span className={`text-[10px] font-bold tracking-widest ${ACCENT_TEXT[accent]}`}>
            {title}
          </span>
          <span className="text-[9px] text-[#5A7A9A] tracking-wider truncate max-w-[160px]">
            {activeMessage}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center p-6 bg-[#070D16]/90 border border-[#112233] 
                 shadow-[0_0_24px_rgba(3,7,13,0.8)] backdrop-blur-sm select-none ${className}`}
    >
      {/* Corner HUD Reticle Accents */}
      <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-[#00E5FF]" />
      <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-[#00E5FF]" />
      <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-[#00E5FF]" />
      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-[#00E5FF]" />

      {/* Top Telemetry Header Bar */}
      <div className="w-full flex items-center justify-between text-[8px] font-mono tracking-widest text-[#2A4A6A] border-b border-[#112233] pb-2 mb-4">
        <span>NEXIS // RADAR_ENGINE</span>
        <span className="font-bold text-[#5A7A9A]">{fakeHex}</span>
        <span className={ACCENT_TEXT[accent]}>[SYS_BUSY]</span>
      </div>

      {/* Central Animated Nexis Vector Logo */}
      <div className="my-2">
        <NexisLogo size={size} accent={accent} mode="loading" />
      </div>

      {/* Process Title */}
      <h3 className={`mt-3 font-mono font-bold tracking-[0.25em] text-xs ${ACCENT_TEXT[accent]}`}>
        {title}
      </h3>

      {/* Active Step Telemetry readout */}
      <p className="mt-1 font-mono text-[10px] text-[#5A7A9A] tracking-widest text-center min-h-[1.5em] flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 bg-[#00E5FF] animate-blink" />
        {activeMessage}
      </p>

      {/* Cyber Progress Indicator Bar */}
      <div className="w-48 max-w-full mt-4 flex flex-col gap-1">
        <div className="h-1.5 w-full bg-[#03070D] border border-[#112233] relative overflow-hidden">
          {progress !== undefined ? (
            <div
              className={`h-full transition-all duration-300 ${ACCENT_BG[accent]}`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          ) : indeterminate ? (
            <div
              className={`h-full w-2/5 ${ACCENT_BG[accent]} animate-[nexisIndeterminateScan_1.8s_ease-in-out_infinite]`}
            />
          ) : null}
        </div>

        {/* Numeric progress or memory block readout */}
        <div className="flex justify-between items-center text-[8px] font-mono text-[#2A4A6A]">
          <span>ALLOC: 64.2 MB</span>
          <span>{progress !== undefined ? `${Math.round(progress)}%` : "STREAMING"}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Fullscreen or section modal overlay with high-tech backdrop
 */
export function NexisOverlayLoader({
  visible = true,
  title = "SYSTEM INITIALIZING",
  subtitle = "SYNCHRONIZING WITH CLUSTER NODES...",
  accent = "cyan",
  onCancel,
}: {
  visible?: boolean;
  title?: string;
  subtitle?: string;
  accent?: NexisLogoAccent;
  onCancel?: () => void;
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#03070D]/85 backdrop-blur-md p-4 animate-fadeinup">
      {/* Background cyber grid */}
      <div className="absolute inset-0 cyber-grid-bg opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <NexisLoader
          size="xl"
          accent={accent}
          title={title}
          subtitle={subtitle}
          className="border-2 border-[#112233]"
        />

        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full mt-2 py-1.5 border border-[#FF0055]/40 text-[#FF0055] hover:bg-[#FF0055]/10 
                       font-mono text-[10px] font-bold tracking-widest transition-colors"
          >
            ⊗ ABORT PROCESS
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Page-level loader placeholder (used in Next.js loading.tsx or card loading states)
 */
export function NexisPageLoader({
  title = "LOADING NEXIS TELEMETRY...",
  accent = "cyan",
}: {
  title?: string;
  accent?: NexisLogoAccent;
}) {
  return (
    <div className="h-full w-full flex items-center justify-center p-6 bg-[#03070D]/50">
      <NexisLoader
        size="lg"
        accent={accent}
        title={title}
        className="w-80 max-w-full"
      />
    </div>
  );
}
