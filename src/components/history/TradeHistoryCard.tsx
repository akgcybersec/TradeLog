"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TradeReviewDisplay } from "@/components/ai/TradeReviewDisplay";
import { motion, AnimatePresence } from "motion/react";
import { formatCurrency } from "@/lib/calculations";
import { formatRiskReward } from "@/lib/instruments";
import { ImageLightbox, type LightboxImage } from "@/components/history/ImageLightbox";
import { screenshotSrc } from "@/lib/uploads";
import {
  Brain,
  ChevronDown,
  MessageSquare,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
  Pencil,
} from "lucide-react";

export interface HistoryTrade {
  id: string;
  instrument: string;
  direction: string;
  entryPrice: number;
  exitPrice: number | null;
  profitLoss: number | null;
  isWinner: boolean | null;
  riskRewardRatio: number | null;
  strategy: string | null;
  notes: string | null;
  postTradeImpression: string | null;
  tradingProfileId: string | null;
  profileName: string | null;
  broker: string | null;
  tradingSession: string | null;
  closedAt: string | null;
  openedAt: string;
  hasAiReview: boolean;
  aiReviewedAt: string | null;
  screenshots: { id: string; path: string; filename: string; label: string | null }[];
}

interface TradeHistoryCardProps {
  trade: HistoryTrade;
  aiConfigured: boolean;
  defaultExpanded?: boolean;
}

export function TradeHistoryCard({ trade, aiConfigured, defaultExpanded = false }: TradeHistoryCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [aiReview, setAiReview] = useState<string | null>(null);

  const isClosed = trade.exitPrice != null;
  const closedDate = trade.closedAt
    ? new Date(trade.closedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const lightboxImages: LightboxImage[] = trade.screenshots.map((s) => ({
    src: screenshotSrc(s.path),
    alt: s.filename,
    label: s.label,
  }));

  useEffect(() => {
    if (!expanded || !trade.hasAiReview || aiReview) return;

    let cancelled = false;
    setLoadingReview(true);
    fetch(`/api/trades/${trade.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.aiReview) setAiReview(data.aiReview);
      })
      .finally(() => {
        if (!cancelled) setLoadingReview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [expanded, trade.hasAiReview, trade.id, aiReview]);

  const requestReview = async () => {
    setReviewing(true);
    try {
      const res = await fetch(`/api/trades/${trade.id}/review`, { method: "POST" });
      const data = await res.json();
      if (data.aiReview) setAiReview(data.aiReview);
    } finally {
      setReviewing(false);
    }
  };

  return (
    <>
      <article className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/30 transition-colors hover:border-slate-700">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left"
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-mono text-base font-semibold text-slate-100">{trade.instrument}</span>
            <span className={trade.direction === "buy" ? "text-emerald-400" : "text-red-400"}>
              {trade.direction.toUpperCase()}
            </span>
            {isClosed ? (
              <span
                className={`font-mono text-sm ${(trade.profitLoss ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {trade.profitLoss != null ? formatCurrency(trade.profitLoss) : "—"}
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">Open</span>
            )}
            {trade.strategy && (
              <span className="text-xs text-slate-500">{trade.strategy}</span>
            )}
            {trade.profileName && (
              <span className="text-xs text-slate-600">{trade.profileName}</span>
            )}
          </div>
          <div className="hidden shrink-0 items-center gap-4 text-xs text-slate-500 sm:flex">
            <span>{closedDate ?? "In progress"}</span>
            <span>{trade.tradingSession ?? "—"}</span>
            {trade.riskRewardRatio && <span>{formatRiskReward(trade.riskRewardRatio)}</span>}
          </div>
          {!isClosed && (
            <Link
              href={`/trades/${trade.id}?edit=1`}
              onClick={(e) => e.stopPropagation()}
              className="hidden shrink-0 cursor-pointer items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-400 transition-colors hover:bg-amber-500/20 sm:inline-flex"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Link>
          )}
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} className="shrink-0 text-slate-500">
            <ChevronDown className="h-5 w-5" />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="space-y-5 border-t border-slate-800 px-5 py-5">
                {trade.notes && (
                  <section>
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Your Notes
                    </h3>
                    <p className="rounded-lg bg-slate-950/50 px-4 py-3 text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
                      {trade.notes}
                    </p>
                  </section>
                )}

                {trade.screenshots.length > 0 && (
                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Chart Screenshots
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {trade.screenshots.map((shot, i) => (
                        <button
                          key={shot.id}
                          type="button"
                          onClick={() => setLightboxIndex(i)}
                          className="group relative cursor-pointer overflow-hidden rounded-lg border border-slate-700 transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-900/20"
                        >
                          <img
                            src={screenshotSrc(shot.path)}
                            alt={shot.filename}
                            className="h-24 w-40 object-cover transition-transform group-hover:scale-105"
                          />
                          {shot.label && (
                            <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/90 to-transparent px-2 py-1.5 text-left text-[10px] text-slate-400">
                              {shot.label}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {aiConfigured && isClosed && (
                  <section>
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-emerald-500/80">
                      <Brain className="h-3.5 w-3.5" />
                      AI Coaching
                    </h3>
                    {aiReview ? (
                      <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-4 py-4">
                        <TradeReviewDisplay review={aiReview} compact />
                      </div>
                    ) : loadingReview || reviewing ? (
                      <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-6 text-sm text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                        {reviewing ? "Generating coaching feedback…" : "Loading coaching feedback…"}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={requestReview}
                        className="cursor-pointer rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400 transition-colors hover:bg-emerald-500/20"
                      >
                        Generate AI feedback
                      </button>
                    )}
                  </section>
                )}

                <div className="flex justify-end gap-4 pt-1">
                  {!isClosed && (
                    <Link
                      href={`/trades/${trade.id}?edit=1`}
                      className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-amber-400/80 transition-colors hover:text-amber-400"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit trade
                    </Link>
                  )}
                  <Link
                    href={`/trades/${trade.id}`}
                    className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-emerald-400"
                  >
                    Full trade details
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </article>

      <ImageLightbox
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </>
  );
}
