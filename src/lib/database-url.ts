import path from "path";

/** Single SQLite file regardless of relative DATABASE_URL or cwd quirks. */
export function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim() || "file:./prisma/dev.db";
  const filePath = raw.startsWith("file:") ? raw.slice("file:".length) : raw;
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  return `file:${absolute}`;
}
