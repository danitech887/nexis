"use client";

interface AstNode {
  name: string;
  type: string;
  complexity?: number;
  lines?: number;
  children?: AstNode[];
}

interface AstInspectorProps {
  tree: AstNode;
  depth?: number;
}

function complexityColor(v?: number): string {
  if (!v) return "#2A4A6A";
  if (v <= 5)  return "#00FF66";
  if (v <= 10) return "#FFD600";
  if (v <= 20) return "#FF4400";
  return "#FF0055";
}

function AstNodeRow({ node, depth }: { node: AstNode; depth: number }) {
  const indent = depth * 16;
  const cc = complexityColor(node.complexity);

  return (
    <div>
      <div
        className="flex items-center gap-2 py-0.5 px-2 hover:bg-[#0A1220] transition-colors text-[11px] font-mono"
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {node.children?.length ? (
          <span className="text-[#00E5FF] text-[9px] shrink-0">▸</span>
        ) : (
          <span className="text-[#112233] text-[9px] shrink-0">◦</span>
        )}

        {/* Type badge */}
        <span className="text-[9px] text-[#2A4A6A] shrink-0 w-[72px] truncate">{node.type}</span>

        {/* Name */}
        <span className="flex-1 text-[#C0D8F0] truncate">{node.name}</span>

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
          <span className="text-[9px] text-[#2A4A6A] shrink-0 w-10 text-right">
            {node.lines}L
          </span>
        )}
      </div>
      {node.children?.map((child, i) => (
        <AstNodeRow key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function AstInspector({ tree, depth = 0 }: AstInspectorProps) {
  return (
    <div className="flex flex-col h-full bg-[#03070D] font-mono text-[11px]">
      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-[#112233] text-[9px] bg-[#070D16] shrink-0">
        <span className="text-[#5A7A9A]">COMPLEXITY:</span>
        {[["≤5","#00FF66"],["≤10","#FFD600"],["≤20","#FF4400"],[">20","#FF0055"]].map(([l,c]) => (
          <span key={l} style={{ color: c }} className="font-bold">{l}</span>
        ))}
      </div>
      <div className="flex-1 overflow-auto py-1">
        <AstNodeRow node={tree} depth={depth} />
      </div>
    </div>
  );
}
