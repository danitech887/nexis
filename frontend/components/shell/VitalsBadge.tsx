import React from "react";

type Status = "online" | "warn" | "error" | "idle";
type Accent = "cyan" | "green" | "magenta" | "yellow";

interface VitalsBadgeProps {
  status: Status;
  label: string;
  accent?: Accent;
  pulse?: boolean;
  className?: string;
}

const ACCENT_COLOR: Record<Accent, string> = {
  cyan:    "#00E5FF",
  green:   "#00FF66",
  magenta: "#FF0055",
  yellow:  "#FFD600",
};

const STATUS_COLOR: Record<Status, string> = {
  online: "#00FF66",
  warn:   "#FFD600",
  error:  "#FF0055",
  idle:   "#2A4A6A",
};

const STATUS_LABEL: Record<Status, string> = {
  online: "ON",
  warn:   "WARN",
  error:  "ERR",
  idle:   "IDLE",
};

export default function VitalsBadge({
  status,
  label,
  accent = "cyan",
  pulse = true,
  className = "",
}: VitalsBadgeProps) {
  const dotColor = STATUS_COLOR[status];
  const accentColor = ACCENT_COLOR[accent];

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-bold tracking-wider ${className}`}
      style={{
        borderColor: `${accentColor}33`,
        background:  `${accentColor}0D`,
        color:       accentColor,
      }}
    >
      {/* Pulsing dot */}
      <span
        className="relative flex h-1.5 w-1.5 shrink-0"
        aria-hidden="true"
      >
        {pulse && status !== "idle" && (
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
            style={{ background: dotColor }}
          />
        )}
        <span
          className="relative inline-flex h-1.5 w-1.5 rounded-full"
          style={{ background: dotColor }}
        />
      </span>
      {label}
      <span style={{ color: dotColor, opacity: 0.7 }} className="font-normal">
        {STATUS_LABEL[status]}
      </span>
    </span>
  );
}
