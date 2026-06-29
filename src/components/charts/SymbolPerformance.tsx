"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Coins } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";

interface SymbolPerformanceProps {
  trades: { instrument: string; profitLoss: number | null; exitPrice: number | null; isWinner: boolean | null }[];
}

export function SymbolPerformance({ trades }: SymbolPerformanceProps) {
  const reduce = useReducedMotion();

  const symbols = useMemo(() => {
    const closed = trades.filter((t) => t.exitPrice != null);
    const map = new Map<string, { pnl: number; count: number; wins: number }>();

    for (const trade of closed) {
      const key = trade.instrument;
      const entry = map.get(key) ?? { pnl: 0, count: 0, wins: 0 };
      entry.pnl += trade.profitLoss ?? 0;
      entry.count += 1;
      if (trade.isWinner) entry.wins += 1;
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

  if (symbols.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-6 text-center"
      >
        <Coins className="mb-3 h-10 w-10 text-slate-600" />
        <p className="text-sm text-slate-400">Symbol breakdown appears after closed trades</p>
      </motion.div>
    );
  }

  const maxAbs = Math.max(...symbols.map((s) => Math.abs(s.pnl)), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.15 }}
      className="overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950/90"
    >
      <div className="border-b border-slate-800/80 px-5 py-4">
        <h3 className="text-base font-medium text-slate-300">Performance by Symbol</h3>
      </div>

      <div className="max-h-64 space-y-3 overflow-y-auto p-5">
        {symbols.map((symbol, i) => {
          const widthPct = (Math.abs(symbol.pnl) / maxAbs) * 100;
          const positive = symbol.pnl >= 0;

          return (
            <div key={symbol.name}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="font-mono text-base font-medium text-slate-200">{symbol.name}</span>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-500">{symbol.count} trades</span>
                  <span className="text-slate-500">{symbol.winRate.toFixed(0)}% WR</span>
                  <span className={`min-w-[4.5rem] text-right font-mono font-medium ${positive ? "text-emerald-400" : "text-red-400"}`}>
                    {formatCurrency(symbol.pnl)}
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
                    delay: reduce ? 0 : 0.1 + i * 0.06,
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
