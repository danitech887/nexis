"use client";

import Link from "next/link";
import SeverityTag from "@/components/ui/SeverityTag";

export interface AstNode {
  name: string;
  type: string;
  complexity?: number;
  lines?: number;
  children?: AstNode[];
}

export interface RefactorTrigger {
  id: string;
  method: string;
  complexity: number;
  lines: number;
  severity: "critical" | "high" | "medium";
  issue: string;
  suggestion: string;
  impact: string;
  code_snippet?: string;
  start_line?: number;
  end_line?: number;
}

interface AstInspectorProps {
  tree: AstNode;
  depth?: number;
  refactorTriggers?: RefactorTrigger[];
  selectedFile?: string;
  onLaunchRefactor?: (trigger: RefactorTrigger) => void;
}

function complexityColor(v?: number): string {
  if (!v) return "#2A4A6A";
  if (v <= 5) return "#00FF66";
  if (v <= 10) return "#FFD600";
  if (v <= 20) return "#FF4400";
  return "#FF0055";
}

function AstNodeRow({
  node,
  depth,
  triggeredMethodNames,
  onNodeClick,
}: {
  node: AstNode;
  depth: number;
  triggeredMethodNames: Set<string>;
  onNodeClick?: (nodeName: string) => void;
}) {
  const indent = depth * 16;
  const cc = complexityColor(node.complexity);
  const isTriggered = triggeredMethodNames.has(node.name) || (node.complexity && node.complexity >= 12);

  return (
    <div>
      <div
        onClick={() => onNodeClick?.(node.name)}
        className={`flex items-center gap-2 py-1 px-2.5 transition-colors text-[11px] font-mono cursor-pointer ${
          isTriggered ? "bg-[#FF0055]/10 border-l-2 border-[#FF0055]" : "hover:bg-[#0A1220]"
        }`}
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {node.children?.length ? (
          <span className="text-[#00E5FF] text-[9px] shrink-0">▸</span>
        ) : (
          <span className="text-[#2A4A6A] text-[9px] shrink-0">◦</span>
        )}

        {/* Type badge */}
        <span className="text-[9px] text-[#2A4A6A] uppercase shrink-0 w-[65px] truncate">
          {node.type}
        </span>

        {/* Name */}
        <span className={`flex-1 truncate ${isTriggered ? "text-[#FFD600] font-bold" : "text-[#C0D8F0]"}`}>
          {node.name}
        </span>

        {/* Trigger tag if applicable */}
        {isTriggered && (
          <span className="text-[8px] tracking-wider uppercase font-bold text-[#FF0055] bg-[#FF0055]/20 border border-[#FF0055]/40 px-1 py-0.2 shrink-0 animate-pulse">
            REFACTOR
          </span>
        )}

        {/* Complexity */}
        {node.complexity !== undefined && (
          <span
            className="text-[9px] font-bold shrink-0 px-1 border"
            style={{ color: cc, borderColor: `${cc}44` }}
          >
            CC:{node.complexity}
          </span>
        )}

        {/* Lines */}
        {node.lines !== undefined && (
          <span className="text-[9px] text-[#5A7A9A] shrink-0 w-10 text-right">
            {node.lines}L
          </span>
        )}
      </div>

      {node.children?.map((child, i) => (
        <AstNodeRow
          key={`${child.name}-${i}`}
          node={child}
          depth={depth + 1}
          triggeredMethodNames={triggeredMethodNames}
          onNodeClick={onNodeClick}
        />
      ))}
    </div>
  );
}

export default function AstInspector({
  tree,
  depth = 0,
  refactorTriggers = [],
  selectedFile = "target.ts",
  onLaunchRefactor,
}: AstInspectorProps) {
  const triggeredMethodNames = new Set(refactorTriggers.map((t) => t.method));

  const handleNodeClick = (nodeName: string) => {
    const matchingTrigger = refactorTriggers.find((t) => t.method === nodeName);
    if (matchingTrigger && onLaunchRefactor) {
      onLaunchRefactor(matchingTrigger);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#03070D] font-mono text-[11px] overflow-hidden">
      {/* Legend */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#112233] text-[9px] bg-[#070D16] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[#5A7A9A]">MCCABE COMPLEXITY:</span>
          {[
            ["≤5", "#00FF66"],
            ["≤10", "#FFD600"],
            ["≤20", "#FF4400"],
            [">20", "#FF0055"],
          ].map(([l, c]) => (
            <span key={l} style={{ color: c }} className="font-bold">
              {l}
            </span>
          ))}
        </div>
        <span className="text-[9px] text-[#00E5FF]">
          AST NODES: {(tree.children?.length || 0) + 1}
        </span>
      </div>

      {/* AST Tree Content */}
      <div className="flex-1 overflow-auto py-1 min-h-[160px]">
        <AstNodeRow
          node={tree}
          depth={depth}
          triggeredMethodNames={triggeredMethodNames}
          onNodeClick={handleNodeClick}
        />
      </div>

      {/* Refactor Triggers Panel */}
      {refactorTriggers.length > 0 && (
        <div className="border-t border-[#112233] bg-[#050C16] p-3 flex flex-col gap-2 shrink-0 max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#FF0055] tracking-widest flex items-center gap-1.5">
              <span>⚠</span> REFACTOR TRIGGERS DETECTED ({refactorTriggers.length})
            </span>
            <span className="text-[9px] text-[#5A7A9A]">{selectedFile}</span>
          </div>

          <div className="flex flex-col gap-2">
            {refactorTriggers.map((trigger, idx) => (
              <div
                key={`${trigger.id}-${idx}`}
                className="p-2.5 bg-[#020509] border border-[#FF0055]/30 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#FFD600]">
                      {trigger.method}
                    </span>
                    <SeverityTag severity={trigger.severity} />
                  </div>
                  <span className="text-[9px] text-[#FF0055] font-bold">
                    CC: {trigger.complexity} ({trigger.lines}L)
                  </span>
                </div>

                <p className="text-[10px] text-[#A0B8D0] leading-snug">
                  {trigger.issue}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-[#112233]">
                  <span className="text-[9px] text-[#00FF66]">
                    Suggestion: {trigger.suggestion}
                  </span>
                  {onLaunchRefactor ? (
                    <button
                      type="button"
                      onClick={() => onLaunchRefactor(trigger)}
                      className="inline-flex items-center gap-1 text-[9px] font-bold text-[#00E5FF] hover:text-white bg-[#00E5FF]/10 hover:bg-[#00E5FF]/25 border border-[#00E5FF]/30 px-2.5 py-1 transition-all uppercase cursor-pointer"
                    >
                      ⚡ REFACTOR PIPELINE ➔
                    </button>
                  ) : (
                    <Link
                      href={`/remediation?rule=${encodeURIComponent(trigger.id)}`}
                      className="inline-flex items-center gap-1 text-[9px] font-bold text-[#00E5FF] hover:text-white bg-[#00E5FF]/10 hover:bg-[#00E5FF]/25 border border-[#00E5FF]/30 px-2 py-0.5 transition-all uppercase"
                    >
                      ⊕ REFACTOR BAY ➔
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
