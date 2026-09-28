import { NextResponse } from "next/server";

/**
 * Start Google sign-in, with StyleMuse as the redirect target.
 *
 * The default Supabase flow sends people to `{project}.supabase.co/authorize`,
 * which means Google's registered redirect URI has to be Supabase's callback.
 * Running the OAuth here instead makes the redirect URI **this** app's
 * `/auth/callback` — Google never talks to Supabase at all. Supabase is still
 * what issues the session, from the ID token Google returns, so RLS,
 * `auth.uid()`, favourites and selections all keep working unchanged.
 */

/** Where Google sends people back. Must match Google Cloud exactly. */
export function googleRedirectUri(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/auth/callback`;
}

/**
 * Two cookies, not one packed value.
 *
 * These were briefly a single "state:path" cookie, which broke every sign-in:
 * Next percent-encodes cookie values, so the delimiter arrived as %3A and the
 * state never matched. Separate cookies have nothing to parse. (The Vastralook
 * Studio splits them the same way, and never had the bug.)
 */
export const OAUTH_STATE_COOKIE = "stylemuse_oauth_state";
export const OAUTH_NEXT_COOKIE = "stylemuse_oauth_next";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(
      `${url.origin}/auth/error?error_code=config&error_description=` +
        encodeURIComponent("GOOGLE_CLIENT_ID is not set on this deployment."),
    );
  }

  // Where to land afterwards. Kept relative so this cannot be turned into an
  // open redirect by a crafted ?next=https://elsewhere.
  const rawNext = url.searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const state = crypto.randomUUID();

  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", googleRedirectUri(url.origin));
  authorize.searchParams.set("response_type", "code");
  // `openid` and `email` are what Supabase needs to identify the account;
  // `profile` is what fills in a display name and avatar.
  authorize.searchParams.set("scope", "openid email profile");
  authorize.searchParams.set("state", state);
  // Without this Google omits the refresh token on repeat sign-ins, and the
  // consent screen is skipped so silently that a missing scope looks like a
  // server bug rather than a consent that was never granted.
  authorize.searchParams.set("access_type", "offline");
  authorize.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(authorize.toString());
  const options = {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax" as const, // must survive the redirect back from Google
    path: "/",
    maxAge: 600,
  };
  res.cookies.set(OAUTH_STATE_COOKIE, state, options);
  res.cookies.set(OAUTH_NEXT_COOKIE, next, options);
  return res;
}
