"use client";

// The embedded admin app: the core Spinr loop (products → create spin →
// push to product page) living inside the Shopify admin, Polaris-styled,
// authenticated per-request with App Bridge session tokens.

import { useCallback, useEffect, useRef, useState } from "react";
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
  ProgressBar,
  ResourceItem,
  ResourceList,
  Select,
  Spinner,
  Text,
  Thumbnail,
} from "@shopify/polaris";
import en from "@shopify/polaris/locales/en.json";

declare global {
  interface Window {
    shopify?: {
      idToken(): Promise<string>;
      toast?: { show(message: string, opts?: { isError?: boolean }): void };
    };
  }
}

// Native admin toast for successes (banner stays for errors). Falls back to
// nothing gracefully if App Bridge's toast API is unavailable.
function toast(message: string) {
  window.shopify?.toast?.show?.(message);
}

// Generation runs server-side, so progress is time-driven: an asymptotic
// curve anchored to the real submit time (same as the web app) — always
// moving, capped at 97% until the poll flips the row to ready.
function progressPct(startedAtMs: number | null): number {
  const t = Math.max(0, (Date.now() - (startedAtMs ?? Date.now())) / 1000);
  return Math.min(97, Math.round(97 * (1 - Math.exp(-t / 75))));
}
// "$29" stays whole, "$2.5" becomes "$2.50" — cents always show as cents.
function usd(v: string | number): string {
  const n = Number(v);
  return `$${n % 1 === 0 ? n : n.toFixed(2)}`;
}

function progressStage(pct: number): string {
  if (pct < 12) return "Reading the product photos…";
  if (pct < 50) return "Generating the 360° rotation…";
  if (pct < 85) return "Rendering studio lighting and textures…";
  return "Almost there — preparing the drag frames…";
}

// Theme-editor deep link that opens the product template WITH the Spinr
// block pre-added — one click instead of add-block instructions.
// addAppBlockId formats in the wild: {extension-uid}/{handle} (fails with
// "problem with the app block" for dev-dashboard uids) vs
// {api_key}/{handle} (the documented-working variant) — we use the latter.
// The api key is the public client id; block handle = liquid filename.
const APP_API_KEY = "d6a3575d86d37718e0456917cb60666e";
function themeBlockDeepLink(shop: string): string {
  return `https://${shop}/admin/themes/current/editor?template=product&addAppBlockId=${APP_API_KEY}/spinr-spin&target=mainSection`;
}

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
    spin: {
      id: string;
      status: string;
      pushed: boolean;
      error: string | null;
      startedAtMs: number | null;
    } | null;
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
  // Two-step inline confirm for Regenerate (it consumes a spin credit):
  // first click arms the row, second click fires.
  const [confirmRegen, setConfirmRegen] = useState<string | null>(null);
  
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

  const prevGeneratingRef = useRef<Map<string, string>>(new Map());
  const load = useCallback(async () => {
    try {
      const next: EmbeddedState = await api("/api/embedded/state");
      // Celebrate finishes: anything we saw generating that is now ready.
      const prev = prevGeneratingRef.current;
      for (const p of next.products) {
        if (p.spin?.status === "ready" && prev.has(p.spin.id)) {
          toast(`"${p.title}" spin is ready — push it to the page!`);
        }
      }
      prevGeneratingRef.current = new Map(
        next.products
          .filter((p) => p.spin?.status === "generating")
          .map((p) => [p.spin!.id, p.title]),
      );
      setState(next);
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

  // Poll while anything is generating, and tick twice a second so the
  // progress bars advance smoothly between polls.
  const anyGenerating = state?.products.some((p) => p.spin?.status === "generating") ?? false;
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!anyGenerating) return;
    const poll = setInterval(() => void load(), 8000);
    const tick = setInterval(() => setTick((t) => t + 1), 500);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [anyGenerating, load]);

  async function createSpin(gid: string, force = false) {
    setBusy((b) => ({ ...b, [gid]: true }));
    setNotice(null);
    setConfirmRegen(null);
    try {
      const res = await api("/api/embedded/spins", {
        method: "POST",
        body: JSON.stringify({ productGid: gid, force }),
      });
      if (res.payload?.blocked) setNotice(res.payload.blocked);
      else if (force) toast("Regenerating — the current spin stays live until the new one is ready.");
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
      toast("Pushed — the spin is live on the product page.");
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
      toast("Attached — push it to the page when it's ready.");
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
      toast("Subscription cancelled — you're back on the Free plan.");
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
                    ? `${state.plan.remaining} of ${state.plan.includedSpins} included spins left this cycle · extras ${usd(state.plan.overageUsd)}/spin on your Shopify invoice. Views are never metered.`
                    : `${state.plan.includedSpins} spins/month included, then ${usd(state.plan.overageUsd)}/spin — on your Shopify invoice. Views are never metered.`
                  : state.plan.enforced
                    ? `You have ${state.plan.remaining} free spins left. Pro: ${usd(state.plan.priceUsd)}/mo for ${state.plan.includedSpins} spins, then ${usd(state.plan.overageUsd)}/spin.`
                    : `Pro: ${usd(state.plan.priceUsd)}/mo for ${state.plan.includedSpins} spins a month, then ${usd(state.plan.overageUsd)}/spin. Billed through Shopify.`}
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
                      {spin?.status === "generating" && (
                        <BlockStack gap="100">
                          <div style={{ width: 260, maxWidth: "100%" }}>
                            <ProgressBar progress={progressPct(spin.startedAtMs)} size="small" />
                          </div>
                          <Text as="p" tone="subdued" variant="bodySm">
                            {progressStage(progressPct(spin.startedAtMs))} Usually 2–3 minutes —
                            feel free to keep working, this page updates itself.
                          </Text>
                        </BlockStack>
                      )}
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
                      {spin?.status === "ready" &&
                        (confirmRegen === p.gid ? (
                          <Button
                            onClick={() => void createSpin(p.gid, true)}
                            loading={isBusy}
                            tone="critical"
                            variant="secondary"
                          >
                            Uses 1 spin — confirm
                          </Button>
                        ) : (
                          <Button onClick={() => setConfirmRegen(p.gid)} disabled={isBusy} variant="secondary">
                            Regenerate
                          </Button>
                        ))}
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
                  Add it once to your product template — every pushed spin then shows
                  automatically on its product (even ones pushed before); products without a
                  spin are untouched.
                </Text>
                <Text as="p" tone="subdued" variant="bodySm">
                  If the button doesn&apos;t add it automatically: in the editor, click Add
                  block inside Product information, open the Apps tab, choose &quot;Spinr 360°
                  spin&quot;, then Save.
                </Text>
              </BlockStack>
              <Button
                variant="primary"
                onClick={() => window.open(themeBlockDeepLink(state.shop), "_top")}
              >
                Add the Spinr block
              </Button>
            </InlineStack>
            {/* NOTE (App Store req 5.1.1): never instruct merchants to paste
                code into their theme — the app block + deep link is the only
                setup path we may present. */}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
