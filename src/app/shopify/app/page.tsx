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
  CalloutCard,
  Card,
  InlineStack,
  Page,
  ResourceItem,
  ResourceList,
  Select,
  Spinner,
  Text,
  TextField,
  Thumbnail,
} from "@shopify/polaris";
import en from "@shopify/polaris/locales/en.json";

declare global {
  interface Window {
    shopify?: { idToken(): Promise<string> };
  }
}

// Theme-editor deep link that opens the product template WITH the Spinr
// block pre-added — one click instead of add-block instructions. The uid is
// the theme extension's public id from extensions/spinr-spin/*.toml.
const THEME_EXTENSION_UID = "d27183c7-3cf6-0f9c-5b6c-e5c140e93c47d90e8462";
function themeBlockDeepLink(shop: string): string {
  return `https://${shop}/admin/themes/current/editor?template=product&addAppBlockId=${THEME_EXTENSION_UID}/spinr-spin&target=mainSection`;
}

// Manual fallback for older themes without app-block support — same markup
// the theme extension renders.
const MANUAL_SNIPPET = `{% if product.metafields.custom.spinr_id != blank %}
  <div data-spinr="{{ product.metafields.custom.spinr_id }}" style="height:520px;max-width:640px;margin:0 auto"></div>
  <script src="https://thespinr.com/embed/spin.js" defer></script>
{% endif %}`;

interface EmbeddedState {
  shop: string;
  shopName: string;
  origin: string | null;
  unlinkedSpins: Array<{ id: string; title: string; status: string }>;
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
  const [attachTarget, setAttachTarget] = useState<Record<string, string>>({});
  const [showSnippet, setShowSnippet] = useState(false);

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
      setNotice(
        "Pushed — the spin is linked to the product. If you haven't added the Spinr block to your theme yet, use the one-click setup at the bottom of this page (once, for the whole catalog).",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Push failed.");
    } finally {
      setBusy((b) => ({ ...b, [gid]: false }));
      void load();
    }
  }

  async function attach(spinId: string) {
    const productGid = attachTarget[spinId];
    if (!productGid) return;
    setBusy((b) => ({ ...b, [spinId]: true }));
    setNotice(null);
    try {
      await api("/api/embedded/attach", {
        method: "POST",
        body: JSON.stringify({ spinId, productGid }),
      });
      setNotice("Attached — the spin now belongs to that product. Push it to the page when it's ready.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Attach failed.");
    } finally {
      setBusy((b) => ({ ...b, [spinId]: false }));
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
  const anySpins = state.products.some((p) => p.spin);
  // Spins first (working > ready > failed), then products with photos, then
  // the un-photographed stragglers.
  const rank = (p: EmbeddedState["products"][number]) =>
    p.spin?.status === "generating" ? 0 : p.spin?.status === "ready" ? 1 : p.spin ? 2 : p.photoCount > 0 ? 3 : 4;
  const products = [...state.products].sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));

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

        {!anySpins && (
          <CalloutCard
            title="Turn your first product into a 360° spin"
            illustration={`${state.origin ?? ""}/brand/spinr-mark-green.png`}
            primaryAction={{
              content: "Learn how it works",
              url: state.origin ?? "https://thespinr.com",
              external: true,
            }}
          >
            <p>
              Pick any product below and press Create spin. We use the photos already on the
              product — no new photography. About three minutes later it&apos;s ready to push
              onto the product page.
            </p>
          </CalloutCard>
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
            items={products}
            renderItem={(p) => {
              const spin = p.spin;
              const isBusy = Boolean(busy[p.gid]);
              return (
                <ResourceItem
                  id={p.gid}
                  onClick={() => {}}
                  media={
                    <Thumbnail
                      source={
                        p.imageUrl ??
                        // neutral placeholder for photo-less products
                        "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='8' fill='%23f1f1f3'/%3E%3Ctext x='40' y='46' text-anchor='middle' font-size='11' fill='%238a8a8f' font-family='sans-serif'%3ENo photo%3C/text%3E%3C/svg%3E"
                      }
                      alt={p.title}
                      size="large"
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

        {state.unlinkedSpins.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <BlockStack gap="100">
                <Text as="h2" variant="headingSm">
                  Spins from your Spinr studio
                </Text>
                <Text as="p" tone="subdued" variant="bodySm">
                  Created on thespinr.com from uploaded photos — attach one to a product to
                  push it onto that product&apos;s page.
                </Text>
              </BlockStack>
              {state.unlinkedSpins.map((s) => {
                const options = state.products
                  .filter((p) => !p.spin)
                  .map((p) => ({ label: p.title, value: p.gid }));
                return (
                  <InlineStack key={s.id} align="space-between" blockAlign="center" wrap={false}>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {s.title}
                      </Text>
                      {s.status === "ready" ? (
                        <Badge tone="success">Ready</Badge>
                      ) : (
                        <Badge>{s.status}</Badge>
                      )}
                    </InlineStack>
                    <InlineStack gap="200" blockAlign="center">
                      <Select
                        label="Product"
                        labelHidden
                        placeholder="Choose a product"
                        options={options}
                        value={attachTarget[s.id] ?? ""}
                        onChange={(v) => setAttachTarget((t) => ({ ...t, [s.id]: v }))}
                      />
                      <Button
                        onClick={() => void attach(s.id)}
                        loading={Boolean(busy[s.id])}
                        disabled={!attachTarget[s.id]}
                      >
                        Attach
                      </Button>
                    </InlineStack>
                  </InlineStack>
                );
              })}
            </BlockStack>
          </Card>
        )}

        <Card>
          <BlockStack gap="200">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <Text as="h2" variant="headingSm">
                  One-time theme setup
                </Text>
                <Text as="p" tone="subdued" variant="bodySm">
                  Pushed spins appear on product pages through the Spinr block in your theme.
                  Add it once — every pushed spin shows automatically (even ones pushed before),
                  and products without a spin are untouched.
                </Text>
              </BlockStack>
              <Button
                variant="primary"
                onClick={() => window.open(themeBlockDeepLink(state.shop), "_top")}
              >
                Add the Spinr block
              </Button>
            </InlineStack>
            <Button variant="plain" onClick={() => setShowSnippet((v) => !v)}>
              {showSnippet ? "Hide manual setup" : "Using an older theme? Manual setup"}
            </Button>
            {showSnippet && (
              <BlockStack gap="200">
                <Text as="p" tone="subdued" variant="bodySm">
                  If your theme doesn&apos;t support app blocks: in the theme editor, add a
                  &quot;Custom Liquid&quot; block to your product template and paste this.
                  Same result — pushed spins appear automatically.
                </Text>
                <TextField
                  label="Manual snippet"
                  labelHidden
                  value={MANUAL_SNIPPET}
                  multiline={4}
                  readOnly
                  autoComplete="off"
                  helpText="Click into the box, select all, copy."
                />
              </BlockStack>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
