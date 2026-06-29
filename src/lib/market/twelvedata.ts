// Pulls objective OHLCV price action around a trade from Twelve Data's REST API.
// Forex, metals (XAU/XAG) and crypto return real spot prices on the free tier;
// indices and oil require a paid plan, so those simply return null and the
// review proceeds without a market block. Best-effort: any failure returns null.

interface MarketTrade {
  instrument: string;
  direction: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  exitPrice?: number | null;
  decimalPrecision: number;
  openedAt: Date;
  closedAt?: Date | null;
}

interface Candle {
  ts: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

const METALS = new Set(["XAUUSD", "XAGUSD"]);
const CRYPTO = new Set(["BTCUSD", "ETHUSD", "SOLUSD"]);

// Maps the app's symbol to Twelve Data's slash notation. Returns null for
// instruments not covered by the free tier (indices, oil) — feeding a
// different-scale proxy would only mislead the model.
function toTwelveSymbol(raw: string): string | null {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (METALS.has(s) || CRYPTO.has(s)) return `${s.slice(0, 3)}/${s.slice(3)}`;
  if (/^[A-Z]{6}$/.test(s)) return `${s.slice(0, 3)}/${s.slice(3)}`; // forex
  if (/^[A-Z]{1,5}$/.test(s)) return s; // stocks/ETFs (delayed on free tier)
  return null;
}

const DAY = 86_400_000;

function fmtDate(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19);
}

export async function fetchMarketContext(
  trade: MarketTrade,
  apiKey: string | null | undefined,
): Promise<string | null> {
  if (!apiKey) return null;

  const symbol = toTwelveSymbol(trade.instrument);
  if (!symbol) return null;

  try {
    const opened = trade.openedAt.getTime();
    const closed = (trade.closedAt ?? new Date()).getTime();
    const ageDays = (Date.now() - closed) / DAY;

    // ponytail: fixed interval/lookback heuristic, not tuned per holding time.
    // Ceiling: scalps lose intrabar detail on the 15m grid. Upgrade = derive
    // interval from trade duration.
    const interval = ageDays > 30 ? "1day" : "15min";
    const lookback = interval === "1day" ? 90 * DAY : 3 * DAY;
    const buffer = interval === "1day" ? DAY : 6 * 3_600_000;

    const params = new URLSearchParams({
      symbol,
      interval,
      start_date: fmtDate(opened - lookback),
      end_date: fmtDate(closed + buffer),
      timezone: "UTC",
      outputsize: "5000",
      apikey: apiKey,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://api.twelvedata.com/time_series?${params}`, {
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) return null;
    const data = await res.json();
    if (data?.status === "error" || !Array.isArray(data?.values)) return null;

    const candles: Candle[] = [];
    // Twelve Data returns newest-first; reverse to chronological order.
    for (const v of [...data.values].reverse()) {
      const ts = new Date(`${v.datetime.replace(" ", "T")}Z`).getTime();
      const o = parseFloat(v.open);
      const h = parseFloat(v.high);
      const l = parseFloat(v.low);
      const c = parseFloat(v.close);
      if ([ts, o, h, l, c].some((n) => !Number.isFinite(n))) continue;
      candles.push({ ts, o, h, l, c });
    }
    if (candles.length < 3) return null;

    return summarize(candles, trade, symbol, interval);
  } catch {
    return null;
  }
}

function summarize(all: Candle[], trade: MarketTrade, symbol: string, interval: string): string {
  const dp = trade.decimalPrecision;
  const f = (n: number) => n.toFixed(dp);
  const opened = trade.openedAt.getTime();
  const closed = (trade.closedAt ?? new Date()).getTime();

  const pre = all.filter((c) => c.ts < opened).slice(-50);
  const during = all.filter((c) => c.ts >= opened && c.ts <= closed);

  const ranges = (cs: Candle[]) =>
    cs.length
      ? { high: Math.max(...cs.map((c) => c.h)), low: Math.min(...cs.map((c) => c.l)) }
      : null;
  const preRange = ranges(pre);
  const duringRange = ranges(during);

  const fmtTime = (ts: number) => new Date(ts).toISOString().replace("T", " ").slice(0, 16) + "Z";
  const line = (c: Candle) => `${fmtTime(c.ts)} | O ${f(c.o)} H ${f(c.h)} L ${f(c.l)} C ${f(c.c)}`;

  const lines: string[] = [];
  lines.push(`Source: Twelve Data "${symbol}" @ ${interval} candles (real spot prices).`);
  if (preRange)
    lines.push(
      `Context before entry (${pre.length} candles): high ${f(preRange.high)}, low ${f(preRange.low)}.`,
    );
  lines.push(
    `Trade levels — entry ${f(trade.entryPrice)}, stop ${f(trade.stopLoss)}, target ${f(
      trade.takeProfit,
    )}${trade.exitPrice != null ? `, exit ${f(trade.exitPrice)}` : ""} (${trade.direction}).`,
  );
  if (duringRange)
    lines.push(
      `While the trade was open (${during.length} candles): high ${f(duringRange.high)}, low ${f(
        duringRange.low,
      )}.`,
    );
  else lines.push("No candles fell inside the holding window at this resolution.");

  lines.push("");
  lines.push("Candles leading into and during the trade (oldest first):");
  for (const c of [...pre, ...during]) lines.push(line(c));

  return lines.join("\n");
}
