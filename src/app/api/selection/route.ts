import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The signed-in user's current model/background pick — this is the row the
// public embed endpoint (/api/embed/[token]) reads to show the selection on
// other websites, so it only persists for signed-in users.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ selection: null });
  }

  const { data, error } = await supabase
    .from("selections")
    .select("model_id, background_id, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ selection: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { modelId, backgroundId } = body as {
    modelId?: string | null;
    backgroundId?: string | null;
  };

  const { error } = await supabase.from("selections").upsert(
    {
      user_id: user.id,
      ...(modelId !== undefined ? { model_id: modelId } : {}),
      ...(backgroundId !== undefined ? { background_id: backgroundId } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
