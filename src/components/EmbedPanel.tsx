"use client";

import { useState } from "react";
import { Icon } from "@/components/IconSprite";

export function EmbedPanel({
  publicToken,
  onClose,
}: {
  publicToken: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  /**
   * Where this app is actually being served from.
   *
   * `window.location.origin` first, with NEXT_PUBLIC_SITE_URL only as a
   * fallback — the order used to be the other way round, which put
   * "http://localhost:3000" into the snippet on the deployed site. That value
   * is inlined into the client bundle at build time, and the build runs on a
   * developer's machine against .env.local; the production value in
   * wrangler.jsonc is a *server* variable and can never reach compiled client
   * code. Worse, because the env value was truthy the `||` was folded away
   * entirely, so the URL became a hard-coded literal.
   *
   * The origin the panel is running on needs no configuration and is correct
   * on every deployment. Safe to read during render because this panel is only
   * mounted after a click, so it is never part of server-rendered HTML.
   */
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL ?? "");

  const snippet = `<div id="swap-model-bg-widget" data-token="${publicToken}"></div>\n<script src="${origin}/embed.js" async></script>`;

  return (
    <div className="embedpanel">
      <div className="embedpanel__head">
        <span className="embedpanel__title">Show your pick on other sites</span>
        <button className="embedpanel__close" type="button" onClick={onClose} aria-label="Close">
          <Icon id="i-close" />
        </button>
      </div>
      <p className="embedpanel__body">
        Paste this snippet into any other website. It always shows the model &amp;
        background you currently have selected here.
      </p>
      <pre className="embedpanel__code">{snippet}</pre>
      <button
        className="embedpanel__copy"
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(snippet).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? "Copied!" : "Copy snippet"}
      </button>
    </div>
  );
}
