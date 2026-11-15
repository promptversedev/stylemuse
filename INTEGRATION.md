# Integrating StyleMuse into another website

StyleMuse owns the model and background catalogue, the images and the sign-in.
Another site embeds the picker, gets one item back, and renders it however it
likes. The two stay separate: no shared database, no shared session, no copy of
the catalogue on the other side.

There are two ways in. **Use the popup** unless you have a reason not to.

| | Popup (`connect.js`) | Redirect |
| --- | --- | --- |
| Host page navigates | no | yes |
| Unsaved host state (a typed prompt, a queued upload) | kept | **lost** |
| Works with popups blocked | no | yes |
| Sign-in required | no | no |
| Good for | picking one item mid-task | a landing step, or a popup fallback |

---

## 1. Register the site

Every integration is a row in `integration_clients`. Add one per website:

```sql
insert into public.integration_clients (client_key, name, allowed_origins, notes)
values (
  'acme-studio',                         -- public, goes in their HTML
  'Acme Studio',
  array['https://app.acme.com',          -- exact origins, scheme + host + port
        'http://localhost:3000'],        -- their dev origin, if they want one
  'Contact: dev@acme.com'
);
```

`client_key` is **public** — it identifies the site the way a publishable key
does and grants nothing on its own. What actually grants access is the browser
-reported **origin**, checked against `allowed_origins` on every picker load.
That is also the only origin the picker will post an answer to.

No wildcards are accepted. `*.acme.com` would be a standing offer to every
subdomain someone can take over, so list the origins you mean.

To pause an integration without losing its history:

```sql
update public.integration_clients set active = false where client_key = 'acme-studio';
```

## 2. Drop in the script

```html
<button id="pick-model">Pick a model</button>

<script src="https://YOUR_STYLEMUSE/connect.js"></script>
<script>
  StyleMuse.configure({ client: "acme-studio" });

  document.querySelector("#pick-model").onclick = async () => {
    const pick = await StyleMuse.pick("model");   // or "background"
    if (!pick) return;                            // closed without picking
    // { id, name, imageUrl }
    document.querySelector("#thumb").src = pick.imageUrl;
  };
</script>
```

That is the whole API:

- **`StyleMuse.configure({ client, base? })`** — `base` defaults to the origin
  the script was served from, so you only need it when proxying.
- **`StyleMuse.pick(kind)`** → `Promise<{ id, name, imageUrl } | null>`.
  Resolves `null` if the window is closed without choosing. Rejects only for
  what you can fix: a missing `client`, or a blocked popup.

**`connect.js` writes no storage.** The pick is handed to you and that is the
end of its involvement — where it lives afterwards is your decision. Keep it in
component state, put it in a form field, or save it against your own user. Do
not reach for `localStorage` by reflex: it is per-browser, so it silently
disagrees with itself across a person's devices, and it will not be there when
your server needs to know what they chose.

### React

```jsx
const [model, setModel] = useState(null);

async function pickModel() {
  const item = await StyleMuse.pick("model");
  if (item) setModel(item);         // the page never navigated; your form is intact
}
```

## 3. The redirect flow (fallback)

Send someone to StyleMuse and have it send them back with the answer in the URL:

```
https://YOUR_STYLEMUSE/?return=https%3A%2F%2Fapp.acme.com%2Feditor&want=model
```

- `return` — where to come back to. Must be an origin on your allowlist.
- `want` — `model` or `background`. StyleMuse opens on that tab and returns the
  moment one is picked. Omit it and the visitor picks both, then clicks a button.

They come back to `return` with:

- `?stylemuse_model=<uuid>` and/or `?stylemuse_bg=<uuid>` — signed out
- `?stylemuse=<public_token>` — signed in (see below)

Resolve ids to items with the public, CORS-open endpoint:

```
GET /api/picks?model=<uuid>&background=<uuid>
→ { displayName, model: { id, name, imageUrl } | null, background: … , updatedAt }
```

**Strip those parameters from the URL once read** (`history.replaceState`), or
they survive a copy-paste and a reload.

## 4. Signing in (optional)

Signing in buys one thing: a pick that **persists and follows the person to
another device**. Nothing above requires it.

A signed-in visitor has a `public_token`, from **Get embed code**. With it:

```
GET /api/embed/<public_token>
→ { displayName, model, background, updatedAt }
```

Same response shape as `/api/picks`, so you can handle them alike. The
difference is that this one keeps answering with whatever they currently have
selected, not just what they chose during one visit.

## 5. Reading a signed-in person's favourites (partner API)

