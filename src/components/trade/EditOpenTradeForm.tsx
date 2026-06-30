"use client";

import { useEffect, useMemo, useState } from "react";
import { RiskMetricsPanel } from "@/components/trade/RiskMetricsPanel";
import { PositionSizeField } from "@/components/trade/PositionSizeField";
import type { TradingProfile } from "@/components/profiles/TradingProfileManager";
import { NumberField } from "@/components/ui/NumberField";
import { suggestPositionSizeLots } from "@/lib/calculations";
import { getInstrumentSpec, getPopularInstruments } from "@/lib/instruments";
import { parseAdditionalTakeProfits } from "@/lib/take-profit-targets";
import type { TradeDirection, PositionUnit } from "@/types/trade";
import { ArrowDownRight, ArrowUpRight, Loader2, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface OpenTradeData {
  id: string;
  tradingProfileId: string | null;
  instrument: string;
  direction: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  takeProfitTargetsJson: string | null;
  positionSize: number;
  positionUnit: string;
  accountBalance: number;
  strategy: string | null;
  notes: string | null;
  openedAt: string;
}

interface EditOpenTradeFormProps {
  trade: OpenTradeData;
  onSaved: (updated: unknown) => void;
  onCancel: () => void;
}

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-colors";
const labelClass = "mb-2 block text-sm text-slate-400";

export function EditOpenTradeForm({ trade, onSaved, onCancel }: EditOpenTradeFormProps) {
  const [profiles, setProfiles] = useState<TradingProfile[]>([]);
  const [profileId, setProfileId] = useState(trade.tradingProfileId ?? "");
  const [saving, setSaving] = useState(false);

  const [instrument, setInstrument] = useState(trade.instrument);
  const [direction, setDirection] = useState<TradeDirection>(trade.direction as TradeDirection);
  const [entryPrice, setEntryPrice] = useState(String(trade.entryPrice));
  const [stopLoss, setStopLoss] = useState(String(trade.stopLoss));
  const [takeProfit, setTakeProfit] = useState(String(trade.takeProfit));
  const [additionalTakeProfits, setAdditionalTakeProfits] = useState<string[]>(() =>
    parseAdditionalTakeProfits(trade.takeProfitTargetsJson).map(String),
  );
  const [positionSize, setPositionSize] = useState(String(trade.positionSize));
  const [positionUnit, setPositionUnit] = useState<PositionUnit>(trade.positionUnit as PositionUnit);
  const [accountBalance, setAccountBalance] = useState(String(trade.accountBalance));
  const [strategy, setStrategy] = useState(trade.strategy ?? "");
  const [notes, setNotes] = useState(trade.notes ?? "");

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === profileId) ?? null,
    [profiles, profileId],
  );

  useEffect(() => {
    fetch("/api/trading-profiles")
      .then((r) => r.json())
      .then(setProfiles)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedProfile || selectedProfile.positionSizingMode !== "risk") return;
    const entry = Number(entryPrice);
    const sl = Number(stopLoss);
    const balance = Number(accountBalance);
    if (!instrument || !entry || !sl || !balance) return;

    const lots = suggestPositionSizeLots(
      instrument,
      direction,
      entry,
      sl,
      balance,
      selectedProfile.defaultRiskPercent,
    );
    if (lots != null && lots > 0) {
      setPositionSize(String(lots));
      setPositionUnit("lots");
    }
  }, [selectedProfile, instrument, direction, entryPrice, stopLoss, accountBalance]);

  const spec = instrument ? getInstrumentSpec(instrument) : null;
  const openedAt = new Date(trade.openedAt);
  const num = (v: string) => (v === "" ? 0 : Number(v));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/trades/${trade.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradingProfileId: profileId || null,
          instrument,
          direction,
          entryPrice: num(entryPrice),
          stopLoss: num(stopLoss),
          takeProfit: num(takeProfit),
          additionalTakeProfits: additionalTakeProfits
            .map((tp) => num(tp))
            .filter((tp) => Number.isFinite(tp) && tp > 0),
          positionSize: num(positionSize),
          positionUnit,
          accountBalance: num(accountBalance),
          strategy: strategy || null,
          notes: notes || null,
        }),
      });
      const updated = await res.json();
      if (!res.ok) {
        alert(updated.error ?? "Failed to update trade");
        return;
      }
      onSaved(updated);
    } catch {
      alert("Failed to update trade");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.length > 0 && (
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={labelClass}>Trading profile</label>
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className={inputClass}
            >
              <option value="">No profile</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.broker ? ` · ${p.broker}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className={labelClass}>Instrument</label>
          <input
            list="edit-instruments"
            value={instrument}
            onChange={(e) => setInstrument(e.target.value.toUpperCase())}
            className={inputClass}
            required
          />
          <datalist id="edit-instruments">
            {getPopularInstruments().map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
          {spec && (
            <p className="mt-2 text-xs text-slate-500">
              {spec.assetClass} · Pip {spec.pipSize} · {spec.decimalPrecision} decimals
            </p>
          )}
        </div>

        <div>
          <label className={labelClass}>Direction</label>
          <div className="flex gap-2">
            {(["buy", "sell"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  direction === d
                    ? d === "buy"
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                      : "border-red-500 bg-red-500/15 text-red-400"
                    : "border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                {d === "buy" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {d === "buy" ? "Buy" : "Sell"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Entry Price</label>
          <NumberField value={entryPrice} onChange={setEntryPrice} required />
        </div>
        <div>
          <label className={labelClass}>Stop Loss</label>
          <NumberField value={stopLoss} onChange={setStopLoss} required />
        </div>
        <div>
          <label className={labelClass}>Take Profit (TP1)</label>
          <NumberField value={takeProfit} onChange={setTakeProfit} required />
        </div>

        <div className="sm:col-span-2 lg:col-span-3 space-y-3">
          {additionalTakeProfits.map((tp, index) => (
            <div key={`tp-${index}`} className="flex items-end gap-2">
              <div className="flex-1">
                <label className={labelClass}>Take Profit {index + 2}</label>
                <NumberField value={tp} onChange={(value) => setAdditionalTakeProfits((prev) => prev.map((t, i) => (i === index ? value : t)))} />
              </div>
              <button
                type="button"
                onClick={() => setAdditionalTakeProfits((prev) => prev.filter((_, i) => i !== index))}
                className="mb-0.5 flex cursor-pointer items-center gap-1 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAdditionalTakeProfits((prev) => [...prev, ""])}
            className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-600"
          >
            <Plus className="h-3.5 w-3.5" />
            + TP
          </button>
        </div>

        <div>
          <label className={labelClass}>Position Size</label>
          <PositionSizeField
            value={positionSize}
            unit={positionUnit}
            onValueChange={setPositionSize}
            onUnitChange={setPositionUnit}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Account Balance (at entry)</label>
          <NumberField value={accountBalance} onChange={setAccountBalance} required />
        </div>
        <div>
          <label className={labelClass}>Strategy (optional)</label>
          <input value={strategy} onChange={(e) => setStrategy(e.target.value)} className={inputClass} />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className={labelClass}>Trade Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </div>
      </div>

      <AnimatePresence>
        {instrument && entryPrice && stopLoss && takeProfit && positionSize && (
          <motion.div
            key="metrics"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-slate-900/30 p-6">
              <RiskMetricsPanel
                instrument={instrument}
                direction={direction}
                entryPrice={num(entryPrice)}
                stopLoss={num(stopLoss)}
                takeProfit={num(takeProfit)}
                positionSize={num(positionSize)}
                positionUnit={positionUnit}
                accountBalance={num(accountBalance)}
                openedAt={openedAt}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-lg border border-slate-700 px-5 py-2.5 text-sm text-slate-300 transition-colors hover:border-slate-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-900/30 transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Changes
        </button>
      </div>
    </form>
  );
}
