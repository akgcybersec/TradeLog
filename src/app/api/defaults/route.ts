import { NextResponse } from "next/server";
import { computeSmartDefaults } from "@/lib/defaults";

export async function GET() {
  const defaults = await computeSmartDefaults();
  return NextResponse.json(defaults);
}
