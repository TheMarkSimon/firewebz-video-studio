// Owned media storage: Cloudflare R2 (S3-compatible), via aws4fetch (tiny
// SigV4 client, no AWS SDK). Zero-egress — serving spins from here is what
// makes "unlimited views, we charge for creation" permanently true, and it
// removes the dependency on fal.media's goodwill for merchant embeds.
//
// Strategy: generation still lands on fal (their compute writes there);
// at COMPLETION we mirror video+frames into R2 and point the Spin row at
// the R2 public URLs. Mirror failures are non-fatal (row keeps fal URLs,
// logged) — durability improves, availability never regresses.

import { AwsClient } from "aws4fetch";
import { prisma } from "@/lib/db";

function cfg() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

export function r2Configured(): boolean {
  return cfg() !== null;
}

// Download from sourceUrl and PUT into R2 at `key`. Returns the public URL,
// or null on any failure (caller keeps the original URL).
export async function storeFromUrl(
  sourceUrl: string,
  key: string,
  fallbackContentType = "application/octet-stream",
): Promise<string | null> {
  const c = cfg();
  if (!c) return null;
  try {
    const src = await fetch(sourceUrl, { cache: "no-store" });
    if (!src.ok) return null;
    const body = await src.arrayBuffer();

    const client = new AwsClient({
      accessKeyId: c.accessKeyId,
      secretAccessKey: c.secretAccessKey,
      service: "s3",
      region: "auto",
    });
    const put = await client.fetch(
      `https://${c.accountId}.r2.cloudflarestorage.com/${c.bucket}/${key}`,
      {
        method: "PUT",
        body,
        headers: {
          "Content-Type": src.headers.get("content-type") ?? fallbackContentType,
        },
      },
    );
    if (!put.ok) {
      console.error(`[storage] PUT ${key} failed: HTTP ${put.status} ${(await put.text()).slice(0, 200)}`);
      return null;
    }
    return `${c.publicUrl}/${key}`;
  } catch (err) {
    console.error(`[storage] mirror ${key} failed:`, err);
    return null;
  }
}

// Mirror a completed spin's video + frames into R2 and repoint the row.
// Idempotent: skips anything already on our public URL. All-or-nothing per
// asset class (never mix fal and R2 frame URLs on one spin).
export async function mirrorSpinMediaToR2(spinId: string): Promise<void> {
  const c = cfg();
  if (!c) return;

  const spin = await prisma.spin.findUnique({
    where: { id: spinId },
    select: { videoUrl: true, frameUrls: true, status: true },
  });
  if (!spin || spin.status !== "ready" || !spin.videoUrl) return;

  const data: { videoUrl?: string; frameUrls?: string[] } = {};

  if (!spin.videoUrl.startsWith(c.publicUrl)) {
    const video = await storeFromUrl(spin.videoUrl, `spins/${spinId}/video.mp4`, "video/mp4");
    if (video) data.videoUrl = video;
  }

  const frames = (spin.frameUrls as string[] | null) ?? null;
  if (frames && frames.length > 0 && !frames[0].startsWith(c.publicUrl)) {
    const mirrored = await Promise.all(
      frames.map((u, i) =>
        storeFromUrl(u, `spins/${spinId}/frames/f${String(i).padStart(3, "0")}.jpg`, "image/jpeg"),
      ),
    );
    if (mirrored.every((u): u is string => Boolean(u))) {
      data.frameUrls = mirrored;
    } else {
      console.error(`[storage] spin ${spinId}: ${mirrored.filter((u) => !u).length} frame(s) failed to mirror — keeping fal frame URLs`);
    }
  }

  if (Object.keys(data).length > 0) {
    await prisma.spin.update({ where: { id: spinId }, data });
  }
}
