/**
 * Step 2: the vote. Every similar photoshoot has already picked its nearest StyleMuse backgrounds and jewellery sets (the rows of
 * reference_nearest, made offline). A catalogue item that many of those photoshoots picked among their `nearest` nearest is the one to
 * suggest: the most-picked come first, a tie goes to the one that is nearer on average.
 */

export type NearestRow = {
  photoshoot_id: string;
  rank: number;
  /** The catalogue item (a backgrounds.id or jewellery.id). */
  item_id: string;
  likeness: number;
};

export type Picked = {
  id: string;
  /** How many photoshoots picked it among their `nearest` nearest. */
  picks: number;
  /** How many photoshoots took part (those that have a nearest row of this kind). */
  of: number;
  /** How many of them had it as their very nearest of all. */
  first: number;
  /** Average likeness of the photoshoots that picked it, 0..1. */
  meanLikeness: number;
  totalLikeness: number;
};

export function countPicks(rows: NearestRow[], nearest: number, top: number): Picked[] {
  const taking = new Set<string>();
  const byItem = new Map<string, { picks: number; first: number; total: number }>();
  for (const r of rows) {
    taking.add(r.photoshoot_id);
    if (r.rank > nearest) continue;
    const entry = byItem.get(r.item_id) ?? { picks: 0, first: 0, total: 0 };
    entry.picks += 1;
    entry.first += r.rank === 1 ? 1 : 0;
    entry.total += r.likeness;
    byItem.set(r.item_id, entry);
  }
  return [...byItem.entries()]
    .map(([id, e]) => ({ id, picks: e.picks, of: taking.size, first: e.first, meanLikeness: e.total / e.picks, totalLikeness: e.total }))
    .sort((a, b) => b.picks - a.picks || b.totalLikeness - a.totalLikeness || (a.id < b.id ? -1 : 1))
    .slice(0, top);
}
