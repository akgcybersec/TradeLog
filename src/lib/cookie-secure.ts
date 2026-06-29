/** Production over plain HTTP (e.g. LAN IP) needs COOKIE_SECURE=false in .env */
export function isCookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}
