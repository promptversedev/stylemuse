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
