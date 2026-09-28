import { createClient } from "@/lib/supabase/server";
import { r2PublicUrl } from "@/lib/r2";
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
    image_key?: string;
    original_key?: string | null;
    jewellery_key?: string;
    makeup_key?: string;
    jewellery_original_key?: string | null;
    makeup_original_key?: string | null;
  };

  const { data } =
    kind === "background"
      ? await supabase
          .from("backgrounds")
          .select("id, name, image_key, original_key, category")
          .order("sort_order", { ascending: true })
      : kind === "hairstyle"
        ? await supabase
            .from("hairstyles")
            .select("id, name, image_key, original_key, category")
            .order("sort_order", { ascending: true })
        : kind === "jewellery"
          ? await supabase
              .from("jewellery")
              .select(
                "id, name, jewellery_key, makeup_key, jewellery_original_key, makeup_original_key, category",
              )
              .order("sort_order", { ascending: true })
          : await supabase
              .from("models")
              .select("id, name, image_key, original_key, gender, region")
              .order("sort_order", { ascending: true });

  const items: EmbedItem[] = ((data ?? []) as Row[]).map((row) => {
    if (kind === "jewellery") {
      // One row, two images. The makeup travels with the jewellery rather
      // than being a second pick, which is what keeps the pairing intact.
      const jewellery = row.jewellery_key ?? "";
      const makeup = row.makeup_key ?? "";
      return {
        id: row.id,
        name: row.name,
        imageUrl: r2PublicUrl(jewellery),
        originalUrl: r2PublicUrl(row.jewellery_original_key ?? jewellery),
        makeup: makeup
          ? {
              imageUrl: r2PublicUrl(makeup),
              originalUrl: r2PublicUrl(row.makeup_original_key ?? makeup),
            }
          : null,
      };
    }

    const key = row.image_key ?? "";
    return {
      id: row.id,
      name: row.name,
      imageUrl: r2PublicUrl(key),
      // The grid never loads this; it rides along so the host page can feed
      // the full-resolution asset to a generator instead of the tile.
      originalUrl: r2PublicUrl(row.original_key ?? key),
      makeup: null,
    };
  });

  return (
    <EmbedPicker
      kind={kind}
      items={items}
      targetOrigin={integration.origin}
      clientName={integration.name}
    />
  );
}
