"use client";

import { useEffect, useRef } from "react";
import { ModelPicker, type ModelPickerItem } from "@/components/ModelPicker";
import { BackgroundPicker, type BackgroundPickerItem } from "@/components/BackgroundPicker";
import type { TabId } from "@/lib/nav-data";

export function PickersSection({
  activeTab,
  header,
  isAuthed,
  models,
  backgrounds,
  favoritedModelIds,
  favoritedBackgroundIds,
  selectedModelId,
  selectedBackgroundId,
  onSelectModel,
  onSelectBackground,
  onToggleFavoriteModel,
  onToggleFavoriteBackground,
}: {
  activeTab: TabId;
  header: React.ReactNode;
  isAuthed: boolean;
  models: ModelPickerItem[];
  backgrounds: BackgroundPickerItem[];
  favoritedModelIds: Set<string>;
  favoritedBackgroundIds: Set<string>;
  selectedModelId: string | null;
  selectedBackgroundId: string | null;
  onSelectModel: (id: string) => void;
  onSelectBackground: (id: string) => void;
  onToggleFavoriteModel: (id: string) => void;
  onToggleFavoriteBackground: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Switching tabs mounts a different picker but reuses this same scroll
  // container, so without this the new picker opens wherever the old one
  // happened to be scrolled to instead of at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  return (
    <section className="panel" aria-label="Swap model and background">
      <div className="panel__head">{header}</div>
      <div className="panel__scroll" ref={scrollRef}>
        {activeTab === "model" ? (
          <ModelPicker
            items={models}
            favoritedIds={favoritedModelIds}
            selectedId={selectedModelId}
            isAuthed={isAuthed}
            onSelect={onSelectModel}
            onToggleFavorite={onToggleFavoriteModel}
          />
        ) : (
          <BackgroundPicker
            items={backgrounds}
            favoritedIds={favoritedBackgroundIds}
            selectedId={selectedBackgroundId}
            isAuthed={isAuthed}
            onSelect={onSelectBackground}
            onToggleFavorite={onToggleFavoriteBackground}
          />
        )}
      </div>
    </section>
  );
}
