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
   * One catalogue row carries both images so the pairing cannot come apart —
   * there is no separate makeup id to resolve, and choosing the row chooses
   * both. It travels with the pick for the same reason.
   */
  makeup?: { imageUrl: string; originalUrl: string } | null;
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

export function EmbedPicker({
  kind,
  items,
  targetOrigin,
  clientName,
}: {
  kind: EmbedKind;
  items: EmbedItem[];
  targetOrigin: string;
  clientName: string;
}) {
  const words = KIND_WORDS[kind] ?? KIND_WORDS.model;
  const [query, setQuery] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  // Tell the opener we are up, so it can drop a spinner and know the popup was
  // not blocked. Same origin discipline as the pick itself.
  useEffect(() => {
    window.opener?.postMessage({ type: READY_TYPE, kind }, targetOrigin);
  }, [kind, targetOrigin]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  }, [items, query]);

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
        },
      },
      targetOrigin,
    );
    // A beat so the tick is visible, then get out of the way.
    window.setTimeout(() => window.close(), 220);
  };

  return (
    <main className="embedpicker">
      <header className="embedpicker__head">
        <div>
          <h1>Pick {words.one}</h1>
          <p>
            for <b>{clientName}</b>
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

      {shown.length === 0 ? (
        <p className="embedpicker__empty">Nothing matches “{query}”.</p>
      ) : (
        <ul className={`embedpicker__grid embedpicker__grid--${kind}`}>
          {shown.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`embedpicker__card${sent === item.id ? " is-sent" : ""}`}
                onClick={() => pick(item)}
                disabled={sent !== null}
              >
                {item.makeup ? (
                  // The makeup is part of the pick, so it is shown beside the
                  // jewellery rather than hidden behind it.
                  <span className="embedpicker__pair">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageUrl} alt="" loading="lazy" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.makeup.imageUrl} alt="" loading="lazy" />
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" loading="lazy" />
                )}
                <span>{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
