"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RiskMetricsPanel } from "@/components/trade/RiskMetricsPanel";
import { PositionSizeField } from "@/components/trade/PositionSizeField";
import { CloseTradeSection } from "@/components/trade/CloseTradeSection";
import { ScreenshotUpload, type ScreenshotFile } from "@/components/trade/ScreenshotUpload";
import type { TradingProfile } from "@/components/profiles/TradingProfileManager";
import { FormSection } from "@/components/ui/FormSection";
import { NumberField } from "@/components/ui/NumberField";
import { suggestPositionSizeLots } from "@/lib/calculations";
import { getInstrumentSpec, getPopularInstruments } from "@/lib/instruments";
import { extractTimeMetadata } from "@/lib/sessions";
import type { SmartDefaults, TradeDirection, PositionUnit } from "@/types/trade";
import { ArrowDownRight, ArrowUpRight, Clock, Globe, Loader2, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function applyProfileToForm(
  profile: TradingProfile,
  setters: {
    setAccountBalance: (v: string) => void;
    setPositionSize: (v: string) => void;
    setPositionUnit: (v: PositionUnit) => void;
  },
) {
  setters.setAccountBalance(String(profile.currentBalance));
  if (profile.positionSizingMode === "manual") {
    setters.setPositionSize(String(profile.defaultPositionSize));
    setters.setPositionUnit("lots");
  }
}

export function TradeEntryForm() {
  const router = useRouter();
  const [defaults, setDefaults] = useState<SmartDefaults | null>(null);
  const [profiles, setProfiles] = useState<TradingProfile[]>([]);
  const [profileId, setProfileId] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);
  const [screenshots, setScreenshots] = useState<ScreenshotFile[]>([]);

  const [instrument, setInstrument] = useState("");
  const [direction, setDirection] = useState<TradeDirection>("buy");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [additionalTakeProfits, setAdditionalTakeProfits] = useState<string[]>([]);
  const [positionSize, setPositionSize] = useState("");
  const [positionUnit, setPositionUnit] = useState<PositionUnit>("lots");
  const [accountBalance, setAccountBalance] = useState("");
  const [strategy, setStrategy] = useState("");
  const [notes, setNotes] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [exitOutcome, setExitOutcome] = useState("");
  const [postTradeImpression, setPostTradeImpression] = useState("");

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === profileId) ?? null,
    [profiles, profileId],
  );

  useEffect(() => {
    Promise.all([fetch("/api/defaults"), fetch("/api/settings"), fetch("/api/trading-profiles")])
      .then(async ([dRes, sRes, pRes]) => {
        const d = await dRes.json();
        const s = await sRes.json();
        const p: TradingProfile[] = await pRes.json();
        setDefaults(d);
        setProfiles(p);
        setTimezone(s.timezone ?? "UTC");
        setInstrument(d.mostUsedInstrument ?? "");
        setStrategy(d.preferredStrategy ?? "");

        const defaultProfile = p.find((x) => x.isDefault) ?? p[0];
        if (defaultProfile) {
          setProfileId(defaultProfile.id);
          applyProfileToForm(defaultProfile, { setAccountBalance, setPositionSize, setPositionUnit });
        } else {
          setPositionSize(String(d.defaultPositionSize ?? 0.1));
          setAccountBalance(String(d.accountBalance ?? 10000));
        }
      })
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
  }, [
    selectedProfile,
    instrument,
    direction,
    entryPrice,
    stopLoss,
    accountBalance,
  ]);

  const spec = instrument ? getInstrumentSpec(instrument) : null;
  const openedAt = new Date();
  const timeMeta = extractTimeMetadata(openedAt, timezone);
  const num = (v: string) => (v === "" ? 0 : Number(v));

  const handleProfileChange = (id: string) => {
    setProfileId(id);
    const profile = profiles.find((p) => p.id === id);
    if (profile) applyProfileToForm(profile, { setAccountBalance, setPositionSize, setPositionUnit });
  };

  const addTakeProfit = () => setAdditionalTakeProfits((prev) => [...prev, ""]);

  const updateTakeProfitAt = (index: number, value: string) => {
    setAdditionalTakeProfits((prev) => prev.map((tp, i) => (i === index ? value : tp)));
  };

  const removeTakeProfitAt = (index: number) => {
    setAdditionalTakeProfits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradingProfileId: profileId || undefined,
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
          strategy: strategy || undefined,
          notes: notes || undefined,
          exitPrice: exitPrice ? num(exitPrice) : undefined,
          exitOutcome: exitPrice && exitOutcome ? exitOutcome : undefined,
          postTradeImpression: postTradeImpression.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to save trade");
      const trade = await res.json();

      for (const screenshot of screenshots) {
        const formData = new FormData();
        formData.append("file", screenshot.file);
        formData.append("tradeId", trade.id);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Screenshot upload failed");
        }
      }

      router.push(`/trades/${trade.id}`);
    } catch (error) {
      console.error(error);
      alert("Failed to save trade");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-colors";

  const labelClass = "mb-2 block text-sm text-slate-400";

  return (
    <form onSubmit={handleSubmit} className="divide-y divide-slate-800/80">
      <FormSection title="Trade Setup" className="pb-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.length > 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass}>Trading profile</label>
              <select
                value={profileId}
                onChange={(e) => handleProfileChange(e.target.value)}
                className={inputClass}
                required
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.broker ? ` · ${p.broker}` : ""}
                    {p.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </select>
              {selectedProfile && (
                <p className="mt-2 text-xs text-slate-500">
                  Current balance ${selectedProfile.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  {selectedProfile.positionSizingMode === "risk"
                    ? ` · Auto lot size @ ${selectedProfile.defaultRiskPercent}% risk`
                    : ` · Default ${selectedProfile.defaultPositionSize} lots`}
                </p>
              )}
            </div>
          )}

          <div className="sm:col-span-2">
            <label className={labelClass}>Instrument</label>
            <input
              list="instruments"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value.toUpperCase())}
              placeholder="EURUSD, XAUUSD, BTCUSD..."
              className={inputClass}
              required
            />
            <datalist id="instruments">
              {getPopularInstruments().map((i) => (
                <option key={i} value={i} />
              ))}
            </datalist>
            {spec && (
              <p className="mt-2 text-xs text-slate-500">
                {spec.assetClass} · Pip {spec.pipSize} · Tick {spec.tickSize} · {spec.decimalPrecision} decimals
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
                  <NumberField value={tp} onChange={(value) => updateTakeProfitAt(index, value)} />
                </div>
                <button
                  type="button"
                  onClick={() => removeTakeProfitAt(index)}
                  className="mb-0.5 flex cursor-pointer items-center gap-1 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addTakeProfit}
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100"
            >
              <Plus className="h-3.5 w-3.5" />
              + TP
            </button>
          </div>

          <div>
            <label className={labelClass}>
              Position Size
              {selectedProfile?.positionSizingMode === "risk" && (
                <span className="ml-1 text-xs text-emerald-500/80">(auto from risk %)</span>
              )}
            </label>
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
            <p className="mt-1 text-xs text-slate-500">Pre-filled from profile; edit if needed.</p>
          </div>

          <div>
            <label className={labelClass}>Strategy (optional)</label>
            <input
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              placeholder={defaults?.preferredStrategy ?? "Breakout, SMC, etc."}
              className={inputClass}
            />
          </div>
        </div>
      </FormSection>

      <AnimatePresence>
        {instrument && entryPrice && stopLoss && takeProfit && positionSize && (
          <motion.div
            key="metrics"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden border-b border-slate-800/80 py-10"
          >
            <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-slate-900/30 p-6 shadow-lg shadow-emerald-900/10">
              <RiskMetricsPanel
                instrument={instrument}
                direction={direction}
                entryPrice={num(entryPrice)}
                stopLoss={num(stopLoss)}
                takeProfit={num(takeProfit)}
                positionSize={num(positionSize)}
                positionUnit={positionUnit}
                accountBalance={num(accountBalance)}
                exitPrice={exitPrice ? num(exitPrice) : undefined}
                openedAt={openedAt}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FormSection title="Notes & Screenshots" className="py-10">
        <div className="space-y-6">
          <div>
            <label className={labelClass}>Trade Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Why are you taking this trade? Market context, thesis, emotions..."
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500">AI setup and post-trade reviews use your entry notes.</p>
          </div>
          <ScreenshotUpload files={screenshots} onChange={setScreenshots} />
        </div>
      </FormSection>

      <FormSection
        title="Close Trade"
        description="Optional — close now or leave open and finish later from the trade page."
        className="py-10"
      >
        <CloseTradeSection
          stopLoss={num(stopLoss)}
          takeProfit={num(takeProfit)}
          additionalTakeProfits={additionalTakeProfits.map((tp) => num(tp)).filter((tp) => tp > 0)}
          exitOutcome={exitOutcome}
          onExitOutcomeChange={setExitOutcome}
          exitPrice={exitPrice}
          onExitPriceChange={setExitPrice}
          postTradeImpression={postTradeImpression}
          onPostTradeImpressionChange={setPostTradeImpression}
          inputClass={inputClass}
          labelClass={labelClass}
        />
      </FormSection>

      <div className="space-y-6 pt-10">
        <section className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/20 px-5 py-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            <span>{timeMeta.dayOfWeek}, {timeMeta.timeOfDay}</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-500" />
            <span>{timeMeta.tradingSession}</span>
          </div>
          <span className="text-slate-600">|</span>
          <span>Auto-detected on save</span>
        </section>

        <div className="flex justify-end gap-3 pb-2">
          <motion.button
            type="button"
            onClick={() => router.back()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer rounded-lg border border-slate-700 px-5 py-2.5 text-sm text-slate-300 transition-colors hover:border-slate-600"
          >
            Cancel
          </motion.button>
          <motion.button
            type="submit"
            disabled={saving}
            whileHover={saving ? undefined : { scale: 1.03 }}
            whileTap={saving ? undefined : { scale: 0.97 }}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-900/30 transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Trade
          </motion.button>
        </div>
      </div>
    </form>
  );
}
