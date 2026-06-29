import { NextResponse } from "next/server";
import { hasAnyUser } from "@/lib/auth";
import { setAuthRequireLoginCookie } from "@/lib/auth-config";
import { getOrCreateSettings } from "@/lib/prisma";

export async function GET() {
  const settings = await getOrCreateSettings();
  const response = NextResponse.json({
    requireLogin: settings.requireLogin,
    hasUser: await hasAnyUser(),
  });
  setAuthRequireLoginCookie(response, settings.requireLogin);
  return response;
}
