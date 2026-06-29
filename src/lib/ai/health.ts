import type { UserSettings } from "@/types/trade";
import { fetchProviderModels } from "@/lib/ai/models";
import { getProvider } from "@/lib/ai/providers";

export interface AiHealthStatus {
  provider: UserSettings["aiProvider"];
  configured: boolean;
  working: boolean;
  message: string;
}

function getProviderApiKey(settings: UserSettings): string | null {
  switch (settings.aiProvider) {
    case "openai":
      return settings.openaiApiKey ?? null;
    case "gemini":
      return settings.geminiApiKey ?? null;
    case "anthropic":
    default:
      return settings.anthropicApiKey ?? null;
  }
}

// Validates by listing models — if the key can fetch models, it's working.
// Avoids false failures from unavailable model IDs (e.g. Fable/Mythos).
export async function checkAiProviderHealth(settings: UserSettings): Promise<AiHealthStatus> {
  const provider = settings.aiProvider;
  const key = getProviderApiKey(settings);
  const providerInfo = getProvider(provider);

  if (!key) {
    return {
      provider,
      configured: false,
      working: false,
      message: `${providerInfo.label} API key is not set`,
    };
  }

  const result = await fetchProviderModels(provider, key);
  if (!result.ok) {
    return {
      provider,
      configured: true,
      working: false,
      message: result.error,
    };
  }

  if (!result.models.length) {
    return {
      provider,
      configured: true,
      working: false,
      message: "API key accepted but no usable models were returned",
    };
  }

  const modelNote =
    settings.aiModel && !result.models.includes(settings.aiModel)
      ? ` Selected model "${settings.aiModel}" is unavailable — pick one from the list.`
      : "";

  return {
    provider,
    configured: true,
    working: true,
    message: `${providerInfo.label} API key is valid (${result.models.length} models).${modelNote}`,
  };
}
