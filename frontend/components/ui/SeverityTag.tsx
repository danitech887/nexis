import React from "react";

type Severity = "critical" | "high" | "medium" | "low" | "info" | "ok";

interface SeverityTagProps {
  severity: Severity;
  label?: string;
  className?: string;
}

const SEVERITY_STYLES: Record<Severity, { color: string; bg: string; border: string; icon: string }> = {
  critical: { color: "#FF0055", bg: "rgba(255,0,85,0.15)",   border: "rgba(255,0,85,0.4)",   icon: "⬛" },
  high:     { color: "#FF4400", bg: "rgba(255,68,0,0.15)",   border: "rgba(255,68,0,0.4)",   icon: "▲" },
  medium:   { color: "#FFD600", bg: "rgba(255,214,0,0.12)",  border: "rgba(255,214,0,0.4)",  icon: "◆" },
  low:      { color: "#00E5FF", bg: "rgba(0,229,255,0.10)",  border: "rgba(0,229,255,0.35)", icon: "◉" },
  info:     { color: "#5A7A9A", bg: "rgba(90,122,154,0.12)", border: "rgba(90,122,154,0.3)", icon: "◦" },
  ok:       { color: "#00FF66", bg: "rgba(0,255,102,0.10)",  border: "rgba(0,255,102,0.35)", icon: "✓" },
};

const DEFAULT_LABELS: Record<Severity, string> = {
  critical: "CRITICAL",
  high:     "HIGH",
  medium:   "MEDIUM",
  low:      "LOW",
  info:     "INFO",
  ok:       "OK",
};

export default function SeverityTag({
  severity,
  label,
  className = "",
}: SeverityTagProps) {
  const s = SEVERITY_STYLES[severity];
  const displayLabel = label ?? DEFAULT_LABELS[severity];

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase border ${className}`}
      style={{
        color:       s.color,
        background:  s.bg,
        borderColor: s.border,
        textShadow:  `0 0 6px ${s.color}88`,
      }}
    >
      <span aria-hidden className="text-[8px] leading-none">{s.icon}</span>
      {displayLabel}
    </span>
  );
}
