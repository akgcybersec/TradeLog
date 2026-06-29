import type { AiProviderId } from "@/lib/ai/providers";

function trimError(raw: string): string {
  return raw.length > 220 ? `${raw.slice(0, 220)}...` : raw;
}

function uniqueSorted(models: string[]): string[] {
  return [...new Set(models)].sort((a, b) => a.localeCompare(b));
}

// Fable/Mythos show in the models list but aren't callable on most accounts.
function isUsableAnthropicModel(id: string): boolean {
  return id.startsWith("claude-") && !/fable|mythos/i.test(id);
}

export function pickDefaultModel(
  provider: AiProviderId,
  models: string[],
  current?: string | null,
): string {
  if (current && models.includes(current)) return current;
  if (!models.length) return current ?? "";

  if (provider === "anthropic") {
    const prefer = [
      /claude-opus-4/,
      /claude-sonnet-4/,
      /claude-3-7-sonnet/,
      /claude-3-5-sonnet/,
      /claude-3-5-haiku/,
    ];
    for (const pattern of prefer) {
      const hit = models.find((m) => pattern.test(m));
      if (hit) return hit;
    }
  }

  return models[0];
}

export async function fetchProviderModels(
  provider: AiProviderId,
  apiKey: string,
): Promise<{ ok: true; models: string[] } | { ok: false; error: string }> {
  try {
    switch (provider) {
      case "openai": {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) return { ok: false, error: `OpenAI models request failed: ${trimError(await res.text())}` };
        const data = await res.json();
        const models = (Array.isArray(data?.data) ? data.data : [])
          .map((m: { id?: string }) => m.id ?? "")
          .filter((id: string) => /^(gpt|o[1-9])/.test(id) && !/audio|realtime|transcribe|tts|embedding|moderation/i.test(id));
        return { ok: true, models: uniqueSorted(models) };
      }
      case "gemini": {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!res.ok) return { ok: false, error: `Gemini models request failed: ${trimError(await res.text())}` };
        const data = await res.json();
        const models = (Array.isArray(data?.models) ? data.models : [])
          .map((m: { name?: string }) => (m.name ?? "").replace(/^models\//, ""))
          .filter((name: string) => name.includes("gemini") && !/embedding|aqa/i.test(name));
        return { ok: true, models: uniqueSorted(models) };
      }
      case "anthropic":
      default: {
        const res = await fetch("https://api.anthropic.com/v1/models", {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
        });
        if (!res.ok) return { ok: false, error: `Anthropic models request failed: ${trimError(await res.text())}` };
        const data = await res.json();
        const models = (Array.isArray(data?.data) ? data.data : [])
          .map((m: { id?: string }) => m.id ?? "")
          .filter(isUsableAnthropicModel);
        return { ok: true, models: uniqueSorted(models) };
      }
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to fetch models" };
  }
}
