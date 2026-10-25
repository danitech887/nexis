"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import VitalsBadge from "./VitalsBadge";
import NexisLogo from "@/components/ui/NexisLogo";
import NexisProcessModal from "@/components/ui/NexisProcessModal";
import CyberAudioControl from "./CyberAudioControl";
import { useActiveSoftware } from "@/lib/ActiveSoftwareContext";

export function Topbar() {
  const [time, setTime] = useState<string>("");
  const [uptime, setUptime] = useState(0);
  const [isLabOpen, setIsLabOpen] = useState(false);
  const [isSoftwareDropdownOpen, setIsSoftwareDropdownOpen] = useState(false);

  const { activeSoftware, setActiveSoftwareId, fleet } = useActiveSoftware();

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toISOString().replace("T", " ").slice(0, 19) + " UTC");
      setUptime((s) => s + 1);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const uptimeStr = (() => {
    const h = Math.floor(uptime / 3600).toString().padStart(2, "0");
    const m = Math.floor((uptime % 3600) / 60).toString().padStart(2, "0");
    const s = (uptime % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  })();

  return (
    <>
      <header className="h-10 shrink-0 flex items-center px-4 gap-4
                         bg-[#070D16] border-b border-[#112233] relative z-20 select-none">
        {/* Brand with animated Nexis Emblem (clickable to open Lab) */}
        <div
          onClick={() => setIsLabOpen(true)}
          className="flex items-center gap-2.5 mr-4 cursor-pointer group"
          title="Click to open Nexis Emblem & Loader Lab"
        >
          <NexisLogo size={24} accent="cyan" mode="idle" interactive />
          <div className="flex items-center font-bold tracking-[0.25em] text-sm leading-none">
            <span className="text-[#E0F0FF] glow-cyan group-hover:text-white transition-colors">
              NEXIS
            </span>
            <span className="text-[#00E5FF] font-extrabold animate-blink">_</span>
          </div>
        </div>

        {/* Fleet Control Navigation Button */}
        <Link
          href="/projects"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold text-[#00FF66] bg-[#00FF66]/10 border border-[#00FF66]/40 hover:bg-[#00FF66] hover:text-[#03070D] transition-all shadow-[0_0_10px_rgba(0,255,102,0.15)] cursor-pointer"
          title="Return to Software Fleet Control Panel"
        >
          <span>⊞</span>
          <span>FLEET CONTROL</span>
        </Link>

        <div className="h-4 w-px bg-[#112233]" />

        {/* Global Active Software Selector */}
        <div className="relative font-mono">
          <button
            onClick={() => setIsSoftwareDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-2.5 py-1 text-xs text-[#00E5FF] bg-[#03070D] border border-[#00E5FF]/40 hover:border-[#00E5FF] transition-all"
            title="Click to switch active monitored software"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                activeSoftware?.vitals === "OK"
                  ? "bg-[#00FF66] shadow-[0_0_6px_#00FF66]"
                  : "bg-[#FFD600] animate-pulse shadow-[0_0_6px_#FFD600]"
              }`}
            />
            <span className="text-[#5A7A9A] text-[10px]">ACTIVE TARGET:</span>
            <span className="text-white font-bold">{activeSoftware?.name || "ShuleBase"}</span>
            <span className="text-[#00E5FF] text-[10px]">▾</span>
          </button>

          {/* Switcher Dropdown */}
          {isSoftwareDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-[#070D16] border border-[#00E5FF]/60 shadow-[0_6px_24px_rgba(0,0,0,0.8)] z-50 divide-y divide-[#112233] text-xs">
              <div className="px-3 py-1.5 bg-[#050B13] text-[9px] text-[#5A7A9A] tracking-wider uppercase flex items-center justify-between">
                <span>SELECT SOFTWARE TO MONITOR</span>
                <span className="text-[#00FF66]">{fleet.length} ENROLLED</span>
              </div>
              {fleet.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveSoftwareId(p.id);
                    setIsSoftwareDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#0A1624] transition-colors ${
                    p.id === activeSoftware.id
                      ? "text-[#00FF66] bg-[#00FF66]/10 font-bold"
                      : "text-[#C0D8F0]"
                  }`}
                >
                  <div className="truncate">
                    <p className="truncate font-bold">{p.name}</p>
                    <span className="text-[10px] text-[#5A7A9A]">{p.platform}</span>
                  </div>
                  <span
                    className={`text-[9px] px-1 py-0.5 border ${
                      p.vitals === "OK"
                        ? "text-[#00FF66] border-[#00FF66]/40"
                        : "text-[#FFD600] border-[#FFD600]/40"
                    }`}
                  >
                    {p.vitals}
                  </span>
                </button>
              ))}
              <div className="p-2 bg-[#050B13]">
                <Link
                  href="/projects"
                  onClick={() => setIsSoftwareDropdownOpen(false)}
                  className="block text-center py-1 text-[10px] text-[#00FF66] hover:underline font-bold"
                >
                  ⊞ Open Fleet Control Room →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Platform Pill */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-[#5A7A9A]">
          <span>PLATFORM:</span>
          <span className="text-[#00FF66] font-bold">{activeSoftware.platform}</span>
        </div>

        <div className="h-4 w-px bg-[#112233] hidden md:block" />

        {/* Live Scoped Telemetry Pills */}
        <div className="hidden md:flex items-center gap-2 font-mono text-[10px]">
          <span
            className={`px-1.5 py-0.5 border ${
              activeSoftware.errorCount > 20
                ? "text-[#FF0055] border-[#FF0055]/40 bg-[#FF0055]/10 animate-pulse font-bold"
                : "text-[#FFD600] border-[#FFD600]/30 bg-[#FFD600]/10"
            }`}
          >
            ERRORS: {activeSoftware.errorCount} {activeSoftware.hasSpike && "(SPIKE!)"}
          </span>
          <span className="px-1.5 py-0.5 text-[#00E5FF] border border-[#00E5FF]/30 bg-[#00E5FF]/10 font-bold">
            SAST: {activeSoftware.sastGrade}
          </span>
          <span className="px-1.5 py-0.5 text-[#00FF66] border border-[#00FF66]/30 bg-[#00FF66]/10 font-bold">
            HEALTH: {activeSoftware.healthScore}%
          </span>
        </div>

        {/* Lab Shortcut Button */}
        <button
          onClick={() => setIsLabOpen(true)}
          className="px-2 py-0.5 border border-[#00E5FF]/40 text-[#00E5FF] hover:bg-[#00E5FF]/10 text-[9px] font-mono tracking-widest font-bold transition-all ml-2 flex items-center gap-1 cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-ping" />
          EMBLEM LAB
        </button>

        {/* Cyberpunk Audio HUD */}
        <CyberAudioControl />

      {/* Spacer */}
      <div className="ml-auto flex items-center gap-4 text-xs text-[#2A4A6A]">
        <div className="flex items-center gap-1">
          <span className="text-[#5A7A9A]">UPTIME</span>
          <span className="text-[#00FF66] font-bold">{uptimeStr}</span>
        </div>
        <div className="h-4 w-px bg-[#112233]" />
        <div className="flex items-center gap-1">
          <span className="text-[#00E5FF] animate-blink">█</span>
          <span className="text-[#5A7A9A]">{time}</span>
        </div>
      </div>
    </header>

    {/* Interactive Emblem & Loader Laboratory */}
    <NexisProcessModal isOpen={isLabOpen} onClose={() => setIsLabOpen(false)} />
  </>
);
}

