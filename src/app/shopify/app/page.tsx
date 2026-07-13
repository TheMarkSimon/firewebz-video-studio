"use client";

// The embedded admin app: the core Spinr loop (products → create spin →
// push to product page) living inside the Shopify admin, Polaris-styled,
// authenticated per-request with App Bridge session tokens.

import { useCallback, useEffect, useState } from "react";
import {
  AppProvider,
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  InlineStack,
  Page,
  ResourceItem,
  ResourceList,
  Spinner,
  Text,
  Thumbnail,
} from "@shopify/polaris";
import en from "@shopify/polaris/locales/en.json";

declare global {
  interface Window {
    shopify?: { idToken(): Promise<string> };
  }
}

interface EmbeddedState {
  shop: string;
  shopName: string;
  origin: string | null;
  plan: {
    name: "free" | "pro";
    test: boolean;
    enforced: boolean;
    remaining: number;
    priceUsd: string;
    includedSpins: number;
    overageUsd: string;
  };
  products: Array<{
    gid: string;
    title: string;
    handle: string;
    imageUrl: string | null;
    photoCount: number;
    spin: { id: string; status: string; pushed: boolean; error: string | null } | null;
  }>;
}

export default function EmbeddedAppPage() {
  return (
    <AppProvider i18n={en}>
      <EmbeddedApp />
    </AppProvider>
  );
}

