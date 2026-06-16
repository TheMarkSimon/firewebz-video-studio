// Lightweight in-memory store for onboarding session data.
// Used as a workaround for Vercel's per-function-instance SQLite reset:
// onboarding submit stashes the business + product image here under a session ID,
// /create reads from it. Lives only as long as the function instance stays warm
// (usually 5-15 min). Demo-grade; replace with a real KV or DB later.

export interface SessionData {
  businessName: string;
  category: string;
  brandTone: string[];
  websiteUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  // Product image stored as data URL so it's portable across function calls
  productImageDataUrl?: string;
  createdAt: number;
}

const TTL_MS = 30 * 60 * 1000; // 30 min — beyond a function's typical warm life

declare global {
  // eslint-disable-next-line no-var
  var __firewebzSessions: Map<string, SessionData> | undefined;
}

const store: Map<string, SessionData> =
  globalThis.__firewebzSessions ?? (globalThis.__firewebzSessions = new Map());

export function putSession(data: SessionData): string {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  store.set(id, { ...data, createdAt: Date.now() });
  // Best-effort GC
  for (const [k, v] of store.entries()) {
    if (Date.now() - v.createdAt > TTL_MS) store.delete(k);
  }
  return id;
}

export function getSession(id: string): SessionData | null {
  const s = store.get(id);
  if (!s) return null;
  if (Date.now() - s.createdAt > TTL_MS) {
    store.delete(id);
    return null;
  }
  return s;
}
