import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const GENERATED_CLIENT_PATH = path.join(process.cwd(), "src/generated/prisma/client.ts");

let devClient: PrismaClient | undefined;
let devClientMtime = -1;

function getGeneratedClientMtime(): number {
  try {
    return fs.statSync(GENERATED_CLIENT_PATH).mtimeMs;
  } catch {
    return 0;
  }
}

function createPrismaClient() {
  const dbPath = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const url = dbPath.startsWith("file:")
    ? dbPath
    : `file:${path.join(process.cwd(), "prisma", "dev.db")}`;

  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return globalForPrisma.prisma;
  }

  const mtime = getGeneratedClientMtime();
  if (devClient && devClientMtime === mtime) {
    return devClient;
  }

  if (devClient) {
    void devClient.$disconnect();
  }

  devClient = createPrismaClient();
  devClientMtime = mtime;
  return devClient;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client as object, prop, client);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});

export async function getOrCreateSettings() {
  let settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { id: "default" } });
  }
  return settings;
}
