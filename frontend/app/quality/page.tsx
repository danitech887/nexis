"use client";

import { useState, useMemo } from "react";
import CyberCard from "@/components/ui/CyberCard";
import CyberButton from "@/components/ui/CyberButton";
import AstInspector from "@/components/code/AstInspector";
import NexisLogo from "@/components/ui/NexisLogo";
import NexisLoader from "@/components/ui/NexisLoader";
import { useActiveSoftware } from "@/lib/ActiveSoftwareContext";

interface FileMetric {
  file: string;
  cc: number;
  loc: number;
  funcs: number;
  coverage: string;
  debt: string;
}

const DEFAULT_FILE_METRICS: FileMetric[] = [
  { file: "payment/service.ts",   cc: 14, loc: 312, funcs: 8,  coverage: "62%",  debt: "4h" },
  { file: "auth/jwt.strategy.ts", cc: 8,  loc: 145, funcs: 6,  coverage: "88%",  debt: "1h" },
  { file: "db/query-runner.ts",   cc: 22, loc: 421, funcs: 15, coverage: "44%",  debt: "8h" },
  { file: "ui/dashboard.tsx",     cc: 5,  loc: 210, funcs: 12, coverage: "71%",  debt: "2h" },
  { file: "search/engine.ts",     cc: 18, loc: 378, funcs: 11, coverage: "55%",  debt: "6h" },
];

function CcBadge({ v }: { v: number }) {
  const color = v <= 5 ? "#00FF66" : v <= 10 ? "#FFD600" : v <= 20 ? "#FF4400" : "#FF0055";
  return <span className="font-bold text-[11px]" style={{ color }}>{v}</span>;
}

function CovBar({ pct }: { pct: string }) {
  const n = parseInt(pct);
  const color = n >= 80 ? "#00FF66" : n >= 60 ? "#FFD600" : "#FF0055";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1 bg-[#112233]">
        <div className="h-full" style={{ width: pct, background: color }} />
      </div>
      <span className="text-[10px]" style={{ color }}>{pct}</span>
    </div>
  );
}

