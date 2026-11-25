"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEmbedFilters } from "@/components/EmbedFilters";
import { filterStyles } from "@/components/FilterSelect";

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
  /** Backgrounds: the descriptive title, searched alongside the name. */
  title?: string | null;
  /** Backgrounds: Indoor / Outdoor / Studio / Indoor-Outdoor Transitional. */
  environment?: string | null;
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
/**
 * Sent by the opener after READY: the ids this site recommends for the garment it is working on, in package order
 * (package 1 first), with the package number of each. Like the favourites, only ids travel: everything drawn comes from
 * this page's own catalogue, so a message cannot put anything on screen that is not ours.
 */
const RECOMMENDED_TYPE = "stylemuse:recommended";
/** At most this many are shown at the top (the opener sends five packages). */
const MAX_RECOMMENDED = 8;

/**
 * The window to talk to: the page that opened this one as a popup, or, when this page is shown in a frame (the
 * host's full-screen sheet on a phone), the page holding the frame. The target origin is checked either way.
 */
function hostWindow(): Window | null {
  if (window.opener) return window.opener as Window;
  return window.parent !== window ? window.parent : null;
}

/**
 * How many tiles are drawn at first, and added each time the end of the grid comes into view. The catalogue can
 * run to hundreds of pictures; drawing them all at once made the browser fetch every one and left the grid half
 * empty while they arrived. Favourites come first, so they are always within the first page.
 */
