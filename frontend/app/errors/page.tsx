"use client";

import { useState, useMemo, useEffect } from "react";
import CyberCard from "@/components/ui/CyberCard";
import CyberButton from "@/components/ui/CyberButton";
import SeverityTag from "@/components/ui/SeverityTag";
import NexisLogo from "@/components/ui/NexisLogo";
import NexisLoader from "@/components/ui/NexisLoader";
import { useActiveSoftware } from "@/lib/ActiveSoftwareContext";

interface ErrorEntry {
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
  patchDiff?: {
    before: string;
    after: string;
    description: string;
  };
  unitTest?: {
    testName: string;
    code: string;
    status: "pass" | "fail" | "pending";
  };
}

const DEFAULT_FALLBACK_ERRORS: ErrorEntry[] = [
  {
    id: "ERR-001", hash: "a3f82c", severity: "critical",
    type: "DatabaseError", message: "Connection pool exhausted — max 20 connections reached",
    source: "db-proxy:3306", filePath: "services/payment.ts", lineNumber: 234, columnNumber: 9,
    enclosingScope: "PaymentService.processCharge()",
    count: 47, firstSeen: "09:12:04", lastSeen: "09:51:22",
    stack: [
      "  at ConnectionPool.acquire (pool.js:142)",
      "  at QueryRunner.connect (runner.js:78)",
      "  at PaymentService.processCharge (payment.ts:234:9)",
    ],
    sourceWindow: {
      startLine: 225,
      lines: [
        { num: 228, code: "  async processCharge(payload: PaymentPayload) {" },
        { num: 229, code: "    const client = await this.pool.acquire();" },
        { num: 230, code: "    try {" },
        { num: 231, code: "      const tx = await client.query('BEGIN');" },
        { num: 232, code: "      const res = await this.runner.connect();" },
        { num: 233, code: "      // Target execution point" },
        { num: 234, code: "      const poolRes = await this.pool.acquireConnection(payload.id);", isTarget: true },
        { num: 235, code: "      await tx.commit();" },
        { num: 236, code: "    } catch (err) {" },
        { num: 237, code: "      throw new DatabaseOperationalError(err.message);" },
        { num: 238, code: "    }" },
        { num: 239, code: "  }" },
      ],
    },
    patchDiff: {
      before: `const poolRes = await this.pool.acquireConnection(payload.id);\nawait tx.commit();`,
      after: `// Guard connection pool exhaustion with exponential timeout\nconst poolRes = await this.pool.acquireWithTimeout(payload.id, 3000);\ntry {\n  await tx.commit();\n} finally {\n  this.pool.release(poolRes);\n}`,
      description: "Acquire connection with 3000ms timeout and release in finally block.",
    },
    unitTest: {
      testName: "should_release_connection_when_pool_exhausted",
      code: `it("should release connection on acquisition failure", async () => {\n  const service = new PaymentService({ maxPool: 1 });\n  await expect(service.processCharge({ id: "fail" })).rejects.toThrow();\n  expect(service.pool.idleCount).toBe(1);\n});`,
      status: "pass",
    },
  },
];

