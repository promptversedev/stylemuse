/**
 * Colour maths for the garment recommendation. A line-by-line port of scripts/garment-analysis/recommend/recommender.py in the
 * Vastralook project (to_lab, delta_e, palette, palette_similarity, main_colour, main_colour_rows, colour_parts), so this route picks the
 * same photoshoots the notebook does. If one changes, change the other and re-run the parity check (see tests/recommend.test.ts).
 *
 * A colour distance ("gap") is the CIE Lab distance of two sRGB colours: 0 is the same shade, about 10 is clearly the same colour,
 * 55 or more is nothing in common.
 */

export type Rgb = [number, number, number];
export type Colour = { name?: string; rgb: Rgb; percent?: number };
export type Lab = [number, number, number];

const labCache = new Map<number, Lab>();

/** sRGB (0-255) to CIE Lab, D65. */
export function toLab(rgb: Rgb): Lab {
  const key = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
  const hit = labCache.get(key);
  if (hit) return hit;
  const lin = (v: number) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const r = lin(rgb[0]);
  const g = lin(rgb[1]);
  const b = lin(rgb[2]);
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047);
  const y = f(r * 0.2126 + g * 0.7152 + b * 0.0722);
  const z = f((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
  const lab: Lab = [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  labCache.set(key, lab);
  return lab;
}

export function deltaE(a: Rgb, b: Rgb): number {
  const p = toLab(a);
  const q = toLab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

export type PaletteEntry = { rgb: Rgb; share: number; name: string };

const isRgb = (v: unknown): v is Rgb =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 255);

/** [(rgb, share 0..1, name)] from a list of colours with or without percent. Colours that cannot be compared are dropped. */
export function palette(colours: Colour[] | null | undefined): PaletteEntry[] {
  const good = (Array.isArray(colours) ? colours : []).filter((c) => c && isRgb(c.rgb));
  const total = good.reduce((sum, c) => sum + (typeof c.percent === "number" && c.percent > 0 ? c.percent : 0), 0);
  return good.map((c) => ({
    rgb: c.rgb,
    share: total ? (typeof c.percent === "number" && c.percent > 0 ? c.percent : 0) / total : 1 / good.length,
    name: c.name ?? "",
  }));
}

/** The nearest colour of `to` for every colour of `from`, weighted by its share: the average gap, 0 = identical. */
function oneWay(from: PaletteEntry[], to: PaletteEntry[]): number {
  let gap = 0;
  for (const c of from) {
    let nearest = Infinity;
    for (const o of to) nearest = Math.min(nearest, deltaE(c.rgb, o.rgb));
    gap += c.share * nearest;
  }
  return gap;
}

/** 1 = the same colours in the same shares, 0 = nothing in common. */
export function paletteSimilarity(a: Colour[] | null | undefined, b: Colour[] | null | undefined): number {
  const p = palette(a);
  const q = palette(b);
  if (!p.length || !q.length) return 0;
  return Math.max(0, 1 - (oneWay(p, q) + oneWay(q, p)) / 2 / 55);
}

/** The colour covering the largest share (the first one on a tie), or null. */
export function mainColour(colours: Colour[] | null | undefined): PaletteEntry | null {
  let best: PaletteEntry | null = null;
  for (const c of palette(colours)) if (!best || c.share > best.share) best = c;
  return best;
}

export type ColourMatch = {
  /** 0..100 */
  points: number;
  /** Their main colour is within `majorGap` of yours. Only meaningful when your garment has a main colour. */
  near: boolean;
};

/**
 * Colour match led by the MAIN colour. Null when your garment has no main colour (no colour covers `majorShare` of it).
 * 60 points: how near their main colour is to yours. 25: how much of that colour they have compared with you.
 * 15: how alike the other colours are. Their minor colours never make a photoshoot match.
 */
export function mainColourMatch(
  mine: Colour[] | null | undefined,
  theirs: Colour[] | null | undefined,
  majorShare: number,
  majorGap: number,
): ColourMatch | null {
  const a = palette(mine);
  const b = palette(theirs);
  if (!a.length || !b.length) return null;
  const ma = a.reduce((best, c) => (c.share > best.share ? c : best));
  const mb = b.reduce((best, c) => (c.share > best.share ? c : best));
  if (ma.share < majorShare) return null;
  const gap = deltaE(ma.rgb, mb.rgb);
  const closeness = Math.max(0, 1 - gap / 55);
  const presence = Math.min(1, mb.share / ma.share);
  return { points: 60 * closeness + 25 * presence + 15 * paletteSimilarity(mine, theirs), near: gap <= majorGap };
}

/** Whole-palette match, two rows of 50 points: are my colours in their garment, and theirs in mine. 0..100. */
export function colourPoints(mine: Colour[] | null | undefined, theirs: Colour[] | null | undefined): number {
  const a = palette(mine);
  const b = palette(theirs);
  if (!a.length || !b.length) return 0;
  return 50 * Math.max(0, 1 - oneWay(a, b) / 55) + 50 * Math.max(0, 1 - oneWay(b, a) / 55);
}