const PAGE_SIZE = 24;

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
  /** The ids recommended by the opener, and the package number each belongs to (same order). */
  const [recommended, setRecommended] = useState<{ ids: string[]; numbers: number[] }>({ ids: [], numbers: [] });
  const [limit, setLimit] = useState(PAGE_SIZE);

  // The opener's list of favourite ids. Accepted only from the window that opened this one (or, framed in the host
  // page's own sheet, the page holding the frame) at the allowed origin, and only as an array of strings.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== targetOrigin || event.source !== hostWindow()) return;
      const data = event.data as { type?: string; kind?: string; ids?: unknown; numbers?: unknown } | null;
      if (!data || data.kind !== kind || !Array.isArray(data.ids)) return;
      if (data.type === FAVOURITES_TYPE) {
        setFavouriteIds(data.ids.filter((id): id is string => typeof id === "string").slice(0, 200));
      } else if (data.type === RECOMMENDED_TYPE) {
        const numbers = Array.isArray(data.numbers) ? data.numbers : [];
        const ids: string[] = [];
        const nums: number[] = [];
        data.ids.slice(0, MAX_RECOMMENDED).forEach((id, i) => {
          if (typeof id !== "string") return;
          ids.push(id);
          nums.push(typeof numbers[i] === "number" && Number.isInteger(numbers[i]) ? (numbers[i] as number) : i + 1);
        });
        setRecommended({ ids, numbers: nums });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [kind, targetOrigin]);

  // Tell the opener we are up, so it can drop a spinner and know the popup was
  // not blocked. Same origin discipline as the pick itself.
  useEffect(() => {
    hostWindow()?.postMessage({ type: READY_TYPE, kind }, targetOrigin);
  }, [kind, targetOrigin]);

  // Search by name or title words, then the Setting / Style dropdowns.
  const { filtered: shown, controls: filterControls } = useEmbedFilters(items, query, {
    categoryLabel: kind === "background" ? "Style" : "Category",
  });

  // The recommended ones first (package order), then favourites in the order they were favourited (newest first), then
  // everything else. An id this catalogue no longer has is simply skipped, and an item is shown once: where it is
  // recommended, not again under favourites or in the rest.
  const { recommendedItems, favourites, others } = useMemo(() => {
    const byId = new Map(shown.map((i) => [i.id, i]));
    const recs: { item: EmbedItem; n: number }[] = [];
    recommended.ids.forEach((id, i) => {
      const item = byId.get(id);
      if (item && !recs.some((r) => r.item.id === id)) recs.push({ item, n: recommended.numbers[i] });
    });
    const recSet = new Set(recs.map((r) => r.item.id));
    const fav = favouriteIds.map((id) => byId.get(id)).filter((i): i is EmbedItem => !!i && !recSet.has(i.id));
    const taken = new Set([...recSet, ...fav.map((i) => i.id)]);
    return { recommendedItems: recs, favourites: fav, others: shown.filter((i) => !taken.has(i.id)) };
  }, [shown, favouriteIds, recommended]);

  // One page window over favourites-then-the-rest: favourites fill it first, the others take what is left.
  const total = favourites.length + others.length;
  const shownFavourites = favourites.slice(0, limit);
  const shownOthers = others.slice(0, Math.max(0, limit - favourites.length));
  const remaining = Math.max(0, total - limit);

  // Scrolling near the end of the grid adds the next page, so there is nothing to press. The observer is set up
  // again after every page: if the end is still in view (a tall screen, a short page), it adds another at once.
  const endMarker = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = endMarker.current;
    if (!el || remaining <= 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setLimit((n) => n + PAGE_SIZE);
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [remaining, limit]);

  const pick = (item: EmbedItem) => {
    setSent(item.id);
    hostWindow()?.postMessage(
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
    // A beat so the tick is visible, then get out of the way. In a popup that means closing it; framed in the
    // host's sheet, the host closes the sheet when it receives the pick.
    if (window.opener) window.setTimeout(() => window.close(), 220);
  };

  const renderGrid = (list: EmbedItem[], favourite: boolean, numbers?: number[]) => (
    <ul className={`embedpicker__grid embedpicker__grid--${kind}`}>
      {list.map((item, index) => (
        <li key={item.id}>
          <button
            type="button"
            className={`embedpicker__card${sent === item.id ? " is-sent" : ""}${favourite ? " is-favourite" : ""}${numbers ? " is-recommended" : ""}`}
            onClick={() => pick(item)}
            disabled={sent !== null}
          >
            {favourite && (
              <span className="embedpicker__heart" aria-hidden="true">
                ♥
              </span>
            )}
            {numbers && (
              <span className="embedpicker__package" title={`Package ${numbers[index]}`}>
                {numbers[index]}
              </span>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt="" loading="lazy" decoding="async" />
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
        {filterControls && <div className={filterStyles.embedSlot}>{filterControls}</div>}
        <input
          type="search"
          className="embedpicker__search"
          placeholder={`Search ${words.many}`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE_SIZE);
          }}
          aria-label={`Search ${words.many}`}
        />
      </header>

      {items.length === 0 ? (
        <p className="embedpicker__empty">No {words.many} here yet.</p>
      ) : shown.length === 0 ? (
        <p className="embedpicker__empty">Nothing matches “{query}”.</p>
      ) : (
        <>
          {recommendedItems.length > 0 && (
            <section aria-label="AI recommended for your garment" className="embedpicker__recommended">
              <h2 className="embedpicker__section">
                <span aria-hidden="true">✦</span> AI recommended
                <small>the same numbers as the packages in the studio</small>
              </h2>
              {renderGrid(recommendedItems.map((r) => r.item), false, recommendedItems.map((r) => r.n))}
            </section>
          )}
          {shownFavourites.length > 0 && (
            <section aria-label="Your favourites">
              <h2 className="embedpicker__section">
                <span aria-hidden="true">♥</span> Your favourites
              </h2>
              {renderGrid(shownFavourites, true)}
            </section>
          )}
          {shownOthers.length > 0 && (
            <section aria-label={favourites.length > 0 ? `All ${words.many}` : undefined}>
              {favourites.length > 0 && (
                <h2 className="embedpicker__section">All {words.many}</h2>
              )}
              {renderGrid(shownOthers, false)}
            </section>
          )}
          {remaining > 0 ? (
            <div ref={endMarker} className="embedpicker__more" role="status" aria-live="polite">
              <span className="embedpicker__more-dots" aria-hidden="true" />
              <p>
                Showing {total - remaining} of {total}
              </p>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
