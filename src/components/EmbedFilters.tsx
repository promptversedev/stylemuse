"use client";

import { useMemo, useState } from "react";
import { FilterSelect, filterStyles as fs } from "@/components/FilterSelect";

/** What the popup grid can be narrowed by; backgrounds carry all three. */
export type EmbedFilterable = {
  name: string;
  title?: string | null;
  category?: string | null;
  environment?: string | null;
};

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/**
 * The search rule: every word typed must begin a word of the item's name or
 * title ("chand" finds "Crystal Chandelier"). The same rule the app's
 * Background tab and the database's title search use.
 */
export function matchesQuery(item: EmbedFilterable, query: string) {
  const typed = words(query);
  if (!typed.length) return true;
  const own = words(`${item.name} ${item.title ?? ""}`);
  return typed.every((t) => own.some((w) => w.startsWith(t)));
}

/** Values with counts, most common first; a chosen value stays listed at 0. */
function counted<T extends EmbedFilterable>(list: T[], key: "environment" | "category", keep: string | null) {
  const counts = new Map<string, number>();
  for (const item of list) {
    const v = item[key];
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  if (keep && !counts.has(keep)) counts.set(keep, 0);
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, count }));
}

/**
 * Search plus Setting / Style dropdowns for the embed popup. Search narrows
 * first, then the dropdowns and their counts work within what it found, so a
 * count always matches the grid. A dropdown only appears when its catalogue
 * has more than one value — a popup already narrowed to Lehenga jewellery has
 * nothing to choose between.
 */
export function useEmbedFilters<T extends EmbedFilterable>(
  items: T[],
  query: string,
  { categoryLabel = "Style" }: { categoryLabel?: string } = {},
) {
  const [environment, setEnvironment] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  const searched = useMemo(() => items.filter((i) => matchesQuery(i, query)), [items, query]);
  const inEnvironment = useMemo(
    () => searched.filter((i) => !environment || i.environment === environment),
    [searched, environment],
  );
  const filtered = useMemo(
    () => inEnvironment.filter((i) => !category || i.category === category),
    [inEnvironment, category],
  );

  const distinct = (key: "environment" | "category") => new Set(items.map((i) => i[key]).filter(Boolean)).size;
  const showEnvironment = distinct("environment") > 1;
  const showCategory = distinct("category") > 1;

  const controls =
    showEnvironment || showCategory ? (
      <div className={fs.embedFilters}>
        {showEnvironment && (
          <FilterSelect
            label="Setting"
            value={environment}
            options={counted(searched, "environment", environment)}
            total={searched.length}
            onChange={setEnvironment}
          />
        )}
        {showCategory && (
          <FilterSelect
            label={categoryLabel}
            value={category}
            options={counted(inEnvironment, "category", category)}
            total={inEnvironment.length}
            onChange={setCategory}
          />
        )}
      </div>
    ) : null;

  const active = Boolean(environment || category);
  const reset = () => {
    setEnvironment(null);
    setCategory(null);
  };

  return { filtered, controls, active, reset };
}
