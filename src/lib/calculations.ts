import { getInstrumentSpec, priceToPips } from "@/lib/instruments";
import { extractTimeMetadata } from "@/lib/sessions";
import type {
  ExitMetrics,
  InstrumentSpec,
  PositionUnit,
  RiskMetrics,
  TradeDirection,
  TradeInputs,
} from "@/types/trade";

function isValidNumber(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

function getUnits(positionSize: number, positionUnit: PositionUnit, spec: InstrumentSpec): number {
  if (positionUnit === "units") return positionSize;
  return positionSize * spec.contractSize;
}

function getPipValue(spec: InstrumentSpec, entryPrice: number, positionSize: number, positionUnit: PositionUnit): number {
  const units = getUnits(positionSize, positionUnit, spec);
  const pipValuePerUnit = spec.pipSize;

  if (spec.assetClass === "forex") {
    if (spec.quoteCurrency === "USD") {
      return pipValuePerUnit * units;
    }
    if (spec.symbol.startsWith("USD")) {
      return (pipValuePerUnit * units) / entryPrice;
    }
    return pipValuePerUnit * units;
  }

  return pipValuePerUnit * units;
}

/** Suggest lot size from risk % and stop distance. Returns null if inputs invalid. */
export function suggestPositionSizeLots(
  instrument: string,
  direction: TradeDirection,
  entryPrice: number,
  stopLoss: number,
  accountBalance: number,
  riskPercent: number,
): number | null {
  if (!isValidNumber(entryPrice) || !isValidNumber(stopLoss) || accountBalance <= 0 || riskPercent <= 0) {
    return null;
  }

  const spec = getInstrumentSpec(instrument);
  const slDistance = direction === "buy" ? entryPrice - stopLoss : stopLoss - entryPrice;
  if (slDistance <= 0) return null;

  const slPips = priceToPips(slDistance, spec.pipSize);
  if (slPips <= 0) return null;

  const pipValueOneLot = getPipValue(spec, entryPrice, 1, "lots");
  if (pipValueOneLot <= 0) return null;

  const riskAmount = accountBalance * (riskPercent / 100);
  const lots = riskAmount / (slPips * pipValueOneLot);
  return Math.round(lots * 100) / 100;
}

export function calculateRiskMetrics(
  inputs: TradeInputs,
  spec: InstrumentSpec = getInstrumentSpec(inputs.instrument),
): RiskMetrics {
  const { direction, entryPrice, stopLoss, takeProfit, positionSize, accountBalance } = inputs;
  const positionUnit = inputs.positionUnit ?? "lots";

  if (!isValidNumber(entryPrice) || !isValidNumber(stopLoss) || !isValidNumber(takeProfit) || !isValidNumber(positionSize)) {
    return emptyRiskMetrics();
  }

  const slDistance = direction === "buy" ? entryPrice - stopLoss : stopLoss - entryPrice;
  const tpDistance = direction === "buy" ? takeProfit - entryPrice : entryPrice - takeProfit;

  if (slDistance <= 0 || tpDistance <= 0) {
    return emptyRiskMetrics();
  }

  const slPips = priceToPips(slDistance, spec.pipSize);
  const tpPips = priceToPips(tpDistance, spec.pipSize);
  const pipValue = getPipValue(spec, entryPrice, positionSize, positionUnit);

  const potentialLoss = slPips * pipValue;
  const potentialProfit = tpPips * pipValue;
  const riskRewardRatio = tpPips / slPips;
  const riskPercent = accountBalance > 0 ? (potentialLoss / accountBalance) * 100 : null;
  const rewardPercent = accountBalance > 0 ? (potentialProfit / accountBalance) * 100 : null;

  const units = getUnits(positionSize, positionUnit, spec);
  const positionExposure = entryPrice * units;

  const spreadEstimate = spec.pipSize * 2;
  const breakEvenPrice =
    direction === "buy"
      ? entryPrice + spreadEstimate
      : entryPrice - spreadEstimate;

  return {
    riskRewardRatio,
    slDistancePips: slPips,
    tpDistancePips: tpPips,
    potentialProfit,
    potentialLoss,
    riskPercent,
    rewardPercent,
    breakEvenPrice,
    plannedRMultiple: riskRewardRatio,
    positionExposure,
  };
}

export function calculateExitMetrics(
  direction: TradeDirection,
  entryPrice: number,
  exitPrice: number,
  stopLoss: number,
  takeProfit: number,
  positionSize: number,
  positionUnit: PositionUnit,
  accountBalance: number,
  spec: InstrumentSpec,
  potentialProfit: number | null,
  potentialLoss: number | null,
  openedAt: Date,
  closedAt: Date,
): ExitMetrics {
  if (!isValidNumber(exitPrice)) {
    return emptyExitMetrics();
  }

  const priceMove = direction === "buy" ? exitPrice - entryPrice : entryPrice - exitPrice;
  const pipsWonLost = priceToPips(priceMove, spec.pipSize) * (priceMove >= 0 ? 1 : -1);
  const pipValue = getPipValue(spec, entryPrice, positionSize, positionUnit);
  const profitLoss = pipsWonLost * pipValue;
  const grossProfit = Math.max(profitLoss, 0);
  const netProfit = profitLoss;
  const profitLossPercent = accountBalance > 0 ? (profitLoss / accountBalance) * 100 : null;
  const isWinner = profitLoss > 0;

  const slDistance = direction === "buy" ? entryPrice - stopLoss : stopLoss - entryPrice;
  const actualRisk = priceToPips(Math.abs(slDistance), spec.pipSize) * pipValue;
  const actualRMultiple = actualRisk > 0 ? profitLoss / actualRisk : null;

  const plannedProfitCaptured =
    potentialProfit && potentialProfit > 0 ? (profitLoss / potentialProfit) * 100 : null;

  const plannedLossUsed =
    potentialLoss && potentialLoss > 0 && profitLoss < 0
      ? (Math.abs(profitLoss) / potentialLoss) * 100
      : profitLoss >= 0
        ? 0
        : null;

  return {
    profitLoss,
    profitLossPercent,
    netProfit,
    grossProfit,
    pipsWonLost,
    isWinner,
    tradeDurationMs: closedAt.getTime() - openedAt.getTime(),
    actualRMultiple,
    plannedProfitCaptured,
    plannedLossUsed,
  };
}

export function computeFullTrade(
  inputs: TradeInputs,
  timezone: string,
  exitPrice?: number | null,
  closedAt?: Date | null,
  openedAt: Date = new Date(),
) {
  const spec = getInstrumentSpec(inputs.instrument);
  const risk = calculateRiskMetrics(inputs, spec);
  const timeMetadata = extractTimeMetadata(openedAt, timezone, closedAt);

  const exitMetrics =
    exitPrice != null && closedAt != null
      ? calculateExitMetrics(
          inputs.direction,
          inputs.entryPrice,
          exitPrice,
          inputs.stopLoss,
          inputs.takeProfit,
          inputs.positionSize,
          inputs.positionUnit ?? "lots",
          inputs.accountBalance,
          spec,
          risk.potentialProfit,
          risk.potentialLoss,
          openedAt,
          closedAt,
        )
      : emptyExitMetrics();

  return { spec, risk, exitMetrics, timeMetadata };
}

function emptyRiskMetrics(): RiskMetrics {
  return {
    riskRewardRatio: null,
    slDistancePips: null,
    tpDistancePips: null,
    potentialProfit: null,
    potentialLoss: null,
    riskPercent: null,
    rewardPercent: null,
    breakEvenPrice: null,
    plannedRMultiple: null,
    positionExposure: null,
  };
}

function emptyExitMetrics(): ExitMetrics {
  return {
    profitLoss: null,
    profitLossPercent: null,
    netProfit: null,
    grossProfit: null,
    pipsWonLost: null,
    isWinner: null,
    tradeDurationMs: null,
    actualRMultiple: null,
    plannedProfitCaptured: null,
    plannedLossUsed: null,
  };
}

export function formatCurrency(value: number | null, currency = "USD"): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
