import type { AssetClass, InstrumentSpec } from "@/types/trade";

const FOREX_MAJORS = new Set([
  "EURUSD", "GBPUSD", "AUDUSD", "NZDUSD", "USDCAD", "USDCHF", "USDJPY",
  "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "CADJPY", "CHFJPY", "NZDJPY",
  "EURAUD", "EURCAD", "EURCHF", "EURNZD", "GBPAUD", "GBPCAD", "GBPCHF",
  "GBPNZD", "AUDCAD", "AUDCHF", "AUDNZD", "CADCHF", "NZDCAD", "NZDCHF",
]);

const COMMODITIES: Record<string, Partial<InstrumentSpec>> = {
  XAUUSD: { pipSize: 0.01, tickSize: 0.01, decimalPrecision: 2, contractSize: 100, quoteCurrency: "USD" },
  XAGUSD: { pipSize: 0.001, tickSize: 0.001, decimalPrecision: 3, contractSize: 5000, quoteCurrency: "USD" },
  USOIL: { pipSize: 0.01, tickSize: 0.01, decimalPrecision: 2, contractSize: 1000, quoteCurrency: "USD" },
  UKOIL: { pipSize: 0.01, tickSize: 0.01, decimalPrecision: 2, contractSize: 1000, quoteCurrency: "USD" },
};

const INDICES: Record<string, Partial<InstrumentSpec>> = {
  US30: { pipSize: 1, tickSize: 1, decimalPrecision: 0, contractSize: 1, quoteCurrency: "USD" },
  US500: { pipSize: 0.1, tickSize: 0.1, decimalPrecision: 1, contractSize: 1, quoteCurrency: "USD" },
  NAS100: { pipSize: 0.1, tickSize: 0.1, decimalPrecision: 1, contractSize: 1, quoteCurrency: "USD" },
  GER40: { pipSize: 0.1, tickSize: 0.1, decimalPrecision: 1, contractSize: 1, quoteCurrency: "EUR" },
  UK100: { pipSize: 0.1, tickSize: 0.1, decimalPrecision: 1, contractSize: 1, quoteCurrency: "GBP" },
  JP225: { pipSize: 1, tickSize: 1, decimalPrecision: 0, contractSize: 1, quoteCurrency: "JPY" },
};

const CRYPTO: Record<string, Partial<InstrumentSpec>> = {
  BTCUSD: { pipSize: 1, tickSize: 0.01, decimalPrecision: 2, contractSize: 1, quoteCurrency: "USD" },
  ETHUSD: { pipSize: 0.1, tickSize: 0.01, decimalPrecision: 2, contractSize: 1, quoteCurrency: "USD" },
  SOLUSD: { pipSize: 0.01, tickSize: 0.01, decimalPrecision: 2, contractSize: 1, quoteCurrency: "USD" },
};

const POPULAR_INSTRUMENTS = [
  "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD", "US500", "NAS100",
  "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "ETHUSD", "US30", "GER40",
];

function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function isJpyPair(symbol: string): boolean {
  return symbol.endsWith("JPY") || symbol.startsWith("JPY");
}

function detectAssetClass(symbol: string): AssetClass {
  if (COMMODITIES[symbol]) return "commodities";
  if (INDICES[symbol]) return "indices";
  if (CRYPTO[symbol]) return "crypto";
  if (FOREX_MAJORS.has(symbol) || /^[A-Z]{6}$/.test(symbol)) return "forex";
  if (/^[A-Z]{1,5}$/.test(symbol)) return "stocks";
  return "forex";
}

function getForexSpec(symbol: string): InstrumentSpec {
  const jpy = isJpyPair(symbol);
  const quoteCurrency = symbol.slice(3, 6) || "USD";
  return {
    symbol,
    assetClass: "forex",
    pipSize: jpy ? 0.01 : 0.0001,
    tickSize: jpy ? 0.001 : 0.00001,
    decimalPrecision: jpy ? 3 : 5,
    contractSize: 100_000,
    quoteCurrency,
  };
}

export function getInstrumentSpec(rawSymbol: string): InstrumentSpec {
  const symbol = normalizeSymbol(rawSymbol);
  const assetClass = detectAssetClass(symbol);

  if (COMMODITIES[symbol]) {
    return { symbol, assetClass: "commodities", ...COMMODITIES[symbol] } as InstrumentSpec;
  }
  if (INDICES[symbol]) {
    return { symbol, assetClass: "indices", ...INDICES[symbol] } as InstrumentSpec;
  }
  if (CRYPTO[symbol]) {
    return { symbol, assetClass: "crypto", ...CRYPTO[symbol] } as InstrumentSpec;
  }
  if (assetClass === "forex") {
    return getForexSpec(symbol);
  }

  return {
    symbol,
    assetClass: "stocks",
    pipSize: 0.01,
    tickSize: 0.01,
    decimalPrecision: 2,
    contractSize: 1,
    quoteCurrency: "USD",
  };
}

export function priceToPips(distance: number, pipSize: number): number {
  if (!pipSize || !Number.isFinite(distance)) return 0;
  return Math.abs(distance) / pipSize;
}

export function formatPips(pips: number, assetClass: AssetClass): string {
  const label = assetClass === "forex" ? "pips" : "points";
  return `${pips.toFixed(1)} ${label}`;
}

export function formatRiskReward(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return "—";
  return `1:${ratio.toFixed(1)}`;
}

export function getPopularInstruments(): string[] {
  return POPULAR_INSTRUMENTS;
}

export function getAssetClassLabel(assetClass: AssetClass): string {
  const labels: Record<AssetClass, string> = {
    forex: "Forex",
    crypto: "Crypto",
    commodities: "Commodities",
    indices: "Indices",
    stocks: "Stocks",
  };
  return labels[assetClass];
}
