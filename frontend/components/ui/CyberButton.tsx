"use client";

import React from "react";
import { cyberAudio } from "@/lib/cyberAudio";

type Accent = "cyan" | "green" | "magenta" | "yellow";
type Variant = "solid" | "outline" | "ghost";

interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  accent?: Accent;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  glitch?: boolean;
  sound?: boolean;
  children: React.ReactNode;
}

const ACCENT_MAP: Record<Accent, { color: string; glow: string; bg: string; hover: string }> = {
  cyan:    { color: "#00E5FF", glow: "rgba(0,229,255,0.35)",  bg: "rgba(0,229,255,0.12)",  hover: "rgba(0,229,255,0.2)"  },
  green:   { color: "#00FF66", glow: "rgba(0,255,102,0.35)",  bg: "rgba(0,255,102,0.12)",  hover: "rgba(0,255,102,0.2)"  },
  magenta: { color: "#FF0055", glow: "rgba(255,0,85,0.35)",   bg: "rgba(255,0,85,0.12)",   hover: "rgba(255,0,85,0.2)"   },
  yellow:  { color: "#FFD600", glow: "rgba(255,214,0,0.35)",  bg: "rgba(255,214,0,0.12)",  hover: "rgba(255,214,0,0.2)"  },
};

const SIZE_CLASSES: Record<string, string> = {
  sm: "px-2.5 py-1 text-[10px]",
  md: "px-4 py-1.5 text-xs",
  lg: "px-6 py-2.5 text-sm",
};

export default function CyberButton({
  accent = "cyan",
  variant = "outline",
  size = "md",
  glitch = false,
  sound = true,
  children,
  className = "",
  onClick,
  ...props
}: CyberButtonProps) {
  const a = ACCENT_MAP[accent];

  const baseStyle: React.CSSProperties = {
    color: a.color,
    borderColor: variant === "ghost" ? "transparent" : a.color,
    background: variant === "solid" ? a.color : variant === "outline" ? a.bg : "transparent",
    boxShadow: variant !== "ghost" ? `0 0 8px ${a.glow}` : undefined,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.1em",
    position: "relative",
    overflow: "hidden",
    transition: "all 0.15s ease",
  };

  if (variant === "solid") {
    baseStyle.color = "#03070D";
    baseStyle.fontWeight = "bold";
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (sound && !props.disabled) {
      cyberAudio.cyberClick();
    }
    onClick?.(e);
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-1.5 font-bold tracking-widest
        border uppercase cursor-pointer select-none
        active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
        ${SIZE_CLASSES[size]}
        ${glitch ? "hover:[animation:glitch_0.3s_steps(1)_infinite]" : ""}
        ${className}
      `}
      style={baseStyle}
      onClick={handleClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          variant === "solid" ? a.color : a.hover;
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          `0 0 16px ${a.glow}, 0 0 4px ${a.color}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          variant === "solid" ? a.color : variant === "outline" ? a.bg : "transparent";
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          variant !== "ghost" ? `0 0 8px ${a.glow}` : "";
      }}
      {...props}
    >
      {children}
    </button>
  );
}
