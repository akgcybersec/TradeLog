import { readFile } from "fs/promises";
import path from "path";
import { resolveUploadFilePath } from "@/lib/uploads";

export interface ReviewImage {
  mediaType: string;
  data: string; // base64
  label?: string | null;
}

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const MAX_IMAGES = 4;
const MAX_BYTES = 5 * 1024 * 1024;

function storedPathToSegments(storedPath: string): string[] | null {
  if (storedPath.startsWith("/api/uploads/")) {
    return storedPath.slice("/api/uploads/".length).split("/");
  }
  if (storedPath.startsWith("/uploads/")) {
    return storedPath.slice("/uploads/".length).split("/");
  }
  return null;
}

// Loads attached chart screenshots from disk as base64 so vision-capable models
// can actually see what the trader saw. Best-effort: unreadable files are skipped.
export async function loadScreenshotImages(
  screenshots: { path: string; label?: string | null }[],
): Promise<ReviewImage[]> {
  const images: ReviewImage[] = [];
  for (const shot of screenshots.slice(0, MAX_IMAGES)) {
    const segments = storedPathToSegments(shot.path);
    if (!segments) continue;
    const filePath = resolveUploadFilePath(segments);
    if (!filePath) continue;
    const mediaType = MIME[path.extname(filePath).toLowerCase()];
    if (!mediaType) continue;
    try {
      const buf = await readFile(filePath);
      if (buf.byteLength > MAX_BYTES) continue;
      images.push({ mediaType, data: buf.toString("base64"), label: shot.label });
    } catch {
      // skip missing/unreadable file
    }
  }
  return images;
}
