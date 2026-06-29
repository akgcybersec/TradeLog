/** Secure cookies only when COOKIE_SECURE=true (default off for self-hosted HTTP/LAN). */
export function isCookieSecure(): boolean {
  return process.env.COOKIE_SECURE === "true";
}
