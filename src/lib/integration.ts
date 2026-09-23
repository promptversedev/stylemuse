import { createAdminClient } from "@/lib/supabase/server";

/**
 * Deciding whether a website may embed the picker, and where its answer is
 * allowed to be sent.
 *
 * The rule is the same everywhere: a `client_key` says who is asking, and the
 * browser-reported **origin** says whether to believe them. A key is public —
 * it sits in someone's HTML — so it is an identifier, never a credential. The
 * origin is the part an attacker cannot forge from another site, so that is
 * what grants access and what a postMessage is addressed to.
 *
 * Server-only: it reads with the service role, because `integration_clients`
 * denies everything under RLS.
 */

export type IntegrationClient = {
  clientKey: string;
  name: string;
  /** The exact origin this request is allowed to talk back to. */
  origin: string;
};

/**
 * Origins trusted before `integration_clients` exists.
 *
 * Kept as a fallback rather than deleted so this deploy does not go dark
 * between shipping the code and running migration 0003. Once the table is in
 * place it is the only thing consulted.
 */
function envOrigins(): string[] {
  return (process.env.NEXT_PUBLIC_STUDIO_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

/** Exact match, after trimming a trailing slash. No wildcards — see 0003. */
function normalise(origin: string | null | undefined): string | null {
  if (!origin) return null;
  const trimmed = origin.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Resolve a (client_key, origin) pair to an integration, or null.
 *
 * Returning null covers every failure the caller should treat alike — unknown
 * key, deactivated client, origin not on its list, malformed origin — because
 * telling them apart would let someone probe which keys exist.
 */
export async function resolveIntegration(
  clientKey: string | null,
  rawOrigin: string | null,
): Promise<IntegrationClient | null> {
  const origin = normalise(rawOrigin);
  if (!origin) return null;

  if (clientKey) {
    /**
     * Whether the table *answered* is what decides if this falls back.
     *
     * - It answered: whatever it said is final. An unknown key, a deactivated
     *   client and an unlisted origin are all a hard no, and must not be
     *   rescued by the env list.
     * - It could not be consulted (not migrated yet, or the query failed): it
     *   has said nothing, so the env allowlist still holds. That is itself an
     *   explicit list of origins, not an open door.
     *
     * Matching error *codes* was tried first and is the wrong tool: PostgREST
     * rejects from its schema cache with PGRST205 where Postgres would say
     * 42P01, and a fixed set silently failed every caller closed when the
     * shape was neither.
     */
    let answered = false;
    let result: IntegrationClient | null = null;

    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("integration_clients")
        .select("client_key, name, allowed_origins, active")
        .eq("client_key", clientKey)
        .maybeSingle();

      if (error) {
        console.warn(
          `integration_clients unavailable (${error.code ?? "no code"}: ${error.message}); ` +
            "falling back to NEXT_PUBLIC_STUDIO_ORIGINS",
        );
      } else {
        answered = true;
        const row = data as
          | { client_key: string; name: string; allowed_origins: string[]; active: boolean }
          | null;
        if (row?.active) {
          const allowed = (row.allowed_origins ?? []).map((o) => normalise(o)).filter(Boolean);
          if (allowed.includes(origin)) {
            result = { clientKey: row.client_key, name: row.name, origin };
          }
        }
      }
    } catch (err) {
      console.warn("integration_clients lookup threw; falling back to env allowlist", err);
    }

    if (answered) return result;
  }

  // Pre-migration fallback. Also the path when no client key is supplied at
  // all, which is how the original single-site integration worked.
  return envOrigins().includes(origin)
    ? { clientKey: clientKey ?? "legacy", name: "Studio", origin }
    : null;
}
