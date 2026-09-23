/**
 * Swap Model & BG — cross-site selection widget.
 *
 * Usage, on ANY other website:
 *
 *   <div id="swap-model-bg-widget" data-token="USER_PUBLIC_TOKEN"></div>
 *   <script src="https://YOUR_APP_DOMAIN/embed.js" async></script>
 *
 * Every element with [data-swap-widget] (or #swap-model-bg-widget) is
 * populated with the model + background that user currently has selected
 * on Swap Model & BG, fetched from the public embed API. No login and no
 * API key needed on the embedding site — the public_token is not a secret,
 * it only reveals a display name + current selection, nothing account-level.
 */
(function () {
  "use strict";

  /**
   * Where to fetch the selection from.
   *
   * Taken from this script's own src, so the snippet works wherever StyleMuse
   * is deployed with nothing to edit. It used to be a literal placeholder —
   * "https://YOUR_APP_DOMAIN" — which meant every copied snippet fetched a
   * domain that does not exist and silently rendered "Couldn't load selection."
   *
   * window.SWAP_MODEL_BG_ORIGIN still wins, for a site proxying us.
   */
  var API_ORIGIN =
    (window && window.SWAP_MODEL_BG_ORIGIN) ||
    (function () {
      try {
        return new URL(document.currentScript.src).origin;
      } catch (e) {
        return "";
      }
    })();

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function renderCard(container, data) {
    container.innerHTML = "";
    container.style.cssText =
      "display:flex;gap:10px;align-items:center;font-family:system-ui,sans-serif;padding:10px 12px;border:1px solid #e4e4e7;border-radius:12px;max-width:320px;background:#fff;";

    if (!data.model && !data.background) {
      container.appendChild(
        el("span", null, "No selection yet on StyleMuse.")
      );
      return;
    }

    [data.model, data.background].forEach(function (item) {
      if (!item) return;
      var thumb = el("img");
      thumb.src = item.imageUrl;
      thumb.alt = item.name || "";
      thumb.style.cssText =
        "width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0;";
      container.appendChild(thumb);
    });

    var labelWrap = el("div");
    labelWrap.style.cssText = "display:flex;flex-direction:column;gap:2px;min-width:0;";
    var title = el("strong", null, data.model ? data.model.name : "");
    title.style.cssText = "font-size:13px;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
    var sub = el("span", null, data.background ? data.background.name : "");
    sub.style.cssText = "font-size:12px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
    labelWrap.appendChild(title);
    labelWrap.appendChild(sub);
    container.appendChild(labelWrap);
  }

  function renderError(container) {
    container.textContent = "Couldn't load selection.";
  }

  function hydrate(container) {
    var token = container.getAttribute("data-token");
    if (!token) return;

    fetch(API_ORIGIN + "/api/embed/" + encodeURIComponent(token))
      .then(function (res) {
        if (!res.ok) throw new Error("bad response");
        return res.json();
      })
      .then(function (data) {
        renderCard(container, data);
      })
      .catch(function () {
        renderError(container);
      });
  }

  function init() {
    var nodes = document.querySelectorAll(
      "[data-swap-widget], #swap-model-bg-widget"
    );
    nodes.forEach(hydrate);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
