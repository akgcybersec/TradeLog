import { NextResponse } from "next/server";
import { getOrCreateSettings } from "@/lib/prisma";
import { setAuthRequireLoginCookie } from "@/lib/auth-config";

export async function GET() {
  const settings = await getOrCreateSettings();
  const response = NextResponse.json({ requireLogin: settings.requireLogin });
  setAuthRequireLoginCookie(response, settings.requireLogin);
  return response;
}
