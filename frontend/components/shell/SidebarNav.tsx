"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NexisLogo from "@/components/ui/NexisLogo";
import { useActiveSoftware } from "@/lib/ActiveSoftwareContext";
import { cyberAudio } from "@/lib/cyberAudio";

const ACCENT_STYLES: Record<string, { text: string; border: string; glow: string; bg: string }> = {
  cyan:    { text: "text-[#00E5FF]", border: "border-[#00E5FF]", glow: "shadow-[0_0_10px_rgba(0,229,255,0.4)]",  bg: "bg-[rgba(0,229,255,0.07)]"  },
  green:   { text: "text-[#00FF66]", border: "border-[#00FF66]", glow: "shadow-[0_0_10px_rgba(0,255,102,0.4)]",  bg: "bg-[rgba(0,255,102,0.07)]"  },
  magenta: { text: "text-[#FF0055]", border: "border-[#FF0055]", glow: "shadow-[0_0_10px_rgba(255,0,85,0.4)]",   bg: "bg-[rgba(255,0,85,0.07)]"   },
  yellow:  { text: "text-[#FFD600]", border: "border-[#FFD600]", glow: "shadow-[0_0_10px_rgba(255,214,0,0.4)]",  bg: "bg-[rgba(255,214,0,0.07)]"  },
};

export function SidebarNav() {
  const pathname = usePathname();
  const { activeSoftware } = useActiveSoftware();

  const navItems = [
    {
      href: "/projects",
      label: "FLEET",
      icon: "⊞",
      accent: "green",
      isActive: pathname === "/projects",
    },
    {
      href: "/",
      label: "VITALS",
      icon: "◈",
      accent: "cyan",
      isActive: pathname === "/",
    },
    {
      href: "/logs",
      label: "LOGS",
      icon: "▸",
      accent: "green",
      isActive: pathname.startsWith("/logs"),
    },
    {
      href: "/errors",
      label: "ERRORS",
      icon: "⚠",
      accent: "magenta",
      isActive: pathname.startsWith("/errors"),
    },
    {
      href: "/security",
      label: "SECURITY",
      icon: "⬡",
      accent: "yellow",
      isActive: pathname.startsWith("/security"),
    },
    {
      href: "/quality",
      label: "QUALITY",
      icon: "◎",
      accent: "cyan",
      isActive: pathname.startsWith("/quality"),
    },
    {
      href: "/remediation",
      label: "AI FIX",
      icon: "✦",
      accent: "green",
      isActive: pathname.startsWith("/remediation"),
    },
  ];

  return (
    <aside className="w-[64px] shrink-0 flex flex-col items-center py-4 gap-1
                      bg-[#070D16] border-r border-[#112233] relative z-10 select-none">
      {/* Animated Nexis System Emblem (Links to Fleet Control) */}
      <Link
        href="/projects"
        title="NEXIS // SOFTWARE FLEET CONTROL"
        onClick={() => cyberAudio.cyberClick()}
        className="mb-3 hover:scale-105 transition-transform"
      >
        <NexisLogo size={34} accent="cyan" mode="idle" interactive />
      </Link>

      {navItems.map((item) => {
        const s = ACCENT_STYLES[item.accent];
        return (
          <Link
            key={item.label}
            href={item.href}
            title={item.label}
            onClick={() => cyberAudio.cyberClick()}
            className={`
              group relative w-12 h-12 flex flex-col items-center justify-center gap-0.5
              border transition-all duration-200 cursor-pointer select-none
              ${item.isActive
                ? `${s.border} ${s.bg} ${s.glow} ${s.text}`
                : "border-[#112233] text-[#2A4A6A] hover:border-[#1A3A5A] hover:text-[#5A7A9A]"}
            `}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="text-[7px] font-bold tracking-widest leading-none opacity-70">
              {item.label}
            </span>
            {/* Active left-bar indicator */}
            {item.isActive && (
              <span
                className="absolute left-0 top-1 bottom-1 w-[2px]"
                style={{
                  background:
                    item.accent === "cyan"
                      ? "#00E5FF"
                      : item.accent === "green"
                      ? "#00FF66"
                      : item.accent === "magenta"
                      ? "#FF0055"
                      : "#FFD600",
                }}
              />
            )}
          </Link>
        );
      })}

      {/* Bottom spacer divider */}
      <div className="mt-auto w-8 border-t border-[#112233]" />
      <Link
        href="/projects"
        title="Fleet Control"
        className="w-8 h-8 flex items-center justify-center text-[#00FF66] text-xs border border-[#112233] hover:border-[#00FF66]/50 hover:bg-[#00FF66]/10 cursor-pointer transition-colors"
      >
        ⊞
      </Link>
    </aside>
  );
}
