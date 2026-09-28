import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { r2PublicUrl } from "@/lib/r2";

/**
 * GET /api/picks?model=<id>&background=<id> — resolve catalogue ids to items.
 *
 * The sibling of /api/embed/[token], for people who have not signed in. That
 * route answers "what does this *user* currently have selected", which needs a
 * profile and so a login. This one answers "what are these two items", which
 * needs neither: `models` and `backgrounds` are public catalogue tables, and
 * the ids arrive from the picker the caller just used.
 *
 * So the Studio hand-off works signed-out — the ids ride back in the return
 * url and are resolved here — while signing in still buys the thing a login is
 * actually for: a pick that persists and follows you to another device.
 *
 * CORS is open for the same reason it is on the embed route: this is meant to
 * be read from another origin, and it discloses nothing a visitor to the
 * catalogue cannot already see.
 */
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/** Ids come from a url, so they are checked before they reach a query. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const modelId = params.get("model");
  const backgroundId = params.get("background");

  if ((modelId && !UUID.test(modelId)) || (backgroundId && !UUID.test(backgroundId))) {
    return NextResponse.json({ error: "Bad id" }, { status: 400, headers: corsHeaders() });
  }
  if (!modelId && !backgroundId) {
    return NextResponse.json(
      { displayName: null, model: null, background: null, updatedAt: null },
      { headers: corsHeaders() },
    );
  }

  const supabase = createAdminClient();
  const [modelRow, backgroundRow] = await Promise.all([
    modelId
      ? supabase
          .from("models")
          .select("id, name, image_key, original_key")
          .eq("id", modelId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    backgroundId
      ? supabase
          .from("backgrounds")
          .select("id, name, image_key, original_key")
          .eq("id", backgroundId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  /**
   * Two urls, deliberately.
   *
   * `imageUrl` is the thumbnail the catalogue grids draw. `originalUrl` is the
   * full-resolution asset, which is what a generation pipeline should feed a
   * model — see migration 0002, which added the column for exactly this. They
   * are ~40KB and ~250KB respectively, so sending the thumbnail to a generator
   * quietly costs output quality.
   *
   * `original_key` is backfilled for every row today, but it stays nullable
   * here: a row imported without one should degrade to the thumbnail rather
   * than fail the request.
   */
  const shape = (
    row: { id: string; name: string; image_key: string; original_key: string | null } | null,
  ) =>
    row
      ? {
          id: row.id,
          name: row.name,
          imageUrl: r2PublicUrl(row.image_key),
          originalUrl: r2PublicUrl(row.original_key ?? row.image_key),
        }
      : null;

  // Same shape as /api/embed/[token], so a caller can treat the two alike.
  return NextResponse.json(
    {
      displayName: null,
      model: shape(
        modelRow.data as {
          id: string;
          name: string;
          image_key: string;
          original_key: string | null;
        } | null,
      ),
      background: shape(
        backgroundRow.data as {
          id: string;
          name: string;
          image_key: string;
          original_key: string | null;
        } | null,
      ),
      updatedAt: null,
    },
    { headers: corsHeaders() },
  );
}
