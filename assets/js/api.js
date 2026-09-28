/* =============================================================================
   api.js — mock of bandy.ai's `material.trendingList` procedure.

   Mirrors the real contract so swapping in the network call later is a
   one-function change:

     GET /api/trpc/material.trendingList
       input  { cursor, pageSize, categoryId, keyword }
       output { items[], cursor }   // cursor === null  =>  no more pages

   The cursor is an opaque base64 blob here too, exactly like the real one, so
   nothing downstream is allowed to treat it as an offset.
   ========================================================================== */
(function (global) {
  'use strict';

  var PAGE_SIZE = 30;          // 142 records -> 5 pages (30/30/30/30/22)
  var LATENCY = [420, 780];    // simulated round trip, ms

  function encodeCursor(offset) {
    return global.btoa(JSON.stringify({ offset: offset, ts: 1754554423446 }));
  }

  function decodeCursor(cursor) {
    if (!cursor) return 0;
    try {
      var parsed = JSON.parse(global.atob(cursor));
      return typeof parsed.offset === 'number' ? parsed.offset : 0;
    } catch (err) {
      return 0;
    }
  }

  function matches(item, categoryId, keyword) {
    if (categoryId && item.category !== categoryId) return false;
    if (keyword) {
      var needle = keyword.trim().toLowerCase();
      if (needle && item.name.toLowerCase().indexOf(needle) === -1) return false;
    }
    return true;
  }

  /**
   * @param {{cursor?:string, pageSize?:number, categoryId?:string, keyword?:string}} input
   * @param {{signal?:AbortSignal}} [options]
   * @returns {Promise<{items:Array, cursor:string|null, total:number, page:number, totalPages:number}>}
   */
  function trendingList(input, options) {
    input = input || {};
    options = options || {};

    var pageSize = input.pageSize || PAGE_SIZE;
    var offset = decodeCursor(input.cursor);

    var pool = global.DATA.GALLERY.filter(function (item) {
      return matches(item, input.categoryId, input.keyword);
    });

    var items = pool.slice(offset, offset + pageSize);
    var next = offset + items.length;
    var delay = LATENCY[0] + Math.random() * (LATENCY[1] - LATENCY[0]);

    return new Promise(function (resolve, reject) {
      var timer = global.setTimeout(function () {
        resolve({
          items: items,
          cursor: next < pool.length ? encodeCursor(next) : null,
          total: pool.length,
          page: Math.floor(offset / pageSize) + 1,
          totalPages: Math.max(1, Math.ceil(pool.length / pageSize))
        });
      }, delay);

      if (options.signal) {
        options.signal.addEventListener('abort', function () {
          global.clearTimeout(timer);
          var err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }
    });
  }

  global.API = {
    PAGE_SIZE: PAGE_SIZE,
    trendingList: trendingList
  };
})(window);
