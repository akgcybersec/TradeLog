"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import type { DashboardTrade } from "@/components/dashboard/DashboardClient";
import { formatCurrency } from "@/lib/calculations";
import { formatPnLCompact, groupTradesByDay, type DayStats } from "@/lib/calendar-stats";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface TradingCalendarProps {
  trades: DashboardTrade[];
}

export function TradingCalendar({ trades }: TradingCalendarProps) {
  const reduce = useReducedMotion();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const dayMap = useMemo(() => groupTradesByDay(trades), [trades]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const monthStats = useMemo(() => {
    let totalPnL = 0;
    let wins = 0;
    let losses = 0;
    let tradeCount = 0;

    for (const [key, stats] of dayMap) {
      if (!key.startsWith(format(month, "yyyy-MM"))) continue;
      totalPnL += stats.totalPnL;
      wins += stats.wins;
      losses += stats.losses;
      tradeCount += stats.totalTrades;
    }

    return { totalPnL, wins, losses, tradeCount };
  }, [dayMap, month]);

  const goPrev = () => setMonth((m) => subMonths(m, 1));
  const goNext = () => setMonth((m) => addMonths(m, 1));
  const goToday = () => setMonth(startOfMonth(new Date()));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="cursor-pointer rounded-lg border border-slate-800 p-2 text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <motion.h2
            key={format(month, "yyyy-MM")}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-w-[10rem] text-center font-mono text-lg font-semibold text-slate-100 sm:min-w-[12rem] sm:text-xl"
          >
            {format(month, "MMMM yyyy")}
          </motion.h2>
          <button
            type="button"
            onClick={goNext}
            className="cursor-pointer rounded-lg border border-slate-800 p-2 text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="cursor-pointer rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
          >
            Today
          </button>
        </div>

        <div className="flex flex-wrap gap-4">
          <MonthStat label="Trades" value={String(monthStats.tradeCount)} />
          <MonthStat label="Wins" value={String(monthStats.wins)} variant="positive" />
          <MonthStat label="Losses" value={String(monthStats.losses)} variant="negative" />
          <MonthStat
            label="Month P/L"
            value={formatCurrency(monthStats.totalPnL)}
            variant={monthStats.totalPnL >= 0 ? "positive" : "negative"}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/30">
        <div className="min-w-[320px]">
        <div className="grid grid-cols-7 divide-x divide-slate-800 border-b border-slate-800 bg-slate-900/50">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-1 py-2 text-center text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:px-3 sm:py-3.5 sm:text-sm">
              <span className="sm:hidden">{day.charAt(0)}</span>
              <span className="hidden sm:inline">{day}</span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={format(month, "yyyy-MM")}
            initial={reduce ? false : { opacity: 0, x: reduce ? 0 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-7 divide-x divide-y divide-slate-800"
          >
            {calendarDays.map((day, i) => {
              const key = format(day, "yyyy-MM-dd");
              const inMonth = isSameMonth(day, month);
              const stats = dayMap.get(key);
              const rowCount = Math.ceil(calendarDays.length / 7);
              const rowIndex = Math.floor(i / 7);
              return (
                <CalendarDay
                  key={key}
                  day={day}
                  inMonth={inMonth}
                  stats={stats}
                  index={i}
                  isLastRow={rowIndex === rowCount - 1}
                  isHovered={hoveredKey === key}
                  onHover={setHoveredKey}
                  reduce={!!reduce}
                />
              );
            })}
          </motion.div>
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function MonthStat({
  label,
  value,
  variant = "neutral",
}: {
  label: string;
  value: string;
  variant?: "positive" | "negative" | "neutral";
}) {
  const color = { positive: "text-emerald-400", negative: "text-red-400", neutral: "text-slate-200" }[variant];
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2">
      <span className="text-sm text-slate-500">{label}</span>
      <p className={`font-mono text-base font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function CalendarDay({
  day,
  inMonth,
  stats,
  index,
  isLastRow,
  isHovered,
  onHover,
  reduce,
}: {
  day: Date;
  inMonth: boolean;
  stats?: DayStats;
  index: number;
  isLastRow: boolean;
  isHovered: boolean;
  onHover: (key: string | null) => void;
  reduce: boolean;
}) {
  const key = format(day, "yyyy-MM-dd");
  const hasTrades = stats && stats.totalTrades > 0;
  const pnl = stats?.totalPnL ?? 0;
  const positive = pnl > 0;
  const negative = pnl < 0;

  const bgTint = !hasTrades
    ? ""
    : positive
      ? "bg-emerald-500/[0.08]"
      : negative
        ? "bg-red-500/[0.08]"
        : "bg-amber-500/[0.06]";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: inMonth ? 1 : 0.35, scale: 1 }}
      transition={{ delay: reduce ? 0 : (index % 7) * 0.02 + Math.floor(index / 7) * 0.03 }}
      className={`relative min-h-[var(--view-calendar-cell-min-height,8.5rem)] overflow-visible p-1.5 sm:p-3 ${bgTint} ${
        isToday(day) ? "ring-1 ring-inset ring-emerald-500/40" : ""
      } ${isLastRow ? "border-b border-slate-800" : ""}`}
      onMouseEnter={() => hasTrades && onHover(key)}
      onMouseLeave={() => onHover(null)}
    >
      <motion.div
        className="relative flex h-full flex-col"
        animate={isHovered && !reduce ? { scale: 1.06 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        style={{ zIndex: isHovered ? 20 : 1 }}
      >
        <span
          className={`text-xs font-medium sm:text-sm ${
            isToday(day) ? "text-emerald-400" : inMonth ? "text-slate-400" : "text-slate-600"
          }`}
        >
          {format(day, "d")}
        </span>

        {hasTrades && (
          <div className="mt-auto space-y-0.5">
            {stats!.closedCount > 0 && (
              <p
                className={`font-mono text-sm font-semibold leading-tight ${
                  positive ? "text-emerald-400" : negative ? "text-red-400" : "text-slate-400"
                }`}
              >
                {formatPnLCompact(pnl)}
              </p>
            )}
            <p className="text-xs text-slate-500">
              {stats!.totalTrades} trade{stats!.totalTrades !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {isHovered && stats && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 6 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-xl border border-slate-700/80 bg-slate-900/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-md"
          >
            <p className="mb-2 font-mono text-xs font-semibold text-slate-300">{format(day, "EEE, MMM d")}</p>

            <div className="mb-2 grid grid-cols-3 gap-2">
              <HoverStat label="Trades" value={stats.totalTrades} />
              <HoverStat label="Wins" value={stats.wins} color="text-emerald-400" icon={TrendingUp} />
              <HoverStat label="Losses" value={stats.losses} color="text-red-400" icon={TrendingDown} />
            </div>

            {stats.closedCount > 0 && (
              <p
                className={`mb-2 font-mono text-sm font-bold ${
                  stats.totalPnL >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {formatCurrency(stats.totalPnL)}
              </p>
            )}

            {stats.openCount > 0 && (
              <p className="mb-2 text-[10px] text-amber-400">{stats.openCount} open</p>
            )}

            <ul className="max-h-28 space-y-1 overflow-y-auto border-t border-slate-800 pt-2">
              {stats.trades.slice(0, 5).map((trade) => (
                <li key={trade.id} className="pointer-events-auto flex items-center justify-between gap-2 text-[11px]">
                  <Link
                    href={`/trades/${trade.id}`}
                    className="cursor-pointer truncate font-mono text-emerald-400 hover:underline"
                  >
                    {trade.instrument}
                  </Link>
                  <span
                    className={`shrink-0 font-mono ${
                      trade.exitPrice == null
                        ? "text-amber-400"
                        : (trade.profitLoss ?? 0) >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                    }`}
                  >
                    {trade.exitPrice == null
                      ? "Open"
                      : formatPnLCompact(trade.profitLoss ?? 0)}
                  </span>
                </li>
              ))}
              {stats.trades.length > 5 && (
                <li className="text-[10px] text-slate-500">+{stats.trades.length - 5} more</li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HoverStat({
  label,
  value,
  color = "text-slate-200",
  icon: Icon,
}: {
  label: string;
  value: number;
  color?: string;
  icon?: typeof TrendingUp;
}) {
  return (
    <div className="rounded-lg bg-slate-800/60 px-2 py-1.5 text-center">
      {Icon && <Icon className={`mx-auto mb-0.5 h-3 w-3 ${color}`} />}
      <p className={`font-mono text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
