import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toJsonArray(value: string[] | undefined | null): string {
  return JSON.stringify(value ?? []);
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Turn a stored asset reference into a URL the browser can fetch.
 * Handles three cases:
 *  - data: URLs (Vercel mode: image bytes inlined in DB) — pass through
 *  - http(s): URLs (e.g. Runway CloudFront output) — pass through
 *  - relative file paths like "./storage/uploads/foo.jpg" — proxy via /api/files
 */
export function assetUrl(ref: string | null | undefined): string | null {
  if (!ref) return null;
  if (ref.startsWith("data:") || ref.startsWith("http://") || ref.startsWith("https://")) return ref;
  return `/api/files/${ref.replace(/^\.\//, "")}`;
}
