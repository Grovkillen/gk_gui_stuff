// gk_gui_stuff: the marker (marker.rb; gk_gui_stuff_marker.css). Shows where a setting or a function changes something
// on the page: a dashed outline in the role ui-effect around every place found, an outline so that nothing moves, and
// at the current place a solid outline and a striped flag (GkGui.flag, kind changed or new): "Ändrat: <setting> · 1 av
// N", "Nytt: … · 2 av N". The panel has fixed places, so that nothing moves when the marks are switched on and off: one
// button that says Visa markeringar or Dölj markeringar, the number ("4 ställen", with the marks on "1 av 4"), Föregående
// and Nästa (with the marks off they stand there switched off and say why; with them on both go round), Visa alla…
// (always; a choice in it leads to its place and marks), and the row of what went away, always there and empty when
// nothing did: "Borta: …" with "Visa var den stod" when its place is known, which marks, scrolls there and draws an empty
// dashed box where it stood. A screen reader hears each place in a live region. A place is found only by the anchors the
// server gives (the footprint's anchors, adds and removes, which records keeps to steady anchors) and by the effect mark
// data-gk-<plugin>-effect; never by text, look, place or nesting. Loaded on every page with the primitives, after the
// flag. Plain DOM, no jQuery.
//   GkGui.marker.show(items, {mode, root, panel, on})  the items: [{key, setting, kind: 'changed' | 'new' | 'gone',
//                     anchors: [...], what, where, rect}]; mode 'preview' (until hide(), for the preview
//                     mode) or 'saved' (after a save, until the page is left); root: where to look (the page by
//                     default); panel: the element of the controls (gk_gui_stuff_marker_panel), by default every panel
//                     of the page's own ([data-gk-gui-marker-panel="page"]); on: false counts the places and fills the
//                     panel with the marks still off, as every page does after a save. Returns the number of places
//   A panel drawn with items: (data-gk-gui-marker-items, looked for under data-gk-gui-marker-root) takes them up at its
//   first press, marks off, without any show()
//   GkGui.marker.on() / off()     the marks switched on (at the first place) and off; the panel keeps its places
//   GkGui.marker.hide()           the marks over: everything taken away, the panel emptied and the band's part put away
//   GkGui.marker.next() / prev()  the current place moved, scrolled to and told; only with the marks on
//   GkGui.marker.go(i)            the place i (from 0), marks on
//   GkGui.marker.all(opener)      Visa alla: every place in a list in the upper layer
//   GkGui.marker.gone(i)          Visa var den stod for the gone item i: marks on, an empty dashed box where it stood
//   GkGui.marker.rescan()         the anchors read again (a module that drew late; also on the event gk-gui-stuff-drawn,
//                                 and when an element an anchor found comes into view or goes out of it)
//   GkGui.marker.relay()          the box for what is gone laid again, and hidden under a held bar (a page that held
//                                 or let go its bar after the scroll)
//   GkGui.marker.active()         the mode while the marks are on ('preview' or 'saved'), else null
//   GkGui.marker.places()         the places' elements, in the page's order
(function () {
  var G = window.GkGui = window.GkGui || {};
  if (G.marker) return;
  var T = {};
  var tEl = document.getElementById('gk-gui-stuff-primitives-texts');
  try { if (tEl) T = JSON.parse(tEl.textContent); } catch (e) { /* no words */ }
  var KINDS = { changed: 1, 'new': 1, gone: 1 };
  var MAX = 400;
  var state = null, live = null, timer = null, pageOffer = null;
  var reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function w(k, vals) {
    var s = T['marker_' + k] || '';
    return s.replace(/%\{(\w+)\}/g, function (m, n) { return vals && vals[n] != null ? String(vals[n]) : m; });
  }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  // ---- the live region
  function region() {
    if (live && live.isConnected) return live;
    live = el('div', 'gk-gui-stuff-sr-only');
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('data-gk-gui-marker-live', '1');
    document.body.appendChild(live);
    return live;
  }
  function say(text) {
    var r = region();
    r.textContent = '';
    // set after a moment, so that the same words told again are heard again
    setTimeout(function () { r.textContent = text; }, 60);
  }

  // ---- what may be marked: shown, and not the marker's own surfaces, the flags' layer or a still copy
  function outOfReach(n) {
    for (var p = n; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      if (p.hasAttribute('inert') || p.getAttribute('aria-hidden') === 'true') return true;
      if (p.hasAttribute('data-gk-gui-marker-panel') || p.hasAttribute('data-gk-gui-marker-part') || p.hasAttribute('data-gk-gui-marker-ghost')) return true;
      if (p.classList.contains('gk-gui-stuff-flags') || p.classList.contains('gk-gui-stuff-layer')) return true;
    }
    return false;
  }
  // inside a closed fold an element keeps its size and looks shown, so the browser is asked as well, as for the flags
  function visible(n) {
    if (n.checkVisibility && !n.checkVisibility()) return false;
    return n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden';
  }
  function query(sel, root) {
    if (typeof sel !== 'string' || !sel.trim()) return [];
    try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); } catch (e) { return []; }
  }
  function clean(items) {
    return (Array.isArray(items) ? items : []).filter(function (it) { return it && KINDS[it.kind]; }).map(function (it) {
      return { key: String(it.key || ''), setting: String(it.setting || ''), kind: it.kind, what: it.what != null ? String(it.what) : null,
               anchors: (Array.isArray(it.anchors) ? it.anchors : []).filter(function (a) { return typeof a === 'string'; }),
               where: typeof it.where === 'string' ? it.where : null, rect: it.rect || null };
    });
  }

  // ---- the places
  // A place is { el, item, items }: item the first item whose anchor found it, items every item whose anchor finds it
  // (two settings with the same anchor share the place, and each counts it as found)
  function collect() {
    var places = [], seen = [];
    state.items.forEach(function (it) {
      it.found = 0;
      if (it.kind === 'gone') return;
      var mine = [];
      it.anchors.forEach(function (sel) {
        query(sel, state.root).forEach(function (n) {
          var at = n._gkGuiPlace;
          // a place of an earlier item: this item shows there too
          if (at) { if (at.items.indexOf(it) < 0) { at.items.push(it); mine.push(n); } return; }
          if (outOfReach(n)) return;
          if (seen.length < MAX) seen.push(n);
          if (places.length >= MAX || !visible(n)) return;
          // inside a place of the same item already: that place shows it
          for (var i = 0; i < mine.length; i++) if (mine[i].contains(n)) return;
          var p = { el: n, item: it, items: [it] };
          n._gkGuiPlace = p;
          mine.push(n);
          places.push(p);
        });
      });
      it.found = mine.length;
    });
    places.sort(function (a, b) { return a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1; });
    watch(seen);
    return places;
  }
  // What an anchor found and is hidden now can come into view later (the issue form behind Ändra, a folded part, a menu),
  // and a place can go out of view: the browser tells when such an element gets a size or loses it, and only that turn
  // reads the anchors again, never a change of size while it shows. An inline element (a link) never reports a size, so
  // the nearest box around it is watched instead; a fold's opening and closing changes no size and is told by toggle
  var seenShown = new WeakMap();
  function boxAround(n) {
    var p = n;
    while (p.parentElement && p !== document.body && getComputedStyle(p).display === 'inline') p = p.parentElement;
    return p;
  }
  var sizes = window.ResizeObserver ? new ResizeObserver(function (entries) {
    var turned = false;
    entries.forEach(function (e) {
      var now = visible(e.target);
      if (seenShown.get(e.target) !== now) turned = true;
      seenShown.set(e.target, now);
    });
    if (turned) soon();
  }) : null;
  function watch(list) {
    if (!sizes) return;
    sizes.disconnect();
    list.forEach(function (n) { var b = boxAround(n); seenShown.set(b, visible(b)); sizes.observe(b); });
  }
  // The frame's corners (gk_gui_stuff_marker.css): a place without corners of its own gets the stylesheet's notch, and an
  // inline place on one line with something in it is made one box, so that the frame has no steps. Measured with the box
  // on, and taken back if the place, what is in it or what holds it would move or change size
  function moved(a, b) { return Math.abs(a.left - b.left) > 0.5 || Math.abs(a.top - b.top) > 0.5 || Math.abs(a.width - b.width) > 0.5 || Math.abs(a.height - b.height) > 0.5; }
  function shape(n) {
    var s = getComputedStyle(n);
    if (s.borderRadius === '0px') n.setAttribute('data-gk-gui-mark-fold', '1');
    if (s.display !== 'inline' || !n.firstElementChild || !n.parentElement || n.getClientRects().length !== 1) return;
    var in0 = n.firstElementChild.getBoundingClientRect(), holder0 = n.parentElement.getBoundingClientRect(), own0 = n.getBoundingClientRect();
    n.setAttribute('data-gk-gui-mark-box', '1');
    var own = n.getBoundingClientRect();
    if (moved(n.firstElementChild.getBoundingClientRect(), in0) || moved(n.parentElement.getBoundingClientRect(), holder0) ||
        Math.abs(own.left - own0.left) > 0.5 || Math.abs(own.width - own0.width) > 0.5) n.removeAttribute('data-gk-gui-mark-box');
  }
  function paint() { state.places.forEach(function (p) { p.el.setAttribute('data-gk-gui-mark', p.item.kind); shape(p.el); }); }
  // the marks taken off; the places stay known, so that the panel can still count them and Visa alla list them
  function unmark() {
    unflag();
    state.places.forEach(function (p) { ['data-gk-gui-mark', 'data-gk-gui-mark-current', 'data-gk-gui-mark-fold', 'data-gk-gui-mark-box'].forEach(function (a) { p.el.removeAttribute(a); }); });
  }
  function unpaint() {
    if (!state) return;
    unmark();
    state.places.forEach(function (p) { p.el._gkGuiPlace = null; });
    state.places = [];
  }
  function label(it) { return it.kind === 'new' ? w('new', { what: it.what || it.setting }) : w('changed', { setting: it.setting }); }
  // a place's words: every item that shows there, each by its own words
  function placeLabel(p) { return p.items.map(label).filter(function (s, i, a) { return a.indexOf(s) === i; }).join(' · '); }
  function unflag() {
    if (state && state.flag && G.flag) G.flag.remove(state.flag);
    if (state) state.flag = null;
  }

  // the place i: solid, with the flag; scroll: brought into view; quiet: not told
  function go(i, scroll, quiet) {
    if (!state || !state.on || !state.places.length) return;
    var n = state.places.length;
    i = ((i % n) + n) % n;
    var cur = state.places[state.at];
    if (cur) cur.el.removeAttribute('data-gk-gui-mark-current');
    unflag();
    state.at = i;
    var p = state.places[i], words = placeLabel(p), of = w('of', { n: i + 1, total: n });
    p.el.setAttribute('data-gk-gui-mark-current', '1');
    if (G.flag) state.flag = G.flag.put(p.el, words + ' · ' + of, { kind: p.item.kind === 'new' ? 'new' : 'changed', role: 'effect', said: false });
    if (scroll && p.el.scrollIntoView) p.el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduced && reduced.matches ? 'auto' : 'smooth' });
    if (!quiet) say(w('at', { label: words, n: i + 1, total: n }));
    panels().forEach(drawState);
  }

  // ---- the panel
  function panels() {
    if (!state) return [];
    if (state.panel) return [state.panel];
    return query('[data-gk-gui-marker-panel="page"]');
  }
  function gone() { return state ? state.items.filter(function (it) { return it.kind === 'gone'; }) : []; }
  function goneWords(it) { return it.what && it.what !== it.setting ? w('gone_in', { what: it.what, setting: it.setting }) : w('gone', { what: it.what || it.setting }); }
  function placeKnown(it) {
    if (it.rect && it.rect.width >= 0) return true;
    if (!it.where) return false;
    return query(it.where, state.root).some(function (n) { return n.getClientRects().length > 0; });
  }
  function quietRows() {
    var rows = [], keys = {};
    state.items.forEach(function (it) {
      var k = keys[it.key] = keys[it.key] || { setting: it.setting, found: 0, gone: 0 };
      if (it.kind === 'gone') k.gone++; else k.found += it.found;
    });
    Object.keys(keys).forEach(function (key) {
      var k = keys[key];
      // nothing found, described or not: the panel says so, so that the setting never just stands without a place
      if (k.found || k.gone) return;
      rows.push(w('none_here', { setting: k.setting }));
    });
    return rows;
  }
  function placesWords(n) { return !n ? w('places_none') : n === 1 ? w('places_one') : w('places_other', { count: n }); }
  // Föregående and Nästa keep their places: why tells why they cannot be pressed, or null when they can
  function drawSteps(pn, why) {
    Array.prototype.forEach.call(pn.querySelectorAll('[data-gk-gui-marker="prev"], [data-gk-gui-marker="next"]'), function (b) {
      b.setAttribute('aria-disabled', why ? 'true' : 'false');
      // the words also for the press: the buttons carry Redmine's no-tooltip, so that its tooltip neither empties a title nor
      // puts one back on a button that has come to work; the tip is the browser's own
      if (why) { b.title = why; b.setAttribute('data-gk-gui-marker-why', why); }
      else { b.removeAttribute('title'); b.removeAttribute('data-gk-gui-marker-why'); }
    });
  }
  // what changes when the marks go on and off, or the current place moves: only words, in places that keep their size
  // (the button and the number each hold room for all their words; gk_gui_stuff_marker.css)
  function drawState(pn) {
    var n = state.places.length;
    pn.setAttribute('data-gk-gui-marker-on', state.on ? '1' : '0');
    var count = pn.querySelector('[data-gk-gui-marker-places]');
    if (count) count.textContent = state.on && n ? w('of', { n: state.at + 1, total: n }) : placesWords(n);
    var room = pn.querySelectorAll('[data-gk-gui-marker-room]');
    if (room[0]) room[0].textContent = placesWords(n);
    if (room[1]) room[1].textContent = w('of', { n: n, total: n });
    drawSteps(pn, !state.on ? w('first') : n ? null : w('places_none'));
  }
  function renderPanel() {
    var n = state.places.length;
    panels().forEach(function (pn) {
      drawState(pn);
      var box = pn.querySelector('[data-gk-gui-marker-rows]');
      if (box) {
        box.textContent = '';
        gone().forEach(function (it, i) {
          var row = el('p', 'gk-gui-stuff-marker-row');
          row.appendChild(el('span', null, goneWords(it)));
          if (placeKnown(it)) {
            var b = el('button', 'gk-gui-stuff-marker-where', w('where'));
            b.type = 'button';
            b.setAttribute('data-gk-gui-marker', 'where');
            b.setAttribute('data-gk-gui-marker-index', String(i));
            row.appendChild(b);
          }
          box.appendChild(row);
        });
      }
      var quiet = pn.querySelector('[data-gk-gui-marker-quiet]');
      if (quiet) {
        quiet.textContent = '';
        quietRows().forEach(function (t) { quiet.appendChild(el('p', 'gk-gui-stuff-marker-row', t)); });
      }
    });
    countInBand(n);
  }
  // the band's part of the marks has the number of places as its count; with no place it has no count, since a bare 0
  // reads as a fault, and its panel says that there is no place on this page
  function countInBand(n) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-gk-gui-marker-part]'), function (part) {
      var btn = part.querySelector('.gk-gui-stuff-band-button') || part;
      var c = part.querySelector('.gk-gui-stuff-band-count');
      if (!n) { if (c) c.remove(); }
      else {
        if (!c) {
          c = el('span', 'gk-gui-stuff-band-count');
          var caret = btn.querySelector('.gk-gui-stuff-band-caret');
          btn.insertBefore(c, caret || null);
        }
        c.textContent = String(n);
      }
      if (!btn._gkGuiSaid) btn._gkGuiSaid = btn.getAttribute('aria-label') || '';
      if (btn._gkGuiSaid) { var said = n ? btn._gkGuiSaid + ', ' + n : btn._gkGuiSaid; btn.setAttribute('aria-label', said); btn.title = said; }
    });
    if (window.GkGuiTopBand && window.GkGuiTopBand.fitAll) window.GkGuiTopBand.fitAll();
  }
  function emptyPanels() {
    panels().forEach(function (pn) {
      Array.prototype.forEach.call(pn.querySelectorAll('[data-gk-gui-marker-places], [data-gk-gui-marker-rows], [data-gk-gui-marker-quiet]'), function (n) { n.textContent = ''; });
    });
  }
  // the band's part put away when the marks end for good (hide()); a band left with nothing in it goes with it
  // the focus in a part about to be put away goes first to the band's next control that shows, else to the content
  function focusAway(part) {
    var a = document.activeElement;
    if (!a || !part.contains(a)) return;
    var band = part.closest('[data-gk-gui-band]'), to = null;
    if (band) to = [].filter.call(band.querySelectorAll('summary, button, a[href]'), function (n) { return !part.contains(n) && n.getClientRects().length > 0; })[0] || null;
    if (!to) {
      to = document.getElementById('content');
      if (to && !to.hasAttribute('tabindex')) to.setAttribute('tabindex', '-1');
    }
    if (to && to.focus) to.focus({ preventScroll: true });
  }
  function putPartAway() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-gk-gui-marker-part]'), function (part) {
      if (part.tagName === 'DETAILS') part.open = false;
      focusAway(part);
      part.hidden = true;
      var band = part.closest('[data-gk-gui-band]');
      if (band && !band.querySelector('.gk-gui-stuff-band-part:not([hidden])')) band.hidden = true;
    });
    if (window.GkGuiTopBand && window.GkGuiTopBand.fitAll) window.GkGuiTopBand.fitAll();
  }

  // ---- gone: an empty dashed box where it stood
  function unghost() {
    if (!state || !state.ghost) return;
    if (G.flag) G.flag.clear(state.ghost);
    state.ghost.remove();
    state.ghost = null;
  }
  function rectOf(it) {
    if (it.rect) return { left: +it.rect.left || 0, top: +it.rect.top || 0, width: +it.rect.width || 0, height: +it.rect.height || 0 };
    var n = query(it.where, state.root).filter(function (x) { return x.getClientRects().length > 0; })[0];
    if (!n) return null;
    var r = n.getBoundingClientRect();
    return { left: r.left + window.pageXOffset, top: r.top + window.pageYOffset, width: r.width, height: r.height };
  }
  function placeGhost(g, r) {
    g.style.left = r.left + 'px'; g.style.top = r.top + 'px';
    g.style.width = Math.max(r.width, 24) + 'px'; g.style.height = Math.max(r.height, 16) + 'px';
  }
  // The box lies on top of the page; where its upper edge lies under a box held at the top of the window (the page's
  // bar, core's header on a phone) it is hidden, as the flag is: the flag's own test (GkGui.flag.underBar), at its two
  // upper corners and the middle, read from what the browser draws and its computed position only
  function coverGhost(g) {
    if (!G.flag || !G.flag.underBar) return;
    var r = g.getBoundingClientRect(), y = r.top + 1;
    var under = [r.left + 1, r.left + r.width / 2, r.right - 1].some(function (x) { return G.flag.underBar(g, x, y); });
    g.classList.toggle('gk-gui-stuff-marker-ghost-off', under);
  }
  // the window's size changed or the page scrolled: the box laid again where the place now is, once a frame, never
  // scrolled to or told
  var relaying = false;
  function relayGhost() {
    if (relaying || !state || !state.ghost) return;
    relaying = true;
    window.requestAnimationFrame(function () {
      relaying = false;
      if (!state || !state.ghost) return;
      var it = gone()[state.ghostItem], r = it ? rectOf(it) : null;
      if (r) placeGhost(state.ghost, r);
      coverGhost(state.ghost);
    });
  }
  function showGone(i) {
    var it = gone()[i];
    if (!it) return;
    var r = rectOf(it);
    if (!r) return;
    switchOn(true);
    unghost();
    var g = el('div', 'gk-gui-stuff-marker-ghost');
    g.setAttribute('data-gk-gui-marker-ghost', '1');
    g.setAttribute('aria-hidden', 'true');
    placeGhost(g, r);
    document.body.appendChild(g);
    state.ghost = g;
    state.ghostItem = i;
    coverGhost(g);
    var words = goneWords(it);
    if (G.flag) G.flag.put(g, words, { kind: 'gone', role: 'effect', said: false });
    if (g.scrollIntoView) g.scrollIntoView({ block: 'center', behavior: reduced && reduced.matches ? 'auto' : 'smooth' });
    say(words);
  }

  // ---- Visa alla
  function showAll(opener) {
    if (!state || !G.layer) return;
    var n = state.places.length;
    if (!n) { G.layer.open({ key: 'gk-gui-marker-all', title: w('all'), content: el('p', null, w('places_none')), anchor: opener || null, opener: opener || null }); return; }
    var list = el('ol', 'gk-gui-stuff-marker-list');
    state.places.forEach(function (p, i) {
      var li = el('li');
      var b = el('button', null, placeLabel(p) + ' · ' + w('of', { n: i + 1, total: n }));
      b.type = 'button';
      b.addEventListener('click', function () {
        G.layer.close('gk-gui-marker-all');
        // the band's panel Visa alla stood in closes too (a press with the mouse has closed it already), and the focus
        // goes to its part's button, never to a button inside a closed panel
        var d = opener && opener.closest ? opener.closest('details.gk-gui-stuff-fly') : null;
        if (d && d.open && G.fly && G.fly.close) G.fly.close(d);
        else if (d) { var s = d.querySelector(':scope > summary'); if (s) s.focus({ preventScroll: true }); }
        // the place chosen is marked, also when the marks were off
        switchOn(true);
        go(i, true);
      });
      li.appendChild(b);
      list.appendChild(li);
    });
    G.layer.open({ key: 'gk-gui-marker-all', title: w('all'), content: list, anchor: opener || null, opener: opener || null });
  }

  // ---- the marks as a whole
  // The marks switched on, at the first place; the panel only changes its words
  function switchOn(quiet) {
    if (state.on) return;
    state.on = true;
    paint();
    if (state.places.length) go(0, false, quiet);
    else {
      panels().forEach(drawState);
      if (!quiet) say(gone().length ? w('shown_gone', { count: gone().length }) : w('places_none'));
    }
  }
  // The marks switched off; the places stay counted and the panel stays as it is, also in the band's part
  function switchOff(quiet) {
    if (!state.on) return;
    if (G.layer) G.layer.close('gk-gui-marker-all');
    unghost();
    unmark();
    state.on = false;
    state.at = -1;
    panels().forEach(drawState);
    if (!quiet) say(w('hidden'));
  }
  // The marks over. quietly: other marks take their place (an example tried on the page), and the panel keeps its words
  // with the marks off, so that it can bring its own back
  function hide(quietly) {
    if (!state) return;
    if (G.layer) G.layer.close('gk-gui-marker-all');
    unghost();
    unpaint();
    watch([]);
    panels().forEach(function (pn) { pn.setAttribute('data-gk-gui-marker-on', '0'); drawSteps(pn, w('first')); });
    var mode = state.mode;
    if (!quietly) {
      emptyPanels();
      if (!state.panel) pageOffer = null;
    }
    state = null;
    if (!quietly) {
      if (mode === 'saved') putPartAway();
      say(w('hidden'));
    }
  }
  function show(items, o) {
    o = o || {};
    if (state) hide(true);
    state = { items: clean(items), mode: o.mode === 'saved' ? 'saved' : 'preview', root: o.root || document, panel: o.panel || null,
              places: [], at: -1, flag: null, ghost: null, on: o.on !== false };
    if (!state.panel) pageOffer = { items: items, mode: state.mode, root: state.root };
    state.places = collect();
    renderPanel();
    if (state.on) {
      paint();
      if (state.places.length) go(0, false, false);
      else if (gone().length) say(w('shown_gone', { count: gone().length }));
      else say(w('places_none'));
    }
    return state.places.length;
  }
  // the anchors read again: the current place kept when it is still found
  function rescan() {
    if (!state) return 0;
    var was = state.places[state.at] ? state.places[state.at].el : null;
    unpaint();
    state.at = -1;
    state.places = collect();
    renderPanel();
    if (state.on) {
      paint();
      if (state.places.length) {
        var i = 0;
        for (var j = 0; j < state.places.length; j++) if (state.places[j].el === was) { i = j; break; }
        go(i, false, true);
      }
    }
    return state.places.length;
  }
  function soon() { if (!state) return; clearTimeout(timer); timer = setTimeout(rescan, 150); }

  // ---- the controls: the marker's own panel, wherever it stands (the page, the band's part, the preview's panel)
  // A panel drives only its own marks: the ones handed to show() with it, else the page's own. Another panel's marks on
  // the page, or none yet: it takes up what it has to show (the page's own again, or the items it was drawn with), marks
  // off, so that the press is the same as on a panel already in charge. False when it has nothing to show.
  function claim(pn) {
    var page = pn.getAttribute('data-gk-gui-marker-panel') === 'page';
    if (state && (state.panel ? state.panel === pn : page)) return true;
    if (page) {
      if (!pageOffer) return false;
      show(pageOffer.items, { mode: pageOffer.mode, root: pageOffer.root, on: false });
      return true;
    }
    var raw = pn.getAttribute('data-gk-gui-marker-items'), items = null;
    try { if (raw) items = JSON.parse(raw); } catch (e) { items = null; }
    if (!Array.isArray(items)) return false;
    show(items, { mode: 'preview', root: pn.closest('[data-gk-gui-marker-root]') || document, panel: pn, on: false });
    return true;
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    var b = t.closest && t.closest('[data-gk-gui-marker]');
    var pn = b && b.closest('[data-gk-gui-marker-panel]');
    if (!pn || !claim(pn)) return;
    e.preventDefault();
    var what = b.getAttribute('data-gk-gui-marker');
    if (what === 'toggle') { if (state.on) switchOff(false); else switchOn(false); }
    else if (what === 'next' || what === 'prev') {
      // switched off, it still answers: a tip alone never shows on a touch screen
      // (the whisper is the kernel's, which comes later and takes over window.GkGui)
      if (b.getAttribute('aria-disabled') === 'true') { if (window.GkGui.whisper) window.GkGui.whisper(b.getAttribute('data-gk-gui-marker-why'), b); }
      else go(state.at + (what === 'next' ? 1 : -1), true);
    }
    else if (what === 'all') showAll(b);
    else if (what === 'where') {
      var i = parseInt(b.getAttribute('data-gk-gui-marker-index'), 10) || 0;
      showGone(i);
      // the rows drawn anew when the panel took up its items: the focus stays on the same row's button
      if (!b.isConnected) {
        var again = pn.querySelector('[data-gk-gui-marker="where"][data-gk-gui-marker-index="' + i + '"]');
        if (again) again.focus({ preventScroll: true });
      }
    }
  });
  document.addEventListener('gk-gui-stuff-drawn', soon);
  // toggle does not bubble, so it is caught on the way down; the top band's own parts open and close without a new reading
  document.addEventListener('toggle', function (e) {
    var t = e.target;
    if (t && t.closest && !t.closest('.gk-gui-stuff-band')) soon();
  }, true);
  window.addEventListener('resize', relayGhost);
  window.addEventListener('scroll', relayGhost, { capture: true, passive: true });
  // An open part's panel keeps the band in the window (gk_gui_stuff_elements.css), so that it follows Nästa. At the very
  // top of the page the band stands where it always stands and is no bar over what lies right under it, so a flag there
  // stays (GkGui.flag.underBar goes by the computed position)
  function bandAtTop() {
    var band = document.querySelector('body > .gk-gui-stuff-band');
    if (band) band.toggleAttribute('data-gk-gui-band-top', window.pageYOffset <= 0);
  }
  window.addEventListener('scroll', bandAtTop, { passive: true });

  function start() {
    var src = document.getElementById('gk-gui-stuff-marks');
    if (!src) return;
    var data = null;
    try { data = JSON.parse(src.textContent); } catch (e) { return; }
    if (!data || !Array.isArray(data.items) || !data.items.length) return;
    // after a save the marks start off: the panel has the number of places and Visa markeringar, and the person switches on
    show(data.items, { mode: 'saved', on: false });
    // what a module draws after the first paint (folded texts, a kept column) is read once more
    window.addEventListener('load', soon);
    setTimeout(soon, 1500);
  }

  G.marker = { show: show, hide: function () { hide(false); }, on: function () { if (state) switchOn(false); }, off: function () { if (state) switchOff(false); },
               next: function () { if (state) go(state.at + 1, true); }, prev: function () { if (state) go(state.at - 1, true); },
               go: function (i) { if (state) { switchOn(true); go(i, true); } }, all: showAll, gone: showGone, rescan: rescan, relay: relayGhost,
               active: function () { return state && state.on ? state.mode : null; },
               places: function () { return state ? state.places.map(function (p) { return p.el; }) : []; } };
  function begin() { bandAtTop(); start(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin); else setTimeout(begin, 0);
})();
