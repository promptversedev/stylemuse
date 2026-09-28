import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Current user's favorites, used to hydrate "pinned to top" state on load.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ favorites: [] });
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("item_type, item_id")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ favorites: data });
}

// Toggles a favorite on/off. Requires Google sign-in.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const itemType = body?.itemType;
  const itemId = body?.itemId;

  const VALID_TYPES = ["model", "background", "jewellery", "hairstyle"];
  if (!VALID_TYPES.includes(itemType) || typeof itemId !== "string" || !itemId) {
    return NextResponse.json({ error: "Invalid itemType/itemId" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ favorited: false });
  }

  const { error } = await supabase
    .from("favorites")
    .insert({ user_id: user.id, item_type: itemType, item_id: itemId });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ favorited: true });
}
