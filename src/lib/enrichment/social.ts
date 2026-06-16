import * as cheerio from "cheerio";

export interface SocialEnrichment {
  url: string;
  platform: "instagram" | "tiktok" | "unknown";
  handle?: string;
  bio?: string;
  followerCount?: string;
  error?: string;
}

const FETCH_TIMEOUT_MS = 8000;

function detectPlatform(url: string): SocialEnrichment["platform"] {
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/tiktok\.com/i.test(url)) return "tiktok";
  return "unknown";
}

function extractHandle(url: string): string | undefined {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0]?.startsWith("@")) return parts[0];
    if (parts[0]) return `@${parts[0]}`;
  } catch {
    // ignore
  }
  return undefined;
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        // Use a desktop browser UA so IG/TikTok return the meta-tag-rich landing page
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

// Instagram and TikTok aggressively block bot traffic. We try OG meta tags only —
// those are usually exposed even on the unauthenticated landing page. If blocked,
// the enrichment just returns the handle (still useful for the prompt).
export async function enrichFromSocial(rawUrl?: string | null): Promise<SocialEnrichment | null> {
  if (!rawUrl?.trim()) return null;
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const platform = detectPlatform(url);
  if (platform === "unknown") return null;

  const handle = extractHandle(url);

  try {
    const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
    if (!res.ok) {
      return { url, platform, handle, error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    const bio =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      undefined;

    // Try to read follower count from the OG description (varies by platform)
    let followerCount: string | undefined;
    const ogDesc = $('meta[property="og:description"]').attr("content") || "";
    const m = ogDesc.match(/([\d.]+[KMB]?)\s*(?:Followers|Posts|Likes)/i);
    if (m) followerCount = m[0];

    return {
      url,
      platform,
      handle,
      bio: bio?.slice(0, 400),
      followerCount,
    };
  } catch (err) {
    return {
      url,
      platform,
      handle,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
