import { createClient } from "@/lib/supabase/server";
import { r2PublicUrl } from "@/lib/r2";
import { Workspace } from "@/components/Workspace";
import type { ModelPickerItem } from "@/components/ModelPicker";
import type { BackgroundPickerItem } from "@/components/BackgroundPicker";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: models }, { data: backgrounds }] = await Promise.all([
    supabase
      .from("models")
      .select("id, name, image_key, gender, age_group, body_type, region")
      .order("sort_order", { ascending: true }),
    supabase
      .from("backgrounds")
      .select("id, name, image_key, category")
      .order("sort_order", { ascending: true }),
  ]);

  const modelItems: ModelPickerItem[] = (models ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    imageUrl: r2PublicUrl(m.image_key),
    gender: m.gender,
    ageGroup: m.age_group,
    bodyType: m.body_type,
    region: m.region,
  }));

  const backgroundItems: BackgroundPickerItem[] = (backgrounds ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    imageUrl: r2PublicUrl(b.image_key),
    category: b.category,
  }));

  return <Workspace initialModels={modelItems} initialBackgrounds={backgroundItems} />;
}
