"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/IconSprite";
import { useToast } from "@/components/Toast";

export type BackgroundPickerItem = {
  id: string;
  name: string;
  imageUrl: string;
  category: string | null;
};

const CATEGORY_ORDER = ["Studio", "Indoor", "Outdoor", "Urban", "Abstract"];

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
  const toast = useToast();
  const [group, setGroup] = useState<string | null>(null);

  const groups = useMemo(() => {
    const present = new Set(items.map((b) => b.category).filter(Boolean) as string[]);
    const ordered = CATEGORY_ORDER.filter((g) => present.has(g));
    const extra = [...present].filter((g) => !CATEGORY_ORDER.includes(g)).sort();
    return [...ordered, ...extra];
  }, [items]);

  const filtered = items.filter((bg) => !group || bg.category === group);

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
        <ul className="picker__grid picker__grid--bg">
          <li>
            <button
              type="button"
              className="tile tile--upload"
              onClick={() => toast("Upload your own background reference.")}
            >
              <Icon id="i-scene" />
              Your BG
            </button>
          </li>

          {sorted.map((bg) => {
            const isFav = favoritedIds.has(bg.id);
            const isSelected = selectedId === bg.id;
            return (
              <li key={bg.id}>
                <button
                  type="button"
                  className="tile tile--bg"
                  aria-pressed={isSelected}
                  title={[bg.name, bg.category].filter(Boolean).join(" · ")}
                  onClick={() => onSelect(bg.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="tile__media" src={bg.imageUrl} alt={bg.name} loading="lazy" decoding="async" />
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
      </div>
    </section>
  );
}
