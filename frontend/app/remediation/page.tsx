"use client";

import { useState, useMemo, useEffect } from "react";
import CyberCard from "@/components/ui/CyberCard";
import CyberButton from "@/components/ui/CyberButton";
import SeverityTag from "@/components/ui/SeverityTag";
import DiffViewer from "@/components/code/DiffViewer";
import NexisLogo from "@/components/ui/NexisLogo";
import NexisLoader from "@/components/ui/NexisLoader";
import { useActiveSoftware } from "@/lib/ActiveSoftwareContext";

const DEFAULT_BEFORE = `async function processCharge(payload: PaymentPayload) {
  const conn = await pool.acquire();
  const query = "SELECT * FROM payments WHERE id = " + payload.id;
  const result = await conn.query(query);
  if (!result) throw new Error("Payment not found");
  await chargeStripe(result, payload.amount);
  return { success: true };
}`;

const DEFAULT_AFTER = `async function processCharge(payload: PaymentPayload) {
  validatePayload(payload);
  const conn = await pool.acquire();
  // Use parameterized query to prevent SQL injection
  const query = "SELECT * FROM payments WHERE id = $1";
  const result = await conn.query(query, [payload.id]);
  if (!result) throw new NotFoundError(\`Payment \${payload.id} not found\`);
  await chargeStripe(result, payload.amount);
  pool.release(conn);
  return { success: true, timestamp: Date.now() };
}`;

const DEFAULT_TEST_CASES = [
  { name: "should process valid charge",           status: "pass" as const },
  { name: "should reject invalid payload",         status: "pass" as const },
  { name: "should handle pool exhaustion",         status: "fail" as const },
  { name: "should retry on network error",         status: "pass" as const },
  { name: "should release connection after error", status: "pending" as const },
];

const STATUS_COLOR = { pass: "#00FF66", fail: "#FF0055", pending: "#FFD600" };
const STATUS_ICON  = { pass: "✓", fail: "✗", pending: "○" };

