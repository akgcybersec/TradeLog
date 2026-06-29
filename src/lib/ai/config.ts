import type { UserSettings } from "@/types/trade";

type AiSettings = {
  timezone: string;
  accountBalance: number;
  defaultRiskPercent: number;
  defaultPositionSize: number;
  preferredBroker: string | null;
  preferredStrategy: string | null;
  preferredTimeframe: string | null;
  preferredAccount: string | null;
  aiProvider: string;
  anthropicApiKey: string | null;
  openaiApiKey: string | null;
  geminiApiKey: string | null;
  aiModel: string;
};

export function isAiConfigured(settings: Pick<AiSettings, "aiProvider" | "anthropicApiKey" | "openaiApiKey" | "geminiApiKey">): boolean {
  switch (settings.aiProvider) {
    case "openai":
      return Boolean(settings.openaiApiKey);
    case "gemini":
      return Boolean(settings.geminiApiKey);
    case "anthropic":
    default:
      return Boolean(settings.anthropicApiKey);
  }
}

export function toUserSettings(settings: AiSettings): UserSettings {
  return {
    timezone: settings.timezone,
    accountBalance: settings.accountBalance,
    defaultRiskPercent: settings.defaultRiskPercent,
    defaultPositionSize: settings.defaultPositionSize,
    preferredBroker: settings.preferredBroker,
    preferredStrategy: settings.preferredStrategy,
    preferredTimeframe: settings.preferredTimeframe,
    preferredAccount: settings.preferredAccount,
    aiProvider: settings.aiProvider as UserSettings["aiProvider"],
    anthropicApiKey: settings.anthropicApiKey,
    openaiApiKey: settings.openaiApiKey,
    geminiApiKey: settings.geminiApiKey,
    aiModel: settings.aiModel,
  };
}
