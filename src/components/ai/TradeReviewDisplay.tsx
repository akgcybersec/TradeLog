import { parseTradeReviewRaw } from "@/lib/ai/trade-review-format";

export function TradeReviewDisplay({
  review,
  compact = false,
}: {
  review: string;
  compact?: boolean;
}) {
  const data = parseTradeReviewRaw(review);
  const isLegacy = !data.mistake && !data.improvement;

  if (isLegacy) {
    return <p className="text-sm leading-relaxed text-slate-300">{data.summary}</p>;
  }

  return (
    <div className={`space-y-3 ${compact ? "text-sm" : ""}`}>
      <p className="leading-relaxed text-slate-200">{data.summary}</p>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-amber-400/90">Main mistake</p>
        <p className="mt-1 text-slate-300">{data.mistake}</p>
      </div>

      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-400/90">Improve next time</p>
        <p className="mt-1 text-slate-300">{data.improvement}</p>
      </div>

      {data.keepDoing && (
        <div className="rounded-lg border border-slate-700/80 bg-slate-950/40 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Keep doing</p>
          <p className="mt-1 text-slate-400">{data.keepDoing}</p>
        </div>
      )}
    </div>
  );
}
