# StyleMuse — Swap Model & BG (Next.js on Cloudflare)

A Next.js (App Router) rebuild of the original static mockup (`index.html` /
`assets/`, kept in the repo for reference). The live app only shows the two
things asked for — **Select Model** and **Select BG** — nothing else from the
original layout (no upload dropzone, no icon rail, no inspiration feed).

- **Hosting**: Cloudflare Workers via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) + Wrangler
- **Database**: Supabase Postgres (models, backgrounds, favorites, selections)
- **Auth**: Supabase Auth, Google provider only (required to favorite an item)
- **Images**: stored in a Cloudflare R2 bucket; Supabase rows hold the R2 object key, not the bytes
- **Cross-site compatibility**: a public embed API + `public/embed.js` widget so any other website can show a user's current pick

## 1. Install

```bash
npm install
```

## 2. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Run the schema migration — either with the CLI:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```
   or paste [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) into the SQL editor.
3. **Authentication → Providers → Google**: enable it and fill in the Google
   OAuth client ID/secret (create one in Google Cloud Console → APIs &
   Services → Credentials). Set the authorized redirect URI to:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
4. **Authentication → URL Configuration**: add your app URL (e.g.
   `http://localhost:3000` for dev, your Workers domain for prod) to Site URL
   / Redirect URLs so `/auth/callback` is allowed.

## 3. Cloudflare R2 (image storage)

```bash
npx wrangler r2 bucket create swap-model-bg-images
```

Enable public access for the bucket (R2 → your bucket → Settings → Public
access → allow, which gives you a `pub-xxxxxxxxxxxx.r2.dev` URL), or attach a
custom domain. Upload the model/background images with the keys referenced
in [`supabase/seed.sql`](supabase/seed.sql) (`models/m01-ava.webp`,
`backgrounds/b01-seamless-white.webp`, …), e.g.:

```bash
npx wrangler r2 object put swap-model-bg-images/models/m01-ava.webp --file ./local/ava.webp
```

Then run the seed to insert matching rows into Supabase (SQL editor or
`supabase db execute -f supabase/seed.sql`), or write your own rows — only
`image_key` needs to match what you uploaded.

## 4. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` for local dev (`next dev`). For the deployed Worker, the
two **public** vars also live in `wrangler.jsonc` under `vars` — fill those in
too. Secrets (`SUPABASE_SERVICE_ROLE_KEY`, R2 access keys) are never put in
`wrangler.jsonc`; set them with:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

## 5. Run locally

```bash
npm run dev
```

## 6. Deploy to Cloudflare Workers

```bash
npm run deploy
```

(`npm run preview` builds and runs the Worker locally first, if you want to
sanity check the Cloudflare build before shipping.)

## How favorites & cross-site compatibility work

- **Favorites**: clicking the heart on a model/background requires Google
  sign-in (`src/components/Workspace.tsx` redirects to sign-in if signed
  out). Favorited items are pinned to the top of their grid
  (`src/components/PickerPanel.tsx`).
- **Selection sync**: whenever a signed-in user picks a model/background, it's
  upserted into `public.selections` (`src/app/api/selection/route.ts`).
- **Compatibility widget**: every profile has a non-secret `public_token`
  (`supabase/migrations/0001_init.sql`). `GET /api/embed/[token]`
  (`src/app/api/embed/[token]/route.ts`) is a public, CORS-open endpoint that
  returns that user's current model + background. `public/embed.js` is a
  vanilla-JS snippet any other website can drop in to render it:

  ```html
  <div id="swap-model-bg-widget" data-token="USER_PUBLIC_TOKEN"></div>
  <script src="https://YOUR_APP_DOMAIN/embed.js" async></script>
  ```

  Signed-in users get this exact snippet (with their token filled in) from
  the **"Get embed code"** button in the header.

## Schema

See [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql):

| Table | Purpose |
| --- | --- |
| `profiles` | One row per Google-authenticated user; holds `public_token` for the embed widget |
| `models` | Select Model catalog — `image_key` points at the R2 object |
| `backgrounds` | Select BG catalog — `image_key` points at the R2 object |
| `favorites` | `(user_id, item_type, item_id)` — pins items to the top |
| `selections` | Each user's current model/background pick — what the embed widget reads |

All tables have row-level security; `models`/`backgrounds` are publicly
readable, `favorites`/`selections` are owner-only, and the public embed route
reads `selections` server-side with the service role key (never exposed to
the browser).
# vastralook
