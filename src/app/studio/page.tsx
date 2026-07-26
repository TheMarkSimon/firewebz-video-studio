import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { SpinCard } from "@/components/spin-card";
import { ShopifyConnectCard } from "@/components/shopify-connect-card";
import { WebPlanCard } from "@/components/web-plan-card";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SignInButton } from "@/components/auth-buttons";
import { freeSpins, overagePriceUsd, proIncludedSpins, proPriceUsd, quotaEnforced } from "@/lib/shopify";
import { getCycleUsage, getPlanState } from "@/lib/billing";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "My Studio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function StudioPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await getSessionUser();

  if (!user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="font-display text-[28px] font-bold text-fw-text">Your Studio</h1>
          <p className="mt-2 text-[15px] text-fw-darkGray">
            Sign in with Google to see your spins and create new ones.
          </p>
          <div className="mt-6 flex justify-center">
            <SignInButton label="Sign in with Google" />
          </div>
        </div>
      </AppShell>
    );
  }

  // App Store install resume: the install route parks the shop domain in a
  // cookie when the merchant had no Spinr session; now that they're signed
  // in, continue straight into the OAuth connect flow (which clears the
  // cookie on its redirect).
  const pendingShop = (await cookies()).get("spinr_pending_shop")?.value;
  if (pendingShop) {
    const existing = await prisma.shopifyConnection.findFirst({
      where: { userId: user.id, shop: pendingShop },
    });
    if (!existing) redirect(`/api/shopify/connect?shop=${encodeURIComponent(pendingShop)}`);
  }

  const sp = await searchParams;
  const [spins, shopifyConnection, cycleUsage, planState] = await Promise.all([
    prisma.spin.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.shopifyConnection.findFirst({ where: { userId: user.id } }),
    getCycleUsage(user.id),
    getPlanState(user.id),
  ]);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl pb-24 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[30px] font-bold text-fw-text md:text-[36px]">My Studio</h1>
            <p className="mt-1 text-[14px] text-fw-darkGray">
              {spins.length === 0
                ? "Your spins will live here."
                : `${spins.length} spin${spins.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <Button asChild className="h-11 px-6">
            <Link href="/onboarding">
              <Plus className="h-4 w-4" /> Create new spin
            </Link>
          </Button>
        </div>

        {/* Web billing (Lemon Squeezy) — packs + Pro for non-Shopify users.
            Hidden when the user already pays through Shopify. */}
        {shopifyConnection?.subscriptionStatus !== "ACTIVE" && quotaEnforced() && (
          <WebPlanCard
            plan={{
              plan: planState.plan,
              provider: planState.provider,
              enforced: planState.enforced,
              remaining: planState.remaining,
              packCredits: planState.packCredits,
              freeTotal: freeSpins(),
              includedSpins: proIncludedSpins(),
            }}
            purchaseNotice={sp.purchase === "success"}
          />
        )}

        <ShopifyConnectCard
          // SPINR_INSTALL_URL: dev-dashboard install link during beta; swap
          // to the App Store listing URL after approval (env change only).
          installUrl={process.env.SPINR_INSTALL_URL ?? null}
          connection={
            shopifyConnection
              ? { shop: shopifyConnection.shop, shopName: shopifyConnection.shopName }
              : null
          }
          notice={typeof sp.shopify === "string" ? sp.shopify : null}
          reason={typeof sp.reason === "string" ? sp.reason : null}
          billing={
            shopifyConnection
              ? {
                  status: shopifyConnection.subscriptionStatus,
                  test: shopifyConnection.subscriptionTest,
                  priceUsd: proPriceUsd(),
                  includedSpins: proIncludedSpins(),
                  overageUsd: overagePriceUsd(),
                  includedUsed: cycleUsage.includedUsed,
                  overageCount: cycleUsage.overageCount,
                  enforced: quotaEnforced(),
                  freeRemaining: planState.plan === "free" ? planState.remaining : 0,
                  freeTotal: freeSpins(),
                }
              : null
          }
          billingNotice={typeof sp.billing === "string" ? sp.billing : null}
        />

        {spins.length === 0 ? (
          <div className="mt-12 flex flex-col items-center rounded-3xl border-2 border-dashed border-fw-lighterGray py-20 text-center">
            <p className="text-[16px] font-semibold text-fw-text">No spins yet</p>
            <p className="mt-1 max-w-sm text-[13px] text-fw-darkGray">
              Upload a few product photos and get your first interactive 360° spin in about
              three minutes.
            </p>
            <Button asChild className="mt-6 h-11 px-6">
              <Link href="/onboarding">Create your first spin</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {spins.map((s) => (
              <SpinCard
                key={s.id}
                id={s.id}
                title={s.title}
                status={s.status}
                photoUrl={s.photoFrontUrl}
                createdAt={s.createdAt.toISOString()}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
