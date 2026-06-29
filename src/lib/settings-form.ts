import { parseViewSettings, type ViewSettings } from "@/lib/view-settings";

export interface SettingsFormState extends ViewSettings {
  timezone: string;
  accountBalance: number;
  defaultRiskPercent: number;
  defaultPositionSize: number;
  preferredBroker: string;
  preferredStrategy: string;
  preferredTimeframe: string;
  preferredAccount: string;
  aiProvider: string;
  aiModel: string;
  anthropicApiKey: string;
  openaiApiKey: string;
  geminiApiKey: string;
  twelveDataApiKey: string;
  requireLogin: boolean;
}

export function normalizeSettingsFormState(data: unknown): SettingsFormState {
  const raw = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const view = parseViewSettings(raw);

  return {
    timezone: typeof raw.timezone === "string" ? raw.timezone : "UTC",
    accountBalance: toNumber(raw.accountBalance, 10000),
    defaultRiskPercent: toNumber(raw.defaultRiskPercent, 1),
    defaultPositionSize: toNumber(raw.defaultPositionSize, 0.1),
    preferredBroker: toString(raw.preferredBroker),
    preferredStrategy: toString(raw.preferredStrategy),
    preferredTimeframe: toString(raw.preferredTimeframe),
    preferredAccount: toString(raw.preferredAccount),
    aiProvider: typeof raw.aiProvider === "string" ? raw.aiProvider : "anthropic",
    aiModel: typeof raw.aiModel === "string" ? raw.aiModel : "claude-sonnet-4-20250514",
    anthropicApiKey: toString(raw.anthropicApiKey),
    openaiApiKey: toString(raw.openaiApiKey),
    geminiApiKey: toString(raw.geminiApiKey),
    twelveDataApiKey: toString(raw.twelveDataApiKey),
    requireLogin: raw.requireLogin === true || raw.requireLogin === "true",
    ...view,
  };
}

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toString(value: unknown): string {
  return value == null ? "" : String(value);
}