For a site that has already signed the person in with Google — Vastralook — and
wants to show the favourites they made in StyleMuse. It is matched on **email**:
both sites use Google sign-in, so the same person has the same address.

```
GET /api/partner/favorites?email=<address>
Authorization: Bearer <VASTRALOOK_PARTNER_SECRET>

→ { found, displayName, favorites: { model: [...], background: [...], jewellery: [...], hairstyle: [...] } }
```

Each item has the same shape as `/api/picks` — `{ id, name, imageUrl, originalUrl }`,
plus `makeup` on jewellery — newest favourite first. An email with no StyleMuse
profile answers `found: false` with empty lists; it is not an error.

**This one is not public**, unlike `/api/picks` and `/api/embed/<token>`:

- It needs the shared secret, and it sends no CORS headers, so it is for the
  partner's **server** only. The secret must never reach a browser.
- The partner must send the email from its **own verified Google session**, never
  from a field a visitor typed — otherwise anyone could read anyone's favourites.
- With `VASTRALOOK_PARTNER_SECRET` unset the route answers 503, so it is off by
  default.

Set it up:

1. Pick a long random value (`openssl rand -hex 32`).
2. StyleMuse: `npx wrangler secret put VASTRALOOK_PARTNER_SECRET`, then deploy.
3. Vastralook: set `STYLEMUSE_PARTNER_SECRET` to the same value (Vercel
   environment variables).

## 6. Garment recommendation (partner API)

For Vastralook: which backgrounds, jewellery sets and models go with a garment it has analysed. The answer is catalogue items in the same
shape as `/api/picks`, so the partner can show them and let the person take one with no further call.

```
POST /api/partner/recommend
Authorization: Bearer <VASTRALOOK_PARTNER_SECRET>
{ "garment": { "category_family": "saree",
               "colors": [{ "name": "green", "rgb": [20, 110, 80], "percent": 70 }, ...] },     // 1 to 8 colours
  "options": { "nearest": 3, "voters": 30, "minVoters": 20, "top": 5 } }                      // optional

→ { familyMatch, voters, sameColourVoters, settings, notes,
    backgrounds: [{ id, name, title, imageUrl, originalUrl, score, picked, of, reasons, facts }],
    jewellery:   [{ ...the same, category, makeup: { imageUrl, originalUrl } }],
    models:      [{ id, name, imageUrl, originalUrl, score, reasons }] }
```

`id` is the catalogue id `/api/picks` takes. `picked` / `of`: how many of the similar reference photoshoots picked it among their
`nearest` nearest. `familyMatch: false` means too few reference photoshoots of that garment type exist (only sarees are analysed so far),
so the advice is weaker. How it decides: `src/lib/recommend`, and `supabase/RECOMMEND-QUERIES.md`. Not public: it needs the secret,
sends no CORS headers and answers 503 while `VASTRALOOK_PARTNER_SECRET` is unset. Its data is in `catalogue_analysis`,
`reference_photoshoots` and `reference_nearest` (migrations 0009 to 0011), filled by `scripts/import-reference.mjs`.

## Endpoints

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /embed/picker?client&origin&want` | none | The popup picker. Validates `client` + `origin` server-side |
| `GET /api/picks?model&background` | none | Resolve catalogue ids to items |
| `GET /api/embed/<token>` | none | A signed-in person's current pick |
| `/connect.js` | none | The drop-in popup client |
| `GET /api/partner/favorites?email` | shared secret | A signed-in person's favourites, for Vastralook's server |
| `POST /api/partner/recommend` | shared secret | The backgrounds, jewellery and models that go with an analysed garment |

## Security notes

- A `client_key` is an identifier, not a secret. The **origin** is what grants
  access, because it is the part another site cannot forge.
- `postMessage` is always addressed to one exact origin, resolved on the server
  from the allowlist — never `"*"`, which would broadcast the pick to whatever
  page is listening.
- Listeners must check **both** `event.origin` and the message shape. Any page
  can post into your window; matching only on shape is not a check.
- An unknown key, a deactivated client and an unlisted origin all fail the same
  way, so the picker cannot be used to probe which keys exist.
- `integration_clients` has RLS on with no policies: it is readable only by the
  server's service role, so nobody can enumerate who else integrates.

## Checklist for a new site

1. `insert into integration_clients …` with their exact origins
2. Give them their `client_key` and the `connect.js` URL
3. Have them call `StyleMuse.configure` then `StyleMuse.pick`
4. Confirm a pick arrives and that closing the popup resolves `null`
5. When their origin changes (a new domain, a tunnel), update `allowed_origins`
