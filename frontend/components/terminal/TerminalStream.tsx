"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface LogLine {
  id: number;
  ts: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG" | "TRACE";
  source: string;
  msg: string;
}

const LEVEL_COLORS: Record<LogLine["level"], string> = {
  INFO:  "#00E5FF",
  WARN:  "#FFD600",
  ERROR: "#FF0055",
  DEBUG: "#5A7A9A",
  TRACE: "#2A4A6A",
};

interface TerminalStreamProps {
  lines: LogLine[];
  filter?: string;
  autoScroll?: boolean;
  maxHeight?: string;
}

export default function TerminalStream({
  lines,
  filter = "",
  autoScroll = true,
  maxHeight = "100%",
}: TerminalStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  const filtered = filter
    ? lines.filter(
        (l) =>
          l.msg.toLowerCase().includes(filter.toLowerCase()) ||
          l.source.toLowerCase().includes(filter.toLowerCase()) ||
          l.level.toLowerCase().includes(filter.toLowerCase())
      )
    : lines;

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setUserScrolled(!atBottom);
  }, []);

  useEffect(() => {
    if (autoScroll && !userScrolled) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [filtered, autoScroll, userScrolled]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="w-full overflow-y-auto font-mono text-[11px] leading-relaxed"
      style={{ maxHeight, background: "#03070D" }}
    >
      {filtered.map((line) => (
        <div
          key={line.id}
          className="flex gap-2 px-3 py-0.5 hover:bg-[#070D16] transition-colors group"
        >
          {/* Timestamp */}
          <span className="shrink-0 text-[#2A4A6A] group-hover:text-[#3A5A7A] w-[140px]">
            {line.ts}
          </span>
          {/* Level badge */}
          <span
            className="shrink-0 w-[44px] text-center font-bold text-[9px] tracking-widest"
            style={{ color: LEVEL_COLORS[line.level] }}
          >
            [{line.level}]
          </span>
          {/* Source */}
          <span className="shrink-0 text-[#5A7A9A] w-[120px] truncate">{line.source}</span>
          {/* Message */}
          <span
            className="flex-1 break-all"
            style={{
              color:
                line.level === "ERROR"
                  ? "#FF0055"
                  : line.level === "WARN"
                  ? "#FFD600"
                  : line.level === "DEBUG" || line.level === "TRACE"
                  ? "#2A4A6A"
                  : "#C0D8F0",
            }}
          >
            {line.msg}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
