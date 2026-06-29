import { NextResponse } from "next/server";
import { isAiConfigured, toUserSettings } from "@/lib/ai/config";
import { generateHistoricalInsights } from "@/lib/ai/review";
import { computeTraderSnapshot, type TraderSnapshot } from "@/lib/ai/snapshot";
import { getOrCreateSettings, prisma } from "@/lib/prisma";

function toUserSettingsFromDb(settings: Awaited<ReturnType<typeof getOrCreateSettings>>) {
  return toUserSettings({
    timezone: settings.timezone,
    accountBalance: settings.accountBalance,
    defaultRiskPercent: settings.defaultRiskPercent,
    defaultPositionSize: settings.defaultPositionSize,
    preferredBroker: settings.preferredBroker,
    preferredStrategy: settings.preferredStrategy,
    preferredTimeframe: settings.preferredTimeframe,
    preferredAccount: settings.preferredAccount,
    aiProvider: settings.aiProvider,
    anthropicApiKey: settings.anthropicApiKey,
    openaiApiKey: settings.openaiApiKey,
    geminiApiKey: settings.geminiApiKey,
    aiModel: settings.aiModel,
  });
}

function parseSnapshot(json: string): TraderSnapshot {
  try {
    return JSON.parse(json) as TraderSnapshot;
  } catch {
    return {
      totalTrades: 0,
      closedTrades: 0,
      winRate: 0,
      totalPnL: 0,
      avgRMultiple: null,
      profitFactor: null,
      avgWin: null,
      avgLoss: null,
      bestStrategy: null,
      worstStrategy: null,
      bestSession: null,
      worstSession: null,
      recentResults: [],
      analysisPeriodEnd: null,
    };
  }
}

function serializeReport(report: {
  id: string;
  createdAt: Date;
  content: string;
  tradeCount: number;
  newTradesSinceLast: number;
  snapshotJson: string;
  previousReportId: string | null;
}) {
  return {
    id: report.id,
    createdAt: report.createdAt.toISOString(),
    content: report.content,
    tradeCount: report.tradeCount,
    newTradesSinceLast: report.newTradesSinceLast,
    snapshot: parseSnapshot(report.snapshotJson),
    previousReportId: report.previousReportId,
  };
}

export async function GET() {
  const reports = await prisma.aiInsightReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    reports: reports.map(serializeReport),
    latest: reports[0] ? serializeReport(reports[0]) : null,
  });
}

export async function POST() {
  try {
    const settings = await getOrCreateSettings();

    if (!isAiConfigured(settings)) {
      return NextResponse.json({ error: "AI not configured — add an API key in Settings" }, { status: 400 });
    }

    const trades = await prisma.trade.findMany({
      where: { exitPrice: { not: null } },
      orderBy: { closedAt: "desc" },
      take: 100,
    });

    if (trades.length < 3) {
      return NextResponse.json(
        { error: "Need at least 3 completed trades for historical insights" },
        { status: 400 },
      );
    }

    const previousReport = await prisma.aiInsightReport.findFirst({
      orderBy: { createdAt: "desc" },
    });

    const newTradesSinceLast = previousReport
      ? trades.filter((t) => t.closedAt && t.closedAt > previousReport.createdAt).length
      : trades.length;

    const currentSnapshot = computeTraderSnapshot(trades);

    // Snapshot already encodes the full window's stats, so only send detailed rows
    // for trades that are new since the last report (with a floor for texture).
    // Keeps token cost roughly constant as history grows. ponytail: floor is a flat 15.
    const DETAIL_FLOOR = 15;
    const detailCount = Math.min(trades.length, Math.max(newTradesSinceLast, DETAIL_FLOOR));
    const detailedTrades = trades.slice(0, detailCount);

    const summary = detailedTrades.map((t) => ({
      instrument: t.instrument,
      direction: t.direction,
      strategy: t.strategy,
      session: t.tradingSession,
      dayOfWeek: t.dayOfWeek,
      profitLoss: t.profitLoss,
      isWinner: t.isWinner,
      rMultiple: t.actualRMultiple,
      riskReward: t.riskRewardRatio,
      notes: t.notes?.slice(0, 300),
      closedAt: t.closedAt,
      aiReviewedAt: t.aiReviewedAt,
      hasAiReview: Boolean(t.aiReview),
    }));

    const previousInsight = previousReport
      ? {
          analyzedAt: previousReport.createdAt.toISOString(),
          content: previousReport.content,
          snapshot: parseSnapshot(previousReport.snapshotJson),
        }
      : null;

    const content = await generateHistoricalInsights(
      JSON.stringify(summary, null, 2),
      toUserSettingsFromDb(settings),
      {
        currentSnapshot,
        previousInsight,
        newTradesSinceLast,
        preferredStrategy: settings.preferredStrategy,
      },
    );

    const saved = await prisma.aiInsightReport.create({
      data: {
        content,
        tradeCount: trades.length,
        newTradesSinceLast,
        snapshotJson: JSON.stringify(currentSnapshot),
        previousReportId: previousReport?.id ?? null,
      },
    });

    return NextResponse.json(serializeReport(saved));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Insights generation failed";
    console.error("Insights error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
