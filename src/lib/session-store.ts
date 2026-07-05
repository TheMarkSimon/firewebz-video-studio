// Session store with two backends:
//   - Upstash Redis (production, via env vars set by Vercel's KV/Redis integration)
//   - In-memory Map (local dev, when no Redis env is set)
//
// Stores onboarding data (business info + product image as data URL) under a
// session ID, used to bridge the onboarding submit → /create transition without
// requiring a full database.

export interface SessionData {
  businessName: string;
  category: string;
  brandTone: string[];
  videoStyle?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  productImageDataUrl?: string;
  // 3D pivot: four angle photos (all data URLs), background-removed by the client
  productPhotos?: {
    front?: string;
    back?: string;
    left?: string;
    right?: string;
  };
  createdAt: number;
}

const TTL_SECONDS = 30 * 60; // 30 min

declare global {
  // eslint-disable-next-line no-var
  var __spinrSessions: Map<string, SessionData> | undefined;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function redisConfigured(): boolean {
  // Vercel's KV integration injects these env names; Upstash standalone uses the same names.
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function getRedisClient() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
}

function getMemoryStore(): Map<string, SessionData> {
  return globalThis.__spinrSessions ?? (globalThis.__spinrSessions = new Map());
}

export async function putSession(data: Omit<SessionData, "createdAt">): Promise<string> {
  const id = generateId();
  const payload: SessionData = { ...data, createdAt: Date.now() };

  if (redisConfigured()) {
    try {
      const redis = await getRedisClient();
      // Upstash's REST client rejects payloads over ~1 MB. Anything close to
      // that is almost certainly a data URL leak — surface it loudly instead
      // of silently falling through to in-memory (which won't persist across
      // Vercel function invocations and shows up as "Session not found").
      const size = JSON.stringify(payload).length;
      if (size > 800_000) {
        console.error(`[session-store] payload too large for Redis: ${size} bytes — refusing to fall back to memory`);
        throw new Error(`Session payload too large (${size} bytes). This usually means a photo was stored as a data URL instead of a fal.media URL.`);
      }
      await redis.set(`fw:session:${id}`, payload, { ex: TTL_SECONDS });
      return id;
    } catch (err) {
      console.error("[session-store] Redis set failed, falling back to memory:", err);
    }
  }

  const store = getMemoryStore();
  store.set(id, payload);
  // Best-effort GC of expired entries
  for (const [k, v] of store.entries()) {
    if (Date.now() - v.createdAt > TTL_SECONDS * 1000) store.delete(k);
  }
  return id;
}

export async function getSession(id: string): Promise<SessionData | null> {
  if (redisConfigured()) {
    try {
      const redis = await getRedisClient();
      const data = (await redis.get(`fw:session:${id}`)) as SessionData | null;
      if (data) return data;
      // Fall through to memory if not in Redis (e.g. local-written then deployed read)
    } catch (err) {
      console.error("[session-store] Redis get failed, falling back to memory:", err);
    }
  }

  const store = getMemoryStore();
  const s = store.get(id);
  if (!s) return null;
  if (Date.now() - s.createdAt > TTL_SECONDS * 1000) {
    store.delete(id);
    return null;
  }
  return s;
}
