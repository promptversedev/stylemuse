-- Integration clients — the websites allowed to embed the StyleMuse picker.
--
-- Until now the one integrating site (Vastralook) was named in an environment
-- variable, NEXT_PUBLIC_STUDIO_ORIGINS. That works for one site and breaks for
-- a second: adding a customer meant editing wrangler.jsonc and redeploying, the
-- list was public in the bundle, and there was nowhere to record who an origin
-- belonged to or to turn one off.
--
-- A row per site fixes all four. `client_key` is public — it identifies the
-- site in a URL the way a publishable API key does, and it grants nothing on
-- its own: every request is only as trusted as the *origin* it arrives from,
-- which is checked against `allowed_origins` below.
create extension if not exists "pgcrypto";

create table if not exists public.integration_clients (
  id              uuid primary key default gen_random_uuid(),

  -- Public identifier, passed as ?client= — safe to put in someone's HTML.
  client_key      text not null unique,
  -- Who this is, for the dashboard and for support.
  name            text not null,

  -- Exact origins ("https://app.example.com"), scheme and host and port.
  --
  -- Origins rather than hostnames because that is the unit the browser gives
  -- us in postMessage and in Origin headers, so comparing origins is an exact
  -- string match with nothing to normalise and nothing to get wrong. No
  -- wildcards on purpose: a wildcard here is a standing offer to every
  -- subdomain an attacker can take over.
  allowed_origins text[] not null default '{}',

  -- Turn an integration off without deleting its history.
  active          boolean not null default true,

  -- Free-text, e.g. who to contact when their origin changes.
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint integration_client_key_shape check (client_key ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  constraint integration_client_name_nonempty check (btrim(name) <> '')
);

-- Every picker load looks a client up by its key.
create index if not exists integration_clients_active_key_idx
  on public.integration_clients (client_key)
  where active;

alter table public.integration_clients enable row level security;

-- No policies for anon or authenticated on purpose.
--
-- RLS with zero policies denies everything, which is what this table wants:
-- it is read on the server with the service role while validating a picker
-- request, and a browser has no reason to enumerate who else integrates. The
-- picker page returns only a yes/no for the origin it was asked about.

-- ─────────────────────────────────────────────────────────────────────────
-- Seed the existing integration, so the deployed Studio keeps working across
-- this migration rather than going dark until someone inserts a row.
--
-- The tunnel origin is deliberately absent: quick-tunnel hostnames change
-- every run, so pin yours with an update when it does.
-- ─────────────────────────────────────────────────────────────────────────
insert into public.integration_clients (client_key, name, allowed_origins, notes)
values (
  'vastralook',
  'Vastralook Studio',
  array['http://localhost:3002'],
  'AI garment photoshoot studio. Add its production origin here when it ships.'
)
on conflict (client_key) do nothing;
