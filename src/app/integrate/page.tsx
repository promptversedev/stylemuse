import type { Metadata } from "next";

/**
 * The page a prospective integrator is sent to.
 *
 * INTEGRATION.md covers the same ground, but a repo file is no use to someone
 * who does not have the repo — and the people who need this are on other
 * teams. Everything here is public by nature: a client key is an identifier,
 * the endpoints are CORS-open by design, and the one thing that actually
 * grants access (an allowed origin) is something only we can add.
 */
export const metadata: Metadata = {
  title: "Integrate StyleMuse — models & backgrounds for your site",
  description:
    "Let people pick a model or background from StyleMuse inside your own website. One script, one call, no page navigation.",
};

const SNIPPET = `<button id="pick-model">Pick a model</button>

<script src="https://stylemuse.gemini-logo-remover.workers.dev/connect.js"></script>
<script>
  StyleMuse.configure({ client: "your-client-key" });

  document.querySelector("#pick-model").onclick = async () => {
    const pick = await StyleMuse.pick("model");   // or "background"
    if (!pick) return;                            // closed without choosing
    // { id, name, imageUrl }
    document.querySelector("#thumb").src = pick.imageUrl;
  };
</script>`;

const WIDGET = `<div id="swap-model-bg-widget" data-token="YOUR_PUBLIC_TOKEN"></div>
<script src="https://stylemuse.gemini-logo-remover.workers.dev/embed.js" async></script>`;

const REACT = `const [model, setModel] = useState(null);

async function pickModel() {
  const item = await StyleMuse.pick("model");
  // The page never navigated, so your form is exactly as it was.
  if (item) setModel(item);
}`;

