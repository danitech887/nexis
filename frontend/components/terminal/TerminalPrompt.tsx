"use client";

import { useState, useRef, KeyboardEvent } from "react";
import CyberButton from "@/components/ui/CyberButton";

interface TerminalPromptProps {
  onCommand?: (cmd: string) => void;
  placeholder?: string;
  prefix?: string;
}

const BUILT_IN_HELP = [
  "grep <pattern>   — filter log stream by regex",
  "clear            — clear terminal output",
  "tail <n>         — show last n lines",
  "level <L>        — filter by level (INFO/WARN/ERROR/DEBUG)",
  "source <svc>     — filter by service name",
  "export           — download current view as .log",
];

export default function TerminalPrompt({
  onCommand,
  placeholder = "enter command…",
  prefix = "nexis:~$",
}: TerminalPromptProps) {
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const cmd = value.trim();
    if (!cmd) return;
    if (cmd === "help") {
      setShowHelp((s) => !s);
    } else {
      onCommand?.(cmd);
    }
    setHistory((h) => [cmd, ...h].slice(0, 50));
    setHistIdx(-1);
    setValue("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { submit(); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(next);
      setValue(history[next] ?? "");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setValue(next === -1 ? "" : history[next]);
    }
    if (e.key === "Escape") { setValue(""); setHistIdx(-1); }
  };

  return (
    <div className="border-t border-[#112233] bg-[#03070D]">
      {/* Help drawer */}
      {showHelp && (
        <div className="px-4 py-2 border-b border-[#112233] bg-[#070D16]">
          <p className="text-[9px] text-[#00E5FF] font-bold tracking-widest mb-1">AVAILABLE COMMANDS</p>
          {BUILT_IN_HELP.map((h) => (
            <p key={h} className="text-[10px] text-[#5A7A9A] font-mono">{h}</p>
          ))}
        </div>
      )}

      {/* Prompt row */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        onClick={() => inputRef.current?.focus()}
      >
        <span className="text-[#00FF66] text-[10px] font-bold shrink-0 select-none">
          {prefix}
        </span>
        <input
          ref={inputRef}
          className="flex-1 bg-transparent border-none outline-none text-[#C0D8F0] text-[11px]
                     font-mono caret-[#00FF66] placeholder:text-[#1A3A5A]"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
        />
        <CyberButton accent="green" size="sm" onClick={submit}>RUN</CyberButton>
        <CyberButton accent="cyan" size="sm" variant="ghost" onClick={() => setShowHelp((s) => !s)}>?</CyberButton>
      </div>
    </div>
  );
}
