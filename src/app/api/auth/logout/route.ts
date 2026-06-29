import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions, type SessionData } from "@/lib/session";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  const session = await getIronSession<SessionData>(request, response, getSessionOptions());
  session.userId = "";
  session.email = "";
  session.name = undefined;
  session.isLoggedIn = false;
  await session.save();
  return response;
}
