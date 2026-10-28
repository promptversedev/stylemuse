"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/IconSprite";
import { FilterSelect, filterStyles as fs } from "@/components/FilterSelect";
import { createClient } from "@/lib/supabase/client";

export type BackgroundPickerItem = {
  id: string;
  name: string;
  /** The descriptive name, e.g. "Neoclassical Beige Pavilion with …". */
  title: string | null;
  imageUrl: string;
  category: string | null;
  /** Indoor / Outdoor / Studio / Indoor-Outdoor Transitional. */
  environment: string | null;
};

/** The values present with how many of each, most common first. */
function counted(list: BackgroundPickerItem[], key: "environment" | "category", keep: string | null) {
  const counts = new Map<string, number>();
  for (const b of list) {
    const v = b[key];
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  // An option chosen earlier stays listed, at 0, rather than vanishing.
  if (keep && !counts.has(keep)) counts.set(keep, 0);
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, count }));
}

/** Lower-cased words, split the same way the database splits them. */
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).slice(0, 8);

/**
 * The search rule, run here as well as in the database: every word typed must
 * begin a word of the title. It is the same rule search_backgrounds applies
 * through the title tsvector (migration 0008), so the two always agree.
 */
function titleMatches(title: string | null, typed: string[]) {
  if (!title) return false;
  const titleWords = words(title);
  return typed.every((t) => titleWords.some((w) => w.startsWith(t)));
}

const SEARCH_DELAY_MS = 120;

export function BackgroundPicker({
  items,
  favoritedIds,
  selectedId,
  isAuthed,
  onSelect,
  onToggleFavorite,
}: {
  items: BackgroundPickerItem[];
  favoritedIds: Set<string>;
  selectedId: string | null;
  isAuthed: boolean;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  /** The database's ranking for `rankedFor`: id -> position, best first. */
  const [ranked, setRanked] = useState<{ q: string; order: Map<string, number> } | null>(null);
  const [environment, setEnvironment] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  const typed = useMemo(() => words(query), [query]);
  const q = typed.join(" ");

  /**
   * Matches show the moment a key is pressed, from the titles already on the
   * page; the database (title tsvector + GIN index) then supplies the
   * best-match-first order a moment later. A stale answer — for something
   * typed earlier — is ignored.
   */
  useEffect(() => {
    if (!q) return;
    let stale = false;
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("search_backgrounds", { q });
      if (stale || error) return;
      setRanked({ q, order: new Map((data as { id: string }[]).map((row, i) => [row.id, i])) });
    }, SEARCH_DELAY_MS);
    return () => {
      stale = true;
      window.clearTimeout(timer);
    };
  }, [q, supabase]);

  const order = ranked && ranked.q === q ? ranked.order : null;

  // Search narrows the list first; the dropdowns and their counts then work
  // within what it found, so a count always matches what the grid will show.
  const searched = useMemo(
    () => (typed.length ? items.filter((b) => titleMatches(b.title, typed)) : items),
    [items, typed],
  );
  const inEnvironment = useMemo(
    () => searched.filter((b) => !environment || b.environment === environment),
    [searched, environment],
  );
  const filtered = inEnvironment.filter((b) => !category || b.category === category);

  // Favourites stay pinned first; within each group a search shows the best
  // match first, and otherwise the grid keeps its own order.
  const sorted = [...filtered].sort((a, b) => {
    const fav = (favoritedIds.has(a.id) ? 0 : 1) - (favoritedIds.has(b.id) ? 0 : 1);
    if (fav || !order) return fav;
    return (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity);
  });

  const anyFilter = Boolean(q || environment || category);

  return (
    <section className="panel__section">
      <div className={`filters ${fs.bar}`}>
        <label className={fs.search}>
          <span className="sr-only">Search backgrounds by title</span>
          <svg className={fs.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            className={fs.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="Search by title…"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button type="button" className={fs.searchClear} onClick={() => setQuery("")} aria-label="Clear search">
              ×
            </button>
          )}
        </label>

        <FilterSelect
          label="Setting"
          value={environment}
          options={counted(searched, "environment", environment)}
          total={searched.length}
          onChange={setEnvironment}
        />
        <FilterSelect
          label="Style"
          value={category}
          options={counted(inEnvironment, "category", category)}
          total={inEnvironment.length}
          onChange={setCategory}
        />

        {anyFilter && (
          <button
            type="button"
            className={fs.clear}
            onClick={() => {
              setQuery("");
              setEnvironment(null);
              setCategory(null);
            }}
          >
            Clear all
          </button>
        )}
      </div>

      <div className="picker">
        <ul className="picker__grid picker__grid--bg">
          {sorted.map((bg) => {
            const isFav = favoritedIds.has(bg.id);
            const isSelected = selectedId === bg.id;
            return (
              <li key={bg.id}>
                <button
                  type="button"
                  className="tile tile--bg"
                  aria-pressed={isSelected}
                  title={[bg.title ?? bg.name, bg.category, bg.environment].filter(Boolean).join(" · ")}
                  onClick={() => onSelect(bg.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="tile__media"
                    src={bg.imageUrl}
                    alt={bg.title ?? bg.name}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="tile__name">{bg.name}</span>
                  <span className="tile__check">
                    <Icon id="i-check" />
                  </span>
                  <span
                    role="button"
                    tabIndex={-1}
                    className="tile__fav"
                    aria-pressed={isFav}
                    aria-label={isFav ? "Remove favorite" : "Add favorite"}
                    title={isAuthed ? undefined : "Sign in with Google to favorite"}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFavorite(bg.id);
                    }}
                  >
                    <Icon id="i-heart" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {sorted.length === 0 && (
          <p className="picker__empty">
            {q ? `No background title matches “${query.trim()}”.` : "No background matches these filters."}
          </p>
        )}
      </div>
    </section>
  );
}
