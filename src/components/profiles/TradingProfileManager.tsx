"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";

export interface TradingProfile {
  id: string;
  name: string;
  broker: string | null;
  accountLabel: string | null;
  initialBalance: number;
  defaultRiskPercent: number;
  defaultPositionSize: number;
  positionSizingMode: string;
  isDefault: boolean;
  currency: string;
  currentBalance: number;
}

const emptyForm = {
  name: "",
  broker: "",
  accountLabel: "",
  initialBalance: "10000",
  defaultRiskPercent: "1",
  defaultPositionSize: "0.1",
  positionSizingMode: "manual" as "manual" | "risk",
};

export function TradingProfileManager() {
  const [profiles, setProfiles] = useState<TradingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    broker: "",
    accountLabel: "",
    initialBalance: "10000",
    defaultRiskPercent: "1",
    defaultPositionSize: "0.1",
    positionSizingMode: "manual" as "manual" | "risk",
  });
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/trading-profiles");
    if (res.ok) setProfiles(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/trading-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          broker: form.broker || undefined,
          accountLabel: form.accountLabel || undefined,
          initialBalance: Number(form.initialBalance),
          defaultRiskPercent: Number(form.defaultRiskPercent),
          defaultPositionSize: Number(form.defaultPositionSize),
          positionSizingMode: form.positionSizingMode,
          isDefault: profiles.length === 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create profile");
        return;
      }
      setForm(emptyForm);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (id: string) => {
    setUpdatingId(id);
    try {
      await fetch(`/api/trading-profiles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      await load();
    } finally {
      setUpdatingId(null);
    }
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    const res = await fetch(`/api/trading-profiles/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to delete");
      setDeletingId(null);
      return;
    }
    setError("");
    await load();
    setDeletingId(null);
  };

  const startEdit = (profile: TradingProfile) => {
    setEditingId(profile.id);
    setEditForm({
      name: profile.name,
      broker: profile.broker ?? "",
      accountLabel: profile.accountLabel ?? "",
      initialBalance: String(profile.initialBalance),
      defaultRiskPercent: String(profile.defaultRiskPercent),
      defaultPositionSize: String(profile.defaultPositionSize),
      positionSizingMode: profile.positionSizingMode === "risk" ? "risk" : "manual",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      name: "",
      broker: "",
      accountLabel: "",
      initialBalance: "10000",
      defaultRiskPercent: "1",
      defaultPositionSize: "0.1",
      positionSizingMode: "manual",
    });
  };

  const saveEdit = async (id: string) => {
    setUpdatingId(id);
    setError("");
    try {
      const res = await fetch(`/api/trading-profiles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          broker: editForm.broker || undefined,
          accountLabel: editForm.accountLabel || undefined,
          initialBalance: Number(editForm.initialBalance),
          defaultRiskPercent: Number(editForm.defaultRiskPercent),
          defaultPositionSize: Number(editForm.defaultPositionSize),
          positionSizingMode: editForm.positionSizingMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update profile");
        return;
      }
      await load();
      cancelEdit();
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        Create a profile per broker/account. Balance updates from closed trades on that profile — no need to re-enter it each trade.
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {profiles.length > 0 && (
        <ul className="space-y-3">
          {profiles.map((p) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              className={`rounded-xl border px-4 py-3 transition-colors ${
                p.isDefault
                  ? "border-violet-500/60 bg-gradient-to-br from-violet-500/15 to-slate-900/60 shadow-lg shadow-violet-900/20"
                  : "border-slate-800 bg-slate-900/40"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-200">{p.name}</span>
                    {p.isDefault && (
                      <span className="rounded-full border border-violet-400/40 bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-200">
                        Default Profile
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {[p.broker, p.accountLabel].filter(Boolean).join(" · ") || "No broker label"}
                    {" · "}
                    Balance {formatCurrency(p.currentBalance, p.currency)}
                    {" · "}
                    {p.positionSizingMode === "risk"
                      ? `Auto size @ ${p.defaultRiskPercent}% risk`
                      : `Fixed ${p.defaultPositionSize} lots`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  {!p.isDefault && (
                    <button
                      type="button"
                      onClick={() => setDefault(p.id)}
                      disabled={updatingId === p.id}
                      className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 disabled:opacity-60"
                    >
                      {updatingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
                      Set default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    disabled={deletingId === p.id}
                    className="flex cursor-pointer items-center gap-1 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-60"
                  >
                    {deletingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Delete
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {editingId === p.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950/50 p-3"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Profile name</label>
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Broker</label>
                        <input
                          value={editForm.broker}
                          onChange={(e) => setEditForm((f) => ({ ...f, broker: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Account label</label>
                        <input
                          value={editForm.accountLabel}
                          onChange={(e) => setEditForm((f) => ({ ...f, accountLabel: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Starting balance</label>
                        <input
                          type="number"
                          min={1}
                          value={editForm.initialBalance}
                          onChange={(e) => setEditForm((f) => ({ ...f, initialBalance: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Default risk %</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.defaultRiskPercent}
                          onChange={(e) => setEditForm((f) => ({ ...f, defaultRiskPercent: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Position sizing</label>
                        <select
                          value={editForm.positionSizingMode}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, positionSizingMode: e.target.value as "manual" | "risk" }))
                          }
                          className={inputClass}
                        >
                          <option value="manual">Fixed lot size</option>
                          <option value="risk">Auto from risk %</option>
                        </select>
                      </div>
                      {editForm.positionSizingMode === "manual" && (
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Default lots</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.defaultPositionSize}
                            onChange={(e) => setEditForm((f) => ({ ...f, defaultPositionSize: e.target.value }))}
                            className={inputClass}
                          />
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(p.id)}
                        disabled={updatingId === p.id}
                        className="flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                      >
                        {updatingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Save changes
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-dashed border-slate-700 p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <Plus className="h-4 w-4 text-emerald-500" />
          New trading profile
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Profile name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="IC Markets — Prop"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Broker</label>
            <input
              value={form.broker}
              onChange={(e) => setForm((f) => ({ ...f, broker: e.target.value }))}
              placeholder="IC Markets, OANDA..."
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Account label (optional)</label>
            <input
              value={form.accountLabel}
              onChange={(e) => setForm((f) => ({ ...f, accountLabel: e.target.value }))}
              placeholder="Main, Challenge #1..."
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Starting balance</label>
            <input
              type="number"
              required
              min={1}
              value={form.initialBalance}
              onChange={(e) => setForm((f) => ({ ...f, initialBalance: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Default risk %</label>
            <input
              type="number"
              step="0.1"
              value={form.defaultRiskPercent}
              onChange={(e) => setForm((f) => ({ ...f, defaultRiskPercent: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Position sizing</label>
            <select
              value={form.positionSizingMode}
              onChange={(e) =>
                setForm((f) => ({ ...f, positionSizingMode: e.target.value as "manual" | "risk" }))
              }
              className={inputClass}
            >
              <option value="manual">Fixed lot size</option>
              <option value="risk">Auto from risk %</option>
            </select>
          </div>
          {form.positionSizingMode === "manual" && (
            <div>
              <label className="mb-1 block text-xs text-slate-500">Default lots</label>
              <input
                type="number"
                step="0.01"
                value={form.defaultPositionSize}
                onChange={(e) => setForm((f) => ({ ...f, defaultPositionSize: e.target.value }))}
                className={inputClass}
              />
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create profile"}
        </button>
      </form>
    </div>
  );
}
