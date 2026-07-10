// Guaranteed sign-out. NextAuth's signOut only deletes the cookie variant
// it is configured for — but browsers that signed in BEFORE the
// Domain=.thespinr.com change still hold a stale host-only session cookie
// with the same name, which silently signs the user right back in
// ("logout does nothing"). signOut() redirects here, and we expire EVERY
// variant: both cookie names × host-only and domain-wide.

import { NextRequest, NextResponse } from "next/server";
import { sessionCookieDomain } from "@/lib/auth";
import { getAppOrigin } from "@/lib/app-origin";

export const dynamic = "force-dynamic";

const COOKIE_NAMES = ["__Secure-next-auth.session-token", "next-auth.session-token"];

export async function GET(req: NextRequest) {
  const origin = getAppOrigin() ?? req.nextUrl.origin;
  const res = NextResponse.redirect(new URL("/", origin));

  const expire = "Path=/; Max-Age=0; HttpOnly; SameSite=Lax";
  const secure = origin.startsWith("https://") ? "; Secure" : "";
  const domain = sessionCookieDomain();

  for (const name of COOKIE_NAMES) {
    // NextResponse.cookies dedupes by name, so append raw headers — we need
    // BOTH variants of the same cookie name expired in one response.
    res.headers.append("Set-Cookie", `${name}=; ${expire}${secure}`);
    if (domain) {
      res.headers.append("Set-Cookie", `${name}=; ${expire}${secure}; Domain=${domain}`);
    }
  }
  return res;
}
