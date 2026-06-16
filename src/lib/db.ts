import { PrismaClient } from "@prisma/client";
import { existsSync, copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// On Vercel the filesystem is read-only except for /tmp. We ship a
// pre-built empty SQLite DB at prisma/seed.db inside the deployment,
// and copy it to /tmp/dev.db on cold start. The DB resets per cold
// start — fine for the validation demo.
function resolveDatabaseUrl(): string {
  const explicit = process.env.DATABASE_URL;
  if (explicit && explicit.length) return explicit;

  if (process.env.VERCEL) {
    const tmpDb = "/tmp/firewebz.db";
    try {
      if (!existsSync(tmpDb)) {
        const seedDb = path.resolve(process.cwd(), "prisma/seed.db");
        if (existsSync(seedDb)) {
          mkdirSync(path.dirname(tmpDb), { recursive: true });
          copyFileSync(seedDb, tmpDb);
        }
      }
    } catch (err) {
      console.error("[prisma] could not seed /tmp db:", err);
    }
    process.env.DATABASE_URL = `file:${tmpDb}`;
    return process.env.DATABASE_URL;
  }

  process.env.DATABASE_URL = "file:./dev.db";
  return process.env.DATABASE_URL;
}

const dbUrl = resolveDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: { db: { url: dbUrl } },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
