/**
 * The garment recommendation: which StyleMuse backgrounds, jewellery sets and models go with an uploaded garment.
 *
 *   1. similar.ts  the 20-30 reference photoshoots whose garment has the same main colour
 *   2. vote.ts     each of them already picked its nearest StyleMuse backgrounds / jewellery (reference_nearest); the most-picked win
 *   3. models.ts   look and region rules, plus the skin tone and body type those photoshoots used
 *
 * Everything the data layer provides goes through `RecommendStore`, so the logic is the same against the real database
 * (store.ts) and against files in a test.
 */
import { mainColour, deltaE, type Colour } from "./colour";
import { recommendModels, type ModelRow } from "./models";
import { DEFAULT_SETTINGS, similarPhotoshoots, type GarmentInput, type Reference, type Settings } from "./similar";
import { buildPackages, packageItemIds, type RecommendedPackage } from "./packages";
import { countPicks, type NearestRow, type Picked } from "./vote";

export { DEFAULT_SETTINGS } from "./similar";
export type { GarmentInput, Settings } from "./similar";
export type { RecommendedPackage, PackagePart, PackageModel } from "./packages";

export type ItemKind = "background" | "jewellery";

export type CatalogueItem = {
  id: string;
  name: string;
  imageKey: string;
  originalKey: string | null;
  /** Jewellery only. */
  makeupOriginalKey?: string | null;
  /** Jewellery only: Saree / Lehenga / Kurti. */
  category?: string | null;
  /** The analysis JSON of the picture (catalogue_analysis), or null when it has none. */
  analysis: Record<string, unknown> | null;
};

export type ModelItem = ModelRow & { name: string; imageKey: string; originalKey: string | null };

export interface RecommendStore {
  references(): Promise<Reference[]>;
  /** The nearest rows of these photoshoots, rank 1..maxRank. */
  nearest(kind: ItemKind, photoshootIds: string[], maxRank: number): Promise<NearestRow[]>;
  /** How many items the catalogue has of a kind (jewellery: of one category), for "the nearest of all N". */
  catalogueCount(kind: ItemKind, category?: string): Promise<number>;
  items(kind: ItemKind, ids: string[]): Promise<Map<string, CatalogueItem>>;
  models(): Promise<ModelItem[]>;
}

export type RankedItem = {
  item: CatalogueItem;
  /** 0..100: the share of the voting photoshoots that picked it. */
  score: number;
  picked: number;
  of: number;
  reasons: string[];
  /** A few plain facts from its analysis, for showing on a card. */
  facts: Record<string, string | null>;
  /** The descriptive name from the analysis ("Minimalist lime plaster wall with an arched niche"). */
  title: string | null;
};

export type RankedModel = { item: ModelItem; score: number; reasons: string[] };

export type RecommendResult = {
  settings: Settings;
  /**
   * The reference photoshoots are of the same garment type as the uploaded garment. False means too few of them exist (a lehenga
   * today: only sarees are analysed), so photoshoots of other garments voted and the advice is weaker: a caller may prefer not to show it.
   */
  familyMatch: boolean;
  /** How many photoshoots voted, and how many of them have the same main colour as the garment. */
  voters: number;
  sameColourVoters: number;
  notes: string[];
  backgrounds: RankedItem[];
  jewellery: RankedItem[];
  models: RankedModel[];
  /**
   * Up to five packages, best first: a model, a background and a jewellery set that belong together, each built on one similar
   * reference photoshoot (see packages.ts). Empty when no similar photoshoot has a nearest background or jewellery set.
   */
  packages: RecommendedPackage[];
};

/** The jewellery sets in the reference data are per garment: a saree gets saree sets. */
const JEWELLERY_CATEGORY: Record<string, string> = { saree: "Saree", lehenga: "Lehenga", kurti: "Kurti" };

const pct = (x: number) => `${Math.round(x * 100)}%`;
const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

function rank(picked: Picked[], items: Map<string, CatalogueItem>, kind: ItemKind, total: number, nearest: number, garment: GarmentInput): RankedItem[] {
  const gMain = mainColour(garment.colors);
  const out: RankedItem[] = [];
  for (const p of picked) {
    const item = items.get(p.id);
    if (!item) continue;                                 // not a catalogue item any more, or the wrong category
    const a = item.analysis ?? {};
    const what = kind === "background" ? "backgrounds" : "accessory sets";
    const reasons = [`Picked by ${p.picks} of the ${p.of} similar photoshoots as one of their ${nearest} nearest ${what}`];
    if (p.first) reasons.push(`The very nearest of all ${total} ${what} for ${p.first} of them`);
    reasons.push(`On average ${pct(p.meanLikeness)} alike to the photoshoots that picked it`);
    if (kind === "background") {
      const bMain = mainColour(a.colors as Colour[] | undefined);
      if (gMain && bMain) {
        const gap = deltaE(gMain.rgb, bMain.rgb);
        if (gap < 16) reasons.push(`Warning: the background is almost the same colour as the garment (${gMain.name})`);
        else if (gap >= 30) reasons.push(`The ${gMain.name} garment stands out against ${bMain.name}`);
      }
    }
    const summary = obj(obj(a.accessories).summary);
    out.push({
      item,
      score: Math.round((p.picks / Math.max(1, p.of)) * 100),
      picked: p.picks,
      of: p.of,
      reasons,
      title: text(a.name),
      facts:
        kind === "background"
          ? { environment: text(a.environment), type: text(a.type), mood: text(a.mood), temperature: text(a.temperature), busy: text(a.busy) }
          : { weight: text(summary.weight), style: text(summary.style), metal: text(summary.metal), look: text(summary.look) },
    });
  }
  return out;
}

