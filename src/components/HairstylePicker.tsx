"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/IconSprite";

export type HairstylePickerItem = {
  id: string;
  name: string;
  imageUrl: string;
  category: string | null;
};

export function HairstylePicker({
  items,
  favoritedIds,
  selectedId,
  isAuthed,
  onSelect,
  onToggleFavorite,
}: {
  items: HairstylePickerItem[];
  favoritedIds: Set<string>;
  selectedId: string | null;
  isAuthed: boolean;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const [group, setGroup] = useState<string | null>(null);

  const groups = useMemo(() => {
    const present = new Set(items.map((h) => h.category).filter(Boolean) as string[]);
    return [...present].sort();
  }, [items]);

  const filtered = items.filter((h) => !group || h.category === group);

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
        <ul className="picker__grid picker__grid--hairstyle">
          {sorted.map((item) => {
            const isFav = favoritedIds.has(item.id);
            const isSelected = selectedId === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="tile tile--hairstyle"
                  aria-pressed={isSelected}
                  title={item.name}
                  onClick={() => onSelect(item.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="tile__media"
                    src={item.imageUrl}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                  />
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
        {items.length === 0 && <p className="picker__empty">No hairstyles yet.</p>}
      </div>
    </section>
  );
}
