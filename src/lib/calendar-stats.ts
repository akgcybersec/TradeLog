import type { DashboardTrade } from "@/components/dashboard/DashboardClient";

export interface DayStats {
  key: string;
  date: Date;
  trades: DashboardTrade[];
  totalTrades: number;
  closedCount: number;
  openCount: number;
  wins: number;
  losses: number;
  totalPnL: number;
}

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getTradeDayKey(trade: DashboardTrade): string | null {
  const raw = trade.closedAt ?? trade.openedAt;
  if (!raw) return null;
  return toDayKey(new Date(raw));
}

export function groupTradesByDay(trades: DashboardTrade[]): Map<string, DayStats> {
  const map = new Map<string, DayStats>();

  for (const trade of trades) {
    const key = getTradeDayKey(trade);
    if (!key) continue;

    const date = new Date(trade.closedAt ?? trade.openedAt!);
    const existing = map.get(key) ?? {
      key,
      date,
      trades: [],
      totalTrades: 0,
      closedCount: 0,
      openCount: 0,
      wins: 0,
      losses: 0,
      totalPnL: 0,
    };

    existing.trades.push(trade);
    existing.totalTrades += 1;

    if (trade.exitPrice != null) {
      existing.closedCount += 1;
      existing.totalPnL += trade.profitLoss ?? 0;
      if (trade.isWinner) existing.wins += 1;
      else existing.losses += 1;
    } else {
      existing.openCount += 1;
    }

    map.set(key, existing);
  }

  return map;
}

export function formatPnLCompact(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}
