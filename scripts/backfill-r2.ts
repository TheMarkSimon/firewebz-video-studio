// One-time backfill: mirror every existing ready spin's media from
// fal.media into R2 and repoint the rows. Idempotent — safe to re-run
// (already-mirrored spins are skipped by mirrorSpinMediaToR2).
//
// Run:  npx tsx --env-file=.env.local --env-file=.env scripts/backfill-r2.ts

import { PrismaClient } from "@prisma/client";
import { mirrorSpinMediaToR2, r2Configured } from "../src/lib/storage";

const prisma = new PrismaClient();

async function main() {
  if (!r2Configured()) {
    console.error("R2 env vars missing — aborting.");
    process.exit(1);
  }
  const spins = await prisma.spin.findMany({
    where: { status: "ready", videoUrl: { not: null } },
    select: { id: true, title: true, videoUrl: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`${spins.length} ready spins to check`);

  let mirrored = 0;
  for (const s of spins) {
    const already = s.videoUrl?.includes(".r2.dev");
    process.stdout.write(`- ${s.id} (${s.title}) ${already ? "already mirrored" : "mirroring…"}`);
    if (already) {
      console.log("");
      continue;
    }
    try {
      await mirrorSpinMediaToR2(s.id);
      const after = await prisma.spin.findUnique({ where: { id: s.id }, select: { videoUrl: true } });
      const ok = after?.videoUrl?.includes(".r2.dev");
      console.log(ok ? " ✓" : " ✗ (kept fal URLs — see errors above)");
      if (ok) mirrored++;
    } catch (err) {
      console.log(` ✗ ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`done — ${mirrored} newly mirrored`);
}

main().finally(() => prisma.$disconnect());
