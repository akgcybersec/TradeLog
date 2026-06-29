"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";

interface EquityPoint {
  label: string;
  date: Date;
  equity: number;
  change: number;
  cumulative: number;
}

interface EquityCurveProps {
  trades: { closedAt: string | Date | null; profitLoss: number | null; accountBalance?: number | null }[];
  startingBalance?: number;
}

function niceTicks(min: number, max: number, count: number): number[] {
  const range = max - min || 1;
  const rough = range / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalized = rough / magnitude;
  const step =
    normalized <= 1 ? magnitude : normalized <= 2 ? 2 * magnitude : normalized <= 5 ? 5 * magnitude : 10 * magnitude;

  const ticks: number[] = [];
  const start = Math.floor(min / step) * step;
  for (let v = start; v <= max + step * 0.01; v += step) {
    if (v >= min - step * 0.01 && v <= max + step * 0.01) ticks.push(v);
  }
  return ticks.length > 0 ? ticks : [min, max];
}

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function formatAxisValue(value: number): string {
  if (Math.abs(value) >= 10000) return `$${(value / 1000).toFixed(0)}k`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

export function EquityCurve({ trades, startingBalance = 10000 }: EquityCurveProps) {
  const reduce = useReducedMotion();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { points, peak, drawdown, finalEquity, isPositive } = useMemo(() => {
    const closed = trades
      .filter((t) => t.closedAt != null && t.profitLoss != null)
      .sort((a, b) => new Date(a.closedAt!).getTime() - new Date(b.closedAt!).getTime());

    const base = trades.find((t) => t.accountBalance)?.accountBalance ?? startingBalance;
    let cumulative = 0;
    let peakEquity = base;
    let maxDrawdown = 0;

    const data: EquityPoint[] = [
      {
        label: "Start",
        date: closed[0] ? new Date(closed[0].closedAt!) : new Date(),
        equity: base,
        change: 0,
        cumulative: 0,
      },
    ];

    for (const trade of closed) {
      const change = trade.profitLoss ?? 0;
      cumulative += change;
      const equity = base + cumulative;
      peakEquity = Math.max(peakEquity, equity);
      const dd = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
      maxDrawdown = Math.max(maxDrawdown, dd);

      const date = new Date(trade.closedAt!);
      data.push({
        label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        date,
        equity,
        change,
        cumulative,
      });
    }

    const last = data[data.length - 1];
    return {
      points: data,
      peak: peakEquity,
      drawdown: maxDrawdown,
      finalEquity: last?.equity ?? base,
      isPositive: (last?.cumulative ?? 0) >= 0,
    };
  }, [trades, startingBalance]);

  if (points.length < 2) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-[16rem] flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/20 text-center"
      >
        <TrendingUp className="mb-3 h-10 w-10 text-slate-600" />
        <p className="text-sm text-slate-400">Equity curve appears after your first closed trade</p>
        <p className="mt-1 text-xs text-slate-500">Close a trade with an exit price to track account growth</p>
      </motion.div>
    );
  }

  const width = 800;
  const height = 280;
  const pad = { top: 16, right: 16, bottom: 28, left: 48 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const equities = points.map((p) => p.equity);
  const rawMin = Math.min(...equities);
  const rawMax = Math.max(...equities);
  const padding = (rawMax - rawMin) * 0.12 || startingBalance * 0.02;
  const min = rawMin - padding;
  const max = rawMax + padding;
  const range = max - min || 1;

  const coords = points.map((p, i) => ({
    x: pad.left + (i / (points.length - 1)) * chartW,
    y: pad.top + chartH - ((p.equity - min) / range) * chartH,
    ...p,
  }));

  const linePath = smoothPath(coords);
  const baseline = pad.top + chartH;
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${baseline} L ${coords[0].x} ${baseline} Z`;

  const yTicks = niceTicks(min, max, 4);
  const xLabelIndices = coords
    .map((_, i) => i)
    .filter((i) => i === 0 || i === coords.length - 1 || i % Math.ceil(coords.length / 4) === 0);

  const stroke = isPositive ? "#22c55e" : "#ef4444";
  const active = hoveredIndex !== null ? coords[hoveredIndex] : coords[coords.length - 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950/90"
    >
      <div className="border-b border-slate-800/80 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-medium text-slate-300">Account Equity</h3>
          </div>
          <div className="text-right">
            <div className={`font-mono text-lg font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
              {formatCurrency(finalEquity)}
            </div>
            <div className={`text-[10px] font-medium ${isPositive ? "text-emerald-500/80" : "text-red-500/80"}`}>
              {isPositive ? "+" : ""}
              {formatCurrency(finalEquity - startingBalance)} total
            </div>
          </div>
        </div>
        <div className="mt-2 flex gap-3 text-[10px] text-slate-500">
          <span>Peak <span className="font-mono text-slate-400">{formatCurrency(peak)}</span></span>
          <span>Max DD <span className="font-mono text-amber-400/90">{drawdown.toFixed(1)}%</span></span>
        </div>
      </div>

      <div className="relative px-2 pb-2 pt-1">
        {active && (
          <div className="pointer-events-none absolute right-5 top-2 z-10 rounded-lg border border-slate-700/80 bg-slate-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm">
            <div className="font-medium text-slate-300">{active.label}</div>
            <div className="mt-0.5 font-mono text-sm text-slate-100">{formatCurrency(active.equity)}</div>
            {active.change !== 0 && (
              <div className={`font-mono ${active.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {active.change >= 0 ? "+" : ""}
                {formatCurrency(active.change)}
              </div>
            )}
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-h-[240px]"
          aria-label="Account equity curve"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="equityLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.6" />
              <stop offset="50%" stopColor={stroke} stopOpacity="1" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0.85" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {yTicks.map((tick) => {
            const y = pad.top + chartH - ((tick - min) / range) * chartH;
            return (
              <g key={tick}>
                <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#1e293b" strokeWidth="1" />
                <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-slate-600 text-[10px] font-mono">
                  {formatAxisValue(tick)}
                </text>
              </g>
            );
          })}

          <line
            x1={pad.left}
            y1={pad.top + chartH - ((startingBalance - min) / range) * chartH}
            x2={width - pad.right}
            y2={pad.top + chartH - ((startingBalance - min) / range) * chartH}
            stroke="#475569"
            strokeWidth="1"
            strokeDasharray="6 4"
            opacity="0.5"
          />

          <motion.path
            d={areaPath}
            fill="url(#equityFill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          />

          <motion.path
            d={linePath}
            fill="none"
            stroke="url(#equityLine)"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#glow)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduce ? 0 : 1.4, ease: "easeInOut" }}
          />

          {coords.map((c, i) => (
            <g key={i}>
              <rect
                x={i === 0 ? pad.left : (coords[i - 1].x + c.x) / 2}
                y={pad.top}
                width={
                  i === 0
                    ? (coords[1]?.x ?? c.x) - pad.left
                    : i === coords.length - 1
                      ? width - pad.right - (coords[i - 1].x + c.x) / 2
                      : (coords[i + 1].x - coords[i - 1].x) / 2
                }
                height={chartH}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIndex(i)}
              />
              {(hoveredIndex === i || (hoveredIndex === null && i === coords.length - 1)) && (
                <>
                  <line
                    x1={c.x}
                    y1={pad.top}
                    x2={c.x}
                    y2={baseline}
                    stroke="#334155"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <circle cx={c.x} cy={c.y} r="5" fill="#0f172a" stroke={stroke} strokeWidth="2.5" />
                  <circle cx={c.x} cy={c.y} r="2" fill={stroke} />
                </>
              )}
            </g>
          ))}

          {xLabelIndices.map((i) => (
            <text
              key={i}
              x={coords[i].x}
              y={height - 10}
              textAnchor="middle"
              className="fill-slate-600 text-[10px]"
            >
              {coords[i].label}
            </text>
          ))}
        </svg>
      </div>

      <div className="hidden items-center justify-center gap-3 border-t border-slate-800/60 px-3 py-1.5 text-[10px] text-slate-600 sm:flex">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 border-t border-dashed border-slate-500" />
          Starting balance
        </span>
        <span className="flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          Hover chart for trade-by-trade detail
        </span>
      </div>
    </motion.div>
  );
}
