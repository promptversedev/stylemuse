/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;

// Enables `next dev` to run against the Cloudflare bindings defined in
// wrangler.jsonc (R2 bucket, env vars) instead of only working after deploy.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
