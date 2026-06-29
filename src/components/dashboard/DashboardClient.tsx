"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { formatCurrency } from "@/lib/calculations";
import { AnimatedCard, FadeIn, PageTransition } from "@/components/motion/PageTransition";
import { EquityCurve } from "@/components/charts/EquityCurve";
import { SessionPerformance } from "@/components/charts/SessionPerformance";
import { SymbolPerformance } from "@/components/charts/SymbolPerformance";
import { SymbolFilter } from "@/components/dashboard/SymbolFilter";
import { ChipFilter } from "@/components/dashboard/ChipFilter";
import type { TradingProfile } from "@/components/profiles/TradingProfileManager";
import { DashboardViewToggle, type DashboardView } from "@/components/dashboard/DashboardViewToggle";
import { TradingCalendar } from "@/components/dashboard/TradingCalendar";
import { PlusCircle, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { useViewSettings } from "@/contexts/ViewSettingsContext";

export interface DashboardTrade {
  id: string;
  instrument: string;
  direction: string;
  riskRewardRatio: number | null;
  tradingSession: string | null;
  profitLoss: number | null;
  exitPrice: number | null;
  isWinner: boolean | null;
  closedAt: string | null;
  openedAt: string | null;
  accountBalance?: number | null;
  tradingProfileId: string | null;
  broker: string | null;
  profileName: string | null;
}

interface DashboardClientProps {
  trades: DashboardTrade[];
  profiles: TradingProfile[];
  startingBalance: number;
}

export function DashboardClient({ trades, profiles, startingBalance }: DashboardClientProps) {
  const reduce = useReducedMotion();
  const { viewSettings, loading: viewLoading } = useViewSettings();
  const [symbolFilter, setSymbolFilter] = useState<string | null>(null);
  const [profileFilter, setProfileFilter] = useState<string | null>(null);
  const [brokerFilter, setBrokerFilter] = useState<string | null>(null);
  const [view, setView] = useState<DashboardView | null>(null);

  useEffect(() => {
    if (!viewLoading && view === null) {
      setView(viewSettings.dashboardDefaultView);
    }
  }, [viewLoading, view, viewSettings.dashboardDefaultView]);

  const activeView = view ?? viewSettings.dashboardDefaultView;

  const symbols = useMemo(
    () => [...new Set(trades.map((t) => t.instrument))].sort(),
    [trades],
  );

  const brokers = useMemo(() => {
    const set = new Set<string>();
    for (const p of profiles) {
      if (p.broker?.trim()) set.add(p.broker.trim());
    }
    return [...set].sort();
  }, [profiles]);

  const profileOptions = useMemo(
    () => profiles.map((p) => ({ value: p.id, label: p.name })),
    [profiles],
  );

  const brokerProfileIds = useMemo(() => {
    if (!brokerFilter) return null;
    return new Set(profiles.filter((p) => p.broker === brokerFilter).map((p) => p.id));
  }, [profiles, brokerFilter]);

  const filtered = useMemo(() => {
    let result = trades;
    if (profileFilter) {
      result = result.filter((t) => t.tradingProfileId === profileFilter);
    } else if (brokerProfileIds) {
      result = result.filter((t) => t.tradingProfileId && brokerProfileIds.has(t.tradingProfileId));
    }
    if (symbolFilter) result = result.filter((t) => t.instrument === symbolFilter);
    return result;
  }, [trades, profileFilter, brokerProfileIds, symbolFilter]);

  const effectiveStartingBalance = useMemo(() => {
    if (profileFilter) {
      const p = profiles.find((x) => x.id === profileFilter);
      return p?.initialBalance ?? startingBalance;
    }
    if (brokerFilter) {
      return profiles.filter((p) => p.broker === brokerFilter).reduce((s, p) => s + p.initialBalance, 0);
    }
    if (profiles.length > 0) {
      return profiles.reduce((s, p) => s + p.initialBalance, 0);
    }
    return startingBalance;
  }, [profileFilter, brokerFilter, profiles, startingBalance]);

  const stats = useMemo(() => {
    const closed = filtered.filter((t) => t.exitPrice != null);
    const winners = closed.filter((t) => t.isWinner);
    const totalPnL = closed.reduce((sum, t) => sum + (t.profitLoss ?? 0), 0);
    return {
      totalTrades: filtered.length,
      winRate: closed.length > 0 ? (winners.length / closed.length) * 100 : 0,
      totalPnL,
      openTrades: filtered.length - closed.length,
      closedCount: closed.length,
    };
  }, [filtered]);

  return (
    <PageTransition className="space-y-8">
      <FadeIn className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-2xl font-bold text-transparent">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">Your trading performance at a glance</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DashboardViewToggle view={activeView} onChange={setView} />
          <motion.div whileHover={reduce ? undefined : { scale: 1.03 }} whileTap={reduce ? undefined : { scale: 0.97 }}>
            <Link
              href="/trades/new"
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-900/30 transition-colors hover:bg-emerald-500"
            >
              <PlusCircle className="h-4 w-4" />
              New Trade
            </Link>
          </motion.div>
        </div>
      </FadeIn>

      <FadeIn delay={0.03}>
        <div className="flex flex-col gap-3">
          {profileOptions.length > 0 && (
            <ChipFilter
              label="Account"
              options={profileOptions}
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

      <AnimatePresence mode="wait">
        {activeView === "calendar" ? (
          <motion.div
            key="calendar"
            initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <TradingCalendar trades={filtered} />
          </motion.div>
        ) : (
          <motion.div
            key="detailed"
            initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="space-y-8"
          >
            <DetailedView trades={filtered} stats={stats} startingBalance={effectiveStartingBalance} reduce={!!reduce} />
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

function DetailedView({
  trades,
  stats,
  startingBalance,
  reduce,
}: {
  trades: DashboardTrade[];
  stats: {
    totalTrades: number;
    winRate: number;
    totalPnL: number;
    openTrades: number;
    closedCount: number;
  };
  startingBalance: number;
  reduce: boolean;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Trades" value={String(stats.totalTrades)} icon={BarChart3} delay={0} />
        <StatCard
          label="Win Rate"
          value={stats.closedCount > 0 ? `${stats.winRate.toFixed(1)}%` : "—"}
          icon={TrendingUp}
          variant="positive"
          delay={0.05}
        />
        <StatCard
          label="Total P/L"
          value={formatCurrency(stats.totalPnL)}
          icon={stats.totalPnL >= 0 ? TrendingUp : TrendingDown}
          variant={stats.totalPnL >= 0 ? "positive" : "negative"}
          delay={0.1}
        />
        <StatCard label="Open Trades" value={String(stats.openTrades)} icon={BarChart3} delay={0.15} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <EquityCurve trades={trades} startingBalance={startingBalance} />
        </div>
        <SymbolPerformance trades={trades} />
      </div>

      <SessionPerformance trades={trades} />

      <FadeIn delay={0.15}>
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-200">Recent Trades</h2>
          {trades.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">
              No trades match this filter.
            </div>
          ) : (
            <>
              <div className="space-y-2 lg:hidden">
                {trades.slice(0, 10).map((trade) => (
                  <Link
                    key={trade.id}
                    href={`/trades/${trade.id}`}
                    className="block rounded-xl border border-slate-800 bg-slate-900/30 p-4 transition-colors hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-mono text-sm font-semibold text-emerald-400">{trade.instrument}</span>
                        <span className={`ml-2 text-xs ${trade.direction === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                          {trade.direction.toUpperCase()}
                        </span>
                      </div>
                      {trade.exitPrice ? (
                        <span className={`font-mono text-sm ${(trade.profitLoss ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {trade.profitLoss != null ? formatCurrency(trade.profitLoss) : "—"}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">Open</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {trade.riskRewardRatio != null && <span>R:R 1:{trade.riskRewardRatio.toFixed(1)}</span>}
                      {trade.tradingSession && <span>{trade.tradingSession}</span>}
                      {trade.exitPrice && (
                        <span className={trade.isWinner ? "text-emerald-500" : "text-red-400"}>
                          {trade.isWinner ? "Win" : "Loss"}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              <div className="hidden overflow-x-auto rounded-xl border border-slate-800 lg:block">
                <table className="w-full min-w-[640px] text-base">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-left text-slate-400">
                    <th className="px-5 py-3.5 font-medium">Instrument</th>
                    <th className="px-5 py-3.5 font-medium">Direction</th>
                    <th className="px-5 py-3.5 font-medium">R:R</th>
                    <th className="px-5 py-3.5 font-medium">Session</th>
                    <th className="px-5 py-3.5 font-medium">P/L</th>
                    <th className="px-5 py-3.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 10).map((trade, i) => (
                    <motion.tr
                      key={trade.id}
                      initial={reduce ? false : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.03 }}
                      className="border-b border-slate-800/50 transition-colors hover:bg-slate-900/30"
                    >
                      <td className="px-5 py-3.5">
                        <Link href={`/trades/${trade.id}`} className="cursor-pointer font-mono text-emerald-400 hover:underline">
                          {trade.instrument}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={trade.direction === "buy" ? "text-emerald-400" : "text-red-400"}>
                          {trade.direction.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-300">
                        {trade.riskRewardRatio ? `1:${trade.riskRewardRatio.toFixed(1)}` : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">{trade.tradingSession ?? "—"}</td>
                      <td className={`px-5 py-3.5 font-mono ${(trade.profitLoss ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {trade.profitLoss != null ? formatCurrency(trade.profitLoss) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {trade.exitPrice ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs ${trade.isWinner ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                            {trade.isWinner ? "Win" : "Loss"}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">Open</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </section>
      </FadeIn>
    </>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  variant = "neutral",
  delay = 0,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "positive" | "negative" | "neutral";
  delay?: number;
}) {
  const color = { positive: "text-emerald-400", negative: "text-red-400", neutral: "text-slate-100" }[variant];

  return (
    <AnimatedCard delay={delay} className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
      <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <motion.div
        className={`font-mono text-2xl font-bold ${color}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: delay + 0.15, type: "spring" }}
      >
        {value}
      </motion.div>
    </AnimatedCard>
  );
}
