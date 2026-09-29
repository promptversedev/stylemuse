// Turns an R2 object key ("models/m01-ava.webp") into the public URL it's
// served from. The bucket's public domain (R2.dev subdomain or a custom
// domain attached to the bucket) lives in one env var so it can be rotated
// without touching every row in Supabase.
export function r2PublicUrl(key: string): string {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_R2_PUBLIC_URL is not set — see .env.example");
  }
  return `${base.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}

/**
 * The makeup that rides along with a jewellery pick.
 *
 * Makeup exists only as an original — it is never shown, only sent to
 * generation — so `imageUrl` is the original too. It is kept rather than
 * dropped because hosts built against the earlier `{ imageUrl, originalUrl }`
 * shape require it, and would otherwise discard the makeup entirely.
 */
export function makeupPick(originalKey: string | null | undefined) {
  if (!originalKey) return null;
  const url = r2PublicUrl(originalKey);
  return { imageUrl: url, originalUrl: url };
}
