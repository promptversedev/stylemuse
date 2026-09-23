/* The rail is just two switches now: pick "Model" or "Background" and the
   panel shows that picker exclusively. */
export type TabId = "model" | "background";

export type TabItem = {
  id: TabId;
  label: string;
  icon: string;
};

export const TABS: TabItem[] = [
  { id: "model", label: "Model", icon: "user" },
  { id: "background", label: "Background", icon: "scene" },
];
