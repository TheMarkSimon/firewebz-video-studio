import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ProductImportCard } from "@/components/product-import-card";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchProducts, type ShopifyProduct } from "@/lib/shopify";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Your Shopify products",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Catalog import: the merchant's products, straight from the connected
// store — creating a spin becomes "pick a product", zero uploading.
export default async function ProductsPage() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="font-display text-[28px] font-bold text-fw-text">Sign in to continue</h1>
          <p className="mt-2 text-[15px] text-fw-darkGray">Your Shopify products live behind your account.</p>
        </div>
      </AppShell>
    );
  }

  const connection = await prisma.shopifyConnection.findFirst({ where: { userId: user.id } });
  if (!connection) {
    return (
      <AppShell user={user}>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="font-display text-[28px] font-bold text-fw-text">No store connected</h1>
          <p className="mt-2 text-[15px] text-fw-darkGray">Connect your Shopify store first — it takes one click.</p>
          <Button asChild className="mt-6 h-11 px-6">
            <Link href="/studio">Back to Studio</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  let products: ShopifyProduct[] = [];
  let loadError: string | null = null;
  try {
    products = await fetchProducts(connection.shop, connection.accessToken, 50);
  } catch (err) {
    console.error("[studio/products] fetch failed:", err);
    // Most common real-world cause: app uninstalled on Shopify → token dead.
    loadError =
      "Couldn't load your products. If you uninstalled the Spinr app on Shopify, disconnect and reconnect the store from your Studio.";
  }

  // Existing spins per product, so re-imports resume instead of duplicating.
  const linkedSpins = await prisma.spin.findMany({
    where: { userId: user.id, shopifyProductGid: { not: null } },
    select: { id: true, shopifyProductGid: true, status: true, pushedToShopifyAt: true },
  });
  const spinByGid = new Map(linkedSpins.map((s) => [s.shopifyProductGid as string, s]));

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl pb-24 pt-8">
        <Link
          href="/studio"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fw-darkGray hover:text-fw-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Studio
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[30px] font-bold text-fw-text md:text-[36px]">
              Your products
            </h1>
            <p className="mt-1 text-[14px] text-fw-darkGray">
              From <strong className="text-fw-text">{connection.shopName ?? connection.shop}</strong> — pick one and
              we&apos;ll build its 360° spin from the photos already on it.
            </p>
          </div>
        </div>

        {loadError ? (
          <div className="mt-8 rounded-2xl bg-destructive/10 px-5 py-4 text-[14px] text-destructive">{loadError}</div>
        ) : products.length === 0 ? (
          <div className="mt-12 flex flex-col items-center rounded-3xl border-2 border-dashed border-fw-lighterGray py-20 text-center">
            <p className="text-[16px] font-semibold text-fw-text">No products found</p>
            <p className="mt-1 max-w-sm text-[13px] text-fw-darkGray">
              Add products (with photos) to your Shopify store and they&apos;ll show up here.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const spin = spinByGid.get(p.gid);
              return (
                <ProductImportCard
                  key={p.gid}
                  gid={p.gid}
                  title={p.title}
                  imageUrl={p.imageUrls[0] ?? null}
                  photoCount={p.imageUrls.length}
                  spin={spin ? { id: spin.id, status: spin.status, pushed: Boolean(spin.pushedToShopifyAt) } : null}
                />
              );
            })}
          </div>
        )}

        {products.length === 50 && (
          <p className="mt-6 text-[12px] text-fw-lightGray">
            Showing your first 50 products. Bulk import for large catalogs is on the roadmap.
          </p>
        )}
      </div>
    </AppShell>
  );
}
