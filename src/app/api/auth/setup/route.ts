import { NextRequest, NextResponse } from "next/server";
import { createInitialUser, hasAnyUser, verifyUserCredentials } from "@/lib/auth";
import { setAuthRequireLoginCookie } from "@/lib/auth-config";
import { getOrCreateSettings, prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, enableLogin } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const settings = await getOrCreateSettings();

    if (await hasAnyUser()) {
      const verified = await verifyUserCredentials(email, password);
      if (!verified.ok) {
        return NextResponse.json(
          {
            error:
              "An account already exists with a different password. Sign in with the original password, or run npm run db:reset to start over.",
          },
          { status: 409 },
        );
      }
      if (enableLogin === true) {
        await prisma.settings.update({
          where: { id: settings.id },
          data: { requireLogin: true },
        });
      }
      const response = NextResponse.json({ ok: true, requireLogin: enableLogin === true, existingUser: true });
      setAuthRequireLoginCookie(response, enableLogin === true);
      return response;
    }

    const result = await createInitialUser({ email, password, name });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    if (enableLogin === true) {
      await prisma.settings.update({
        where: { id: settings.id },
        data: { requireLogin: true },
      });
    }

    const verified = await verifyUserCredentials(email, password);
    if (!verified.ok) {
      await prisma.user.delete({ where: { id: result.user.id } }).catch(() => undefined);
      return NextResponse.json(
        { error: "Account could not be verified. Check DATABASE_URL points to one SQLite file." },
        { status: 500 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      user: result.user,
      requireLogin: enableLogin === true,
    });
    setAuthRequireLoginCookie(response, enableLogin === true);
    return response;
  } catch (error) {
    console.error("Account setup error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
