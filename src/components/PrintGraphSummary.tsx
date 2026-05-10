import type { GraphPayload } from "../types/graph";

interface PrintGraphSummaryProps {
  graph: GraphPayload;
}

const STATUS_LABEL: Record<string, string> = {
  strong: "Strong",
  partial: "Partial",
  missing: "Missing",
  info: "Info",
  unknown: "Not detected",
};

/**
 * Static, paper-friendly summary of the audit graph.
 *
 * Hidden on screen (display:none in globals.css), shown only inside
 * @media print so a printed PDF gets a readable replacement for the
 * interactive React Flow diagram.
 */
export function PrintGraphSummary({ graph }: PrintGraphSummaryProps) {
  return (
    <section className="print-only glass p-5 sm:p-6">
      <header className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-white">Audit graph (summary)</h3>
      </header>
      <p className="mt-1 text-xs text-slate-500">
        Interactive view shown on screen; this static summary is included on print.
      </p>
      <table className="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
            <th className="border-b border-white/10 py-2 pr-3 font-semibold">
              Node
            </th>
            <th className="border-b border-white/10 py-2 pr-3 font-semibold">
              Status
            </th>
            <th className="border-b border-white/10 py-2 font-semibold">
              Summary
            </th>
          </tr>
        </thead>
        <tbody>
          {graph.nodes.map((node) => (
            <tr
              key={node.id}
              className="align-top text-slate-200/95"
              style={{ pageBreakInside: "avoid" }}
            >
              <td className="border-b border-white/5 py-2 pr-3 font-medium">
                {node.data.label}
              </td>
              <td className="border-b border-white/5 py-2 pr-3 text-xs">
                {STATUS_LABEL[node.data.status] ?? node.data.status}
              </td>
              <td className="border-b border-white/5 py-2 text-xs leading-relaxed">
                {node.data.summary}
                {node.data.recommendation ? (
                  <div className="mt-1 text-[11px] text-slate-400">
                    Recommendation: {node.data.recommendation}
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
