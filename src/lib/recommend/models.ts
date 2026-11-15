/**
 * Models: a rule table (garment family -> which look and which region suit it) plus the skin tone and body type the similar photoshoots
 * used. A port of recommender.py (LOOK_BY_FAMILY, REGION_BY_FAMILY, vote, spread, recommend_models). The tables are copied as they are:
 * they are rules of taste, not data, and they are the first thing to change if the advice should be different.
 */
import type { Voter } from "./similar";

type Table = Record<string, Record<string, number>>;

export const LOOK_BY_FAMILY: Table = {
  saree: { traditional: 1.0, fusion: 0.6, modern: 0.35 },
  lehenga: { traditional: 1.0, fusion: 0.6, modern: 0.35 },
  "suit set": { traditional: 1.0, fusion: 0.7, modern: 0.45 },
  kurti: { traditional: 0.9, fusion: 0.9, modern: 0.6 },
  gown: { fusion: 1.0, modern: 0.8, traditional: 0.6 },
  "indo-western": { fusion: 1.0, modern: 0.75, traditional: 0.6 },
  "co-ord": { modern: 1.0, fusion: 0.9, traditional: 0.45 },
  "kaftan and abaya": { fusion: 1.0, modern: 0.8, traditional: 0.7 },
  dress: { modern: 1.0, fusion: 0.7, traditional: 0.3 },
  "western separates": { modern: 1.0, fusion: 0.6, traditional: 0.3 },
  outerwear: { modern: 1.0, fusion: 0.6, traditional: 0.3 },
  "active and beach": { modern: 1.0, fusion: 0.5, traditional: 0.2 },
};

const INDIAN = { "north indian": 0.9, "south indian": 0.9, "west indian": 0.9, "east indian": 0.9, "north-east indian": 0.8 };
const WESTERN_LEANING = { international: 1.0, "north indian": 0.85, "south indian": 0.85, "west indian": 0.85, "east indian": 0.85, "north-east indian": 0.9 };

export const REGION_BY_FAMILY: Table = {
  saree: { "south indian": 1.0, "east indian": 0.9, "north indian": 0.9, "west indian": 0.9, "north-east indian": 0.7, international: 0.4 },
  lehenga: { "north indian": 1.0, "west indian": 1.0, "south indian": 0.8, "east indian": 0.8, "north-east indian": 0.7, international: 0.4 },
  "suit set": { "north indian": 1.0, "west indian": 0.9, "south indian": 0.8, "east indian": 0.8, "north-east indian": 0.8, international: 0.5 },
  kurti: { "north indian": 1.0, "west indian": 0.9, "south indian": 0.9, "east indian": 0.9, "north-east indian": 0.8, international: 0.5 },
  gown: { ...INDIAN, international: 0.8 },
  "indo-western": { ...INDIAN, international: 0.8 },
  "co-ord": { ...INDIAN, international: 0.9 },
  "kaftan and abaya": { ...INDIAN, international: 0.8 },
  dress: { ...WESTERN_LEANING },
  "western separates": { ...WESTERN_LEANING },
};

/** A catalogue model with the fields the rules read (from its analysis), lower-cased and trimmed the way the engine does. */
export type ModelRow = {
  id: string;
  region: string | null;
  look: string | null;
  skinTone: string | null;
  bodyType: string | null;
};

export type Ranked = { id: string; score: number; reasons: string[]; group: string };

const pct = (x: number) => `${Math.round(x * 100)}%`;
const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
/** Python's str.title(): every word, and every part after a hyphen, starts with a capital. */
const title = (s: string) => s.replace(/(^|[\s-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());

/** value -> share of the vote (0..1), weighted by how like the garment each photoshoot is. */
function vote(voters: Voter[], pick: (v: Voter) => string | null): Record<string, number> {
  const counts = new Map<string, number>();
  let total = 0;
  for (const v of voters) {
    const value = pick(v);
    if (typeof value === "string" && value) {
      counts.set(value, (counts.get(value) ?? 0) + v.weight);
      total += v.weight;
    }
  }
  const out: Record<string, number> = {};
  if (total) for (const [k, c] of counts) out[k] = c / total;
  return out;
}

/** The best `top` items while keeping variety: a group already chosen counts a little less each time (0.92 per earlier pick). */
export function spread<T extends { score: number; group: string }>(items: T[], top: number): T[] {
  const left = [...items].sort((a, b) => b.score - a.score);
  const chosen: T[] = [];
  const used = new Map<string, number>();
  while (left.length && chosen.length < top) {
    let bestIndex = 0;
    let bestValue = -Infinity;
    left.forEach((item, i) => {
      const value = item.score * 0.92 ** (used.get(item.group) ?? 0);
      if (value > bestValue) {                      // strictly greater: the first of equals wins, as in Python's max()
        bestValue = value;
        bestIndex = i;
      }
    });
    const [best] = left.splice(bestIndex, 1);
    chosen.push(best);
    used.set(best.group, (used.get(best.group) ?? 0) + 1);
  }
  return chosen.sort((a, b) => b.score - a.score);
}

export function recommendModels(family: string, voters: Voter[], models: ModelRow[], top: number): Ranked[] {
  const looks = LOOK_BY_FAMILY[family] ?? {};
  const regions = REGION_BY_FAMILY[family] ?? {};
  const skin = vote(voters, (v) => v.ref.skin_tone);
  const body = vote(voters, (v) => v.ref.body_type);
  const voted = Object.keys(skin).length > 0 || Object.keys(body).length > 0;
  const out: Ranked[] = models.map((m) => {
    const look = looks[m.look ?? ""] ?? 0.6;
    const region = regions[m.region ?? ""] ?? 0.8;
    const seen = 0.5 * (skin[m.skinTone ?? ""] ?? 0) + 0.5 * (body[m.bodyType ?? ""] ?? 0);
    const score = voted ? 0.4 * look + 0.38 * region + 0.22 * Math.min(1, seen * 1.6) : 0.52 * look + 0.48 * region;
    const reasons: string[] = [];
    const label = family || "this";
    if (look >= 0.9) reasons.push(`${capitalise(m.look ?? "")} look suits a ${label} outfit`);
    if (region >= 0.95 && family in REGION_BY_FAMILY) reasons.push(`${title(m.region ?? "")} styling is the first choice for a ${family}`);
    if ((skin[m.skinTone ?? ""] ?? 0) >= 0.3) reasons.push(`${pct(skin[m.skinTone as string])} of the similar photoshoots used a ${m.skinTone} skin tone`);
    if ((body[m.bodyType ?? ""] ?? 0) >= 0.4) reasons.push(`${pct(body[m.bodyType as string])} of them used a ${m.bodyType} model`);
    return { id: m.id, score, reasons, group: `${m.region}|${m.skinTone}` };
  });
  return spread(out, top);
}
