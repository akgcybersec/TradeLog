export interface TraderSnapshot {
  totalTrades: number;
  closedTrades: number;
  winRate: number;
  totalPnL: number;
  avgRMultiple: number | null;
  profitFactor: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  bestStrategy: string | null;
  worstStrategy: string | null;
  bestSession: string | null;
  worstSession: string | null;
  recentResults: string[];
  analysisPeriodEnd: string | null;
}

interface TradeRow {
  strategy: string | null;
  tradingSession: string | null;
  profitLoss: number | null;
  isWinner: boolean | null;
  actualRMultiple: number | null;
  closedAt: Date | null;
}

export function computeTraderSnapshot(trades: TradeRow[]): TraderSnapshot {
  const closed = trades.filter((t) => t.profitLoss != null);
  const winners = closed.filter((t) => t.isWinner);
  const totalPnL = closed.reduce((s, t) => s + (t.profitLoss ?? 0), 0);

  const grossWin = closed.filter((t) => (t.profitLoss ?? 0) > 0).reduce((s, t) => s + (t.profitLoss ?? 0), 0);
  const grossLoss = Math.abs(
    closed.filter((t) => (t.profitLoss ?? 0) < 0).reduce((s, t) => s + (t.profitLoss ?? 0), 0),
  );

  const rMultiples = closed.map((t) => t.actualRMultiple).filter((r): r is number => r != null);
  const avgR = rMultiples.length > 0 ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length : null;

  const winPnLs = closed.filter((t) => (t.profitLoss ?? 0) > 0).map((t) => t.profitLoss!);
  const lossPnLs = closed.filter((t) => (t.profitLoss ?? 0) < 0).map((t) => t.profitLoss!);

  const strategyPnL = groupPnL(closed, (t) => t.strategy ?? "Unspecified");
  const sessionPnL = groupPnL(closed, (t) => t.tradingSession ?? "Unknown");

  const sorted = [...closed].sort((a, b) => {
    const at = a.closedAt?.getTime() ?? 0;
    const bt = b.closedAt?.getTime() ?? 0;
    return bt - at;
  });

  const recentResults = sorted.slice(0, 8).map((t) => {
    const sign = (t.profitLoss ?? 0) >= 0 ? "+" : "";
    return `${t.isWinner ? "W" : "L"} ${sign}$${(t.profitLoss ?? 0).toFixed(0)}`;
  });

  const latestClose = sorted[0]?.closedAt;

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    winRate: closed.length > 0 ? (winners.length / closed.length) * 100 : 0,
    totalPnL,
    avgRMultiple: avgR,
    // null when there are no losing trades yet (profit factor is undefined)
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    avgWin: winPnLs.length > 0 ? winPnLs.reduce((a, b) => a + b, 0) / winPnLs.length : null,
    avgLoss: lossPnLs.length > 0 ? lossPnLs.reduce((a, b) => a + b, 0) / lossPnLs.length : null,
    bestStrategy: bestKey(strategyPnL),
    worstStrategy: worstKey(strategyPnL),
    bestSession: bestKey(sessionPnL),
    worstSession: worstKey(sessionPnL),
    recentResults,
    analysisPeriodEnd: latestClose?.toISOString() ?? null,
  };
}

function groupPnL(trades: TradeRow[], keyFn: (t: TradeRow) => string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of trades) {
    const key = keyFn(t);
    map[key] = (map[key] ?? 0) + (t.profitLoss ?? 0);
  }
  return map;
}

function bestKey(map: Record<string, number>): string | null {
  const entries = Object.entries(map);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function worstKey(map: Record<string, number>): string | null {
  const entries = Object.entries(map);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => a[1] - b[1])[0][0];
}

export function snapshotToSummary(snapshot: TraderSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function compareSnapshots(
  previous: TraderSnapshot | null,
  current: TraderSnapshot,
): string {
  if (!previous) return "This is the trader's first persisted coaching analysis.";

  const pnlDelta = current.totalPnL - previous.totalPnL;
  const winRateDelta = current.winRate - previous.winRate;
  const tradesDelta = current.closedTrades - previous.closedTrades;

  return [
    `Trades analyzed: ${previous.closedTrades} → ${current.closedTrades} (+${tradesDelta})`,
    `Win rate: ${previous.winRate.toFixed(1)}% → ${current.winRate.toFixed(1)}% (${winRateDelta >= 0 ? "+" : ""}${winRateDelta.toFixed(1)}%)`,
    `Total P/L: $${previous.totalPnL.toFixed(0)} → $${current.totalPnL.toFixed(0)} (${pnlDelta >= 0 ? "+" : ""}$${pnlDelta.toFixed(0)})`,
    `Avg R: ${fmtR(previous.avgRMultiple)} → ${fmtR(current.avgRMultiple)}`,
    `Profit factor: ${fmtPF(previous.profitFactor)} → ${fmtPF(current.profitFactor)}`,
    `Recent streak: ${current.recentResults.join(", ")}`,
  ].join("\n");
}

function fmtR(v: number | null) {
  return v != null ? `${v.toFixed(2)}R` : "—";
}

function fmtPF(v: number | null) {
  return v != null ? v.toFixed(2) : "—";
}
