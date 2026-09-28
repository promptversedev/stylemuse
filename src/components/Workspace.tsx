"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { TopBar } from "@/components/TopBar";
import { Rail } from "@/components/Rail";
import { AuthBar } from "@/components/AuthBar";
import { PickersSection } from "@/components/PickersSection";
import type { ModelPickerItem } from "@/components/ModelPicker";
import type { BackgroundPickerItem } from "@/components/BackgroundPicker";
import type { JewelleryPickerItem } from "@/components/JewelleryPicker";
import type { HairstylePickerItem } from "@/components/HairstylePicker";
import type { TabId } from "@/lib/nav-data";

type ItemType = "model" | "background" | "jewellery" | "hairstyle";

const TAB_TITLE: Record<TabId, string> = {
  model: "Select Model",
  background: "Select BG",
  jewellery: "Select Jewellery",
  hairstyle: "Select Hairstyle",
};

export function Workspace({
  initialModels,
  initialBackgrounds,
  initialJewellery,
  initialHairstyles,
}: {
  initialModels: ModelPickerItem[];
  initialBackgrounds: BackgroundPickerItem[];
  initialJewellery: JewelleryPickerItem[];
  initialHairstyles: HairstylePickerItem[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const isDesktop = useIsDesktop();

  const [railOpen, setRailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("model");

  /**
   * Open on the tab the Studio sent us for.
   *
   * `?want=background` means the visitor clicked "Pick background" over there,
   * so landing them on the Model tab would make them find the right one first
   * — the opposite of the one-click errand the link promises.
   */
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get("want");
    if (want === "model" || want === "background" || want === "jewellery" || want === "hairstyle") {
      setActiveTab(want as TabId);
    }
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [publicToken, setPublicToken] = useState<string | null>(null);

  const [favoritedModelIds, setFavoritedModelIds] = useState<Set<string>>(new Set());
  const [favoritedBackgroundIds, setFavoritedBackgroundIds] = useState<Set<string>>(new Set());
  const [favoritedJewelleryIds, setFavoritedJewelleryIds] = useState<Set<string>>(new Set());
  const [favoritedHairstyleIds, setFavoritedHairstyleIds] = useState<Set<string>>(new Set());
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string | null>(null);
  const [selectedJewelleryId, setSelectedJewelleryId] = useState<string | null>(null);
  const [selectedHairstyleId, setSelectedHairstyleId] = useState<string | null>(null);

  const openDrawer = useCallback(() => setRailOpen(true), []);
  const closeDrawer = useCallback(() => setRailOpen(false), []);

  // Auth state.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, [supabase]);

  // Once signed in: load public_token, favorites and last selection.
  useEffect(() => {
    if (!user) {
      setPublicToken(null);
      setFavoritedModelIds(new Set());
      setFavoritedBackgroundIds(new Set());
      setFavoritedJewelleryIds(new Set());
      setFavoritedHairstyleIds(new Set());
      return;
    }

    supabase
      .from("profiles")
      .select("public_token")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setPublicToken(data?.public_token ?? null));

    fetch("/api/favorites")
      .then((res) => res.json())
      .then((data: { favorites: { item_type: ItemType; item_id: string }[] }) => {
        const models = new Set<string>();
        const backgrounds = new Set<string>();
        const jewellery = new Set<string>();
        const hairstyles = new Set<string>();
        const byType: Record<ItemType, Set<string>> = {
          model: models,
          background: backgrounds,
          jewellery,
          hairstyle: hairstyles,
        };
        for (const f of data.favorites ?? []) {
          byType[f.item_type]?.add(f.item_id);
        }
        setFavoritedModelIds(models);
        setFavoritedBackgroundIds(backgrounds);
        setFavoritedJewelleryIds(jewellery);
        setFavoritedHairstyleIds(hairstyles);
      });

    fetch("/api/selection")
      .then((res) => res.json())
      .then(
        (data: {
          selection: {
            model_id: string | null;
            background_id: string | null;
            jewellery_id: string | null;
            hairstyle_id: string | null;
          } | null;
        }) => {
          if (data.selection) {
            setSelectedModelId(data.selection.model_id);
            setSelectedBackgroundId(data.selection.background_id);
            setSelectedJewelleryId(data.selection.jewellery_id);
            setSelectedHairstyleId(data.selection.hairstyle_id);
          }
        }
      );
  }, [user, supabase]);

  // Leaving the touch layout must not strand the drawer open.
  useEffect(() => {
    if (isDesktop) setRailOpen(false);
  }, [isDesktop]);

  // Body scroll lock while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = railOpen ? "hidden" : "";
  }, [railOpen]);

  // Escape closes the drawer.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && railOpen) closeDrawer();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [railOpen, closeDrawer]);

  /**
   * Start sign-in on this app, not on Supabase.
   *
   * `signInWithOAuth` would bounce through {project}.supabase.co, which is why
   * Google's registered redirect URI had to be Supabase's. /auth/google runs
   * the OAuth here and hands the resulting ID token to Supabase, so the URI in
   * Google Cloud is this domain. Supabase still issues the session.
   *
   * `next` carries the current page, including any ?return= a connected site
   * sent, so signing in does not lose where they were headed.
   */
  const signIn = useCallback(() => {
    const next = window.location.pathname + window.location.search;
    window.location.href = `/auth/google?next=${encodeURIComponent(next)}`;
  }, []);

  const signOut = useCallback(() => {
    supabase.auth.signOut();
  }, [supabase]);

  const favoriteSetters: Record<ItemType, React.Dispatch<React.SetStateAction<Set<string>>>> = {
    model: setFavoritedModelIds,
    background: setFavoritedBackgroundIds,
    jewellery: setFavoritedJewelleryIds,
    hairstyle: setFavoritedHairstyleIds,
  };

  const toggleFavorite = useCallback(
    (type: ItemType, id: string) => {
      if (!user) {
        signIn();
        return;
      }

      const setter = favoriteSetters[type];
      setter((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });

      fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType: type, itemId: id }),
      }).catch(() => {
        setter((prev) => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, signIn]
  );

  const selectItem = useCallback(
    (type: ItemType, id: string) => {
      const nextModelId = type === "model" ? (selectedModelId === id ? null : id) : selectedModelId;
      const nextBackgroundId =
        type === "background" ? (selectedBackgroundId === id ? null : id) : selectedBackgroundId;
      const nextJewelleryId =
        type === "jewellery" ? (selectedJewelleryId === id ? null : id) : selectedJewelleryId;
      const nextHairstyleId =
        type === "hairstyle" ? (selectedHairstyleId === id ? null : id) : selectedHairstyleId;

      if (type === "model") setSelectedModelId(nextModelId);
      else if (type === "background") setSelectedBackgroundId(nextBackgroundId);
      else if (type === "jewellery") setSelectedJewelleryId(nextJewelleryId);
      else setSelectedHairstyleId(nextHairstyleId);

      if (!user) return;

      fetch("/api/selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: nextModelId,
          backgroundId: nextBackgroundId,
          jewelleryId: nextJewelleryId,
          hairstyleId: nextHairstyleId,
        }),
      });
    },
    [user, selectedModelId, selectedBackgroundId, selectedJewelleryId, selectedHairstyleId]
  );

  return (
    <>
      <TopBar railOpen={railOpen} onMenuClick={() => (railOpen ? closeDrawer() : openDrawer())} />

      <div className="app">
        <Rail open={railOpen} onClose={closeDrawer} activeTab={activeTab} onSelectTab={setActiveTab} />

        <div className="workspace">
          <PickersSection
            activeTab={activeTab}
            header={
              <>
                <h1 className="panel__title">{TAB_TITLE[activeTab]}</h1>
                <AuthBar
                  user={user}
                  publicToken={publicToken}
                  selectedModelId={selectedModelId}
                  selectedBackgroundId={selectedBackgroundId}
                  selectedJewelleryId={selectedJewelleryId}
                  selectedHairstyleId={selectedHairstyleId}
                  onSignIn={signIn}
                  onSignOut={signOut}
                />
              </>
            }
            isAuthed={!!user}
            models={initialModels}
            backgrounds={initialBackgrounds}
            jewellery={initialJewellery}
            hairstyles={initialHairstyles}
            favoritedModelIds={favoritedModelIds}
            favoritedBackgroundIds={favoritedBackgroundIds}
            favoritedJewelleryIds={favoritedJewelleryIds}
            favoritedHairstyleIds={favoritedHairstyleIds}
            selectedModelId={selectedModelId}
            selectedBackgroundId={selectedBackgroundId}
            selectedJewelleryId={selectedJewelleryId}
            selectedHairstyleId={selectedHairstyleId}
            onSelectModel={(id) => selectItem("model", id)}
            onSelectBackground={(id) => selectItem("background", id)}
            onSelectJewellery={(id) => selectItem("jewellery", id)}
            onSelectHairstyle={(id) => selectItem("hairstyle", id)}
            onToggleFavoriteModel={(id) => toggleFavorite("model", id)}
            onToggleFavoriteBackground={(id) => toggleFavorite("background", id)}
            onToggleFavoriteJewellery={(id) => toggleFavorite("jewellery", id)}
            onToggleFavoriteHairstyle={(id) => toggleFavorite("hairstyle", id)}
          />
        </div>
      </div>
    </>
  );
}
