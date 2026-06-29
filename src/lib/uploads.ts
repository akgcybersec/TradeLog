import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export function getUploadDir(): string {
  return UPLOAD_DIR;
}

/** Public URL path stored in the database for new uploads. */
export function publicUploadPath(tradeId: string, filename: string): string {
  return `/api/uploads/${tradeId}/${filename}`;
}

/** Resolve DB path to a browser-loadable URL (supports legacy /uploads/... paths). */
export function screenshotSrc(storedPath: string): string {
  if (storedPath.startsWith("/api/uploads/")) return storedPath;
  if (storedPath.startsWith("/uploads/")) {
    return `/api/uploads/${storedPath.slice("/uploads/".length)}`;
  }
  return storedPath;
}

export function resolveUploadFilePath(segments: string[]): string | null {
  if (!segments.length || segments.some((s) => s === ".." || s === "." || !s)) {
    return null;
  }
  const filePath = path.join(UPLOAD_DIR, ...segments);
  const normalizedRoot = path.resolve(UPLOAD_DIR) + path.sep;
  if (!path.resolve(filePath).startsWith(normalizedRoot)) return null;
  return filePath;
}
