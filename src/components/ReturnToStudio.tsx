"use client";

/**
 * "Send to Studio" — the hand-back half of the Vastralook Studio integration.
 *
 * The Studio sends people here with `?return=<its own url>`. Once they have
 * signed in and picked a model and background, this button takes them back to
 * that url with `?stylemuse=<public_token>` appended, which is all the Studio
 * needs to read their pick from `/api/embed/[token]` afterwards.
 *
 * The two apps stay separate: this hands over a token, never a session, and
 * StyleMuse remains the only place models, backgrounds and auth live.
 */

import { useEffect, useRef, useState } from "react";

/**
 * Origins allowed to receive a token.
 *
 * Without this the `return` parameter is an open redirect that leaks the
 * token to whatever origin an attacker puts in a link. Comma-separated so a
 * deployment can list its staging and production Studio hosts.
 */
const ALLOWED_ORIGINS = (
  // `||`, not `??`: wrangler.jsonc carries the var as "" when unset, and an
  // empty string would otherwise parse to an allowlist of nothing — silently
  // disabling the hand-back rather than falling back to the dev origin.
  process.env.NEXT_PUBLIC_STUDIO_ORIGINS?.trim() || "http://localhost:3002"
)
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

/** The `return` url, but only when it points somewhere we trust. */
function allowedReturnUrl(raw: string | null): URL | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return ALLOWED_ORIGINS.includes(url.origin) ? url : null;
}

export function ReturnToStudio({
  publicToken,
  selectedModelId,
  selectedBackgroundId,
}: {
  publicToken: string | null;
  selectedModelId: string | null;
  selectedBackgroundId: string | null;
}) {
  const [returnUrl, setReturnUrl] = useState<URL | null>(null);
  /** Which one the Studio sent them for, when it said. */
  const [want, setWant] = useState<"model" | "background" | null>(null);
  /**
   * What was already selected when this page opened.
   *
   * The auto-return has to fire on a *change*, not on what is already there:
   * a signed-in visitor arrives with their last pick restored, and without
   * this they would be bounced straight back out before seeing the catalogue.
   */
  const initial = useRef<{ model: string | null; background: string | null } | null>(null);
  const sent = useRef(false);

  // Read once on mount: this is a URL concern, and the app never pushes a
  // different `return` while it is open.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnUrl(allowedReturnUrl(params.get("return")));
    const asked = params.get("want");
    setWant(asked === "model" || asked === "background" ? asked : null);
  }, []);

  /**
   * Go straight back once the thing the Studio asked for has been picked.
   *
   * Only when `want` names one side: sent for a model, a model click is the
   * whole errand and a second click would be friction. With no `want` the
   * visitor may be picking both, so the button stays the way out.
   */
  useEffect(() => {
    if (!returnUrl || !want || sent.current) return;
    if (initial.current === null) {
      initial.current = { model: selectedModelId, background: selectedBackgroundId };
      return;
    }
    const chosen = want === "model" ? selectedModelId : selectedBackgroundId;
    const before = want === "model" ? initial.current.model : initial.current.background;
    if (!chosen || chosen === before) return;

    sent.current = true;
    const target = new URL(returnUrl.toString());
    if (publicToken) {
      target.searchParams.set("stylemuse", publicToken);
    } else {
      if (selectedModelId) target.searchParams.set("stylemuse_model", selectedModelId);
      if (selectedBackgroundId) target.searchParams.set("stylemuse_bg", selectedBackgroundId);
    }
    window.location.href = target.toString();
  }, [returnUrl, want, selectedModelId, selectedBackgroundId, publicToken]);

  const handOff = (model: string | null, background: string | null) => {
    if (!returnUrl || sent.current) return;
    sent.current = true;
    const target = new URL(returnUrl.toString());
    if (publicToken) {
      // Signed in: hand over the token, so the Studio keeps reading this
      // person's pick as they change it, not just today's choice.
      target.searchParams.set("stylemuse", publicToken);
    } else {
      // Signed out: hand over the ids themselves. The Studio resolves them
      // through /api/picks, which needs no account.
      if (model) target.searchParams.set("stylemuse_model", model);
      if (background) target.searchParams.set("stylemuse_bg", background);
    }
    window.location.href = target.toString();
  };

  if (!returnUrl) return null;

  const label = returnUrl.hostname === "localhost" ? "Studio" : returnUrl.hostname;

  const hasPick = Boolean(selectedModelId || selectedBackgroundId);

  // Signed out, nothing has been picked yet: there is nothing to hand over,
  // and saying so beats a button that would send an empty selection.
  if (!publicToken && !hasPick) {
    return (
      <span className="embedbtn" style={{ opacity: 0.7, cursor: "default" }}>
        {want ? `Pick a ${want} to continue` : "Pick a model or background"}
      </span>
    );
  }

  return (
    <button
      className="embedbtn"
      type="button"
      onClick={() => handOff(selectedModelId, selectedBackgroundId)}
    >
      Send to {label}
    </button>
  );
}
