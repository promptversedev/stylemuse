/**
 * Packages: a model, a background and a jewellery set that belong together.
 *
 * Each of the most similar reference photoshoots is one package. Its creator already chose a background and jewellery for that
 * garment, so the nearest StyleMuse background and the nearest StyleMuse jewellery set to THOSE (the rows of reference_nearest) are a
 * ready combination, and the model that suits that photoshoot (look, region, skin tone and body type, as models.ts rules it) completes
 * it. This is the "PACKAGE_MODE" of recommender_nearest.py.
 *
 * A background, a jewellery set or a model is used by one package only: when the nearest one is already taken by an earlier package,
 * the next nearest is used, so the five packages can be compared side by side and are five different looks.
 */
import { recommendModels } from "./models";
import type { CatalogueItem, ModelItem } from "./index";
import type { Voter } from "./similar";
import type { NearestRow } from "./vote";

export const PACKAGE_COUNT = 5;

export type PackagePart = {
  item: CatalogueItem;
  /** 0..100: how alike it is to the one the reference photoshoot used. */
  likeness: number;
  /** 1 = the very nearest of the whole catalogue to that photoshoot's own. */
  rank: number;
  reasons: string[];
};

export type PackageModel = { item: ModelItem; score: number; reasons: string[] };

export type RecommendedPackage = {
  /** The reference photoshoot the package is built on. */
  photoshootId: string;
  /** 0..100: how like the uploaded garment that photoshoot's garment is. */
  similarity: number;
  /** 0..100: the average of the similarity and the likeness of the background and the jewellery (what the packages are ordered by). */
  score: number;
  background: PackagePart | null;
  jewellery: PackagePart | null;
  model: PackageModel | null;
};

const pct = (x: number) => `${Math.round(x * 100)}%`;

function byPhotoshoot(rows: NearestRow[], maxRank: number): Map<string, NearestRow[]> {
  const out = new Map<string, NearestRow[]>();
  for (const r of rows) {
    if (r.rank > maxRank) continue;
    const list = out.get(r.photoshoot_id) ?? [];
    list.push(r);
    out.set(r.photoshoot_id, list);
  }
  for (const list of out.values()) list.sort((a, b) => a.rank - b.rank);
  return out;
}

/** The nearest row of this photoshoot whose item exists and is not used by an earlier package. */
function take(rows: NearestRow[] | undefined, items: Map<string, CatalogueItem>, used: Set<string>, what: string, total: number, photoshootId: string): PackagePart | null {
  for (const r of rows ?? []) {
    const item = items.get(r.item_id);
    if (!item || used.has(r.item_id)) continue;
    used.add(r.item_id);
    const reasons = [`${r.rank === 1 ? "The very nearest" : `Number ${r.rank} nearest`} of all ${total} ${what} to the one in reference photoshoot ${photoshootId}: ${pct(r.likeness)} alike`];
    return { item, likeness: Math.round(Math.max(0, Math.min(1, r.likeness)) * 100), rank: r.rank, reasons };
  }
  return null;
}

/** The ids whose items a package build can use: the `maxRank` nearest of the first `voters` photoshoots. */
export function packageItemIds(rows: NearestRow[], voterIds: Set<string>, maxRank: number): string[] {
  return [...new Set(rows.filter((r) => r.rank <= maxRank && voterIds.has(r.photoshoot_id)).map((r) => r.item_id))];
}

export function buildPackages(input: {
  family: string;
  voters: Voter[];
  bgRows: NearestRow[];
  jwRows: NearestRow[];
  bgItems: Map<string, CatalogueItem>;
  jwItems: Map<string, CatalogueItem>;
  bgTotal: number;
  jwTotal: number;
  models: ModelItem[];
  /** How many nearest items each photoshoot may offer (the settings' `nearest`). */
  nearest: number;
  count?: number;
}): RecommendedPackage[] {
  const count = input.count ?? PACKAGE_COUNT;
  const bg = byPhotoshoot(input.bgRows, input.nearest);
  const jw = byPhotoshoot(input.jwRows, input.nearest);

  // Photoshoots that have both a background and a jewellery set come first (a full package), the others after them.
  const both = input.voters.filter((v) => bg.has(v.ref.id) && jw.has(v.ref.id));
  const partial = input.voters.filter((v) => (bg.has(v.ref.id) || jw.has(v.ref.id)) && !(bg.has(v.ref.id) && jw.has(v.ref.id)));

  const usedBg = new Set<string>();
  const usedJw = new Set<string>();
  const usedModel = new Set<string>();
  const out: RecommendedPackage[] = [];

  for (const voter of [...both, ...partial]) {
    if (out.length >= count) break;
    const id = voter.ref.id;
    const background = take(bg.get(id), input.bgItems, usedBg, "backgrounds", input.bgTotal, id);
    const jewellery = take(jw.get(id), input.jwItems, usedJw, "accessory sets", input.jwTotal, id);
    if (!background && !jewellery) continue;

    // The model that suits this one photoshoot: its own skin tone and body type vote alone.
    const ranked = recommendModels(input.family, [{ ...voter, weight: 1 }], input.models, input.models.length);
    const byId = new Map(input.models.map((m) => [m.id, m]));
    const choice = ranked.find((r) => !usedModel.has(r.id) && byId.has(r.id)) ?? ranked.find((r) => byId.has(r.id));
    const model: PackageModel | null = choice ? { item: byId.get(choice.id) as ModelItem, score: Math.round(Math.max(0, Math.min(1, choice.score)) * 100), reasons: choice.reasons } : null;
    if (model) usedModel.add(model.item.id);

    const similarity = Math.round(Math.max(0, Math.min(1, voter.similarity)) * 100);
    const parts = [similarity, ...(background ? [background.likeness] : []), ...(jewellery ? [jewellery.likeness] : [])];
    out.push({ photoshootId: id, similarity, score: Math.round(parts.reduce((s, n) => s + n, 0) / parts.length), background, jewellery, model });
  }

  // Best first. A stable sort, so equal scores keep the order of the similar photoshoots.
  return out.map((p, i) => ({ p, i })).sort((a, b) => b.p.score - a.p.score || a.i - b.i).map(({ p }) => p);
}
