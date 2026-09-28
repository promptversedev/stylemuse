"use client";

import { useEffect, useRef } from "react";
import { ModelPicker, type ModelPickerItem } from "@/components/ModelPicker";
import { BackgroundPicker, type BackgroundPickerItem } from "@/components/BackgroundPicker";
import { JewelleryPicker, type JewelleryPickerItem } from "@/components/JewelleryPicker";
import { HairstylePicker, type HairstylePickerItem } from "@/components/HairstylePicker";
import type { TabId } from "@/lib/nav-data";

export function PickersSection({
  activeTab,
  header,
  isAuthed,
  models,
  backgrounds,
  jewellery,
  hairstyles,
  favoritedModelIds,
  favoritedBackgroundIds,
  favoritedJewelleryIds,
  favoritedHairstyleIds,
  selectedModelId,
  selectedBackgroundId,
  selectedJewelleryId,
  selectedHairstyleId,
  onSelectModel,
  onSelectBackground,
  onSelectJewellery,
  onSelectHairstyle,
  onToggleFavoriteModel,
  onToggleFavoriteBackground,
  onToggleFavoriteJewellery,
  onToggleFavoriteHairstyle,
}: {
  activeTab: TabId;
  header: React.ReactNode;
  isAuthed: boolean;
  models: ModelPickerItem[];
  backgrounds: BackgroundPickerItem[];
  jewellery: JewelleryPickerItem[];
  hairstyles: HairstylePickerItem[];
  favoritedModelIds: Set<string>;
  favoritedBackgroundIds: Set<string>;
  favoritedJewelleryIds: Set<string>;
  favoritedHairstyleIds: Set<string>;
  selectedModelId: string | null;
  selectedBackgroundId: string | null;
  selectedJewelleryId: string | null;
  selectedHairstyleId: string | null;
  onSelectModel: (id: string) => void;
  onSelectBackground: (id: string) => void;
  onSelectJewellery: (id: string) => void;
  onSelectHairstyle: (id: string) => void;
  onToggleFavoriteModel: (id: string) => void;
  onToggleFavoriteBackground: (id: string) => void;
  onToggleFavoriteJewellery: (id: string) => void;
  onToggleFavoriteHairstyle: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Switching tabs mounts a different picker but reuses this same scroll
  // container, so without this the new picker opens wherever the old one
  // happened to be scrolled to instead of at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  return (
    <section className="panel" aria-label="Swap model, background, jewellery and hairstyle">
      <div className="panel__head">{header}</div>
      <div className="panel__scroll" ref={scrollRef}>
        {activeTab === "model" && (
          <ModelPicker
            items={models}
            favoritedIds={favoritedModelIds}
            selectedId={selectedModelId}
            isAuthed={isAuthed}
            onSelect={onSelectModel}
            onToggleFavorite={onToggleFavoriteModel}
          />
        )}
        {activeTab === "background" && (
          <BackgroundPicker
            items={backgrounds}
            favoritedIds={favoritedBackgroundIds}
            selectedId={selectedBackgroundId}
            isAuthed={isAuthed}
            onSelect={onSelectBackground}
            onToggleFavorite={onToggleFavoriteBackground}
          />
        )}
        {activeTab === "jewellery" && (
          <JewelleryPicker
            items={jewellery}
            favoritedIds={favoritedJewelleryIds}
            selectedId={selectedJewelleryId}
            isAuthed={isAuthed}
            onSelect={onSelectJewellery}
            onToggleFavorite={onToggleFavoriteJewellery}
          />
        )}
        {activeTab === "hairstyle" && (
          <HairstylePicker
            items={hairstyles}
            favoritedIds={favoritedHairstyleIds}
            selectedId={selectedHairstyleId}
            isAuthed={isAuthed}
            onSelect={onSelectHairstyle}
            onToggleFavorite={onToggleFavoriteHairstyle}
          />
        )}
      </div>
    </section>
  );
}