export default function QualityPage() {
  const { activeSoftware } = useActiveSoftware();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 2000);
  };

  // Generate AST tree from active software AST highlight
  const astTree = useMemo(() => {
    if (activeSoftware && activeSoftware.astHighlight) {
      const { rootClass, loc, methods } = activeSoftware.astHighlight;
      return {
        name: rootClass,
        type: activeSoftware.category === "Mobile" ? "viewModel" : "class",
        complexity: 0,
        lines: loc,
        children: methods.map((m) => ({
          name: m.name,
          type: "method",
          complexity: m.complexity,
          lines: m.lines,
        })),
      };
    }
    return {
      name: "PaymentService",
      type: "class",
      complexity: 0,
      lines: 312,
      children: [
        { name: "processCharge()", type: "method", complexity: 14, lines: 68 },
        { name: "refundCharge()",  type: "method", complexity: 6,  lines: 44 },
      ],
    };
  }, [activeSoftware]);

  // Contextual file metrics matching active software platform
  const fileMetrics: FileMetric[] = useMemo(() => {
    if (activeSoftware.id === "shulebase-android") {
      return [
        { file: "ui/attendance/AttendanceViewModel.kt", cc: 16, loc: 340, funcs: 9,  coverage: "54%", debt: "6h" },
        { file: "data/db/StudentDao_Impl.java",         cc: 28, loc: 480, funcs: 14, coverage: "42%", debt: "9h" },
        { file: "data/pref/AuthPreferences.kt",         cc: 4,  loc: 95,  funcs: 4,  coverage: "85%", debt: "1h" },
        { file: "network/NoticeClient.kt",              cc: 12, loc: 210, funcs: 7,  coverage: "68%", debt: "3h" },
        { file: "sync/SyncWorker.kt",                   cc: 8,  loc: 180, funcs: 5,  coverage: "74%", debt: "2h" },
      ];
    }
    if (activeSoftware.id === "apex-logistics") {
      return [
        { file: "logistics/views/rates.py",      cc: 18, loc: 480, funcs: 12, coverage: "58%", debt: "7h" },
        { file: "logistics/tasks/invoicing.py",  cc: 14, loc: 310, funcs: 8,  coverage: "62%", debt: "5h" },
        { file: "api/webhooks.py",               cc: 9,  loc: 165, funcs: 6,  coverage: "78%", debt: "2h" },
        { file: "logistics/models/shipment.py",  cc: 6,  loc: 240, funcs: 15, coverage: "84%", debt: "2h" },
        { file: "core/carrier_routing.py",       cc: 21, loc: 410, funcs: 11, coverage: "49%", debt: "8h" },
      ];
    }
    if (activeSoftware.id === "entrymind-desktop") {
      return [
        { file: "ui/kiosk_window.py",         cc: 5, loc: 520, funcs: 18, coverage: "92%", debt: "1h" },
        { file: "hardware/rfid_listener.py",  cc: 7, loc: 140, funcs: 6,  coverage: "88%", debt: "1h" },
        { file: "core/database.py",           cc: 4, loc: 190, funcs: 8,  coverage: "95%", debt: "0h" },
        { file: "sync/cloud_daemon.py",       cc: 6, loc: 220, funcs: 7,  coverage: "86%", debt: "2h" },
      ];
    }
    return DEFAULT_FILE_METRICS;
  }, [activeSoftware]);

  // Compute summary stats dynamically
  const avgComplexity = (
    fileMetrics.reduce((acc, f) => acc + f.cc, 0) / fileMetrics.length
  ).toFixed(1);
  const avgCoverage = Math.round(
    fileMetrics.reduce((acc, f) => acc + parseInt(f.coverage), 0) / fileMetrics.length
  );
  const totalDebt = fileMetrics.reduce((acc, f) => acc + parseInt(f.debt), 0);

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-4 animate-fadeinup">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NexisLogo size={30} accent="cyan" mode={isAnalyzing ? "loading" : "idle"} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[#00E5FF] text-sm font-bold tracking-[0.3em] glow-cyan">◎ CODE QUALITY & DOCS</h1>
              <span className="text-[10px] font-mono text-[#00FF66] bg-[#00FF66]/10 border border-[#00FF66]/30 px-1.5 py-0.5">
                {activeSoftware.name}
              </span>
            </div>
            <p className="text-[#2A4A6A] text-[10px] tracking-widest mt-0.5">
              {activeSoftware.platform.toUpperCase()} · CYCLOMATIC COMPLEXITY · COVERAGE HEATMAPS
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <CyberButton
            accent="cyan"
            size="sm"
            disabled={isAnalyzing}
            onClick={handleAnalyze}
          >
            {isAnalyzing ? (
              <span className="inline-flex items-center gap-1.5">
                <NexisLogo size={14} accent="cyan" mode="loading" />
                ANALYZING AST…
              </span>
            ) : (
              "⟳ ANALYZE"
            )}
          </CyberButton>
          <CyberButton accent="cyan" size="sm" variant="outline">⊕ GEN DOCS</CyberButton>
        </div>
      </div>

      {/* Analysis Banner */}
      {isAnalyzing && (
        <div className="p-3 bg-[#070D16] border border-[#00E5FF]/40 animate-fadeinup">
          <NexisLoader
            size="sm"
            compact
            accent="cyan"
            title="STATIC AST TRAVERSAL"
            subtitle={`CALCULATING MCCABE CYCLOMATIC COMPLEXITY MATRIX FOR ${activeSoftware.name.toUpperCase()}...`}
          />
        </div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:"AVG COMPLEXITY", val:avgComplexity, sub: Number(avgComplexity) > 10 ? "↑ elevated" : "● nominal", color: Number(avgComplexity) > 10 ? "#FF4400" : "#00FF66" },
          { label:"AVG COVERAGE",   val:`${avgCoverage}%`, sub: avgCoverage >= 80 ? "↑ high" : "↓ low", color: avgCoverage >= 80 ? "#00FF66" : "#FFD600" },
          { label:"TECH DEBT",      val:`${totalDebt}h`, sub:"total", color: totalDebt > 10 ? "#FF0055" : "#00FF66" },
          { label:"HEALTH SCORE",   val:`${activeSoftware.healthScore}/100`, sub: activeSoftware.vitals, color: activeSoftware.vitals === "OK" ? "#00FF66" : "#FFD600" },
        ].map((s) => (
          <CyberCard key={s.label} accent="cyan" className="h-20">
            <p className="text-[9px] text-[#5A7A9A] mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.val}</p>
            <p className="text-[9px] text-[#2A4A6A]">{s.sub}</p>
          </CyberCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-[400px]">
        {/* File metrics table */}
        <CyberCard title={`FILE COMPLEXITY HEATMAP — ${activeSoftware.name.toUpperCase()}`} accent="cyan" noPadding>
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="border-b border-[#112233] text-[9px] text-[#5A7A9A] tracking-widest">
                {["FILE","CC","LOC","FUNCS","COVERAGE","DEBT"].map((h) => (
                  <th key={h} className="text-left px-2 py-2 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fileMetrics.map((f) => (
                <tr key={f.file} className="border-b border-[#0A1220] hover:bg-[#0A1220] transition-colors">
                  <td className="px-2 py-2 text-[#00E5FF] truncate max-w-[140px]">{f.file}</td>
                  <td className="px-2 py-2"><CcBadge v={f.cc} /></td>
                  <td className="px-2 py-2 text-[#5A7A9A]">{f.loc}</td>
                  <td className="px-2 py-2 text-[#5A7A9A]">{f.funcs}</td>
                  <td className="px-2 py-2"><CovBar pct={f.coverage} /></td>
                  <td className="px-2 py-2 text-[#FF0055]">{f.debt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CyberCard>

        {/* AST Inspector */}
        <CyberCard title="AST INSPECTOR" subtitle={astTree.name} accent="cyan" noPadding className="min-h-[350px]">
          <AstInspector tree={astTree} />
        </CyberCard>
      </div>
    </div>
  );
}
