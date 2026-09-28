/**
 * StyleMuse Connect — pick a model, background, jewellery or hairstyle from
 * any website.
 *
 *   <script src="https://YOUR_STYLEMUSE/connect.js"></script>
 *   <script>
 *     StyleMuse.configure({ client: "your-client-key" });
 *     document.querySelector("#pick").onclick = async () => {
 *       const pick = await StyleMuse.pick("model");   // or "background", "jewellery", "hairstyle"
 *       if (pick) render(pick);                       // { id, name, imageUrl, originalUrl, makeup }
 *     };
 *   </script>
 *
 * A jewellery pick carries `makeup: { imageUrl, originalUrl }` — the look styled
 * to go with it. Every other kind sends `makeup: null`.
 *
 * The picker opens in a popup and posts the answer back, so the host page never
 * navigates: a half-typed prompt, an in-progress upload and scroll position all
 * survive, which a redirect-based flow cannot promise.
 *
 * No storage is written. The pick is handed to the caller and that is the end
 * of this script's involvement — where it lives afterwards (component state, a
 * form field, the host's own database) is the host's decision, not ours.
 */
(function () {
  "use strict";

  var MESSAGE_TYPE = "stylemuse:pick";
  var READY_TYPE = "stylemuse:ready";

  /** The origin this script was served from — where the picker lives. */
  var base = (function () {
    try {
      return new URL(document.currentScript.src).origin;
    } catch (e) {
      return "";
    }
  })();

  var config = { client: null, base: base };

  function configure(options) {
    if (!options) return;
    if (options.client) config.client = String(options.client);
    if (options.base) config.base = String(options.base).replace(/\/+$/, "");
  }

  /**
   * Open the picker and resolve with the chosen item, or null if the window was
   * closed without picking.
   *
   * Rejects only for things the caller can fix: no client key, a blocked popup.
   */
  var KINDS = ["model", "background", "jewellery", "hairstyle"];

  function pick(kind) {
    var want = KINDS.indexOf(kind) >= 0 ? kind : "model";

    return new Promise(function (resolve, reject) {
      if (!config.client) {
        reject(new Error("StyleMuse.configure({ client: ... }) must be called first."));
        return;
      }

      var url =
        config.base +
        "/embed/picker?client=" +
        encodeURIComponent(config.client) +
        "&want=" +
        want +
        // The picker checks this against the client's allowlist server-side,
        // and uses it as the one origin it will post back to.
        "&origin=" +
        encodeURIComponent(window.location.origin);

      var popup = window.open(url, "stylemuse-picker", "width=980,height=760,menubar=no");
      if (!popup) {
        reject(new Error("The StyleMuse picker was blocked. Allow popups for this site."));
        return;
      }

      var done = false;

      function finish(value) {
        if (done) return;
        done = true;
        window.removeEventListener("message", onMessage);
        clearInterval(closedTimer);
        resolve(value);
      }

      function onMessage(event) {
        // Both halves matter: the right origin, and a message shaped like ours.
        if (event.origin !== config.base) return;
        var data = event.data;
        if (!data || typeof data !== "object") return;
        if (data.type === READY_TYPE) return;
        if (data.type !== MESSAGE_TYPE) return;
        if (data.kind !== want) return;
        finish(data.item || null);
      }

      window.addEventListener("message", onMessage);

      // A popup closed by hand fires no message, so the promise would hang.
      var closedTimer = setInterval(function () {
        if (popup.closed) finish(null);
      }, 400);
    });
  }

  window.StyleMuse = { configure: configure, pick: pick };
})();
