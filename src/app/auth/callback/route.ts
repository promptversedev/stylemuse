import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { googleRedirectUri, OAUTH_NEXT_COOKIE, OAUTH_STATE_COOKIE } from "@/app/auth/google/route";

/**
 * Google sends people here — to StyleMuse, not to Supabase.
 *
 * This owns the whole Google leg, the way the Vastralook Studio does: the code
 * is exchanged with Google here, so the redirect URI registered in Google Cloud
 * is this domain, and Supabase's Google provider is never consulted. That
 * provider stays off; nothing in the Supabase dashboard has to be configured
 * for sign-in to work.
 *
 * Supabase still holds identity, because everything downstream depends on it —
 * `profiles.id` is a foreign key to `auth.users`, and every RLS policy on
 * favourites and selections is written against `auth.uid()`. So rather than
 * minting our own session and rewriting all of that, the service role creates
 * (or finds) the user and issues a genuine Supabase session for them. What the
 * browser ends up with is an ordinary Supabase session; only the way it was
 * obtained is ours.
 */
function fail(origin: string, code: string, description: string) {
  const url = new URL(`${origin}/auth/error`);
  url.searchParams.set("error_code", code);
  url.searchParams.set("error_description", description);
  return NextResponse.redirect(url.toString());
}

/**
 * The claims we need out of Google's ID token.
 *
 * Read without verifying the signature, which is safe only because of where it
 * came from: straight back from Google's own token endpoint over TLS, in
 * response to a code plus our client secret. It was never handled by a browser.
 */
function readIdToken(idToken: string): { email?: string; name?: string; picture?: string } {
  try {
    const [, payload] = idToken.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as { email?: string; name?: string; picture?: string };
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // Google reports a refused consent here rather than by not calling back.
  const googleError = searchParams.get("error");
  if (googleError) {
    return fail(
      origin,
      googleError,
      searchParams.get("error_description") ?? "Google declined the sign-in.",
    );
  }

  const code = searchParams.get("code");
  if (!code) return fail(origin, "missing_code", "Google did not return an authorization code.");

  // State and destination live in separate cookies rather than one packed
  // value. Packing them as "state:path" looked tidier and caused a real bug:
  // Next percent-encodes cookie values, so the delimiter came back as %3A and
  // every sign-in failed state_mismatch.
  const jar = await cookies();
  const expectedState = jar.get(OAUTH_STATE_COOKIE)?.value;
  const rawNext = jar.get(OAUTH_NEXT_COOKIE)?.value ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (!expectedState) {
    return fail(origin, "missing_state", "This sign-in did not start here, or it took too long.");
  }
  if (searchParams.get("state") !== expectedState) {
    return fail(
      origin,
      "state_mismatch",
      "This sign-in belongs to an older attempt. Start again from the StyleMuse home page.",
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return fail(origin, "config", "Google credentials are not set on this deployment.");
  }

  // ── 1. Code → ID token, with Google ──────────────────────────────────────
  let profile: { email?: string; name?: string; picture?: string };
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        // Google checks this matches what /authorize was given and that it is
        // registered — this is the URI that now lives in Google Cloud.
        redirect_uri: googleRedirectUri(origin),
        grant_type: "authorization_code",
      }),
    });
    const payload = (await tokenRes.json()) as {
      id_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!tokenRes.ok || !payload.id_token) {
      return fail(
        origin,
        payload.error ?? "token_exchange_failed",
        payload.error_description ?? "Google would not exchange the sign-in code.",
      );
    }
    profile = readIdToken(payload.id_token);
  } catch {
    return fail(origin, "google_unreachable", "Could not reach Google to complete the sign-in.");
  }

  const email = profile.email?.toLowerCase();
  if (!email) return fail(origin, "no_email", "Google did not share an email address.");

  // ── 2. Find or create the Supabase user ──────────────────────────────────
  const admin = createAdminClient();
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true, // Google has already proven the address
    user_metadata: {
      full_name: profile.name ?? null,
      name: profile.name ?? null,
      avatar_url: profile.picture ?? null,
    },
  });

  // A returning visitor is the normal case, not a failure — the address is
  // simply registered already.
  if (created.error && !/already|registered|exists/i.test(created.error.message)) {
    return fail(origin, "user_create_failed", created.error.message);
  }

  // ── 3. Issue a real Supabase session for them ────────────────────────────
  // `generateLink` mints a one-time token for this address; verifying it here,
  // server-side, is what sets the session cookies. Nothing is emailed, and the
  // token never leaves this request.
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash) {
    return fail(origin, "session_failed", link.error?.message ?? "Could not start a session.");
  }

  const supabase = await createClient();
  const verified = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
  if (verified.error) {
    return fail(origin, verified.error.code ?? "verify_failed", verified.error.message);
  }

  const done = NextResponse.redirect(`${origin}${next}`);
  done.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  done.cookies.set(OAUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
  return done;
}
