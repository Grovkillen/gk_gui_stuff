// gk_gui_stuff: Visa var (gk_gui_stuff_show_where.css). When something comes up outside the window an arrow stands in the
// window's edge towards it, up or down, with a word about what came up. The view never moves by itself. A click scrolls
// there, the target gets a ring in the role ui-effect that pulses twice, and Tillbaka stands in the window's lower edge
// until it is used or the person scrolls. The arrow goes when the target is seen and after 20 seconds. With reduced motion
// there is no pulse and no smooth scroll. On a phone the arrows stand under Redmine's fixed header, measured and found by
// its own id. Loaded on every page with the primitives, before the kernel. Plain DOM, no jQuery.
//   GkGui.showWhere({target, word, key, life, text, next: {label, action}, onClose})
//                     the arrow towards target. Nothing is drawn and null is returned when the target is already seen or
//                     not drawn at all. key: the same key updates its arrow instead of drawing another. life: ms until it
//                     goes by itself (0: never). text and next make it a step: a box with the arrow, the text, Nästa and a
//                     cross, which stays while its target is seen and has no time limit unless life is given; next.action
//                     gets the handle, and handle.update({target, word, text}) moves on to the next step. Returns
//                     {close(), update(o), go()}
//   GkGui.showWhere.go(target)        what the arrow's click does: scroll, ring, Tillbaka
//   GkGui.showWhere.close(key)        the arrow of a key taken away
//   GkGui.showWhere.place(target)     where the target is now: 'here', 'up', 'down', or null when it is not drawn
//   GkGui.showWhere.watch(target, fn) fn is called when the target comes into or goes out of the window; returns the stop
//   GkGui.showWhere.word(key, vars)   a word of the primitive's own (where_<key>)
// Several at a time: arrows in the same direction stack in their edge and never overlap, each with its own word and
// target, at most three a direction, the oldest going first; an arrow down stands above Tillbaka.
(function () {
  var G = window.GkGui = window.GkGui || {};
  var T = {};
  var tEl = document.getElementById('gk-gui-stuff-primitives-texts');
  try { if (tEl) T = JSON.parse(tEl.textContent); } catch (e) { /* no words */ }

  var LIFE = 20000, MOST = 3, RING_MS = 2600, SEEN = 4, MOVED = 40, QUIET_MS = 150, TICK_MS = 500;
  var arrows = [], edges = {}, watchers = [], tick = null, back = null, heard = false;

  function word(key, vals) {
    var s = T['where_' + key] || '';
    return s.replace(/%\{(\w+)\}/g, function (m, n) { return vals && vals[n] != null ? String(vals[n]) : m; });
  }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function button(cls, text) { var b = el('button', cls, text); b.type = 'button'; return b; }
  function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function glyph(name, fallback) {
    var K = window.GkGui;
    return K.icon ? K.icon(name, fallback, 16) : document.createTextNode(fallback);
  }

  // Redmine's header where it is fixed (a phone: its lower edge), else nothing; found by its own id, measured, since its
  // height follows the series and the theme
  function headBottom() {
    var h = document.getElementById('header');
    if (!h) return 0;
    var pos = window.getComputedStyle(h).position;
    return pos === 'fixed' || pos === 'sticky' ? Math.max(0, Math.round(h.getBoundingClientRect().bottom)) : 0;
  }

  // Where the target is: outside a box that clips it, or outside the window under the header. What lies in a fixed box
  // follows the window and is always here.
  function place(target) {
    if (!target || !target.isConnected || !target.getClientRects().length) return null;
    var r = target.getBoundingClientRect();
    for (var n = target; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      var cs = window.getComputedStyle(n);
      if (cs.position === 'fixed') return 'here';
      if (n !== target && cs.overflowY !== 'visible') {
        var a = n.getBoundingClientRect();
        if (r.bottom <= a.top + SEEN) return 'up';
        if (r.top >= a.bottom - SEEN) return 'down';
      }
    }
    if (r.bottom <= headBottom() + SEEN) return 'up';
    if (r.top >= window.innerHeight - SEEN) return 'down';
    return 'here';
  }

  // ---------------------------------------------------------------- watching
  function observe(w) {
    if (w.io) w.io.disconnect();
    w.io = new IntersectionObserver(function () { w.fn(); }, { rootMargin: -(headBottom() + SEEN) + 'px 0px -' + SEEN + 'px 0px' });
    w.io.observe(w.target);
  }
  function watch(target, fn) {
    var w = { target: target, fn: fn, io: null };
    observe(w);
    watchers.push(w);
    hear();
    return function () { if (w.io) w.io.disconnect(); watchers = watchers.filter(function (x) { return x !== w; }); };
  }

  // ---------------------------------------------------------------- the edges
  function edge(side) {
    if (edges[side] && edges[side].isConnected) return edges[side];
    var e = el('div', 'gk-gui-stuff-where-edge gk-gui-stuff-where-edge-' + side);
    e.setAttribute('aria-live', 'polite');
    document.body.appendChild(e);
    edges[side] = e;
    return e;
  }
  // an empty edge goes; the top one knows the header's edge, and what the lower one takes up is told, so that the notices
  // on a phone stand above it
  function layEdges() {
    Object.keys(edges).forEach(function (side) { if (edges[side] && !edges[side].firstChild) { edges[side].remove(); edges[side] = null; } });
    var root = document.documentElement;
    if (edges.top) edges.top.style.setProperty('--gk-gui-stuff-where-head', headBottom() + 'px');
    if (edges.bottom) root.style.setProperty('--gk-gui-stuff-where-bottom', edges.bottom.getBoundingClientRect().height + 'px');
    else root.style.removeProperty('--gk-gui-stuff-where-bottom');
  }

  // ---------------------------------------------------------------- the arrow
  function isStep(a) { return !!(a.o.text || a.o.next); }
  function drop(a, silent) {
    if (arrows.indexOf(a) < 0) return;
    arrows = arrows.filter(function (x) { return x !== a; });
    clearTimeout(a.timer);
    if (a.stop) a.stop();
    a.box.remove();
    layEdges();
    if (!arrows.length && tick) { clearInterval(tick); tick = null; }
    if (!silent && a.o.onClose) a.o.onClose();
  }
  function arm(a) {
    clearTimeout(a.timer);
    var life = a.o.life != null ? a.o.life : (isStep(a) ? 0 : LIFE);
    if (life > 0) a.timer = setTimeout(function () { drop(a); }, life);
  }
  function arrowInner(b, dir, text) {
    b.textContent = '';
    b.setAttribute('data-gk-gui-where', dir);
    if (dir !== 'here') {
      var mark = el('span', 'gk-gui-stuff-where-mark');
      mark.setAttribute('aria-hidden', 'true');
      mark.appendChild(dir === 'up' ? glyph('angle-up', '↑') : glyph('angle-down', '↓'));
      b.appendChild(mark);
    }
    b.appendChild(el('span', 'gk-gui-stuff-where-word', text));
    b.title = dir === 'up' ? word('go_up') : dir === 'down' ? word('go_down') : word('go_here');
  }
  function draw(a) {
    a.box.textContent = '';
    a.box.className = isStep(a) ? 'gk-gui-stuff-where-step' : 'gk-gui-stuff-where-one';
    var b = button('gk-gui-stuff-where-arrow');
    b.addEventListener('click', function () { use(a); });
    a.arrow = b;
    arrowInner(b, a.dir, a.o.word || word('default'));
    a.box.appendChild(b);
    if (!isStep(a)) return;
    var x = button('gk-gui-stuff-where-close');
    x.appendChild(glyph('close', '×'));
    x.setAttribute('aria-label', T.close || '');
    x.title = T.close || '';
    x.addEventListener('click', function () { drop(a); });
    a.box.appendChild(x);
    if (a.o.text) a.box.appendChild(el('p', 'gk-gui-stuff-where-text', a.o.text));
    if (a.o.next) {
      var nx = button('gk-gui-stuff-where-next', a.o.next.label || word('next'));
      nx.addEventListener('click', function () { if (a.o.next.action) a.o.next.action(a.handle); });
      a.box.appendChild(nx);
    }
  }
  // the box in the edge its direction points to; a step whose target is seen stays where it stood
  function seat(a) {
    var side = a.dir === 'down' ? 'bottom' : a.dir === 'up' ? 'top' : (a.side || 'top');
    if (a.side !== side || !a.box.parentNode) { a.side = side; edge(side).appendChild(a.box); }
    layEdges();
  }
  function check(a) {
    var d = place(a.target);
    if (d === null || (d === 'here' && !isStep(a))) { drop(a); return; }
    if (d !== a.dir) { a.dir = d; arrowInner(a.arrow, d, a.o.word || word('default')); seat(a); }
  }
  // a direction holds at most three: the oldest goes, a step never
  function trim(dir) {
    var same = arrows.filter(function (x) { return x.dir === dir && !isStep(x); });
    while (same.length > MOST) drop(same.shift());
  }
  function use(a) {
    var target = a.target, opener = a.opener, step = isStep(a), dir = a.dir;
    if (!step) drop(a, true);
    go(target, { opener: opener, dir: dir, keepFocus: step });
  }
  function take(a, o) {
    var target = o.target && o.target !== a.target ? o.target : null;
    Object.keys(o).forEach(function (k) { a.o[k] = o[k]; });
    if (target) {
      if (a.stop) a.stop();
      a.target = target;
      a.stop = watch(target, function () { check(a); });
    }
    var d = place(a.target);
    if (d === null || (d === 'here' && !isStep(a))) { drop(a); return null; }
    a.dir = d;
    draw(a);
    seat(a);
    arm(a);
    return a.handle;
  }
  function show(o) {
    o = o || {};
    var old = o.key != null ? arrows.filter(function (x) { return x.key === o.key; })[0] : null;
    if (old) return take(old, o);
    var d = place(o.target);
    if (d === null || (d === 'here' && !o.text && !o.next)) return null;
    var a = { key: o.key, o: {}, target: o.target, dir: d, box: el('div'), arrow: null, side: null, timer: null, opener: document.activeElement };
    Object.keys(o).forEach(function (k) { a.o[k] = o[k]; });
    a.handle = {
      close: function () { drop(a); },
      update: function (u) { return take(a, u || {}); },
      go: function () { use(a); }
    };
    arrows.push(a);
    draw(a);
    seat(a);
    arm(a);
    a.stop = watch(o.target, function () { check(a); });
    if (!tick) tick = setInterval(function () { arrows.slice().forEach(check); }, TICK_MS);
    trim(d);
    return a.handle;
  }

  // ---------------------------------------------------------------- the ring
  function ring(target) {
    target.classList.remove('gk-gui-stuff-where-ring');
    void target.offsetWidth;
    target.classList.add('gk-gui-stuff-where-ring');
    clearTimeout(target._gkGuiWhereRing);
    target._gkGuiWhereRing = setTimeout(function () { target.classList.remove('gk-gui-stuff-where-ring'); }, RING_MS);
  }

  // ---------------------------------------------------------------- going there, and Tillbaka
  // every box between the target and the window that can scroll, with where it stands now
  function scrollers(target) {
    var out = [];
    for (var n = target.parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      if (window.getComputedStyle(n).overflowY !== 'visible' && n.scrollHeight > n.clientHeight) out.push({ n: n, top: n.scrollTop });
    }
    return out;
  }
  // The room for the header is the window's alone, so it is scroll padding on the root: a scroll margin on the target would
  // count in every box on the way as well, and push the target out of a box lower than the header
  function moveTo(target) {
    var root = document.documentElement, head = headBottom(), tall = target.getBoundingClientRect().height > window.innerHeight - head - 32;
    var kept = target.style.scrollMarginBlockStart, keptRoot = root.style.scrollPaddingBlockStart;
    var has = parseFloat(window.getComputedStyle(root).scrollPaddingBlockStart) || 0;
    target.style.scrollMarginBlockStart = '0px';
    root.style.scrollPaddingBlockStart = (has + head + 16) + 'px';
    target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: tall ? 'start' : 'center', inline: 'nearest' });
    target.style.scrollMarginBlockStart = kept;
    root.style.scrollPaddingBlockStart = keptRoot;
  }
  function backOff() {
    if (!back) return;
    clearTimeout(back.quiet);
    back.button.remove();
    back = null;
    layEdges();
  }
  function land() {
    if (!back) return;
    back.landed = true;
    back.top = back.target.isConnected ? back.target.getBoundingClientRect().top : null;
    back.y = window.scrollY;
  }
  function quiet() {
    clearTimeout(back.quiet);
    back.quiet = setTimeout(land, QUIET_MS);
  }
  // the person's own scroll is told by the target moving in the window (what comes up above it moves the page, not the
  // target), and by the page's position once the target is gone
  function scrolled() {
    if (!back) return;
    if (!back.landed) { quiet(); return; }
    var off;
    if (back.target.isConnected && back.top != null) off = back.target.getBoundingClientRect().top - back.top;
    else if (back.top != null) { back.top = null; back.y = window.scrollY; off = 0; }
    else off = window.scrollY - back.y;
    if (Math.abs(off) > MOVED) backOff();
  }
  function handInput() {
    if (back && Date.now() - back.at > 200) backOff();
  }
  function goBack() {
    if (!back) return;
    var b = back, behavior = reduced() ? 'auto' : 'smooth';
    backOff();
    b.boxes.forEach(function (s) { s.n.scrollTo({ top: s.top, behavior: behavior }); });
    window.scrollTo({ top: b.fromY, left: b.fromX, behavior: behavior });
    if (b.opener && b.opener.isConnected && b.opener !== document.body && b.opener.focus) b.opener.focus({ preventScroll: true });
  }
  function go(target, o) {
    o = o || {};
    var d = o.dir || place(target);
    if (d === null) return false;
    hear();
    if (!back) {
      var bn = button('gk-gui-stuff-where-arrow gk-gui-stuff-where-back');
      bn.setAttribute('data-gk-gui-where-back', '1');
      bn.addEventListener('click', goBack);
      back = { button: bn, fromX: window.scrollX, fromY: window.scrollY, boxes: scrollers(target), opener: o.opener || document.activeElement };
      edge('bottom').insertBefore(bn, edge('bottom').firstChild);
    }
    // the way back points the other way than the way there; a target already seen leaves the way back as it was
    if (d !== 'here' || !back.button.firstChild) {
      back.button.textContent = '';
      var mark = el('span', 'gk-gui-stuff-where-mark');
      mark.setAttribute('aria-hidden', 'true');
      mark.appendChild(d === 'down' ? glyph('angle-up', '↑') : glyph('angle-down', '↓'));
      back.button.appendChild(mark);
      back.button.appendChild(el('span', 'gk-gui-stuff-where-word', word('back')));
    }
    back.target = target; back.at = Date.now(); back.landed = false;
    layEdges();
    moveTo(target);
    ring(target);
    quiet();
    if (!o.keepFocus) back.button.focus({ preventScroll: true });
    return true;
  }

  // ---------------------------------------------------------------- what is heard, once, when first needed
  function hear() {
    if (heard) return;
    heard = true;
    window.addEventListener('scroll', scrolled, { passive: true, capture: true });
    window.addEventListener('wheel', handInput, { passive: true, capture: true });
    window.addEventListener('touchmove', handInput, { passive: true, capture: true });
    window.addEventListener('resize', function () {
      watchers.forEach(observe);
      layEdges();
      arrows.slice().forEach(check);
    });
  }

  G.showWhere = show;
  show.go = go;
  show.close = function (key) { arrows.filter(function (x) { return x.key === key; }).forEach(function (a) { drop(a); }); };
  show.place = place;
  show.watch = watch;
  show.word = word;
})();
