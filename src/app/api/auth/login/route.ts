import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { verifyUserCredentials } from "@/lib/auth";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const result = await verifyUserCredentials(email, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const response = NextResponse.json({
      user: result.user,
      mustChangeCredentials: result.user.mustChangeCredentials,
    });

    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    session.userId = result.user.id;
    session.email = result.user.email;
    session.name = result.user.name ?? undefined;
    session.isLoggedIn = true;
    await session.save();

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
