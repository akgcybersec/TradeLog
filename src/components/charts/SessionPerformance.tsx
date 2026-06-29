"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";

interface SessionPerformanceProps {
  trades: { tradingSession: string | null; profitLoss: number | null; exitPrice: number | null }[];
}

export function SessionPerformance({ trades }: SessionPerformanceProps) {
  const reduce = useReducedMotion();

  const sessions = useMemo(() => {
    const closed = trades.filter((t) => t.exitPrice != null);
    const map = new Map<string, { pnl: number; count: number; wins: number }>();

    for (const trade of closed) {
      const key = trade.tradingSession ?? "Unknown";
      const entry = map.get(key) ?? { pnl: 0, count: 0, wins: 0 };
      entry.pnl += trade.profitLoss ?? 0;
      entry.count += 1;
      if ((trade.profitLoss ?? 0) > 0) entry.wins += 1;
      map.set(key, entry);
    }

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        ...data,
        winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  if (sessions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-full min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-8 text-center"
      >
        <BarChart3 className="mb-3 h-10 w-10 text-slate-600" />
        <p className="text-sm text-slate-400">Session breakdown appears after closed trades</p>
      </motion.div>
    );
  }

  const maxAbs = Math.max(...sessions.map((s) => Math.abs(s.pnl)), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
      className="overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950/90"
    >
      <div className="border-b border-slate-800/80 px-5 py-4">
        <h3 className="text-base font-medium text-slate-300">Performance by Session</h3>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session, i) => {
          const widthPct = (Math.abs(session.pnl) / maxAbs) * 100;
          const positive = session.pnl >= 0;

          return (
            <div key={session.name}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-base text-slate-200">{session.name}</span>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-500">{session.count} trades</span>
                  <span className="text-slate-500">{session.winRate.toFixed(0)}% WR</span>
                  <span className={`min-w-[4.5rem] text-right font-mono font-medium ${positive ? "text-emerald-400" : "text-red-400"}`}>
                    {formatCurrency(session.pnl)}
                  </span>
                </div>
              </div>
              <div className="h-3.5 overflow-hidden rounded-full bg-slate-800/80">
                <motion.div
                  className={`h-full rounded-full ${positive ? "bg-gradient-to-r from-emerald-600 to-emerald-400" : "bg-gradient-to-r from-red-600 to-red-400"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{
                    duration: reduce ? 0 : 0.6,
                    delay: reduce ? 0 : 0.15 + i * 0.08,
                    ease: "easeOut",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
