"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Key, Globe, Brain, Monitor, RotateCcw, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { PageTransition, FadeIn } from "@/components/motion/PageTransition";
import {
  DENSITY_OPTIONS,
  VIEW_FONT_SCALE_MAX,
  VIEW_FONT_SCALE_MIN,
  VIEW_SETTINGS_DEFAULTS,
  VIEW_UI_ZOOM_MAX,
  VIEW_UI_ZOOM_MIN,
  applyViewSettingsToDocument,
  notifyViewSettingsChanged,
} from "@/lib/view-settings";
import { normalizeSettingsFormState, type SettingsFormState } from "@/lib/settings-form";
import { AI_PROVIDER_LIST, getProvider, type AiProviderId } from "@/lib/ai/providers";
import { pickDefaultModel } from "@/lib/ai/models";
import { LoginAccountSetup } from "@/components/auth/LoginAccountSetup";

type Settings = SettingsFormState;
type AiStatus = {
  provider: "anthropic" | "openai" | "gemini";
  configured: boolean;
  working: boolean;
  message: string;
};
type AiModelsResponse = {
  provider: "anthropic" | "openai" | "gemini";
  configured: boolean;
  models: string[];
  message: string;
};
type MarketDataStatus = {
  configured: boolean;
  working: boolean;
  message: string;
};

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Europe/London", "Europe/Berlin", "Asia/Tokyo", "Asia/Singapore",
  "Australia/Sydney",
];

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [checkingAi, setCheckingAi] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsMessage, setModelsMessage] = useState("");
  const [loadingModels, setLoadingModels] = useState(false);
  const [checkingAiKey, setCheckingAiKey] = useState(false);
  const [marketDataStatus, setMarketDataStatus] = useState<MarketDataStatus | null>(null);
  const [checkingMarketData, setCheckingMarketData] = useState(false);
  const [aiKeyValid, setAiKeyValid] = useState(false);
  const [hasUser, setHasUser] = useState(false);
  const [pendingLoginEnable, setPendingLoginEnable] = useState(false);

  const loadAiStatus = async () => {
    setCheckingAi(true);
    try {
      const res = await fetch("/api/ai/status");
      if (!res.ok) {
        setAiStatus(null);
        return;
      }
      const data = await res.json();
      setAiStatus(data);
    } catch {
      setAiStatus(null);
    } finally {
      setCheckingAi(false);
    }
  };

  const loadProviderModels = async (providerId: AiProviderId) => {
    setLoadingModels(true);
    setModelsMessage("");
    try {
      const res = await fetch(`/api/ai/models?provider=${providerId}`);
      const data = (await res.json()) as AiModelsResponse | { message?: string };
      if (!res.ok) {
        setAvailableModels([]);
        setAiKeyValid(false);
        setModelsMessage((data as { message?: string }).message ?? "Unable to load models");
        return;
      }
      const models = Array.isArray((data as AiModelsResponse).models) ? (data as AiModelsResponse).models : [];
      setAvailableModels(models);
      setAiKeyValid(models.length > 0);
      setModelsMessage((data as AiModelsResponse).message ?? (models.length ? "Models loaded" : ""));
      setSettings((prev) => {
        if (!prev || prev.aiProvider !== providerId || !models.length) return prev;
        const aiModel = pickDefaultModel(providerId, models, prev.aiModel);
        if (aiModel === prev.aiModel) return prev;
        return { ...prev, aiModel };
      });
    } catch {
      setAvailableModels([]);
      setAiKeyValid(false);
      setModelsMessage("Unable to load models");
    } finally {
      setLoadingModels(false);
    }
  };

  const loadMarketDataStatus = async () => {
    setCheckingMarketData(true);
    try {
      const res = await fetch("/api/market-data/status");
      const data = await res.json();
      if (!res.ok) {
        setMarketDataStatus(null);
        return;
      }
      setMarketDataStatus(data);
    } catch {
      setMarketDataStatus(null);
    } finally {
      setCheckingMarketData(false);
    }
  };

  const savePartialSettings = async (partial: Partial<Settings>) => {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    const updated = await res.json();
    if (!res.ok) throw new Error(updated.error ?? "Failed to save settings");
    const normalized = normalizeSettingsFormState(updated);
    setSettings(normalized);
    notifyViewSettingsChanged({
      viewFontScale: normalized.viewFontScale,
      viewUiZoom: normalized.viewUiZoom,
      viewDensity: normalized.viewDensity,
      reduceMotion: normalized.reduceMotion,
      dashboardDefaultView: normalized.dashboardDefaultView,
    });
    return normalized;
  };

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const normalized = normalizeSettingsFormState(data);
        setSettings(normalized);
        void loadProviderModels(getProvider(normalized.aiProvider).id);
      });
    fetch("/api/auth/config")
      .then((r) => r.json())
      .then((data: { hasUser?: boolean }) => setHasUser(Boolean(data.hasUser)))
      .catch(() => setHasUser(false));
    void loadAiStatus();
    void loadMarketDataStatus();
  }, []);

  useEffect(() => {
    if (!settings) return;
    const view = {
      viewFontScale: settings.viewFontScale,
      viewUiZoom: settings.viewUiZoom,
      viewDensity: settings.viewDensity,
      reduceMotion: settings.reduceMotion,
      dashboardDefaultView: settings.dashboardDefaultView,
    };
    applyViewSettingsToDocument(view);
    notifyViewSettingsChanged(view);
  }, [
    settings?.viewFontScale,
    settings?.viewUiZoom,
    settings?.viewDensity,
    settings?.reduceMotion,
    settings?.dashboardDefaultView,
  ]);

  useEffect(() => {
    return () => {
      notifyViewSettingsChanged();
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      // AI + market keys are saved via their own blur handlers — don't re-send here.
      const payload = {
        timezone: settings.timezone,
        accountBalance: settings.accountBalance,
        defaultRiskPercent: settings.defaultRiskPercent,
        defaultPositionSize: settings.defaultPositionSize,
        preferredBroker: settings.preferredBroker,
        preferredStrategy: settings.preferredStrategy,
        preferredTimeframe: settings.preferredTimeframe,
        preferredAccount: settings.preferredAccount,
        viewFontScale: settings.viewFontScale,
        viewUiZoom: settings.viewUiZoom,
        viewDensity: settings.viewDensity,
        reduceMotion: settings.reduceMotion,
        dashboardDefaultView: settings.dashboardDefaultView,
        requireLogin: settings.requireLogin,
      };
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      if (!res.ok) {
        setSaveError(updated.error ?? "Failed to save settings");
        return;
      }
      const normalized = normalizeSettingsFormState(updated);
      setSettings(normalized);
      await loadAiStatus();
      notifyViewSettingsChanged({
        viewFontScale: normalized.viewFontScale,
        viewUiZoom: normalized.viewUiZoom,
        viewDensity: normalized.viewDensity,
        reduceMotion: normalized.reduceMotion,
        dashboardDefaultView: normalized.dashboardDefaultView,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50";

  const previewDensity = useMemo(
    () => DENSITY_OPTIONS.find((d) => d.value === settings?.viewDensity) ?? DENSITY_OPTIONS[1],
    [settings?.viewDensity],
  );

  if (!settings) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const update = (field: keyof Settings, value: string | number | boolean) => {
    setSettings({ ...settings, [field]: value });
  };

  const changeProvider = (providerId: string) => {
    const provider = getProvider(providerId);
    setAiKeyValid(false);
    setAvailableModels([]);
    setModelsMessage("");
    setSettings({
      ...settings,
      aiProvider: provider.id,
      aiModel: provider.defaultModel,
    });
    void loadProviderModels(provider.id);
  };

  const activeProvider = getProvider(settings.aiProvider);
  const providerKeyValue = ((settings[activeProvider.keyField] as string) ?? "").trim();
  const keyConfiguredForActiveProvider =
    aiKeyValid || (aiStatus?.provider === activeProvider.id && aiStatus.configured);
  const canShowKeyInput = Boolean(activeProvider.id);
  const canShowModelInput = aiKeyValid && availableModels.length > 0;
  const modelOptions = availableModels.length
    ? (availableModels.includes(settings.aiModel) ? availableModels : [settings.aiModel, ...availableModels])
    : [];

  const resetViewSettings = () => {
    setSettings({
      ...settings,
      viewFontScale: VIEW_SETTINGS_DEFAULTS.viewFontScale,
      viewUiZoom: VIEW_SETTINGS_DEFAULTS.viewUiZoom,
      viewDensity: VIEW_SETTINGS_DEFAULTS.viewDensity,
      reduceMotion: VIEW_SETTINGS_DEFAULTS.reduceMotion,
      dashboardDefaultView: VIEW_SETTINGS_DEFAULTS.dashboardDefaultView,
    });
  };

  const handleAiKeyBlur = async () => {
    const key = (settings[activeProvider.keyField] as string)?.trim();
    if (!key || key === "••••••••") return;

    setCheckingAiKey(true);
    setSaveError("");
    try {
      const res = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: activeProvider.id, apiKey: key }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAvailableModels([]);
        setAiKeyValid(false);
        setModelsMessage(data.error ?? "API key invalid");
        return;
      }

      const models = Array.isArray(data.models) ? data.models : [];
      setAvailableModels(models);
      setAiKeyValid(models.length > 0);
      setModelsMessage(data.message ?? "API key valid. Models loaded.");
      const selectedModel = pickDefaultModel(activeProvider.id, models, settings.aiModel);
      await savePartialSettings({
        aiProvider: activeProvider.id,
        [activeProvider.keyField]: key,
        aiModel: selectedModel,
      } as Partial<Settings>);
      setSettings((prev) => (prev ? { ...prev, aiModel: selectedModel } : prev));
      await loadAiStatus();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to verify API key");
    } finally {
      setCheckingAiKey(false);
    }
  };

  const handleModelChange = async (model: string) => {
    update("aiModel", model);
    setSaveError("");
    try {
      await savePartialSettings({ aiModel: model });
      await loadAiStatus();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save model");
    }
  };

  const handleTwelveDataBlur = async () => {
    const key = settings.twelveDataApiKey?.trim();
    if (!key || key === "••••••••") return;

    setCheckingMarketData(true);
    setSaveError("");
    try {
      const res = await fetch("/api/market-data/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMarketDataStatus({ configured: true, working: false, message: data.error ?? "Invalid API key" });
        return;
      }
      await savePartialSettings({ twelveDataApiKey: key });
      setMarketDataStatus(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to verify Twelve Data key");
    } finally {
      setCheckingMarketData(false);
    }
  };

  const finishEnableLogin = async () => {
    if (!settings) return;
    setSaveError("");
    setSettings({ ...settings, requireLogin: true });
    try {
      await savePartialSettings({ requireLogin: true });
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to enable login");
      setSettings({ ...settings, requireLogin: false });
    }
  };

  const handleRequireLoginChange = async (enabled: boolean) => {
    if (!settings) return;
    setSaveError("");

    if (!enabled) {
      setPendingLoginEnable(false);
      setSettings({ ...settings, requireLogin: false });
      try {
        await savePartialSettings({ requireLogin: false });
        router.refresh();
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Failed to update login setting");
        setSettings({ ...settings, requireLogin: true });
      }
      return;
    }

    if (!hasUser) {
      setPendingLoginEnable(true);
      return;
    }

    await finishEnableLogin();
  };

  const handleAccountSetupComplete = async () => {
    setHasUser(true);
    setPendingLoginEnable(false);
    if (settings) {
      setSettings({ ...settings, requireLogin: true });
    }
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <PageTransition className="space-y-8">
      <FadeIn>
      <div>
        <h1 className="bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-2xl font-bold text-transparent">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">Configure defaults, display, timezone, and AI providers</p>
      </div>
      </FadeIn>

      <form onSubmit={handleSave} className="space-y-8">
        <FadeIn delay={0.03}>
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
            <Lock className="h-5 w-5 text-emerald-500" />
            Access & Login
          </h2>
          <p className="text-sm text-slate-400">
            Use the journal without signing in, or require a login page before anyone can open the app.
          </p>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <input
              type="checkbox"
              checked={settings.requireLogin}
              onChange={(e) => void handleRequireLoginChange(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500/50"
            />
            <span>
              <span className="block text-sm font-medium text-slate-200">Require login</span>
              <span className="mt-1 block text-xs text-slate-500">
                When enabled, visitors must sign in at <span className="font-mono text-slate-400">/login</span> before
                using the journal. When disabled, the app opens directly with no password.
              </span>
            </span>
          </label>
          {pendingLoginEnable && (
            <LoginAccountSetup
              compact
              enableLogin
              onCancel={() => setPendingLoginEnable(false)}
              onSuccess={handleAccountSetupComplete}
            />
          )}
          {settings.requireLogin && hasUser && !pendingLoginEnable && (
            <p className="text-xs text-emerald-400/90">
              Login is enabled. Sign in at <span className="font-mono text-emerald-300/90">/login</span> with your
              account.
            </p>
          )}
          {!settings.requireLogin && hasUser && !pendingLoginEnable && (
            <p className="text-xs text-slate-500">
              An account exists. Enabling login will require sign-in before using the journal.
            </p>
          )}
        </section>
        </FadeIn>

        <FadeIn delay={0.05}>
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
            <Globe className="h-5 w-5 text-emerald-500" />
            Trading Defaults
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Timezone</label>
              <select value={settings.timezone} onChange={(e) => update("timezone", e.target.value)} className={inputClass}>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Account Balance</label>
              <input type="number" value={settings.accountBalance} onChange={(e) => update("accountBalance", Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Default Risk %</label>
              <input type="number" step="0.1" value={settings.defaultRiskPercent} onChange={(e) => update("defaultRiskPercent", Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Default Position Size (lots)</label>
              <input type="number" step="0.01" value={settings.defaultPositionSize} onChange={(e) => update("defaultPositionSize", Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Preferred Broker</label>
              <input value={settings.preferredBroker ?? ""} onChange={(e) => update("preferredBroker", e.target.value)} className={inputClass} placeholder="IC Markets, OANDA..." />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Preferred Strategy</label>
              <input value={settings.preferredStrategy ?? ""} onChange={(e) => update("preferredStrategy", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Preferred Timeframe</label>
              <input value={settings.preferredTimeframe ?? ""} onChange={(e) => update("preferredTimeframe", e.target.value)} className={inputClass} placeholder="H1, M15..." />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Trading Account</label>
              <input value={settings.preferredAccount ?? ""} onChange={(e) => update("preferredAccount", e.target.value)} className={inputClass} />
            </div>
          </div>
        </section>
        </FadeIn>

        <FadeIn delay={0.08}>
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
              <Monitor className="h-5 w-5 text-emerald-500" />
              View Settings
            </h2>
            <button
              type="button"
              onClick={resetViewSettings}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset view defaults
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-5">
              <SliderField
                label="Font size"
                value={settings.viewFontScale}
                min={VIEW_FONT_SCALE_MIN}
                max={VIEW_FONT_SCALE_MAX}
                unit="%"
                onChange={(v) => update("viewFontScale", v)}
              />
              <SliderField
                label="UI zoom"
                value={settings.viewUiZoom}
                min={VIEW_UI_ZOOM_MIN}
                max={VIEW_UI_ZOOM_MAX}
                unit="%"
                hint="Scales the main content area"
                onChange={(v) => update("viewUiZoom", v)}
              />

              <div>
                <label className="mb-2 block text-sm text-slate-400">Content density</label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {DENSITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => update("viewDensity", option.value)}
                      className={`cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        settings.viewDensity === option.value
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : "border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                      }`}
                    >
                      <span className="block text-sm font-medium">{option.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug opacity-80">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm text-slate-400">Default dashboard view</label>
                  <select
                    value={settings.dashboardDefaultView}
                    onChange={(e) => update("dashboardDefaultView", e.target.value)}
                    className={inputClass}
                  >
                    <option value="calendar">Calendar</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 w-full">
                    <input
                      type="checkbox"
                      checked={settings.reduceMotion}
                      onChange={(e) => update("reduceMotion", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500/50"
                    />
                    <span className="text-sm text-slate-300">Reduce animations</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/80 bg-slate-950/60 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Live preview</p>
              <div
                className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/80"
                style={{
                  fontSize: `calc(0.875rem * ${settings.viewFontScale / 100})`,
                  zoom: settings.viewUiZoom / 100,
                }}
              >
                <div
                  className="border-b border-slate-800 px-3 py-2"
                  style={{ padding: `calc(0.5rem * ${previewDensity.spacing}) calc(0.75rem * ${previewDensity.spacing})` }}
                >
                  <p className="font-semibold text-slate-200">Dashboard</p>
                  <p className="text-slate-500">Sample preview</p>
                </div>
                <div
                  className="grid grid-cols-3 gap-2 p-3"
                  style={{ padding: `calc(0.75rem * ${previewDensity.spacing})` }}
                >
                  {["Mon", "Tue", "Wed"].map((day, i) => (
                    <div
                      key={day}
                      className={`rounded-md border border-slate-800 p-2 ${i === 1 ? "bg-emerald-500/10" : ""}`}
                      style={{ minHeight: previewDensity.calendarCell }}
                    >
                      <span className="text-slate-500">{day}</span>
                      {i === 1 && (
                        <p className="mt-auto font-mono font-semibold text-emerald-400">+$240</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-800 px-3 py-2 text-slate-400">
                  Stat card · Equity curve · Table text
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">Changes preview live. Save to keep them across sessions.</p>
            </div>
          </div>
        </section>
        </FadeIn>

        <FadeIn delay={0.1}>
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
            <Brain className="h-5 w-5 text-emerald-500" />
            AI Configuration
          </h2>
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Step 1: AI Provider</label>
            <select value={settings.aiProvider} onChange={(e) => changeProvider(e.target.value)} className={inputClass}>
              {AI_PROVIDER_LIST.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {canShowKeyInput && (
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm text-slate-400">
                <Key className="h-3.5 w-3.5" />
                Step 2: {activeProvider.label} API Key
              </label>
              <input
                type="password"
                value={(settings[activeProvider.keyField] as string) ?? ""}
                onChange={(e) => update(activeProvider.keyField, e.target.value)}
                onBlur={handleAiKeyBlur}
                className={inputClass}
                placeholder={activeProvider.keyPlaceholder}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                On blur, we validate this key, load provider models, and auto-save if valid.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${
                    keyConfiguredForActiveProvider
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-slate-700 bg-slate-900/60 text-slate-400"
                  }`}
                >
                  {keyConfiguredForActiveProvider ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5" />
                  )}
                  {keyConfiguredForActiveProvider ? "Configured" : "Not configured"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${
                    aiStatus?.working && aiStatus.provider === activeProvider.id
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  }`}
                >
                  {aiStatus?.working && aiStatus.provider === activeProvider.id ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5" />
                  )}
                  {checkingAi || checkingAiKey ? "Checking..." : aiStatus?.working && aiStatus.provider === activeProvider.id ? "API working" : "API not verified"}
                </span>
              </div>
              {providerKeyValue && aiStatus?.provider === activeProvider.id && aiStatus.message && (
                <p className="mt-1 text-xs text-slate-500">{aiStatus.message}</p>
              )}
            </div>
          )}

          {canShowModelInput ? (
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Step 3: Model</label>
              <select
                value={settings.aiModel}
                onChange={(e) => void handleModelChange(e.target.value)}
                className={inputClass}
                disabled={loadingModels}
              >
                {modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">{loadingModels ? "Loading models..." : modelsMessage || "Select a model from your validated API account."}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Step 3 will appear after a valid API key is entered and verified.
            </p>
          )}
        </section>
        </FadeIn>

        <FadeIn delay={0.12}>
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
            <Globe className="h-5 w-5 text-emerald-500" />
            Market Data API
          </h2>
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm text-slate-400">
              <Key className="h-3.5 w-3.5" />
              Twelve Data API Key
            </label>
            <input
              type="password"
              value={settings.twelveDataApiKey ?? ""}
              onChange={(e) => update("twelveDataApiKey", e.target.value)}
              onBlur={handleTwelveDataBlur}
              className={inputClass}
              placeholder="Enter Twelve Data key"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Separate from AI models. On blur, this key is validated and auto-saved when working.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${
                  marketDataStatus?.configured
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-700 bg-slate-900/60 text-slate-400"
                }`}
              >
                {marketDataStatus?.configured ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {marketDataStatus?.configured ? "Configured" : "Not configured"}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${
                  marketDataStatus?.working
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                }`}
              >
                {marketDataStatus?.working ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {checkingMarketData ? "Checking..." : marketDataStatus?.working ? "API working" : "API not verified"}
              </span>
            </div>
            {marketDataStatus?.message && <p className="mt-1 text-xs text-slate-500">{marketDataStatus.message}</p>}
          </div>
        </section>
        </FadeIn>

        <FadeIn delay={0.15}>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </button>
          {saved && <span className="text-sm text-emerald-400">Settings saved</span>}
          {saveError && <span className="text-sm text-red-400">{saveError}</span>}
        </div>
        </FadeIn>
      </form>
    </PageTransition>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  unit,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  hint?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm text-slate-400">{label}</label>
        <span className="font-mono text-sm font-medium text-emerald-400">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-emerald-500"
      />
      <div className="mt-1 flex justify-between text-[10px] text-slate-600">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
