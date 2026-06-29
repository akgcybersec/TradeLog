"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import { formatDuration } from "@/lib/sessions";
import { formatRiskReward, getAssetClassLabel } from "@/lib/instruments";
import {
  ArrowLeft,
  Brain,
  Loader2,
  Clock,
  Globe,
  Image as ImageIcon,
} from "lucide-react";
import { TradeReviewDisplay } from "@/components/ai/TradeReviewDisplay";
import { SetupReviewDisplay } from "@/components/ai/SetupReviewDisplay";
import { CloseTradeSection } from "@/components/trade/CloseTradeSection";
import { parseAdditionalTakeProfits } from "@/lib/take-profit-targets";
import { PageTransition, FadeIn } from "@/components/motion/PageTransition";
import { ImageLightbox } from "@/components/history/ImageLightbox";

interface Trade {
  id: string;
  instrument: string;
  direction: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  takeProfitTargetsJson: string | null;
  exitPrice: number | null;
  exitOutcome: string | null;
  positionSize: number;
  positionUnit: string;
  accountBalance: number;
  strategy: string | null;
  notes: string | null;
  postTradeImpression: string | null;
  tradingProfile?: { name: string; broker: string | null } | null;
  assetClass: string;
  pipSize: number;
  quoteCurrency: string;
  riskRewardRatio: number | null;
  slDistancePips: number | null;
  tpDistancePips: number | null;
  potentialProfit: number | null;
  potentialLoss: number | null;
  riskPercent: number | null;
  rewardPercent: number | null;
  profitLoss: number | null;
  profitLossPercent: number | null;
  pipsWonLost: number | null;
  isWinner: boolean | null;
  tradeDurationMs: number | null;
  actualRMultiple: number | null;
  plannedProfitCaptured: number | null;
  plannedLossUsed: number | null;
  tradingSession: string | null;
  dayOfWeek: string | null;
  timeOfDay: string | null;
  month: string | null;
  year: number | null;
  aiReview: string | null;
  aiReviewedAt: string | null;
  aiSetupReview: string | null;
  aiSetupReviewedAt: string | null;
  screenshots: { id: string; path: string; filename: string; label: string | null }[];
}

