// gk_gui_stuff: Linjen, the client side of gk_gui_stuff_line (line.rb). Loaded on every page after the
// primitives; the kernel is not always there and its observer passes over gk-gui-stuff- nodes, so a line is mounted
// when the page is read, through GkGui.onContent when it exists, and directly after the line's own changes (the panel,
// new content after a save). Mounting is idempotent. Plain DOM, no jQuery.
//   GkGui.line.mount(root)            lays out the steps that would cover each other, binds the editable form
//   GkGui.line.open(root, {focus})    the compact form's panel: the detailed form in the layer
//   GkGui.line.close(root)
//   events on the root: gk-gui-line-choose {id} (a choice in a form), gk-gui-line-moved {id, half, at, lane, band}
(function () {
  var G = window.GkGui = window.GkGui || {};
  var LINE = '.gk-gui-stuff-line';
  function token() { var m = document.querySelector('meta[name="csrf-token"]'); return m ? m.getAttribute('content') : ''; }
  function rtlOf(el) { return window.getComputedStyle(el).direction === 'rtl'; }
  function vertical(root) { return root.classList.contains('gk-gui-stuff-line-vertical') || window.matchMedia('(max-width: 899px)').matches; }
  function rootsOf(key) {
    return Array.prototype.filter.call(document.querySelectorAll(LINE), function (r) { return r.getAttribute('data-gk-gui-line-key') === key; });
  }

  // ---------------------------------------------------------------- the layout
  // per row, the labels along the line (from the start edge, right to left too) on two levels with 4 px slack, each
  // label as wide as its text (at most 84 px, wrapped at its words beyond that) or its date round its dot: the later
  // one that would cover the one before it has its label lifted above the row while its dot stays on the line (-up,
  // lifted by the label's height, the row given room), and one that fits on neither level wraps in the room left on the
  // level with more of it, never cut and never with …; a word is never broken, so the room may be less than
  // asked. Each row is as tall as its tallest step. Then the halves: each half of the strip and of the body gets the
  // room its bands need (--gk-gui-half-min), so that no band is clipped and the strip stays over the body, and the box
  // round them scrolls sideways when the line does not fit (-scrolls). Below 899 px the list needs nothing.
  function textWidth(n) {
    if (!n || !document.createRange) return 0;
    var r = document.createRange();
    r.selectNodeContents(n);
    return r.getBoundingClientRect().width;
  }
  function halves(root, flat) {
    var bands = root.querySelectorAll('.gk-gui-stuff-line-strip-half');
    var body = function (key) { return root.querySelector('.gk-gui-stuff-line-half[data-gk-gui-half="' + CSS.escape(key) + '"]'); };
    bands.forEach(function (sh) {
      var bh = body(sh.getAttribute('data-gk-gui-half') || '');
      [sh, bh].forEach(function (n) { if (n) n.style.removeProperty('--gk-gui-half-min'); });
      if (flat) return;
      var need = 0;
      sh.querySelectorAll(':scope > .gk-gui-stuff-line-band').forEach(function (b) {
        var cs = window.getComputedStyle(b);
        need += Math.ceil(textWidth(b) + (parseFloat(cs.paddingInlineStart) || 0) + (parseFloat(cs.paddingInlineEnd) || 0));
      });
      [sh, bh].forEach(function (n) { if (n) n.style.setProperty('--gk-gui-half-min', need + 'px'); });
    });
    root.querySelectorAll('.gk-gui-stuff-line-scroll').forEach(function (box) {
      // a step's box is open over the page (-popover-open): the line stays as it is until the box closes
      if (box.classList.contains('gk-gui-stuff-line-popover-open')) return;
      ends(box, flat);
      // never taken off first: a box that stops scrolling for a moment forgets where it was scrolled to, and the
      // overflow says nothing about the widths compared here
      box.classList.toggle('gk-gui-stuff-line-scrolls', !flat && box.scrollWidth > box.clientWidth + 1);
    });
  }
  // the room at the two ends inside the box: half the widest face that stands out past the body's start or end (at
  // least 42 px, half a step of 84 px), so that no face stands out of the box, where it would make the box scroll
  // when the line fits, or be cut at the start, where an overflow cannot be scrolled to
  function ends(box, flat) {
    var body = box.querySelector(':scope > .gk-gui-stuff-line-body');
    if (flat || !body) { box.style.removeProperty('--gk-gui-end-s'); box.style.removeProperty('--gk-gui-end-e'); return; }
    var rtl = rtlOf(box), b = body.getBoundingClientRect(), s = 42, e = 42;
    body.querySelectorAll('.gk-gui-stuff-line-step > :is(.gk-gui-stuff-line-face, details)').forEach(function (f) {
      var r = f.getBoundingClientRect();
      if (!r.width) return;
      s = Math.max(s, Math.ceil(rtl ? r.right - b.right : b.left - r.left));
      e = Math.max(e, Math.ceil(rtl ? b.left - r.left : r.right - b.right));
    });
    box.style.setProperty('--gk-gui-end-s', s + 'px');
    box.style.setProperty('--gk-gui-end-e', e + 'px');
  }
  // a step's box (details.gk-gui-stuff-popover, a step with its reason) opened in a line that scrolls would open in the
  // scroll, cut and with a scroll of its own: while it is open the line is cut at its sides only and kept where it was
  // scrolled to (-popover-open, --gk-gui-scrolled), and when it closes the line scrolls again from the same place. Caught on
  // the window before the popover's own listener on the document places the box, so that it measures the room it gets
  window.addEventListener('toggle', function (e) {
    var d = e.target;
    if (!d.matches || !d.matches('details.gk-gui-stuff-popover')) return;
    var box = d.closest('.gk-gui-stuff-line-scroll');
    if (!box) return;
    if (d.open) {
      if (!box.classList.contains('gk-gui-stuff-line-scrolls')) return;
      var at = box.scrollLeft;
      box._gkGuiScrolled = at;
      box.style.setProperty('--gk-gui-scrolled', (-at) + 'px');
      box.classList.add('gk-gui-stuff-line-popover-open');
      box.classList.remove('gk-gui-stuff-line-scrolls');
    } else if (box.classList.contains('gk-gui-stuff-line-popover-open') && !box.querySelector('details.gk-gui-stuff-popover[open]')) {
      box.classList.remove('gk-gui-stuff-line-popover-open');
      box.style.removeProperty('--gk-gui-scrolled');
      var root = box.closest(LINE);
      if (root) layout(root);
      box.scrollLeft = box._gkGuiScrolled || 0;
    }
  }, true);
  function layout(root) {
    var rtl = rtlOf(root), flat = vertical(root);
    halves(root, flat);
    root.querySelectorAll('.gk-gui-stuff-line-row').forEach(function (row) {
      var list = Array.prototype.slice.call(row.querySelectorAll(':scope > .gk-gui-stuff-line-step'));
      list.forEach(function (s) { s.classList.remove('gk-gui-stuff-line-step-up'); s.style.removeProperty('--gk-gui-label-w'); s.style.removeProperty('--gk-gui-lift'); });
      row.classList.remove('gk-gui-stuff-line-row-up');
      row.style.removeProperty('--gk-gui-row-lift');
      row.style.removeProperty('block-size');
      if (flat) return;
      var end = [-Infinity, -Infinity], lift = 0, tall = 0;
      list.map(function (s) {
        var r = s.getBoundingClientRect(), lbl = s.querySelector('.gk-gui-stuff-line-label'), dot = s.querySelector('.gk-gui-stuff-line-dot');
        var when = s.querySelector('.gk-gui-stuff-line-when, .gk-gui-stuff-line-n');
        var w = Math.max(Math.min(lbl ? textWidth(lbl) : 0, 84), when ? when.offsetWidth : 0, dot ? dot.offsetWidth : 18);
        return { s: s, c: rtl ? -(r.left + r.width / 2) : r.left + r.width / 2, w: w, face: s.querySelector('.gk-gui-stuff-line-face'), dot: dot };
      }).sort(function (a, b) { return a.c - b.c; }).forEach(function (p) {
        var from = p.c - p.w / 2, level = from >= end[0] + 4 ? 0 : (from >= end[1] + 4 ? 1 : -1);
        if (level < 0) {
          level = end[0] <= end[1] ? 0 : 1;
          var w = Math.max(2 * (p.c - end[level] - 4), 18);
          p.s.style.setProperty('--gk-gui-label-w', Math.floor(w) + 'px');
          // the label wraps there, but a word keeps its width
          p.w = Math.max(w, p.face ? Math.min(p.face.offsetWidth, p.w) : w);
        }
        if (level === 1) {
          var h = p.face && p.dot ? p.face.offsetHeight - p.dot.offsetHeight : 26;
          p.s.style.setProperty('--gk-gui-lift', h + 'px');
          p.s.classList.add('gk-gui-stuff-line-step-up');
          lift = Math.max(lift, h);
        } else {
          tall = Math.max(tall, p.s.offsetHeight);
        }
        end[level] = p.c + p.w / 2;
      });
      if (lift) { row.classList.add('gk-gui-stuff-line-row-up'); row.style.setProperty('--gk-gui-row-lift', (lift + 2) + 'px'); }
      // a wrapped label makes its step taller than the row: the row grows, so that the next lane stays clear
      if (tall + 2 > row.offsetHeight) row.style.blockSize = (tall + 2) + 'px';
    });
    if (!flat) levelled(root);
    // the halves' room again after the rows: a wrapped label may have changed what fits
    halves(root, flat);
  }
  // a lane stands at the same height on both sides of the stroke: its rows take the largest lift and the largest
  // height of the lane's rows in all the halves, so that a crowded half never pushes its lines below the other half's
  function levelled(root) {
    var lanes = {};
    root.querySelectorAll('.gk-gui-stuff-line-lane').forEach(function (ln) {
      var row = ln.querySelector(':scope > .gk-gui-stuff-line-row'), key = ln.getAttribute('data-gk-gui-lane') || '';
      if (row) (lanes[key] = lanes[key] || []).push(row);
    });
    Object.keys(lanes).forEach(function (key) {
      var rows = lanes[key], lift = 0, tall = 0;
      rows.forEach(function (r) {
        lift = Math.max(lift, parseFloat(r.style.getPropertyValue('--gk-gui-row-lift')) || 0);
        tall = Math.max(tall, r.offsetHeight);
      });
      rows.forEach(function (r) {
        if (lift) { r.classList.add('gk-gui-stuff-line-row-up'); r.style.setProperty('--gk-gui-row-lift', lift + 'px'); }
        if (tall > r.offsetHeight) r.style.blockSize = tall + 'px';
      });
    });
  }
  // the lanes' headings below 899 px: a half with more than one lane with steps names each lane, and a lane
  // without steps in the half is not shown
  function lanes(root) {
    root.querySelectorAll('.gk-gui-stuff-line-half').forEach(function (h) {
      var used = 0;
      h.querySelectorAll(':scope > .gk-gui-stuff-line-lane').forEach(function (ln) {
        var has = !!ln.querySelector('.gk-gui-stuff-line-step');
        ln.classList.toggle('gk-gui-stuff-line-lane-empty', !has);
        if (has) used++;
      });
      h.classList.toggle('gk-gui-stuff-line-half-lanes', used > 1);
    });
  }

  // ---------------------------------------------------------------- the collision
  // the row under the line, written again from the groups of steps ({id, label}) that stand on the same place: one
  // sentence per group and Visa; hidden when there is none. The server writes the first one from the same rule
  function clashRow(root, groups, X) {
    var p = root.querySelector('.gk-gui-stuff-line-content .gk-gui-stuff-line-clash'), text = p && p.querySelector('.gk-gui-stuff-line-clash-text');
    if (!text) return;
    text.textContent = '';
    groups.forEach(function (g, i) {
      var labels = g.map(function (s) { return s.label; }), last = labels.pop();
      var span = document.createElement('span');
      span.textContent = X.clash.replace('%{count}', g.length)
        .replace('%{names}', labels.length ? labels.join(', ') + ' ' + X.and + ' ' + last : last);
      var a = document.createElement('a');
      a.href = '#'; a.className = 'gk-gui-stuff-line-clash-show'; a.textContent = X.show; a.setAttribute('data-gk-gui-line-show', g[0].id);
      if (i) text.appendChild(document.createTextNode(' '));
      text.append(span, ' ', a);
    });
    p.hidden = !groups.length;
  }
  // Visa: the focus to the group's first step (a step that is only read takes it too), and in the editable form its
  // row in the table comes into view; the compact form opens its panel first and shows the step there
  function showStep(root, id) {
    var el = root.querySelector('.gk-gui-stuff-line-content .gk-gui-stuff-line-step[data-gk-gui-line-id="' + CSS.escape(id) + '"]');
    if (!el && root.querySelector(':scope > template.gk-gui-stuff-line-tpl')) {
      open(root, { focus: false });
      var inner = root._gkGuiLayer && root._gkGuiLayer.body.querySelector(LINE);
      if (inner) showStep(inner, id);
      return;
    }
    var face = el && el.querySelector('.gk-gui-stuff-line-face');
    if (!face) return;
    if (face.tagName === 'SPAN') face.setAttribute('tabindex', '-1');
    face.focus({ preventScroll: true });
    face.scrollIntoView({ block: 'nearest' });
    var tr = root.hasAttribute('data-gk-gui-line') && document.querySelector('[data-gk-gui-line-row-of="' + CSS.escape(id) + '"]');
    if (tr) tr.scrollIntoView({ block: 'nearest' });
  }

  // ---------------------------------------------------------------- the editable form
  // The JSON on the root says the scale, the bands and the marks, where the inputs are (edit.form, by name), and each
  // step's inputs. The inputs win: every step is placed from them, and every write into one says input and change, so
  // that the form's changed rail and the count by its Save follow the drag.
  function editable(root) {
    var D;
    try { D = JSON.parse(root.getAttribute('data-gk-gui-line') || '{}'); } catch (e) { return; }
    var form = document.getElementById(D.edit && D.edit.form);
    if (!form) return;
    var max = D.max || 999, rtl = rtlOf(root), main = D.lanes && D.lanes[0] ? D.lanes[0].key : '';
    function input(name) { var f = name && form.elements.namedItem(name); return f && f.length !== undefined && !f.tagName ? f[0] : f; }
    function num(v, d) { var n = parseInt(v, 10); return isNaN(n) ? d : n; }
    function pct(n) { return (n - 1) / Math.max(max - 1, 1) * 100; }
    function half(key) { return D.halves.filter(function (h) { return h.key === key; })[0]; }
    // each half's limits, the last band always max
    function limits(h) {
      return h.bands.map(function (b, i) {
        if (i === h.bands.length - 1) return max;
        var f = input((D.edit.limits || {})[b.key]);
        return f ? num(f.value, b.upto) : b.upto;
      });
    }
    function bandFor(h, at) {
      var L = limits(h);
      for (var i = 0; i < h.bands.length; i++) if (at <= L[i]) return h.bands[i];
      return h.bands[h.bands.length - 1];
    }
    function drawStrip() {
      D.halves.forEach(function (h) {
        var L = limits(h), prev = 0;
        root.querySelectorAll('.gk-gui-stuff-line-strip-half[data-gk-gui-half="' + CSS.escape(h.key) + '"] > .gk-gui-stuff-line-band').forEach(function (seg, i) {
          seg.style.flex = Math.max(L[i] - prev, 1) + ' 1 0';
          prev = L[i];
        });
        (h.marks || []).forEach(function (m) {
          var el = root.querySelector('.gk-gui-stuff-line-half[data-gk-gui-half="' + CSS.escape(h.key) + '"] > [data-gk-gui-line-mark="' + CSS.escape(m.key) + '"]');
          var f = input((D.edit.marks || {})[m.key]), at = f ? num(f.value, m.at) : m.at;
          var said = root.querySelector('[data-gk-gui-mark-at="' + CSS.escape(m.key) + '"]');
          if (said) said.textContent = at;
          if (!el) return;
          el.style.setProperty('--gk-gui-at', pct(Math.min(Math.max(at, 1), max)) + '%');
          el.title = m.label + ' ≤ ' + at;
        });
      });
    }
    function read(s) {
      var i = s.inputs || {}, h = input(i.half), a = input(i.at), l = input(i.lane);
      return { half: h ? h.value : '', at: Math.min(Math.max(a ? num(a.value, 1) : 1, 1), max), lane: l ? l.value : main };
    }
    function stepEl(s) { return root.querySelector('.gk-gui-stuff-line-step[data-gk-gui-line-id="' + CSS.escape(s.id) + '"]'); }
    function place(s) {
      var v = read(s), el = stepEl(s), h = half(v.half);
      var row = root.querySelector('.gk-gui-stuff-line-half[data-gk-gui-half="' + CSS.escape(v.half) + '"] .gk-gui-stuff-line-lane[data-gk-gui-lane="' + CSS.escape(v.lane) + '"] > .gk-gui-stuff-line-row');
      if (!el || !row || !h) return;
      if (el.parentNode !== row) row.appendChild(el);
      el.style.setProperty('--gk-gui-at', pct(v.at) + '%');
      var n = el.querySelector('.gk-gui-stuff-line-n');
      if (n) n.textContent = v.at;
      var b = bandFor(h, v.at);
      el.setAttribute('data-gk-gui-band', b.key);
      if (D.edit.band_cells) {
        var cell = form.querySelector('[data-gk-gui-line-band-of="' + CSS.escape(s.id) + '"]');
        if (cell) cell.textContent = b.cell_label || b.label;
      }
    }
    // the order of the narrow list, and two steps on the same half, number and lane: the dots' alarm edge on
    // both, the table's rows marked, and the row under the line that names each group with Visa, live while dragging
    function check() {
      var seen = {}, order = {}, groups = [], done = {};
      D.steps.forEach(function (s) { var v = read(s), k = v.half + '|' + v.at + '|' + v.lane; (seen[k] = seen[k] || []).push(s); (order[v.half] = order[v.half] || []).push({ s: s, v: v }); });
      Object.keys(order).forEach(function (hk) {
        order[hk].sort(function (a, b) { return a.v.at - b.v.at || (a.v.lane === main ? 0 : 1) - (b.v.lane === main ? 0 : 1); })
          .forEach(function (p, i) {
            var el = stepEl(p.s), k = p.v.half + '|' + p.v.at + '|' + p.v.lane;
            if (el) el.style.setProperty('--gk-gui-order', i * 2 + 2);
            if (seen[k].length > 1 && !done[k]) { done[k] = 1; groups.push(seen[k]); }
          });
      });
      clashRow(root, groups, D.texts);
      lanes(root);
      D.steps.forEach(function (s) {
        var v = read(s), taken = seen[v.half + '|' + v.at + '|' + v.lane].length > 1, el = stepEl(s), tr = form.querySelector('[data-gk-gui-line-row-of="' + CSS.escape(s.id) + '"]');
        if (el) {
          el.classList.toggle('gk-gui-stuff-line-step-taken', taken);
          var face = el.querySelector('.gk-gui-stuff-line-face');
          if (face) face.title = s.label + '. ' + (taken ? D.texts.taken : D.texts.drag);
        }
        if (tr) { tr.classList.toggle('gk-gui-stuff-line-step-taken', taken); if (taken) tr.title = D.texts.taken; else tr.removeAttribute('title'); }
      });
    }
    function all() { drawStrip(); D.steps.forEach(place); check(); layout(root); }
    function write(s, v) {
      var i = s.inputs || {};
      [['half', v.half], ['lane', v.lane], ['at', v.at]].forEach(function (p) {
        var f = input(i[p[0]]);
        if (!f || f.value === String(p[1])) return;
        f.value = p[1];
        f.dispatchEvent(new Event('input', { bubbles: true }));
        f.dispatchEvent(new Event('change', { bubbles: true }));
      });
      place(s);
      var el = stepEl(s);
      root.dispatchEvent(new CustomEvent('gk-gui-line-moved', { bubbles: true, detail: { id: s.id, half: v.half, at: v.at, lane: v.lane, band: el ? el.getAttribute('data-gk-gui-band') : null } }));
    }
    function stepOf(face) { var id = face.getAttribute('data-gk-gui-line-step'); return D.steps.filter(function (s) { return s.id === id; })[0]; }
    // drag along the line, across the stroke to the other half, or to another lane
    root.addEventListener('pointerdown', function (e) {
      var face = e.target.closest && e.target.closest('.gk-gui-stuff-line-face[data-gk-gui-line-step]'), s = face && stepOf(face);
      if (!s || vertical(root) || e.button > 0) return;
      e.preventDefault();
      var el = stepEl(s);
      face.setPointerCapture(e.pointerId);
      el.classList.add('gk-gui-stuff-line-moving');
      function at(ev) {
        el.style.pointerEvents = 'none';
        var t = document.elementFromPoint(ev.clientX, ev.clientY);
        el.style.pointerEvents = '';
        var row = t && t.closest('.gk-gui-stuff-line-row');
        if (!row || !root.contains(row)) return null;
        var r = row.getBoundingClientRect(), f = rtl ? (r.right - ev.clientX) / r.width : (ev.clientX - r.left) / r.width;
        return { half: row.closest('.gk-gui-stuff-line-half').getAttribute('data-gk-gui-half'), lane: row.closest('.gk-gui-stuff-line-lane').getAttribute('data-gk-gui-lane'),
                 at: Math.round(1 + Math.min(Math.max(f, 0), 1) * (max - 1)) };
      }
      function move(ev) { var p = at(ev); if (p) write(s, p); }
      function up() {
        el.classList.remove('gk-gui-stuff-line-moving');
        face.removeEventListener('pointermove', move); face.removeEventListener('pointerup', up); face.removeEventListener('pointercancel', up);
        check(); layout(root);
      }
      face.addEventListener('pointermove', move); face.addEventListener('pointerup', up); face.addEventListener('pointercancel', up);
    });
    // the arrow keys move one place (Shift: ten), mirrored right to left (a place on a scale, not an order, O16)
    root.addEventListener('keydown', function (e) {
      var face = e.target.closest && e.target.closest('.gk-gui-stuff-line-face[data-gk-gui-line-step]'), s = face && stepOf(face);
      var d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!s || !d) return;
      e.preventDefault();
      if (rtl) d = -d;
      var v = read(s);
      v.at = Math.min(Math.max(v.at + d * (e.shiftKey ? 10 : 1), 1), max);
      write(s, v); check(); layout(root);
    });
    // the table moves the drawing; a limit or a mark redraws the bands and the steps' bands
    var names = {};
    D.steps.forEach(function (s) { Object.keys(s.inputs || {}).forEach(function (k) { names[s.inputs[k]] = s; }); });
    var bounds = {};
    Object.keys(D.edit.limits || {}).forEach(function (k) { bounds[D.edit.limits[k]] = 1; });
    Object.keys(D.edit.marks || {}).forEach(function (k) { bounds[D.edit.marks[k]] = 1; });
    ['input', 'change'].forEach(function (ev) {
      form.addEventListener(ev, function (e) {
        var n = e.target && e.target.name;
        if (bounds[n]) all();
        else if (names[n]) { place(names[n]); check(); layout(root); }
      });
    });
    all();
  }

  // ---------------------------------------------------------------- the panel
  function toggleOf(root) { return root.querySelector('.gk-gui-stuff-line-content [data-gk-gui-line-toggle]'); }
  function remember(root, open) {
    var key = root.getAttribute('data-gk-gui-line-remember'), url = root.getAttribute('data-gk-gui-line-remember-url');
    if (!key || !url) return;
    var body = new URLSearchParams({ key: key, value: open ? 'open' : 'closed' });
    fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': token(), 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
      .catch(function () { /* the panel stays as it is; the next page asks the server again */ });
  }
  function open(root, o) {
    o = o || {};
    var tpl = root.querySelector(':scope > template.gk-gui-stuff-line-tpl'), btn = toggleOf(root);
    if (!tpl || root._gkGuiLayer) return;
    var key = root.getAttribute('data-gk-gui-line-key');
    root._gkGuiLayer = G.layer.open({ key: 'line-' + key, title: root.getAttribute('aria-label'), content: tpl.content.cloneNode(true),
                                      anchor: o.anchor || (btn && btn.getClientRects().length ? btn : null) || root.querySelector('.gk-gui-stuff-line-bar') || root, opener: btn, width: 'wide', focus: o.focus,
                                      onClose: function () { closed(root); } });
    root._gkGuiLayer.body.querySelectorAll(LINE).forEach(mount);
    root.setAttribute('data-gk-gui-line-open', '1');
    if (btn) G.group.set(btn, true);
    if (o.remember !== false) remember(root, true);
  }
  function closed(root) {
    var btn = toggleOf(root);
    root._gkGuiLayer = null;
    root.setAttribute('data-gk-gui-line-open', '0');
    if (btn) G.group.set(btn, false);
    remember(root, false);
  }
  function close(root) { if (root._gkGuiLayer) root._gkGuiLayer.close(true); }
  // the fold button is the only owner of its state and words (GkGui.group); this follows it
  document.addEventListener('gk-gui-group-toggle', function (e) {
    var btn = e.target, root = btn.closest && btn.hasAttribute('data-gk-gui-line-toggle') ? btn.closest(LINE) : null;
    if (!root) return;
    // the panel opens at the button; a click on the strip, which gives the click to the button, opens it at the strip
    var strip = root._gkGuiFromBar;
    root._gkGuiFromBar = null;
    if (e.detail && e.detail.open) open(root, { focus: true, anchor: strip }); else close(root);
  });

  // ---------------------------------------------------------------- a step saves, or is chosen
  function chooseIn(key, id) {
    var roots = rootsOf(key), page = roots.filter(function (r) { return !r.closest('.gk-gui-stuff-layer'); })[0] || roots[0];
    if (!page) return;
    var was = page.querySelector('[data-gk-gui-line-step][aria-pressed="true"]'), off = was && was.getAttribute('data-gk-gui-line-step') === id;
    var now = off ? null : id;
    roots.forEach(function (r) {
      r.querySelectorAll('[data-gk-gui-line-step][aria-pressed]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-gk-gui-line-step') === now ? 'true' : 'false'); });
    });
    var sel = document.getElementById(page.getAttribute('data-gk-gui-line-select'));
    if (sel) {
      sel.value = now === null ? (page.getAttribute('data-gk-gui-line-current') || '') : now;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    page.classList.toggle('gk-gui-stuff-field-changed', now !== null);
    var said = page.querySelector('.gk-gui-stuff-line-chosen'), b = now === null ? null : page.querySelector('[data-gk-gui-line-step="' + CSS.escape(now) + '"]');
    if (said) {
      said.hidden = now === null;
      said.textContent = b ? (page.getAttribute('data-gk-gui-line-chosen-text') || '').replace('%{step}', b.textContent.replace(/…$/, '').trim()) : ''; // gk-r17 P4r: the step's button is this plugin's own line primitive, its word is shown in the chosen note
    }
    page.dispatchEvent(new CustomEvent('gk-gui-line-choose', { bubbles: true, detail: { id: now } }));
  }
  function send(root, name, value, reason) {
    var fd = new FormData();
    fd.append(name, value);
    if (reason !== null) fd.append('reason', reason);
    // the rail and the notice say a failure; the promise is rejected then, so a caller waits only for the answer
    var p = G.save.post(root, fd, null);
    p.catch(function () { /* said on the rail */ });
    return p;
  }
  // the reason that goes with a button: the one in its box, or for the button beside Valfritt's pen what was written
  // there, also when the box has closed; the primitives keep the pen's field off while blank and after Avbryt or Esc
  function reasonFieldOf(sub) {
    var live = '.gk-gui-stuff-reason textarea:not([disabled])';
    var box = sub.closest('.gk-gui-stuff-popover-box');
    if (box) return box.querySelector(live);
    var pen = sub.matches('.gk-gui-stuff-btn-split-main') ? sub.parentElement.querySelector(':scope > details.gk-gui-stuff-btn-split-pen') : null;
    var ta = pen && pen.querySelector(live);
    return ta && ta.value.trim() !== '' ? ta : null;
  }
  // the press comes before the layer's own (on mousedown), which closes the panel when the bar is pressed
  document.addEventListener('pointerdown', function (e) {
    var bar = e.target.closest && e.target.closest('.gk-gui-stuff-line-bar'), root = bar && bar.closest(LINE);
    if (root) root._gkGuiWasOpen = !!root._gkGuiLayer;
  }, true);
  document.addEventListener('click', function (e) {
    var t = e.target, root = t.closest ? t.closest(LINE) : null;
    if (!root || e.defaultPrevented) return;
    var show = t.closest('[data-gk-gui-line-show]');
    if (show) { e.preventDefault(); showStep(root, show.getAttribute('data-gk-gui-line-show')); return; }
    var mode = root.getAttribute('data-gk-gui-line-mode');
    // the bar is no button: it gives the click to the fold button, which keeps the focus; when the panel was open, the
    // press outside it has already closed it
    var bar = t.closest('.gk-gui-stuff-line-bar');
    if (bar) {
      var btn = toggleOf(root);
      if (btn && !root._gkGuiWasOpen) { root._gkGuiFromBar = bar; btn.click(); root._gkGuiFromBar = null; }
      if (btn) btn.focus({ preventScroll: true });
      return;
    }
    if (mode === 'choose') {
      var c = t.closest('[data-gk-gui-line-step]');
      if (c && !c.closest('summary')) { e.preventDefault(); chooseIn(root.getAttribute('data-gk-gui-line-key'), c.getAttribute('data-gk-gui-line-step')); }
      return;
    }
    if (mode !== 'save') return;
    // a box's button or a button with its reason (gk_gui_stuff_reason_button), or the step drawn on the line
    var sub = t.closest('button[type=submit]');
    if (sub && sub.name) {
      e.preventDefault();
      var ta = reasonFieldOf(sub);
      var p = send(root, sub.name, sub.value, ta ? ta.value.trim() : null);
      var d = sub.closest('details.gk-gui-stuff-popover');
      // the box's own button sends what was written, so a refused save leaves it to go with the button beside the pen
      if (d) { G.popover.close(d); d.removeAttribute('data-gk-gui-reason-left'); }
      if (ta) {
        p.then(function () {
          ta.value = '';
          var pen = ta.closest('details.gk-gui-stuff-btn-split-pen');
          if (pen && !pen.open) ta.disabled = true;
        }, function () { /* a refused save keeps what was written */ });
      }
      return;
    }
    var step = t.closest('button[data-gk-gui-line-step]');
    if (step) { e.preventDefault(); send(root, root.getAttribute('data-gk-gui-line-name'), step.getAttribute('data-gk-gui-line-step'), null); }
  });
  // after a save: the rail says it; with after html the new content in every line of the key (the page's and the
  // panel's), mounted again; with after reload the page
  document.addEventListener('gk-gui-saved', function (e) {
    var root = e.target;
    if (!root.matches || !root.matches(LINE)) return;
    var after = root.getAttribute('data-gk-gui-line-after');
    if (after === 'reload') { window.location.reload(); return; }
    if (after !== 'html' || !e.detail || typeof e.detail.html !== 'string') return;
    rootsOf(root.getAttribute('data-gk-gui-line-key')).forEach(function (r) {
      var c = r.querySelector(':scope > .gk-gui-stuff-line-content');
      if (!c) return;
      c.innerHTML = e.detail.html;
      delete r.dataset.gkGuiLineReady;
      mount(r);
    });
  });

  // ---------------------------------------------------------------- mount
  function mount(root) {
    if (!root || root.dataset.gkGuiLineReady) return;
    root.dataset.gkGuiLineReady = '1';
    if (root.hasAttribute('data-gk-gui-line')) editable(root); else layout(root);
    if (window.ResizeObserver && !root._gkGuiResize) { root._gkGuiResize = new ResizeObserver(function () { layout(root); }); root._gkGuiResize.observe(root); }
    // the open panel comes back without taking the focus
    if (root.getAttribute('data-gk-gui-line-open') === '1' && !root.closest('.gk-gui-stuff-layer')) open(root, { focus: false, remember: false });
  }
  function pass(scope) { (scope || document).querySelectorAll(LINE).forEach(mount); }
  G.line = { mount: mount, open: open, close: close };
  function start() {
    pass(document);
    // the kernel's GkGui, not the one this file found when it was read: onContent is only on the kernel's
    var K = window.GkGui;
    if (K.onContent) K.onContent(pass);
    // the steps' sizes are known when the fonts are laid out
    window.addEventListener('load', function () { document.querySelectorAll(LINE).forEach(layout); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start, 0);
})();
