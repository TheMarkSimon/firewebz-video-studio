// Smoke tests: hit the running app's critical surfaces and assert they
// respond correctly. No auth, no paid calls — safe against any environment.
//
//   npm run build && npx next start -p 3100 &   # or any running instance
//   SMOKE_BASE_URL=http://localhost:3100 npm run smoke
//
// Defaults to http://localhost:3100. Point SMOKE_BASE_URL at production for
// a post-deploy check.

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3100";

const CHECKS = [
  { name: "homepage renders", path: "/", status: 200, bodyIncludes: "Spinr" },
  { name: "pricing on homepage", path: "/", status: 200, bodyIncludes: "Views are always free" },
  { name: "embed script serves", path: "/embed/spin.js", status: 200, bodyIncludes: "data-spinr" },
  { name: "embed page handles unknown spin", path: "/embed/does-not-exist", status: 200, bodyIncludes: "Spin not found" },
  { name: "onboarding is public (value-first)", path: "/onboarding", status: 200, bodyIncludes: "Upload your product photos" },
  { name: "studio shows sign-in wall when anonymous", path: "/studio", status: 200, bodyIncludes: "Sign in" },
  { name: "proxy refuses non-allowlisted hosts", path: "/api/proxy?url=" + encodeURIComponent("https://evil.example.com/x.png"), status: 403 },
  { name: "proxy requires url param", path: "/api/proxy", status: 400 },
  { name: "fal webhook refuses unauthenticated calls", path: "/api/webhooks/fal", method: "POST", body: "{}", status: [401, 503] },
  { name: "shopify connect requires auth (redirects)", path: "/api/shopify/connect?shop=x.myshopify.com", status: [302, 303, 307, 308], redirect: "manual" },
  { name: "sitemap", path: "/sitemap.xml", status: 200 },
  { name: "robots", path: "/robots.txt", status: 200 },
];

let failed = 0;
for (const c of CHECKS) {
  const url = BASE + c.path;
  try {
    const res = await fetch(url, {
      method: c.method ?? "GET",
      body: c.body,
      headers: c.body ? { "content-type": "application/json" } : undefined,
      redirect: c.redirect ?? "follow",
    });
    const wanted = Array.isArray(c.status) ? c.status : [c.status];
    let ok = wanted.includes(res.status);
    let detail = `status ${res.status}`;
    if (ok && c.bodyIncludes) {
      const text = await res.text();
      ok = text.includes(c.bodyIncludes);
      if (!ok) detail = `body missing "${c.bodyIncludes}"`;
    }
    console.log(`${ok ? "✅" : "❌"} ${c.name} (${detail})`);
    if (!ok) failed++;
  } catch (err) {
    console.log(`❌ ${c.name} (fetch failed: ${err.message})`);
    failed++;
  }
}

console.log(failed === 0 ? `\nAll ${CHECKS.length} smoke checks passed against ${BASE}` : `\n${failed}/${CHECKS.length} FAILED against ${BASE}`);
process.exit(failed === 0 ? 0 : 1);
