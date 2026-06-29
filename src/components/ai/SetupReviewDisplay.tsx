import { parseSetupReviewRaw } from "@/lib/ai/trade-setup-review-format";

export function SetupReviewDisplay({
  review,
  compact = false,
}: {
  review: string;
  compact?: boolean;
}) {
  const data = parseSetupReviewRaw(review);

  return (
    <div className={`space-y-3 ${compact ? "text-sm" : ""}`}>
      <p className="leading-relaxed text-slate-200">{data.summary}</p>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-amber-400/90">Risk</p>
        <p className="mt-1 text-slate-300">{data.riskNote}</p>
      </div>

      {data.strength && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-400/90">What looks good</p>
          <p className="mt-1 text-slate-300">{data.strength}</p>
        </div>
      )}

      {data.caution && (
        <div className="rounded-lg border border-slate-700/80 bg-slate-950/40 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Watch while open</p>
          <p className="mt-1 text-slate-400">{data.caution}</p>
        </div>
      )}
    </div>
  );
}
