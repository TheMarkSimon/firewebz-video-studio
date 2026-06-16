import { NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

const ALLOWED_ROOTS = ["storage/uploads", "storage/generated-videos"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const rel = parts.join("/");
  if (!ALLOWED_ROOTS.some((root) => rel.startsWith(root))) {
    return new Response("Forbidden", { status: 403 });
  }
  const abs = path.resolve(process.cwd(), rel);
  if (!abs.startsWith(path.resolve(process.cwd()))) {
    return new Response("Forbidden", { status: 403 });
  }
  try {
    const data = await fs.readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    const mime =
      ext === ".mp4"
        ? "video/mp4"
        : ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : ext === ".gif"
              ? "image/gif"
              : "image/jpeg";
    return new Response(data, { headers: { "Content-Type": mime, "Cache-Control": "no-store" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
