/* =============================================================================
   app.js — Swap Model & BG workspace

   Sections
     1  helpers
     2  state
     3  rail / drawer
     4  upload + examples
     5  accordions
     6  model picker
     7  background picker
     8  panel footer (ratio, count, credits, create)
     9  category chips + search
    10  masonry feed + scroll-triggered auto fetch
    11  lightbox / toast
   ========================================================================== */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════ 1 · helpers ══ */

  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function icon(id, className) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ico' + (className ? ' ' + className : ''));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }

  function debounce(fn, wait) {
    var timer;
    return function () {
      var args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  var DESKTOP = window.matchMedia('(min-width: 1024px)');

  /* ════════════════════════════════════════════════════ 2 · state ══ */

  var state = {
    /* feed */
    items: [],          // everything rendered so far, in arrival order
    cursor: '',         // opaque cursor from the API; null == exhausted
    loading: false,
    exhausted: false,
    failed: false,
    total: 0,
    category: '',       // '' == All
    keyword: '',
    requestId: 0,       // guards against out-of-order responses
    /* masonry */
    columns: [],        // [{ node, height }]
    columnCount: 0,
    /* panel */
    upload: null,
    model: null,
    background: null,
    modelFilters: {}    // { gender: 'Female', age: 'Adult', ... }
  };

  var nodes = {
    grid: $('#grid'),
    skeleton: $('#skeleton'),
    scroller: $('#scroller'),
    sentinel: $('#sentinel'),
    meta: $('#meta'),
    feedEnd: $('#feedEnd'),
    feedError: $('#feedError'),
    chips: $('#chips'),
    search: $('#search'),
    panel: $('#panel'),
    rail: $('#rail'),
    scrim: $('#navScrim'),
    toast: $('#toast')
  };

  /* ═══════════════════════════════════════════ 3 · rail / drawer ══ */

  function renderRail() {
    var list = $('#railList');
    DATA.NAV.forEach(function (item) {
      var li = el('li');
      var a = el('a', 'rail__link', { href: '#' + item.id });
      if (item.active) a.setAttribute('aria-current', 'page');
      a.appendChild(icon('i-' + item.icon));
      var label = el('span');
      label.textContent = item.label;
      a.appendChild(label);
      a.addEventListener('click', function (event) {
        event.preventDefault();
        closeDrawer();
        if (!item.active) toast(item.label + ' is not part of this page.');
      });
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  function openDrawer() {
    nodes.rail.classList.add('is-open');
    nodes.scrim.hidden = false;
    $('#navToggle').setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    nodes.rail.classList.remove('is-open');
    nodes.scrim.hidden = true;
    $('#navToggle').setAttribute('aria-expanded', 'false');
    if (!nodes.panel.classList.contains('is-open')) document.body.style.overflow = '';
  }

  $('#navToggle').addEventListener('click', function () {
    if (nodes.rail.classList.contains('is-open')) closeDrawer(); else openDrawer();
  });
  nodes.scrim.addEventListener('click', closeDrawer);

  /* ──────────────────────────────────── bottom sheet (panel) ─────── */

  function openPanel() {
    nodes.panel.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    $('#panelClose').focus();
  }

  function closePanel() {
    nodes.panel.classList.remove('is-open');
    if (!nodes.rail.classList.contains('is-open')) document.body.style.overflow = '';
  }

  $('#openPanel').addEventListener('click', openPanel);
  $('#panelClose').addEventListener('click', closePanel);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (!$('#lightbox').hidden) { closeLightbox(); return; }
    if (nodes.panel.classList.contains('is-open')) { closePanel(); return; }
    if (nodes.rail.classList.contains('is-open')) closeDrawer();
  });

  /* Leaving the touch layout must not strand the sheet/drawer state. */
  DESKTOP.addEventListener('change', function (event) {
    if (event.matches) {
      nodes.rail.classList.remove('is-open');
      nodes.panel.classList.remove('is-open');
      nodes.scrim.hidden = true;
      document.body.style.overflow = '';
    }
    observeSentinel();
  });

  /* ════════════════════════════════════ 4 · upload + examples ══ */

  var dropzone = $('#dropzone');
  var preview = $('#dropzonePreview');
  var clearBtn = $('#dropzoneClear');
  var fileInput = el('input', null, { type: 'file', accept: 'image/jpeg,image/png,image/webp' });
  fileInput.hidden = true;
  document.body.appendChild(fileInput);

  function setUpload(src, label) {
    state.upload = src ? { src: src, label: label || 'Uploaded image' } : null;
    if (src) {
      preview.src = src;
      preview.hidden = false;
      clearBtn.hidden = false;
      dropzone.classList.add('has-file');
    } else {
      preview.removeAttribute('src');
      preview.hidden = true;
      clearBtn.hidden = true;
      dropzone.classList.remove('has-file');
    }
    syncCreate();
  }

  dropzone.addEventListener('click', function (event) {
    if (event.target.closest('.dropzone__clear')) return;
    fileInput.click();
  });
  dropzone.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.click(); }
  });

  ['dragenter', 'dragover'].forEach(function (type) {
    dropzone.addEventListener(type, function (event) {
      event.preventDefault();
      dropzone.classList.add('is-drag');
    });
  });
  ['dragleave', 'drop'].forEach(function (type) {
    dropzone.addEventListener(type, function () { dropzone.classList.remove('is-drag'); });
  });
  dropzone.addEventListener('drop', function (event) {
    event.preventDefault();
    var file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) readFile(file);
  });

  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files[0]) readFile(fileInput.files[0]);
    fileInput.value = '';
  });

  function readFile(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast('Only JPEG, PNG and WEBP files are supported.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast('That file is larger than 20MB.');
      return;
    }
    var reader = new FileReader();
    reader.onload = function () { setUpload(reader.result, file.name); };
    reader.readAsDataURL(file);
  }

  clearBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    setUpload(null);
  });

  function renderExamples() {
    var list = $('#examples');
    DATA.EXAMPLE_UPLOADS.forEach(function (src, i) {
      var li = el('li');
      var button = el('button', null, { type: 'button', 'aria-label': 'Use example image ' + (i + 1) });
      var thumb = el('img', null, { src: src, alt: '', loading: 'lazy', decoding: 'async' });
      button.appendChild(thumb);
      button.addEventListener('click', function () {
        setUpload(src, 'Example ' + (i + 1));
      });
      li.appendChild(button);
      list.appendChild(li);
    });
  }

  /* ════════════════════════════════════════════ 5 · accordions ══ */

  function initAccordion(id) {
    var root = $(id);
    var head = $('.acc__head', root);
    var body = $('.acc__body', root);

    head.addEventListener('click', function () {
      var open = root.dataset.open === 'true';
      root.dataset.open = open ? 'false' : 'true';
      head.setAttribute('aria-expanded', String(!open));
      body.hidden = open;
    });
    return { root: root, head: head, body: body };
  }

  var accModel = initAccordion('#accModel');
  var accBg = initAccordion('#accBg');

  /* ══════════════════════════════════════════ 6 · model picker ══ */

  function renderModelFilters() {
    var wrap = $('#modelFilters');
    DATA.MODEL_FILTERS.forEach(function (group) {
      group.values.forEach(function (value) {
        var chip = el('button', 'filters__chip', { type: 'button', 'aria-pressed': 'false' });
        chip.textContent = value;
        chip.addEventListener('click', function () {
          /* clicking the active value clears that facet */
          var active = state.modelFilters[group.key] === value;
          state.modelFilters[group.key] = active ? null : value;

          wrap.querySelectorAll('.filters__chip').forEach(function (other) {
            if (other.dataset.group !== group.key) return;
            other.setAttribute('aria-pressed',
              String(other.textContent === state.modelFilters[group.key]));
          });
          renderModels();
        });
        chip.dataset.group = group.key;
        wrap.appendChild(chip);
      });
    });
  }

  function matchingModels() {
    return DATA.MODELS.filter(function (model) {
      return Object.keys(state.modelFilters).every(function (key) {
        var wanted = state.modelFilters[key];
        return !wanted || model[key] === wanted;
      });
    });
  }

  function renderModels() {
    var grid = $('#modelGrid');
    var empty = $('#modelEmpty');
    grid.textContent = '';

    /* "upload your own" always leads the grid */
    var upload = el('li');
    var uploadBtn = el('button', 'tile tile--upload', { type: 'button' });
    uploadBtn.appendChild(icon('i-user'));
    uploadBtn.appendChild(document.createTextNode('Your model'));
    uploadBtn.addEventListener('click', function () { toast('Upload a reference photo of your own model.'); });
    upload.appendChild(uploadBtn);
    grid.appendChild(upload);

    var models = matchingModels();
    empty.hidden = models.length > 0;

    models.forEach(function (model) {
      var li = el('li');
      var button = el('button', 'tile tile--model', {
        type: 'button',
        'aria-pressed': String(state.model && state.model.id === model.id),
        title: model.name + ' · ' + model.gender + ' · ' + model.age + ' · ' + model.body
      });
      button.appendChild(el('img', 'tile__media', {
        src: model.thumb, alt: model.name, loading: 'lazy', decoding: 'async'
      }));
      var name = el('span', 'tile__name');
      name.textContent = model.name;
      button.appendChild(name);
      var check = el('span', 'tile__check');
      check.appendChild(icon('i-check'));
      button.appendChild(check);

      button.addEventListener('click', function () {
        state.model = (state.model && state.model.id === model.id) ? null : model;
        grid.querySelectorAll('.tile--model').forEach(function (tile) {
          tile.setAttribute('aria-pressed', 'false');
        });
        if (state.model) button.setAttribute('aria-pressed', 'true');
        $('#modelValue').textContent = state.model ? state.model.name : '';
        syncCreate();
      });

      li.appendChild(button);
      grid.appendChild(li);
    });
  }

  /* ═════════════════════════════════════ 7 · background picker ══ */

  var bgGroup = null;

  function renderBgFilters() {
    var wrap = $('#bgFilters');
    DATA.BACKGROUND_GROUPS.forEach(function (group) {
      var chip = el('button', 'filters__chip', { type: 'button', 'aria-pressed': 'false' });
      chip.textContent = group;
      chip.addEventListener('click', function () {
        bgGroup = bgGroup === group ? null : group;
        wrap.querySelectorAll('.filters__chip').forEach(function (other) {
          other.setAttribute('aria-pressed', String(other.textContent === bgGroup));
        });
        renderBackgrounds();
      });
      wrap.appendChild(chip);
    });
  }

  function renderBackgrounds() {
    var grid = $('#bgGrid');
    grid.textContent = '';

    var upload = el('li');
    var uploadBtn = el('button', 'tile tile--upload', { type: 'button' });
    uploadBtn.appendChild(icon('i-scene'));
    uploadBtn.appendChild(document.createTextNode('Your BG'));
    uploadBtn.addEventListener('click', function () { toast('Upload your own background reference.'); });
    upload.appendChild(uploadBtn);
    grid.appendChild(upload);

    DATA.BACKGROUNDS
      .filter(function (bg) { return !bgGroup || bg.group === bgGroup; })
      .forEach(function (bg) {
        var li = el('li');
        var button = el('button', 'tile tile--bg', {
          type: 'button',
          'aria-pressed': String(state.background && state.background.id === bg.id),
          title: bg.name + ' · ' + bg.group
        });
        var swatch = el('span', 'tile__media');
        swatch.style.background = bg.css;
        button.appendChild(swatch);
        var name = el('span', 'tile__name');
        name.textContent = bg.name;
        button.appendChild(name);
        var check = el('span', 'tile__check');
        check.appendChild(icon('i-check'));
        button.appendChild(check);

        button.addEventListener('click', function () {
          state.background = (state.background && state.background.id === bg.id) ? null : bg;
          grid.querySelectorAll('.tile--bg').forEach(function (tile) {
            tile.setAttribute('aria-pressed', 'false');
          });
          if (state.background) button.setAttribute('aria-pressed', 'true');
          $('#bgValue').textContent = state.background ? state.background.name : '';
          syncCreate();
        });

        li.appendChild(button);
        grid.appendChild(li);
      });
  }

  /* ════════════════════════════════════════ 8 · panel footer ══ */

  var CREDITS_PER_IMAGE = 6;

  function syncCreate() {
    var count = parseInt($('#count').value, 10) || 1;
    var cost = count * CREDITS_PER_IMAGE;
    $('#credits').querySelector('b').textContent = String(cost);

    var ready = Boolean(state.upload);
    $('#createBtn').disabled = !ready;

    var note = $('#createNote');
    if (!ready) {
      note.textContent = 'Upload an image to start.';
    } else {
      var picked = [];
      if (state.model) picked.push('model ' + state.model.name);
      if (state.background) picked.push('BG ' + state.background.name);
      note.textContent = picked.length
        ? 'Using ' + picked.join(' and ') + ' · ' + cost + ' credits'
        : 'Model and BG are optional · ' + cost + ' credits';
    }
  }

  $('#count').addEventListener('change', syncCreate);

  $('#createBtn').addEventListener('click', function () {
    var button = $('#createBtn');
    button.disabled = true;
    $('#createNote').textContent = 'Generating ' + $('#count').value + ' images…';
    setTimeout(function () {
      toast('Demo only — no generation backend is wired up.');
      syncCreate();
    }, 900);
  });

  /* ═══════════════════════════════════ 9 · chips + search ══ */

  function renderChips() {
    var frag = document.createDocumentFragment();

    var all = el('button', 'chip', { type: 'button', role: 'tab', 'aria-selected': 'true' });
    all.textContent = 'All';
    all.dataset.value = '';
    frag.appendChild(all);

    DATA.CATEGORIES.forEach(function (name) {
      var chip = el('button', 'chip', { type: 'button', role: 'tab', 'aria-selected': 'false' });
      chip.textContent = name;
      chip.dataset.value = name;
      frag.appendChild(chip);
    });

    nodes.chips.appendChild(frag);

    nodes.chips.addEventListener('click', function (event) {
      var chip = event.target.closest('.chip');
      if (!chip) return;
      if (chip.dataset.value === state.category) return;

      nodes.chips.querySelectorAll('.chip').forEach(function (other) {
        other.setAttribute('aria-selected', String(other === chip));
      });
      state.category = chip.dataset.value;
      resetFeed();
    });
  }

  $('#chipsMore').addEventListener('click', function () {
    var expanded = nodes.chips.classList.toggle('is-expanded');
    this.setAttribute('aria-expanded', String(expanded));
  });

  nodes.search.addEventListener('input', debounce(function () {
    var value = nodes.search.value.trim();
    if (value === state.keyword) return;
    state.keyword = value;
    resetFeed();
  }, 320));

  /* ═════════════════════════════ 10 · masonry + auto fetch ══ */

  function columnCount() {
    var w = window.innerWidth;
    if (w >= 1600) return 5;
    if (w >= 1280) return 4;
    if (w >= 640) return 3;
    return 2;
  }

  function buildColumns(count) {
    nodes.grid.textContent = '';
    state.columns = [];
    for (var i = 0; i < count; i++) {
      var col = el('div', 'grid__col');
      nodes.grid.appendChild(col);
      state.columns.push({ node: col, height: 0 });
    }
    state.columnCount = count;
  }

  function shortestColumn() {
    return state.columns.reduce(function (shortest, col) {
      return col.height < shortest.height ? col : shortest;
    }, state.columns[0]);
  }

  /* Cards are placed into the column that is currently shortest, using the
     known aspect ratio rather than a layout read — so appending a page never
     triggers reflow of the cards already on screen. */
  function placeCard(item, index) {
    var column = shortestColumn();
    column.node.appendChild(buildCard(item, index));
    column.height += 1 / item.aspect;
  }

  function buildCard(item, index) {
    var card = el('article', 'card');
    card.style.animationDelay = Math.min(index % API.PAGE_SIZE, 12) * 18 + 'ms';

    var open = el('button', 'card__btn', { type: 'button', 'aria-label': 'Preview ' + item.name });
    var img = el('img', 'card__img', {
      src: item.url,
      alt: item.name,
      loading: 'lazy',
      decoding: 'async',
      width: '1024',
      height: String(Math.round(1024 / item.aspect))
    });
    img.style.aspectRatio = String(item.aspect);
    open.appendChild(img);
    open.addEventListener('click', function () { openLightbox(item); });
    card.appendChild(open);

    var badge = el('button', 'card__badge', {
      type: 'button',
      'aria-pressed': String(item.favourited),
      'aria-label': 'Favourite ' + item.name
    });
    badge.appendChild(icon('i-heart'));
    var countLabel = el('span');
    countLabel.textContent = String(item.favourites);
    badge.appendChild(countLabel);
    badge.addEventListener('click', function (event) {
      event.stopPropagation();
      item.favourited = !item.favourited;
      item.favourites += item.favourited ? 1 : -1;
      badge.setAttribute('aria-pressed', String(item.favourited));
      countLabel.textContent = String(item.favourites);
    });
    card.appendChild(badge);

    var overlay = el('div', 'card__overlay');
    var name = el('span', 'card__name');
    name.textContent = item.name;
    overlay.appendChild(name);

    var similar = el('button', 'card__similar', { type: 'button' });
    similar.textContent = 'Create Similar';
    similar.addEventListener('click', function (event) {
      event.stopPropagation();
      setUpload(item.url, item.name);
      if (!DESKTOP.matches) openPanel();
      else nodes.panel.scrollIntoView({ block: 'nearest' });
      toast('Loaded "' + item.name + '" into the panel.');
    });
    overlay.appendChild(similar);
    card.appendChild(overlay);

    return card;
  }

  function redistribute() {
    buildColumns(columnCount());
    state.items.forEach(placeCard);
  }

  /* skeletons ----------------------------------------------------- */

  var SKELETON_RATIOS = [0.666, 0.8, 0.75, 1, 0.666, 0.714, 0.8, 0.75, 0.666, 1];

  function showSkeleton(show) {
    var box = nodes.skeleton;
    if (!show) { box.hidden = true; box.textContent = ''; return; }

    box.textContent = '';
    var count = columnCount();
    var cols = [];
    for (var i = 0; i < count; i++) {
      var col = el('div', 'grid__col');
      box.appendChild(col);
      cols.push(col);
    }
    SKELETON_RATIOS.slice(0, count * 2).forEach(function (ratio, i) {
      var block = el('div', 'skeleton');
      block.style.aspectRatio = String(ratio);
      cols[i % count].appendChild(block);
    });
    box.hidden = false;
  }

  /* fetching ------------------------------------------------------ */

  function updateMeta() {
    if (state.keyword || state.category) {
      nodes.meta.textContent = state.items.length + ' of ' + state.total + ' results' +
        (state.category ? ' in ' + state.category : '') +
        (state.keyword ? ' for "' + state.keyword + '"' : '');
    } else {
      nodes.meta.textContent = 'Showing ' + state.items.length + ' of ' + state.total + ' inspirations';
    }
  }

  function loadMore() {
    if (state.loading || state.exhausted) return;

    state.loading = true;
    state.failed = false;
    nodes.feedError.hidden = true;
    showSkeleton(true);

    var id = ++state.requestId;

    API.trendingList({
      cursor: state.cursor,
      pageSize: API.PAGE_SIZE,
      categoryId: state.category,
      keyword: state.keyword
    }).then(function (page) {
      if (id !== state.requestId) return;       // a newer filter won the race

      state.total = page.total;
      page.items.forEach(function (item) {
        state.items.push(item);
        placeCard(item, state.items.length - 1);
      });

      state.cursor = page.cursor;
      state.exhausted = page.cursor === null;
      state.loading = false;
      showSkeleton(false);

      nodes.feedEnd.hidden = !state.exhausted || state.items.length === 0;
      updateMeta();

      if (state.items.length === 0) showEmpty();

      /* A short page (a narrow category) can leave the sentinel still in
         view, and the observer only reports *changes* — so re-check once
         layout has settled, otherwise the feed would stall. */
      if (!state.exhausted) {
        requestAnimationFrame(function () {
          if (!state.loading && !state.exhausted && sentinelVisible()) loadMore();
        });
      }
    }).catch(function () {
      if (id !== state.requestId) return;
      state.loading = false;
      state.failed = true;
      showSkeleton(false);
      nodes.feedError.hidden = false;
    });
  }

  function showEmpty() {
    var box = el('div', 'feed-empty');
    var title = el('b');
    title.textContent = 'Nothing here yet';
    box.appendChild(title);
    var sub = el('span');
    sub.textContent = 'Try another category or clear the search.';
    box.appendChild(sub);
    nodes.grid.textContent = '';
    nodes.grid.appendChild(box);
  }

  function resetFeed() {
    state.requestId++;              // invalidate anything in flight
    state.items = [];
    state.cursor = '';
    state.exhausted = false;
    state.loading = false;
    state.total = 0;
    nodes.feedEnd.hidden = true;
    nodes.feedError.hidden = true;
    nodes.meta.textContent = '';
    buildColumns(columnCount());
    scrollFeedToTop();
    loadMore();
  }

  function scrollFeedToTop() {
    if (DESKTOP.matches) nodes.scroller.scrollTop = 0;
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function sentinelVisible() {
    var rect = nodes.sentinel.getBoundingClientRect();
    var limit = DESKTOP.matches
      ? nodes.scroller.getBoundingClientRect().bottom
      : window.innerHeight;
    return rect.top <= limit + 600;
  }

  /* The observer root differs per layout: an inner scroll box on desktop,
     the viewport on touch layouts. Rebuilt whenever that flips. */
  var observer = null;

  function observeSentinel() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !state.failed) loadMore();
    }, {
      root: DESKTOP.matches ? nodes.scroller : null,
      rootMargin: '600px 0px'
    });
    observer.observe(nodes.sentinel);
  }

  $('#retryBtn').addEventListener('click', function () {
    state.failed = false;
    loadMore();
  });

  /* Column count changes on resize — rebuild the masonry, keeping order. */
  var onResize = debounce(function () {
    if (columnCount() !== state.columnCount) redistribute();
  }, 160);
  window.addEventListener('resize', onResize);

  /* ═══════════════════════════════════ 11 · lightbox + toast ══ */

  var lightbox = $('#lightbox');
  var lastFocus = null;

  function openLightbox(item) {
    lastFocus = document.activeElement;
    $('#lightboxImg').src = item.url;
    $('#lightboxImg').alt = item.name;
    $('#lightboxCap').textContent = item.name + ' · ' + item.taskType;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    $('#lightboxClose').focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    $('#lightboxImg').removeAttribute('src');
    if (!nodes.panel.classList.contains('is-open') &&
        !nodes.rail.classList.contains('is-open')) {
      document.body.style.overflow = '';
    }
    if (lastFocus) lastFocus.focus();
  }

  $('#lightboxClose').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function (event) {
    if (event.target === lightbox) closeLightbox();
  });

  var toastTimer;
  function toast(message) {
    nodes.toast.textContent = message;
    nodes.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      nodes.toast.classList.remove('is-visible');
    }, 2600);
  }

  /* ═══════════════════════════════════════════════════ boot ══ */

  renderRail();
  renderExamples();
  renderModelFilters();
  renderModels();
  renderBgFilters();
  renderBackgrounds();
  renderChips();
  syncCreate();

  buildColumns(columnCount());
  observeSentinel();
  loadMore();
})();
