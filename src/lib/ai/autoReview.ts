import { generateTradeReview } from "@/lib/ai/review";
import { buildTradeReviewInput } from "@/lib/ai/tradeContext";
import { isAiConfigured, toUserSettings } from "@/lib/ai/config";
import { getOrCreateSettings, prisma } from "@/lib/prisma";

export async function runTradeReviewIfConfigured(tradeId: string): Promise<boolean> {
  const settings = await getOrCreateSettings();
  if (!isAiConfigured(settings)) return false;

  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: { screenshots: true },
  });

  if (!trade?.exitPrice) return false;

  const { context, images, marketContext } = await buildTradeReviewInput(
    trade,
    settings.twelveDataApiKey,
  );
  const review = await generateTradeReview(context, toUserSettings(settings), {
    images,
    marketContext,
  });

  await prisma.trade.update({
    where: { id: tradeId },
    data: { aiReview: review, aiReviewedAt: new Date() },
  });

  return true;
}
