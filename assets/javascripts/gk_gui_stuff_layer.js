// gk_gui_stuff: GkGui.layer, the surface in the upper layer, loaded on every page right after the
// primitives (gk_gui_stuff_primitives.js, which gives GkGui.sheet and hands a click on a server's layer button to
// GkGui.layer.from); before the kernel, which keeps what this puts on GkGui. Plain DOM, no jQuery.
//   GkGui.layer.open({key, title, content, anchor, edge, parent, opener, width, focus, outside, onClose})  a surface in the upper
//                                                               layer that moves nothing; onClose(why)
//   GkGui.layer.close(key)
//   GkGui.layer.from(button)                                    the layer of a button gk_gui_stuff_layer_button drew
(function () {
  var G = window.GkGui = window.GkGui || {};
  var T = { close: 'Stäng' };
  var tEl = document.getElementById('gk-gui-stuff-primitives-texts');
  try { if (tEl) T = JSON.parse(tEl.textContent); } catch (e) { /* the defaults */ }
  function closest(n, sel) { return n && n.nodeType === 1 ? n.closest(sel) : (n && n.parentElement ? n.parentElement.closest(sel) : null); }

  // A surface in the upper layer that moves nothing on the page, with no dark background: fastened
  // under an element (anchor), or to an edge of the window (edge: end, start, bottom). parent: the layer stands in the
  // page right after it (the tab order goes on from it into the layer, as a fly's) and is fastened under it; a click
  // in it is no click outside. opener (the anchor, else the element in focus) has aria-expanded while it is open, its
  // pill the state -open, and gets the focus back. width: 'wide' for at most 64em. One per key; Esc, its cross and a
  // click outside close it (not one in a layer opened after it, in core's date picker or completion, or in the
  // notices); the focus goes to the first field that is seen, else the first button or link, unless focus: false (a
  // panel opened again when the page is read). onClose(why) hears why: escape, x, outside or api (the
  // sentence's box tells Esc from Klar). outside: 'click' closes it on the click outside instead of the
  // press, so that what the click lands on still gets it after onClose has drawn the page again (the sentence's
  // parts). A layer whose box another script took away is still cleaned up when it closes.
  // Below 899 px every layer is a sheet at the bottom of the window: the page behind dimmed by an element of
  // its own right before the box (a press on it is a press outside), Avbryt added when the layer has none (it closes
  // as Esc does), the focus kept in it; place() asks the width on every call, so a turned window turns the layer.
  var layers = {}, layerSeq = 0;
  function shown(n) { return !n.disabled && n.getClientRects().length > 0 && window.getComputedStyle(n).visibility !== 'hidden'; }
  function layerOpen(o) {
    var key = o.key || 'layer';
    if (layers[key]) layers[key].close(false);
    var anchor = o.anchor || o.parent || null;
    var opener = o.opener || anchor || document.activeElement;
    if (opener === document.body) opener = null;
    var pill = opener && opener.closest ? opener.closest('.gk-gui-stuff-pill') : null;
    var box = document.createElement('div');
    box.className = 'gk-gui-stuff-layer' + (o.width === 'wide' ? ' gk-gui-stuff-layer-wide' : '');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'false');
    var head = document.createElement('div'); head.className = 'gk-gui-stuff-layer-head';
    if (o.title) {
      var h = document.createElement('h3'); h.className = 'gk-gui-stuff-layer-title'; h.textContent = o.title; h.id = 'gk-gui-stuff-layer-' + key;
      head.appendChild(h); box.setAttribute('aria-labelledby', h.id);
    }
    var x = document.createElement('button'); x.type = 'button'; x.className = 'gk-gui-stuff-layer-close'; x.textContent = '×'; x.title = T.close; x.setAttribute('aria-label', T.close);
    head.appendChild(x); box.appendChild(head);
    var body = document.createElement('div'); body.className = 'gk-gui-stuff-layer-body';
    if (typeof o.content === 'string') body.innerHTML = o.content; else if (o.content) body.appendChild(o.content);
    box.appendChild(body);
    if (o.parent && o.parent.isConnected) o.parent.after(box); else document.body.appendChild(box);
    if (G.selectSearch) G.selectSearch.pass(body); // a field in it that asks for the chooser, once it is in the page
    if (opener && opener.setAttribute) opener.setAttribute('aria-expanded', 'true');
    if (pill) pill.classList.add('gk-gui-stuff-pill-open');
    var dim = null;
    // the sheet below 899 px, or the surface fastened as above; true while it is a sheet
    function sheet() {
      var on = !!(G.sheet && G.sheet.narrow());
      box.classList.toggle('gk-gui-stuff-sheet', on);
      if (on && !dim) {
        dim = document.createElement('div'); dim.className = 'gk-gui-stuff-layer-dim'; dim.setAttribute('aria-hidden', 'true');
        box.before(dim);
        G.sheet.on(box, function () { close(true, 'escape'); });
      } else if (!on && dim) {
        dim.remove(); dim = null;
        if (G.sheet) G.sheet.off(box);
      }
      return on;
    }
    function place() {
      var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight, w = box.offsetWidth;
      box.style.insetBlockStart = box.style.insetInlineStart = box.style.insetInlineEnd = box.style.insetBlockEnd = '';
      if (sheet()) return;
      if (anchor && anchor.isConnected) {
        var r = anchor.getBoundingClientRect(), rtl = window.getComputedStyle(anchor).direction === 'rtl';
        var top = Math.min(r.bottom + 4, Math.max(12, vh - box.offsetHeight - 12));
        var start = rtl ? vw - r.right : r.left;
        start = Math.max(12, Math.min(start, vw - w - 12));
        box.style.insetBlockStart = top + 'px'; box.style.insetInlineStart = start + 'px';
      } else if (o.edge === 'bottom') {
        box.style.insetBlockEnd = '12px'; box.style.insetInlineStart = Math.max(12, (vw - w) / 2) + 'px';
      } else {
        box.style.insetBlockStart = '12px';
        if (o.edge === 'start') box.style.insetInlineStart = '12px'; else box.style.insetInlineEnd = '12px';
      }
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(true, 'escape'); } }
    box.addEventListener('keydown', onKey);
    // refocus false: the focus stays where the click outside put it; why (escape, x, outside, api) goes to onClose
    var closed = false;
    function close(refocus, why) {
      if (closed) return;
      closed = true;
      window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true);
      if (dim) { dim.remove(); dim = null; }
      if (G.sheet) G.sheet.off(box);
      if (box.isConnected) box.remove();
      if (layers[key] && layers[key].el === box) delete layers[key];
      if (opener && opener.setAttribute) opener.setAttribute('aria-expanded', 'false');
      if (pill) pill.classList.remove('gk-gui-stuff-pill-open');
      if (refocus !== false && opener && opener.focus && opener.isConnected) opener.focus({ preventScroll: true });
      if (o.onClose) o.onClose(why || 'api');
    }
    x.addEventListener('click', function () { close(true, 'x'); });
    var first = [].find.call(body.querySelectorAll('input:not([type=hidden]), select, textarea'), shown) ||
                [].find.call(body.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])'), shown) || x;
    if (o.focus !== false) first.focus({ preventScroll: true });
    layers[key] = { el: box, body: body, close: close, place: place, parent: o.parent || null, opener: opener, n: ++layerSeq,
                    onClick: o.outside === 'click' };
    return layers[key];
  }
  // a press outside closes the layers that close on the press, a click outside those that close on the click
  function outside(e, onClick) {
    var t = e.target;
    if (closest(t, '.ui-datepicker, .ui-autocomplete, .gk-gui-stuff-notices')) return;
    var inBox = closest(t, '.gk-gui-stuff-layer'), later = 0;
    Object.keys(layers).forEach(function (k) { if (layers[k].el === inBox) later = layers[k].n; });
    Object.keys(layers).forEach(function (k) {
      var L = layers[k];
      if (L.onClick !== onClick) return;
      if (L.el.contains(t) || (L.parent && L.parent.contains(t)) || (L.opener && L.opener.contains && L.opener.contains(t)) || later > L.n) return;
      L.close(false, 'outside');
    });
  }
  document.addEventListener('mousedown', function (e) { outside(e, false); }, true);
  document.addEventListener('click', function (e) { outside(e, true); }, true);
  // A button the server drew (gk_gui_stuff_layer_button): its <template> is the content, under the button or at an edge;
  // a second click on the button closes it
  function layerFrom(b) {
    var tpl = document.getElementById(b.getAttribute('data-gk-gui-layer'));
    if (!tpl) return;
    var open = layers[tpl.id];
    if (open && open.opener === b) { open.close(true); return; }
    var edge = b.getAttribute('data-gk-gui-layer-edge');
    layerOpen({ key: tpl.id, title: b.getAttribute('data-gk-gui-layer-title'), content: tpl.content.cloneNode(true), anchor: edge ? null : b, edge: edge,
                opener: b, width: b.getAttribute('data-gk-gui-layer-width') });
  }
  G.layer = { open: layerOpen, from: layerFrom, close: function (key) { if (layers[key || 'layer']) layers[key || 'layer'].close(true); } };
})();
