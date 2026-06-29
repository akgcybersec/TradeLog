import { NextResponse } from "next/server";
import { enrichProfilesWithBalance, setDefaultTradingProfile } from "@/lib/trading-profiles";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.tradingProfile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (body.isDefault === true) {
      await setDefaultTradingProfile(id);
    }

    const profile = await prisma.tradingProfile.update({
      where: { id },
      data: {
        ...(body.name != null && { name: String(body.name).trim() }),
        ...(body.broker !== undefined && { broker: body.broker?.trim() || null }),
        ...(body.accountLabel !== undefined && { accountLabel: body.accountLabel?.trim() || null }),
        ...(body.initialBalance != null && { initialBalance: Number(body.initialBalance) }),
        ...(body.defaultRiskPercent != null && { defaultRiskPercent: Number(body.defaultRiskPercent) }),
        ...(body.defaultPositionSize != null && { defaultPositionSize: Number(body.defaultPositionSize) }),
        ...(body.positionSizingMode != null && {
          positionSizingMode: body.positionSizingMode === "risk" ? "risk" : "manual",
        }),
        ...(body.currency != null && { currency: String(body.currency).trim() || "USD" }),
      },
    });

    const [withBalance] = await enrichProfilesWithBalance([profile]);
    return NextResponse.json(withBalance);
  } catch (error) {
    console.error("Update trading profile error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const existing = await prisma.tradingProfile.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const tradeCount = await prisma.trade.count({ where: { tradingProfileId: id } });
  if (tradeCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete a profile with trades. Reassign trades first." },
      { status: 400 },
    );
  }

  if (existing.isDefault) {
    const next = await prisma.tradingProfile.findFirst({
      where: { id: { not: id } },
      orderBy: { createdAt: "asc" },
    });
    if (next) await setDefaultTradingProfile(next.id);
  }

  await prisma.tradingProfile.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