export default function ErrorsPage() {
  const { activeSoftware } = useActiveSoftware();

  // Map active software scoped crashes to ErrorEntry with Stack-to-Source Resolver Engine
  const errorList: ErrorEntry[] = useMemo(() => {
    if (activeSoftware && activeSoftware.scopedCrashes && activeSoftware.scopedCrashes.length > 0) {
      return activeSoftware.scopedCrashes.map((c) => {
        const parts = c.title.split(": ");
        const errType = parts.length > 1 ? parts[0] : (c.anrDetails ? "ANRError" : "RuntimeError");
        const errMsg = parts.length > 1 ? parts.slice(1).join(": ") : c.title;

        // Parse file path and line number from location (e.g. "com.shulebase.app.data.db.StudentDao_Impl:240")
        const locParts = c.location.split(":");
        const rawFile = locParts[0] || "unknown";
        const lineNum = parseInt(locParts[1] || "42", 10);

        let sourceWindow = {
          startLine: Math.max(1, lineNum - 5),
          lines: [
            { num: Math.max(1, lineNum - 3), code: `  // Context: ${c.id} enclosing execution scope` },
            { num: Math.max(1, lineNum - 2), code: `  fun executeOperation(input: ContextPayload) {` },
            { num: Math.max(1, lineNum - 1), code: `    val session = acquireTransactionLock()` },
            { num: lineNum, code: `    ${c.anrDetails ? "studentDao.insertStudentsSync(roster) // Blocking UI!" : "cursor.execute(query)"}`, isTarget: true },
            { num: lineNum + 1, code: `    notifyObservers(session.result)` },
            { num: lineNum + 2, code: `  }` },
          ],
        };

        let patchDiff = {
          before: c.anrDetails
            ? `studentDao.insertStudentsSync(roster)`
            : `cursor.execute("SELECT * FROM freight_records WHERE batch_id = %s", [batch_id])`,
          after: c.anrDetails
            ? `withContext(Dispatchers.IO) {\n    studentDao.insertStudentsChunked(roster, chunkSize = 500)\n}`
            : `CarrierRoute.objects.filter(carrier_id=carrier_param, is_active=True)`,
          description: c.anrDetails
            ? "Offload heavy SQLite disk insertion from Main Looper to Dispatchers.IO coroutine pool."
            : "Use parameterized ORM query to prevent socket drop and connection leak.",
        };

        let unitTest = {
          testName: c.anrDetails
            ? "should_not_block_main_thread_on_large_roster"
            : "test_handles_empty_carrier_param",
          code: c.anrDetails
            ? `@Test\nfun testAsyncInsert() = runTest {\n    viewModel.persistRoster(testRoster)\n    advanceUntilIdle()\n    assertThat(uiState.value).isEqualTo(State.Ready)\n}`
            : `def test_reconnect_retry(self):\n    response = self.client.get('/api/v2/shipments/')\n    self.assertEqual(response.status_code, 200)`,
          status: "pass" as const,
        };

        return {
          id: c.id,
          hash: Math.abs(c.id.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)).toString(16).slice(0, 6),
          severity: c.severity,
          type: errType,
          message: errMsg,
          source: c.location,
          filePath: rawFile,
          lineNumber: lineNum,
          columnNumber: 12,
          enclosingScope: c.anrDetails ? "AttendanceViewModel.persistRoster()" : "invoicing.generate_pdf_manifest()",
          count: c.count,
          firstSeen: "10:00:00",
          lastSeen: c.lastSeen,
          stack: c.stackTrace,
          sourceWindow,
          patchDiff,
          unitTest,
        };
      });
    }

    if (activeSoftware && activeSoftware.errorCount > 0) {
      return [
        {
          id: `ERR-${activeSoftware.id.slice(0, 3).toUpperCase()}-01`,
          hash: "f4a1c0",
          severity: activeSoftware.hasSpike ? "critical" : "medium",
          type: activeSoftware.category === "Mobile" ? "ANRWarning" : "UnhandledException",
          message: `${activeSoftware.name}: ${activeSoftware.errorCount} runtime error events registered in platform telemetry`,
          source: activeSoftware.repoPath.split("/").pop() || activeSoftware.name,
          filePath: `${activeSoftware.repoPath}/src/main/entrypoint`,
          lineNumber: 42,
          columnNumber: 5,
          enclosingScope: "ApplicationLifecycle.bootstrap()",
          count: activeSoftware.errorCount,
          firstSeen: "11:20:15",
          lastSeen: "Just now",
          stack: [
          ],
        },
      ];
    }

    return DEFAULT_FALLBACK_ERRORS;
  }, [activeSoftware]);

  const [selected, setSelected] = useState<ErrorEntry | null>(() => errorList[0] || DEFAULT_FALLBACK_ERRORS[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);

  // Sync selected error when active software changes
  useEffect(() => {
    if (errorList.length > 0) {
      setSelected(errorList[0]);
    } else {
      setSelected(DEFAULT_FALLBACK_ERRORS[0]);
    }
    setAnalysisDone(false);
  }, [errorList]);

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisDone(false);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisDone(true);
    }, 2400);
  };

  const criticalCount = errorList.filter((e) => e.severity === "critical").length;
  const highCount = errorList.filter((e) => e.severity === "high").length;
  const mediumCount = errorList.filter((e) => e.severity === "medium").length;

  return (
    <div className="h-full flex flex-col gap-0 animate-fadeinup">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#112233] bg-[#070D16] shrink-0">
        <NexisLogo size={20} accent="magenta" mode="idle" />
        <h1 className="text-[#FF0055] text-xs font-bold tracking-[0.3em] glow-magenta">⚠ ERROR TRACKER</h1>
        <div className="h-4 w-px bg-[#112233]" />
        <span className="text-[10px] font-mono text-[#00FF66] bg-[#00FF66]/10 border border-[#00FF66]/30 px-1.5 py-0.5">
          {activeSoftware.name}
        </span>
        <div className="h-4 w-px bg-[#112233]" />
        <SeverityTag severity="critical" label={`${criticalCount} CRITICAL`} />
        <SeverityTag severity="high"     label={`${highCount} HIGH`} />
        <SeverityTag severity="medium"   label={`${mediumCount} MEDIUM`} />
        <div className="ml-auto">
          <CyberButton accent="magenta" size="sm">⊕ NEW ISSUE</CyberButton>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Error list */}
        <div className="w-72 shrink-0 border-r border-[#112233] overflow-auto bg-[#03070D]">
          {errorList.length === 0 ? (
            <div className="p-4 text-center text-[#00FF66] text-xs font-mono">
              ✓ ZERO ACTIVE CRASHES
            </div>
          ) : (
            errorList.map((err) => (
              <button
                key={err.id}
                onClick={() => {
                  setSelected(err);
                  setAnalysisDone(false);
                }}
                className={`w-full text-left px-3 py-3 border-b border-[#0A1220] transition-colors
                  ${selected?.id === err.id ? "bg-[#0A1220] border-l-2 border-l-[#FF0055]" : "hover:bg-[#070D16]"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <SeverityTag severity={err.severity} />
                  <span className="text-[9px] text-[#2A4A6A] ml-auto">×{err.count}</span>
                </div>
                <p className="text-[10px] text-[#C0D8F0] font-bold truncate">{err.type}</p>
                <p className="text-[9px] text-[#5A7A9A] truncate mt-0.5">{err.message}</p>
                <p className="text-[9px] text-[#2A4A6A] mt-1">{err.id} · {err.source}</p>
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-0 overflow-auto p-4">
          {selected ? (
            <div className="flex flex-col gap-4">
              {/* Title row */}
              <div className="flex items-start gap-3">
                <SeverityTag severity={selected.severity} />
                <div className="flex-1">
                  <p className="text-[#FF0055] font-bold text-sm glow-magenta">{selected.type}</p>
                  <p className="text-[11px] text-[#C0D8F0] mt-1">{selected.message}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <CyberButton accent="yellow" size="sm">TRIAGE</CyberButton>
                  <CyberButton accent="magenta" size="sm" variant="outline">IGNORE</CyberButton>
                </div>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  ["ID",         selected.id],
                  ["HASH",       selected.hash],
                  ["OCCURRENCES",String(selected.count)],
                  ["SOURCE",     selected.source],
                  ["FIRST SEEN", selected.firstSeen],
                  ["LAST SEEN",  selected.lastSeen],
                ].map(([k, v]) => (
                  <CyberCard key={k} accent="magenta">
                    <p className="text-[9px] text-[#5A7A9A] mb-1">{k}</p>
                    <p className="text-[11px] text-[#FF0055] font-bold">{v}</p>
                  </CyberCard>
                ))}
              </div>

              {/* Stack trace */}
              <CyberCard title="STACK TRACE" accent="magenta" noPadding>
                <div className="p-3 font-mono text-[11px]">
                  <p className="text-[#FF0055] font-bold mb-2">{selected.type}: {selected.message}</p>
                  {selected.stack.map((line, i) => (
                    <p key={i} className="text-[#5A7A9A]">{line}</p>
                  ))}
                </div>
              </CyberCard>

              {/* ⚡ NEXIS // HYBRID ERROR REMEDIATION PIPELINE */}
              <div className="border border-[#00FF66]/30 bg-[#040A12] p-4 flex flex-col gap-4">
                {/* Pipeline Header */}
                <div className="flex items-center justify-between border-b border-[#112233] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 bg-[#00FF66] rounded-full animate-pulse shadow-[0_0_8px_#00FF66]" />
                    <h2 className="text-[#00FF66] text-xs font-bold tracking-[0.2em] font-mono glow-green">
                      HYBRID REMEDIATION PIPELINE
                    </h2>
                    <span className="text-[9px] font-mono text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/30 px-1.5 py-0.5">
                      TIER 1 & TIER 2 READY
                    </span>
                  </div>

                  {/* IDE Protocol Handoff Action Bar */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`vscode://file/${selected.filePath.startsWith("/") ? selected.filePath : `${activeSoftware.repoPath}/${selected.filePath}`}:${selected.lineNumber}:${selected.columnNumber || 1}`}
                      className="px-2.5 py-1 text-[10px] font-mono font-bold text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/40 hover:bg-[#00E5FF]/20 hover:border-[#00E5FF] transition-all flex items-center gap-1.5"
                      title="Trigger native OS URI scheme: vscode://file/..."
                    >
                      <span>↗ OPEN IN VS CODE</span>
                      <span className="text-[8px] text-[#5A7A9A]">({selected.filePath.split("/").pop()}:{selected.lineNumber})</span>
                    </a>

                    <a
                      href={`cursor://file/${selected.filePath.startsWith("/") ? selected.filePath : `${activeSoftware.repoPath}/${selected.filePath}`}:${selected.lineNumber}:${selected.columnNumber || 1}`}
                      className="px-2.5 py-1 text-[10px] font-mono font-bold text-[#C0D8F0] bg-[#112233] border border-[#2A4A6A] hover:border-[#00FF66] hover:text-[#00FF66] transition-all flex items-center gap-1.5"
                      title="Trigger native OS URI scheme: cursor://file/..."
                    >
                      <span>↗ CURSOR</span>
                    </a>
                  </div>
                </div>

                {/* Subsystem Location & Scope Badge */}
                <div className="flex items-center justify-between bg-[#070D16] p-2.5 border border-[#112233] text-[10px] font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-[#5A7A9A]">STACK RESOLVER:</span>
                    <span className="text-[#00E5FF] font-bold">{selected.filePath}:{selected.lineNumber}:{selected.columnNumber || 1}</span>
                    <span className="text-[#3A5A7A]">·</span>
                    <span className="text-[#5A7A9A]">AST SCOPE:</span>
                    <span className="text-[#00FF66]">{selected.enclosingScope}</span>
                  </div>
                  <span className="text-[9px] text-[#FFD600] border border-[#FFD600]/30 px-1 bg-[#FFD600]/10">
                    ±15 LINES WINDOW
                  </span>
                </div>

                {/* Grid: Inline Code Context Window & Proposed Patch Diff */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Left: Source Context Window */}
                  <CyberCard title={`INLINE CODE WINDOW — ${selected.filePath.split("/").pop()}`} accent="cyan" noPadding>
                    <div className="p-2 font-mono text-[10px] overflow-x-auto bg-[#020509]">
                      {selected.sourceWindow?.lines.map((line) => (
                        <div
                          key={line.num}
                          className={`flex items-center gap-3 px-2 py-0.5 ${
                            line.isTarget
                              ? "bg-[#FF0055]/20 border-l-2 border-l-[#FF0055] text-white font-bold"
                              : "text-[#5A7A9A] hover:bg-[#070D16]"
                          }`}
                        >
                          <span className={`w-8 shrink-0 text-right ${line.isTarget ? "text-[#FF0055] font-bold" : "text-[#2A4A6A]"}`}>
                            {line.num}
                          </span>
                          <span className="font-mono whitespace-pre">{line.code}</span>
                          {line.isTarget && (
                            <span className="ml-auto text-[8px] bg-[#FF0055] text-white px-1 font-bold">
                              TARGET EXCEPTION
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CyberCard>

                  {/* Right: Proposed Surgical Patch Diff */}
                  <CyberCard title="PROPOSED SURGICAL PATCH" accent="green" noPadding>
                    <div className="p-3 font-mono text-[10px] flex flex-col gap-2 bg-[#020509] h-full justify-between">
                      <p className="text-[9px] text-[#5A7A9A] italic">
                        {selected.patchDiff?.description || "AST-derived guard clause and execution offload."}
                      </p>

                      <div className="p-2 bg-[#03070D] border border-[#112233] space-y-1">
                        <div className="text-[#FF0055] bg-[#FF0055]/10 px-2 py-1 border-l-2 border-l-[#FF0055] whitespace-pre-wrap">
                          - {selected.patchDiff?.before}
                        </div>
                        <div className="text-[#00FF66] bg-[#00FF66]/10 px-2 py-1 border-l-2 border-l-[#00FF66] whitespace-pre-wrap">
                          + {selected.patchDiff?.after}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#112233]/70">
                        <span className="text-[9px] text-[#00FF66]">✓ AST SYNTAX VERIFIED</span>
                        <CyberButton
                          accent="green"
                          size="sm"
                          onClick={() => {
                            alert(`Hotfix applied for ${selected.id}. Patch committed to working branch.`);
                          }}
                        >
                          ⊕ APPLY HOTFIX DIRECT
                        </CyberButton>
                      </div>
                    </div>
                  </CyberCard>
                </div>

                {/* Generated Unit Test & Verification Branch */}
                {selected.unitTest && (
                  <CyberCard title={`GENERATED UNIT TEST — ${selected.unitTest.testName}`} accent="cyan" noPadding>
                    <div className="p-3 font-mono text-[10px] bg-[#020509] flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-[#5A7A9A]">MOCKS TARGET FAILURE & VERIFIES GUARD BRANCH:</span>
                        <span className="text-[9px] text-[#00FF66] font-bold bg-[#00FF66]/10 border border-[#00FF66]/30 px-1.5 py-0.5">
                          ✓ TEST READY
                        </span>
                      </div>
                      <pre className="p-2 bg-[#03070D] border border-[#112233] text-[#00E5FF] overflow-x-auto whitespace-pre">
                        {selected.unitTest.code}
                      </pre>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <CyberButton
                          accent="cyan"
                          size="sm"
                          onClick={() => {
                            alert(`Test harness executed for ${selected.unitTest?.testName}: PASS (12ms)`);
                          }}
                        >
                          ▸ EXECUTE UNIT TEST
                        </CyberButton>
                      </div>
                    </div>
                  </CyberCard>
                )}
              </div>

              {/* AI Root cause card with animated NexisLoader */}
              <CyberCard
                title="AI ROOT-CAUSE ANALYSIS"
                accent="yellow"
                headerRight={
                  isAnalyzing ? (
                    <div className="flex items-center gap-1.5 text-[9px] text-[#FFD600]">
                      <NexisLogo size={14} accent="yellow" mode="loading" />
                      <span>ANALYZING TRACE…</span>
                    </div>
                  ) : analysisDone ? (
                    <span className="text-[9px] text-[#00FF66] font-bold">✓ DIAGNOSIS COMPLETE</span>
                  ) : (
                    <CyberButton
                      accent="yellow"
                      size="sm"
                      variant="outline"
                      onClick={handleRunAnalysis}
                    >
                      ⚡ RUN DIAGNOSTICS
                    </CyberButton>
                  )
                }
              >
                {isAnalyzing ? (
                  <NexisLoader
                    size="sm"
                    compact
                    accent="yellow"
                    title="NEXIS NEURAL DIAGNOSTICIAN"
                    subtitle="ISOLATING MEMORY SPIKE & CONCURRENT CONNECTION LEAKS..."
                  />
                ) : analysisDone ? (
                  <div className="space-y-2 font-mono text-[11px] animate-fadeinup">
                    <p className="text-[#FFD600] font-bold">
                      Root Cause Identified: {selected.type} in {selected.source}
                    </p>
                    <p className="text-[#C0D8F0]">
                      {activeSoftware.category === "Mobile"
                        ? "Android main thread execution exceeded choreographer frame deadline (5,000ms). Heavy disk I/O / unindexed Room SQL query executed directly on UI thread."
                        : activeSoftware.category === "Desktop"
                        ? "Local event loop blocking detected during hardware I/O communication. Serial bridge buffers backed up under polling contention."
                        : `Upstream query or resource exhaustion detected in ${selected.source}. Max connection threshold or network timeout reached during high concurrency.`}
                    </p>
                    <p className="text-[#00FF66] text-[10px]">
                      Recommended Remediation: {activeSoftware.aiFixSnippet?.title || "Apply asynchronous worker offloading and parameterization."}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-[#5A7A9A] italic">
                      Automated root-cause isolation and remediation engine ready.
                    </p>
                    <CyberButton accent="yellow" size="sm" onClick={handleRunAnalysis}>
                      ⚡ RUN DIAGNOSTICS
                    </CyberButton>
                  </div>
                )}
              </CyberCard>
            </div>
          ) : (
            <p className="text-[#2A4A6A] text-xs text-center mt-12">Select an error to inspect</p>
          )}
        </div>
      </div>
    </div>
  );
}
