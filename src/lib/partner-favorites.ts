import type { SupabaseClient } from "@supabase/supabase-js";
import { makeupPick, r2PublicUrl } from "@/lib/r2";

/**
 * A person's favourites, for a partner site that has already established who
 * they are (Vastralook, from its own Google sign-in).
 *
 * StyleMuse keeps favourites against a StyleMuse user, so a partner cannot just
 * read "the favourites" — it has to say whose. It does that by email: both
 * sites sign people in with Google, so the same person arrives with the same
 * address. The partner route (api/partner/favorites) is what makes that safe —
 * it requires a shared secret, so only the partner's *server* can ask, and the
 * email it sends comes from the partner's own verified session, never from a
 * form a visitor could type into.
 *
 * The answer is shaped like /api/picks and /api/embed/[token] — the same
 * `{ id, name, imageUrl, originalUrl, makeup? }` — so a site that already
 * reads a pick reads a favourite with no new code.
 */

export const FAVOURITE_KINDS = ["model", "background", "jewellery", "hairstyle"] as const;
export type FavouriteKind = (typeof FAVOURITE_KINDS)[number];

export type FavouritePick = {
  id: string;
  name: string;
  /** Thumbnail. */
  imageUrl: string;
  /** Full-resolution asset, for generation. */
  originalUrl: string;
  /** Jewellery only: the makeup styled to go with it. */
  makeup?: { imageUrl: string; originalUrl: string } | null;
};

export type Favourites = Record<FavouriteKind, FavouritePick[]>;

export const emptyFavourites = (): Favourites => ({ model: [], background: [], jewellery: [], hairstyle: [] });

const TABLE: Record<FavouriteKind, string> = {
  model: "models",
  background: "backgrounds",
  jewellery: "jewellery",
  hairstyle: "hairstyles",
};

const COLUMNS: Record<FavouriteKind, string> = {
  model: "id, name, image_key, original_key",
  background: "id, name, image_key, original_key",
  jewellery: "id, name, image_key, original_key, makeup_original_key",
  hairstyle: "id, name, image_key, original_key",
};

export type ItemRow = {
  id: string;
  name: string;
  image_key: string;
  original_key: string | null;
  makeup_original_key?: string | null;
};

export function shapeItem(kind: FavouriteKind, row: ItemRow): FavouritePick {
  const pick: FavouritePick = {
    id: row.id,
    name: row.name,
    imageUrl: r2PublicUrl(row.image_key),
    originalUrl: r2PublicUrl(row.original_key ?? row.image_key),
  };
  if (kind === "jewellery") pick.makeup = makeupPick(row.makeup_original_key);
  return pick;
}

/**
 * The rows in the order they were favourited (newest first), dropping any the
 * catalogue no longer has. `ids` is already in that order; a query with `in`
 * returns rows in whatever order it likes.
 */
export function inFavouritedOrder(ids: string[], rows: ItemRow[]): ItemRow[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: ItemRow[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (row) out.push(row);
  }
  return out;
}

/** `%` and `_` are wildcards to ILIKE; an address may legally contain `_`. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Something shaped like an email, short enough to be one. Not a validity check. */
export function looksLikeEmail(value: string | null | undefined): value is string {
  if (!value || value.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * The StyleMuse profile for a Google email, matched case-insensitively and
 * exactly (the ILIKE only widens case; the equality check below is what decides).
 */
export async function findProfileByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<{ id: string; displayName: string | null } | null> {
  const wanted = email.trim().toLowerCase();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .ilike("email", escapeLike(wanted))
    .limit(5);
  const match = (data ?? []).find((p) => (p.email ?? "").toLowerCase() === wanted);
  return match ? { id: match.id as string, displayName: (match.display_name as string | null) ?? null } : null;
}

/** Every kind's favourites for one StyleMuse user, newest first. */
export async function favouritesFor(supabase: SupabaseClient, userId: string): Promise<Favourites> {
  const { data: favs } = await supabase
    .from("favorites")
    .select("item_type, item_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const idsByKind: Record<FavouriteKind, string[]> = { model: [], background: [], jewellery: [], hairstyle: [] };
  for (const f of favs ?? []) {
    const kind = f.item_type as FavouriteKind;
    if (kind in idsByKind) idsByKind[kind].push(f.item_id as string);
  }
  return favouritesFromIds(supabase, idsByKind);
}

/** Resolve ids to items, per kind. Split out so it can be exercised without a user. */
export async function favouritesFromIds(
  supabase: SupabaseClient,
  idsByKind: Record<FavouriteKind, string[]>,
): Promise<Favourites> {
  const out = emptyFavourites();
  await Promise.all(
    FAVOURITE_KINDS.map(async (kind) => {
      const ids = idsByKind[kind];
      if (!ids.length) return;
      const { data } = await supabase.from(TABLE[kind]).select(COLUMNS[kind]).in("id", ids);
      const rows = (data ?? []) as unknown as ItemRow[];
      out[kind] = inFavouritedOrder(ids, rows).map((row) => shapeItem(kind, row));
    }),
  );
  return out;
}
