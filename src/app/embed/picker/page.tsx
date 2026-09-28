import { createClient } from "@/lib/supabase/server";
import { r2PublicUrl } from "@/lib/r2";
import { resolveIntegration } from "@/lib/integration";
import { EmbedPicker, type EmbedItem } from "@/components/EmbedPicker";

/**
 * The picker, as another website embeds it.
 *
 * Opened in a popup by `connect.js`. It posts the chosen item back to the
 * opener and closes — the host page never navigates, so nothing it was holding
 * (a half-typed prompt, an uploaded file, scroll position) is lost. That is the
 * whole reason this exists next to the redirect flow.
 *
 * Access is decided here, on the server, before any picker is rendered: the
 * `origin` the opener claims is checked against what `client` is allowed, and
 * the result is the single origin the client script is permitted to post to.
 * Doing it here rather than in the browser means the target origin is never
 * something the page can be talked into widening.
 */
export default async function EmbedPickerPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; origin?: string; want?: string }>;
}) {
  const { client, origin, want } = await searchParams;
  const integration = await resolveIntegration(client ?? null, origin ?? null);

  if (!integration) {
    return (
      <main className="embedpicker embedpicker--denied">
        <h1>Not connected</h1>
        <p>
          This picker was opened by a site that is not set up to use it. If it is yours, add its
          origin to your StyleMuse integration and try again.
        </p>
        <p className="embedpicker__mono">{origin ?? "no origin supplied"}</p>
      </main>
    );
  }

  const supabase = await createClient();
  const kind = want === "background" ? "background" : "model";

  const { data } =
    kind === "background"
      ? await supabase
          .from("backgrounds")
          .select("id, name, image_key, original_key, category")
          .order("sort_order", { ascending: true })
      : await supabase
          .from("models")
          .select("id, name, image_key, original_key, gender, region")
          .order("sort_order", { ascending: true });

  const items: EmbedItem[] = (data ?? []).map(
    (row: { id: string; name: string; image_key: string; original_key: string | null }) => ({
      id: row.id,
      name: row.name,
      imageUrl: r2PublicUrl(row.image_key),
      // The grid never loads this; it rides along so the host page can feed
      // the full-resolution asset to a generator instead of the tile.
      originalUrl: r2PublicUrl(row.original_key ?? row.image_key),
    }),
  );

  return (
    <EmbedPicker
      kind={kind}
      items={items}
      targetOrigin={integration.origin}
      clientName={integration.name}
    />
  );
}
