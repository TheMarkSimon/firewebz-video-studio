// Quota + billing logic (Phase 5). The pricing model in one paragraph:
// Free = 3 lifetime spins. Pro ($29/mo via Shopify) = 10 spins per rolling
// 30 days included, then $2.50/spin billed as a Shopify usage charge.
// Views/hosting are never metered. A "spin" = one generation RUN: failures
// are refunded (our problem), regenerations count (they cost a real run).
//
// Enforcement is behind SPINR_QUOTA_ENFORCE=1 (see quotaEnforced()) so the
// machinery can ship dormant during validation.
//
// Overage charging happens on SUCCESS (spin-completion / sync finish), not
// at submit — merchants are never billed for a failed generation.

import { prisma } from "@/lib/db";
import {
  createAppUsageRecord,
  freeSpins,
  getShopToken,
  overagePriceUsd,
  proIncludedSpins,
  quotaEnforced,
} from "@/lib/shopify";

export interface PlanState {
  plan: "free" | "pro";
  enforced: boolean;
  // Free plan: lifetime credits left. Pro: included spins left this cycle.
  remaining: number;
  overagePriceUsd: string;
  // Pro only: whether overage billing is possible (usage line item exists).
  canUseOverage: boolean;
}

export async function getPlanState(userId: string): Promise<PlanState> {
  const connection = await prisma.shopifyConnection.findFirst({ where: { userId } });
  const pro = connection?.subscriptionStatus === "ACTIVE";
  const enforced = quotaEnforced();

  if (pro) {
    // Rolling 30-day window (beta simplification; close enough to the
    // Shopify invoice cycle and needs no extra API call per generation).
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const used = await prisma.spinUsage.count({
      where: { userId, kind: "included", counted: true, createdAt: { gte: since } },
    });
    return {
      plan: "pro",
      enforced,
      remaining: Math.max(0, proIncludedSpins() - used),
      overagePriceUsd: overagePriceUsd(),
      canUseOverage: Boolean(connection?.usageLineItemGid),
    };
  }

  const used = await prisma.spinUsage.count({
    where: { userId, kind: "free", counted: true },
  });
  return {
    plan: "free",
    enforced,
    remaining: Math.max(0, freeSpins() - used),
    overagePriceUsd: overagePriceUsd(),
    canUseOverage: false,
  };
}

// Live usage counters for the Studio plan row (trailing 30-day cycle).
export async function getCycleUsage(
  userId: string,
): Promise<{ includedUsed: number; overageCount: number }> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [includedUsed, overageCount] = await Promise.all([
    prisma.spinUsage.count({
      where: { userId, kind: "included", counted: true, createdAt: { gte: since } },
    }),
    prisma.spinUsage.count({
      where: { userId, kind: "overage", counted: true, createdAt: { gte: since } },
    }),
  ]);
  return { includedUsed, overageCount };
}

export type ConsumeResult =
  | { ok: true; kind: "free" | "included" | "overage" | "unmetered" }
  | { ok: false; error: string };

// Reserve a credit for a generation run — call right before submitting to
// the provider; pair with refundSpinUsage() on terminal failure.
export async function consumeSpinCredit(userId: string, spinId: string): Promise<ConsumeResult> {
  if (!quotaEnforced()) return { ok: true, kind: "unmetered" };

  const state = await getPlanState(userId);

  let kind: "free" | "included" | "overage";
  if (state.plan === "pro") {
    if (state.remaining > 0) kind = "included";
    else if (state.canUseOverage) kind = "overage";
    else {
      return {
        ok: false,
        error: "Your plan can't take extra spins right now — reconnect your Shopify store from Studio and try again.",
      };
    }
  } else {
    if (state.remaining <= 0) {
      return {
        ok: false,
        error: `You've used your ${freeSpins()} free spins. Upgrade to Spinr Pro in your Studio to keep going — billed through Shopify, no card entry.`,
      };
    }
    kind = "free";
  }

  await prisma.spinUsage.create({ data: { userId, spinId, kind } });
  return { ok: true, kind };
}

// Terminal failure → the run never counts against quota. Targets only the
// newest un-billed row for this spin (earlier rows belong to earlier,
// successful runs).
export async function refundSpinUsage(spinId: string): Promise<void> {
  const row = await prisma.spinUsage.findFirst({
    where: { spinId, counted: true, usageRecordGid: null },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return;
  await prisma.spinUsage.update({ where: { id: row.id }, data: { counted: false } });
}

// Success → if this run was an overage, bill it on Shopify now. Never
// throws: a billing hiccup must not fail a delivered spin (we log and the
// row stays unbilled for later reconciliation).
export async function billOverageIfNeeded(spinId: string): Promise<void> {
  const row = await prisma.spinUsage.findFirst({
    where: { spinId, kind: "overage", counted: true, usageRecordGid: null },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return;

  const connection = await prisma.shopifyConnection.findFirst({ where: { userId: row.userId } });
  if (!connection?.usageLineItemGid) {
    console.error(`[billing] overage row ${row.id} has no usage line item to bill against`);
    return;
  }

  try {
    const spin = await prisma.spin.findUnique({ where: { id: spinId }, select: { title: true } });
    const gid = await createAppUsageRecord(
      connection.shop,
      await getShopToken(connection),
      connection.usageLineItemGid,
      `Extra 360° spin: ${(spin?.title ?? spinId).slice(0, 60)}`,
    );
    await prisma.spinUsage.update({ where: { id: row.id }, data: { usageRecordGid: gid } });
  } catch (err) {
    console.error("[billing] usage record failed (spin stays delivered):", err);
  }
}
