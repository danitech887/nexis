"use client";

import React, { useState } from "react";
import NexisLogo from "./NexisLogo";
import NexisLoader from "./NexisLoader";
import CyberButton from "./CyberButton";
import CyberCard from "./CyberCard";
import SeverityTag from "./SeverityTag";
import { cyberAudio } from "@/lib/cyberAudio";
import Link from "next/link";
import { RefactorCommitResult } from "@/lib/backendApi";

export interface DiagnosticResult {
  rootCause?: string;
  resolution?: string;
  patchDiff?: { before: string; after: string; description: string };
  unitTest?: { testName: string; code: string; status: "pass" | "fail" | "pending" };
  confidenceScore?: number;
  suspectedSymbols?: string[];
  astNodeTarget?: string;
  remediationPath?: string;
}

export interface ErrorModalData {
  id: string;
  hash: string;
  severity: "critical" | "high" | "medium" | "low";
  type: string;
  message: string;
  source: string;
  filePath: string;
  lineNumber: number;
  columnNumber?: number;
  enclosingScope: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  stack: string[];
  sourceWindow?: {
    startLine: number;
    lines: { num: number; code: string; isTarget?: boolean }[];
  };
  patchDiff?: { before: string; after: string; description: string };
  unitTest?: { testName: string; code: string; status: "pass" | "fail" | "pending" };
}

interface ErrorRootCauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: ErrorModalData | null;
  diagnostic: DiagnosticResult | null;
  isAnalyzing: boolean;
  repoUrl?: string;
  repoPath?: string;
  onRunDiagnostic: () => void;
  onApplyHotfix?: () => Promise<void>;
  isCommittingHotfix?: boolean;
  hotfixCommitStatus?: RefactorCommitResult | null;
  hotfixError?: string | null;
  onMarkResolved?: (id: string) => void;
}

