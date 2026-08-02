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
import { lsStatusIsActive } from "@/lib/lemonsqueezy";

export interface PlanState {
  plan: "free" | "pro";
  // Which rail the Pro plan runs on (null when free).
  provider: "shopify" | "web" | null;
  enforced: boolean;
  // Free plan: lifetime credits left. Pro: included spins left this cycle.
  remaining: number;
  // Purchased pack/top-up credits still unspent (never expire).
  packCredits: number;
  overagePriceUsd: string;
  // Shopify Pro only: whether overage billing is possible.
  canUseOverage: boolean;
  // Shopify Pro on a TEST subscription (dev store / reviewer).
  testSub: boolean;
}

export async function getPlanState(userId: string): Promise<PlanState> {
  const [connection, user, creditUsed] = await Promise.all([
    prisma.shopifyConnection.findFirst({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { extraCredits: true, lsSubscriptionStatus: true },
    }),
    prisma.spinUsage.count({ where: { userId, kind: "credit", counted: true } }),
  ]);
  const packCredits = Math.max(0, (user?.extraCredits ?? 0) - creditUsed);
  const shopifyPro = connection?.subscriptionStatus === "ACTIVE";
  const webPro = lsStatusIsActive(user?.lsSubscriptionStatus);
  const enforced = quotaEnforced();

  if (shopifyPro || webPro) {
    // Rolling 30-day window (beta simplification; close enough to the
    // invoice cycle and needs no extra API call per generation).
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const used = await prisma.spinUsage.count({
      where: { userId, kind: "included", counted: true, createdAt: { gte: since } },
    });
    return {
      plan: "pro",
      provider: shopifyPro ? "shopify" : "web",
      enforced,
      remaining: Math.max(0, proIncludedSpins() - used),
      packCredits,
      overagePriceUsd: overagePriceUsd(),
      // Test-mode subscriptions (dev stores, reviewers) get included spins
      // only: overage there bills fake money against our real COGS — a
      // drive-by tester burned 12 overage spins (~$8.50 real fal spend)
      // on a test sub 2026-07-28.
      canUseOverage:
        shopifyPro && Boolean(connection?.usageLineItemGid) && connection?.subscriptionTest !== true,
      testSub: shopifyPro && connection?.subscriptionTest === true,
    };
  }

  const used = await prisma.spinUsage.count({
    where: { userId, kind: "free", counted: true },
  });
  return {
    plan: "free",
    provider: null,
    enforced,
    remaining: Math.max(0, freeSpins() - used),
    packCredits,
    overagePriceUsd: overagePriceUsd(),
    canUseOverage: false,
    testSub: false,
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
  | { ok: true; kind: "free" | "included" | "overage" | "credit" | "unmetered" }
  | { ok: false; error: string };

// Reserve a credit for a generation run — call right before submitting to
// the provider; pair with refundSpinUsage() on terminal failure.
// Consumption order: plan allowance first, then overage (Shopify Pro),
// then purchased pack credits, then a plan-appropriate refusal.
export async function consumeSpinCredit(userId: string, spinId: string): Promise<ConsumeResult> {
  if (!quotaEnforced()) return { ok: true, kind: "unmetered" };

  const state = await getPlanState(userId);

  let kind: "free" | "included" | "overage" | "credit";
  if (state.plan === "pro") {
    if (state.remaining > 0) kind = "included";
    else if (state.canUseOverage) kind = "overage";
    else if (state.packCredits > 0) kind = "credit";
    else if (state.provider === "web") {
      return {
        ok: false,
        error: `You've used your ${proIncludedSpins()} included spins this month. Top up 5 extra spins from your Studio plan card to keep going.`,
      };
    } else if (state.testSub) {
      return {
        ok: false,
        error: `Test-mode subscriptions include ${proIncludedSpins()} spins per month. On a live store, extra spins bill automatically at $${overagePriceUsd()} each.`,
      };
    } else {
      return {
        ok: false,
        error: "Your plan can't take extra spins right now — reconnect your Shopify store from Studio and try again.",
      };
    }
  } else {
    if (state.remaining > 0) kind = "free";
    else if (state.packCredits > 0) kind = "credit";
    else {
      return {
        ok: false,
        error: `You've used your ${freeSpins()} free spins. Grab a 10-spin pack or go Pro from your Studio to keep going.`,
      };
    }
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
