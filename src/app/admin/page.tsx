import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { freeSpins, overagePriceUsd, proPriceUsd } from "@/lib/shopify";
import { lsStatusIsActive, lsVariantIds } from "@/lib/lemonsqueezy";
import { grantCredits } from "./actions";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Founder-only ops dashboard (Phase 6, pulled forward): who registered,
// who subscribed/cancelled, what's being generated, and rough unit
// economics. Read-only by design — money actions (refunds, plan changes)
// belong in Shopify; this is the product-side view Shopify can't see.
//
// Access: emails in ADMIN_EMAILS (comma-separated env), defaulting to the
// founder's personal Gmail.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "marksimanduyev@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const EST_COGS_PER_SPIN = 0.71;

export default async function AdminPage() {
  const user = await getSessionUser();
  const dbUser = user
    ? await prisma.user.findUnique({ where: { id: user.id }, select: { email: true } })
    : null;
  const email = dbUser?.email?.toLowerCase();
  if (!user || !email || !ADMIN_EMAILS.includes(email)) {
    return (
      <AppShell user={user}>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="font-display text-[28px] font-bold text-fw-text">Not available</h1>
          <p className="mt-2 text-[15px] text-fw-darkGray">This area is for Spinr staff.</p>
        </div>
      </AppShell>
    );
  }

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [users, totalSpins, readySpins, failedSpins, spins7d, connections, billedOverages] =
    await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { spins: true } },
          shopifyConnections: { select: { shop: true, shopName: true, subscriptionStatus: true, subscriptionTest: true } },
          lsOrders: { select: { variantId: true, credits: true, createdAt: true } },
        },
      }),
      prisma.spin.count(),
      prisma.spin.count({ where: { status: "ready" } }),
      prisma.spin.count({ where: { status: "failed" } }),
      prisma.spin.count({ where: { createdAt: { gte: since7d } } }),
      prisma.shopifyConnection.count(),
      prisma.spinUsage.count({ where: { kind: "overage", counted: true, usageRecordGid: { not: null } } }),
    ]);

  const activeSubs = users.filter(
    (u) =>
      u.shopifyConnections.some((c) => c.subscriptionStatus === "ACTIVE") ||
      lsStatusIsActive(u.lsSubscriptionStatus),
  ).length;
  const mrr = activeSubs * parseFloat(proPriceUsd());
  const overageRevenue = billedOverages * parseFloat(overagePriceUsd());
  const estCogs = totalSpins * EST_COGS_PER_SPIN;

  // Per-user usage ledger, grouped once for the whole table.
  const usageRows = await prisma.spinUsage.groupBy({
    by: ["userId", "kind"],
    where: { counted: true },
    _count: { _all: true },
  });
  const usageByUser = new Map<string, Record<string, number>>();
  for (const r of usageRows) {
    const m = usageByUser.get(r.userId) ?? {};
    m[r.kind] = r._count._all;
    usageByUser.set(r.userId, m);
  }

  // One-time purchase pricing by LS variant (for paid totals).
  const variants = lsVariantIds();
  const priceForVariant = (variantId: string) =>
    variantId === variants.pack ? 39 : variantId === variants.topup ? 12.5 : 0;

  // EVERY spin ever created (founder call: complaints get investigated by
  // watching the actual video, which lives on fal.media). Fine unpaginated
  // at beta volume; add search/pagination when this table gets long.
  const allSpins = await prisma.spin.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      pushedToShopifyAt: true,
      videoUrl: true,
      durationMs: true,
      errorMessage: true,
      user: { select: { email: true } },
    },
  });

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl pb-24 pt-8">
        <h1 className="font-display text-[30px] font-bold text-fw-text">Admin</h1>
        <p className="mt-1 text-[13px] text-fw-darkGray">
          Product-side ops. Money actions (refunds, invoices, payouts) live in the Shopify
          Partner dashboard — this is everything Shopify can&apos;t see.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Users" value={String(users.length)} />
          <StatTile label="Active subscriptions" value={String(activeSubs)} sub={`≈ $${mrr.toFixed(0)} MRR${activeSubs > 0 ? "" : ""}`} />
          <StatTile label="Spins (total / 7d)" value={`${totalSpins} / ${spins7d}`} sub={`${readySpins} ready · ${failedSpins} failed`} />
          <StatTile
            label="Billed overages"
            value={`$${overageRevenue.toFixed(2)}`}
            sub={`est. COGS $${estCogs.toFixed(0)} (spins × $${EST_COGS_PER_SPIN})`}
          />
        </div>

        <h2 className="mt-12 text-[18px] font-bold text-fw-text">Users</h2>
        <div className="mt-2 rounded-2xl border border-fw-border bg-fw-disabled/40 px-4 py-3 text-[12px] leading-[19px] text-fw-darkGray">
          <span className="font-semibold text-fw-text">Support playbook:</span> money refunds
          happen at the source — Lemon Squeezy dashboard → Orders → Refund (web packs/subs),
          Shopify Partner dashboard for Shopify charges. After refunding a pack, claw the
          credits back here with a negative grant. Goodwill for a bad generation = grant a
          credit or two instead of refunding money.
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-fw-border bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-fw-border text-[11px] uppercase tracking-wider text-fw-lightGray">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">Billing</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Grant credits</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const conn = u.shopifyConnections[0];
                const shopifySub = conn?.subscriptionStatus;
                const webPro = lsStatusIsActive(u.lsSubscriptionStatus);
                const usage = usageByUser.get(u.id) ?? {};
                const usedTotal =
                  (usage.free ?? 0) + (usage.included ?? 0) + (usage.overage ?? 0) + (usage.credit ?? 0);
                const creditBalance = Math.max(0, u.extraCredits - (usage.credit ?? 0));
                const freeLeft = Math.max(0, freeSpins() - (usage.free ?? 0));
                const packsBought = u.lsOrders.filter((o) => o.variantId === variants.pack).length;
                const topupsBought = u.lsOrders.filter((o) => o.variantId === variants.topup).length;
                const webPaid = u.lsOrders.reduce((s, o) => s + priceForVariant(o.variantId), 0);
                const shopifyOveragePaid = (usage.overage ?? 0) * parseFloat(overagePriceUsd());
                return (
                  <tr key={u.id} className="border-b border-fw-border/60 last:border-0 align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-fw-text">{u.name ?? "—"}</div>
                      <div className="text-fw-darkGray">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 text-fw-darkGray">{u.createdAt.toISOString().slice(0, 10)}</td>
                    <td className="px-4 py-3 text-fw-darkGray">
                      <div className="font-semibold text-fw-text">
                        {usedTotal} used · {u._count.spins} spins
                      </div>
                      <div className="text-[12px]">
                        {freeLeft} free left · {creditBalance} credits
                        {(usage.included ?? 0) > 0 && ` · ${usage.included} included`}
                        {(usage.overage ?? 0) > 0 && ` · ${usage.overage} overage`}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {shopifySub === "ACTIVE" ? (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          Pro · Shopify{conn?.subscriptionTest ? " (test)" : ""}
                        </span>
                      ) : webPro ? (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          Pro · Web
                        </span>
                      ) : shopifySub === "CANCELLED" || u.lsSubscriptionStatus === "cancelled" ? (
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          Cancelled
                        </span>
                      ) : (
                        <span className="rounded-full bg-fw-disabled px-2.5 py-1 text-[11px] font-semibold text-fw-darkGray">
                          Free
                        </span>
                      )}
                      <div className="mt-1 text-[12px] text-fw-darkGray">
                        {webPaid > 0 &&
                          `web $${webPaid.toFixed(2)} (${packsBought > 0 ? `${packsBought} pack` : ""}${
                            packsBought > 0 && topupsBought > 0 ? ", " : ""
                          }${topupsBought > 0 ? `${topupsBought} top-up` : ""})`}
                        {webPaid > 0 && shopifyOveragePaid > 0 && " · "}
                        {shopifyOveragePaid > 0 && `overage $${shopifyOveragePaid.toFixed(2)}`}
                        {webPaid === 0 && shopifyOveragePaid === 0 && "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-fw-darkGray">
                      {conn ? (
                        <a
                          href={`https://${conn.shop}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-fw-text underline-offset-4 hover:underline"
                        >
                          {conn.shopName ?? conn.shop}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <form action={grantCredits} className="flex items-center gap-1.5">
                        <input type="hidden" name="userId" value={u.id} />
                        <input
                          type="number"
                          name="delta"
                          defaultValue={1}
                          min={-100}
                          max={100}
                          className="w-16 rounded-lg border border-fw-border px-2 py-1 text-[13px]"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-fw-black px-3 py-1.5 text-[12px] font-semibold text-white"
                        >
                          Grant
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h2 className="mt-12 text-[18px] font-bold text-fw-text">
          All spins <span className="text-[13px] font-normal text-fw-lightGray">({allSpins.length})</span>
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-fw-border bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-fw-border text-[11px] uppercase tracking-wider text-fw-lightGray">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Video</th>
                <th className="px-4 py-3">Pushed</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {allSpins.map((s) => (
                <tr key={s.id} className="border-b border-fw-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <a className="font-semibold text-fw-text underline-offset-4 hover:underline" href={`/embed/${s.id}`} target="_blank" rel="noreferrer">
                      {s.title}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-fw-darkGray">{s.user.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-fw-darkGray">{s.status}</span>
                    {s.status === "failed" && s.errorMessage && (
                      <div className="mt-1 max-w-[260px] truncate text-[11px] text-destructive" title={s.errorMessage}>
                        {s.errorMessage}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.videoUrl ? (
                      // Raw MP4 on fal.media — the source of truth when a
                      // merchant complains about quality.
                      <a
                        className="font-semibold text-fw-text underline-offset-4 hover:underline"
                        href={s.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        MP4{s.durationMs ? ` (${Math.round(s.durationMs / 1000)}s gen)` : ""}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-fw-darkGray">{s.pushedToShopifyAt ? "✓" : "—"}</td>
                  <td className="px-4 py-3 text-fw-darkGray">{s.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-fw-border bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-fw-lightGray">{label}</p>
      <p className="mt-2 font-display text-[28px] font-bold text-fw-text">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-fw-darkGray">{sub}</p>}
    </div>
  );
}
