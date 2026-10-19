"use client";

import React, { useState } from "react";
import { SoftwareProject, SoftwareCategory } from "@/lib/softwareFleet";
import CyberButton from "@/components/ui/CyberButton";

interface EnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (project: SoftwareProject) => void;
}

export default function EnrollModal({ isOpen, onClose, onEnroll }: EnrollModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<SoftwareCategory>("Web API");
  const [platform, setPlatform] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [description, setDescription] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const newProject: SoftwareProject = {
      id: id || `software-${Date.now()}`,
      name: name.trim(),
      category,
      platform: platform.trim() || (category === "Mobile" ? "Kotlin / Android" : category === "Desktop" ? "Python / PyQt" : "Node.js / TypeScript"),
      vitals: "OK",
      errorCount: 0,
      hasSpike: false,
      sastGrade: "A",
      healthScore: 98,
      description: description.trim() || `Enterprise ${category} application managed by Nexis.`,
      repoPath: repoPath.trim() || `/home/danitech/Desktop/Projects/${name.trim()}`,
      lastDeployed: "Just now",
      metrics: {
        cpu: "14%",
        memory: "250 MB",
        p99Latency: "45ms",
        activeSessions: "100%",
      },
      scopedLogs: [
        { id: 1, ts: new Date().toISOString().slice(11, 23), level: "INFO", tag: "System.Init", msg: `Enrolled ${name} into Nexis Software Fleet Control.` },
        { id: 2, ts: new Date().toISOString().slice(11, 23), level: "INFO", tag: "Telemetry.Probe", msg: "Establishing secure WebSocket telemetry agent connection..." },
      ],
      scopedCrashes: [],
      scopedSast: [
        {
          id: `SAST-${id.slice(0, 3).toUpperCase()}-01`,
          rule: "Telemetry Baseline Scan Pending",
          severity: "low",
          file: "config.json",
          line: 1,
          description: "Initial SAST rule pass completed; zero critical vulnerabilities found.",
          remediationSnippet: "Keep dependencies updated.",
        },
      ],
      astHighlight: {
        rootClass: "MainApplicationModule",
        loc: 240,
        methods: [
          { name: "initializeApplication()", complexity: 4, lines: 32 },
          { name: "handleRequestCycle()", complexity: 6, lines: 48 },
        ],
      },
      aiFixSnippet: {
        title: "Standard Telemetry Instrumentation",
        file: "src/telemetry.ts",
        diffBefore: `// Telemetry not configured`,
        diffAfter: `import { initNexisProbe } from '@nexis/agent';\ninitNexisProbe({ appId: '${id}' });`,
        tests: [
          { name: "verify_telemetry_handshake", status: "pass" },
        ],
      },
    };

    onEnroll(newProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#03070D]/80 backdrop-blur-md animate-fadeinup select-none">
      <div className="relative w-full max-w-lg bg-[#070D16] border border-[#00FF66]/40 shadow-[0_0_30px_rgba(0,255,102,0.15)] p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#112233] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[#00FF66] font-bold text-sm">⊞</span>
            <h2 className="text-[#00FF66] text-xs font-bold tracking-[0.25em] font-mono glow-green">
              ENROLL NEW SOFTWARE TARGET
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#5A7A9A] hover:text-[#FF0055] font-mono text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 font-mono text-xs">
          <div>
            <label className="text-[10px] text-[#5A7A9A] tracking-wider block mb-1">
              SOFTWARE / REPOSITORY NAME *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alhanatra Mobile, ShuleBase React..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#03070D] border border-[#112233] text-[#C0D8F0] px-3 py-2 text-xs focus:outline-none focus:border-[#00FF66]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#5A7A9A] tracking-wider block mb-1">
                CATEGORY
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SoftwareCategory)}
                className="w-full bg-[#03070D] border border-[#112233] text-[#C0D8F0] px-3 py-2 text-xs focus:outline-none focus:border-[#00FF66]"
              >
                <option value="Web API">Web API</option>
                <option value="Mobile">Mobile</option>
                <option value="Desktop">Desktop</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#5A7A9A] tracking-wider block mb-1">
                PLATFORM / STACK
              </label>
              <input
                type="text"
                placeholder="e.g. Kotlin / Jetpack, Django, PyQt5"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-[#03070D] border border-[#112233] text-[#C0D8F0] px-3 py-2 text-xs focus:outline-none focus:border-[#00FF66]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[#5A7A9A] tracking-wider block mb-1">
              LOCAL REPOSITORY PATH
            </label>
            <input
              type="text"
              placeholder="/home/danitech/Desktop/Projects/..."
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              className="w-full bg-[#03070D] border border-[#112233] text-[#C0D8F0] px-3 py-2 text-xs focus:outline-none focus:border-[#00FF66]"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#5A7A9A] tracking-wider block mb-1">
              SYSTEM DESCRIPTION
            </label>
            <textarea
              rows={2}
              placeholder="Brief summary of application purpose and monitored nodes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#03070D] border border-[#112233] text-[#C0D8F0] px-3 py-2 text-xs focus:outline-none focus:border-[#00FF66]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#112233] mt-1">
            <CyberButton
              type="button"
              accent="magenta"
              size="sm"
              variant="ghost"
              onClick={onClose}
            >
              CANCEL
            </CyberButton>
            <CyberButton
              type="submit"
              accent="green"
              size="sm"
              variant="solid"
            >
              + ENROLL SOFTWARE
            </CyberButton>
          </div>
        </form>
      </div>
    </div>
  );
}
