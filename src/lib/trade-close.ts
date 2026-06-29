export const CLOSE_EDIT_WINDOW_MS = 10 * 60 * 1000;

/** Prefer closedAt; fall back to updatedAt for trades closed before closedAt was tracked. */
export function resolveCloseTimestamp(
  closedAt: Date | string | null | undefined,
  fallbackAt?: Date | string | null | undefined,
): Date | null {
  for (const value of [closedAt, fallbackAt]) {
    if (!value) continue;
    const d = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export function canEditClosedTrade(
  closedAt: Date | string | null | undefined,
  fallbackAt?: Date | string | null | undefined,
): boolean {
  const anchor = resolveCloseTimestamp(closedAt, fallbackAt);
  if (!anchor) return false;
  return Date.now() - anchor.getTime() < CLOSE_EDIT_WINDOW_MS;
}

export function msUntilCloseEditExpires(
  closedAt: Date | string | null | undefined,
  fallbackAt?: Date | string | null | undefined,
): number {
  const anchor = resolveCloseTimestamp(closedAt, fallbackAt);
  if (!anchor) return 0;
  return Math.max(0, CLOSE_EDIT_WINDOW_MS - (Date.now() - anchor.getTime()));
}

export function formatEditTimeRemaining(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min <= 0) return `${sec}s`;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}
