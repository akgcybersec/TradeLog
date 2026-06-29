import { NextResponse } from "next/server";
import { isCookieSecure } from "@/lib/cookie-secure";

export const AUTH_REQUIRE_LOGIN_COOKIE = "tj_require_login";

export function authCookieValue(requireLogin: boolean): string {
  return requireLogin ? "1" : "0";
}

export function parseAuthCookie(value: string | undefined): boolean | null {
  if (value === "1") return true;
  if (value === "0") return false;
  return null;
}

export function setAuthRequireLoginCookie(response: NextResponse, requireLogin: boolean) {
  response.cookies.set(AUTH_REQUIRE_LOGIN_COOKIE, authCookieValue(requireLogin), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isCookieSecure(),
    maxAge: 60 * 60 * 24 * 365,
  });
}
