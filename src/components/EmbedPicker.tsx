"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * The grid shown inside the embed popup.
 *
 * Its only job is to hand one item back to the opener. `targetOrigin` was
 * decided on the server from the client's allowlist and is passed to every
 * postMessage — never "*", which would broadcast the pick to whatever page
 * happens to be listening.
 */

/** The catalogues this picker can show. */
export type EmbedKind = "model" | "background" | "jewellery" | "hairstyle";

export type EmbedItem = {
  id: string;
  name: string;
  /** Thumbnail, which is what this grid draws. */
  imageUrl: string;
  /** Full-resolution asset, for whatever the host page generates with. */
  originalUrl: string;
  /**
   * The makeup look styled to go with this pick. Jewellery only.
   *
   * Never drawn here — it exists only as an original, for generation — but it
   * travels with the pick because it shares the jewellery's catalogue row, so
   * choosing the row chooses both. See makeupPick for why imageUrl is set.
   */
  makeup?: { imageUrl: string; originalUrl: string } | null;
  /** e.g. "Saree" or "Lehenga" for jewellery; null where a kind has none. */
  category?: string | null;
};

/**
 * How each kind is written in the heading and the search box.
 *
 * Spelled out rather than built by adding an "s": "jewellery" is already
 * plural and takes no article, so `Pick a jewellery` / `Search jewellerys`
 * is what a naive rule produces.
 */
const KIND_WORDS: Record<EmbedKind, { one: string; many: string }> = {
  model: { one: "a model", many: "models" },
  background: { one: "a background", many: "backgrounds" },
  jewellery: { one: "jewellery", many: "jewellery" },
  hairstyle: { one: "a hairstyle", many: "hairstyles" },
};

/** Namespaced so a host page can tell our messages from anyone else's. */
const MESSAGE_TYPE = "stylemuse:pick";
const READY_TYPE = "stylemuse:ready";
/**
 * Sent by the opener after READY: the ids of this person's favourites, which
 * the opener already knows (it matched them by the signed-in email, server to
 * server). Only ids travel — everything drawn comes from this page's own
 * catalogue, so a message cannot put anything on screen that is not ours.
 */
const FAVOURITES_TYPE = "stylemuse:favourites";

export function EmbedPicker({
  kind,
  category = null,
  items,
  targetOrigin,
  clientName,
}: {
  kind: EmbedKind;
  /** The category the opener asked for, already applied to `items`. */
  category?: string | null;
  items: EmbedItem[];
  targetOrigin: string;
  clientName: string;
}) {
  const base = KIND_WORDS[kind] ?? KIND_WORDS.model;
  // "Pick lehenga jewellery" reads right; for other kinds the category is
  // shown beside the client name instead of being forced into the sentence.
  const words =
    category && kind === "jewellery"
      ? { one: `${category.toLowerCase()} jewellery`, many: `${category.toLowerCase()} jewellery` }
      : base;
  const [query, setQuery] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);

  // The opener's list of favourite ids. Accepted only from the opener window
  // at the allowed origin, and only as an array of strings.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== targetOrigin || event.source !== window.opener) return;
      const data = event.data as { type?: string; kind?: string; ids?: unknown } | null;
      if (!data || data.type !== FAVOURITES_TYPE || data.kind !== kind) return;
      if (!Array.isArray(data.ids)) return;
      setFavouriteIds(data.ids.filter((id): id is string => typeof id === "string").slice(0, 200));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [kind, targetOrigin]);

  // Tell the opener we are up, so it can drop a spinner and know the popup was
  // not blocked. Same origin discipline as the pick itself.
  useEffect(() => {
    window.opener?.postMessage({ type: READY_TYPE, kind }, targetOrigin);
  }, [kind, targetOrigin]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  }, [items, query]);

  // Favourites first, in the order they were favourited (newest first), then
  // everything else. An id this catalogue no longer has is simply skipped.
  const { favourites, others } = useMemo(() => {
    const byId = new Map(shown.map((i) => [i.id, i]));
    const fav = favouriteIds.map((id) => byId.get(id)).filter((i): i is EmbedItem => !!i);
    const favSet = new Set(fav.map((i) => i.id));
    return { favourites: fav, others: shown.filter((i) => !favSet.has(i.id)) };
  }, [shown, favouriteIds]);

  const pick = (item: EmbedItem) => {
    setSent(item.id);
    window.opener?.postMessage(
      {
        type: MESSAGE_TYPE,
        kind,
        item: {
          id: item.id,
          name: item.name,
          imageUrl: item.imageUrl,
          originalUrl: item.originalUrl,
          // Only jewellery has one; sending null keeps the shape constant so
          // a host page never has to guess whether the field was forgotten.
          makeup: item.makeup ?? null,
          category: item.category ?? null,
        },
      },
      targetOrigin,
    );
    // A beat so the tick is visible, then get out of the way.
    window.setTimeout(() => window.close(), 220);
  };

  const renderGrid = (list: EmbedItem[], favourite: boolean) => (
    <ul className={`embedpicker__grid embedpicker__grid--${kind}`}>
      {list.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={`embedpicker__card${sent === item.id ? " is-sent" : ""}${favourite ? " is-favourite" : ""}`}
            onClick={() => pick(item)}
            disabled={sent !== null}
          >
            {favourite && (
              <span className="embedpicker__heart" aria-hidden="true">
                ♥
              </span>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt="" loading="lazy" />
            <span>{item.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <main className="embedpicker">
      <header className="embedpicker__head">
        <div>
          <h1>Pick {words.one}</h1>
          <p>
            for <b>{clientName}</b>
            {category && kind !== "jewellery" && <> · {category}</>}
          </p>
        </div>
        <input
          type="search"
          className="embedpicker__search"
          placeholder={`Search ${words.many}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={`Search ${words.many}`}
        />
      </header>

      {items.length === 0 ? (
        <p className="embedpicker__empty">No {words.many} here yet.</p>
      ) : shown.length === 0 ? (
        <p className="embedpicker__empty">Nothing matches “{query}”.</p>
      ) : (
        <>
          {favourites.length > 0 && (
            <section aria-label="Your favourites">
              <h2 className="embedpicker__section">
                <span aria-hidden="true">♥</span> Your favourites
              </h2>
              {renderGrid(favourites, true)}
            </section>
          )}
          {others.length > 0 && (
            <section aria-label={favourites.length > 0 ? `All ${words.many}` : undefined}>
              {favourites.length > 0 && (
                <h2 className="embedpicker__section">All {words.many}</h2>
              )}
              {renderGrid(others, false)}
            </section>
          )}
        </>
      )}
    </main>
  );
}
