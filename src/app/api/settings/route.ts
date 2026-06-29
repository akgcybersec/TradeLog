import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { setAuthRequireLoginCookie } from "@/lib/auth-config";
import { getOrCreateSettings, prisma } from "@/lib/prisma";

function maskSecrets(settings: Awaited<ReturnType<typeof getOrCreateSettings>>) {
  return {
    ...settings,
    anthropicApiKey: settings.anthropicApiKey ? "••••••••" : null,
    openaiApiKey: settings.openaiApiKey ? "••••••••" : null,
    geminiApiKey: settings.geminiApiKey ? "••••••••" : null,
    twelveDataApiKey: settings.twelveDataApiKey ? "••••••••" : null,
  };
}

export async function GET() {
  const settings = await getOrCreateSettings();
  const response = NextResponse.json(maskSecrets(settings));
  setAuthRequireLoginCookie(response, settings.requireLogin);
  return response;
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const existing = await getOrCreateSettings();

    const data: Record<string, unknown> = {};

    const fields = [
      "timezone",
      "accountBalance",
      "defaultRiskPercent",
      "defaultPositionSize",
      "preferredBroker",
      "preferredStrategy",
      "preferredTimeframe",
      "preferredAccount",
      "aiProvider",
      "aiModel",
      "viewFontScale",
      "viewUiZoom",
      "viewDensity",
      "reduceMotion",
      "dashboardDefaultView",
      "requireLogin",
    ] as const;

    if (body.requireLogin === false && existing.requireLogin === true) {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json(
          { error: "Sign in before you can disable login." },
          { status: 401 },
        );
      }
    }

    for (const field of fields) {
      if (body[field] !== undefined && body[field] !== existing[field]) {
        data[field] = body[field];
      }
    }

    if (body.anthropicApiKey && body.anthropicApiKey !== "••••••••") {
      data.anthropicApiKey = body.anthropicApiKey;
    }
    if (body.openaiApiKey && body.openaiApiKey !== "••••••••") {
      data.openaiApiKey = body.openaiApiKey;
    }
    if (body.geminiApiKey && body.geminiApiKey !== "••••••••") {
      data.geminiApiKey = body.geminiApiKey;
    }
    if (body.twelveDataApiKey && body.twelveDataApiKey !== "••••••••") {
      data.twelveDataApiKey = body.twelveDataApiKey;
    }

    if (Object.keys(data).length === 0) {
      const response = NextResponse.json(maskSecrets(existing));
      setAuthRequireLoginCookie(response, existing.requireLogin);
      return response;
    }

    const settings = await prisma.settings.update({
      where: { id: existing.id },
      data,
    });

    const response = NextResponse.json(maskSecrets(settings));
    setAuthRequireLoginCookie(response, settings.requireLogin);
    return response;
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
