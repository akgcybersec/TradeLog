export const CLOSE_EDIT_WINDOW_MS = 10 * 60 * 1000;

const CLIENT_ANCHOR_PREFIX = "trade-close-anchor:";

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Pick the latest plausible close timestamp from available sources. */
export function resolveCloseEditAnchor(
  closedAt?: Date | string | null,
  updatedAt?: Date | string | null,
  clientAnchor?: Date | string | null,
): Date | null {
  const dates = [closedAt, clientAnchor, updatedAt]
    .map(toDate)
    .filter((d): d is Date => d != null);
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

/** @deprecated use resolveCloseEditAnchor */
export function resolveCloseTimestamp(
  closedAt: Date | string | null | undefined,
  fallbackAt?: Date | string | null | undefined,
): Date | null {
  return resolveCloseEditAnchor(closedAt, fallbackAt);
}

export function canEditClosedTrade(anchor: Date | string | null | undefined): boolean {
  const closed = toDate(anchor);
  if (!closed) return false;
  return Date.now() - closed.getTime() < CLOSE_EDIT_WINDOW_MS;
}

export function msUntilCloseEditExpires(anchor: Date | string | null | undefined): number {
  const closed = toDate(anchor);
  if (!closed) return 0;
  return Math.max(0, CLOSE_EDIT_WINDOW_MS - (Date.now() - closed.getTime()));
}

export function formatEditTimeRemaining(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min <= 0) return `${sec}s`;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

export function readClientCloseAnchor(tradeId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(`${CLIENT_ANCHOR_PREFIX}${tradeId}`);
  } catch {
    return null;
  }
}

export function writeClientCloseAnchor(tradeId: string, at: Date = new Date()): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${CLIENT_ANCHOR_PREFIX}${tradeId}`, at.toISOString());
  } catch {
    // ignore quota / private mode
  }
}
