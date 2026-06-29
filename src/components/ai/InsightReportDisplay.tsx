import { parseInsightReportRaw } from "@/lib/ai/insight-report-format";

function TextBlock({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 leading-relaxed text-slate-300">{value}</p>
    </div>
  );
}

export function InsightReportDisplay({ content }: { content: string }) {
  const data = parseInsightReportRaw(content);
  const isLegacy = !data.progress && !data.priorities.length && !data.issues.length;

  if (isLegacy) {
    return <p className="text-sm leading-relaxed text-slate-300">{data.headline}</p>;
  }

  return (
    <div className="space-y-4 text-sm">
      <p className="text-base leading-relaxed text-slate-100">{data.headline}</p>

      <TextBlock label="Since last report" value={data.progress} />
      <TextBlock label="Consistency" value={data.consistency} />
      <TextBlock label="Strategy" value={data.strategy} />
      <TextBlock label="Timing patterns" value={data.timing} />

      {data.strengths.length > 0 && (
        <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-400/90">Strengths</p>
          <ul className="mt-1.5 space-y-1 text-slate-300">
            {data.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {data.issues.length > 0 && (
        <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-amber-400/90">Issues</p>
          <ul className="mt-1.5 space-y-1 text-slate-300">
            {data.issues.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {data.priorities.length > 0 && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Top priorities</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-slate-300">
            {data.priorities.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      )}

      <TextBlock label="30-day focus" value={data.focus} />
    </div>
  );
}