export default function TradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [exitPrice, setExitPrice] = useState("");
  const [exitOutcome, setExitOutcome] = useState("");
  const [postTradeImpression, setPostTradeImpression] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [setupReviewing, setSetupReviewing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const additionalTakeProfits = trade
    ? parseAdditionalTakeProfits(trade.takeProfitTargetsJson)
    : [];

  const loadTrade = () => {
    Promise.all([fetch(`/api/trades/${id}`), fetch("/api/ai/status")])
      .then(async ([tRes, aRes]) => {
        const data = await tRes.json();
        const ai = await aRes.json();
        setTrade(data);
        setAiConfigured(ai.configured);
        if (data.exitPrice) setExitPrice(String(data.exitPrice));
        if (data.exitOutcome) setExitOutcome(data.exitOutcome);
        if (data.postTradeImpression) setPostTradeImpression(data.postTradeImpression);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTrade();
  }, [id]);

  const handleCloseTrade = async () => {
    if (!exitPrice) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/trades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exitPrice: Number(exitPrice),
          exitOutcome: exitOutcome || undefined,
          postTradeImpression: postTradeImpression.trim() || undefined,
        }),
      });
      const updated = await res.json();
      setTrade(updated);
    } finally {
      setClosing(false);
    }
  };

  const requestSetupReview = async () => {
    setSetupReviewing(true);
    try {
      const res = await fetch(`/api/trades/${id}/setup-review`, { method: "POST" });
      const updated = await res.json();
      if (updated.error) alert(updated.error);
      else setTrade(updated);
    } finally {
      setSetupReviewing(false);
    }
  };

  const requestReview = async () => {
    setReviewing(true);
    try {
      const res = await fetch(`/api/trades/${id}/review`, { method: "POST" });
      const updated = await res.json();
      if (updated.error) alert(updated.error);
      else setTrade(updated);
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!trade) {
    return <p className="text-slate-400">Trade not found</p>;
  }

  return (
    <PageTransition className="space-y-8">
      <FadeIn>
      <div className="flex items-start justify-between">
        <div>
          <Link href="/history" className="mb-3 inline-flex cursor-pointer items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
            <ArrowLeft className="h-4 w-4" />
            Back to History
          </Link>
          <h1 className="font-mono text-2xl font-bold text-slate-100">
            {trade.instrument}{" "}
            <span className={trade.direction === "buy" ? "text-emerald-400" : "text-red-400"}>
              {trade.direction.toUpperCase()}
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {getAssetClassLabel(trade.assetClass as "forex")} · {trade.quoteCurrency}
            {trade.tradingProfile && (
              <>
                {" · "}
                {trade.tradingProfile.name}
                {trade.tradingProfile.broker ? ` (${trade.tradingProfile.broker})` : ""}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {aiConfigured && !trade.exitPrice && (
            <button
              onClick={requestSetupReview}
              disabled={setupReviewing}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-400 transition-colors hover:bg-sky-500/20 disabled:opacity-50"
            >
              {setupReviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              {trade.aiSetupReview ? "Refresh Setup Opinion" : "AI Setup Opinion"}
            </button>
          )}
          {aiConfigured && trade.exitPrice && (
            <button
              onClick={requestReview}
              disabled={reviewing}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              {trade.aiReview ? "Regenerate Review" : "AI Coach Review"}
            </button>
          )}
        </div>
      </div>
      </FadeIn>

      <FadeIn delay={0.05}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DetailCard label="Entry" value={trade.entryPrice.toString()} />
        <DetailCard label="Stop Loss" value={trade.stopLoss.toString()} />
        <DetailCard label="Take Profit (TP1)" value={trade.takeProfit.toString()} />
        <DetailCard label="R:R" value={formatRiskReward(trade.riskRewardRatio)} accent />
      </div>
      </FadeIn>

      {additionalTakeProfits.length > 0 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
          <h2 className="mb-3 text-sm font-medium text-slate-300">Additional Take Profits</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {additionalTakeProfits.map((tp, index) => (
              <DetailCard key={`tp-${index + 2}`} label={`TP${index + 2}`} value={tp.toString()} />
            ))}
          </div>
        </section>
      )}

      {!trade.exitPrice && setupReviewing && (
        <section className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/30 px-5 py-4 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
          Analyzing your open setup…
        </section>
      )}

      {!trade.exitPrice && trade.aiSetupReview && (
        <section className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-sky-400">
              <Brain className="h-5 w-5" />
              AI Setup Opinion
            </h2>
            {trade.aiSetupReviewedAt && (
              <span className="text-xs text-slate-500">
                {new Date(trade.aiSetupReviewedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          <SetupReviewDisplay review={trade.aiSetupReview} />
        </section>
      )}

      {trade.notes && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
          <h2 className="mb-2 text-sm font-medium text-slate-300">Entry notes</h2>
          <p className="text-sm text-slate-400 whitespace-pre-wrap">{trade.notes}</p>
        </section>
      )}

      {trade.screenshots.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-300">
            <ImageIcon className="h-4 w-4" />
            Screenshots
          </h2>
          <div className="flex flex-wrap gap-3">
            {trade.screenshots.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="group cursor-pointer overflow-hidden rounded-xl border border-slate-800 transition-colors hover:border-emerald-500/50"
              >
                <img src={s.path} alt={s.filename} className="h-28 w-44 object-cover transition-transform group-hover:scale-105" />
              </button>
            ))}
          </div>
          <ImageLightbox
            images={trade.screenshots.map((s) => ({ src: s.path, alt: s.filename, label: s.label }))}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        </section>
      )}

      {!trade.exitPrice && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <h2 className="mb-1 text-sm font-medium text-amber-400">Close This Trade</h2>
          <p className="mb-4 text-xs text-slate-500">Pick how it closed — price fills automatically. Add reflection for your coach.</p>
          <CloseTradeSection
            stopLoss={trade.stopLoss}
            takeProfit={trade.takeProfit}
            additionalTakeProfits={additionalTakeProfits}
            exitOutcome={exitOutcome}
            onExitOutcomeChange={setExitOutcome}
            exitPrice={exitPrice}
            onExitPriceChange={setExitPrice}
            postTradeImpression={postTradeImpression}
            onPostTradeImpressionChange={setPostTradeImpression}
            onClose={handleCloseTrade}
            closing={closing}
            showCloseButton
          />
        </section>
      )}

      {trade.exitPrice && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
          <h2 className="mb-4 text-sm font-medium text-slate-300">Exit Results</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailCard label="Exit Price" value={trade.exitPrice.toString()} />
            {trade.exitOutcome && (
              <DetailCard
                label="Exit type"
                value={
                  trade.exitOutcome === "sl"
                    ? "SL Hit"
                    : trade.exitOutcome === "custom"
                      ? "Custom"
                      : trade.exitOutcome.toUpperCase()
                }
              />
            )}
            <DetailCard
              label="P/L"
              value={formatCurrency(trade.profitLoss)}
              variant={trade.isWinner ? "positive" : "negative"}
            />
            <DetailCard label="P/L %" value={formatPercent(trade.profitLossPercent)} />
            <DetailCard label="R-Multiple" value={trade.actualRMultiple != null ? `${trade.actualRMultiple.toFixed(2)}R` : "—"} />
            <DetailCard label="Pips" value={trade.pipsWonLost?.toFixed(1) ?? "—"} />
            <DetailCard label="Duration" value={formatDuration(trade.tradeDurationMs)} />
            <DetailCard label="Profit Captured" value={trade.plannedProfitCaptured != null ? `${trade.plannedProfitCaptured.toFixed(0)}%` : "—"} />
            <DetailCard
              label="Result"
              value={trade.isWinner ? "Winner" : "Loser"}
              variant={trade.isWinner ? "positive" : "negative"}
            />
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
        <h2 className="mb-4 text-sm font-medium text-slate-300">Risk Analysis</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailCard label="SL Distance" value={`${trade.slDistancePips?.toFixed(1) ?? "—"} pips`} />
          <DetailCard label="TP Distance" value={`${trade.tpDistancePips?.toFixed(1) ?? "—"} pips`} />
          <DetailCard label="Potential Loss" value={formatCurrency(trade.potentialLoss)} variant="negative" />
          <DetailCard label="Potential Profit" value={formatCurrency(trade.potentialProfit)} variant="positive" />
          <DetailCard label="Risk %" value={formatPercent(trade.riskPercent)} />
          <DetailCard label="Reward %" value={formatPercent(trade.rewardPercent)} />
        </div>
      </section>

      <section className="flex flex-wrap gap-4 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-500" />
          {trade.dayOfWeek}, {trade.timeOfDay}
        </div>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-emerald-500" />
          {trade.tradingSession}
        </div>
        {trade.strategy && <span>Strategy: {trade.strategy}</span>}
      </section>

      {trade.postTradeImpression && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
          <h2 className="mb-2 text-sm font-medium text-slate-300">Post-trade reflection</h2>
          <p className="text-sm text-slate-400 whitespace-pre-wrap">{trade.postTradeImpression}</p>
        </section>
      )}

      {aiConfigured && trade.exitPrice && !trade.aiReview && (
        <section className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/30 px-5 py-4 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
          AI coaching feedback is being generated…
        </section>
      )}

      {aiConfigured && trade.aiReview && (
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-emerald-400">
              <Brain className="h-5 w-5" />
              AI Coach Feedback
            </h2>
            {trade.aiReviewedAt && (
              <span className="text-xs text-slate-500">
                Reviewed{" "}
                {new Date(trade.aiReviewedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          <div className="max-w-none">
            <TradeReviewDisplay review={trade.aiReview} />
          </div>
        </section>
      )}
    </PageTransition>
  );
}

function DetailCard({
  label,
  value,
  variant = "neutral",
  accent = false,
}: {
  label: string;
  value: string;
  variant?: "positive" | "negative" | "neutral";
  accent?: boolean;
}) {
  const color = accent
    ? "text-emerald-400"
    : { positive: "text-emerald-400", negative: "text-red-400", neutral: "text-slate-100" }[variant];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 font-mono text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}
