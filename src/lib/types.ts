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

export type FavoriteRow = {
  id: string;
  user_id: string;
  item_type: "model" | "background";
  item_id: string;
};

export type SelectionRow = {
  user_id: string;
  model_id: string | null;
  background_id: string | null;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  public_token: string;
};
