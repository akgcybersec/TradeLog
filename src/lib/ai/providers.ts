export type AiProviderId = "anthropic" | "openai" | "gemini";

export type AiKeyField = "anthropicApiKey" | "openaiApiKey" | "geminiApiKey";

export interface AiProviderInfo {
  id: AiProviderId;
  label: string;
  keyField: AiKeyField;
  keyPlaceholder: string;
  models: string[];
  defaultModel: string;
}

export const AI_PROVIDERS: Record<AiProviderId, AiProviderInfo> = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic Claude",
    keyField: "anthropicApiKey",
    keyPlaceholder: "sk-ant-...",
    models: [
      "claude-sonnet-4-20250514",
      "claude-opus-4-20250514",
      "claude-3-7-sonnet-20250219",
      "claude-3-5-haiku-20241022",
    ],
    defaultModel: "claude-sonnet-4-20250514",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    keyField: "openaiApiKey",
    keyPlaceholder: "sk-...",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "o3", "o4-mini"],
    defaultModel: "gpt-4o",
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    keyField: "geminiApiKey",
    keyPlaceholder: "AI...",
    models: ["gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-1.5-pro"],
    defaultModel: "gemini-2.0-flash",
  },
};

export const AI_PROVIDER_LIST = Object.values(AI_PROVIDERS);

export function getProvider(id: string): AiProviderInfo {
  return AI_PROVIDERS[id as AiProviderId] ?? AI_PROVIDERS.anthropic;
}
