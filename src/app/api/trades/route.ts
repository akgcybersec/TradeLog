import { NextResponse } from "next/server";
import { runTradeReviewIfConfigured } from "@/lib/ai/autoReview";
import { computeFullTrade } from "@/lib/calculations";
import { getDefaultTradingProfile, getProfileCurrentBalance } from "@/lib/trading-profiles";
import { getOrCreateSettings, prisma } from "@/lib/prisma";

export async function GET() {
  const trades = await prisma.trade.findMany({
    include: { screenshots: true, tradingProfile: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(trades);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const additionalTakeProfits = Array.isArray(body.additionalTakeProfits)
      ? body.additionalTakeProfits
          .map((v: unknown) => Number(v))
          .filter((v: number) => Number.isFinite(v) && v > 0)
      : [];
    const exitOutcome = body.exitPrice ? (body.exitOutcome?.trim() || null) : null;
    const settings = await getOrCreateSettings();
    const openedAt = body.openedAt ? new Date(body.openedAt) : new Date();
    const closedAt = body.exitPrice ? (body.closedAt ? new Date(body.closedAt) : new Date()) : null;

    let tradingProfileId: string | null = body.tradingProfileId ?? null;
    if (!tradingProfileId) {
      const defaultProfile = await getDefaultTradingProfile();
      tradingProfileId = defaultProfile?.id ?? null;
    }

    let accountBalance = Number(body.accountBalance);
    if (!Number.isFinite(accountBalance) && tradingProfileId) {
      accountBalance = await getProfileCurrentBalance(tradingProfileId);
    } else if (!Number.isFinite(accountBalance)) {
      accountBalance = settings.accountBalance;
    }

    const inputs = {
      instrument: body.instrument,
      direction: body.direction,
      entryPrice: Number(body.entryPrice),
      stopLoss: Number(body.stopLoss),
      takeProfit: Number(body.takeProfit),
      positionSize: Number(body.positionSize),
      positionUnit: body.positionUnit ?? "lots",
      accountBalance,
      strategy: body.strategy,
      notes: body.notes,
    };

    const { spec, risk, exitMetrics, timeMetadata } = computeFullTrade(
      inputs,
      settings.timezone,
      body.exitPrice ? Number(body.exitPrice) : null,
      closedAt,
      openedAt,
    );

    const trade = await prisma.trade.create({
      data: {
        tradingProfileId,
        instrument: spec.symbol,
        direction: inputs.direction,
        entryPrice: inputs.entryPrice,
        stopLoss: inputs.stopLoss,
        takeProfit: inputs.takeProfit,
        takeProfitTargetsJson: additionalTakeProfits.length ? JSON.stringify(additionalTakeProfits) : null,
        positionSize: inputs.positionSize,
        positionUnit: inputs.positionUnit ?? "lots",
        accountBalance: inputs.accountBalance,
        strategy: inputs.strategy,
        notes: inputs.notes,
        postTradeImpression: body.postTradeImpression?.trim() || null,
        assetClass: spec.assetClass,
        pipSize: spec.pipSize,
        tickSize: spec.tickSize,
        decimalPrecision: spec.decimalPrecision,
        quoteCurrency: spec.quoteCurrency,
        ...risk,
        exitPrice: body.exitPrice ? Number(body.exitPrice) : null,
        exitOutcome,
        closedAt,
        ...exitMetrics,
        openedAt: timeMetadata.openedAt,
        dayOfWeek: timeMetadata.dayOfWeek,
        month: timeMetadata.month,
        year: timeMetadata.year,
        timeOfDay: timeMetadata.timeOfDay,
        tradingSession: timeMetadata.tradingSession,
      },
      include: { screenshots: true, tradingProfile: true },
    });

    if (body.exitPrice) {
      await runTradeReviewIfConfigured(trade.id).catch(console.error);
      const reviewed = await prisma.trade.findUnique({
        where: { id: trade.id },
        include: { screenshots: true, tradingProfile: true },
      });
      return NextResponse.json(reviewed ?? trade, { status: 201 });
    }

    return NextResponse.json(trade, { status: 201 });
  } catch (error) {
    console.error("Create trade error:", error);
    return NextResponse.json({ error: "Failed to create trade" }, { status: 500 });
  }
}
