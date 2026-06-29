"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TradeHistoryCard, type HistoryTrade } from "@/components/history/TradeHistoryCard";
import { PageTransition, FadeIn } from "@/components/motion/PageTransition";
import { PageHeader } from "@/components/ui/FormSection";
import { ChipFilter } from "@/components/dashboard/ChipFilter";
import { SymbolFilter } from "@/components/dashboard/SymbolFilter";
import type { TradingProfile } from "@/components/profiles/TradingProfileManager";
import { Loader2, PlusCircle, Search } from "lucide-react";

type Filter = "all" | "closed" | "open";

interface TradeHistoryListProps {
  profiles: TradingProfile[];
  aiConfigured: boolean;
}

interface HistoryResponse {
  trades: HistoryTrade[];
  page: number;
  hasMore: boolean;
  counts: { all: number; closed: number; open: number };
  symbols: string[];
}

export function TradeHistoryList({ profiles, aiConfigured }: TradeHistoryListProps) {
  const [filter, setFilter] = useState<Filter>("closed");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [profileFilter, setProfileFilter] = useState<string | null>(null);
  const [brokerFilter, setBrokerFilter] = useState<string | null>(null);
  const [symbolFilter, setSymbolFilter] = useState<string | null>(null);

  const [trades, setTrades] = useState<HistoryTrade[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [counts, setCounts] = useState({ all: 0, closed: 0, open: 0 });
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const brokers = useMemo(() => {
    const set = new Set<string>();
    for (const p of profiles) {
      if (p.broker?.trim()) set.add(p.broker.trim());
    }
    return [...set].sort();
  }, [profiles]);

  const loadPage = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        filter,
        page: String(targetPage),
      });
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (profileFilter) params.set("profileId", profileFilter);
      if (brokerFilter) params.set("broker", brokerFilter);
      if (symbolFilter) params.set("symbol", symbolFilter);

      try {
        const res = await fetch(`/api/trades/history?${params}`);
        const data: HistoryResponse = await res.json();
        if (!res.ok) {
          setError("Failed to load trades");
          return;
        }
        setTrades((prev) => (append ? [...prev, ...data.trades] : data.trades));
        setHasMore(data.hasMore);
        setCounts(data.counts);
        setSymbols(data.symbols);
        setPage(targetPage);
      } catch {
        setError("Failed to load trades");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, debouncedQuery, profileFilter, brokerFilter, symbolFilter],
  );

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  const loadMore = () => {
    if (!loadingMore && hasMore) loadPage(page + 1, true);
  };

  return (
    <PageTransition className="space-y-8">
      <FadeIn className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Trade History"
          description="Review past trades, your notes, chart setups, and AI coaching feedback."
        />
        <Link
          href="/trades/new"
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-900/30 transition-colors hover:bg-emerald-500"
        >
          <PlusCircle className="h-4 w-4" />
          New Trade
        </Link>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900/50 p-1">
            {(["closed", "open", "all"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {f} ({counts[f]})
              </button>
            ))}
          </div>

          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search instrument, strategy, notes…"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.04}>
        <div className="flex flex-col gap-3">
          {profiles.length > 0 && (
            <ChipFilter
              label="Account"
              options={profiles.map((p) => ({ value: p.id, label: p.name }))}
              selected={profileFilter}
              onChange={(v) => {
                setProfileFilter(v);
                if (v) setBrokerFilter(null);
              }}
            />
          )}
          {brokers.length > 0 && (
            <ChipFilter
              label="Broker"
              options={brokers.map((b) => ({ value: b, label: b }))}
              selected={brokerFilter}
              onChange={(v) => {
                setBrokerFilter(v);
                if (v) setProfileFilter(null);
              }}
            />
          )}
          <SymbolFilter symbols={symbols} selected={symbolFilter} onChange={setSymbolFilter} />
        </div>
      </FadeIn>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="space-y-3">
          {trades.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 py-16 text-center text-sm text-slate-400">
              No trades match your filter.
            </div>
          ) : (
            trades.map((trade, i) => (
              <TradeHistoryCard
                key={trade.id}
                trade={trade}
                aiConfigured={aiConfigured}
                defaultExpanded={i === 0 && filter === "closed" && page === 1}
              />
            ))
          )}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-5 py-2.5 text-sm text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100 disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  `Load more (${trades.length} of ${counts[filter]})`
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </PageTransition>
  );
}
