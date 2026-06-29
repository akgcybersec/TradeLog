import { NextResponse } from "next/server";
import { getOrCreateSettings } from "@/lib/prisma";

async function checkTwelveData(apiKey: string): Promise<{ working: boolean; message: string }> {
  try {
    const url = `https://api.twelvedata.com/time_series?symbol=EUR/USD&interval=15min&outputsize=1&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) return { working: false, message: `Twelve Data request failed (${res.status})` };
    const data = await res.json();
    if (data?.status === "ok" && Array.isArray(data?.values) && data.values.length) {
      return { working: true, message: "Twelve Data API key is valid and working" };
    }
    return { working: false, message: data?.message ?? "Invalid Twelve Data API response" };
  } catch (error) {
    return { working: false, message: error instanceof Error ? error.message : "Market data check failed" };
  }
}

export async function GET() {
  const settings = await getOrCreateSettings();
  const key = settings.twelveDataApiKey;
  if (!key) {
    return NextResponse.json({
      configured: false,
      working: false,
      message: "Twelve Data API key is not set",
    });
  }
  const status = await checkTwelveData(key);
  return NextResponse.json({ configured: true, ...status });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { apiKey?: string };
  const apiKey = body.apiKey?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }
  const status = await checkTwelveData(apiKey);
  if (!status.working) {
    return NextResponse.json({ error: status.message }, { status: 400 });
  }
  return NextResponse.json({ configured: true, working: true, message: status.message });
}
