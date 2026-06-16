import * as cheerio from "cheerio";

export interface WebsiteEnrichment {
  url: string;
  title?: string;
  description?: string;
  ogImage?: string;
  bodyText?: string;
  socialLinks?: string[];
  error?: string;
}

const FETCH_TIMEOUT_MS = 8000;
const MAX_BODY_CHARS = 2500;

function normalizeUrl(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProtocol);
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Firewebz/0.1; +https://firewebz.io)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function enrichFromWebsite(rawUrl?: string | null): Promise<WebsiteEnrichment | null> {
  const url = normalizeUrl(rawUrl ?? "");
  if (!url) return null;

  try {
    const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
    if (!res.ok) {
      return { url, error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").first().text().trim() ||
      undefined;

    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      undefined;

    const ogImage = $('meta[property="og:image"]').attr("content") || undefined;

    // Strip script/style/nav/footer noise, then grab the first chunk of visible body
    $("script, style, nav, header, footer, noscript, iframe, svg").remove();
    const rawBody = $("body").text().replace(/\s+/g, " ").trim();
    const bodyText = rawBody.slice(0, MAX_BODY_CHARS) || undefined;

    // Extract obvious social links
    const socialLinks = new Set<string>();
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (/instagram\.com|tiktok\.com|youtube\.com|facebook\.com/i.test(href)) {
        try {
          const abs = new URL(href, url).toString();
          socialLinks.add(abs);
        } catch {
          // skip
        }
      }
    });

    return {
      url,
      title: title?.slice(0, 200),
      description: description?.slice(0, 400),
      ogImage,
      bodyText,
      socialLinks: Array.from(socialLinks).slice(0, 6),
    };
  } catch (err) {
    return {
      url,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
