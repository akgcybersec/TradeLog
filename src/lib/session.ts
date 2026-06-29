import type { SessionOptions } from "iron-session";
import { isCookieSecure } from "@/lib/cookie-secure";

export interface SessionData {
  userId: string;
  email: string;
  name?: string;
  isLoggedIn: boolean;
}

export const defaultSession: SessionData = {
  userId: "",
  email: "",
  isLoggedIn: false,
};

function getSessionPassword(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "development") {
    return "dev-session-secret-min-32-characters-long!!";
  }
  throw new Error("SESSION_SECRET must be set and at least 32 characters");
}

export const sessionOptions: SessionOptions = {
  password: getSessionPassword(),
  cookieName: "tradelog_session",
  cookieOptions: {
    secure: isCookieSecure(),
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  },
};
