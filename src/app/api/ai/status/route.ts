import { NextResponse } from "next/server";
import { toUserSettings } from "@/lib/ai/config";
import { checkAiProviderHealth } from "@/lib/ai/health";
import { getOrCreateSettings } from "@/lib/prisma";

export async function GET() {
  const settings = await getOrCreateSettings();
  const health = await checkAiProviderHealth(toUserSettings(settings));
  return NextResponse.json(health);
}
