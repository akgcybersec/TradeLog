import { NextResponse } from "next/server";
import { createInitialUser } from "@/lib/auth";
import { setAuthRequireLoginCookie } from "@/lib/auth-config";
import { getOrCreateSettings, prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email, password, name, enableLogin } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const result = await createInitialUser({ email, password, name });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    let requireLogin = false;
    if (enableLogin === true) {
      await prisma.settings.update({
        where: { id: "default" },
        data: { requireLogin: true },
      });
      requireLogin = true;
    } else {
      const settings = await getOrCreateSettings();
      requireLogin = settings.requireLogin;
    }

    const response = NextResponse.json({ ok: true, user: result.user, requireLogin });
    setAuthRequireLoginCookie(response, requireLogin);
    return response;
  } catch (error) {
    console.error("Account setup error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
