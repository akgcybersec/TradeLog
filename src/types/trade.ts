export type AssetClass = "forex" | "crypto" | "commodities" | "indices" | "stocks";
export type TradeDirection = "buy" | "sell";
export type PositionUnit = "lots" | "units";

export interface InstrumentSpec {
  symbol: string;
  assetClass: AssetClass;
  pipSize: number;
  tickSize: number;
  decimalPrecision: number;
  contractSize: number;
  quoteCurrency: string;
}

export interface TradeInputs {
  instrument: string;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  positionUnit?: PositionUnit;
  accountBalance: number;
  strategy?: string;
  notes?: string;
}

export interface RiskMetrics {
  riskRewardRatio: number | null;
  slDistancePips: number | null;
  tpDistancePips: number | null;
  potentialProfit: number | null;
  potentialLoss: number | null;
  riskPercent: number | null;
  rewardPercent: number | null;
  breakEvenPrice: number | null;
  plannedRMultiple: number | null;
  positionExposure: number | null;
}

export interface ExitMetrics {
  profitLoss: number | null;
  profitLossPercent: number | null;
  netProfit: number | null;
  grossProfit: number | null;
  pipsWonLost: number | null;
  isWinner: boolean | null;
  tradeDurationMs: number | null;
  actualRMultiple: number | null;
  plannedProfitCaptured: number | null;
  plannedLossUsed: number | null;
}

export interface TimeMetadata {
  openedAt: Date;
  closedAt: Date | null;
  dayOfWeek: string;
  month: string;
  year: number;
  timeOfDay: string;
  tradingSession: string;
}

export interface ComputedTrade extends TradeInputs, RiskMetrics {
  instrumentSpec: InstrumentSpec;
  exitMetrics: ExitMetrics;
  timeMetadata: TimeMetadata;
}

export interface UserSettings {
  timezone: string;
  accountBalance: number;
  defaultRiskPercent: number;
  defaultPositionSize: number;
  preferredBroker?: string | null;
  preferredStrategy?: string | null;
  preferredTimeframe?: string | null;
  preferredAccount?: string | null;
  aiProvider: "anthropic" | "openai" | "gemini";
  anthropicApiKey?: string | null;
  openaiApiKey?: string | null;
  geminiApiKey?: string | null;
  aiModel: string;
}

export interface SmartDefaults {
  preferredBroker: string | null;
  defaultRiskPercent: number;
  defaultPositionSize: number;
  mostUsedInstrument: string | null;
  preferredStrategy: string | null;
  preferredTimeframe: string | null;
  preferredAccount: string | null;
  accountBalance: number;
}
