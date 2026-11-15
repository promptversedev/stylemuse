/**
 * The recommendation (src/lib/recommend), checked without any database.
 *
 *   npm test
 *
 * The expected numbers in the colour tests were taken from the Python engine this code is a port of
 * (scripts/garment-analysis/recommend/recommender.py in the Vastralook project), so the two cannot drift apart unnoticed.
 * The larger comparison against real data (same voters, same picks, same models) is done with the real export and is not
 * repeated here because that data is private.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { colourPoints, deltaE, mainColour, mainColourMatch, paletteSimilarity, toLab, type Colour } from "../src/lib/recommend/colour";
import { recommend, type CatalogueItem, type ItemKind, type ModelItem, type RecommendStore } from "../src/lib/recommend";
import { recommendModels, spread } from "../src/lib/recommend/models";
import { parseRequest } from "../src/lib/recommend/request";
import { DEFAULT_SETTINGS, similarPhotoshoots, type Reference } from "../src/lib/recommend/similar";
import { countPicks, type NearestRow } from "../src/lib/recommend/vote";

const close = (actual: number, expected: number, tolerance = 1e-4) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not ${expected}`);

const GARMENT: Colour[] = [
  { name: "green", rgb: [20, 110, 80], percent: 70 },
  { name: "gold", rgb: [200, 165, 70], percent: 25 },
  { name: "white", rgb: [240, 236, 228], percent: 5 },
];
const NEAR: Colour[] = [{ name: "emerald", rgb: [10, 120, 90], percent: 65 }, { name: "gold", rgb: [190, 150, 60], percent: 35 }];
const GOLD_MAIN: Colour[] = [
  { name: "gold", rgb: [205, 165, 60], percent: 65 },
  { name: "emerald", rgb: [10, 115, 85], percent: 25 },
  { name: "gold2", rgb: [225, 195, 120], percent: 10 },
];

describe("colour maths (numbers from the Python engine)", () => {
  it("converts sRGB to Lab", () => {
    const [l, a, b] = toLab([20, 110, 80]);
    close(l, 41.024393);
    close(a, -33.13913);
    close(b, 9.62151);
    close(toLab([240, 236, 228])[0], 93.501556);
  });
  it("measures a colour gap", () => close(deltaE([20, 110, 80], [10, 120, 90]), 4.568546));
  it("compares two palettes", () => {
    close(paletteSimilarity(GARMENT, NEAR), 0.885881);
    close(paletteSimilarity(GARMENT, GOLD_MAIN), 0.902935);
    assert.equal(paletteSimilarity(GARMENT, []), 0);
  });
  it("finds the main colour", () => {
    assert.equal(mainColour(GARMENT)?.name, "green");
    close(mainColour(GARMENT)?.share ?? 0, 0.7);
    assert.equal(mainColour([]), null);
  });
  it("leads by the main colour: a photoshoot whose MINOR colour is green does not match", () => {
    const near = mainColourMatch(GARMENT, NEAR, 0.5, 28);
    assert.ok(near && near.near);
    close(near.points, 91.518626, 1e-3);
    const far = mainColourMatch(GARMENT, GOLD_MAIN, 0.5, 28);          // 65% gold, 25% green: its main colour is gold
    assert.ok(far && !far.near);
    close(far.points, 36.758309, 1e-3);
    close(colourPoints(GARMENT, GOLD_MAIN), 90.293487, 1e-3);          // by the whole palette it would have looked like a match
  });
  it("has no main colour when no colour covers half of the garment", () => {
    const spread3: Colour[] = [{ rgb: [20, 110, 80], percent: 40 }, { rgb: [200, 165, 70], percent: 30 }, { rgb: [240, 236, 228], percent: 30 }];
    assert.equal(mainColourMatch(spread3, NEAR, 0.5, 28), null);
  });
});

const ref = (id: string, colours: Colour[], family = "saree", skin: string | null = "fair", body: string | null = "slim"): Reference => ({ id, category_family: family, colours, skin_tone: skin, body_type: body });
const greens = (n: number) => Array.from({ length: n }, (_, i) => ref(`G${i}`, [{ name: "green", rgb: [10 + (i % 5), 112 + (i % 7), 82 + (i % 4)], percent: 55 + (i % 4) * 5 }, { name: "gold", rgb: [200, 160, 60], percent: 45 - (i % 4) * 5 }]));

describe("similar photoshoots", () => {
  const garment = { category_family: "saree", colors: GARMENT };
  it("takes the photoshoots with the same main colour and leaves the traps out", () => {
    const refs = [
      ...greens(25),
      ...Array.from({ length: 6 }, (_, i) => ref(`GOLD${i}`, GOLD_MAIN)),
      ...Array.from({ length: 4 }, (_, i) => ref(`WHITE${i}`, [{ name: "off-white", rgb: [240, 236, 228], percent: 40 }, { name: "emerald", rgb: [10, 115, 85], percent: 35 }, { name: "olive", rgb: [150, 150, 60], percent: 25 }])),
    ];
    const voters = similarPhotoshoots(garment, refs, DEFAULT_SETTINGS);
    assert.equal(voters.length, 25);
    assert.ok(voters.every((v) => v.ref.id.startsWith("G") && v.near));
    close(voters.reduce((s, v) => s + v.weight, 0), 1, 1e-9);
  });
  it("fills up to the minimum with other colours, after the right ones", () => {
    const refs = [...greens(8), ...Array.from({ length: 12 }, (_, i) => ref(`GOLD${i}`, GOLD_MAIN))];
    const voters = similarPhotoshoots(garment, refs, DEFAULT_SETTINGS);
    assert.equal(voters.length, 20);
    assert.ok(voters.slice(0, 8).every((v) => v.near));
    assert.ok(voters.slice(8).every((v) => !v.near));
  });
  it("never goes over the most voters", () => assert.equal(similarPhotoshoots(garment, greens(50), { ...DEFAULT_SETTINGS, voters: 24 }).length, 24));
  it("compares the whole palette when the garment has no main colour", () => {
    const flat: Colour[] = [{ rgb: [20, 110, 80], percent: 40 }, { rgb: [200, 165, 70], percent: 30 }, { rgb: [240, 236, 228], percent: 30 }];
    const voters = similarPhotoshoots({ category_family: "saree", colors: flat }, greens(10), DEFAULT_SETTINGS);
    assert.ok(voters.length > 0 && voters.every((v) => !v.near));
  });
});

describe("the vote", () => {
  const rows = (items: [string, string, number, number][]): NearestRow[] => items.map(([photoshoot_id, item_id, rank, likeness]) => ({ photoshoot_id, item_id, rank, likeness }));
  it("counts how many photoshoots picked each item among their nearest", () => {
    const r = rows([["p1", "A", 1, 0.9], ["p1", "B", 2, 0.8], ["p1", "C", 3, 0.7], ["p1", "D", 4, 0.6],
                    ["p2", "A", 1, 0.8], ["p2", "C", 2, 0.7], ["p2", "B", 3, 0.6], ["p2", "D", 4, 0.5],
                    ["p3", "B", 1, 0.9], ["p3", "A", 2, 0.5], ["p3", "D", 3, 0.4]]);
    const top = countPicks(r, 3, 5);
    // A and B tie on 3 picks; B is nearer on average (total likeness 2.3 against 2.2), so it comes first. D only counts where it is within the 3 nearest.
    assert.deepEqual(top.map((p) => [p.id, p.picks]), [["B", 3], ["A", 3], ["C", 2], ["D", 1]]);
    assert.ok(top.every((p) => p.of === 3));
    assert.equal(top.find((p) => p.id === "A")?.first, 2);                                          // A is the very nearest for p1 and p2
    assert.equal(top.find((p) => p.id === "B")?.first, 1);                                          // B only for p3
  });
  it("breaks a tie by the better likeness", () => {
    const top = countPicks(rows([["p1", "X", 1, 0.5], ["p1", "Y", 2, 0.9]]), 3, 5);
    assert.deepEqual(top.map((p) => p.id), ["Y", "X"]);
  });
  it("changes with the number each photoshoot picks", () => {
    const r = rows([["p1", "A", 1, 0.9], ["p1", "B", 2, 0.8], ["p2", "C", 1, 0.9], ["p2", "B", 2, 0.8]]);
    assert.equal(countPicks(r, 1, 5).find((p) => p.id === "B"), undefined);
    assert.equal(countPicks(r, 2, 5)[0].id, "B");
  });
});

describe("models", () => {
  it("keeps variety: a second model of the same kind counts a little less when choosing", () => {
    const items = [
      { id: "a", score: 1, group: "south|fair" }, { id: "b", score: 0.99, group: "south|fair" }, { id: "c", score: 0.95, group: "north|wheatish" },
    ];
    assert.deepEqual(spread(items, 2).map((i) => i.id), ["a", "c"]);               // b (0.99 x 0.92 = 0.91) falls behind c (0.95) for the second place
    assert.deepEqual(spread(items, 3).map((i) => i.id), ["a", "b", "c"]);          // asking for all three just sorts them by score
  });
  it("ranks by look, region and what the similar photoshoots used, with reasons", () => {
    const models = [
      { id: "m1", region: "south indian", look: "traditional", skinTone: "fair", bodyType: "slim" },
      { id: "m2", region: "international", look: "modern", skinTone: "dark", bodyType: "plus" },
    ];
    const voters = greens(3).map((r) => ({ ref: r, similarity: 0.9, weight: 1 / 3, near: true }));
    const [first, second] = recommendModels("saree", voters, models, 5);
    assert.equal(first.id, "m1");
    assert.ok(first.score > second.score);
    assert.ok(first.reasons.includes("Traditional look suits a saree outfit"));
    assert.ok(first.reasons.includes("South Indian styling is the first choice for a saree"));
  });
});

describe("the request", () => {
  const good = { garment: { category_family: "Saree", colors: [{ name: "Green", rgb: [20, 110, 80], percent: 70 }] } };
  it("accepts a garment and lower-cases the names", () => {
    const p = parseRequest(good);
    assert.ok(p.ok);
    assert.equal(p.garment.category_family, "saree");
    assert.equal(p.garment.colors[0].name, "green");
  });
  it("accepts options inside their limits", () => assert.deepEqual((parseRequest({ ...good, options: { nearest: 5, top: 3 } }) as { options: object }).options, { nearest: 5, top: 3 }));
  for (const [what, body] of [
    ["no garment", {}],
    ["a colour out of range", { garment: { category_family: "saree", colors: [{ rgb: [256, 0, 0] }] } }],
    ["a fractional colour", { garment: { category_family: "saree", colors: [{ rgb: [1.5, 0, 0] }] } }],
    ["no colours", { garment: { category_family: "saree", colors: [] } }],
    ["nine colours", { garment: { category_family: "saree", colors: Array(9).fill({ rgb: [1, 2, 3] }) } }],
    ["a bad percent", { garment: { category_family: "saree", colors: [{ rgb: [1, 2, 3], percent: 101 }] } }],
    ["a family with symbols", { garment: { category_family: "saree; drop table", colors: [{ rgb: [1, 2, 3] }] } }],
    ["nearest of 11", { ...good, options: { nearest: 11 } }],
    ["a non-integer top", { ...good, options: { top: 2.5 } }],
  ] as [string, unknown][]) {
    it(`refuses ${what}`, () => assert.equal(parseRequest(body).ok, false));
  }
});

describe("recommend() end to end, on a small in-memory catalogue", () => {
  const item = (id: string, kind: ItemKind, extra: Partial<CatalogueItem> = {}): CatalogueItem => ({
    id, name: `${kind} ${id}`, imageKey: `${id}.webp`, originalKey: null, analysis: { name: `the ${id}`, colors: [{ name: "ivory", rgb: [235, 225, 205], percent: 100 }] }, ...extra,
  });
  const backgrounds = new Map([["B1", item("B1", "background")], ["B2", item("B2", "background")]]);
  const jewellery = new Map([["J1", item("J1", "jewellery", { category: "Saree" })], ["J2", item("J2", "jewellery", { category: "Lehenga" })]]);
  const models: ModelItem[] = [{ id: "M1", name: "Model 1", imageKey: "m1.webp", originalKey: null, region: "south indian", look: "traditional", skinTone: "fair", bodyType: "slim" }];
  const refs = greens(10);
  const nearestRows = (kind: ItemKind): NearestRow[] =>
    refs.flatMap((r, i) => (kind === "background"
      ? [{ photoshoot_id: r.id, item_id: i < 7 ? "B1" : "B2", rank: 1, likeness: 0.8 }, { photoshoot_id: r.id, item_id: i < 7 ? "B2" : "B1", rank: 2, likeness: 0.6 }]
      : [{ photoshoot_id: r.id, item_id: "J1", rank: 1, likeness: 0.9 }, { photoshoot_id: r.id, item_id: "J2", rank: 2, likeness: 0.7 }]));
  const store: RecommendStore = {
    references: async () => refs,
    nearest: async (kind, ids, maxRank) => nearestRows(kind).filter((r) => ids.includes(r.photoshoot_id) && r.rank <= maxRank),
    catalogueCount: async (kind) => (kind === "background" ? backgrounds.size : jewellery.size),
    items: async (kind, ids) => new Map(ids.flatMap((id) => { const m = (kind === "background" ? backgrounds : jewellery).get(id); return m ? [[id, m] as const] : []; })),
    models: async () => models,
  };

  it("returns the most-picked items first, with how many photoshoots picked them", async () => {
    const r = await recommend({ category_family: "saree", colors: GARMENT }, store, { minSameFamily: 5, minVoters: 5 });
    assert.equal(r.voters, 10);
    // with 3 nearest each, both backgrounds are among every photoshoot's nearest; B1 wins the tie by being nearer on average
    assert.deepEqual(r.backgrounds.map((b) => [b.item.id, b.picked, b.of]), [["B1", 10, 10], ["B2", 10, 10]]);
    assert.equal(r.backgrounds[0].score, 100);
  });
  it("with one nearest each, the winner is the item most photoshoots had as their very nearest", async () => {
    const r = await recommend({ category_family: "saree", colors: GARMENT }, store, { minSameFamily: 5, minVoters: 5, nearest: 1 });
    assert.deepEqual(r.backgrounds.map((b) => [b.item.id, b.picked]), [["B1", 7], ["B2", 3]]);
    assert.ok(r.backgrounds[0].reasons[0].startsWith("Picked by 7 of the 10 similar photoshoots"));
  });
  it("suggests only jewellery of the garment's own category", async () => {
    const r = await recommend({ category_family: "saree", colors: GARMENT }, store, { minSameFamily: 5, minVoters: 5, nearest: 2 });
    assert.deepEqual(r.jewellery.map((j) => j.item.id), ["J1"]);                  // J2 is Lehenga jewellery: dropped
  });
  it("says so when the reference photoshoots are of another garment", async () => {
    const r = await recommend({ category_family: "lehenga", colors: GARMENT }, store, { minSameFamily: 5, minVoters: 5, nearest: 2 });
    assert.equal(r.familyMatch, false);
    assert.deepEqual(r.jewellery.map((j) => j.item.id), ["J2"]);                  // the one Lehenga set still counts
    assert.ok(r.notes.some((n) => n.includes("reference photoshoots of this garment type")));
  });
  it("recommends models even with nothing to vote on", async () => {
    const empty: RecommendStore = { ...store, references: async () => [] };
    const r = await recommend({ category_family: "saree", colors: GARMENT }, empty);
    assert.equal(r.voters, 0);
    assert.equal(r.models.length, 1);
    assert.deepEqual(r.backgrounds, []);
  });
});