function EmbeddedApp() {
  const [state, setState] = useState<EmbeddedState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const token = await window.shopify!.idToken();
    const res = await fetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
    return json;
  }, []);

  const load = useCallback(async () => {
    try {
      setState(await api("/api/embedded/state"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your store.");
    }
  }, [api]);

  // Boot once App Bridge is ready (its script loads from Shopify's CDN).
  useEffect(() => {
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const boot = () => {
      if (window.shopify?.idToken) void load();
      else if (tries++ < 60) timer = setTimeout(boot, 100);
      else setError("Shopify couldn't initialize the app — reload this page.");
    };
    boot();
    return () => clearTimeout(timer);
  }, [load]);

  // Poll while anything is generating.
  const anyGenerating = state?.products.some((p) => p.spin?.status === "generating") ?? false;
  useEffect(() => {
    if (!anyGenerating) return;
    const id = setInterval(() => void load(), 8000);
    return () => clearInterval(id);
  }, [anyGenerating, load]);

  async function createSpin(gid: string) {
    setBusy((b) => ({ ...b, [gid]: true }));
    setNotice(null);
    try {
      const res = await api("/api/embedded/spins", {
        method: "POST",
        body: JSON.stringify({ productGid: gid }),
      });
      if (res.payload?.blocked) setNotice(res.payload.blocked);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Couldn't create the spin.");
    } finally {
      setBusy((b) => ({ ...b, [gid]: false }));
      void load();
    }
  }

  async function push(spinId: string, gid: string) {
    setBusy((b) => ({ ...b, [gid]: true }));
    setNotice(null);
    try {
      await api("/api/embedded/push", { method: "POST", body: JSON.stringify({ spinId }) });
      setNotice("Pushed — the spin is linked to the product. Add the Spinr block to your theme once and it appears on the page.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Push failed.");
    } finally {
      setBusy((b) => ({ ...b, [gid]: false }));
      void load();
    }
  }

  async function upgrade() {
    setNotice(null);
    try {
      const res = await api("/api/embedded/billing", { method: "POST", body: JSON.stringify({}) });
      if (res.confirmationUrl) window.open(res.confirmationUrl, "_top");
      else setNotice(res.error ?? "Couldn't start the upgrade.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Couldn't start the upgrade.");
    }
  }

  async function cancelPlan() {
    setNotice(null);
    try {
      await api("/api/embedded/billing", { method: "POST", body: JSON.stringify({ action: "cancel" }) });
      setNotice("Subscription cancelled — you're back on the Free plan.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Couldn't cancel.");
    } finally {
      void load();
    }
  }

  if (error) {
    return (
      <Page title="Spinr">
        <Banner tone="critical" title="Something went wrong">
          <p>{error}</p>
        </Banner>
      </Page>
    );
  }

  if (!state) {
    return (
      <Page title="Spinr">
        <InlineStack align="center">
          <Spinner accessibilityLabel="Loading" size="large" />
        </InlineStack>
      </Page>
    );
  }

  const pro = state.plan.name === "pro";

  return (
    <Page
      title="Spinr — 360° spins"
      subtitle={`${state.shopName} · pick a product, get a draggable 360° spin from its existing photos`}
    >
      <BlockStack gap="400">
        {notice && (
          <Banner onDismiss={() => setNotice(null)}>
            <p>{notice}</p>
          </Banner>
        )}

        <Card>
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <InlineStack gap="200" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  {pro ? "Spinr Pro" : "Free plan"}
                </Text>
                {pro && state.plan.test && <Badge tone="info">Test mode</Badge>}
              </InlineStack>
              <Text as="p" tone="subdued" variant="bodySm">
                {pro
                  ? state.plan.enforced
                    ? `${state.plan.remaining} of ${state.plan.includedSpins} included spins left this cycle · extras $${state.plan.overageUsd}/spin on your Shopify invoice. Views are never metered.`
                    : `${state.plan.includedSpins} spins/month included, then $${state.plan.overageUsd}/spin — on your Shopify invoice. Views are never metered.`
                  : state.plan.enforced
                    ? `You have ${state.plan.remaining} free spins left. Pro: $${state.plan.priceUsd}/mo for ${state.plan.includedSpins} spins, then $${state.plan.overageUsd}/spin.`
                    : `Pro: $${state.plan.priceUsd}/mo for ${state.plan.includedSpins} spins a month, then $${state.plan.overageUsd}/spin. Billed through Shopify.`}
              </Text>
            </BlockStack>
            {pro ? (
              <Button onClick={() => void cancelPlan()}>Cancel plan</Button>
            ) : (
              <Button variant="primary" onClick={() => void upgrade()}>
                Upgrade to Pro
              </Button>
            )}
          </InlineStack>
        </Card>

        <Card padding="0">
          <ResourceList
            resourceName={{ singular: "product", plural: "products" }}
            items={state.products}
            renderItem={(p) => {
              const spin = p.spin;
              const isBusy = Boolean(busy[p.gid]);
              return (
                <ResourceItem
                  id={p.gid}
                  onClick={() => {}}
                  media={
                    <Thumbnail
                      source={p.imageUrl ?? ""}
                      alt={p.title}
                      size="medium"
                    />
                  }
                  accessibilityLabel={p.title}
                >
                  <InlineStack align="space-between" blockAlign="center" wrap={false}>
                    <BlockStack gap="050">
                      <Text as="h3" variant="bodyMd" fontWeight="semibold">
                        {p.title}
                      </Text>
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="span" tone="subdued" variant="bodySm">
                          {p.photoCount} photo{p.photoCount === 1 ? "" : "s"}
                        </Text>
                        {spin?.status === "generating" && <Badge tone="attention">Generating…</Badge>}
                        {spin?.status === "ready" && <Badge tone="success">Spin ready</Badge>}
                        {spin?.status === "failed" && <Badge tone="critical">Failed</Badge>}
                        {spin?.pushed && <Badge>On product page</Badge>}
                      </InlineStack>
                      {spin?.status === "failed" && spin.error && (
                        <Text as="p" tone="critical" variant="bodySm">
                          {spin.error.slice(0, 140)}
                        </Text>
                      )}
                    </BlockStack>
                    <InlineStack gap="200">
                      {spin?.status === "ready" && state.origin && (
                        <Button url={`${state.origin}/embed/${spin.id}`} external variant="plain">
                          View spin
                        </Button>
                      )}
                      {!spin && (
                        <Button
                          onClick={() => void createSpin(p.gid)}
                          loading={isBusy}
                          disabled={p.photoCount === 0}
                          variant="primary"
                        >
                          Create spin
                        </Button>
                      )}
                      {spin?.status === "failed" && (
                        <Button onClick={() => void createSpin(p.gid)} loading={isBusy}>
                          Try again
                        </Button>
                      )}
                      {spin?.status === "ready" && !spin.pushed && (
                        <Button onClick={() => void push(spin.id, p.gid)} loading={isBusy} variant="primary">
                          Push to page
                        </Button>
                      )}
                    </InlineStack>
                  </InlineStack>
                </ResourceItem>
              );
            }}
          />
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingSm">
              One-time theme setup
            </Text>
            <Text as="p" tone="subdued" variant="bodySm">
              Pushed spins attach to products via the custom.spinr_id metafield. In your theme
              editor, add a Custom Liquid block to the product template with the snippet from
              your Spinr studio — once, for the whole catalog. Products without a spin are
              untouched.
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
