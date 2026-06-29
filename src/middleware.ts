import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import {
  AUTH_REQUIRE_LOGIN_COOKIE,
  parseAuthCookie,
  setAuthRequireLoginCookie,
} from "@/lib/auth-config";
import { getSessionOptions, type SessionData } from "@/lib/session";

async function isLoginRequired(request: NextRequest): Promise<boolean> {
  try {
    const res = await fetch(new URL("/api/auth/config", request.nextUrl.origin));
    if (res.ok) {
      const data = (await res.json()) as { requireLogin?: boolean };
      return Boolean(data.requireLogin);
    }
  } catch {
    // API unreachable — fall back to cookie, then default open (no lockout after db reset)
    const fromCookie = parseAuthCookie(request.cookies.get(AUTH_REQUIRE_LOGIN_COOKIE)?.value);
    return fromCookie ?? false;
  }

  const fromCookie = parseAuthCookie(request.cookies.get(AUTH_REQUIRE_LOGIN_COOKIE)?.value);
  return fromCookie ?? false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/uploads") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const loginRequired = await isLoginRequired(request);
  const response = NextResponse.next();
  setAuthRequireLoginCookie(response, loginRequired);

  if (!loginRequired) {
    return response;
  }

  const session = await getIronSession<SessionData>(request, response, getSessionOptions());

  const isLoginPage = pathname === "/login";
  const isApi = pathname.startsWith("/api");

  if (!session.isLoggedIn) {
    if (isLoginPage) return response;
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