export default function IntegratePage() {
  return (
    <main className="docs">
      <header className="docs__hero">
        <p className="docs__eyebrow">For developers</p>
        <h1>Put StyleMuse&rsquo;s catalogue in your site</h1>
        <p className="docs__lede">
          Your users pick a model or a background from our catalogue, and you get back an id, a
          name and an image URL. We keep the catalogue, the images and the sign-in; you keep your
          page exactly as it was.
        </p>
      </header>

      <section className="docs__section">
        <h2>How it works</h2>
        <ol className="docs__steps">
          <li>
            <b>You call <code>StyleMuse.pick()</code></b> — our picker opens in a small window.
          </li>
          <li>
            <b>Your user chooses one.</b> The window posts the choice back and closes itself.
          </li>
          <li>
            <b>You get an object.</b> <code>{"{ id, name, imageUrl }"}</code> — render it however
            you like.
          </li>
        </ol>
        <p className="docs__note">
          Your page never navigates, so a half-typed prompt, a queued upload and the scroll
          position all survive. That is the whole reason this is a popup and not a redirect.
        </p>
      </section>

      <section className="docs__section">
        <h2>1. Ask us to register your site</h2>
        <p>Send us two things:</p>
        <ul className="docs__list">
          <li>
            <b>A name</b> for the integration, e.g. “Acme Studio”.
          </li>
          <li>
            <b>Every origin</b> you will call from — scheme, host and port, exactly:
            <br />
            <code>https://app.acme.com</code>, and your dev origin if you want one, e.g.{" "}
            <code>http://localhost:3000</code>.
          </li>
        </ul>
        <p>
          We reply with a <b>client key</b>. It is public — it lives in your HTML and grants
          nothing on its own. What actually grants access is the <b>origin</b> your browser
          reports, checked against your list on every call, because that is the part another site
          cannot forge.
        </p>
        <p className="docs__note">
          We do not accept wildcards like <code>*.acme.com</code>: it would be a standing offer to
          every subdomain anyone can take over. Tell us when an origin changes and we will update
          it.
        </p>
      </section>

      <section className="docs__section">
        <h2>2. Drop in the script</h2>
        <pre className="docs__code">{SNIPPET}</pre>
        <p>That is the whole API.</p>
        <ul className="docs__list">
          <li>
            <code>StyleMuse.configure({"{ client }"})</code> — your client key. Call it once.
          </li>
          <li>
            <code>StyleMuse.pick(kind)</code> — <code>&quot;model&quot;</code> or{" "}
            <code>&quot;background&quot;</code>. Resolves with the item, or{" "}
            <code>null</code> if the window was closed without choosing. Rejects only for things
            you can fix: a missing client key, or a blocked popup.
          </li>
        </ul>
      </section>

      <section className="docs__section">
        <h2>In React</h2>
        <pre className="docs__code">{REACT}</pre>
      </section>

      <section className="docs__section">
        <h2>Where the pick should live</h2>
        <p>
          <code>connect.js</code> writes no storage of its own, deliberately. The pick is handed to
          you and that is the end of our involvement.
        </p>
        <p>
          Keep it in component state, put it in a form field, or save it against your own user.
          Reaching for <code>localStorage</code> is the tempting shortcut and usually the wrong
          one: it is per-browser, so it quietly disagrees with itself across someone&rsquo;s
          devices, and it will not be there when your server needs to know what they chose.
        </p>
      </section>

      <section className="docs__section">
        <h2>The other one: showing a pick you already made</h2>
        <p>
          Two things here share the word &ldquo;embed&rdquo;, and they solve opposite problems.
          Everything above lets <b>your visitors choose</b> from our catalogue. This one
          <b> displays what one particular person has already chosen</b> — a live badge of their
          current model and background.
        </p>
        <pre className="docs__code">{WIDGET}</pre>
        <p>
          Every element with <code>#swap-model-bg-widget</code> or{" "}
          <code>[data-swap-widget]</code> is filled in with that person&rsquo;s current pick. It
          re-reads on each page load, so changing the selection on StyleMuse changes what your
          page shows — nothing to re-paste.
        </p>
        <p>
          The <b>public token</b> identifies whose pick to show. A signed-in user finds theirs
          under <b>Get embed code</b>, which prints the snippet with it already filled in. It is
          not a secret and not an account credential: it reveals a display name and a current
          selection, and nothing else.
        </p>
        <div className="docs__table">
          <div className="docs__row docs__row--head">
            <span>You want</span>
            <span />
            <span>Use</span>
          </div>
          <div className="docs__row">
            <span>Your visitors to pick from our catalogue</span>
            <span />
            <span>
              <code>connect.js</code> &mdash; <code>StyleMuse.pick()</code>
            </span>
          </div>
          <div className="docs__row">
            <span>To show what someone already picked</span>
            <span />
            <span>
              <code>embed.js</code> &mdash; the widget above
            </span>
          </div>
        </div>
        <p className="docs__note">
          The widget needs no client key and no registered origin — it only reads a public token.
          The picker needs both, because it hands data back into your page.
        </p>
      </section>

      <section className="docs__section">
        <h2>If popups are a problem</h2>
        <p>
          Some browsers block <code>window.open</code> outside a click, and some people block
          popups outright. There is a redirect flow for that — you send them to us, we send them
          back with the answer in the URL:
        </p>
        <pre className="docs__code">
          {`https://stylemuse.gemini-logo-remover.workers.dev/?return=<your-url>&want=model`}
        </pre>
        <p>
          They come back to <code>return</code> with{" "}
          <code>?stylemuse_model=&lt;id&gt;</code> and/or <code>?stylemuse_bg=&lt;id&gt;</code>.
          Resolve those to items with:
        </p>
        <pre className="docs__code">
          {`GET /api/picks?model=<id>&background=<id>
→ { model: { id, name, imageUrl } | null, background: … }`}
        </pre>
        <p className="docs__note">
          Strip those parameters once you have read them (<code>history.replaceState</code>), or
          they survive a copy-paste and a reload. And note the trade: a redirect reloads your page,
          so anything unsaved on it is gone. Prefer the popup.
        </p>
      </section>

      <section className="docs__section">
        <h2>Endpoints</h2>
        <div className="docs__table">
          <div className="docs__row docs__row--head">
            <span>Endpoint</span>
            <span>Auth</span>
            <span>What it does</span>
          </div>
          <div className="docs__row">
            <span>
              <code>/connect.js</code>
            </span>
            <span>none</span>
            <span>The drop-in popup client</span>
          </div>
          <div className="docs__row">
            <span>
              <code>/embed/picker</code>
            </span>
            <span>none</span>
            <span>The picker itself. Checks your key and origin server-side</span>
          </div>
          <div className="docs__row">
            <span>
              <code>/api/picks</code>
            </span>
            <span>none</span>
            <span>Turn catalogue ids into items</span>
          </div>
          <div className="docs__row">
            <span>
              <code>/api/embed/&lt;token&gt;</code>
            </span>
            <span>none</span>
            <span>A signed-in person&rsquo;s current pick, which keeps up to date</span>
          </div>
        </div>
      </section>

      <section className="docs__section">
        <h2>Does anyone need to sign in?</h2>
        <p>
          <b>No.</b> Everything above works for a visitor with no account. Signing in buys exactly
          one thing: a pick that persists and follows them to another device, readable later
          through <code>/api/embed/&lt;token&gt;</code> instead of only during one visit.
        </p>
      </section>

      <section className="docs__section">
        <h2>Security, briefly</h2>
        <ul className="docs__list">
          <li>
            A client key is an <b>identifier, not a secret</b>. Your origin is the credential.
          </li>
          <li>
            We <code>postMessage</code> to <b>one exact origin</b>, resolved server-side from your
            list — never <code>&quot;*&quot;</code>.
          </li>
          <li>
            Your listener must check <b>both</b> <code>event.origin</code> and the message shape.
            Any page can post into your window; matching on shape alone is not a check.{" "}
            <code>connect.js</code> does both for you.
          </li>
          <li>
            An unknown key, a paused integration and an unlisted origin all fail identically, so
            the picker cannot be used to probe which keys exist.
          </li>
        </ul>
      </section>

      <footer className="docs__footer">
        <p>
          Questions, or an origin to add? Get in touch and we&rsquo;ll set you up. There is a
          fuller write-up in <code>INTEGRATION.md</code> if you have the repo.
        </p>
      </footer>
    </main>
  );
}
