import { NextResponse } from "next/server";
import { runTradeReviewIfConfigured } from "@/lib/ai/autoReview";
import { computeFullTrade } from "@/lib/calculations";
import { getOrCreateSettings, prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const trade = await prisma.trade.findUnique({
    where: { id },
    include: { screenshots: true, tradingProfile: true },
  });

  if (!trade) {
    return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  }

  if (trade.exitPrice && !trade.closedAt) {
    const backfilled = await prisma.trade.update({
      where: { id },
      data: { closedAt: trade.updatedAt > trade.openedAt ? trade.updatedAt : new Date() },
      include: { screenshots: true, tradingProfile: true },
    });
    return NextResponse.json(backfilled);
  }

  return NextResponse.json(trade);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.trade.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    const additionalTakeProfits = Array.isArray(body.additionalTakeProfits)
      ? body.additionalTakeProfits
          .map((v: unknown) => Number(v))
          .filter((v: number) => Number.isFinite(v) && v > 0)
      : null;
    const exitOutcome =
      body.exitOutcome !== undefined
        ? body.exitOutcome?.trim() || null
        : body.exitPrice != null
          ? existing.exitOutcome
          : undefined;

    const settings = await getOrCreateSettings();

    const isExitUpdate = body.exitPrice != null;
    const isExitCorrection = isExitUpdate && existing.exitPrice != null;
    const closedAt = isExitUpdate
      ? isExitCorrection && existing.closedAt
        ? existing.closedAt
        : new Date()
      : null;

    const inputs = {
      instrument: body.instrument ?? existing.instrument,
      direction: (body.direction ?? existing.direction) as "buy" | "sell",
      entryPrice: Number(body.entryPrice ?? existing.entryPrice),
      stopLoss: Number(body.stopLoss ?? existing.stopLoss),
      takeProfit: Number(body.takeProfit ?? existing.takeProfit),
      positionSize: Number(body.positionSize ?? existing.positionSize),
      positionUnit: (body.positionUnit ?? existing.positionUnit) as "lots" | "units",
      accountBalance: Number(body.accountBalance ?? existing.accountBalance),
      strategy: body.strategy ?? existing.strategy,
      notes: body.notes ?? existing.notes,
    };

    const tradingProfileId =
      body.tradingProfileId !== undefined ? body.tradingProfileId : existing.tradingProfileId;
    const postTradeImpression =
      body.postTradeImpression !== undefined
        ? body.postTradeImpression?.trim() || null
        : existing.postTradeImpression;

    const { spec, risk, exitMetrics, timeMetadata } = computeFullTrade(
      inputs,
      settings.timezone,
      body.exitPrice != null ? Number(body.exitPrice) : existing.exitPrice,
      closedAt ?? existing.closedAt,
      existing.openedAt,
    );

    const wasOpen = !existing.exitPrice;
    const isNowClosed = body.exitPrice != null ? Number(body.exitPrice) : existing.exitPrice;

    const trade = await prisma.trade.update({
      where: { id },
      data: {
        tradingProfileId,
        postTradeImpression,
        ...(additionalTakeProfits !== null && {
          takeProfitTargetsJson: additionalTakeProfits.length ? JSON.stringify(additionalTakeProfits) : null,
        }),
        ...(exitOutcome !== undefined && { exitOutcome }),
        ...inputs,
        instrument: spec.symbol,
        assetClass: spec.assetClass,
        pipSize: spec.pipSize,
        tickSize: spec.tickSize,
        decimalPrecision: spec.decimalPrecision,
        quoteCurrency: spec.quoteCurrency,
        ...risk,
        exitPrice: body.exitPrice != null ? Number(body.exitPrice) : existing.exitPrice,
        closedAt: closedAt ?? existing.closedAt,
        ...exitMetrics,
        dayOfWeek: timeMetadata.dayOfWeek,
        month: timeMetadata.month,
        year: timeMetadata.year,
        timeOfDay: timeMetadata.timeOfDay,
        tradingSession: timeMetadata.tradingSession,
      },
      include: { screenshots: true, tradingProfile: true },
    });

    if (wasOpen && isNowClosed) {
      await runTradeReviewIfConfigured(id).catch(console.error);
      const reviewed = await prisma.trade.findUnique({
        where: { id },
        include: { screenshots: true, tradingProfile: true },
      });
      return NextResponse.json(reviewed ?? trade);
    }

    return NextResponse.json(trade);
  } catch (error) {
    console.error("Update trade error:", error);
    return NextResponse.json({ error: "Failed to update trade" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  await prisma.trade.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
