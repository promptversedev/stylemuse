"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/IconSprite";
import { useToast } from "@/components/Toast";

export type ModelPickerItem = {
  id: string;
  name: string;
  imageUrl: string;
  gender: string | null;
  ageGroup: string | null;
  bodyType: string | null;
  region: string | null;
};

const GENDER_ORDER = ["Female", "Male"];
const AGE_ORDER = ["Kid", "Adult", "Senior"];
const BODY_ORDER = ["Slim", "Average", "Athletic", "Curvy"];
const REGION_ORDER = ["Caucasian", "Asian", "African", "Latina", "Latino"];

function orderedUnique(values: (string | null)[], order: string[]) {
  const present = new Set(values.filter(Boolean) as string[]);
  const ordered = order.filter((v) => present.has(v));
  const extra = [...present].filter((v) => !order.includes(v)).sort();
  return [...ordered, ...extra];
}

type Filters = { gender: string | null; age: string | null; body: string | null; region: string | null };

export function ModelPicker({
  items,
  favoritedIds,
  selectedId,
  isAuthed,
  onSelect,
  onToggleFavorite,
}: {
  items: ModelPickerItem[];
  favoritedIds: Set<string>;
  selectedId: string | null;
  isAuthed: boolean;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const toast = useToast();
  const [filters, setFilters] = useState<Filters>({ gender: null, age: null, body: null, region: null });

  const groups = useMemo(
    () => [
      { key: "gender" as const, label: "Gender", values: orderedUnique(items.map((m) => m.gender), GENDER_ORDER) },
      { key: "age" as const, label: "Age", values: orderedUnique(items.map((m) => m.ageGroup), AGE_ORDER) },
      { key: "body" as const, label: "Body", values: orderedUnique(items.map((m) => m.bodyType), BODY_ORDER) },
      { key: "region" as const, label: "Region", values: orderedUnique(items.map((m) => m.region), REGION_ORDER) },
    ],
    [items]
  );

  const fieldForKey: Record<string, keyof ModelPickerItem> = {
    gender: "gender",
    age: "ageGroup",
    body: "bodyType",
    region: "region",
  };

  const matching = items.filter((model) =>
    (Object.keys(filters) as (keyof Filters)[]).every((key) => {
      const wanted = filters[key];
      return !wanted || model[fieldForKey[key]] === wanted;
    })
  );

  const sorted = [...matching].sort((a, b) => {
    const aFav = favoritedIds.has(a.id) ? 0 : 1;
    const bFav = favoritedIds.has(b.id) ? 0 : 1;
    return aFav - bFav;
  });

  const hasFilters = groups.some((group) => group.values.length > 0);

  return (
    <section className="panel__section">
      {hasFilters && (
        <div className="filters">
          {groups.flatMap((group) =>
            group.values.map((value) => (
              <button
                key={group.key + value}
                type="button"
                className="filters__chip"
                aria-pressed={filters[group.key] === value}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, [group.key]: prev[group.key] === value ? null : value }))
                }
              >
                {value}
              </button>
            ))
          )}
        </div>
      )}

      <div className="picker">
        <ul className="picker__grid picker__grid--model">
          <li>
            <button
              type="button"
              className="tile tile--upload"
              onClick={() => toast("Upload a reference photo of your own model.")}
            >
              <Icon id="i-user" />
              Your model
            </button>
          </li>

          {sorted.map((model) => {
            const isFav = favoritedIds.has(model.id);
            const isSelected = selectedId === model.id;
            return (
              <li key={model.id}>
                <button
                  type="button"
                  className="tile tile--model"
                  aria-pressed={isSelected}
                  title={[model.name, model.gender, model.ageGroup, model.bodyType].filter(Boolean).join(" · ")}
                  onClick={() => onSelect(model.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="tile__media" src={model.imageUrl} alt={model.name} loading="lazy" decoding="async" />
                  <span className="tile__name">{model.name}</span>
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
                      onToggleFavorite(model.id);
                    }}
                  >
                    <Icon id="i-heart" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {matching.length === 0 && (
          <p className="picker__empty">No model matches these filters.</p>
        )}
      </div>
    </section>
  );
}
