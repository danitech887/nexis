"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SoftwareProject } from "@/lib/softwareFleet";
import { useActiveSoftware } from "@/lib/ActiveSoftwareContext";
import CyberCard from "@/components/ui/CyberCard";
import CyberButton from "@/components/ui/CyberButton";
import EnrollModal from "@/components/fleet/EnrollModal";

type FilterOption = "All" | "Web API" | "Mobile" | "Desktop";

export default function ProjectsPage() {
  const { fleet, setActiveSoftwareId, enrollSoftware } = useActiveSoftware();
  const [filter, setFilter] = useState<FilterOption>("All");
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const router = useRouter();

  const handleLaunch = (project: SoftwareProject) => {
    setActiveSoftwareId(project.id);
    router.push("/");
  };

  const filteredProjects = fleet.filter((p) => {
    if (filter === "All") return true;
    return p.category === filter;
  });

  return (
    <div className="h-full flex flex-col overflow-y-auto p-5 gap-5 animate-fadeinup">
      {/* Top Banner / Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#112233] pb-4 bg-[#070D16] p-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-[#00FF66] rounded-full animate-ping" />
            <h1 className="text-base font-bold font-mono tracking-[0.25em] text-[#00FF66] glow-green">
              NEXIS_ // SOFTWARE FLEET CONTROL
            </h1>
          </div>
          <p className="text-[#5A7A9A] text-xs font-mono mt-1">
            Root multi-application orchestrator. Monitor, debug, and remediate scoped system targets.
          </p>
        </div>

        {/* Action Bar: Enroll button + Filter chips */}
        <div className="flex flex-wrap items-center gap-3">
          <CyberButton
            accent="green"
            size="sm"
            variant="solid"
            onClick={() => setIsEnrollOpen(true)}
          >
            + ENROLL NEW SOFTWARE
          </CyberButton>

          <div className="h-4 w-px bg-[#112233] hidden sm:block" />

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#03070D] border border-[#112233] p-1 font-mono text-[10px]">
            <span className="text-[#3A5A7A] px-1.5 uppercase tracking-widest">
              Filter:
            </span>
            {(["All", "Web API", "Mobile", "Desktop"] as FilterOption[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2 py-0.5 tracking-wider transition-colors font-bold ${
                  filter === tab
                    ? "bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/40"
                    : "text-[#5A7A9A] hover:text-[#C0D8F0] border border-transparent"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Software Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((project, idx) => {
          const isDegraded = project.vitals === "Degraded";
          const cardAccent = isDegraded ? "yellow" : "cyan";

          return (
            <CyberCard
              key={project.id}
              accent={cardAccent}
              className="flex flex-col justify-between group transition-all duration-200 hover:border-[#00FF66]/60 hover:shadow-[0_0_24px_rgba(0,255,102,0.15)]"
            >
              <div className="p-4 flex flex-col gap-3 font-mono">
                {/* Header Tag / Category */}
                <div className="flex items-center justify-between border-b border-[#112233] pb-2 text-[10px]">
                  <span className="text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 border border-[#00E5FF]/30 font-bold uppercase tracking-wider">
                    CARD {idx + 1}: {project.category === "Web API" ? "Web App" : project.category === "Mobile" ? "Mobile App" : "Desktop"}
                  </span>
                  <span className="text-[#5A7A9A]">{project.platform}</span>
                </div>

                {/* Software Name & Description */}
                <div>
                  <h3 className="text-base font-bold text-[#E0F0FF] group-hover:text-[#00FF66] transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-[#5A7A9A] text-[11px] leading-relaxed mt-1 line-clamp-2">
                    {project.description}
                  </p>
                </div>

                {/* Vitals Indicator */}
                <div className="flex items-center gap-2 py-1 px-2.5 bg-[#03070D] border border-[#112233]">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      project.vitals === "OK"
                        ? "bg-[#00FF66] shadow-[0_0_6px_#00FF66]"
                        : project.vitals === "Degraded"
                        ? "bg-[#FFD600] animate-pulse shadow-[0_0_6px_#FFD600]"
                        : "bg-[#FF0055] shadow-[0_0_6px_#FF0055]"
                    }`}
                  />
                  <span className="text-xs font-bold text-[#C0D8F0]">
                    Vitals:{" "}
                    <strong
                      className={
                        project.vitals === "OK"
                          ? "text-[#00FF66]"
                          : project.vitals === "Degraded"
                          ? "text-[#FFD600]"
                          : "text-[#FF0055]"
                      }
                    >
                      {project.vitals}
                    </strong>
                  </span>
                </div>

                {/* Error count & SAST Grade */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-[#03070D] border border-[#112233]">
                    <span className="text-[9px] text-[#5A7A9A] block">ERRORS</span>
                    <span
                      className={`font-bold ${
                        project.errorCount > 20
                          ? "text-[#FF0055]"
                          : project.errorCount > 0
                          ? "text-[#FFD600]"
                          : "text-[#00FF66]"
                      }`}
                    >
                      {project.errorCount} {project.hasSpike && <span className="text-[#FF0055] text-[10px] animate-pulse">(Spike!)</span>}
                    </span>
                  </div>

                  <div className="p-2 bg-[#03070D] border border-[#112233]">
                    <span className="text-[9px] text-[#5A7A9A] block">SAST SCORE</span>
                    <span className="font-bold text-[#00E5FF]">
                      Grade: {project.sastGrade}
                    </span>
                  </div>
                </div>

                {/* Metrics strip */}
                <div className="flex items-center justify-between text-[9px] text-[#3A5A7A] pt-1">
                  <span>CPU: {project.metrics.cpu}</span>
                  <span>MEM: {project.metrics.memory}</span>
                  <span>P99: {project.metrics.p99Latency}</span>
                </div>
              </div>

              {/* Divider & Large Action Button */}
              <div className="border-t border-[#112233] p-3 bg-[#050B13]">
                <button
                  onClick={() => handleLaunch(project)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 font-mono font-bold text-xs uppercase tracking-widest text-[#00FF66] bg-[#00FF66]/10 border border-[#00FF66]/40 hover:bg-[#00FF66] hover:text-[#03070D] transition-all shadow-[0_0_12px_rgba(0,255,102,0.1)] active:scale-[0.98] cursor-pointer"
                >
                  <span>[ CLICK TO LAUNCH ]</span>
                  <span>▸</span>
                </button>
              </div>
            </CyberCard>
          );
        })}
      </div>

      {/* Enroll Modal */}
      <EnrollModal
        isOpen={isEnrollOpen}
        onClose={() => setIsEnrollOpen(false)}
        onEnroll={enrollSoftware}
      />
    </div>
  );
}
