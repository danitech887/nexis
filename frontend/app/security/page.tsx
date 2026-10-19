"use client";

import { useState, useMemo } from "react";
import CyberCard from "@/components/ui/CyberCard";
import CyberButton from "@/components/ui/CyberButton";
import SeverityTag from "@/components/ui/SeverityTag";
import NexisLogo from "@/components/ui/NexisLogo";
import NexisLoader from "@/components/ui/NexisLoader";
import { useActiveSoftware } from "@/lib/ActiveSoftwareContext";

interface CVE {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  package: string;
  version: string;
  fixedIn: string;
  cvss: number;
  description: string;
}

const DEFAULT_CVES: CVE[] = [
  { id:"CVE-2024-3094", severity:"critical", package:"xz-utils",      version:"5.6.0",  fixedIn:"5.6.1",  cvss:10.0, description:"SSH backdoor via malicious build script in XZ Utils" },
  { id:"CVE-2024-0232", severity:"high",     package:"sqlite3",        version:"3.43.0", fixedIn:"3.45.0", cvss:7.8,  description:"Use-after-free in jsonParseAddNodeArray function" },
  { id:"CVE-2023-4863", severity:"high",     package:"libwebp",        version:"1.3.1",  fixedIn:"1.3.2",  cvss:8.8,  description:"Heap buffer overflow in WebP codec" },
  { id:"CVE-2024-1234", severity:"medium",   package:"axios",          version:"1.5.0",  fixedIn:"1.6.4",  cvss:5.3,  description:"SSRF via redirect following in Node.js http client" },
  { id:"CVE-2024-5678", severity:"low",      package:"lodash",         version:"4.17.20",fixedIn:"4.17.21",cvss:3.1,  description:"Prototype pollution via zipObjectDeep" },
];

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

  const handleRescan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 2200);
  };

  // Scoped SAST findings from the active software
  const sastFindings = useMemo(() => {
    if (activeSoftware && activeSoftware.scopedSast && activeSoftware.scopedSast.length > 0) {
      return activeSoftware.scopedSast.map((s) => ({
        id: s.id,
        rule: s.rule,
        file: s.file,
        line: s.line,
        severity: s.severity,
      }));
    }
    return [
      { id:"SAST-001", rule:"SQL Injection", file:"payment/db.ts",   line:87,  severity:"critical" as const },
      { id:"SAST-002", rule:"XSS via innerHTML", file:"ui/render.tsx", line:34, severity:"high"     as const },
      { id:"SAST-003", rule:"Hardcoded secret", file:"config/env.ts", line:12, severity:"high"     as const },
    ];
  }, [activeSoftware]);

  // Contextual CVEs based on the platform of the active software
  const cveList: CVE[] = useMemo(() => {
    if (activeSoftware.category === "Mobile") {
      return [
        { id:"CVE-2024-21412", severity:"critical", package:"androidx.security.crypto", version:"1.0.0", fixedIn:"1.1.0-alpha06", cvss:9.2, description:"Keystore key alias injection in unpatched EncryptedSharedPreferences" },
        { id:"CVE-2023-4863", severity:"high", package:"libwebp", version:"1.3.1", fixedIn:"1.3.2", cvss:8.8, description:"Heap buffer overflow in native WebP rasterizer bitmap decoder" },
        { id:"CVE-2024-3400", severity:"medium", package:"okhttp3", version:"4.9.3", fixedIn:"4.12.0", cvss:6.5, description:"HTTP/2 CONTINUATION frame infinite loop Denial of Service" },
      ];
    }
    if (activeSoftware.category === "Desktop") {
      return [
        { id:"CVE-2024-0232", severity:"high", package:"sqlite3", version:"3.43.0", fixedIn:"3.45.0", cvss:7.8, description:"Use-after-free in jsonParseAddNodeArray function during WAL recovery" },
        { id:"CVE-2023-38545", severity:"medium", package:"libcurl-python", version:"7.84.0", fixedIn:"8.4.0", cvss:6.8, description:"SOCKS5 heap buffer overflow in connection handoff" },
      ];
    }
    return DEFAULT_CVES;
  }, [activeSoftware]);

  const criticalCveCount = cveList.filter((c) => c.severity === "critical").length;
  const highCveCount = cveList.filter((c) => c.severity === "high").length;
  const sastCount = sastFindings.length;
  const riskScore = activeSoftware.sastGrade === "A" ? "1.8" : activeSoftware.sastGrade === "A-" ? "3.2" : activeSoftware.sastGrade === "B+" ? "5.4" : "8.2";

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-4 animate-fadeinup">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NexisLogo size={30} accent="yellow" mode={isScanning ? "loading" : "idle"} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[#FFD600] text-sm font-bold tracking-[0.3em] glow-yellow">⬡ SAST & VULNERABILITIES</h1>
              <span className="text-[10px] font-mono text-[#00FF66] bg-[#00FF66]/10 border border-[#00FF66]/30 px-1.5 py-0.5">
                {activeSoftware.name}
              </span>
            </div>
            <p className="text-[#2A4A6A] text-[10px] tracking-widest mt-0.5">{activeSoftware.platform.toUpperCase()} · DEPENDENCY CVEs · STATIC CODE AUDIT</p>
          </div>
        </div>
        <div className="flex gap-2">
          <CyberButton
            accent="yellow"
            size="sm"
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
          <CyberButton accent="yellow" size="sm" variant="outline">⊕ EXPORT</CyberButton>
        </div>
      </div>

      {/* Rescan Banner */}
      {isScanning && (
        <div className="p-3 bg-[#070D16] border border-[#FFD600]/40 animate-fadeinup">
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

      {/* CVE table */}
      <CyberCard title={`DEPENDENCY CVEs — ${activeSoftware.name.toUpperCase()}`} accent="yellow" noPadding>
        <div className="overflow-auto">
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="border-b border-[#112233] text-[9px] text-[#5A7A9A] tracking-widest">
                {["CVE ID","SEVERITY","PACKAGE","VERSION","FIXED IN","CVSS","DESCRIPTION"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cveList.map((cve) => (
                <tr key={cve.id} className="border-b border-[#0A1220] hover:bg-[#0A1220] transition-colors">
                  <td className="px-3 py-2 text-[#FFD600] font-bold">{cve.id}</td>
                  <td className="px-3 py-2"><SeverityTag severity={cve.severity} /></td>
                  <td className="px-3 py-2 text-[#C0D8F0]">{cve.package}</td>
                  <td className="px-3 py-2 text-[#FF0055]">{cve.version}</td>
                  <td className="px-3 py-2 text-[#00FF66]">{cve.fixedIn}</td>
                  <td className="px-3 py-2 w-32"><CvssBar score={cve.cvss} /></td>
                  <td className="px-3 py-2 text-[#5A7A9A] max-w-xs truncate">{cve.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CyberCard>

      {/* SAST findings */}
      <CyberCard title={`STATIC ANALYSIS FINDINGS (${activeSoftware.sastGrade})`} accent="magenta" noPadding>
        <div className="overflow-auto">
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="border-b border-[#112233] text-[9px] text-[#5A7A9A] tracking-widest">
                {["ID","RULE","FILE","LINE","SEVERITY","ACTION"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sastFindings.map((f) => (
                <tr key={f.id} className="border-b border-[#0A1220] hover:bg-[#0A1220] transition-colors">
                  <td className="px-3 py-2 text-[#2A4A6A]">{f.id}</td>
                  <td className="px-3 py-2 text-[#FF0055] font-bold">{f.rule}</td>
                  <td className="px-3 py-2 text-[#00E5FF]">{f.file}</td>
                  <td className="px-3 py-2 text-[#5A7A9A]">:{f.line}</td>
                  <td className="px-3 py-2"><SeverityTag severity={f.severity} /></td>
                  <td className="px-3 py-2">
                    <CyberButton accent="yellow" size="sm" variant="ghost">FIX →</CyberButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CyberCard>
    </div>
  );
}
