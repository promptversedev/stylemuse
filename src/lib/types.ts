export type ModelRow = {
  id: string;
  name: string;
  image_key: string;
  gender: string | null;
  age_group: string | null;
  body_type: string | null;
  region: string | null;
  sort_order: number;
};

export type BackgroundRow = {
  id: string;
  name: string;
  image_key: string;
  category: string | null;
  sort_order: number;
};

// One row is one look: the jewellery (thumbnail + original) and the makeup
// styled to go with it. The makeup exists only as an original — it is never
// shown, only sent to generation with the jewellery — and it lives on the
// same row so the pairing cannot come apart.
export type JewelleryRow = {
  id: string;
  name: string;
  image_key: string;
  original_key: string | null;
  makeup_original_key: string | null;
  category: string | null;
  sort_order: number;
};

export type HairstyleRow = {
  id: string;
  name: string;
  image_key: string;
  original_key: string | null;
  category: string | null;
  sort_order: number;
};

export type FavoriteRow = {
  id: string;
  user_id: string;
  item_type: "model" | "background" | "jewellery" | "hairstyle";
  item_id: string;
};

export type SelectionRow = {
  user_id: string;
  model_id: string | null;
  background_id: string | null;
  jewellery_id: string | null;
  hairstyle_id: string | null;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  public_token: string;
};
