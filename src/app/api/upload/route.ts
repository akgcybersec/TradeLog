import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { getUploadDir, publicUploadPath } from "@/lib/uploads";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const tradeId = formData.get("tradeId") as string | null;
    const label = formData.get("label") as string | null;

    if (!file || !tradeId) {
      return NextResponse.json({ error: "File and tradeId required" }, { status: 400 });
    }

    const trade = await prisma.trade.findUnique({ where: { id: tradeId }, select: { id: true } });
    if (!trade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = path.extname(file.name) || ".png";
    const filename = `${uuidv4()}${ext}`;
    const uploadDir = path.join(getUploadDir(), tradeId);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    const screenshot = await prisma.screenshot.create({
      data: {
        tradeId,
        filename: file.name,
        path: publicUploadPath(tradeId, filename),
        label: label ?? undefined,
      },
    });

    return NextResponse.json(screenshot, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
