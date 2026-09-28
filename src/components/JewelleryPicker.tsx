"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/IconSprite";

// One tile is one look: the jewellery shot and the makeup styled to go with
// it. There is no separate makeup grid — picking a jewellery tile picks both,
// because they are one row, not two rows joined by an id.
export type JewelleryPickerItem = {
  id: string;
  name: string;
  jewelleryImageUrl: string;
  makeupImageUrl: string;
  category: string | null;
};

export function JewelleryPicker({
  items,
  favoritedIds,
  selectedId,
  isAuthed,
  onSelect,
  onToggleFavorite,
}: {
  items: JewelleryPickerItem[];
  favoritedIds: Set<string>;
  selectedId: string | null;
  isAuthed: boolean;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const [group, setGroup] = useState<string | null>(null);

  const groups = useMemo(() => {
    const present = new Set(items.map((j) => j.category).filter(Boolean) as string[]);
    return [...present].sort();
  }, [items]);

  const filtered = items.filter((j) => !group || j.category === group);

  const sorted = [...filtered].sort((a, b) => {
    const aFav = favoritedIds.has(a.id) ? 0 : 1;
    const bFav = favoritedIds.has(b.id) ? 0 : 1;
    return aFav - bFav;
  });

  return (
    <section className="panel__section">
      {groups.length > 0 && (
        <div className="filters">
          {groups.map((g) => (
            <button
              key={g}
              type="button"
              className="filters__chip"
              aria-pressed={group === g}
              onClick={() => setGroup((prev) => (prev === g ? null : g))}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <div className="picker">
        <ul className="picker__grid picker__grid--jewellery">
          {sorted.map((item) => {
            const isFav = favoritedIds.has(item.id);
            const isSelected = selectedId === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="tile tile--jewellery"
                  aria-pressed={isSelected}
                  title={item.name}
                  onClick={() => onSelect(item.id)}
                >
                  <span className="tile__pair">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="tile__media"
                      src={item.jewelleryImageUrl}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="tile__media"
                      src={item.makeupImageUrl}
                      alt={`${item.name} — matching makeup`}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="tile__name">{item.name}</span>
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
                      onToggleFavorite(item.id);
                    }}
                  >
                    <Icon id="i-heart" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {items.length === 0 && <p className="picker__empty">No jewellery looks yet.</p>}
      </div>
    </section>
  );
}
