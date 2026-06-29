import { NextResponse } from "next/server";
import { getOrCreateSettings } from "@/lib/prisma";
import { getProvider, type AiProviderId } from "@/lib/ai/providers";
import { fetchProviderModels } from "@/lib/ai/models";

function providerFrom(input: unknown): AiProviderId {
  const raw = typeof input === "string" ? input : "";
  return getProvider(raw).id;
}

function keyForProvider(
  settings: Awaited<ReturnType<typeof getOrCreateSettings>>,
  provider: AiProviderId,
): string | null {
  if (provider === "openai") return settings.openaiApiKey;
  if (provider === "gemini") return settings.geminiApiKey;
  return settings.anthropicApiKey;
}

export async function GET(request: Request) {
  const settings = await getOrCreateSettings();
  const provider = providerFrom(new URL(request.url).searchParams.get("provider"));
  const key = keyForProvider(settings, provider);
  if (!key) {
    return NextResponse.json({ provider, configured: false, models: [], message: "API key not configured" });
  }

  const result = await fetchProviderModels(provider, key);
  if (!result.ok) {
    return NextResponse.json(
      { provider, configured: true, models: [], message: result.error },
      { status: 400 },
    );
  }

  return NextResponse.json({
    provider,
    configured: true,
    models: result.models,
    message: result.models.length ? "Models loaded" : "No compatible models found",
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { provider?: string; apiKey?: string };
  const provider = providerFrom(body.provider);
  const apiKey = body.apiKey?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }

  const result = await fetchProviderModels(provider, apiKey);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, models: [] }, { status: 400 });
  }

  return NextResponse.json({
    provider,
    configured: true,
    models: result.models,
    message: result.models.length ? "API key is valid. Models loaded." : "API key valid, but no models found",
  });
}
