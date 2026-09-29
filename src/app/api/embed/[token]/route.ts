import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { makeupPick, r2PublicUrl } from "@/lib/r2";

// Public, unauthenticated endpoint. Any website can call this with a
// person's public_token (copied from their "Get embed code" panel) to show
// "what they currently have selected" on Swap Model & BG — the cross-site
// compatibility feature. CORS is open on purpose: this is meant to be
// fetched from arbitrary third-party origins via embed.js.
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("public_token", token)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Unknown token" },
      { status: 404, headers: corsHeaders() }
    );
  }

  const { data: selectionRow } = await supabase
    .from("selections")
    .select(
      "model_id, background_id, jewellery_id, hairstyle_id, updated_at, " +
        "models(name, image_key, original_key), " +
        "backgrounds(name, image_key, original_key), " +
        "jewellery(name, image_key, original_key, makeup_original_key), " +
        "hairstyles(name, image_key, original_key)",
    )
    .eq("user_id", profile.id)
    .maybeSingle();

  // PostgREST returns each joined row as an object (to-one relationships via
  // the *_id foreign keys), but without generated Database types the client
  // can only infer it generically — cast to the real shape instead of
  // duplicating a codegen step here.
  const selection = selectionRow as unknown as {
    model_id: string | null;
    background_id: string | null;
    jewellery_id: string | null;
    hairstyle_id: string | null;
    updated_at: string;
    models: { name: string; image_key: string; original_key: string | null } | null;
    backgrounds: { name: string; image_key: string; original_key: string | null } | null;
    jewellery: {
      name: string;
      image_key: string;
      original_key: string | null;
      makeup_original_key: string | null;
    } | null;
    hairstyles: { name: string; image_key: string; original_key: string | null } | null;
  } | null;

  // `imageUrl` is the thumbnail to draw; `originalUrl` is the full-resolution
  // asset a generation pipeline should consume. Same contract as /api/picks.
  const model = selection?.models
    ? {
        id: selection.model_id,
        name: selection.models.name,
        imageUrl: r2PublicUrl(selection.models.image_key),
        originalUrl: r2PublicUrl(selection.models.original_key ?? selection.models.image_key),
      }
    : null;

  const background = selection?.backgrounds
    ? {
        id: selection.background_id,
        name: selection.backgrounds.name,
        imageUrl: r2PublicUrl(selection.backgrounds.image_key),
        originalUrl: r2PublicUrl(
          selection.backgrounds.original_key ?? selection.backgrounds.image_key,
        ),
      }
    : null;

  // A jewellery pick is one row carrying the jewellery and the makeup styled
  // to go with it. The makeup rides along here so a consuming site (Vastralook
  // or anyone else) always gets both — there is no separate makeup id to look
  // up. It has no thumbnail; see makeupPick.
  const jewellery = selection?.jewellery
    ? {
        id: selection.jewellery_id,
        name: selection.jewellery.name,
        imageUrl: r2PublicUrl(selection.jewellery.image_key),
        originalUrl: r2PublicUrl(
          selection.jewellery.original_key ?? selection.jewellery.image_key,
        ),
        makeup: makeupPick(selection.jewellery.makeup_original_key),
      }
    : null;

  const hairstyle = selection?.hairstyles
    ? {
        id: selection.hairstyle_id,
        name: selection.hairstyles.name,
        imageUrl: r2PublicUrl(selection.hairstyles.image_key),
        originalUrl: r2PublicUrl(
          selection.hairstyles.original_key ?? selection.hairstyles.image_key,
        ),
      }
    : null;

  return NextResponse.json(
    {
      displayName: profile.display_name,
      model,
      background,
      jewellery,
      hairstyle,
      updatedAt: selection?.updated_at ?? null,
    },
    { headers: corsHeaders() }
  );
}
