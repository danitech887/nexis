"use client";

import React, { useState, useEffect, useRef } from "react";
import { cyberAudio, CyberSoundCue } from "@/lib/cyberAudio";

export default function CyberAudioControl() {
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMuted(cyberAudio.getMuted());
    setVolume(cyberAudio.getVolume());

    const unsubscribe = cyberAudio.subscribe(() => {
      setMuted(cyberAudio.getMuted());
      setVolume(cyberAudio.getVolume());
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    cyberAudio.toggleMute();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    cyberAudio.setVolume(val);
    if (muted) cyberAudio.setMuted(false);
  };

  const triggerTest = (cue: CyberSoundCue) => {
    if (muted) cyberAudio.setMuted(false);
    if (cue === "processingStart") {
      cyberAudio.startProcessing();
      setTimeout(() => cyberAudio.stopProcessing(), 1800);
    } else {
      cyberAudio.play(cue);
    }
  };

  return (
    <div className="relative font-mono" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-2 py-1 text-xs border transition-all cursor-pointer ${
          muted
            ? "border-[#112233] bg-[#03070D] text-[#5A7A9A] hover:border-[#FF0055]/50 hover:text-[#FF0055]"
            : "border-[#00E5FF]/40 bg-[#00E5FF]/10 text-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,0.2)] hover:border-[#00E5FF]"
        }`}
        title={muted ? "Cyber Sound FX: MUTED (Click to configure)" : `Cyber Sound FX: ${Math.round(volume * 100)}% (Click to configure)`}
      >
        <span
          onClick={handleToggleMute}
          className="hover:scale-110 transition-transform flex items-center justify-center"
          title={muted ? "Unmute Sound" : "Mute Sound"}
        >
          {muted ? "🔇" : "🔊"}
        </span>
        <span className="text-[10px] font-bold tracking-widest hidden sm:inline">
          {muted ? "MUTED" : `${Math.round(volume * 100)}%`}
        </span>
        <span className="text-[9px] opacity-70">▾</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#070D16] border border-[#00E5FF]/50 shadow-[0_8px_30px_rgba(0,0,0,0.85)] z-50 p-3 flex flex-col gap-3 animate-fadeinup">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#112233] pb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#00E5FF] glow-cyan">
                CYBER AUDIO HUD
              </span>
            </div>
            <button
              onClick={() => cyberAudio.toggleMute()}
              className={`text-[9px] px-2 py-0.5 border font-bold tracking-wider transition-colors cursor-pointer ${
                muted
                  ? "border-[#00FF66] bg-[#00FF66]/15 text-[#00FF66]"
                  : "border-[#FF0055] bg-[#FF0055]/15 text-[#FF0055]"
              }`}
            >
              {muted ? "UNMUTE" : "MUTE"}
            </button>
          </div>

          {/* Volume Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[9px] text-[#5A7A9A]">
              <span>MASTER SYNTH GAIN</span>
              <span className="text-[#00E5FF]">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-full accent-[#00E5FF] h-1.5 bg-[#03070D] cursor-pointer"
            />
          </div>

          {/* Sound FX Triggers */}
          <div className="flex flex-col gap-1.5 border-t border-[#112233] pt-2">
            <span className="text-[9px] text-[#5A7A9A] tracking-wider uppercase">
              HACKING SFX TEST BENCH
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => triggerTest("terminalKey")}
                className="px-2 py-1 text-[9px] text-left border border-[#112233] bg-[#03070D] hover:border-[#00E5FF] hover:text-[#00E5FF] text-[#C0D8F0] transition-colors cursor-pointer"
              >
                ⌨ Terminal Key
              </button>
              <button
                onClick={() => triggerTest("logBurst")}
                className="px-2 py-1 text-[9px] text-left border border-[#112233] bg-[#03070D] hover:border-[#00E5FF] hover:text-[#00E5FF] text-[#C0D8F0] transition-colors cursor-pointer"
              >
                📡 Log Burst
              </button>
              <button
                onClick={() => triggerTest("errorDetected")}
                className="px-2 py-1 text-[9px] text-left border border-[#112233] bg-[#03070D] hover:border-[#FFD600] hover:text-[#FFD600] text-[#C0D8F0] transition-colors cursor-pointer"
              >
                ⚠ Error Tone
              </button>
              <button
                onClick={() => triggerTest("threatAlert")}
                className="px-2 py-1 text-[9px] text-left border border-[#112233] bg-[#03070D] hover:border-[#FF0055] hover:text-[#FF0055] text-[#C0D8F0] transition-colors cursor-pointer"
              >
                🚨 Threat Alarm
              </button>
              <button
                onClick={() => triggerTest("dataBurst")}
                className="px-2 py-1 text-[9px] text-left border border-[#112233] bg-[#03070D] hover:border-[#00E5FF] hover:text-[#00E5FF] text-[#C0D8F0] transition-colors cursor-pointer"
              >
                📡 Data Burst
              </button>
              <button
                onClick={() => triggerTest("scanSweep")}
                className="px-2 py-1 text-[9px] text-left border border-[#112233] bg-[#03070D] hover:border-[#00FF66] hover:text-[#00FF66] text-[#C0D8F0] transition-colors cursor-pointer"
              >
                🔍 Scan Sweep
              </button>
              <button
                onClick={() => triggerTest("patchApplied")}
                className="px-2 py-1 text-[9px] text-left border border-[#112233] bg-[#03070D] hover:border-[#00FF66] hover:text-[#00FF66] text-[#C0D8F0] transition-colors cursor-pointer"
              >
                ✦ Patch Deploy
              </button>
              <button
                onClick={() => triggerTest("glitch")}
                className="px-2 py-1 text-[9px] text-left border border-[#112233] bg-[#03070D] hover:border-[#FF0055] hover:text-[#FF0055] text-[#C0D8F0] transition-colors cursor-pointer"
              >
                ⚡ Cyber Glitch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
