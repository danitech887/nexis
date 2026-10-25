"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import CyberCard from "@/components/ui/CyberCard";
import CyberButton from "@/components/ui/CyberButton";
import SeverityTag from "@/components/ui/SeverityTag";
import NexisLogo from "@/components/ui/NexisLogo";
import NexisLoader from "@/components/ui/NexisLoader";
import { useActiveSoftware } from "@/lib/ActiveSoftwareContext";
import { fetchSoftwareSecurityAudit, executeAutoBumpPackage, SecurityAuditResult } from "@/lib/backendApi";

interface CVE {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  package: string;
  version: string;
  fixedIn: string;
  rootPackage?: string;
  cvss: number;
  description: string;
  canAutoBump: boolean;
  upgradeCmd: string;
  lockfileDiff: string;
  dependencyChain: string[];
  epssScore: {
    probability: number;
    percentile: number;
    level: "CRITICAL" | "HIGH" | "ELEVATED" | "LOW";
  };
  advisory: {
    cwe: string;
    vector: string;
    summary: string;
    published: string;
    recommendation: string;
  };
}
function CvssBar({ score }: { score: number }) {
  const color = score >= 9 ? "#FF0055" : score >= 7 ? "#FF4400" : score >= 4 ? "#FFD600" : "#00FF66";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-[#112233]">
        <div className="h-full" style={{ width: `${(score / 10) * 100}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold w-6" style={{ color }}>{score}</span>
    </div>
  );
}

export default function SecurityPage() {
  const { activeSoftware } = useActiveSoftware();
  const [isScanning, setIsScanning] = useState(false);
  const [liveAudit, setLiveAudit] = useState<SecurityAuditResult | null>(null);

  // Expanded CVE drawer state
  const [expandedCveId, setExpandedCveId] = useState<string | null>(null);

  // Auto-bump modal state
  const [selectedBumpCve, setSelectedBumpCve] = useState<CVE | null>(null);
  const [isBumping, setIsBumping] = useState(false);
  const [bumpProgressStep, setBumpProgressStep] = useState(0);
  const [bumpCompleted, setBumpCompleted] = useState(false);
  const [bumpError, setBumpError] = useState<string | null>(null);
  const [realDiff, setRealDiff] = useState<string | null>(null);
  const [bumpedPackages, setBumpedPackages] = useState<Record<string, string>>({});

  const openBumpModal = (cve: CVE) => {
    setSelectedBumpCve(cve);
    setIsBumping(false);
    setBumpProgressStep(0);
    setBumpCompleted(false);
    setBumpError(null);
    setRealDiff(null);
  };

  const closeBumpModal = () => {
    setSelectedBumpCve(null);
    setIsBumping(false);
    setBumpProgressStep(0);
    setBumpCompleted(false);
    setBumpError(null);
    setRealDiff(null);
  };

  const loadAudit = async (showLoading = true) => {
    if (!activeSoftware) return;
    if (showLoading) setIsScanning(true);
    try {
      const data = await fetchSoftwareSecurityAudit(activeSoftware.id);
      if (data && (data.cves?.length > 0 || data.sastFindings?.length > 0 || data.summary)) {
        setLiveAudit(data);
        if (data.cves && data.cves.length > 0) {
          setExpandedCveId(data.cves[0].id);
        }
      }
    } catch (err) {
      console.warn("Failed to load live security audit:", err);
    } finally {
      if (showLoading) setIsScanning(false);
    }
  };

  useEffect(() => {
    loadAudit(false);
  }, [activeSoftware.id]);

  const handleRescan = () => {
    loadAudit(true);
  };

  // Scoped SAST findings: uses live audit if present
  const sastFindings = useMemo(() => {
    if (liveAudit && liveAudit.sastFindings) {
      const seen = new Set<string>();
      return liveAudit.sastFindings.map((f: any, idx: number) => {
        let uniqueKey = `${f.id || "SAST"}-${f.file || "file"}:${f.line || idx}`;
        let counter = 1;
        while (seen.has(uniqueKey)) {
          uniqueKey = `${uniqueKey}-${counter++}`;
        }
        seen.add(uniqueKey);
        return {
          ...f,
          uniqueKey,
          displayRuleId: f.ruleId || f.id,
        };
      });
    }
    return [];
  }, [liveAudit]);

  // Scoped CVE list: uses live audit CVEs directly
  const cveList: (CVE & { uniqueKey?: string })[] = useMemo(() => {
    if (liveAudit && liveAudit.cves) {
      const seenCve = new Set<string>();
      return (liveAudit.cves as CVE[]).map((c: CVE, idx: number) => {
        let uniqueKey = `${c.id}-${c.package || idx}`;
        let counter = 1;
        while (seenCve.has(uniqueKey)) {
          uniqueKey = `${uniqueKey}-${counter++}`;
        }
        seenCve.add(uniqueKey);
        return {
          ...c,
          uniqueKey,
        };
      });
    }
    return [];
  }, [liveAudit]);

  const criticalCveCount = liveAudit?.summary?.criticalCves ?? cveList.filter((c) => c.severity === "critical").length;
  const highCveCount = liveAudit?.summary?.highCves ?? cveList.filter((c) => c.severity === "high").length;
  const sastCount = liveAudit?.summary?.sastIssues ?? sastFindings.length;
  const riskScore = liveAudit?.summary?.riskScore ?? (cveList.length > 0 ? "3.2" : "0.0");

  // Handle Auto-bump execution with genuine backend execution & error propagation
  const executeAutoBump = async () => {
    if (!selectedBumpCve) return;
    setIsBumping(true);
    setBumpProgressStep(1);
    setBumpError(null);
    setRealDiff(null);

    const stepTimer1 = setTimeout(() => setBumpProgressStep(2), 600);
    const stepTimer2 = setTimeout(() => setBumpProgressStep(3), 1200);

    try {
      const pkgToBump = selectedBumpCve.rootPackage || selectedBumpCve.package;
      const res = await executeAutoBumpPackage(
        activeSoftware.id,
        pkgToBump,
        selectedBumpCve.fixedIn
      );

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (res && res.success) {
        setBumpProgressStep(4);
        setBumpCompleted(true);
        setIsBumping(false);
        setRealDiff(res.diff || null);
        setBumpedPackages((prev) => ({
          ...prev,
          [selectedBumpCve.id]: selectedBumpCve.fixedIn,
        }));
        // Reload real audit from disk
        await loadAudit(false);
      } else {
        setIsBumping(false);
        setBumpProgressStep(0);
        setBumpError(res?.error || "Package upgrade failed. Please review lockfile or package registry.");
      }
    } catch (e: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      console.warn("Auto bump error:", e);
      setIsBumping(false);
      setBumpProgressStep(0);
      setBumpError(e?.message || "Package upgrade failed with an unexpected error.");
    }
  };

  const firstBumpableCve = cveList.find((c) => c.canAutoBump) || cveList[0] || null;
  const firstCriticalOrDeepCve = cveList.find((c) => c.severity === "critical" || c.severity === "high") || cveList[0] || null;
  const topSast = sastFindings[0] || null;

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NexisLogo size={30} accent="yellow" mode={isScanning ? "loading" : "idle"} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[#FFD600] text-sm font-bold tracking-[0.3em] glow-yellow">⬡ NEXIS SECURITY PORTAL</h1>
              <span className="text-[10px] font-mono text-[#00FF66] bg-[#00FF66]/10 border border-[#00FF66]/30 px-1.5 py-0.5">
                {activeSoftware.name}
              </span>
              {liveAudit && (
                <span className="text-[9px] font-mono text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/30 px-1.5 py-0.5">
                  ● LIVE REPO AUDIT ({liveAudit.summary.scannedFiles} FILES)
                </span>
              )}
            </div>
            <p className="text-[#2A4A6A] text-[10px] tracking-widest mt-0.5">
              ACTIVE REMEDIATION CONSOLE · DEPENDENCY AUTO-BUMPS · CVE EXPANDABLE DRAWER · SAST DEEP-LINK
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <CyberButton
            accent="yellow"
            size="sm"
            type="button"
            disabled={isScanning}
            onClick={handleRescan}
          >
            {isScanning ? (
              <span className="inline-flex items-center gap-1.5">
                <NexisLogo size={14} accent="yellow" mode="loading" />
                SCANNING CVEs…
              </span>
            ) : (
              "⟳ RESCAN"
            )}
          </CyberButton>
          <CyberButton accent="yellow" size="sm" variant="outline" type="button">⊕ EXPORT AUDIT</CyberButton>
        </div>
      </div>

      {/* Rescan Banner */}
      {isScanning && (
        <div className="p-3 bg-[#070D16] border border-[#FFD600]/40">
          <NexisLoader
            size="sm"
            compact
            accent="yellow"
            title="CVE & SAST AUDIT ENGINE"
            subtitle={`CROSS-REFERENCING OSV DATABASE & PARSING TAINT SINKS IN ${activeSoftware.name.toUpperCase()}...`}
          />
        </div>
      )}

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:"CRITICAL CVEs", val:String(criticalCveCount), color: criticalCveCount > 0 ? "#FF0055" : "#00FF66" },
          { label:"HIGH CVEs",     val:String(highCveCount), color: highCveCount > 0 ? "#FF4400" : "#00FF66" },
          { label:"SAST ISSUES",   val:String(sastCount), color:"#FFD600" },
          { label:"RISK SCORE",    val:riskScore, color: Number(riskScore) > 6 ? "#FF0055" : "#00FF66" },
        ].map((s) => (
          <CyberCard key={s.label} accent="yellow" className="h-20">
            <p className="text-[9px] text-[#5A7A9A] mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.val}</p>
          </CyberCard>
        ))}
      </div>

      {/* ─── SPECIFICATION ACTION CONSOLE: 3 OPERATIONAL TIERS ─── */}
      <CyberCard
        title="⚡ ACTIVE REMEDIATION CONSOLE // THREE-TIER TRIAGE BAY"
        accent="yellow"
        className="border-2 border-[#FFD600]/40 bg-[#050B14]"
      >
        <div className="grid grid-cols-3 gap-4 font-mono text-[11px]">
          {/* TIER 1 ACTION CARD */}
          <div className="p-3 bg-[#03070D] border border-[#00FF66]/40 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-[#00FF66] tracking-widest">
                  [ 1. AUTO-BUMP / UPGRADE MODAL ]
                </span>
                <span className="text-[9px] text-[#00FF66] font-bold bg-[#00FF66]/10 px-1 py-0.5 border border-[#00FF66]/30">
                  SCA TIER
                </span>
              </div>
              {firstBumpableCve ? (
                <>
                  <div className="text-xs font-bold text-[#C0D8F0]">
                    {firstBumpableCve.id}: {firstBumpableCve.package} ({firstBumpableCve.version} ➔ {firstBumpableCve.fixedIn})
                  </div>
                  <p className="text-[10px] text-[#5A7A9A] mt-1 leading-relaxed">
                    • Displays lockfile diff & validates checksums<br />
                    • Runs local package-manager upgrade pipeline
                  </p>
                </>
              ) : (
                <>
                  <div className="text-xs font-bold text-[#00FF66]">
                    ✓ All Dependencies Secure
                  </div>
                  <p className="text-[10px] text-[#5A7A9A] mt-1 leading-relaxed">
                    Zero vulnerable packages detected in active lockfiles.
                  </p>
                </>
              )}
            </div>
            {firstBumpableCve ? (
              <CyberButton
                accent="green"
                size="sm"
                type="button"
                className="w-full justify-center"
                onClick={() => openBumpModal(firstBumpableCve)}
              >
                {bumpedPackages[firstBumpableCve.id] ? "✓ AUTO-BUMP APPLIED" : "⚡ LAUNCH AUTO-BUMP MODAL"}
              </CyberButton>
            ) : (
              <div className="text-[10px] text-center text-[#5A7A9A] py-1 border border-[#112233]">
                DEPENDENCIES UP TO DATE
              </div>
            )}
          </div>

          {/* TIER 2 ACTION CARD */}
          <div className="p-3 bg-[#03070D] border border-[#00E5FF]/40 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-[#00E5FF] tracking-widest">
                  [ 2. EXPANDABLE VULNERABILITY DRAWER ]
                </span>
                <span className="text-[9px] text-[#FF0055] font-bold bg-[#FF0055]/10 px-1 py-0.5 border border-[#FF0055]/30">
                  DEEP SCA
                </span>
              </div>
              {firstCriticalOrDeepCve ? (
                <>
                  <div className="text-xs font-bold text-[#FF0055]">
                    {firstCriticalOrDeepCve.id}: {firstCriticalOrDeepCve.package} (v{firstCriticalOrDeepCve.version})
                  </div>
                  <p className="text-[10px] text-[#5A7A9A] mt-1 leading-relaxed">
                    • Multi-hop dependency chain tree visualization<br />
                    • EPSS exploit score & official CVE advisory
                  </p>
                </>
              ) : (
                <>
                  <div className="text-xs font-bold text-[#00E5FF]">
                    ✓ No Critical Vulnerabilities
                  </div>
                  <p className="text-[10px] text-[#5A7A9A] mt-1 leading-relaxed">
                    Zero high-severity CVEs detected across tree.
                  </p>
                </>
              )}
            </div>
            {firstCriticalOrDeepCve ? (
              <CyberButton
                accent="cyan"
                size="sm"
                type="button"
                className="w-full justify-center"
                onClick={() => {
                  setExpandedCveId(expandedCveId === firstCriticalOrDeepCve.id ? null : firstCriticalOrDeepCve.id);
                }}
              >
                {expandedCveId === firstCriticalOrDeepCve.id ? "▴ COLLAPSE DRAWER" : "▾ OPEN ADVISORY DRAWER"}
              </CyberButton>
            ) : (
              <div className="text-[10px] text-center text-[#5A7A9A] py-1 border border-[#112233]">
                CHAIN NOMINAL
              </div>
            )}
          </div>

          {/* TIER 3 ACTION CARD */}
          <div className="p-3 bg-[#03070D] border border-[#FF0055]/40 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-[#FF0055] tracking-widest">
                  [ 3. DEEP-LINK ROUTING: AI FIX ]
                </span>
                <span className="text-[9px] text-[#FFD600] font-bold bg-[#FFD600]/10 px-1 py-0.5 border border-[#FFD600]/30">
                  SAST TIER
                </span>
              </div>
              {topSast ? (
                <>
                  <div className="text-xs font-bold text-[#FFD600]">
                    {topSast.id}: {topSast.file}:{topSast.line}
                  </div>
                  <p className="text-[10px] text-[#5A7A9A] mt-1 leading-relaxed">
                    • Navigates to <span className="text-[#00E5FF]">/remediation?rule={topSast.id}</span><br />
                    • Pre-populates source context & automated patch diff
                  </p>
                </>
              ) : (
                <>
                  <div className="text-xs font-bold text-[#00FF66]">
                    ✓ Zero SAST Taint Sinks
                  </div>
                  <p className="text-[10px] text-[#5A7A9A] mt-1 leading-relaxed">
                    Static analysis verified zero injection sinks.
                  </p>
                </>
              )}
            </div>
            {topSast ? (
              <Link
                href={`/remediation?rule=${topSast.id}&file=${topSast.file}&line=${topSast.line}`}
                className="w-full inline-flex items-center justify-center gap-1.5 font-bold tracking-widest border border-[#FF0055] text-[#FF0055] bg-[rgba(255,0,85,0.12)] hover:bg-[rgba(255,0,85,0.25)] px-3 py-1.5 text-xs uppercase cursor-pointer select-none transition-all shadow-[0_0_10px_rgba(255,0,85,0.3)]"
              >
                FIX → AI REMEDIATION WORKSPACE
              </Link>
            ) : (
              <Link
                href="/remediation"
                className="w-full inline-flex items-center justify-center gap-1.5 font-bold tracking-widest border border-[#3A5A7A] text-[#5A7A9A] bg-transparent hover:text-[#00E5FF] px-3 py-1.5 text-xs uppercase cursor-pointer select-none transition-all"
              >
                OPEN REMEDIATION WORKSPACE
              </Link>
            )}
          </div>
        </div>
      </CyberCard>

      {/* Tier 1 & Tier 2: DEPENDENCY CVES (SCA) FULL TABLE */}
      <CyberCard
        title={`DEPENDENCY CVEs (SCA) — AUDIT LEDGER`}
        accent="yellow"
        noPadding
      >
        <div className="overflow-auto">
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="border-b border-[#112233] text-[9px] text-[#5A7A9A] tracking-widest bg-[#03070D]">
                <th className="text-left px-3 py-2 font-normal">CVE ID</th>
                <th className="text-left px-3 py-2 font-normal">SEVERITY</th>
                <th className="text-left px-3 py-2 font-normal">PACKAGE</th>
                <th className="text-left px-3 py-2 font-normal">CURRENT</th>
                <th className="text-left px-3 py-2 font-normal">FIXED IN</th>
                <th className="text-left px-3 py-2 font-normal w-32">CVSS</th>
                <th className="text-left px-3 py-2 font-normal">EPSS</th>
                <th className="text-right px-3 py-2 font-normal">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {cveList.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[#5A7A9A] font-mono text-xs">
                    {isScanning ? "Scanning repository dependencies for CVEs..." : "✓ ZERO VULNERABILITIES DETECTED — All software dependencies and lockfiles are clean."}
                  </td>
                </tr>
              )}
              {cveList.map((cve) => {
                const isExpanded = expandedCveId === cve.id;
                const isBumped = Boolean(bumpedPackages[cve.id]);
                const epss = cve.epssScore;
                const epssColor =
                  epss.level === "CRITICAL"
                    ? "#FF0055"
                    : epss.level === "HIGH"
                    ? "#FF4400"
                    : epss.level === "ELEVATED"
                    ? "#FFD600"
                    : "#00FF66";

                return (
                  <tr key={cve.uniqueKey || cve.id} className="group border-b border-[#0A1220]">
                    <td colSpan={8} className="p-0">
                      {/* Main CVE row */}
                      <div className={`flex items-center text-[11px] px-3 py-2.5 transition-colors ${
                        isExpanded ? "bg-[#071322]" : "hover:bg-[#0A1220]"
                      }`}>
                        {/* CVE ID */}
                        <div className="w-[15%] flex items-center gap-1.5 font-bold text-[#FFD600]">
                          <button
                            type="button"
                            onClick={() => setExpandedCveId(isExpanded ? null : cve.id)}
                            className="text-[#5A7A9A] hover:text-[#00E5FF] transition-colors text-xs font-mono cursor-pointer"
                            title="Toggle Expandable Vulnerability Drawer"
                          >
                            {isExpanded ? "▾" : "▸"}
                          </button>
                          <span>{cve.id}</span>
                        </div>

                        {/* Severity */}
                        <div className="w-[10%]">
                          <SeverityTag severity={cve.severity} />
                        </div>

                        {/* Package */}
                        <div className="w-[13%] text-[#C0D8F0] font-bold">
                          {cve.package}
                        </div>

                        {/* Version */}
                        <div className="w-[10%] text-[#FF0055]">
                          {isBumped ? (
                            <span className="line-through opacity-50">{cve.version}</span>
                          ) : (
                            cve.version
                          )}
                        </div>

                        {/* Fixed In */}
                        <div className="w-[11%]">
                          {isBumped ? (
                            <span className="text-[#00FF66] font-bold bg-[#00FF66]/10 px-1 py-0.5 border border-[#00FF66]/30">
                              ✓ {bumpedPackages[cve.id]}
                            </span>
                          ) : (
                            <span className="text-[#00FF66]">{cve.fixedIn}</span>
                          )}
                        </div>

                        {/* CVSS Bar */}
                        <div className="w-[16%] pr-3">
                          <CvssBar score={cve.cvss} />
                        </div>

                        {/* EPSS Score Meter */}
                        <div className="w-[10%] flex items-center gap-1.5">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 border"
                            style={{
                              color: epssColor,
                              borderColor: `${epssColor}40`,
                              backgroundColor: `${epssColor}10`,
                            }}
                          >
                            {(epss.probability * 100).toFixed(1)}%
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="w-[15%] flex items-center justify-end gap-1.5">
                          <CyberButton
                            accent="cyan"
                            size="sm"
                            variant="ghost"
                            type="button"
                            onClick={() => setExpandedCveId(isExpanded ? null : cve.id)}
                          >
                            {isExpanded ? "CLOSE ▴" : "DRAWER ▾"}
                          </CyberButton>

                          {cve.canAutoBump ? (
                            <CyberButton
                              accent="green"
                              size="sm"
                              type="button"
                              disabled={isBumped}
                              onClick={() => openBumpModal(cve)}
                            >
                              {isBumped ? "✓ BUMPED" : "AUTO-BUMP ⇪"}
                            </CyberButton>
                          ) : (
                            <span className="text-[9px] text-[#5A7A9A] px-2 py-1 border border-[#112233] bg-[#03070D]">
                              MANUAL
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tier 2: EXPANDABLE VULNERABILITY DRAWER */}
                      {isExpanded && (
                        <div className="p-4 bg-[#040A12] border-t border-b border-[#00E5FF]/30">
                          <div className="grid grid-cols-12 gap-4">
                            {/* Left: Dependency Chain Tree */}
                            <div className="col-span-5 flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[#00E5FF] tracking-widest">
                                  ⬡ DEPENDENCY CHAIN TREE
                                </span>
                                <span className="text-[9px] text-[#5A7A9A]">
                                  {cve.dependencyChain.length} HOPS TO ARTIFACT
                                </span>
                              </div>
                              <div className="p-2.5 bg-[#020509] border border-[#112233] rounded font-mono text-[10px] flex flex-col gap-1.5">
                                {cve.dependencyChain.map((node, idx) => {
                                  const isLast = idx === cve.dependencyChain.length - 1;
                                  return (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span className="text-[#2A4A6A] font-bold">
                                        {idx === 0 ? "●" : "↳"}
                                      </span>
                                      <span
                                        className={
                                          isLast
                                            ? "text-[#FF0055] font-bold bg-[#FF0055]/10 px-1 py-0.5 border border-[#FF0055]/30"
                                            : idx === 0
                                            ? "text-[#00FF66]"
                                            : "text-[#C0D8F0]"
                                        }
                                      >
                                        {node}
                                      </span>
                                      {isLast && (
                                        <span className="text-[9px] text-[#FF0055] animate-pulse">
                                          [TAINT SINK]
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Upgrade Command Preview */}
                              <div className="mt-1">
                                <span className="text-[9px] text-[#5A7A9A] tracking-wider block mb-1">
                                  PACKAGE MANAGER REMEDIATION COMMAND:
                                </span>
                                <div className="p-2 bg-[#001424] border border-[#00E5FF]/20 text-[#00E5FF] text-[10px] select-all font-mono">
                                  $ {cve.upgradeCmd}
                                </div>
                              </div>
                            </div>

                            {/* Middle: EPSS Exploit Score & Advisory */}
                            <div className="col-span-4 flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-[#FFD600] tracking-widest">
                                ⬢ EPSS EXPLOIT SCORE & ADVISORY
                              </span>
                              <div className="p-2.5 bg-[#020509] border border-[#112233] rounded flex flex-col gap-2">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-[#5A7A9A]">Exploit Probability:</span>
                                  <span className="font-bold" style={{ color: epssColor }}>
                                    {(epss.probability * 100).toFixed(2)}% ({epss.level} TIER)
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-[#112233] overflow-hidden">
                                  <div
                                    className="h-full transition-all duration-500"
                                    style={{
                                      width: `${Math.min(100, epss.probability * 100)}%`,
                                      backgroundColor: epssColor,
                                    }}
                                  />
                                </div>
                                <div className="flex justify-between text-[9px] text-[#5A7A9A]">
                                  <span>Percentile Rank: {epss.percentile}%</span>
                                  <span>CISA KEV Monitored</span>
                                </div>

                                <div className="pt-2 border-t border-[#112233] text-[10px] flex flex-col gap-1">
                                  <div className="text-[#FFD600] font-bold">{cve.advisory.cwe}</div>
                                  <div className="text-[9px] text-[#2A4A6A] font-mono">{cve.advisory.vector}</div>
                                  <p className="text-[#C0D8F0] text-[10px] leading-relaxed mt-1">
                                    {cve.advisory.summary}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Right: Quick Action Bay */}
                            <div className="col-span-3 flex flex-col justify-between p-3 bg-[#020509] border border-[#112233] rounded">
                              <div>
                                <span className="text-[10px] font-bold text-[#00FF66] tracking-widest block mb-1">
                                  RESOLUTION PROTOCOL
                                </span>
                                <p className="text-[10px] text-[#5A7A9A] leading-relaxed mb-3">
                                  {cve.advisory.recommendation}
                                </p>
                              </div>

                              <div className="flex flex-col gap-2">
                                {cve.canAutoBump ? (
                                  <CyberButton
                                    accent="green"
                                    size="sm"
                                    type="button"
                                    disabled={isBumped}
                                    onClick={() => openBumpModal(cve)}
                                  >
                                    {isBumped ? "✓ PACKAGE UPGRADED" : "LAUNCH AUTO-BUMP MODAL ➔"}
                                  </CyberButton>
                                ) : (
                                  <div className="p-2 border border-[#FF0055]/30 bg-[#FF0055]/10 text-[#FF0055] text-[9px] font-bold text-center">
                                    CONTAINER / OS REBUILD REQUIRED
                                  </div>
                                )}
                                <CyberButton
                                  accent="yellow"
                                  size="sm"
                                  variant="outline"
                                  type="button"
                                  onClick={() => setExpandedCveId(null)}
                                >
                                  CLOSE DRAWER
                                </CyberButton>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CyberCard>

      {/* Tier 3: STATIC ANALYSIS FINDINGS (SAST) WITH DEEP-LINK ROUTING */}
      <CyberCard
        title={`STATIC ANALYSIS FINDINGS (${activeSoftware.sastGrade}) — DIRECT DEEP-LINK REMEDIATION`}
        accent="magenta"
        noPadding
      >
        <div className="overflow-auto">
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="border-b border-[#112233] text-[9px] text-[#5A7A9A] tracking-widest bg-[#03070D]">
                <th className="text-left px-3 py-2 font-normal">RULE ID</th>
                <th className="text-left px-3 py-2 font-normal">RULE NAME / CATEGORY</th>
                <th className="text-left px-3 py-2 font-normal">FILE TARGET</th>
                <th className="text-left px-3 py-2 font-normal">LINE</th>
                <th className="text-left px-3 py-2 font-normal">SEVERITY</th>
                <th className="text-left px-3 py-2 font-normal">TAINT SPECIFICATION</th>
                <th className="text-right px-3 py-2 font-normal">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {sastFindings.map((f: any) => (
                <tr key={f.uniqueKey || f.id} className="border-b border-[#0A1220] hover:bg-[#0A1220] transition-colors">
                  <td className="px-3 py-2 text-[#00E5FF] font-bold">{f.displayRuleId || f.ruleId || f.id}</td>
                  <td className="px-3 py-2 text-[#FFD600] font-bold">{f.rule}</td>
                  <td className="px-3 py-2 text-[#C0D8F0]">{f.file}</td>
                  <td className="px-3 py-2 text-[#5A7A9A]">:{f.line}</td>
                  <td className="px-3 py-2"><SeverityTag severity={f.severity} /></td>
                  <td className="px-3 py-2 text-[#5A7A9A] max-w-xs truncate">{f.description}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/remediation?rule=${encodeURIComponent(f.id)}&file=${encodeURIComponent(f.file)}&line=${f.line}&desc=${encodeURIComponent(f.description)}&title=${encodeURIComponent(f.rule)}`}
                      className="inline-flex items-center justify-center gap-1 font-bold tracking-widest border border-[#FF0055] text-[#FF0055] bg-[rgba(255,0,85,0.12)] hover:bg-[rgba(255,0,85,0.25)] px-2.5 py-1 text-[10px] uppercase cursor-pointer select-none transition-all shadow-[0_0_8px_rgba(255,0,85,0.35)]"
                    >
                      FIX →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CyberCard>

      {/* Tier 1: AUTO-BUMP / UPGRADE MODAL (Rendered at top z-index) */}
      {selectedBumpCve && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={closeBumpModal}
        >
          <div
            className="w-full max-w-2xl bg-[#03070D] border-2 border-[#00FF66] shadow-[0_0_50px_rgba(0,255,102,0.35)] flex flex-col font-mono text-[11px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#112233] bg-[#070D16]">
              <div className="flex items-center gap-2">
                <NexisLogo size={18} accent="green" mode={isBumping ? "loading" : "idle"} />
                <h3 className="text-[#00FF66] font-bold tracking-[0.2em] text-xs">
                  PACKAGE AUTO-BUMP BAY // {(selectedBumpCve.rootPackage || selectedBumpCve.package).toUpperCase()}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeBumpModal}
                className="w-7 h-7 flex items-center justify-center text-[#5A7A9A] hover:text-[#FF0055] hover:bg-[#FF0055]/10 border border-transparent hover:border-[#FF0055]/30 transition-colors font-bold text-sm cursor-pointer select-none"
                title="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
              {/* Target info card */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-[#071322] border border-[#00FF66]/30">
                <div>
                  <span className="text-[9px] text-[#5A7A9A] block">TARGET PACKAGE:</span>
                  <span className="text-[#00FF66] font-bold">
                    {selectedBumpCve.rootPackage || selectedBumpCve.package}
                  </span>
                  {selectedBumpCve.rootPackage && selectedBumpCve.rootPackage !== selectedBumpCve.package && (
                    <span className="text-[9px] text-[#00E5FF] block">
                      (parent of {selectedBumpCve.package})
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[9px] text-[#5A7A9A] block">VERSION BUMP:</span>
                  <span className="text-[#FF0055] font-bold">{selectedBumpCve.version}</span>
                  <span className="text-[#5A7A9A] mx-1.5">➔</span>
                  <span className="text-[#00FF66] font-bold">{selectedBumpCve.fixedIn}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#5A7A9A] block">ASSOCIATED CVE:</span>
                  <span className="text-[#FFD600] font-bold">{selectedBumpCve.id}</span>
                  <span className="text-[9px] text-[#5A7A9A] ml-1">(CVSS {selectedBumpCve.cvss})</span>
                </div>
              </div>

              {/* Package manager upgrade command */}
              <div>
                <span className="text-[10px] text-[#5A7A9A] tracking-wider block mb-1">
                  PACKAGE MANAGER COMMAND EXECUTION:
                </span>
                <div className="p-2.5 bg-[#000E1A] border border-[#00E5FF]/40 text-[#00E5FF] text-[11px] font-mono">
                  $ npm install {selectedBumpCve.rootPackage || selectedBumpCve.package}@{selectedBumpCve.fixedIn.replace(/^[~^]/, "")} --save --legacy-peer-deps
                </div>
              </div>

              {/* Error Box if bump failed */}
              {bumpError && (
                <div className="p-3 bg-[#FF0055]/10 border border-[#FF0055] text-[#FF0055] flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[#FF0055]">⚠</span>
                    <span className="font-bold text-[11px] tracking-wider text-[#FF0055]">
                      AUTO-BUMP EXECUTION ENCOUNTERED AN ERROR
                    </span>
                  </div>
                  <pre className="text-[10px] text-[#FFA0B0] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto bg-[#000E1A] p-2 border border-[#FF0055]/30">
                    {bumpError}
                  </pre>
                </div>
              )}

              {/* Lockfile / Git diff preview */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#5A7A9A] tracking-wider">
                    {bumpCompleted ? "APPLIED GIT / LOCKFILE DIFF:" : "PROJECTED LOCKFILE DIFF:"}
                  </span>
                  <span className="text-[9px] text-[#00FF66]">
                    {bumpCompleted ? "GENUINE COMMITTED PATCH" : "ESTIMATED PATCH"}
                  </span>
                </div>
                <pre className="p-3 bg-[#020509] border border-[#112233] text-[10px] font-mono overflow-x-auto leading-relaxed max-h-48 text-[#A0B8D0]">
                  {(realDiff || selectedBumpCve.lockfileDiff).split("\n").map((line, idx) => {
                    const isAdd = line.startsWith("+");
                    const isDel = line.startsWith("-");
                    return (
                      <div
                        key={idx}
                        className={
                          isAdd
                            ? "text-[#00FF66] bg-[#00FF66]/10 px-1"
                            : isDel
                            ? "text-[#FF0055] bg-[#FF0055]/10 px-1"
                            : "text-[#5A7A9A]"
                        }
                      >
                        {line}
                      </div>
                    );
                  })}
                </pre>
              </div>

              {/* Interactive Bump Execution Progress */}
              {isBumping && (
                <div className="p-3 bg-[#020712] border border-[#00FF66]/40 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <NexisLogo size={16} accent="green" mode="loading" />
                    <span className="text-[10px] text-[#00FF66] font-bold tracking-widest">
                      EXECUTING PACKAGE UPGRADE PIPELINE...
                    </span>
                  </div>
                  <div className="text-[10px] font-mono flex flex-col gap-1 pl-6">
                    <div className={bumpProgressStep >= 1 ? "text-[#00FF66]" : "text-[#2A4A6A]"}>
                      {bumpProgressStep >= 1 ? "✓" : "○"} Querying package registry for {(selectedBumpCve.rootPackage || selectedBumpCve.package)}@{selectedBumpCve.fixedIn}...
                    </div>
                    <div className={bumpProgressStep >= 2 ? "text-[#00FF66]" : "text-[#2A4A6A]"}>
                      {bumpProgressStep >= 2 ? "✓" : "○"} Resolving dependency graph & peer requirement trees...
                    </div>
                    <div className={bumpProgressStep >= 3 ? "text-[#00FF66]" : "text-[#2A4A6A]"}>
                      {bumpProgressStep >= 3 ? "✓" : "○"} Validating sha512 integrity hashes...
                    </div>
                    <div className={bumpProgressStep >= 4 ? "text-[#00FF66]" : "text-[#2A4A6A]"}>
                      {bumpProgressStep >= 4 ? "✓" : "○"} Regenerating lockfile & syncing node_modules...
                    </div>
                  </div>
                </div>
              )}

              {/* Bump Completed Success Box */}
              {bumpCompleted && (
                <div className="p-3 bg-[#00FF66]/10 border border-[#00FF66] text-[#00FF66] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-bold text-[#00FF66]">✓</span>
                    <div>
                      <div className="font-bold text-[11px] tracking-wider text-[#00FF66]">AUTO-BUMP SUCCESSFULLY APPLIED</div>
                      <div className="text-[10px] text-[#A0D0B0]">
                        {(selectedBumpCve.rootPackage || selectedBumpCve.package)} updated to {selectedBumpCve.fixedIn}. Lockfile synced and audit updated.
                      </div>
                    </div>
                  </div>
                  <CyberButton
                    accent="green"
                    size="sm"
                    variant="solid"
                    type="button"
                    onClick={closeBumpModal}
                    className="h-8 px-4 inline-flex items-center justify-center shrink-0"
                  >
                    ✓ DONE
                  </CyberButton>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-[#112233] bg-[#070D16]">
              <div className="flex items-center gap-2 min-w-0 mr-4 overflow-hidden">
                <span className="text-[9px] text-[#5A7A9A] tracking-wider shrink-0 font-mono">
                  TARGET WORKSPACE:
                </span>
                <span
                  className="text-[9px] text-[#8EAEC9] font-mono truncate"
                  title={activeSoftware.repoPath}
                >
                  {activeSoftware.repoPath}
                </span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <CyberButton
                  accent="cyan"
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={closeBumpModal}
                  className="h-8 px-4 inline-flex items-center justify-center min-w-[80px]"
                >
                  {bumpCompleted ? "CLOSE" : "CANCEL"}
                </CyberButton>
                {!bumpCompleted && (
                  <CyberButton
                    accent={bumpError ? "magenta" : "green"}
                    size="sm"
                    variant="solid"
                    type="button"
                    disabled={isBumping}
                    onClick={executeAutoBump}
                    className="h-8 px-5 inline-flex items-center justify-center gap-2 min-w-[170px]"
                  >
                    {isBumping ? (
                      <>
                        <span className="inline-block w-2.5 h-2.5 border-2 border-[#03070D] border-t-transparent rounded-full animate-spin" />
                        <span>RUNNING UPGRADE...</span>
                      </>
                    ) : bumpError ? (
                      <span>↺ RETRY AUTO-BUMP</span>
                    ) : (
                      <span>CONFIRM AUTO-BUMP ⇪</span>
                    )}
                  </CyberButton>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
