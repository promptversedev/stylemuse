import { createClient } from "@/lib/supabase/server";
import { makeupPick, r2PublicUrl } from "@/lib/r2";
import { resolveIntegration } from "@/lib/integration";
import { EmbedPicker, type EmbedItem, type EmbedKind } from "@/components/EmbedPicker";

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
  searchParams: Promise<{ client?: string; origin?: string; want?: string; category?: string }>;
}) {
  const { client, origin, want, category: rawCategory } = await searchParams;
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

  /**
   * Which catalogue to show.
   *
   * Listed rather than defaulted through an `else`: an unrecognised `want`
   * used to fall through to models, so `want=jewellery` opened a grid of
   * models under a "Pick a model" heading and looked like the caller's bug.
   * An unknown value still lands on models — there has to be something — but
   * the kinds that exist are now named.
   */
  const kind: EmbedKind =
    want === "background" || want === "jewellery" || want === "hairstyle" ? want : "model";

  type Row = {
    id: string;
    name: string;
    image_key: string;
    original_key: string | null;
    makeup_original_key?: string | null;
    category?: string | null;
  };

  /**
   * Narrow the grid to one category, e.g. `category=Lehenga` from a studio
   * that is dressing a lehenga, so its jewellery picker offers lehenga pieces.
   * Letters and spaces only: it is matched with ilike, where `%` and `_` would
   * otherwise be wildcards. Models have no category, so it is ignored there.
   */
  const category = /^[A-Za-z ]{1,40}$/.test(rawCategory ?? "") ? rawCategory!.trim() : null;

  const TABLE: Record<EmbedKind, string> = {
    model: "models",
    background: "backgrounds",
    jewellery: "jewellery",
    hairstyle: "hairstyles",
  };
  const columns =
    kind === "model"
      ? "id, name, image_key, original_key"
      : kind === "jewellery"
        ? "id, name, image_key, original_key, makeup_original_key, category"
        : "id, name, image_key, original_key, category";

  let query = supabase.from(TABLE[kind]).select(columns).order("sort_order", { ascending: true });
  if (category && kind !== "model") query = query.ilike("category", category);
  const { data } = await query;

  const items: EmbedItem[] = ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    name: row.name,
    imageUrl: r2PublicUrl(row.image_key),
    // The grid never loads this; it rides along so the host page can feed
    // the full-resolution asset to a generator instead of the tile.
    originalUrl: r2PublicUrl(row.original_key ?? row.image_key),
    // Jewellery brings its makeup — never shown, sent with the pick so the
    // host can hand it to generation. Every other kind sends null.
    makeup: kind === "jewellery" ? makeupPick(row.makeup_original_key) : null,
    category: row.category ?? null,
  }));

  return (
    <EmbedPicker
      kind={kind}
      category={kind === "model" ? null : category}
      items={items}
      targetOrigin={integration.origin}
      clientName={integration.name}
    />
  );
}
