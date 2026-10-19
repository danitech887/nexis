import React from "react";

type Accent = "cyan" | "green" | "magenta" | "yellow";

interface CyberCardProps {
  title?: string;
  subtitle?: string;
  accent?: Accent;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  scanline?: boolean;
}

const ACCENT_MAP: Record<Accent, { color: string; glow: string; bg: string }> = {
  cyan:    { color: "#00E5FF", glow: "rgba(0,229,255,0.15)",  bg: "rgba(0,229,255,0.04)"  },
  green:   { color: "#00FF66", glow: "rgba(0,255,102,0.15)",  bg: "rgba(0,255,102,0.04)"  },
  magenta: { color: "#FF0055", glow: "rgba(255,0,85,0.15)",   bg: "rgba(255,0,85,0.04)"   },
  yellow:  { color: "#FFD600", glow: "rgba(255,214,0,0.15)",  bg: "rgba(255,214,0,0.04)"  },
};

export default function CyberCard({
  title,
  subtitle,
  accent = "cyan",
  headerRight,
  children,
  className = "",
  noPadding = false,
  scanline = false,
}: CyberCardProps) {
  const a = ACCENT_MAP[accent];

  return (
    <div
      className={`relative flex flex-col border bg-[#070D16] ${scanline ? "crt-scan" : ""} ${className}`}
      style={{
        borderColor: `${a.color}22`,
        boxShadow: `0 0 16px ${a.glow}, inset 0 0 24px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Corner accents */}
      <span
        className="absolute top-0 left-0 w-2 h-2 border-t border-l"
        style={{ borderColor: a.color }}
        aria-hidden
      />
      <span
        className="absolute bottom-0 right-0 w-2 h-2 border-b border-r"
        style={{ borderColor: a.color }}
        aria-hidden
      />

      {/* Header */}
      {(title || headerRight) && (
        <div
          className="flex items-center justify-between px-3 py-2 border-b shrink-0"
          style={{
            borderColor: `${a.color}22`,
            background: `${a.bg}`,
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-1 h-4 shrink-0"
              style={{ background: a.color, boxShadow: `0 0 6px ${a.color}` }}
              aria-hidden
            />
            <div>
              {title && (
                <span
                  className="text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: a.color }}
                >
                  {title}
                </span>
              )}
              {subtitle && (
                <span className="ml-2 text-[9px] text-[#2A4A6A] tracking-wider">
                  {subtitle}
                </span>
              )}
            </div>
          </div>
          {headerRight && (
            <div className="flex items-center gap-2">{headerRight}</div>
          )}
        </div>
      )}

      {/* Body */}
      <div className={`flex-1 min-h-0 ${noPadding ? "" : "p-3"}`}>
        {children}
      </div>
    </div>
  );
}
