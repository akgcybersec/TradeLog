"use client";

import { NumberField } from "@/components/ui/NumberField";
import { buildExitLevelOptions } from "@/lib/take-profit-targets";
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
  inputClass?: string;
  labelClass?: string;
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
  inputClass = "w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-colors",
  labelClass = "mb-2 block text-sm text-slate-400",
}: CloseTradeSectionProps) {
  const levelOptions = buildExitLevelOptions(stopLoss, takeProfit, additionalTakeProfits).filter(
    (opt) => Number.isFinite(opt.price) && opt.price > 0,
  );
  const selectedLevel = levelOptions.find((opt) => opt.id === exitOutcome);
  const isCustom = exitOutcome === "custom";
  const hasExit = isCustom ? Boolean(exitPrice.trim()) : Boolean(exitOutcome && selectedLevel);

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
          {closing ? "Closing..." : "Close Trade"}
        </button>
      )}
    </div>
  );
}
