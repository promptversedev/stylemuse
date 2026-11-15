/**
 * The recommendation's data, read from Supabase with the service-role client (the reference tables are private: RLS on, no policy).
 *
 * The reference photoshoots (about 2,300 small rows) and the 50 models are the same for every request, so they are kept in memory for a
 * few minutes per Worker instance. The per-request reads are small: the nearest rows of ~30 photoshoots (at most a few hundred rows)
 * and the handful of catalogue items that end up on the page.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Colour } from "./colour";
import type { CatalogueItem, ItemKind, ModelItem, RecommendStore } from "./index";
import type { Reference } from "./similar";
import type { NearestRow } from "./vote";

const TTL_MS = 5 * 60 * 1000;
const PAGE = 1000;

/** Remembers a loader's answer for TTL_MS. A failed load is not remembered, so the next request tries again. */
function cached<T>(load: () => Promise<T>): () => Promise<T> {
  let value: { at: number; data: T } | null = null;
  let pending: Promise<T> | null = null;
  return async () => {
    if (value && Date.now() - value.at < TTL_MS) return value.data;
    if (!pending) {
      pending = load()
        .then((data) => {
          value = { at: Date.now(), data };
          return data;
        })
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  };
}

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "unknown error"}`);
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim().toLowerCase() : null);

export function createSupabaseStore(supabase: SupabaseClient): RecommendStore {
  const references = cached(async (): Promise<Reference[]> => {
    const rows: Reference[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("reference_photoshoots")
        .select("id, category_family, colours, skin_tone, body_type")
        .order("id")
        .range(from, from + PAGE - 1);
      if (error) fail("Could not read the reference photoshoots", error);
      for (const r of data ?? []) {
        rows.push({
          id: r.id as string,
          category_family: r.category_family as string,
          colours: (r.colours ?? []) as Colour[],
          skin_tone: (r.skin_tone as string | null) ?? null,
          body_type: (r.body_type as string | null) ?? null,
        });
      }
      if ((data?.length ?? 0) < PAGE) break;
    }
    return rows;
  });

  const models = cached(async (): Promise<ModelItem[]> => {
    const [{ data: rows, error }, { data: analyses, error: analysisError }] = await Promise.all([
      supabase.from("models").select("id, name, image_key, original_key").order("sort_order").limit(500),
      supabase.from("catalogue_analysis").select("model_id, analysis").not("model_id", "is", null).limit(500),
    ]);
    if (error) fail("Could not read the models", error);
    if (analysisError) fail("Could not read the model analysis", analysisError);
    const byId = new Map((analyses ?? []).map((a) => [a.model_id as string, (a.analysis ?? {}) as Record<string, unknown>]));
    // A model without an analysis (a new one) cannot be matched by the rules, so it is left out.
    return (rows ?? []).flatMap((m) => {
      const a = byId.get(m.id as string);
      if (!a) return [];
      return [{
        id: m.id as string,
        name: m.name as string,
        imageKey: m.image_key as string,
        originalKey: (m.original_key as string | null) ?? null,
        region: str(a.region),
        look: str(a.look),
        skinTone: str(a.skin_tone),
        bodyType: str(a.body_type),
      }];
    });
  });

  const counts = new Map<string, () => Promise<number>>();
  const count = (kind: ItemKind, category?: string) => {
    const key = `${kind}|${category ?? ""}`;
    if (!counts.has(key)) {
      counts.set(key, cached(async () => {
        let q = supabase.from(kind === "background" ? "backgrounds" : "jewellery").select("id", { count: "exact", head: true });
        if (kind === "jewellery" && category) q = q.eq("category", category);
        const { count: n, error } = await q;
        if (error) fail("Could not count the catalogue", error);
        return n ?? 0;
      }));
    }
    return (counts.get(key) as () => Promise<number>)();
  };

  return {
    references,
    models,
    catalogueCount: count,

    async nearest(kind, photoshootIds, maxRank): Promise<NearestRow[]> {
      const column = kind === "background" ? "background_id" : "jewellery_id";
      const { data, error } = await supabase
        .from("reference_nearest")
        .select(`photoshoot_id, rank, likeness, ${column}`)
        .eq("kind", kind)
        .in("photoshoot_id", photoshootIds)
        .lte("rank", maxRank)
        .limit(PAGE);
      if (error) fail("Could not read the nearest items", error);
      return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
        photoshoot_id: r.photoshoot_id as string,
        rank: r.rank as number,
        likeness: r.likeness as number,
        item_id: r[column] as string,
      }));
    },

    async items(kind, ids): Promise<Map<string, CatalogueItem>> {
      const out = new Map<string, CatalogueItem>();
      if (!ids.length) return out;
      const isBackground = kind === "background";
      const [{ data: rows, error }, { data: analyses, error: analysisError }] = await Promise.all([
        supabase
          .from(isBackground ? "backgrounds" : "jewellery")
          .select(isBackground ? "id, name, image_key, original_key" : "id, name, image_key, original_key, makeup_original_key, category")
          .in("id", ids),
        supabase
          .from("catalogue_analysis")
          .select(`${isBackground ? "background_id" : "jewellery_id"}, analysis`)
          .in(isBackground ? "background_id" : "jewellery_id", ids),
      ]);
      if (error) fail("Could not read the catalogue items", error);
      if (analysisError) fail("Could not read the item analysis", analysisError);
      const byId = new Map(
        ((analyses ?? []) as unknown as Record<string, unknown>[]).map((a) => [a[isBackground ? "background_id" : "jewellery_id"] as string, (a.analysis ?? null) as Record<string, unknown> | null]),
      );
      for (const r of (rows ?? []) as unknown as Record<string, unknown>[]) {
        out.set(r.id as string, {
          id: r.id as string,
          name: r.name as string,
          imageKey: r.image_key as string,
          originalKey: (r.original_key as string | null) ?? null,
          makeupOriginalKey: isBackground ? undefined : ((r.makeup_original_key as string | null) ?? null),
          category: isBackground ? undefined : ((r.category as string | null) ?? null),
          analysis: byId.get(r.id as string) ?? null,
        });
      }
      return out;
    },
  };
}