export async function recommend(garment: GarmentInput, store: RecommendStore, overrides: Partial<Settings> = {}): Promise<RecommendResult> {
  const settings: Settings = { ...DEFAULT_SETTINGS, ...overrides };
  const notes: string[] = [];
  const refs = await store.references();
  const sameFamily = refs.filter((r) => r.category_family === garment.category_family).length;
  if (sameFamily < settings.minSameFamily) {
    notes.push(
      refs.length
        ? `Only ${sameFamily} reference photoshoots of this garment type, so photoshoots of other garments were used as well.`
        : "No reference photoshoots are loaded.",
    );
  }

  const voters = similarPhotoshoots(garment, refs, settings);
  const sameColour = voters.filter((v) => v.near).length;
  if (!voters.length) notes.push("No similar reference photoshoots were found for this garment, so no background or jewellery is suggested.");

  const ids = voters.map((v) => v.ref.id);
  const wantCategory = JEWELLERY_CATEGORY[garment.category_family];
  if (!wantCategory) notes.push(`There are no jewellery sets for "${garment.category_family}" yet.`);
  const [bgRows, jwRows, bgTotal, jwTotal, models] = await Promise.all([
    ids.length ? store.nearest("background", ids, settings.nearest) : [],
    ids.length && wantCategory ? store.nearest("jewellery", ids, settings.nearest) : [],
    store.catalogueCount("background"),
    store.catalogueCount("jewellery", wantCategory),
    store.models(),
  ]);

  // a few more than asked for, so dropping an item that no longer exists or is the wrong category still leaves enough
  const bgPicked = countPicks(bgRows, settings.nearest, settings.top + 5);
  const jwPicked = countPicks(jwRows, settings.nearest, settings.top + 15);
  // The packages are built on the first photoshoots (a dozen, so a missing item still leaves five): their nearest items are read too.
  const packageVoters = new Set(voters.slice(0, 12).map((v) => v.ref.id));
  const bgWanted = [...new Set([...bgPicked.map((p) => p.id), ...packageItemIds(bgRows, packageVoters, settings.nearest)])];
  const jwWanted = [...new Set([...jwPicked.map((p) => p.id), ...packageItemIds(jwRows, packageVoters, settings.nearest)])];
  const [bgItems, jwItems] = await Promise.all([
    bgWanted.length ? store.items("background", bgWanted) : new Map<string, CatalogueItem>(),
    jwWanted.length ? store.items("jewellery", jwWanted) : new Map<string, CatalogueItem>(),
  ]);
  for (const [id, item] of jwItems) if (item.category !== wantCategory) jwItems.delete(id);

  const jewellery = rank(jwPicked, jwItems, "jewellery", jwTotal, settings.nearest, garment).slice(0, settings.top);
  if (voters.length && wantCategory && !jewellery.length) {
    notes.push(`No ${wantCategory} jewellery is suggested yet: the reference photoshoots are of other garments, so their jewellery is not ${wantCategory} jewellery.`);
  }
  const modelRows = recommendModels(garment.category_family, voters, models, settings.top);
  const byModel = new Map(models.map((m) => [m.id, m]));
  const packages = buildPackages({
    family: garment.category_family,
    voters,
    bgRows,
    jwRows,
    bgItems,
    jwItems,
    bgTotal,
    jwTotal,
    models,
    nearest: settings.nearest,
  });
  return {
    settings,
    familyMatch: sameFamily >= settings.minSameFamily,
    voters: voters.length,
    sameColourVoters: sameColour,
    notes,
    backgrounds: rank(bgPicked, bgItems, "background", bgTotal, settings.nearest, garment).slice(0, settings.top),
    jewellery,
    packages,
    models: modelRows.flatMap((r) => (byModel.has(r.id) ? [{ item: byModel.get(r.id) as ModelItem, score: Math.round(Math.max(0, Math.min(1, r.score)) * 100), reasons: r.reasons }] : [])),
  };
}