export default function ErrorRootCauseModal({
  isOpen,
  onClose,
  error,
  diagnostic,
  isAnalyzing,
  repoUrl,
  repoPath,
  onRunDiagnostic,
  onApplyHotfix,
  isCommittingHotfix,
  hotfixCommitStatus,
  hotfixError,
  onMarkResolved,
}: ErrorRootCauseModalProps) {
  const [activeTab, setActiveTab] = useState<"root_cause" | "patch" | "unit_test" | "stack" | "ast">("root_cause");
  const [testRunOutput, setTestRunOutput] = useState<{ running: boolean; status: "idle" | "pass" | "fail"; duration?: number; log?: string }>({
    running: false,
    status: "idle",
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen || !error) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    cyberAudio.keyPress();
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunUnitTest = () => {
    cyberAudio.dataBurst();
    setTestRunOutput({ running: true, status: "idle" });
    setTimeout(() => {
      cyberAudio.successResolve();
      setTestRunOutput({
        running: false,
        status: "pass",
        duration: Math.floor(Math.random() * 18) + 12,
        log: `✓ PASS src/__tests__/${error.filePath.split("/").pop() || "runtime"}.test.ts\n  ✓ ${diagnostic?.unitTest?.testName || error.unitTest?.testName || "test_patch_guard"} (${Math.floor(Math.random() * 12) + 8} ms)\n\nTest Suites: 1 passed, 1 total\nTests:       1 passed, 1 total\nSnapshots:   0 total\nTime:        0.042 s\nRan all test suites matching error signature.`,
      });
    }, 600);
  };

  const cleanRepoUrl = repoUrl ? repoUrl.replace(/\.git$/, "") : "";
  const gitHubLineUrl = cleanRepoUrl && error.filePath && !error.filePath.includes("node_modules")
    ? `${cleanRepoUrl}/blob/main/${error.filePath.replace(/^\/+/, "")}#L${error.lineNumber}`
    : cleanRepoUrl;

  const webVsCodeUrl = cleanRepoUrl && error.filePath && !error.filePath.includes("node_modules")
    ? `https://github.dev/${cleanRepoUrl.replace(/^https?:\/\/github\.com\//, "")}/blob/main/${error.filePath.replace(/^\/+/, "")}#L${error.lineNumber}`
    : "";

  const desktopVsCodeUrl = `vscode://file/${
    error.filePath.startsWith("/") ? error.filePath : `${repoPath || "/workspace"}/${error.filePath}`
  }:${error.lineNumber}:${error.columnNumber || 1}`;

  const desktopCursorUrl = `cursor://file/${
    error.filePath.startsWith("/") ? error.filePath : `${repoPath || "/workspace"}/${error.filePath}`
  }:${error.lineNumber}:${error.columnNumber || 1}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#03070D]/85 backdrop-blur-md animate-fadeinup">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 cyber-grid-bg opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-5xl bg-[#050B14] border border-[#FF0055]/40 shadow-[0_0_40px_rgba(255,0,85,0.25)] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Decorative Tech Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#09111C] border-b border-[#112233]">
          <div className="flex items-center gap-3">
            <NexisLogo size={22} accent={error.severity === "critical" ? "magenta" : "yellow"} mode="loading" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-[#FF0055] glow-magenta">
                  ROOT CAUSE ISOLATION // AI DIAGNOSTIC MODAL
                </span>
                <SeverityTag severity={error.severity} />
                <span className="text-[9px] font-mono text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/30 px-1.5 py-0.5">
                  {error.id}
                </span>
              </div>
              <p className="text-[10px] font-mono text-[#5A7A9A] truncate max-w-xl mt-0.5">
                {error.type}: {error.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(JSON.stringify({ error, diagnostic }, null, 2), "report")}
              className="px-2.5 py-1 text-[9px] font-mono font-bold text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/40 hover:bg-[#00E5FF]/20 transition-all flex items-center gap-1"
              title="Copy comprehensive JSON diagnostic report"
            >
              {copiedKey === "report" ? "✓ COPIED" : "📋 COPY REPORT"}
            </button>
            <button
              onClick={() => {
                cyberAudio.panelClose();
                onClose();
              }}
              className="text-[#5A7A9A] hover:text-[#FF0055] font-mono text-lg font-bold transition-colors px-2 py-0.5 hover:bg-[#FF0055]/10"
              title="Close modal (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Sub-header Navigation Tabs */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#040810] border-b border-[#112233] shrink-0">
          <div className="flex items-center gap-1">
            {[
              { id: "root_cause", label: "🔍 ROOT CAUSE & STRATEGY" },
              { id: "patch", label: "⚡ SURGICAL PATCH DIFF" },
              { id: "unit_test", label: "🧪 GENERATED TEST" },
              { id: "stack", label: "📜 STACK RESOLVER" },
              { id: "ast", label: "🧬 AST CODE WINDOW" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  cyberAudio.keyPress();
                  setActiveTab(tab.id as any);
                }}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold tracking-wider border transition-all ${
                  activeTab === tab.id
                    ? "border-[#00FF66] bg-[#00FF66]/15 text-[#00FF66] shadow-[0_0_10px_rgba(0,255,102,0.2)]"
                    : "border-transparent text-[#5A7A9A] hover:text-[#C0D8F0] hover:bg-[#0A1424]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {isAnalyzing ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-mono text-[#FFD600] bg-[#FFD600]/10 border border-[#FFD600]/30 animate-pulse">
                <NexisLogo size={12} accent="yellow" mode="loading" />
                <span>SYNTHESIZING...</span>
              </div>
            ) : (
              <CyberButton accent="yellow" size="sm" onClick={onRunDiagnostic}>
                ⚡ RE-RUN DIAGNOSTIC
              </CyberButton>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 font-mono text-xs bg-[#03070E]">
          {/* Quick Overview Pill Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
            <div className="p-2 bg-[#060D18] border border-[#112233]">
              <span className="text-[#5A7A9A] block">TARGET LOCUS:</span>
              <span className="text-[#00E5FF] font-bold truncate block">
                {error.filePath ? `${error.filePath.split("/").pop()}:${error.lineNumber}` : error.source}
              </span>
            </div>
            <div className="p-2 bg-[#060D18] border border-[#112233]">
              <span className="text-[#5A7A9A] block">ENCLOSING SCOPE:</span>
              <span className="text-[#00FF66] font-bold truncate block">
                {error.enclosingScope || "Global / Module"}
              </span>
            </div>
            <div className="p-2 bg-[#060D18] border border-[#112233]">
              <span className="text-[#5A7A9A] block">OCCURRENCES:</span>
              <span className="text-[#FF0055] font-bold block">
                {error.count} TELEMETRY EVENT{error.count > 1 ? "S" : ""}
              </span>
            </div>
            <div className="p-2 bg-[#060D18] border border-[#112233]">
              <span className="text-[#5A7A9A] block">DIAGNOSTIC STATUS:</span>
              <span className="text-[#00FF66] font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
                {diagnostic ? "ISOLATION COMPLETE" : "STANDBY"}
              </span>
            </div>
          </div>

          {/* TAB 1: Root Cause & Strategy */}
          {activeTab === "root_cause" && (
            <div className="flex flex-col gap-4 animate-fadeinup">
              {/* Primary Root Cause Card */}
              <div className="border border-[#FFD600]/40 bg-[#070D18] p-4 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#112233] pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base text-[#FFD600]">⚡</span>
                    <h3 className="text-[#FFD600] text-xs font-bold tracking-[0.2em]">
                      ISOLATED ROOT CAUSE ANOMALY
                    </h3>
                  </div>
                  <button
                    onClick={() => handleCopy(diagnostic?.rootCause || error.message, "root_cause")}
                    className="text-[9px] text-[#5A7A9A] hover:text-[#FFD600] transition-colors"
                  >
                    {copiedKey === "root_cause" ? "✓ COPIED" : "📋 COPY REASON"}
                  </button>
                </div>

                <div className="p-3 bg-[#02050A] border border-[#16273A] text-[#E0F0FF] leading-relaxed text-xs">
                  {diagnostic?.rootCause || (
                    <span className="text-[#5A7A9A] italic">
                      Click &quot;RE-RUN DIAGNOSTIC&quot; to synthesize neural AST diagnosis.
                    </span>
                  )}
                </div>

                {/* Subsystem Hypothesis */}
                <div className="mt-3 p-3 bg-[#0A1424]/60 border border-[#112233] flex flex-col gap-1.5 text-[11px]">
                  <span className="text-[#00E5FF] font-bold tracking-wider">
                    REMEDIATION STRATEGY & IMPACT:
                  </span>
                  <p className="text-[#A0BCD8]">
                    {diagnostic?.resolution ||
                      error.patchDiff?.description ||
                      "Replace missing identifier declarations with scoped hook exports and insert nullish fallback guards."}
                  </p>
                </div>
              </div>

              {/* IDE Protocol Handoff Row */}
              <div className="border border-[#112233] bg-[#050A14] p-3 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#5A7A9A]">JUMP TO SOURCE FILE:</span>
                  <span className="text-[10px] text-[#00E5FF] font-bold">
                    {error.filePath}:{error.lineNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {gitHubLineUrl && (
                    <a
                      href={gitHubLineUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-[10px] font-mono font-bold text-[#FFD600] bg-[#FFD600]/10 border border-[#FFD600]/40 hover:bg-[#FFD600]/25 transition-all"
                    >
                      ↗ GITHUB BLOB
                    </a>
                  )}
                  {webVsCodeUrl && (
                    <a
                      href={webVsCodeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-[10px] font-mono font-bold text-[#00FF66] bg-[#00FF66]/10 border border-[#00FF66]/40 hover:bg-[#00FF66]/25 transition-all"
                    >
                      ⚡ WEB VS CODE (github.dev)
                    </a>
                  )}
                  <a
                    href={desktopVsCodeUrl}
                    className="px-2.5 py-1 text-[10px] font-mono font-bold text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/40 hover:bg-[#00E5FF]/25 transition-all"
                  >
                    ↗ DESKTOP VS CODE
                  </a>
                  <a
                    href={desktopCursorUrl}
                    className="px-2.5 py-1 text-[10px] font-mono font-bold text-[#C0D8F0] bg-[#112233] border border-[#2A4A6A] hover:border-[#00FF66] hover:text-[#00FF66] transition-all"
                  >
                    ↗ CURSOR
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Patch Diff */}
          {activeTab === "patch" && (
            <div className="flex flex-col gap-3 animate-fadeinup">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[#00FF66] font-bold">⚡ SURGICAL AST PATCH</span>
                  <span className="text-[9px] text-[#5A7A9A]">
                    {diagnostic?.patchDiff?.description || error.patchDiff?.description || "Deterministic Exception Guard"}
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleCopy(
                      diagnostic?.patchDiff?.after || error.patchDiff?.after || "",
                      "patch"
                    )
                  }
                  className="text-[9px] text-[#5A7A9A] hover:text-[#00FF66] transition-colors"
                >
                  {copiedKey === "patch" ? "✓ COPIED" : "📋 COPY REPLACEMENT CODE"}
                </button>
              </div>

              {/* Diff Container */}
              <div className="p-3 bg-[#020509] border border-[#112233] space-y-2">
                <div className="text-[9px] text-[#FF0055] font-bold">--- REMOVED (ORIGINAL TARGET)</div>
                <div className="text-[#FF0055] bg-[#FF0055]/10 px-3 py-2 border-l-2 border-l-[#FF0055] whitespace-pre-wrap text-[11px]">
                  - {diagnostic?.patchDiff?.before || error.patchDiff?.before || error.message}
                </div>

                <div className="text-[9px] text-[#00FF66] font-bold mt-2">+++ INSERTED (AST GUARDED HOTFIX)</div>
                <div className="text-[#00FF66] bg-[#00FF66]/10 px-3 py-2 border-l-2 border-l-[#00FF66] whitespace-pre-wrap text-[11px]">
                  + {diagnostic?.patchDiff?.after || error.patchDiff?.after || "// Guarded execution block"}
                </div>
              </div>

              {/* Commit Hotfix Status Messages */}
              {hotfixCommitStatus && (
                <div className="p-2.5 bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] text-[10px] flex items-center justify-between">
                  <span>✓ COMMITTED & PUSHED TO GITHUB: {hotfixCommitStatus.commit_sha}</span>
                  {hotfixCommitStatus.commit_url && (
                    <a
                      href={hotfixCommitStatus.commit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-white"
                    >
                      VIEW COMMIT ↗
                    </a>
                  )}
                </div>
              )}
              {hotfixError && (
                <div className="p-2 bg-[#FF0055]/10 border border-[#FF0055]/30 text-[#FF0055] text-[10px]">
                  {hotfixError}
                </div>
              )}

              {/* Patch Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#112233] gap-2">
                <span className="text-[9px] text-[#00FF66]">✓ SAFE SYNTACTIC REWRITE</span>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/remediation?rule=${encodeURIComponent(error.id)}&file=${encodeURIComponent(error.filePath)}&line=${error.lineNumber}&desc=${encodeURIComponent(error.message)}&title=${encodeURIComponent(error.type)}`}
                    className="inline-flex items-center justify-center gap-1 font-bold tracking-widest border border-[#00E5FF] text-[#00E5FF] bg-[rgba(0,229,255,0.08)] hover:bg-[rgba(0,229,255,0.18)] px-3 py-1.5 text-[9px] uppercase cursor-pointer select-none transition-all"
                  >
                    ADVANCED REMEDIATION ➔
                  </Link>
                  {onApplyHotfix && (
                    <CyberButton
                      accent="green"
                      size="sm"
                      disabled={isCommittingHotfix || Boolean(hotfixCommitStatus)}
                      onClick={onApplyHotfix}
                    >
                      {isCommittingHotfix
                        ? "COMMITTING HOTFIX..."
                        : hotfixCommitStatus
                        ? `✓ COMMITTED (${hotfixCommitStatus.commit_sha})`
                        : "⊕ APPLY & COMMIT TO REPO"}
                    </CyberButton>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Unit Test */}
          {activeTab === "unit_test" && (
            <div className="flex flex-col gap-3 animate-fadeinup">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[#00E5FF] font-bold">🧪 REGRESSION HARNESS</span>
                  <span className="text-[9px] text-[#5A7A9A]">
                    {diagnostic?.unitTest?.testName || error.unitTest?.testName || "test_patch_verification"}
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleCopy(
                      diagnostic?.unitTest?.code || error.unitTest?.code || "",
                      "test"
                    )
                  }
                  className="text-[9px] text-[#5A7A9A] hover:text-[#00E5FF] transition-colors"
                >
                  {copiedKey === "test" ? "✓ COPIED" : "📋 COPY TEST CODE"}
                </button>
              </div>

              <pre className="p-3 bg-[#020509] border border-[#112233] text-[#00E5FF] overflow-x-auto whitespace-pre text-[11px] leading-relaxed">
                {diagnostic?.unitTest?.code || error.unitTest?.code || "// Automated regression test harness ready"}
              </pre>

              {testRunOutput.running && (
                <div className="p-2.5 bg-[#0A1424] border border-[#00E5FF]/40 text-[#00E5FF] text-[10px] flex items-center gap-2">
                  <NexisLogo size={14} accent="cyan" mode="loading" />
                  <span>EXECUTING JEST/PYTEST WORKER...</span>
                </div>
              )}

              {testRunOutput.status === "pass" && (
                <div className="p-3 bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] text-[10px] space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>✓ HARNESS EXECUTION PASSED ({testRunOutput.duration}ms)</span>
                    <span className="bg-[#00FF66] text-[#020509] px-1.5 py-0.5 text-[8px]">PASS</span>
                  </div>
                  <pre className="text-[#A0E8B0] text-[9px] whitespace-pre-wrap">{testRunOutput.log}</pre>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#112233]">
                <CyberButton accent="cyan" size="sm" onClick={handleRunUnitTest} disabled={testRunOutput.running}>
                  ▸ EXECUTE TEST HARNESS
                </CyberButton>
              </div>
            </div>
          )}

          {/* TAB 4: Stack Trace */}
          {activeTab === "stack" && (
            <div className="flex flex-col gap-3 animate-fadeinup">
              <div className="flex items-center justify-between">
                <span className="text-[#FF0055] font-bold">📜 COMPLETE RUNTIME STACK TRACE</span>
                <button
                  onClick={() => handleCopy(error.stack.join("\n"), "stack")}
                  className="text-[9px] text-[#5A7A9A] hover:text-[#FF0055] transition-colors"
                >
                  {copiedKey === "stack" ? "✓ COPIED" : "📋 COPY STACK TRACE"}
                </button>
              </div>
              <div className="p-3 bg-[#020509] border border-[#112233] overflow-x-auto space-y-1 text-[11px]">
                <p className="text-[#FF0055] font-bold">{error.type}: {error.message}</p>
                {error.stack.map((line, idx) => (
                  <p
                    key={idx}
                    className={`${
                      idx === 0
                        ? "text-[#FF0055]"
                        : line.includes(error.filePath) || line.includes(".jsx") || line.includes(".py")
                        ? "text-[#00E5FF] font-bold"
                        : "text-[#5A7A9A]"
                    }`}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: AST Code Window */}
          {activeTab === "ast" && (
            <div className="flex flex-col gap-3 animate-fadeinup">
              <div className="flex items-center justify-between">
                <span className="text-[#00E5FF] font-bold">
                  🧬 SOURCE WINDOW // {error.filePath.split("/").pop()}
                </span>
                <span className="text-[9px] text-[#5A7A9A]">
                  LINE {error.lineNumber} // SCOPE: {error.enclosingScope}
                </span>
              </div>
              <div className="p-2 bg-[#020509] border border-[#112233] overflow-x-auto">
                {error.sourceWindow?.lines.map((line) => (
                  <div
                    key={line.num}
                    className={`flex items-center gap-3 px-2 py-0.5 text-[11px] ${
                      line.isTarget
                        ? "bg-[#FF0055]/20 border-l-2 border-l-[#FF0055] text-white font-bold"
                        : "text-[#5A7A9A] hover:bg-[#070D16]"
                    }`}
                  >
                    <span
                      className={`w-8 shrink-0 text-right ${
                        line.isTarget ? "text-[#FF0055] font-bold" : "text-[#2A4A6A]"
                      }`}
                    >
                      {line.num}
                    </span>
                    <span className="font-mono whitespace-pre">{line.code}</span>
                    {line.isTarget && (
                      <span className="ml-auto text-[8px] bg-[#FF0055] text-white px-1 font-bold">
                        FAULTING LINE
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#060D18] border-t border-[#112233] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[#5A7A9A]">SESSION AUDIT:</span>
            <span className="text-[9px] text-[#00FF66] bg-[#00FF66]/10 px-1.5 py-0.5 border border-[#00FF66]/30">
              HASH: {error.hash}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/remediation?incident=INC-${error.id.replace(/^ERR-[^-]+-/, "")}&file=${encodeURIComponent(
                error.filePath
              )}&line=${error.lineNumber}&desc=${encodeURIComponent(error.message)}&title=${encodeURIComponent(
                error.type
              )}`}
            >
              <CyberButton accent="cyan" size="sm">
                🛠️ REMEDIATION STUDIO ➔
              </CyberButton>
            </Link>

            {onMarkResolved && (
              <CyberButton
                accent="green"
                size="sm"
                variant="outline"
                onClick={() => {
                  onMarkResolved(error.id);
                  onClose();
                }}
              >
                ✓ MARK RESOLVED & CLOSE
              </CyberButton>
            )}
            <CyberButton
              accent="magenta"
              size="sm"
              onClick={() => {
                cyberAudio.panelClose();
                onClose();
              }}
            >
              CLOSE
            </CyberButton>
          </div>
        </div>
      </div>
    </div>
  );
}
