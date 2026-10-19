"use client";

import React, { useState } from "react";
import Image from "next/image";

export type NexisLogoSize = "xs" | "sm" | "md" | "lg" | "xl" | number;
export type NexisLogoAccent = "cyan" | "green" | "magenta" | "yellow";
export type NexisLogoMode = "idle" | "loading" | "active" | "error" | "success";

export interface NexisLogoProps {
  /** Size preset or pixel dimension for the emblem */
  size?: NexisLogoSize;
  /** Primary accent color theme */
  accent?: NexisLogoAccent;
  /** Operational animation mode */
  mode?: NexisLogoMode;
  /** Whether to show text branding alongside the emblem */
  showLabel?: boolean;
  /** Position of the label ("right" or "bottom") */
  labelPosition?: "right" | "bottom";
  /** If true, renders the complete widescreen banner logo with typography */
  useBanner?: boolean;
  /** Custom status or loading telemetry string under the logo */
  statusText?: string;
  /** Interactive hover effects */
  interactive?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

const SIZE_MAP: Record<string, number> = {
  xs: 22,
  sm: 32,
  md: 48,
  lg: 76,
  xl: 120,
};

const ACCENT_COLORS: Record<
  NexisLogoAccent,
  {
    primary: string;
    secondary: string;
    glow: string;
    text: string;
  }
> = {
  cyan: {
    primary: "#00E5FF",
    secondary: "#00FF66",
    glow: "rgba(0, 229, 255, 0.55)",
    text: "text-[#00E5FF]",
  },
  green: {
    primary: "#00FF66",
    secondary: "#00E5FF",
    glow: "rgba(0, 255, 102, 0.55)",
    text: "text-[#00FF66]",
  },
  magenta: {
    primary: "#FF0055",
    secondary: "#FFD600",
    glow: "rgba(255, 0, 85, 0.55)",
    text: "text-[#FF0055]",
  },
  yellow: {
    primary: "#FFD600",
    secondary: "#00E5FF",
    glow: "rgba(255, 214, 0, 0.55)",
    text: "text-[#FFD600]",
  },
};

export default function NexisLogo({
  size = "md",
  accent = "cyan",
  mode = "idle",
  showLabel = false,
  labelPosition = "right",
  useBanner = false,
  statusText,
  interactive = false,
  className = "",
  onClick,
}: NexisLogoProps) {
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size] ?? 48;
  const colors = ACCENT_COLORS[accent] ?? ACCENT_COLORS.cyan;

  const isLoading = mode === "loading";
  const isError = mode === "error";
  const effectivePrimary = isError ? "#FF0055" : colors.primary;

  // Render Full Banner Mode
  if (useBanner) {
    const bannerWidth = pixelSize * 2.8;
    const bannerHeight = bannerWidth * 0.38;

    return (
      <div
        onClick={onClick}
        className={`relative inline-flex flex-col select-none ${
          interactive ? "cursor-pointer group" : ""
        } ${className}`}
        style={{ width: bannerWidth }}
      >
        <div
          className={`relative overflow-hidden transition-all duration-300 ${
            isLoading
              ? "animate-[nexisHeartbeat_1.8s_ease-in-out_infinite]"
              : interactive
              ? "group-hover:scale-105"
              : ""
          }`}
          style={{ height: bannerHeight }}
        >
          {/* Authentic Nexis Banner Image from Workspace */}
          <Image
            src="/nexis-banner.png"
            alt="NEXIS Dev-Ops & AST Radar"
            width={720}
            height={270}
            className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(0,229,255,0.35)]"
            priority
          />

          {/* ECG Laser Scan Beam (Active during loading) */}
          {isLoading && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div
                className="w-1/3 h-full bg-gradient-to-r from-transparent via-[#00FF66]/35 to-transparent 
                           animate-[nexisEcgScan_1.5s_ease-in-out_infinite]"
              />
            </div>
          )}
        </div>