export default function RemediationPage() {
  const { activeSoftware } = useActiveSoftware();
  const [activeTab, setActiveTab] = useState<"diff"|"tests"|"hotfix">("diff");
  const [runningTests, setRunningTests] = useState(false);

  // Load contextual AI fix data from active software
  const fixData = useMemo(() => {
    if (activeSoftware && activeSoftware.aiFixSnippet) {
      return {
        title: activeSoftware.aiFixSnippet.title,
        file: activeSoftware.aiFixSnippet.file,
        diffBefore: activeSoftware.aiFixSnippet.diffBefore,
        diffAfter: activeSoftware.aiFixSnippet.diffAfter,
        tests: activeSoftware.aiFixSnippet.tests,
      };
    }
    return {
      title: "SQL Injection fix + connection cleanup",
      file: "payment/service.ts",
      diffBefore: DEFAULT_BEFORE,
      diffAfter: DEFAULT_AFTER,
      tests: DEFAULT_TEST_CASES,
    };
  }, [activeSoftware]);

  const [testResults, setTestResults] = useState(fixData.tests);

  // Sync test results when active software changes
  useEffect(() => {
    setTestResults(fixData.tests);
  }, [fixData]);

  const runTests = () => {
    setRunningTests(true);
    setTimeout(() => {
      setTestResults((prev) =>
        prev.map((t) =>
          t.status === "pending" ? { ...t, status: "pass" } : t
        )
      );
      setRunningTests(false);
    }, 2400);
  };

  return (
    <div className="h-full flex flex-col gap-0 animate-fadeinup">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#112233] bg-[#070D16] shrink-0">
        <NexisLogo size={20} accent="green" mode={runningTests ? "loading" : "idle"} />
        <h1 className="text-[#00FF66] text-xs font-bold tracking-[0.3em] glow-green">✦ DEBUGGER & REMEDIATION</h1>
        <div className="h-4 w-px bg-[#112233]" />
        <span className="text-[10px] font-mono text-[#00FF66] bg-[#00FF66]/10 border border-[#00FF66]/30 px-1.5 py-0.5">
          {activeSoftware.name}
        </span>
        <div className="h-4 w-px bg-[#112233]" />
        <SeverityTag severity="critical" label="PATCH READY" />
        <div className="ml-auto flex gap-2">
          <CyberButton accent="green"   size="sm">⊕ APPLY PATCH</CyberButton>
          <CyberButton accent="magenta" size="sm" variant="outline">⊗ REVERT</CyberButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#112233] bg-[#03070D] shrink-0">
        {(["diff","tests","hotfix"] as const).map((tab) => {
          const labels = { diff:"PATCH DIFF", tests:"UNIT TESTS", hotfix:"HOTFIX RUNNER" };
          const colors = { diff:"#00FF66", tests:"#00E5FF", hotfix:"#FF0055" };
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 text-[10px] font-bold tracking-widest transition-colors border-b-2"
              style={{
                color:       active ? colors[tab] : "#2A4A6A",
                borderColor: active ? colors[tab] : "transparent",
                background:  active ? `${colors[tab]}08` : "transparent",
              }}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "diff" && (
          <div className="h-full p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <CyberCard accent="green" className="px-3 py-1 text-[9px] text-[#00FF66]">
                {fixData.file}
              </CyberCard>
              <span className="text-[9px] text-[#5A7A9A]">{fixData.title}</span>
            </div>
            <div className="flex-1 min-h-0">
              <DiffViewer before={fixData.diffBefore} after={fixData.diffAfter} filename={fixData.file} />
            </div>
          </div>
        )}

        {activeTab === "tests" && (
          <div className="h-full p-4 flex flex-col gap-4 overflow-auto">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#5A7A9A]">
                {testResults.filter((t) => t.status === "pass").length}/{testResults.length} passing
              </span>
              <CyberButton
                accent="cyan"
                size="sm"
                onClick={runTests}
                disabled={runningTests}
              >
                {runningTests ? (
                  <span className="inline-flex items-center gap-1.5">
                    <NexisLogo size={14} accent="cyan" mode="loading" />
                    RUNNING TEST SUITE…
                  </span>
                ) : (
                  "▸ RUN TESTS"
                )}
              </CyberButton>
              <CyberButton accent="green" size="sm" variant="outline">⊕ GEN TESTS</CyberButton>
            </div>

            {/* Live animated test runner status when running */}
            {runningTests && (
              <div className="p-3 bg-[#070D16] border border-[#00E5FF]/40 animate-fadeinup">
                <NexisLoader
                  size="sm"
                  compact
                  accent="cyan"
                  title="TEST HARNESS RUNNING"
                  subtitle={`EVALUATING REGRESSION MATRIX FOR ${activeSoftware.name.toUpperCase()}...`}
                />
              </div>
            )}

            <CyberCard title={`TEST SUITE — ${fixData.file.split("/").pop()}`} accent="cyan" noPadding>
              {testResults.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 border-b border-[#0A1220] last:border-0"
                >
                  <span
                    className="font-bold text-sm w-4 shrink-0"
                    style={{ color: STATUS_COLOR[t.status] }}
                  >
                    {runningTests && t.status === "pending" ? (
                      <NexisLogo size={14} accent="yellow" mode="loading" />
                    ) : STATUS_ICON[t.status]}
                  </span>
                  <span className="flex-1 text-[11px] text-[#C0D8F0] font-mono">{t.name}</span>
                  <span
                    className="text-[9px] font-bold tracking-widest"
                    style={{ color: STATUS_COLOR[t.status] }}
                  >
                    {t.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </CyberCard>
          </div>
        )}

        {activeTab === "hotfix" && (
          <div className="h-full p-4 flex flex-col gap-4 overflow-auto">
            <CyberCard title="HOTFIX PIPELINE" accent="magenta">
              <div className="flex flex-col gap-3">
                {[
                  { step:"01", label:"Checkout branch",        status:"done"    },
                  { step:"02", label:"Apply patch diff",       status:"done"    },
                  { step:"03", label:"Run unit tests",         status:"done"    },
                  { step:"04", label:"Build & type-check",     status:"running" },
                  { step:"05", label:"Deploy to staging",      status:"pending" },
                  { step:"06", label:"Smoke tests",            status:"pending" },
                  { step:"07", label:"Merge to production",    status:"pending" },
                ].map((s) => {
                  const color  = s.status === "done" ? "#00FF66" : s.status === "running" ? "#00E5FF" : "#2A4A6A";
                  return (
                    <div key={s.step} className="flex items-center gap-3">
                      <span className="text-[9px] text-[#2A4A6A] w-4">{s.step}</span>
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        {s.status === "running" ? (
                          <NexisLogo size={18} accent="cyan" mode="loading" />
                        ) : (
                          <span className="text-sm font-bold" style={{ color }}>
                            {s.status === "done" ? "✓" : "○"}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px]" style={{ color }}>{s.label}</span>
                      {s.status === "running" && (
                        <span className="text-[9px] text-[#00E5FF] animate-pulse ml-auto">
                          EXECUTING...
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CyberCard>
            <div className="flex gap-2">
              <CyberButton accent="green"   size="md">▸ CONTINUE PIPELINE</CyberButton>
              <CyberButton accent="magenta" size="md" variant="outline">⊗ ABORT HOTFIX</CyberButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
