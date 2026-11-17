// gk_gui_stuff: GkGui.layer, the surface in the upper layer, loaded on every page right after the
// primitives (gk_gui_stuff_primitives.js, which gives GkGui.sheet and hands a click on a server's layer button to
// GkGui.layer.from); before the kernel, which keeps what this puts on GkGui. Plain DOM, no jQuery.
//   GkGui.layer.open({key, title, content, anchor, edge, parent, opener, width, focus, outside, above, expanded, onClose})  a surface in
//                                                               the upper layer that moves nothing; onClose(why);
//                                                               expanded: false leaves the opener's aria-expanded alone
//   GkGui.layer.can                                             what this layer can: { above: true }
//   GkGui.layer.close(key)
//   GkGui.layer.from(button)                                    the layer of a button gk_gui_stuff_layer_button drew
//   GkGui.confirm.open({text, ok, role, opener, onOk, onCancel}) the confirmation in the upper layer (a menu entry's)
//   GkGui.confirm.ask(el, {text, ok, role, opener})             the same for el's own action, pressed again at OK
//   data-gk-gui-confirm="<question>"                            on a link, button or form: asked before the action
(function () {
  var G = window.GkGui = window.GkGui || {};
  var T = { close: 'Stäng', cancel: 'Avbryt' };
  var tEl = document.getElementById('gk-gui-stuff-primitives-texts');
  try { if (tEl) T = JSON.parse(tEl.textContent); } catch (e) { /* the defaults */ }
  function closest(n, sel) { return n && n.nodeType === 1 ? n.closest(sel) : (n && n.parentElement ? n.parentElement.closest(sel) : null); }

  // A surface in the upper layer that moves nothing on the page, with no dark background: fastened
  // under an element (anchor), or to an edge of the window (edge: end, start, bottom). parent: the layer stands in the
  // page right after it (the tab order goes on from it into the layer, as a popover's) and is fastened under it; a click
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
  // above: 'popover' lifts the layer to 65 in the scale, over an open popover, a mount's box, a rail's reason, the corner and
  // the other layers (as a sheet 65, its dim 64); an element lifts it one over the level that element stands at
  // among the page's layers, never under 65 (as a sheet two over, its dim between). The dim carries
  // data-gk-gui-layer-dim="<key>", so a caller that holds presses can know its own.
  var layers = {}, layerSeq = 0;
  function shown(n) { return !n.disabled && n.getClientRects().length > 0 && window.getComputedStyle(n).visibility !== 'hidden'; }
  // the level an element stands at among the page's layers: the z-index of its outermost ancestor that has one
  function stackOf(el) {
    var z = NaN;
    for (var n = el; n && n !== document.documentElement; n = n.parentElement) {
      var v = parseInt(window.getComputedStyle(n).zIndex, 10);
      if (!isNaN(v)) z = v; // the outermost wins
    }
    return z;
  }
  function layerOpen(o) {
    var key = o.key || 'layer';
    if (layers[key]) layers[key].close(false);
    var anchor = o.anchor || o.parent || null;
    var opener = o.opener || anchor || document.activeElement;
    if (opener === document.body) opener = null;
    // expanded: false for a layer that is no disclosure of its opener (the confirmation): the opener gets no
    // aria-expanded and its pill no open state
    var disclose = o.expanded !== false;
    var pill = disclose && opener && opener.closest ? opener.closest('.gk-gui-stuff-pill') : null;
    var box = document.createElement('div');
    box.className = 'gk-gui-stuff-layer' + (o.width === 'wide' ? ' gk-gui-stuff-layer-wide' : '');
    if (o.above) box.classList.add('gk-gui-stuff-layer-above');
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
    G.selectSearch.pass(body); // a field in it that asks for the chooser, once it is in the page
    if (disclose && opener && opener.setAttribute) opener.setAttribute('aria-expanded', 'true');
    if (pill) pill.classList.add('gk-gui-stuff-pill-open');
    var dim = null;
    // the sheet below 899 px, or the surface fastened as above; true while it is a sheet
    function sheet() {
      var on = G.sheet.narrow();
      box.classList.toggle('gk-gui-stuff-sheet', on);
      if (on && !dim) {
        dim = document.createElement('div'); dim.className = 'gk-gui-stuff-layer-dim'; dim.setAttribute('aria-hidden', 'true');
        if (o.above) dim.classList.add('gk-gui-stuff-layer-above');
        dim.setAttribute('data-gk-gui-layer-dim', key);
        box.before(dim);
        G.sheet.on(box, function () { close(true, 'escape'); });
      } else if (!on && dim) {
        dim.remove(); dim = null;
        G.sheet.off(box);
      }
      return on;
    }
    // above an element: one over the level it stands at (as a sheet two over, the dim between), never under what the
    // CSS alone gives (65, the sheet's or the open band's); an element that left the page leaves the class alone
    function lift(asSheet) {
      box.style.zIndex = ''; if (dim) dim.style.zIndex = '';
      if (!o.above || o.above.nodeType !== 1 || !o.above.isConnected) return;
      var t = stackOf(o.above), base = parseInt(window.getComputedStyle(box).zIndex, 10) || 65;
      if (isNaN(t)) return;
      var z = Math.max(base, t + (asSheet ? 2 : 1));
      box.style.zIndex = String(z); if (dim && asSheet) dim.style.zIndex = String(z - 1);
    }
    function place() {
      var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight, w = box.offsetWidth;
      box.style.insetBlockStart = box.style.insetInlineStart = box.style.insetInlineEnd = box.style.insetBlockEnd = '';
      if (sheet()) { lift(true); return; }
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
      lift(false);
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
      G.sheet.off(box);
      if (box.isConnected) box.remove();
      if (layers[key] && layers[key].el === box) delete layers[key];
      if (disclose && opener && opener.setAttribute) opener.setAttribute('aria-expanded', 'false');
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
                opener: b, width: b.getAttribute('data-gk-gui-layer-width'),
                above: b.getAttribute('data-gk-gui-layer-above') === 'popover' ? 'popover' : null });
  }
  G.layer = { open: layerOpen, from: layerFrom, close: function (key) { if (layers[key || 'layer']) layers[key || 'layer'].close(true); },
              can: { above: true } };

  // ---------------------------------------------------------------- confirm
  // The confirmation in the upper layer, for what a menu entry does (an entry in a menu never opens a popover): the
  // question and two buttons side by side, the one that does it (named after the entry, in the role alarm for what
  // cannot be undone) and Avbryt. Over the row menu and an open popover (above: 'popover', 65); below 899 px a sheet as every
  // layer. The focus goes to Avbryt, so that Enter never does the action; Esc, Avbryt and a click outside close it and
  // give the focus back to the opener.
  //   GkGui.confirm.open({ text, ok, role, opener, onOk, onCancel })   text and ok are needed
  //   GkGui.confirm.ask(el, { text, ok, role, opener })                 the confirmation for el's own action: at OK
  //                                                                     the same click (or submit) once more
  //   data-gk-gui-confirm="<question>" on a link, a button or a form (button_to … form: { data: { gk_gui_confirm: … } })
  //   asks the same before the action: a listener in the capture phase on the document holds the click or the submit
  //   before Rails' own (data-method, remote) and, at OK, does it again once with a one-time mark, so that Rails and
  //   every script on the element go as before. data-gk-gui-confirm-ok names the button (else the element's word);
  //   data-gk-gui-confirm-role="alarm" (or a delete: data-method=delete, icon-del, a form with _method=delete) gives
  //   the button the role alarm.
  var confirmSeq = 0;
  function confirmOpen(o) {
    o = o || {};
    var opener = o.opener && o.opener.nodeType === 1 ? o.opener : document.activeElement;
    if (opener === document.body) opener = null;
    var body = document.createElement('div');
    body.className = 'gk-gui-stuff-confirm';
    var textId = 'gk-gui-stuff-confirm-text-' + (++confirmSeq);
    var p = document.createElement('p');
    p.className = 'gk-gui-stuff-confirm-text'; p.id = textId; p.textContent = o.text || '';
    body.appendChild(p);
    var row = document.createElement('div');
    row.className = 'gk-gui-stuff-popover-buttons';
    var ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'gk-gui-stuff-confirm-ok' + (o.role === 'alarm' ? ' gk-gui-stuff-btn-alarm' : '');
    ok.textContent = o.ok || '';
    var no = document.createElement('button');
    no.type = 'button';
    no.className = 'gk-gui-stuff-confirm-cancel';
    // the box's own Avbryt: a sheet adds none of its own
    no.setAttribute('data-gk-gui-popover-cancel', '1');
    no.textContent = T.cancel || '';
    row.appendChild(ok); row.appendChild(no);
    body.appendChild(row);
    var answered = false;
    var anchor = opener && opener.isConnected && opener.getClientRects().length ? opener : null;
    var L = layerOpen({ key: 'gk-gui-confirm', content: body, anchor: anchor, opener: opener, above: 'popover', focus: false, expanded: false,
                        onClose: function (why) {
                          if (why === 'outside' && opener && opener.isConnected && opener.focus) opener.focus({ preventScroll: true });
                          if (!answered && o.onCancel) o.onCancel(why);
                        } });
    L.el.classList.add('gk-gui-stuff-confirm-layer');
    L.el.setAttribute('role', 'alertdialog');
    L.el.setAttribute('aria-labelledby', textId);
    ok.addEventListener('click', function () {
      answered = true;
      L.close(true, 'ok');
      if (o.onOk) o.onOk();
    });
    no.addEventListener('click', function (e) { e.preventDefault(); L.close(true, 'cancel'); });
    no.focus({ preventScroll: true });
    return L;
  }
  // what an element's action is called and whether it is a delete
  function confirmWord(el) {
    var s = el.getAttribute('data-gk-gui-confirm-ok') || el.getAttribute('aria-label') || el.value || el.textContent || el.title || '';
    return s.replace(/\s+/g, ' ').trim();
  }
  function confirmDelete(el) {
    if (el.getAttribute('data-gk-gui-confirm-role') === 'alarm') return true;
    if (el.classList.contains('icon-del') || (el.getAttribute('data-method') || '').toLowerCase() === 'delete') return true;
    var f = el.tagName === 'FORM' ? el : el.form;
    return !!(f && f.querySelector('input[name=_method][value=delete i]'));
  }
  // the element that holds the question: el itself, else its form (button_to's form: { data: })
  function confirmHolder(el) {
    if (el.hasAttribute && el.hasAttribute('data-gk-gui-confirm')) return el;
    var f = el.tagName === 'FORM' ? el : el.form;
    return f && f.hasAttribute('data-gk-gui-confirm') ? f : null;
  }
  // el: what is pressed again at OK (a link, a button, a form's submit button or the form); the one-time mark lets
  // the next click or submit pass
  function confirmAsk(el, o) {
    o = o || {};
    var holder = confirmHolder(el) || el;
    var press = el.tagName === 'FORM' ? null : el;
    var word = o.ok || holder.getAttribute('data-gk-gui-confirm-ok') || confirmWord(press || holder);
    return confirmOpen({ text: o.text != null ? o.text : holder.getAttribute('data-gk-gui-confirm'), ok: word,
                         role: o.role || (confirmDelete(press || holder) || confirmDelete(holder) ? 'alarm' : null),
                         opener: o.opener || (press && press.getClientRects().length ? press : null),
                         onOk: function () {
                           // the mark lives only while the click or the submit is dispatched (both run at once inside
                           // click() and requestSubmit()), so that one that never comes (a field the browser refuses, a
                           // button disabled meanwhile) leaves no mark for the next real press
                           holder._gkGuiConfirmed = true;
                           try {
                             if (press) press.click();
                             else if (holder.requestSubmit) holder.requestSubmit(); else holder.submit();
                           } finally {
                             holder._gkGuiConfirmed = false;
                           }
                         } });
  }
  // a click on a link or a button that asks; a click on a form's button goes on to the form's submit
  document.addEventListener('click', function (e) {
    var t = closest(e.target, '[data-gk-gui-confirm]');
    if (!t || t.tagName === 'FORM') return;
    if (t._gkGuiConfirmed) { t._gkGuiConfirmed = false; return; }
    e.preventDefault(); e.stopImmediatePropagation();
    confirmAsk(t, {});
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || !f.hasAttribute || !f.hasAttribute('data-gk-gui-confirm')) return;
    if (f._gkGuiConfirmed) { f._gkGuiConfirmed = false; return; }
    e.preventDefault(); e.stopImmediatePropagation();
    var by = e.submitter && e.submitter.form === f ? e.submitter : null;
    confirmAsk(by || f, { opener: by && by.getClientRects().length ? by : null });
  }, true);
  G.confirm = { open: confirmOpen, ask: confirmAsk };
})();
