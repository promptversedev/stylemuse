import { NextResponse } from "next/server";
import { partnerGate } from "@/lib/partner-auth";
import { makeupPick, r2PublicUrl } from "@/lib/r2";
import { createAdminClient } from "@/lib/supabase/server";
import { recommend, type CatalogueItem, type ModelItem, type PackageModel, type PackagePart, type RankedItem } from "@/lib/recommend";
import { MAX_BODY_BYTES, parseRequest } from "@/lib/recommend/request";
import { createSupabaseStore } from "@/lib/recommend/store";

/**
 * POST /api/partner/recommend
 * Authorization: Bearer <VASTRALOOK_PARTNER_SECRET>
 *
 * Which StyleMuse backgrounds, jewellery sets and models go with a garment. The partner (Vastralook) has analysed the garment picture and
 * sends what the analysis found; this answers with catalogue items in the same shape /api/picks uses, so the partner can show them and
 * let the person pick one without another round trip.
 *
 *   body   { garment: { category_family, colors: [{ name?, rgb, percent? }] }, options?: { nearest, voters, minVoters, top } }
 *   answer { familyMatch, voters, sameColourVoters, settings, notes, backgrounds: [...], jewellery: [...], models: [...],
 *            packages: [{ n, photoshootId, similarity, score, model, background, jewellery }] }   (up to five, best first)
 *          familyMatch false = too few reference photoshoots of this garment type exist (a lehenga today), so the advice is weaker
 *
 * How it decides is in src/lib/recommend (and supabase/RECOMMEND-QUERIES.md): the similar reference photoshoots by main colour, then
 * each one's nearest StyleMuse items are counted. Not public, like /api/partner/favorites: it needs the shared secret, it sends no CORS
 * headers, and with the secret unset it answers 503.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function card(r: RankedItem) {
  return {
    id: r.item.id,
    name: r.item.name,
    title: r.title,
    imageUrl: r2PublicUrl(r.item.imageKey),
    originalUrl: r2PublicUrl(r.item.originalKey ?? r.item.imageKey),
    score: r.score,
    picked: r.picked,
    of: r.of,
    reasons: r.reasons,
    facts: r.facts,
  };
}

const analysisTitle = (item: CatalogueItem): string | null => {
  const name = item.analysis?.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
};

/** One part of a package: the catalogue item in the same shape as the lists above, scored by how alike it is to its photoshoot's own. */
function packageCard(part: PackagePart | null, jewellery = false) {
  if (!part) return null;
  const { item } = part;
  return {
    id: item.id,
    name: item.name,
    title: analysisTitle(item),
    imageUrl: r2PublicUrl(item.imageKey),
    originalUrl: r2PublicUrl(item.originalKey ?? item.imageKey),
    score: part.likeness,
    rank: part.rank,
    reasons: part.reasons,
    ...(jewellery ? { category: item.category ?? null, makeup: makeupPick(item.makeupOriginalKey) } : {}),
  };
}

function packageModel(m: PackageModel | null) {
  if (!m) return null;
  const item: ModelItem = m.item;
  return {
    id: item.id,
    name: item.name,
    imageUrl: r2PublicUrl(item.imageKey),
    originalUrl: r2PublicUrl(item.originalKey ?? item.imageKey),
    score: m.score,
    reasons: m.reasons,
  };
}

export async function POST(request: Request) {
  const blocked = partnerGate(request);
  if (blocked) return blocked;

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Body too large" }, { status: 413, headers: NO_STORE });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400, headers: NO_STORE });
  }
  const parsed = parseRequest(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400, headers: NO_STORE });

  try {
    const result = await recommend(parsed.garment, createSupabaseStore(createAdminClient()), parsed.options);
    return NextResponse.json(
      {
        familyMatch: result.familyMatch,
        voters: result.voters,
        sameColourVoters: result.sameColourVoters,
        settings: result.settings,
        notes: result.notes,
        backgrounds: result.backgrounds.map(card),
        jewellery: result.jewellery.map((r) => ({
          ...card(r),
          category: r.item.category ?? null,
          // The makeup rides along with its jewellery, exactly as /api/picks returns it.
          makeup: makeupPick(r.item.makeupOriginalKey),
        })),
        // Up to five model + background + jewellery combinations, best first (see src/lib/recommend/packages.ts).
        packages: result.packages.map((p, i) => ({
          n: i + 1,
          photoshootId: p.photoshootId,
          similarity: p.similarity,
          score: p.score,
          model: packageModel(p.model),
          background: packageCard(p.background),
          jewellery: packageCard(p.jewellery, true),
        })),
        models: result.models.map((m) => ({
          id: m.item.id,
          name: m.item.name,
          imageUrl: r2PublicUrl(m.item.imageKey),
          originalUrl: r2PublicUrl(m.item.originalKey ?? m.item.imageKey),
          score: m.score,
          reasons: m.reasons,
        })),
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error("POST /api/partner/recommend failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not work out a recommendation" }, { status: 502, headers: NO_STORE });
  }
}
