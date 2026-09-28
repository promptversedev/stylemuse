/* The rail is a set of switches: pick a section and the panel shows that
   picker exclusively. */
export type TabId = "model" | "background" | "jewellery" | "hairstyle";

export type TabItem = {
  id: TabId;
  label: string;
  icon: string;
};

export const TABS: TabItem[] = [
  { id: "model", label: "Model", icon: "user" },
  { id: "background", label: "Background", icon: "scene" },
  { id: "jewellery", label: "Jewellery", icon: "gem" },
  { id: "hairstyle", label: "Hairstyle", icon: "hair" },
];
