import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { emptyFavourites, favouritesFor, findProfileByEmail, looksLikeEmail } from "@/lib/partner-favorites";

/**
 * GET /api/partner/favorites?email=<address>
 * Authorization: Bearer <VASTRALOOK_PARTNER_SECRET>
 *
 * A signed-in person's favourites, for a partner site that knows who they are.
 *
 * Unlike /api/picks and /api/embed/[token] this is NOT public, on purpose. Those
 * disclose a catalogue item the caller already holds an id or token for. This
 * answers "what has <this person> favourited", which is theirs, so two things
 * guard it:
 *
 *  - a shared secret, checked here, so only the partner's server can ask —
 *    there is no CORS header, and the secret never reaches a browser;
 *  - the partner supplies the email from its own verified Google session, not
 *    from anything a visitor typed.
 *
 * An unknown email is an ordinary answer (`found: false`), not an error: a
 * person who has never opened StyleMuse simply has no favourites yet.
 *
 * Wire the secret with `wrangler secret put VASTRALOOK_PARTNER_SECRET`. With it
 * unset the route answers 503, so nothing is exposed by default.
 */
export const dynamic = "force-dynamic";

/** Compares without stopping at the first difference, so timing says nothing. */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const secret = process.env.VASTRALOOK_PARTNER_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503, headers: NO_STORE });
  }

  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!given || !safeEqual(given, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const email = new URL(request.url).searchParams.get("email")?.trim() ?? "";
  if (!looksLikeEmail(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400, headers: NO_STORE });
  }

  const supabase = createAdminClient();
  const profile = await findProfileByEmail(supabase, email);
  if (!profile) {
    return NextResponse.json(
      { found: false, displayName: null, favorites: emptyFavourites() },
      { headers: NO_STORE },
    );
  }

  const favorites = await favouritesFor(supabase, profile.id);
  return NextResponse.json({ found: true, displayName: profile.displayName, favorites }, { headers: NO_STORE });
}
