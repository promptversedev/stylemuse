/**
 * Step 1 of the recommendation: the reference photoshoots whose garment is most like the uploaded one.
 * A port of recommender.py (garment_parts / garment_similarity / similar_photoshoots) in colour mode.
 *
 * When one colour covers `majorShare` of the garment (green 70%), only photoshoots whose OWN main colour is within `majorGap` of it count
 * as the same, and the more of that colour they have the higher they rank. Photoshoots with another main colour only fill up to
 * `minVoters` when there are too few of the right colour. A garment with no main colour is compared on its whole palette.
 */
import { colourPoints, mainColour, mainColourMatch, type Colour } from "./colour";

export type Settings = {
  /** How many nearest StyleMuse items each similar photoshoot picks (the "3"). */
  nearest: number;
  /** The most similar photoshoots that vote. */
  voters: number;
  /** The fewest: with too few of the right main colour, the nearest others fill up to this. */
  minVoters: number;
  /** How near a photoshoot's main colour must be to the garment's (0 = same shade, ~10 = clearly the same colour). */
  majorGap: number;
  /** A garment colour covering at least this share (0..1) is its main colour. */
  majorShare: number;
  /** With at least this many photoshoots of the garment's family, only those vote. */
  minSameFamily: number;
  /** How many of each kind to return. */
  top: number;
};

export const DEFAULT_SETTINGS: Settings = { nearest: 3, voters: 30, minVoters: 20, majorGap: 28, majorShare: 0.5, minSameFamily: 8, top: 5 };

export type GarmentInput = { category_family: string; colors: Colour[]; occasion?: string };

export type Reference = {
  id: string;
  category_family: string;
  colours: Colour[];
  skin_tone: string | null;
  body_type: string | null;
};

export type Voter = {
  ref: Reference;
  similarity: number;
  /** share of the vote, all voters add up to 1 */
  weight: number;
  /** Its own main colour is within `majorGap` of the garment's (false for the other-colour photoshoots that only fill up the numbers). */
  near: boolean;
};

type Scored = { ref: Reference; similarity: number; near: boolean };

function score(garment: GarmentInput, ref: Reference, s: Settings): Scored {
  const led = mainColourMatch(garment.colors, ref.colours, s.majorShare, s.majorGap);
  if (led === null) return { ref, similarity: colourPoints(garment.colors, ref.colours) / 100, near: false };
  if (led.near) return { ref, similarity: led.points / 100, near: true };
  return { ref, similarity: (0.6 * colourPoints(garment.colors, ref.colours)) / 100, near: false };
}

export function similarPhotoshoots(garment: GarmentInput, refs: Reference[], s: Settings): Voter[] {
  const scored = refs.map((ref) => score(garment, ref, s));
  const same = scored.filter((x) => x.ref.category_family === garment.category_family);
  const pool = same.length >= s.minSameFamily ? same : scored;
  const main = mainColour(garment.colors);

  let top: Scored[];
  if (main && main.share >= s.majorShare) {
    const ranked = [...pool].sort((a, b) => Number(!a.near) - Number(!b.near) || b.similarity - a.similarity);   // the right main colour first
    const nNear = ranked.filter((x) => x.near).length;
    const keep = Math.max(Math.min(s.minVoters, s.voters), Math.min(s.voters, nNear));
    top = ranked.slice(0, keep).filter((x) => x.similarity > 0.12);
  } else {
    top = [...pool].sort((a, b) => b.similarity - a.similarity).slice(0, s.voters).filter((x) => x.similarity > 0.12);
  }
  const total = top.reduce((sum, x) => sum + x.similarity ** 2, 0);
  return total ? top.map((x) => ({ ref: x.ref, similarity: x.similarity, weight: x.similarity ** 2 / total, near: x.near })) : [];
}
