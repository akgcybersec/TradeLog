import { NextResponse } from "next/server";
import { generateTradeReview } from "@/lib/ai/review";
import { buildTradeReviewInput } from "@/lib/ai/tradeContext";
import { isAiConfigured, toUserSettings } from "@/lib/ai/config";
import { getOrCreateSettings, prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const settings = await getOrCreateSettings();

    if (!isAiConfigured(settings)) {
      return NextResponse.json({ error: "AI not configured" }, { status: 400 });
    }

    const trade = await prisma.trade.findUnique({
      where: { id },
      include: { screenshots: true },
    });

    if (!trade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    if (!trade.exitPrice) {
      return NextResponse.json({ error: "Trade must be closed before AI review" }, { status: 400 });
    }

    const { context, images, marketContext } = await buildTradeReviewInput(
      trade,
      settings.twelveDataApiKey,
    );
    const review = await generateTradeReview(context, toUserSettings(settings), {
      images,
      marketContext,
    });

    const updated = await prisma.trade.update({
      where: { id },
      data: { aiReview: review, aiReviewedAt: new Date() },
      include: { screenshots: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
