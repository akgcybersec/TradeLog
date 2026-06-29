import type { TradeReviewContext } from "@/lib/ai/review";
import { loadScreenshotImages, type ReviewImage } from "@/lib/ai/images";
import { fetchMarketContext } from "@/lib/market/twelvedata";
import { parseAdditionalTakeProfits } from "@/lib/take-profit-targets";

export interface TradeRecord {
  instrument: string;
  direction: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  takeProfitTargetsJson?: string | null;
  exitPrice: number | null;
  exitOutcome?: string | null;
  positionSize: number;
  accountBalance: number;
  strategy: string | null;
  notes: string | null;
  postTradeImpression: string | null;
  riskRewardRatio: number | null;
  riskPercent: number | null;
  plannedRMultiple: number | null;
  potentialProfit: number | null;
  potentialLoss: number | null;
  profitLoss: number | null;
  profitLossPercent: number | null;
  actualRMultiple: number | null;
  pipsWonLost: number | null;
  tradingSession: string | null;
  dayOfWeek: string | null;
  timeOfDay: string | null;
  isWinner: boolean | null;
  plannedProfitCaptured: number | null;
  decimalPrecision: number;
  openedAt: Date;
  closedAt: Date | null;
  screenshots: { path: string; label?: string | null }[];
}

// Single source of truth for everything fed into a per-trade AI review:
// numeric context, attached chart images (vision), and independent OHLCV data.
export async function buildTradeReviewInput(
  trade: TradeRecord,
  marketDataApiKey?: string | null,
): Promise<{
  context: TradeReviewContext;
  images: ReviewImage[];
  marketContext: string | null;
}> {
  const context: TradeReviewContext = {
    instrument: trade.instrument,
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    stopLoss: trade.stopLoss,
    takeProfit: trade.takeProfit,
    additionalTakeProfits: parseAdditionalTakeProfits(trade.takeProfitTargetsJson),
    exitPrice: trade.exitPrice,
    exitOutcome: trade.exitOutcome ?? null,
    positionSize: trade.positionSize,
    accountBalance: trade.accountBalance,
    strategy: trade.strategy,
    notes: trade.notes,
    postTradeImpression: trade.postTradeImpression,
    riskRewardRatio: trade.riskRewardRatio,
    riskPercent: trade.riskPercent,
    plannedRMultiple: trade.plannedRMultiple,
    potentialProfit: trade.potentialProfit,
    potentialLoss: trade.potentialLoss,
    profitLoss: trade.profitLoss,
    profitLossPercent: trade.profitLossPercent,
    actualRMultiple: trade.actualRMultiple,
    pipsWonLost: trade.pipsWonLost,
    tradingSession: trade.tradingSession,
    dayOfWeek: trade.dayOfWeek,
    timeOfDay: trade.timeOfDay,
    isWinner: trade.isWinner,
    plannedProfitCaptured: trade.plannedProfitCaptured,
    screenshotCount: trade.screenshots.length,
  };

  const [images, marketContext] = await Promise.all([
    loadScreenshotImages(trade.screenshots),
    fetchMarketContext(
      {
        instrument: trade.instrument,
        direction: trade.direction,
        entryPrice: trade.entryPrice,
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit,
        exitPrice: trade.exitPrice,
        decimalPrecision: trade.decimalPrecision,
        openedAt: trade.openedAt,
        closedAt: trade.closedAt,
      },
      marketDataApiKey,
    ),
  ]);

  return { context, images, marketContext };
}
