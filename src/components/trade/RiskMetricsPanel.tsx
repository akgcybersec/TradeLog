"use client";

import { useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { calculateRiskMetrics, calculateExitMetrics, formatCurrency, formatPercent } from "@/lib/calculations";
import { getInstrumentSpec, formatRiskReward, getAssetClassLabel } from "@/lib/instruments";
import type { TradeDirection, PositionUnit } from "@/types/trade";
import { TrendingUp, TrendingDown, Shield, Target, Scale, Percent, DollarSign, Activity } from "lucide-react";

interface RiskMetricsPanelProps {
  instrument: string;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  positionUnit: PositionUnit;
  accountBalance: number;
  exitPrice?: number;
  openedAt?: Date;
  closedAt?: Date;
}

function MetricItem({
  label,
  value,
  icon: Icon,
  variant = "neutral",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "positive" | "negative" | "neutral" | "accent";
}) {
  const colorClass = {
    positive: "text-emerald-400",
    negative: "text-red-400",
    neutral: "text-slate-200",
    accent: "text-emerald-500",
  }[variant];

  const reduce = useReducedMotion();

  return (
    <motion.div
      layout
      initial={reduce ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 transition-colors hover:border-emerald-500/30 hover:shadow-sm hover:shadow-emerald-500/5"
    >
      <div className="mb-1 flex items-center gap-2 text-xs text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={value}
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className={`font-mono text-sm font-semibold ${colorClass}`}
        >
          {value}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export function RiskMetricsPanel(props: RiskMetricsPanelProps) {
  const spec = useMemo(() => getInstrumentSpec(props.instrument), [props.instrument]);

  const risk = useMemo(
    () =>
      calculateRiskMetrics({
        instrument: props.instrument,
        direction: props.direction,
        entryPrice: props.entryPrice,
        stopLoss: props.stopLoss,
        takeProfit: props.takeProfit,
        positionSize: props.positionSize,
        positionUnit: props.positionUnit,
        accountBalance: props.accountBalance,
      }, spec),
    [props, spec],
  );

  const exit = useMemo(() => {
    if (!props.exitPrice || !props.openedAt) return null;
    return calculateExitMetrics(
      props.direction,
      props.entryPrice,
      props.exitPrice,
      props.stopLoss,
      props.takeProfit,
      props.positionSize,
      props.positionUnit,
      props.accountBalance,
      spec,
      risk.potentialProfit,
      risk.potentialLoss,
      props.openedAt,
      props.closedAt ?? new Date(),
    );
  }, [props, spec, risk]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="space-y-4 overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">Live Calculations</h3>
        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
          {getAssetClassLabel(spec.assetClass)} · Pip {spec.pipSize} · {spec.quoteCurrency}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricItem label="Risk : Reward" value={formatRiskReward(risk.riskRewardRatio)} icon={Scale} variant="accent" />
        <MetricItem
          label="SL Distance"
          value={risk.slDistancePips != null ? `${risk.slDistancePips.toFixed(1)}` : "—"}
          icon={Shield}
        />
        <MetricItem
          label="TP Distance"
          value={risk.tpDistancePips != null ? `${risk.tpDistancePips.toFixed(1)}` : "—"}
          icon={Target}
        />
        <MetricItem
          label="Potential Loss"
          value={formatCurrency(risk.potentialLoss)}
          icon={TrendingDown}
          variant="negative"
        />
        <MetricItem
          label="Potential Profit"
          value={formatCurrency(risk.potentialProfit)}
          icon={TrendingUp}
          variant="positive"
        />
        <MetricItem label="Risk %" value={formatPercent(risk.riskPercent)} icon={Percent} variant="negative" />
        <MetricItem label="Reward %" value={formatPercent(risk.rewardPercent)} icon={Percent} variant="positive" />
        <MetricItem
          label="Break-even"
          value={risk.breakEvenPrice?.toFixed(spec.decimalPrecision) ?? "—"}
          icon={Activity}
        />
        <MetricItem
          label="R-Multiple (Plan)"
          value={risk.plannedRMultiple != null ? `${risk.plannedRMultiple.toFixed(2)}R` : "—"}
          icon={Scale}
        />
        <MetricItem
          label="Exposure"
          value={formatCurrency(risk.positionExposure)}
          icon={DollarSign}
        />
      </div>

      {exit && props.exitPrice != null && (
        <div className="border-t border-slate-800 pt-4">
          <h3 className="mb-3 text-sm font-medium text-slate-300">Exit Metrics</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <MetricItem
              label="P/L"
              value={formatCurrency(exit.profitLoss)}
              icon={exit.isWinner ? TrendingUp : TrendingDown}
              variant={exit.isWinner ? "positive" : "negative"}
            />
            <MetricItem label="P/L %" value={formatPercent(exit.profitLossPercent)} icon={Percent} />
            <MetricItem
              label="Pips Won/Lost"
              value={exit.pipsWonLost != null ? exit.pipsWonLost.toFixed(1) : "—"}
              icon={Activity}
            />
            <MetricItem
              label="Result"
              value={exit.isWinner ? "Winner" : exit.profitLoss === 0 ? "Breakeven" : "Loser"}
              icon={exit.isWinner ? TrendingUp : TrendingDown}
              variant={exit.isWinner ? "positive" : "negative"}
            />
            <MetricItem
              label="R-Multiple"
              value={exit.actualRMultiple != null ? `${exit.actualRMultiple.toFixed(2)}R` : "—"}
              icon={Scale}
            />
            <MetricItem
              label="Profit Captured"
              value={exit.plannedProfitCaptured != null ? `${exit.plannedProfitCaptured.toFixed(0)}%` : "—"}
              icon={Target}
            />
            <MetricItem
              label="Loss Used"
              value={exit.plannedLossUsed != null ? `${exit.plannedLossUsed.toFixed(0)}%` : "—"}
              icon={Shield}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
