"use client";

import { useMemo } from "react";
import { NumberField } from "@/components/ui/NumberField";
import { buildExitLevelOptions } from "@/lib/take-profit-targets";
import { calculateExitMetrics, calculateRiskMetrics, formatCurrency, formatPercent } from "@/lib/calculations";
import { getInstrumentSpec } from "@/lib/instruments";
import type { PositionUnit, TradeDirection } from "@/types/trade";
import { motion } from "motion/react";

interface CloseTradeSectionProps {
  stopLoss: number;
  takeProfit: number;
  additionalTakeProfits: number[];
  exitOutcome: string;
  onExitOutcomeChange: (outcome: string) => void;
  exitPrice: string;
  onExitPriceChange: (value: string) => void;
  postTradeImpression: string;
  onPostTradeImpressionChange: (value: string) => void;
  onClose?: () => void;
  closing?: boolean;
  showCloseButton?: boolean;
  closeButtonLabel?: string;
  inputClass?: string;
  labelClass?: string;
  /** When set, shows live P/L for the selected or custom exit price. */
  instrument?: string;
  direction?: TradeDirection;
  entryPrice?: number;
  positionSize?: number;
  positionUnit?: PositionUnit;
  accountBalance?: number;
  openedAt?: Date;
  closedAt?: Date;
}

function formatLevelPrice(price: number): string {
  if (!Number.isFinite(price)) return "";
  return String(price);
}

export function CloseTradeSection({
  stopLoss,
  takeProfit,
  additionalTakeProfits,
  exitOutcome,
  onExitOutcomeChange,
  exitPrice,
  onExitPriceChange,
  postTradeImpression,
  onPostTradeImpressionChange,
  onClose,
  closing = false,
  showCloseButton = false,
  closeButtonLabel = "Close Trade",
  inputClass = "w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-colors",
  labelClass = "mb-2 block text-sm text-slate-400",
  instrument,
  direction,
  entryPrice,
  positionSize,
  positionUnit = "lots",
  accountBalance,
  openedAt,
  closedAt,
}: CloseTradeSectionProps) {
  const levelOptions = buildExitLevelOptions(stopLoss, takeProfit, additionalTakeProfits).filter(
    (opt) => Number.isFinite(opt.price) && opt.price > 0,
  );
  const selectedLevel = levelOptions.find((opt) => opt.id === exitOutcome);
  const isCustom = exitOutcome === "custom";
  const hasExit = isCustom ? Boolean(exitPrice.trim()) : Boolean(exitOutcome && selectedLevel);

  const exitPreview = useMemo(() => {
    if (
      !hasExit ||
      !instrument ||
      !direction ||
      entryPrice == null ||
      positionSize == null ||
      accountBalance == null
    ) {
      return null;
    }
    const price = Number(exitPrice);
    if (!Number.isFinite(price) || price <= 0) return null;

    const spec = getInstrumentSpec(instrument);
    const risk = calculateRiskMetrics(
      {
        instrument,
        direction,
        entryPrice,
        stopLoss,
        takeProfit,
        positionSize,
        positionUnit,
        accountBalance,
      },
      spec,
    );
    return calculateExitMetrics(
      direction,
      entryPrice,
      price,
      stopLoss,
      takeProfit,
      positionSize,
      positionUnit,
      accountBalance,
      spec,
      risk.potentialProfit,
      risk.potentialLoss,
      openedAt ?? new Date(),
      closedAt ?? new Date(),
    );
  }, [
    hasExit,
    instrument,
    direction,
    entryPrice,
    positionSize,
    positionUnit,
    accountBalance,
    exitPrice,
    stopLoss,
    takeProfit,
    openedAt,
    closedAt,
  ]);

  const selectOutcome = (id: string, price: number) => {
    onExitOutcomeChange(id);
    onExitPriceChange(formatLevelPrice(price));
  };

  const selectCustom = () => {
    onExitOutcomeChange("custom");
    onExitPriceChange("");
  };

  return (
    <div className="grid max-w-2xl gap-5">
      <div>
        <label className={labelClass}>How did the trade close?</label>
        <div className="flex flex-wrap gap-2">
          {levelOptions.map((opt) => (
            <motion.button
              key={opt.id}
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => selectOutcome(opt.id, opt.price)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                exitOutcome === opt.id
                  ? opt.id === "sl"
                    ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/40"
                    : "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {opt.label}
            </motion.button>
          ))}
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={selectCustom}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isCustom
                ? "bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/40"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            Custom price
          </motion.button>
        </div>
      </div>

      {isCustom ? (
        <div className="max-w-xs">
          <label className={labelClass}>Exit price</label>
          <NumberField
            value={exitPrice}
            onChange={onExitPriceChange}
            placeholder="Enter your exit price"
            autoFocus
          />
        </div>
      ) : selectedLevel ? (
        <div className="max-w-xs rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2.5">
          <p className="text-xs text-slate-500">Exit price (from {selectedLevel.label})</p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-slate-100">{exitPrice}</p>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Select SL, a TP level, or Custom price above.</p>
      )}

      {exitPreview?.profitLoss != null && (
        <div className="max-w-md rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Estimated result</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p
              className={`font-mono text-xl font-semibold ${
                exitPreview.profitLoss >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {formatCurrency(exitPreview.profitLoss)}
            </p>
            {exitPreview.profitLossPercent != null && (
              <p className="font-mono text-sm text-slate-400">{formatPercent(exitPreview.profitLossPercent)}</p>
            )}
            {exitPreview.actualRMultiple != null && (
              <p className="font-mono text-sm text-slate-400">{exitPreview.actualRMultiple.toFixed(2)}R</p>
            )}
            {exitPreview.pipsWonLost != null && (
              <p className="font-mono text-sm text-slate-400">{exitPreview.pipsWonLost.toFixed(1)} pips</p>
            )}
          </div>
        </div>
      )}

      {hasExit && (
        <div>
          <label className={labelClass}>Post-trade reflection (optional)</label>
          <textarea
            value={postTradeImpression}
            onChange={(e) => onPostTradeImpressionChange(e.target.value)}
            rows={3}
            placeholder="How did it feel? Any mistake? What to correct next time?"
            className={inputClass}
          />
        </div>
      )}

      {showCloseButton && onClose && (
        <button
          type="button"
          onClick={onClose}
          disabled={!hasExit || closing}
          className="w-fit cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {closing ? "Saving..." : closeButtonLabel}
        </button>
      )}
    </div>
  );
}
