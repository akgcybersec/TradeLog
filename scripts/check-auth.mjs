#!/usr/bin/env node
import "dotenv/config";
import path from "path";
import Database from "better-sqlite3";

const raw = process.env.DATABASE_URL?.trim() || "file:./prisma/dev.db";
const filePath = raw.startsWith("file:") ? raw.slice("file:".length) : raw;
const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

try {
  const db = new Database(abs, { readonly: true });
  const users = db.prepare("SELECT id, email, length(passwordHash) AS hashLen FROM User").all();
  const settings = db.prepare("SELECT requireLogin FROM Settings WHERE id = 'default'").get();
  console.log("Database:", abs);
  console.log("Users:", users.length ? users : "(none)");
  console.log("requireLogin:", settings?.requireLogin ?? "(no settings row)");
  db.close();
} catch (error) {
  console.error("Failed to read database:", error instanceof Error ? error.message : error);
  process.exit(1);
}
