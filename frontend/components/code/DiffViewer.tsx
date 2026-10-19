"use client";

interface DiffLine {
  type: "add" | "remove" | "context" | "header";
  content: string;
  lineNum?: { left?: number; right?: number };
}

interface DiffViewerProps {
  before: string;
  after: string;
  filename?: string;
  language?: string;
}

function parseDiff(before: string, after: string): DiffLine[] {
  const leftLines  = before.split("\n");
  const rightLines = after.split("\n");
  const result: DiffLine[] = [];

  result.push({ type: "header", content: `@@ Diff — ${leftLines.length} → ${rightLines.length} lines @@` });

  const maxLen = Math.max(leftLines.length, rightLines.length);
  let li = 1, ri = 1;

  for (let i = 0; i < maxLen; i++) {
    const l = leftLines[i];
    const r = rightLines[i];
    if (l === undefined) {
      result.push({ type: "add",    content: r, lineNum: { right: ri++ } });
    } else if (r === undefined) {
      result.push({ type: "remove", content: l, lineNum: { left: li++ } });
    } else if (l !== r) {
      result.push({ type: "remove", content: l, lineNum: { left: li++ } });
      result.push({ type: "add",    content: r, lineNum: { right: ri++ } });
    } else {
      result.push({ type: "context", content: l, lineNum: { left: li++, right: ri++ } });
    }
  }
  return result;
}

const LINE_STYLES: Record<string, { bg: string; prefix: string; color: string }> = {
  add:     { bg: "rgba(0,255,102,0.08)",  prefix: "+", color: "#00FF66" },
  remove:  { bg: "rgba(255,0,85,0.08)",   prefix: "-", color: "#FF0055" },
  context: { bg: "transparent",           prefix: " ", color: "#5A7A9A" },
  header:  { bg: "rgba(0,229,255,0.06)",  prefix: "@", color: "#00E5FF" },
};

export default function DiffViewer({ before, after, filename }: DiffViewerProps) {
  const lines = parseDiff(before, after);
  const adds    = lines.filter((l) => l.type === "add").length;
  const removes = lines.filter((l) => l.type === "remove").length;

  return (
    <div className="flex flex-col h-full font-mono text-[11px] bg-[#03070D] border border-[#112233]">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-[#112233] bg-[#070D16] shrink-0">
        <span className="text-[#5A7A9A]">DIFF</span>
        {filename && <span className="text-[#00E5FF]">{filename}</span>}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[#00FF66]">+{adds}</span>
          <span className="text-[#FF0055]">−{removes}</span>
        </div>
      </div>

      {/* Lines */}
      <div className="flex-1 overflow-auto">
        {lines.map((line, i) => {
          const s = LINE_STYLES[line.type];
          return (
            <div
              key={i}
              className="flex"
              style={{ background: s.bg, minHeight: "20px" }}
            >
              {/* Line numbers */}
              <div className="flex shrink-0 select-none text-[#2A4A6A] border-r border-[#112233]">
                <span className="w-8 px-1 text-right">{line.lineNum?.left ?? ""}</span>
                <span className="w-8 px-1 text-right">{line.lineNum?.right ?? ""}</span>
              </div>
              {/* Prefix */}
              <span
                className="w-5 shrink-0 text-center font-bold select-none"
                style={{ color: s.color }}
              >
                {s.prefix}
              </span>
              {/* Content */}
              <span
                className="flex-1 px-2 whitespace-pre-wrap break-all"
                style={{ color: line.type === "context" ? "#5A7A9A" : s.color }}
              >
                {line.content}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
