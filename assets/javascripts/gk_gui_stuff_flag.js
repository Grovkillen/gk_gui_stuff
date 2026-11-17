// gk_gui_stuff: the flag (gk_gui_stuff_flag, flag.rb; gk_gui_stuff_flag.css). Lays each flag on top of its target,
// in a layer of its own at the end of the page, so that it takes no room and nothing moves when it comes or goes:
// the pennant in the upper corner at the end of the frame the hover draws (the frame 4 px outside the target),
// inside the frame with its two tips on the frame's edge, and the word after it, outside. A target written right to
// left (read from the computed direction, since Redmine 6.x sets no dir attribute) has its pennant in the other
// corner, mirrored. At the edge of the window or of a box that clips, the word has no room after the pennant and is
// never turned inwards over the target's text: the flag takes the short form there, as long as the room is missing, with
// the word in its small box. The pennant itself never passes the window's edge, and a flag whose target is out of view
// has no coordinates, so that it never makes the page wider. A flag that would be drawn over a box held at the top of the window (a page's own bar,
// core's fixed header on a phone) is hidden while its target is under it. Two flags on one target stack upwards. The pointer on a pennant, and the focus in the
// target, draw a dashed frame in the pennant's role around the whole target; nothing is clickable and nothing is in
// the tab order. A screen reader hears the word with the target ("Spara, ändrat"): as the description of what
// takes the focus, the target or what in it does, else as a hidden text at the target's end. A new flag with a key is told to the server as seen
// once its target has been in view for a moment. The short form, on a target and as an own element, shows its word in
// a small box above the pennant while it is on, kept inside the window, and takes a finger on an invisible surface of
// 24 x 24 px round the pennant, which a tap shows the box on until the next tap anywhere. Under 899 px a tap on what holds a flagged
// target (it has tabindex -1) draws the frame too, and the frame alone shows the focus there. Loaded on every page
// with the primitives. Plain DOM, no jQuery.
//   GkGui.flag.put(target, text, {role, kind, short, key, seen, said, title})  a flag on target (an element), returned;
//                     kind 'new' | 'changed' | 'gone' (striped) or none (solid); text may be empty for a kind (its own
//                     word); seen: the address a new flag's key is posted to
//   GkGui.flag.copy(from, to)        the flags on from laid on to, a still copy of it (never said, never told as seen)
//   GkGui.flag.remove(flag)          the flag taken away (its frame, its words for the screen reader)
//   GkGui.flag.clear(target)         every flag on target taken away
//   GkGui.flag.on(target)            the flags on target
//   GkGui.flag.inline(text, {role, kind, count, short, title, sort})  the flag as an element of its own in the text's flow,
//                     as gk_gui_stuff_flag(text, inline: true): the pennant before the word, the word fully visible;
//                     count first in the word; short: only the pennant, the word in a small box above it on hover and
//                     on a tap, read by a screen reader all the time
//   GkGui.flag.legend(items, {area, label})  a legend as gk_gui_stuff_flag_legend: items [{text, role, kind, count,
//                     sort, title, means}], area the steady anchor whose flags of a row's sort the pointer frames, on a
//                     target or as an own element; a row without a sort is only text
//   GkGui.flag.pennant({role, kind, word, title})  kept as an alias of inline until no plugin calls it
//   GkGui.flag.scan(root)            the flags the server drew under root laid on their targets
//   GkGui.flag.place()               every flag laid again (after a script moved things without resizing them)
(function () {
  var G = window.GkGui = window.GkGui || {};
  if (G.flag) return;
  var T = {};
  var tEl = document.getElementById('gk-gui-stuff-primitives-texts');
  try { if (tEl) T = JSON.parse(tEl.textContent); } catch (e) { /* no words */ }
  // a steady anchor only: ids, classes and data attributes on one element
  var ANCHOR = /^(?:#[A-Za-z][\w-]*|\.[A-Za-z][\w-]*|\[data-[a-z0-9-]+(?:="[^"\\\]]*")?\])+$/;
  var KINDS = { 'new': 1, changed: 1, gone: 1 };
  // a legend's row and the flags of its sort share it (Flags::KEY on the server)
  var SORT = /^[a-z0-9][a-z0-9_.:-]{0,99}$/;
  var ROLE = { fixed: 'tip', 'new': 'admin', changed: 'effect', gone: 'effect' };
  var OUT = 4, GAP = 3, STEP = 12, PW = 8, PH = 10, BASE_Z = 30, REACH = 24;
  var ICON_PROPS = ['--gk-gui-flag-mask', '--gk-gui-flag-clip', '--gk-gui-flag-w', '--gk-gui-flag-fill'];
  var layer = null, targets = [], seq = 0, queued = false, ro = null, io = null, roomDue = true, lastX = 0, tapped = null;
  // the width under which a tap on what holds a target draws its frame, and the frame alone shows the focus
  var narrowMq = window.matchMedia ? window.matchMedia('(max-width: 899px)') : null;
  function narrow() { return !!(narrowMq && narrowMq.matches); }
  function isShort(f) { return f.classList.contains('gk-gui-stuff-flag-short'); }
  // the pennant as it is drawn, an icon's width included (flag_icons.rb); a flag not yet drawn counts as the pennant's own
  function pennantWidth(f) {
    var p = f.querySelector('.gk-gui-stuff-flag-pennant');
    return (p && p.getBoundingClientRect().width) || PW;
  }
  // the short form's box inside the window: pushed in sideways at its edges, and under the pennant where the window's
  // top has no room for it above. Read from the box where it stands, while it shows
  var TIP_ROOM = 4;
  function tipInView(n) {
    var box = n.querySelector('.gk-gui-stuff-flag-word');
    if (!box) return;
    box.style.transform = '';
    n.classList.remove('gk-gui-stuff-flag-tip-below');
    var r = box.getBoundingClientRect(), vw = document.documentElement.clientWidth || window.innerWidth, dx = 0;
    if (r.right > vw - TIP_ROOM) dx = vw - TIP_ROOM - r.right;
    if (r.left + dx < TIP_ROOM) dx = TIP_ROOM - r.left;
    if (dx) box.style.transform = 'translateX(' + dx + 'px)';
    if (r.top < TIP_ROOM) n.classList.add('gk-gui-stuff-flag-tip-below');
  }
  // A flag the caller did not ask to be short takes the short form while its word has no room after the pennant, since
  // the only other place for the word is over the target's text. Read from the word in its full form, in the same frame,
  // so that nothing is drawn between; the form comes back with the room
  function edgeForm(f, w, room) {
    if (f._gkGuiShortGiven) return;
    var was = isShort(f);
    if (was) f.classList.remove('gk-gui-stuff-flag-short');
    var ww = w ? w.getBoundingClientRect().width : 0;
    if (ww > 0 && GAP + ww > room) { f.classList.add('gk-gui-stuff-flag-short'); return; }
    if (was) {
      f.classList.remove('gk-gui-stuff-flag-tip-below');
      if (w) w.style.transform = '';
    }
  }
  // The invisible surface of the short form (the stylesheet draws it, and only for a finger): pushed in sideways as far
  // as it takes so that it never makes the page or a scrolling box wider at its edge, keeps its size and leaves the
  // pennant where it is. None until this has been read, none where the pennant's middle lies outside the room, and none
  // when told, so that it never lies over a bar held at the top of the window while the pennant does not
  function reachIn(n, mid, lo, hi, off) {
    var l = mid - REACH / 2, dx = 0;
    if (l + REACH > hi) dx = hi - REACH - l;
    if (l + dx < lo) dx = lo - l;
    var on = !off && mid >= lo && mid <= hi, x = on && dx ? dx + 'px' : '';
    n.classList.toggle('gk-gui-stuff-flag-reach', on);
    if (n._gkGuiReachX === x || (!x && !n._gkGuiReachX)) return;
    n._gkGuiReachX = x;
    if (x) n.style.setProperty('--gk-gui-flag-reach-x', x); else n.style.removeProperty('--gk-gui-flag-reach-x');
  }
  // the own elements in the short form: they stand in the flow, so that their surface counts in what holds them
  function reachOwn() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-gk-gui-flag-inline].gk-gui-stuff-flag-short'), function (n) {
      var r = n.getBoundingClientRect();
      if (!r.width) { n.classList.remove('gk-gui-stuff-flag-reach'); return; }
      var c = clipBox(n);
      reachIn(n, r.left + r.width / 2, c.l, c.r);
    });
  }

  function roleClass(role) { return G.roleClass ? G.roleClass(role) : ''; }
  function word(kind, text) {
    if (text != null && String(text).trim() !== '') return String(text);
    return (kind && T['flag_' + kind]) || kind || '';
  }
  function host() {
    if (layer && layer.isConnected) return layer;
    layer = document.createElement('div');
    layer.className = 'gk-gui-stuff-flags';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    return layer;
  }
  // a still copy (the library's small pictures, a still example) is inert or hidden from screen readers: never a target.
  // The picture under Visa is inert only so that nothing in it can be pressed: its flags are part of what it shows, and
  // stand on their targets while its box is open. What holds the picture is asked too, so that a copy of one is still a copy
  function copied(n) {
    for (var p = n; p && p !== document.body; p = p.parentElement) {
      if (p === layer) return true;
      if (p.hasAttribute('inert') && !p.hasAttribute('data-gk-gui-compare-picture')) return true;
      if (p.getAttribute('aria-hidden') === 'true') return true;
    }
    return false;
  }
  function find(sel) {
    if (!ANCHOR.test(sel || '')) return null;
    var all;
    try { all = document.querySelectorAll(sel); } catch (e) { return null; }
    for (var i = 0; i < all.length; i++) if (!copied(all[i])) return all[i];
    return null;
  }
  var FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
  function focusable(t) { return t.matches(FOCUSABLE); }
  var VOID = /^(?:AREA|BR|COL|EMBED|HR|IMG|INPUT|LINK|META|SOURCE|TRACK|WBR|SELECT|TEXTAREA|OPTION)$/;

  // ---- the screen reader: the word with the target, as the description of what takes the focus: the target itself,
  // else what in it does (a button in a flagged wrapper is heard "Spara, ändrat"); a hidden text at the target's end
  // only when nothing in it takes the focus
  function sayOn(t, f) {
    if (f.getAttribute('data-gk-gui-flag-said') === '0') return;
    var w = f.querySelector('.gk-gui-stuff-flag-word');
    if (!w) return;
    var on = (focusable(t) || VOID.test(t.tagName)) ? [t] : Array.prototype.slice.call(t.querySelectorAll(FOCUSABLE));
    if (on.length) {
      if (!w.id) w.id = 'gk-gui-flag-word-' + (++seq);
      on.forEach(function (n) {
        var ids = (n.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
        if (ids.indexOf(w.id) < 0) { ids.push(w.id); n.setAttribute('aria-describedby', ids.join(' ')); }
      });
      f._gkGuiSaid = { describedby: w.id, on: on };
    } else {
      var s = document.createElement('span');
      s.className = 'gk-gui-stuff-sr-only';
      s.setAttribute('data-gk-gui-flag-said', '1');
      s.textContent = ', ' + w.textContent;
      t.appendChild(s);
      f._gkGuiSaid = { node: s };
    }
  }
  function unsay(t, f) {
    var s = f._gkGuiSaid;
    if (!s) return;
    if (s.node) s.node.remove();
    if (s.describedby) {
      (s.on || []).forEach(function (n) {
        var ids = (n.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (x) { return x && x !== s.describedby; });
        if (ids.length) n.setAttribute('aria-describedby', ids.join(' ')); else n.removeAttribute('aria-describedby');
      });
    }
    f._gkGuiSaid = null;
  }

  // ---- seen: a new flag's key, once its target has been in view for a moment
  var seenWait = [], seenTimer = null;
  function token() { var m = document.querySelector('meta[name="csrf-token"]'); return m ? m.getAttribute('content') : ''; }
  function flushSeen() {
    seenTimer = null;
    var byUrl = {};
    seenWait.splice(0).forEach(function (p) { (byUrl[p.url] = byUrl[p.url] || []).push(p.key); });
    Object.keys(byUrl).forEach(function (url) {
      var body = new URLSearchParams();
      byUrl[url].forEach(function (k) { body.append('keys[]', k); });
      try {
        fetch(url, { method: 'POST', credentials: 'same-origin', keepalive: true, body: body,
                     headers: { 'X-CSRF-Token': token(), 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' } })
          .catch(function () { /* told again on the next page */ });
      } catch (e) { /* no fetch: told again on the next page */ }
    });
  }
  function watchSeen(t, f) {
    var key = f.getAttribute('data-gk-gui-flag-key'), url = f.getAttribute('data-gk-gui-flag-seen');
    if (!key || !url || !window.IntersectionObserver) return;
    f._gkGuiSeen = { key: key, url: url, timer: null, told: false };
    if (!io) {
      io = new IntersectionObserver(function (list) {
        list.forEach(function (en) {
          (en.target._gkGuiFlags || []).forEach(function (fl) {
            var s = fl._gkGuiSeen;
            if (!s || s.told) return;
            clearTimeout(s.timer);
            if (en.isIntersecting && en.intersectionRatio >= 0.5) {
              s.timer = setTimeout(function () {
                s.told = true;
                seenWait.push({ key: s.key, url: s.url });
                if (!seenTimer) seenTimer = setTimeout(flushSeen, 400);
              }, 1200);
            }
          });
        });
      }, { threshold: [0, 0.5, 1] });
    }
    io.observe(t);
  }

  // ---- the place
  function clipBox(t) {
    var b = { l: 0, t: 0, r: document.documentElement.clientWidth || window.innerWidth, b: document.documentElement.clientHeight || window.innerHeight };
    for (var p = t.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      var cs = getComputedStyle(p);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        var r = p.getBoundingClientRect();
        b = { l: Math.max(b.l, r.left), t: Math.max(b.t, r.top), r: Math.min(b.r, r.right), b: Math.min(b.b, r.bottom) };
      }
    }
    return b;
  }
  // over whatever the target stands in: a popover, a layer or a sheet lie higher than the page
  function layerOf(t) {
    var z = BASE_Z, fixed = false;
    for (var p = t; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      var cs = getComputedStyle(p);
      if (cs.position === 'fixed') fixed = true;
      if (cs.position !== 'static') { var n = parseInt(cs.zIndex, 10); if (!isNaN(n) && n + 1 > z) z = n + 1; }
    }
    return { z: z, fixed: fixed };
  }
  function shown(t, r) {
    if (!t.isConnected || (r.width === 0 && r.height === 0)) return false;
    // a target in a closed details keeps its size and its visibility; the browser's own answer says it is not drawn.
    // A browser without the method goes by the rest
    if (t.checkVisibility && !t.checkVisibility()) return false;
    return getComputedStyle(t).visibility !== 'hidden';
  }
  // A point of a flag under a box held at the top of the window: the first thing drawn there, the flags' own layer
  // passed by, lies in a box whose computed position is fixed or sticky (a page's own bar, core's header on a phone)
  // and that does not hold the target. The flag's layer lies above the page, so such a flag would be drawn over the
  // bar; it is hidden there instead. Read from what the browser draws and its computed position only, never by a
  // box's name or place
  function underBar(t, x, y) {
    var vw = document.documentElement.clientWidth || window.innerWidth, vh = document.documentElement.clientHeight || window.innerHeight;
    if (!document.elementsFromPoint || x < 0 || y < 0 || x >= vw || y >= vh) return false;
    var all = document.elementsFromPoint(x, y);
    for (var i = 0; i < all.length; i++) {
      if (layer && layer.contains(all[i])) continue;
      // the target itself or a box inside it (its own sticky part, a table's held column) is no bar over it
      if (t === all[i] || t.contains(all[i])) return false;
      for (var p = all[i]; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
        if (p.contains(t)) return false;
        var pos = getComputedStyle(p).position;
        if (pos === 'fixed' || pos === 'sticky') return true;
      }
      return false;
    }
    return false;
  }
  function frameOf(t) {
    if (!t._gkGuiFrame) {
      var fr = document.createElement('span');
      fr.className = 'gk-gui-stuff-flag-frame';
      host().appendChild(fr);
      t._gkGuiFrame = fr;
    }
    return t._gkGuiFrame;
  }
  function paintFrame(t) {
    var flags = (t._gkGuiFlags || []), fr = t._gkGuiFrame;
    // a flag hidden under a bar held at the top of the window draws no frame either
    var live = flags.filter(function (f) { return !f._gkGuiCovered; });
    // a tap first, then the pointer on a pennant, then a legend's row that lights flags of its sort, then the focus in the target
    var by = live.filter(function (f) { return f._gkGuiTap; })[0] || live.filter(function (f) { return f._gkGuiHover; })[0] || live.filter(function (f) { return f._gkGuiLit; })[0] || (t._gkGuiFocus ? live[0] : null);
    if (!by || !t._gkGuiShown) { if (fr) fr.classList.remove('gk-gui-stuff-flag-frame-on'); flags.forEach(function (f) { f.classList.remove('gk-gui-stuff-flag-on'); }); return; }
    fr = frameOf(t);
    fr.className = 'gk-gui-stuff-flag-frame gk-gui-stuff-flag-frame-on ' + (by._gkGuiRole || '');
    flags.forEach(function (f) { f.classList.toggle('gk-gui-stuff-flag-on', f === by || !!f._gkGuiLit || !!t._gkGuiFocus); });
    var g = t._gkGuiGeo;
    if (!g) return;
    // a short flag's box lies over the flags stacked with it, and stays inside the window
    flags.forEach(function (f) {
      if (!isShort(f)) return;
      var lit = f.classList.contains('gk-gui-stuff-flag-on');
      f.style.zIndex = String(lit ? g.z + 1 : g.z);
      if (lit) tipInView(f);
    });
    var l = Math.max(g.r.left - OUT, g.clip.l), tp = Math.max(g.r.top - OUT, g.clip.t);
    var rt = Math.min(g.r.right + OUT, g.clip.r), bt = Math.min(g.r.bottom + OUT, g.clip.b);
    fr.style.position = g.fixed ? 'fixed' : 'absolute';
    fr.style.zIndex = String(g.z - 1);
    fr.style.left = (l - g.dx) + 'px'; fr.style.top = (tp - g.dy) + 'px';
    fr.style.width = Math.max(0, rt - l) + 'px'; fr.style.height = Math.max(0, bt - tp) + 'px';
  }
  // A flag hidden because its target is out of view or not drawn has no coordinates and no surface: it rests in the
  // layer's corner, so that the layer, last in the body, never makes the page wider or taller for what cannot be seen.
  // The stylesheet takes its word's and its surface's room away (gk-gui-stuff-flag-off)
  function park(f) {
    f.style.left = ''; f.style.top = '';
    reachIn(f, 0, 0, 0, true);
    f.classList.remove('gk-gui-stuff-flag-flush');
  }
  function placeTarget(t) {
    var flags =(t._gkGuiFlags || []).filter(function (f) { return f.isConnected; });
    t._gkGuiFlags = flags;
    if (!t.isConnected || !flags.length) { drop(t); return; }
    var r = t.getBoundingClientRect();
    t._gkGuiShown = shown(t, r);
    if (!t._gkGuiShown) { flags.forEach(function (f) { f.classList.add('gk-gui-stuff-flag-off'); park(f); }); paintFrame(t); return; }
    var rtl = getComputedStyle(t).direction === 'rtl';
    var clip = clipBox(t), lay = layerOf(t), h = host().getBoundingClientRect();
    var dx = lay.fixed ? 0 : h.left, dy = lay.fixed ? 0 : h.top;
    var cx = rtl ? r.left - OUT : r.right + OUT, cy = r.top - OUT;
    // the corner out of its clipping box (scrolled away): no flag
    var gone = cx < clip.l - OUT || cx > clip.r + OUT || r.top < clip.t - OUT || r.top > clip.b;
    t._gkGuiGeo = { r: r, clip: clip, z: lay.z, fixed: lay.fixed, dx: dx, dy: dy };
    var vw = document.documentElement.clientWidth || window.innerWidth;
    var lo = Math.max(0, clip.l), hi = Math.min(vw, clip.r);
    flags.forEach(function (f, i) {
      f.classList.toggle('gk-gui-stuff-flag-rtl', rtl);
      f.style.position = lay.fixed ? 'fixed' : 'absolute';
      f.style.zIndex = String(lay.z);
      var w = f.querySelector('.gk-gui-stuff-flag-word');
      var pw = pennantWidth(f); // an icon in the pennant's place has its own width, and its end on the frame's edge
      var px = rtl ? cx : cx - pw; // the pennant's left edge: its tips on the frame's edge
      // a target closer to the window's edge than the frame's 4 px: the pennant stays inside the window
      px = Math.max(0, Math.min(px, vw - pw));
      var top = cy - i * STEP;
      edgeForm(f, w, rtl ? px - lo : hi - (px + pw));
      // the short form's word stands in its box above the pennant and takes no room beside it
      var ww = w && !isShort(f) ? w.getBoundingClientRect().width : 0;
      // the word after the pennant, outwards, always: on the pennant's left side where the target is written right to left
      var first = rtl && !isShort(f);
      f.classList.toggle('gk-gui-stuff-flag-word-first', first);
      var left = first ? px - GAP - ww : px;
      // under a bar held at the top of the window (its pennant, or its word where the word shows, at its upper and its
      // lower edge, so that no part lies over the bar's lower edge): hidden there
      var wx = first ? left + ww / 2 : px + pw + GAP + ww / 2;
      f._gkGuiCovered = !gone && (underBar(t, px + pw / 2, top + 1) || underBar(t, px + pw / 2, top + 9) ||
                                  (ww > 0 && (underBar(t, wx, top + 1) || underBar(t, wx, top + 9))));
      f.classList.toggle('gk-gui-stuff-flag-off', gone || f._gkGuiCovered);
      if (gone) { park(f); return; }
      f.style.left = (left - dx) + 'px';
      f.style.top = (top - dy) + 'px';
      if (isShort(f)) {
        // the surface's upper edge, and the tone's padding that would pass the window's edge taken away at that side
        var mid = px + pw / 2, up = top + PH / 2 - REACH / 2 + 1;
        reachIn(f, mid, 0, vw, underBar(t, mid - REACH / 2 + 1, up) || underBar(t, mid, up) || underBar(t, mid + REACH / 2 - 1, up));
        f.classList.toggle('gk-gui-stuff-flag-flush', px + pw + 3 > vw);
      }
    });
    paintFrame(t);
  }
  function placeAll() {
    queued = false;
    targets = targets.filter(function (t) { if (t.isConnected && (t._gkGuiFlags || []).length) return true; drop(t); return false; });
    targets.forEach(placeTarget);
    pending = pending.filter(function (f) { return f.isConnected && !lay(f); });
    if (roomDue) { roomDue = false; reachOwn(); }
  }
  function schedule(e) {
    // the page scrolled up or down changes nothing for the own elements' surfaces; any other pass does, a box scrolled too
    if (!(e && e.type === 'scroll' && e.target === document && window.scrollX === lastX)) roomDue = true;
    lastX = window.scrollX;
    if (queued) return;
    queued = true;
    (window.requestAnimationFrame || setTimeout)(placeAll);
  }
  function drop(t) {
    (t._gkGuiFlags || []).forEach(function (f) { unsay(t, f); f.remove(); });
    t._gkGuiFlags = [];
    if (t._gkGuiFrame) { t._gkGuiFrame.remove(); t._gkGuiFrame = null; }
    if (ro) ro.unobserve(t);
    if (io) io.unobserve(t);
  }

  // ---- a flag laid on its target
  function hover(f, on) {
    f._gkGuiHover = on;
    if (f._gkGuiTarget) paintFrame(f._gkGuiTarget);
  }
  function attach(t, f) {
    if (!t._gkGuiFlags) t._gkGuiFlags = [];
    if (t._gkGuiFlags.indexOf(f) >= 0) return f;
    t._gkGuiFlags.push(f);
    f._gkGuiTarget = t;
    f._gkGuiRole = Array.prototype.filter.call(f.classList, function (c) { return /^gk-gui-stuff-(?:cat|alert|role)-/.test(c); }).join(' ');
    f._gkGuiShortGiven = isShort(f);
    f.classList.add('gk-gui-stuff-flag-placed');
    f.setAttribute('aria-hidden', 'true');
    f.removeAttribute('tabindex');
    host().appendChild(f);
    // on the flag, which only its pennant and the short form's surface let the pointer reach
    f.addEventListener('mouseenter', function () { hover(f, true); });
    f.addEventListener('mouseleave', function () { hover(f, false); });
    sayOn(t, f);
    if (targets.indexOf(t) < 0) {
      targets.push(t);
      if (ro) ro.observe(t);
    }
    watchSeen(t, f);
    schedule();
    return f;
  }
  // a flag the server drew: on its target when the target is there, else it waits for a later pass
  var pending = [];
  function lay(f) {
    var t = find(f.getAttribute('data-gk-gui-flag-on'));
    if (!t) return false;
    attach(t, f);
    return true;
  }
  function scan(root) {
    var all = (root || document).querySelectorAll('[data-gk-gui-flag]:not(.gk-gui-stuff-flag-placed)');
    Array.prototype.forEach.call(all, function (f) {
      // a still copy's flag stays hidden; the real one is laid. From the parent: the flag itself is aria-hidden
      if (copied(f.parentElement)) return;
      if (!lay(f) && pending.indexOf(f) < 0) pending.push(f);
    });
    // the own elements in the text's flow, mirrored where the text runs right to left
    var r0 = root || document;
    if (r0.nodeType === 1 && r0.hasAttribute('data-gk-gui-flag-inline')) mirror(r0);
    Array.prototype.forEach.call(r0.querySelectorAll('[data-gk-gui-flag-inline]'), mirror);
  }
  function make(text, o) {
    o = o || {};
    var kind = KINDS[o.kind] ? o.kind : null;
    var f = document.createElement('span');
    f.className = ['gk-gui-stuff-flag', roleClass(o.role || ROLE[kind || 'fixed']), kind ? 'gk-gui-stuff-flag-temp' : '', o.short ? 'gk-gui-stuff-flag-short' : ''].join(' ').replace(/\s+/g, ' ').trim();
    f.setAttribute('data-gk-gui-flag', kind || 'fixed');
    if (kind === 'new' && o.key && o.seen) { f.setAttribute('data-gk-gui-flag-key', o.key); f.setAttribute('data-gk-gui-flag-seen', o.seen); }
    if (o.said === false) f.setAttribute('data-gk-gui-flag-said', '0');
    if (o.sort != null && SORT.test(String(o.sort))) f.setAttribute('data-gk-gui-flag-sort', String(o.sort));
    var p = document.createElement('span'); p.className = 'gk-gui-stuff-flag-pennant'; if (o.title) p.title = o.title;
    var w = document.createElement('span'); w.className = 'gk-gui-stuff-flag-word'; w.textContent = word(kind, text);
    f.appendChild(p); f.appendChild(w);
    return f;
  }
  function put(target, text, o) {
    if (!target || target.nodeType !== 1) return null;
    return attach(target, make(text, o));
  }
  // the flags on a target laid once more on a still copy of it (the library's large picture): the same words, kinds
  // and roles, so that the picture shows what the real one shows. A copy's flag is a picture: never said to a screen
  // reader (the copy is hidden from it) and never told to the server as seen
  function copyTo(from, to) {
    if (!from || !to || to.nodeType !== 1 || !from._gkGuiFlags) return [];
    return from._gkGuiFlags.map(function (f) {
      var c = f.cloneNode(true);
      ['gk-gui-stuff-flag-placed', 'gk-gui-stuff-flag-on', 'gk-gui-stuff-flag-off', 'gk-gui-stuff-flag-word-first', 'gk-gui-stuff-flag-reach', 'gk-gui-stuff-flag-flush', 'gk-gui-stuff-flag-tip-below'].forEach(function (k) { c.classList.remove(k); });
      // the form at the edge is the place's, not the flag's: the copy finds its own
      if (!f._gkGuiShortGiven) c.classList.remove('gk-gui-stuff-flag-short');
      c.querySelectorAll('.gk-gui-stuff-flag-word').forEach(function (n) { n.style.transform = ''; });
      c.removeAttribute('style');
      // what the flag itself says about its icon stays (an example's): only the style of its place goes
      ICON_PROPS.forEach(function (k) { var v = f.style.getPropertyValue(k); if (v) c.style.setProperty(k, v); });
      c.removeAttribute('data-gk-gui-flag-key');
      c.removeAttribute('data-gk-gui-flag-seen');
      c.setAttribute('data-gk-gui-flag-said', '0');
      // the flag itself too (the helper's html: may give it one): no id in a copy is found as the real one's
      c.removeAttribute('id');
      c.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
      return attach(to, c);
    });
  }
  function remove(f) {
    if (!f) return;
    var t = f._gkGuiTarget;
    if (t) {
      unsay(t, f);
      t._gkGuiFlags = (t._gkGuiFlags || []).filter(function (x) { return x !== f; });
      if (!t._gkGuiFlags.length) drop(t); else schedule();
    }
    f.remove();
  }
  // ---- the own element: the flag in the text's flow, the pennant before the word, mirrored once it stands in the
  // page by the direction it is written in there (read from the computed style; Redmine 6.x sets no dir attribute)
  function mirror(n) { n.classList.toggle('gk-gui-stuff-flag-rtl', getComputedStyle(n).direction === 'rtl'); }
  function inline(text, o) {
    o = o || {};
    var kind = KINDS[o.kind] ? o.kind : null;
    var n = document.createElement('span');
    n.className = ['gk-gui-stuff-flag-inline', roleClass(o.role || ROLE[kind || 'fixed']), kind ? 'gk-gui-stuff-flag-temp' : '', o.short ? 'gk-gui-stuff-flag-short' : ''].join(' ').replace(/\s+/g, ' ').trim();
    n.setAttribute('data-gk-gui-flag-inline', kind || 'fixed');
    if (o.sort != null && SORT.test(String(o.sort))) n.setAttribute('data-gk-gui-flag-sort', String(o.sort));
    var p = document.createElement('span'); p.className = 'gk-gui-stuff-flag-pennant'; p.setAttribute('aria-hidden', 'true');
    if (o.title && !o.short) n.title = o.title;
    n.appendChild(p);
    var said = word(kind, text);
    if (said !== '') {
      var w = document.createElement('span'); w.className = 'gk-gui-stuff-flag-word';
      w.textContent = (typeof o.count === 'number' && o.count >= 0 ? Math.floor(o.count) + ' ' : '') + said;
      n.appendChild(w);
    }
    (window.requestAnimationFrame || setTimeout)(function () { if (n.isConnected) mirror(n); });
    return n;
  }
  // kept as an alias of inline until no plugin calls it: the word given is the own element's word; without a word the
  // title is the short form's word, and with neither the pennant stands alone
  function pennant(o) {
    o = o || {};
    if (o.word != null) return inline(o.word, { role: o.role, kind: o.kind, title: o.title });
    return inline(o.title || null, { role: o.role, kind: o.kind, short: !!(o.title || KINDS[o.kind]) });
  }
  // a legend: a list of own elements with their counts; the pointer on a row frames the flags of its sort laid on a
  // target in the area (a steady anchor), never in the Tab order and nothing on a click
  function legend(items, o) {
    o = o || {};
    var ul = document.createElement('ul');
    ul.className = 'gk-gui-stuff-flag-legend';
    ul.setAttribute('role', 'list');
    if (o.label) ul.setAttribute('aria-label', o.label);
    if (ANCHOR.test(o.area || '')) ul.setAttribute('data-gk-gui-flag-legend', o.area);
    (items || []).forEach(function (i) {
      var li = document.createElement('li');
      if (i.sort != null && SORT.test(String(i.sort))) li.setAttribute('data-gk-gui-flag-legend-sort', String(i.sort));
      li.appendChild(inline(i.text, { role: i.role, kind: i.kind, count: i.count, title: i.title }));
      if (i.means) { var m = document.createElement('span'); m.className = 'gk-gui-stuff-sr-only'; m.textContent = ': ' + i.means; li.appendChild(m); }
      ul.appendChild(li);
    });
    return ul;
  }

  // ---- a legend's row under the pointer lights every flag of its sort in the legend's area: on a target the frame
  // around the target, an own element framed itself, and the words fully visible. The area by the legend's own anchor,
  // never by place
  var litRow = null;
  function lightRow(row, on) {
    var list = row.closest('[data-gk-gui-flag-legend]');
    var area = list ? find(list.getAttribute('data-gk-gui-flag-legend')) : null;
    var sort = row.getAttribute('data-gk-gui-flag-legend-sort');
    if (!area || !sort || !SORT.test(sort)) return;
    Array.prototype.forEach.call(area.querySelectorAll('[data-gk-gui-flag-inline][data-gk-gui-flag-sort="' + sort + '"]'), function (n) {
      n.classList.toggle('gk-gui-stuff-flag-lit', on);
      if (on && isShort(n)) tipInView(n);
    });
    targets.forEach(function (t) {
      if (!area.contains(t)) return;
      var hit = false;
      (t._gkGuiFlags || []).forEach(function (f) {
        if (f.getAttribute('data-gk-gui-flag-sort') === sort) { f._gkGuiLit = on; hit = true; }
      });
      if (hit) paintFrame(t);
    });
  }
  function pointTo(row) {
    if (row === litRow) return;
    if (litRow) lightRow(litRow, false);
    litRow = row;
    if (row) lightRow(row, true);
  }
  document.addEventListener('mouseover', function (e) {
    pointTo(e.target && e.target.closest ? e.target.closest('[data-gk-gui-flag-legend] [data-gk-gui-flag-legend-sort]') : null);
    var s = e.target && e.target.closest ? e.target.closest('[data-gk-gui-flag-inline].gk-gui-stuff-flag-short') : null;
    if (s) tipInView(s);
  });
  document.addEventListener('mouseout', function (e) { if (!e.relatedTarget) pointTo(null); });
  // the flags stacked on one target lie so close that their surfaces overlap: a tap belongs to the pennant nearest to it
  function nearest(f, x, y) {
    var best = f, least = Infinity;
    ((f._gkGuiTarget && f._gkGuiTarget._gkGuiFlags) || [f]).forEach(function (g) {
      var p = g.querySelector('.gk-gui-stuff-flag-pennant');
      if (!p || g._gkGuiCovered) return;
      var r = p.getBoundingClientRect(), dx = r.left + r.width / 2 - x, dy = r.top + r.height / 2 - y, d = dx * dx + dy * dy;
      if (d < least) { least = d; best = g; }
    });
    return best;
  }
  // A flag on a target held on by a tap. Letting go also lets go of the hover a touch leaves behind, since no pointer
  // ever moves off a pennant a finger has left
  function tapFlag(f) {
    var before = tapped;
    tapped = f !== before ? f : null;
    if (before) {
      before._gkGuiTap = false;
      before._gkGuiHover = false;
      if (before._gkGuiTarget) paintFrame(before._gkGuiTarget);
    }
    if (tapped) {
      tapped._gkGuiTap = true;
      if (tapped._gkGuiTarget) paintFrame(tapped._gkGuiTarget);
    }
  }
  // the short form's word on a tap, in both forms: the tapped one shows its box until the next tap anywhere; nothing else happens
  document.addEventListener('click', function (e) {
    var at = e.target && e.target.closest ? e.target : null;
    var s = at ? at.closest('[data-gk-gui-flag-inline].gk-gui-stuff-flag-short') : null;
    var f = at ? at.closest('.gk-gui-stuff-flag.gk-gui-stuff-flag-short') : null;
    Array.prototype.forEach.call(document.querySelectorAll('[data-gk-gui-flag-inline].gk-gui-stuff-flag-on'), function (n) { if (n !== s) n.classList.remove('gk-gui-stuff-flag-on'); });
    if (s) { s.classList.toggle('gk-gui-stuff-flag-on'); if (s.classList.contains('gk-gui-stuff-flag-on')) tipInView(s); }
    tapFlag(f ? nearest(f, e.clientX, e.clientY) : null);
  });

  // ---- focus in a flagged target draws its frame. Under 899 px the focus on what holds the target and takes the focus
  // only from a tap (tabindex -1) does too, and the element with the focus then has no outline of its own: the dashed
  // frame alone shows it. Read from the attribute, never by the holder's tag or place
  var plain = null;
  function focusTo(on, e) {
    var framed = false;
    targets.forEach(function (t) {
      var holds = narrow() && e.target !== t && e.target.getAttribute && e.target.getAttribute('tabindex') === '-1' && e.target.contains(t);
      var has = !!(on && (t.contains(e.target) || holds));
      if (has) framed = true;
      if (!!t._gkGuiFocus !== has) { t._gkGuiFocus = has; paintFrame(t); }
    });
    var now = framed && narrow() ? e.target : null;
    if (plain && plain !== now) plain.classList.remove('gk-gui-stuff-flag-focus-quiet');
    if (now) now.classList.add('gk-gui-stuff-flag-focus-quiet');
    plain = now;
  }
  document.addEventListener('focusin', function (e) { focusTo(true, e); });
  document.addEventListener('focusout', function (e) {
    setTimeout(function () { focusTo(!!document.activeElement && document.activeElement !== document.body, { target: document.activeElement || document.body }); }, 0);
  });
  window.addEventListener('scroll', schedule, { capture: true, passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('toggle', schedule, true);
  document.addEventListener('transitionend', schedule, true);
  window.addEventListener('load', schedule);
  if (window.ResizeObserver) ro = new ResizeObserver(schedule);

  // A target taken out of the page (a list drawn again, a panel emptied) takes its flags with it, and a flag the
  // server drew in content put in later is laid: only the page's children are watched, and only what concerns flags
  function watchPage() {
    if (!window.MutationObserver) return;
    new MutationObserver(function (list) {
      // a target gone and new flags put in, in the same pass (content swapped in one step): both are seen to
      var again = targets.some(function (t) { return !t.isConnected; });
      var roots = [];
      for (var i = 0; i < list.length; i++) {
        for (var j = 0; j < list[i].addedNodes.length; j++) {
          var n = list[i].addedNodes[j];
          if (n.nodeType !== 1 || n === layer || n.parentElement === layer) continue;
          if (n.hasAttribute('data-gk-gui-flag') || n.querySelector('[data-gk-gui-flag]:not(.gk-gui-stuff-flag-placed)') ||
              n.hasAttribute('data-gk-gui-flag-inline') || n.querySelector('[data-gk-gui-flag-inline]')) {
            var r = n.parentElement || n;
            if (roots.indexOf(r) < 0) roots.push(r);
          }
        }
      }
      roots.forEach(function (r) { if (r.isConnected) scan(r); });
      if (again || roots.length) schedule();
    }).observe(document.body, { childList: true, subtree: true });
  }
  function start() {
    if (ro) ro.observe(document.documentElement);
    watchPage();
    scan(document);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule, function () { /* the fonts as they are */ });
  }
  G.flag = { put: put, remove: remove, copy: copyTo, clear: function (t) { if (t) drop(t); }, on: function (t) { return (t && t._gkGuiFlags) ? t._gkGuiFlags.slice() : []; },
             inline: inline, legend: legend, pennant: pennant, scan: function (root) { scan(root); schedule(); }, place: schedule,
             // the same test for a box of another script laid on top (the marker's Borta), at a point in the window
             underBar: function (t, x, y) { return !!t && underBar(t, x, y); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start, 0);
})();
