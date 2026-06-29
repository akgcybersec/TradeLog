"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, Loader2, Sparkles, Clock, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, FadeIn } from "@/components/motion/PageTransition";
import { InsightReportDisplay } from "@/components/ai/InsightReportDisplay";
import { parseInsightReportRaw } from "@/lib/ai/insight-report-format";
import { formatCurrency } from "@/lib/calculations";
import type { TraderSnapshot } from "@/lib/ai/snapshot";

interface InsightReport {
  id: string;
  createdAt: string;
  content: string;
  tradeCount: number;
  newTradesSinceLast: number;
  snapshot: TraderSnapshot;
  previousReportId: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function InsightsPage() {
  const [reports, setReports] = useState<InsightReport[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/insights");
      const data = await res.json();
      const list: InsightReport[] = data.reports ?? [];
      setReports(list);
      setExpandedId((prev) => prev ?? list[0]?.id ?? null);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((data) => setAiConfigured(Boolean(data?.configured && data?.working)))
      .catch(() => setAiConfigured(false));
  }, [loadHistory]);

  const generateInsights = async () => {
    if (!aiConfigured) {
      setError("AI coach is disabled. Configure and verify an AI provider in Settings first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/insights", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to generate insights");
        return;
      }
      setReports((prev) => [data as InsightReport, ...prev.filter((r) => r.id !== data.id)]);
      setExpandedId(data.id);
    } catch {
      setError("Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  const toggleReport = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <PageTransition className="space-y-6">
      <FadeIn>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-2xl font-bold text-transparent">
              AI Coaching Insights
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-400">
              Short coaching snapshots across your journal. Tap a past run to expand it.
            </p>
          </div>
          <button
            onClick={generateInsights}
            disabled={loading || !aiConfigured}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            {loading ? "Analyzing..." : "Run New Analysis"}
          </button>
        </div>
      </FadeIn>

      {aiConfigured === false && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          AI coach is unavailable. Configure and verify your AI provider in Settings before running insights.
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      {loadingHistory ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : reports.length === 0 ? (
        <FadeIn delay={0.1}>
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-10 text-center">
            <Sparkles className="mx-auto mb-4 h-10 w-10 text-emerald-500" />
            <h2 className="text-lg font-semibold text-slate-200">Start Your Coaching Journey</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              With at least 3 closed trades, run your first analysis. Each run is saved with a timestamp
              you can reopen anytime.
            </p>
          </div>
        </FadeIn>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <InsightReportCard
              key={report.id}
              report={report}
              expanded={expandedId === report.id}
              onToggle={() => toggleReport(report.id)}
            />
          ))}
        </div>
      )}
    </PageTransition>
  );
}

function InsightReportCard({
  report,
  expanded,
  onToggle,
}: {
  report: InsightReport;
  expanded: boolean;
  onToggle: () => void;
}) {
  const parsed = parseInsightReportRaw(report.content);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/30">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-800/40"
      >
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
              <Clock className="h-3.5 w-3.5 text-emerald-500" />
              {formatDate(report.createdAt)}
            </span>
            <span className="text-xs text-slate-500">
              {report.tradeCount} trades
              {report.newTradesSinceLast > 0 && ` · +${report.newTradesSinceLast} new`}
            </span>
          </div>
          {!expanded && (
            <p className="mt-1 truncate text-sm text-slate-400">{parsed.headline}</p>
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-slate-800 px-4 pb-5 pt-4">
              <SnapshotBar report={report} />
              <InsightReportDisplay content={report.content} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SnapshotBar({ report }: { report: InsightReport }) {
  const s = report.snapshot;
  const positive = s.totalPnL >= 0;

  return (
    <div className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Trades analyzed" value={String(report.tradeCount)} />
      <Stat label="Win rate" value={`${s.winRate.toFixed(1)}%`} />
      <Stat
        label="Total P/L"
        value={formatCurrency(s.totalPnL)}
        variant={positive ? "positive" : "negative"}
      />
      <Stat
        label="Since last report"
        value={report.newTradesSinceLast > 0 ? `+${report.newTradesSinceLast} trades` : "First report"}
      />
      {s.avgRMultiple != null && <Stat label="Avg R" value={`${s.avgRMultiple.toFixed(2)}R`} />}
      {s.profitFactor != null && <Stat label="Profit factor" value={s.profitFactor.toFixed(2)} />}
    </div>
  );
}

function Stat({
  label,
  value,
  variant = "neutral",
}: {
  label: string;
  value: string;
  variant?: "positive" | "negative" | "neutral";
}) {
  const color = { positive: "text-emerald-400", negative: "text-red-400", neutral: "text-slate-100" }[variant];
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-mono text-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}