        {statusText && (
          <div className="flex items-center gap-1.5 mt-1 font-mono text-[9px] tracking-widest text-[#5A7A9A]">
            {isLoading && (
              <span
                className="w-1.5 h-1.5 rounded-full animate-ping shrink-0"
                style={{ background: effectivePrimary }}
              />
            )}
            <span className={isLoading ? colors.text : "text-[#5A7A9A]"}>
              {statusText}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Render Emblem Mode
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center select-none ${
        labelPosition === "bottom" ? "flex-col gap-2" : "gap-3"
      } ${interactive ? "cursor-pointer group" : ""} ${className}`}
    >
      {/* Emblem Container with Cybernetic Reticle */}
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: pixelSize, height: pixelSize }}
      >
        {/* 1. Ambient Pulsing Neon Glow Aura */}
        <div
          className={`absolute inset-0 rounded-full blur-md pointer-events-none transition-opacity duration-300 ${
            isLoading
              ? "opacity-80 scale-110"
              : "opacity-40 group-hover:opacity-75"
          }`}
          style={{
            background: `radial-gradient(circle, ${colors.glow} 0%, rgba(0,255,102,0.15) 50%, transparent 70%)`,
          }}
        />

        {/* 2. Outer Rotating Reticle Ring (Clockwise) */}
        <svg
          viewBox="0 0 100 100"
          className={`absolute inset-0 w-full h-full pointer-events-none overflow-visible origin-center ${
            isLoading
              ? "animate-[nexisSpinClockwise_3s_linear_infinite]"
              : "animate-[nexisSpinClockwise_24s_linear_infinite]"
          }`}
        >
          {/* Segmented Calibration Orbit */}
          <circle
            cx="50"
            cy="50"
            r="47"
            fill="none"
            stroke={effectivePrimary}
            strokeWidth="1.2"
            strokeDasharray={isLoading ? "4 6 12 6 24 6" : "6 10 18 10"}
            strokeOpacity={isLoading ? 0.85 : 0.45}
          />
          {/* Orbiting Satellite Data Bit */}
          <circle
            cx="50"
            cy="3"
            r={isLoading ? 2.5 : 1.8}
            fill="#00FF66"
            className="filter drop-shadow-[0_0_6px_#00FF66]"
          />
        </svg>

        {/* 3. Outer Counter-Rotating Hex Gyro */}
        <svg
          viewBox="0 0 100 100"
          className={`absolute inset-0 w-full h-full pointer-events-none overflow-visible origin-center ${
            isLoading
              ? "animate-[nexisSpinCounter_4s_linear_infinite]"
              : "animate-[nexisSpinCounter_32s_linear_infinite]"
          }`}
        >
          <polygon
            points="50,6 88,28 88,72 50,94 12,72 12,28"
            fill="none"
            stroke="#00FF66"
            strokeWidth="0.8"
            strokeDasharray={isLoading ? "8 6" : "14 8"}
            strokeOpacity={isLoading ? 0.65 : 0.25}
          />
        </svg>

        {/* 4. Radar Sweep Beam (Loading Only) */}
        {isLoading && (
          <div className="absolute inset-0 pointer-events-none origin-center animate-[nexisSpinClockwise_1.5s_linear_infinite]">
            <div
              className="w-full h-full"
              style={{
                background:
                  "conic-gradient(from 0deg at 50% 50%, rgba(0, 229, 255, 0.4) 0deg, transparent 60deg, transparent 360deg)",
              }}
            />
          </div>
        )}

        {/* 5. Authentic Workspace Nexis Emblem Image */}
        <div
          className={`relative z-10 w-[86%] h-[86%] flex items-center justify-center transition-all duration-300 ${
            isLoading
              ? "animate-[nexisHeartbeat_1.8s_ease-in-out_infinite]"
              : interactive
              ? "group-hover:scale-110"
              : ""
          }`}
        >
          <Image
            src="/nexis-emblem.png"
            alt="Nexis Emblem"
            width={256}
            height={256}
            className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]"
            priority
          />

          {/* ECG Scan Overlay across the waveform */}
          {isLoading && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-[#00FF66]/40 to-transparent animate-[nexisEcgScan_1.4s_ease-in-out_infinite]" />
            </div>
          )}
        </div>

        {/* 6. Corner HUD Targeting Brackets */}
        <svg
          viewBox="0 0 100 100"
          className={`absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] pointer-events-none overflow-visible ${
            isLoading
              ? "animate-[nexisBracketPulse_1.6s_ease-in-out_infinite]"
              : ""
          }`}
          stroke={effectivePrimary}
          strokeWidth="1.2"
          fill="none"
          opacity={isLoading ? 0.9 : 0.6}
        >
          <path d="M 6 16 L 6 6 L 16 6" />
          <path d="M 84 6 L 94 6 L 94 16" />
          <path d="M 94 84 L 94 94 L 84 94" />
          <path d="M 16 94 L 6 94 L 6 84" />
        </svg>
      </div>

      {/* Optional Branding or Telemetry Label */}
      {(showLabel || statusText) && (
        <div
          className={`flex flex-col leading-none ${
            labelPosition === "bottom"
              ? "items-center text-center"
              : "items-start"
          }`}
        >
          {showLabel && (
            <div className="flex items-center gap-1.5 font-mono tracking-[0.2em] text-xs font-bold">
              <span className="text-[#E0F0FF] glow-cyan">NEXIS</span>
              <span className="text-[#00E5FF] animate-blink font-extrabold">
                _
              </span>
              <span className="text-[#2A4A6A] text-[9px] tracking-widest ml-0.5">
                AST RADAR
              </span>
            </div>
          )}
          {statusText && (
            <div className="flex items-center gap-1.5 mt-1 font-mono text-[9px] tracking-widest text-[#5A7A9A]">
              {isLoading && (
                <span
                  className="w-1.5 h-1.5 rounded-full animate-ping"
                  style={{ background: effectivePrimary }}
                />
              )}
              <span className={isLoading ? colors.text : "text-[#5A7A9A]"}>
                {statusText}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
