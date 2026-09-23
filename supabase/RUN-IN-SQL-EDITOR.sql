-- ─────────────────────────────────────────────────────────────────────────
-- Paste this whole file into the Supabase SQL editor and run it.
--
--   https://supabase.com/dashboard/project/ocevxoifcfrdchcmauku/sql/new
--
-- It is migration 0003 plus the current Vastralook origins, so the picker
-- works from both localhost and the Cloudflare tunnel the moment it lands.
-- Safe to run more than once: every statement is idempotent.
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- Integration clients — the websites allowed to embed the StyleMuse picker.
--
-- `client_key` is public: it identifies a site in a URL the way a publishable
-- key does, and it grants nothing on its own. What actually grants access is
-- the browser-reported origin, checked against `allowed_origins` — that is the
-- part another site cannot forge, and it is the only origin the picker will
-- postMessage an answer to.
create table if not exists public.integration_clients (
  id              uuid primary key default gen_random_uuid(),
  client_key      text not null unique,
  name            text not null,

  -- Exact origins ("https://app.example.com"): scheme, host and port.
  -- No wildcards on purpose — "*.example.com" is a standing offer to every
  -- subdomain someone can take over.
  allowed_origins text[] not null default '{}',

  active          boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint integration_client_key_shape
    check (client_key ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  constraint integration_client_name_nonempty
    check (btrim(name) <> '')
);

-- Every picker load looks a client up by its key.
create index if not exists integration_clients_active_key_idx
  on public.integration_clients (client_key)
  where active;

alter table public.integration_clients enable row level security;

-- No policies, deliberately. RLS with zero policies denies everything, which
-- is what this table wants: it is read on the server with the service role
-- while validating a picker request, and a browser has no reason to be able
-- to enumerate who else integrates.

-- ─────────────────────────────────────────────────────────────────────────
-- The Vastralook integration.
-- ─────────────────────────────────────────────────────────────────────────
insert into public.integration_clients (client_key, name, allowed_origins, notes)
values (
  'vastralook',
  'Vastralook Studio',
  array[
    'http://localhost:3002',
    'https://cost-renaissance-names-retrieval.trycloudflare.com'
  ],
  'AI garment photoshoot studio. Quick-tunnel origins change every run — update this row when yours does.'
)
on conflict (client_key) do update
  set allowed_origins = excluded.allowed_origins,
      name            = excluded.name,
      updated_at      = now();

-- What you should see: one row, active, with both origins.
select client_key, name, allowed_origins, active
from public.integration_clients;
