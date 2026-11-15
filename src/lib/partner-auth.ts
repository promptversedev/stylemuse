import { NextResponse } from "next/server";

/**
 * The shared-secret check for the partner routes (the secret is VASTRALOOK_PARTNER_SECRET, the same one /api/partner/favorites uses).
 * Returns a response to send straight back when the caller must not continue, or null when it may.
 *
 * With the secret unset the route answers 503, so nothing is exposed by default. There is no CORS header on a partner route:
 * it is for the partner's server only, and the secret never reaches a browser.
 */
const NO_STORE = { "Cache-Control": "no-store" };

/** Compares without stopping at the first difference, so timing says nothing. */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function partnerGate(request: Request): NextResponse | null {
  const secret = process.env.VASTRALOOK_PARTNER_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503, headers: NO_STORE });
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!given || !safeEqual(given, secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  return null;
}
