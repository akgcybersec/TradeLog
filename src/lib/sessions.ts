import { formatInTimeZone } from "date-fns-tz";

export type TradingSession = "Sydney" | "Tokyo" | "London" | "New York";

interface SessionWindow {
  name: TradingSession;
  /** Minutes from midnight UTC */
  startUtc: number;
  endUtc: number;
}

const SESSIONS: SessionWindow[] = [
  { name: "Sydney", startUtc: 22 * 60, endUtc: 7 * 60 },
  { name: "Tokyo", startUtc: 0, endUtc: 9 * 60 },
  { name: "London", startUtc: 8 * 60, endUtc: 17 * 60 },
  { name: "New York", startUtc: 13 * 60, endUtc: 22 * 60 },
];

function isInSession(minutesUtc: number, session: SessionWindow): boolean {
  if (session.startUtc > session.endUtc) {
    return minutesUtc >= session.startUtc || minutesUtc < session.endUtc;
  }
  return minutesUtc >= session.startUtc && minutesUtc < session.endUtc;
}

export function getActiveSessions(date: Date): TradingSession[] {
  const minutesUtc = date.getUTCHours() * 60 + date.getUTCMinutes();
  return SESSIONS.filter((s) => isInSession(minutesUtc, s)).map((s) => s.name);
}

export function formatTradingSession(date: Date): string {
  const active = getActiveSessions(date);
  if (active.length === 0) return "Off-hours";
  if (active.length === 1) return active[0];
  return active.join(" + ");
}

export function extractTimeMetadata(date: Date, timezone: string, closedAt?: Date | null) {
  const dayOfWeek = formatInTimeZone(date, timezone, "EEEE");
  const month = formatInTimeZone(date, timezone, "MMMM");
  const year = Number(formatInTimeZone(date, timezone, "yyyy"));
  const timeOfDay = formatInTimeZone(date, timezone, "HH:mm:ss");

  return {
    openedAt: date,
    closedAt: closedAt ?? null,
    dayOfWeek,
    month,
    year,
    timeOfDay,
    tradingSession: formatTradingSession(date),
  };
}

export function formatDuration(ms: number | null): string {
  if (ms === null || ms < 0) return "—";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
