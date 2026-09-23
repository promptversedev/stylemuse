import Link from "next/link";

/**
 * Why sign-in failed, in the words the provider used.
 *
 * This used to say "Something went wrong completing Google sign-in", which is
 * true of every possible cause and so points at none of them. The real reason
 * is usually a one-line configuration fact — the provider is not enabled, or
 * this redirect URL is not on the allowed list — and Supabase already sends it
 * in the query string. Showing it turns a dead end into something fixable.
 */
export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_code?: string; error_description?: string }>;
}) {
  const { error, error_code, error_description } = await searchParams;
  const detail = error_description?.replace(/\+/g, " ") ?? null;
  const code = error_code ?? error ?? null;

  /** The two causes that account for almost every failure here. */
  const hint =
    code === "validation_failed" || detail?.includes("provider is not enabled")
      ? "Google is not enabled for this project yet — Supabase → Authentication → Providers → Google."
      : detail?.toLowerCase().includes("redirect")
        ? "This app's URL is not on the allowed redirect list — Supabase → Authentication → URL Configuration."
        : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Sign-in failed</h1>

      <p className="max-w-md text-sm text-neutral-400">
        {detail ?? "Google sign-in did not complete, and no reason was returned."}
      </p>

      {code && <p className="font-mono text-xs text-neutral-500">{code}</p>}
      {hint && <p className="max-w-md text-sm text-neutral-300">{hint}</p>}

      <Link
        href="/"
        className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Back home
      </Link>

      <p className="max-w-md text-xs text-neutral-500">
        Signing in is optional. You can pick a model and background and send them to a connected
        site without an account — it only buys a pick that follows you to another device.
      </p>
    </main>
  );
}
