import { NextResponse } from "next/server";
import { hasAnyUser } from "@/lib/auth";
import { resolveDatabaseUrl } from "@/lib/database-url";
import { isCookieSecure } from "@/lib/cookie-secure";
import { getOrCreateSettings, prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await getOrCreateSettings();
  const user = await prisma.user.findFirst({
    select: { email: true, createdAt: true },
  });

  return NextResponse.json({
    databasePath: resolveDatabaseUrl().replace(/^file:/, ""),
    hasUser: await hasAnyUser(),
    requireLogin: settings.requireLogin,
    userEmail: user?.email ?? null,
    sessionSecretConfigured: Boolean(process.env.SESSION_SECRET?.trim() && process.env.SESSION_SECRET.trim().length >= 32),
    cookieSecure: isCookieSecure(),
  });
}
