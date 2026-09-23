-- Swap Model & BG — initial schema
-- Run with the Supabase CLI:  supabase db push
-- or paste into the SQL editor in the Supabase dashboard.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- profiles
-- One row per authenticated user (created automatically on Google sign-in).
-- public_token is a non-secret, shareable id used by the cross-site embed
-- widget to look up "what this person currently has selected" without
-- exposing their auth id or requiring the visitor to be logged in.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  avatar_url    text,
  public_token  uuid not null default gen_random_uuid() unique,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles are editable by their owner"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up (Google OAuth).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- models — the "Select Model" picker
-- image_key is the object key inside the Cloudflare R2 bucket (e.g.
-- "models/m01-ava.webp"). The app turns that into a public URL with
-- NEXT_PUBLIC_R2_PUBLIC_URL + image_key (see src/lib/r2.ts) so the bucket's
-- domain lives in exactly one place instead of being duplicated per row.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.models (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  image_key   text not null,
  gender      text,
  age_group   text,
  body_type   text,
  region      text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.models enable row level security;

create policy "models are publicly readable"
  on public.models for select
  using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- backgrounds — the "Select BG" picker
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.backgrounds (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  image_key   text not null,
  category    text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.backgrounds enable row level security;

create policy "backgrounds are publicly readable"
  on public.backgrounds for select
  using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- favorites — requires Google sign-in; favorited items are pinned to the
-- top of their picker grid in the UI.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  item_type   text not null check (item_type in ('model', 'background')),
  item_id     uuid not null,
  created_at  timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

alter table public.favorites enable row level security;

create policy "users manage their own favorites"
  on public.favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists favorites_user_idx on public.favorites (user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- selections — the user's current model + background pick. This is what
-- powers cross-site "compatibility": the embed widget on other websites
-- reads this row (via profiles.public_token, server-side, service role)
-- so it can show "the thing you selected on Swap Model & BG" anywhere.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.selections (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  model_id       uuid references public.models(id) on delete set null,
  background_id  uuid references public.backgrounds(id) on delete set null,
  updated_at     timestamptz not null default now()
);

alter table public.selections enable row level security;

create policy "users manage their own selection"
  on public.selections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Note: selections has no public select policy. The public embed API route
-- (src/app/api/embed/[token]/route.ts) reads it with the Supabase service
-- role key on the server, keyed by the non-secret public_token, so a
-- visitor's raw auth uid is never exposed to other websites.
