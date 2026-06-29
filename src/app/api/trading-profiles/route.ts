import { NextResponse } from "next/server";
import {
  ensureDefaultTradingProfile,
  enrichProfilesWithBalance,
} from "@/lib/trading-profiles";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await ensureDefaultTradingProfile();
  const profiles = await prisma.tradingProfile.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] });
  const withBalance = await enrichProfilesWithBalance(profiles);
  return NextResponse.json(withBalance);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const initialBalance = Number(body.initialBalance);
    if (!Number.isFinite(initialBalance) || initialBalance <= 0) {
      return NextResponse.json({ error: "Initial balance must be positive" }, { status: 400 });
    }

    const makeDefault = Boolean(body.isDefault);
    if (makeDefault) {
      await prisma.tradingProfile.updateMany({ data: { isDefault: false } });
    }

    const hasDefault = await prisma.tradingProfile.count({ where: { isDefault: true } });
    const profile = await prisma.tradingProfile.create({
      data: {
        name,
        broker: body.broker?.trim() || null,
        accountLabel: body.accountLabel?.trim() || null,
        initialBalance,
        defaultRiskPercent: Number(body.defaultRiskPercent ?? 1),
        defaultPositionSize: Number(body.defaultPositionSize ?? 0.1),
        positionSizingMode: body.positionSizingMode === "risk" ? "risk" : "manual",
        isDefault: makeDefault || hasDefault === 0,
        currency: body.currency?.trim() || "USD",
      },
    });

    const [withBalance] = await enrichProfilesWithBalance([profile]);
    return NextResponse.json(withBalance, { status: 201 });
  } catch (error) {
    console.error("Create trading profile error:", error);
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }
}
