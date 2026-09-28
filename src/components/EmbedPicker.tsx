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

export type EmbedItem = {
  id: string;
  name: string;
  /** Thumbnail, which is what this grid draws. */
  imageUrl: string;
  /** Full-resolution asset, for whatever the host page generates with. */
  originalUrl: string;
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
  kind: "model" | "background";
  items: EmbedItem[];
  targetOrigin: string;
  clientName: string;
}) {
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
          <h1>Pick a {kind}</h1>
          <p>
            for <b>{clientName}</b>
          </p>
        </div>
        <input
          type="search"
          className="embedpicker__search"
          placeholder={`Search ${kind}s`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={`Search ${kind}s`}
        />
      </header>

      {shown.length === 0 ? (
        <p className="embedpicker__empty">Nothing matches “{query}”.</p>
      ) : (
        <ul className="embedpicker__grid">
          {shown.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`embedpicker__card${sent === item.id ? " is-sent" : ""}`}
                onClick={() => pick(item)}
                disabled={sent !== null}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt="" loading="lazy" />
                <span>{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
