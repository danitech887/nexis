"use client";

import React, { useState } from "react";
import { MonitoredSystem, SystemStatus } from "@/lib/systems";
import VitalsBadge from "@/components/shell/VitalsBadge";

interface SystemListProps {
  systems: MonitoredSystem[];
  selectedSystemId: string;
  onSelectSystem: (system: MonitoredSystem) => void;
}

export default function SystemList({
  systems,
  selectedSystemId,
  onSelectSystem,
}: SystemListProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredSystems = systems.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.host.toLowerCase().includes(search.toLowerCase()) ||
      s.tag.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" ||
      s.category === categoryFilter ||
      (s.nodeType && s.nodeType.toLowerCase().startsWith(categoryFilter.toLowerCase()));
    return matchesSearch && matchesCategory;
  });

  const totalErrors = systems.reduce((acc, s) => acc + s.issues.length, 0);
  const warnCount = systems.filter((s) => s.status === "warn").length;

  return (
    <div className="w-80 shrink-0 border-r border-[#112233] bg-[#03070D] flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-3 border-b border-[#112233] bg-[#070D16] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse" />
            <h2 className="text-[#00FF66] text-xs font-bold tracking-[0.2em] font-mono glow-green">
              MONITORED SYSTEMS
            </h2>
          </div>
          <span className="text-[10px] font-mono text-[#5A7A9A] bg-[#112233] px-1.5 py-0.5 rounded">
            {systems.length} TARGETS
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search systems (name, IP, tag)..."
            className="w-full bg-[#03070D] border border-[#112233] text-[#C0D8F0] text-[11px] font-mono px-2.5 py-1.5 focus:outline-none focus:border-[#00FF66] placeholder:text-[#2A4A6A] transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1.5 text-xs text-[#5A7A9A] hover:text-[#FF0055]"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick category filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[9px] font-mono scrollbar-none">
          {["all", "ingress", "compute", "storage", "external", "async"].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-0.5 uppercase tracking-wider transition-colors shrink-0 ${
                  categoryFilter === cat
                    ? "bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/50"
                    : "text-[#5A7A9A] hover:text-[#C0D8F0] border border-transparent"
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>
      </div>

      {/* Systems Summary Bar */}
      <div className="px-3 py-1.5 bg-[#050B13] border-b border-[#112233] flex items-center justify-between text-[9px] font-mono">
        <span className="text-[#5A7A9A]">
          ONLINE:{" "}
          <strong className="text-[#00FF66]">
            {systems.filter((s) => s.status === "online").length}
          </strong>
        </span>
        <span className="text-[#5A7A9A]">
          WARN:{" "}
          <strong className="text-[#FFD600]">{warnCount}</strong>
        </span>
        <span className="text-[#5A7A9A]">
          ISSUES:{" "}
          <strong className="text-[#FF0055]">{totalErrors}</strong>
        </span>
      </div>

      {/* List of systems */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#0A1220]">
        {filteredSystems.map((sys) => {
          const isSelected = sys.id === selectedSystemId;
          const statusAccent =
            sys.status === "online"
              ? "green"
              : sys.status === "warn"
              ? "yellow"
              : "magenta";

          return (
            <button
              key={sys.id}
              onClick={() => onSelectSystem(sys)}
              className={`w-full text-left p-3 transition-all relative group flex flex-col gap-1.5 ${
                isSelected
                  ? "bg-[#0A1624] border-l-2 border-l-[#00FF66] shadow-[inset_0_0_12px_rgba(0,255,102,0.1)]"
                  : "hover:bg-[#070D16] border-l-2 border-l-transparent"
              }`}
            >
              {/* Top line: Tag + Name + Status */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`text-[9px] font-mono font-bold px-1 py-0.2 border ${
                      isSelected
                        ? "text-[#00FF66] border-[#00FF66]/40 bg-[#00FF66]/10"
                        : "text-[#5A7A9A] border-[#112233] bg-[#070D16]"
                    }`}
                  >
                    {sys.tag}
                  </span>
                  <span
                    className={`text-[12px] font-bold truncate ${
                      isSelected
                        ? "text-[#00FF66] glow-green"
                        : "text-[#C0D8F0] group-hover:text-white"
                    }`}
                  >
                    {sys.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <VitalsBadge
                    status={sys.status}
                    label=""
                    accent={statusAccent}
                  />
                  {isSelected && (
                    <span className="text-[10px] text-[#00FF66] font-mono">
                      ▸
                    </span>
                  )}
                </div>
              </div>

              {/* Endpoint / Region */}
              <div className="flex items-center justify-between text-[10px] font-mono text-[#5A7A9A]">
                <span className="truncate">
                  {sys.host}:{sys.port}
                </span>
                <span className="text-[#3A5A7A]">{sys.region}</span>
              </div>

              {/* Footer info: Log Rate, Health, Issues count */}
              <div className="flex items-center justify-between text-[9px] font-mono pt-1 border-t border-[#112233]/40">
                <span className="text-[#00E5FF] flex items-center gap-1">
                  <span className="text-[#2A4A6A]">STREAM:</span>
                  {sys.logRate}
                </span>

                <div className="flex items-center gap-2">
                  {sys.issues.length > 0 && (
                    <span className="text-[#FF0055] font-bold bg-[#FF0055]/10 px-1 border border-[#FF0055]/30">
                      {sys.issues.length} {sys.issues.length === 1 ? "ISSUE" : "ISSUES"}
                    </span>
                  )}
                  <span
                    className={`font-bold ${
                      sys.healthScore >= 90
                        ? "text-[#00FF66]"
                        : sys.healthScore >= 75
                        ? "text-[#FFD600]"
                        : "text-[#FF0055]"
                    }`}
                  >
                    {sys.healthScore}% HP
                  </span>
                </div>
              </div>
            </button>
          );
        })}

        {filteredSystems.length === 0 && (
          <div className="p-6 text-center text-[#5A7A9A] text-xs font-mono">
            No monitored systems match your filter.
          </div>
        )}
      </div>
    </div>
  );
}
