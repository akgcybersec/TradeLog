export function parseAdditionalTakeProfits(json: string | null | undefined): number[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0);
  } catch {
    return [];
  }
}

export interface ExitLevelOption {
  id: string;
  label: string;
  price: number;
}

export function buildExitLevelOptions(
  stopLoss: number,
  takeProfit: number,
  additionalTakeProfits: number[],
): ExitLevelOption[] {
  const options: ExitLevelOption[] = [
    { id: "sl", label: "SL Hit", price: stopLoss },
    { id: "tp1", label: "TP1", price: takeProfit },
  ];
  additionalTakeProfits.forEach((price, i) => {
    options.push({ id: `tp${i + 2}`, label: `TP${i + 2}`, price });
  });
  return options;
}

export function priceForExitOutcome(
  outcome: string,
  stopLoss: number,
  takeProfit: number,
  additionalTakeProfits: number[],
): number | null {
  if (outcome === "sl") return stopLoss;
  if (outcome === "tp1") return takeProfit;
  const tpMatch = outcome.match(/^tp(\d+)$/);
  if (tpMatch) {
    const n = Number(tpMatch[1]);
    if (n >= 2) {
      const price = additionalTakeProfits[n - 2];
      return price != null ? price : null;
    }
  }
  return null;
}
