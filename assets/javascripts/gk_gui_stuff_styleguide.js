// gk_gui_stuff: the style guide's page: the choice of its form (Sida or Bibliotek, in the address), the side menu (the
// search and the group pills), the page's bar that follows on scroll (Visa all kod and the page's own light or dark
// and computer or phone, which set every element's), the room a jump leaves under core's fixed header, and each
// element's choices (the copy button under each tile and the
// library form are the library's script, gk_gui_stuff_library.js): light or dark, with theme_engine's dark classes on the page (its basic
// mode; the choice is the page's only and is not saved), and computer or phone (the element's frame page in a frame
// 375 px wide). The fly a script opens at a link (GkGui.fly.open), and the ribbon with a
// fly put into the real top menu, so that the layers are seen against core's own header. The layer under a pill,
// opened by its value part ([data-gk-gui-sg-parent]). Prova ([data-gk-gui-sg-try]) opens the layer, the whisper, the
// banner, a notice, the surface, the drawer, the wave, the corner, the palette, the line's panel, the chooser with
// groups (GkGui.selectSearch.enhance), a sentence with no server, core's context menu on the guide's issue list and Visa
// var at the targets in its example's box, the save bar's sweep with a made-up answer; what comes up outside the window is pointed out by Visa var;
// what in an example leads nowhere says so with the whisper; every text comes from the page.
(function () {
  function data(n, k) { try { return JSON.parse(n.getAttribute(k) || '{}'); } catch (e) { return {}; } }
  function list(n, k) { var v = data(n, k); return Array.isArray(v) ? v : []; }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  // the box of the demo: the words, a table of rows each with its button, Avbryt
  function flyContent(t) {
    var f = document.createDocumentFragment(), tb = el('tbody'), tab = el('table', 'gk-gui-stuff-fly-table');
    f.appendChild(el('p', null, t.intro || ''));
    (t.rows || []).forEach(function (r) {
      var tr = el('tr'), b = el('button', null, t.button || '');
      b.type = 'button';
      tr.appendChild(el('td', null, r));
      tr.appendChild(el('td')).appendChild(b);
      tb.appendChild(tr);
    });
    tab.appendChild(tb);
    f.appendChild(tab);
    var bar = el('div', 'gk-gui-stuff-fly-buttons'), c = el('button', null, t.cancel || '');
    c.type = 'button';
    c.setAttribute('data-gk-gui-fly-cancel', '1');
    bar.appendChild(c);
    f.appendChild(bar);
    return f;
  }
  // Prova: opens the element the link names with the texts the page gave it; nothing when the element is not
  // loaded (no module that uses it is on, and the page says so). The banner forgets that it was closed, so that it can
  // be tried again; the ribbon has no hide and stays until the page is loaded again.
  var drawerKept = null;
  function drawerBack(always) {
    var G = window.GkGui;
    if (!drawerKept || !G || (!always && document.querySelector('.gk-gui-stuff-drawer'))) return;
    G.set('drawer.size', drawerKept.size);
    drawerKept = null;
  }
  // after a click on one of the drawer's own crosses the drawer may be gone
  document.addEventListener('click', function () { if (drawerKept) setTimeout(function () { drawerBack(false); }, 0); });
  window.addEventListener('pagehide', function () { drawerBack(true); });
  // Visa var in its example's box: the box scrolled to its middle, so that its targets lie above and below what is seen,
  // and the arrows of the last try taken away. Steps: a box with the text and Nästa, which moves on to the next target
  // and closes after the last
  var whereDrawn = [];
  function whereStart(a, G, d) {
    var box = document.getElementById(d('box'));
    if (!box || !G.showWhere) return false;
    box.scrollTop = (box.scrollHeight - box.clientHeight) / 2;
    whereDrawn.forEach(function (h) { h.close(); });
    whereDrawn = [];
    return true;
  }
  function whereTargets(a, G, d) {
    if (!whereStart(a, G, d)) return;
    list(a, 'data-gk-gui-sg-targets').forEach(function (t) {
      var h = G.showWhere({ target: document.getElementById(t.target), word: t.word });
      if (h) whereDrawn.push(h);
    });
  }
  function whereSteps(a, G, d) {
    if (!whereStart(a, G, d)) return;
    var steps = list(a, 'data-gk-gui-sg-steps'), at = 0;
    function step() {
      var s = steps[at], last = at === steps.length - 1;
      return { target: document.getElementById(s.target), word: s.word, text: s.text,
               next: { label: last ? d('done') : d('next'), action: function (h) { at += 1; if (at < steps.length) h.update(step()); else h.close(); } } };
    }
    var h = G.showWhere(step());
    if (h) whereDrawn.push(h);
  }
  // the fold's Prova counts up, so that the notice is seen to be updated and not stacked; a fold the person has closed
  // starts over
  var cornerTries = 0;
  function cornerTry(a, G) {
    var en = list(a, 'data-gk-gui-sg-entries'), rows = [];
    if (!document.querySelector('.gk-gui-stuff-corner:not(.gk-gui-stuff-sg-still *)')) cornerTries = 0;
    cornerTries += 1;
    for (var i = 0; i < cornerTries; i++) rows = rows.concat(en);
    G.corner.show({ count: rows.length, entries: rows });
  }
  function tryIt(a, G) {
    var d = function (k) { return a.getAttribute('data-gk-gui-sg-' + k) || ''; };
    var text = function () { return el('p', null, d('text')); };
    switch (d('try')) {
      // an entry the row menu pressed is hidden in its row: the layer opens under the row
      case 'layer': if (G.layer) G.layer.open({ key: 'styleguide', title: d('title'), content: text(), anchor: a.getClientRects().length ? a : (a.closest('tr') || a) }); break;
      // the whisper in the place the tile shows (the link itself where the tile names none)
      case 'copy': if (G.copy) G.copy(d('text'), d('said'), { at: a, place: d('place') || undefined }); break;
      case 'banner':
        if (!G.banner) break;
        var old = document.querySelector('.gk-gui-stuff-banner[data-key="styleguide"]');
        if (old) old.remove();
        G.set('banner.styleguide', null);
        // with an icon: the icon button, which in the guide does nothing but close the banner
        G.banner.show({ key: 'styleguide', level: d('level'), text: d('text'), dismiss: !d('icon'),
                        button: d('icon') ? { icon: d('icon'), label: d('label'), action: function () { var b = document.querySelector('.gk-gui-stuff-banner[data-key="styleguide"]'); if (b) b.remove(); } } : null });
        break;
      case 'notice':
        if (G.notice && G.notice.show) G.notice.show({ level: d('level'), text: d('text'), buttons: d('icon') ? [{ icon: d('icon'), label: d('label') }] : [] });
        break;
      case 'surface': if (G.surface) G.surface.open({ title: d('title'), content: text(), size: 'small' }); break;
      // the drawer's size button remembers the size for every drawer (drawer.size); the size the person had before is
      // put back when the guide's drawer is gone and when the page is left, so that trying it changes no real drawer
      case 'drawer':
        if (!G.drawer) break;
        if (!drawerKept) drawerKept = { size: G.get('drawer.size') };
        G.drawer.add({ key: 'styleguide', label: d('title'), render: function (body) { body.appendChild(text()); } });
        break;
      case 'wave': if (G.wave) G.wave.show({ word: d('word') }); break;
      case 'line': { var ln = document.getElementById(d('line')); if (ln && G.line) G.line.open(ln, { focus: true }); } break;
      case 'corner': if (G.corner) cornerTry(a, G); break;
      // the save bar's sweep: a made-up answer on the example's own row, nothing sent
      case 'sweep': {
        var sw = a.closest('[data-gk-gui-sg-sweep]'), swRail = sw && sw.querySelector('.gk-gui-stuff-rail');
        if (swRail && G.save && G.save.rehearse) G.save.rehearse(swRail, { answer: d('answer'), delay: parseInt(d('delay'), 10), sweep: d('sweep-mode'), flip: true });
      } break;
      case 'where': whereTargets(a, G, d); break;
      case 'where_steps': whereSteps(a, G, d); break;
      case 'palette':
        if (G.palette) {
          G.palette.open({ placeholder: d('placeholder'), items: list(a, 'data-gk-gui-sg-items').map(function (l) { return { label: l }; }), onPick: function () {} });
        }
        break;
      case 'select': { var sel = document.getElementById(d('select')); if (sel && G.selectSearch) G.selectSearch.enhance(sel, { open: true }); } break;
      case 'sentence': sentenceDemo(data(a, 'data-gk-gui-sg-sentence'), G, d('host')); break;
      case 'context_menu': {
        // core's own script opens its menu on a right click on a row of the issue list in Prova's own tile (the
        // section's small list), else the first of the guide's issue lists
        var rowSel = '.gk-gui-stuff-sg-cm tr.hascontextmenu td.subject, .gk-gui-stuff-sg-cm tr.hascontextmenu td';
        var cell = a.closest('.gk-gui-stuff-sg-tile');
        var row = (cell && cell.querySelector(rowSel)) || document.querySelector(rowSel);
        if (!row) break;
        var r = row.getBoundingClientRect();
        row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 20, clientY: r.top + 8, button: 2 }));
        break;
      }
    }
  }
  // The sentence with the guide's words and no server: a part opens its box, Klar applies, Esc and the cross
  // put back what stood, the word turns and, or, and not; "+ Villkor" adds one not filled in and opens it
  function sentenceDemo(o, G, hostId) {
    var host = document.getElementById(hostId || 'gk-gui-stuff-sg-sentence-live');
    if (!host || !G.sentence) return;
    if (host._gkGuiS) host._gkGuiS.destroy();
    var items = JSON.parse(JSON.stringify(o.items || [])), s = null, n = 0;
    function walk(list, fn) { list.forEach(function (i, at) { fn(i, list, at); if (i.items) walk(i.items, fn); }); }
    function find(key) { var hit = null; walk(items, function (i, list, at) { if (i.key === key) hit = { i: i, list: list, at: at }; }); return hit; }
    function changed() { s.update({ items: items }); s.pending(true); }
    function valueBox(key, el) {
      var f = find(key);
      if (!f) return;
      var p = el('p'), op = el('select'), v = el('input');
      [[o.op_is, o.op_is], [o.op_is_not, o.op_is_not]].forEach(function (x) { var opt = new Option(x[0], x[1], false, f.i.op === x[1]); op.appendChild(opt); });
      op.setAttribute('aria-label', o.operator || '');
      v.type = 'text';
      v.value = f.i.incomplete ? '' : (f.i.value || '');
      v.setAttribute('aria-label', o.value || '');
      p.appendChild(op); p.appendChild(document.createTextNode(' ')); p.appendChild(v);
      return p;
    }
    var on = {
      value: function (key, b) {
        var f = find(key), content = valueBox(key, function (t) { return document.createElement(t); });
        if (!content) return;
        G.sentence.box({ anchor: b, title: f.i.field, content: content,
                         onDone: function () {
                           f.i.op = content.querySelector('select').value;
                           var v = content.querySelector('input').value.trim();
                           f.i.value = v; f.i.incomplete = !v;
                           changed();
                         },
                         onCancel: function () {},
                         onRemove: function () { f.list.splice(f.at, 1); changed(); } });
      },
      field: function (key, b) { on.value(key, b.closest('.gk-gui-stuff-pill').querySelector('[data-gk-gui-sentence-part="value"]')); },
      remove: function (key) { var f = find(key); if (f) { f.list.splice(f.at, 1); changed(); } },
      word: function (key) {
        var f = find(key);
        if (!f) return;
        var next = { and: 'or', or: 'not', not: 'and' }[f.i.logic] || 'and';
        f.i.logic = next;
        f.i.text = next === 'not' ? o.and_not : o[next];
        changed();
      },
      add: function () {
        var key = 'new.' + (++n);
        items.push({ kind: 'word', key: 'join.new.' + n, text: o.and, logic: 'and', title: (items[1] || {}).title });
        items.push({ kind: 'condition', key: key, field: o.new_field, op: o.op_is, value: null, incomplete: true });
        changed();
        var b = host.querySelector('[data-gk-gui-sentence-part="value"][data-gk-gui-sentence-key="' + key + '"]');
        if (b) on.value(key, b);
      }
    };
    s = G.sentence.mount(host, { key: host.id, lead: o.lead, empty: o.empty, items: items, add: o.add, on: on });
    host._gkGuiS = s;
  }
  document.addEventListener('click', function (e) {
    var t = e.target, G = window.GkGui;
    var pr = t.closest && t.closest('[data-gk-gui-sg-try]');
    if (pr) { e.preventDefault(); if (G) tryIt(pr, G); return; }
    // the layer under a pill: right after the pill, the value part its opener; a second click closes it
    var part = t.closest && t.closest('[data-gk-gui-sg-parent]');
    if (part && G && G.layer) {
      e.preventDefault();
      if (part._gkGuiLayer && part._gkGuiLayer.el.isConnected) { part._gkGuiLayer.close(); return; }
      var o = data(part, 'data-gk-gui-sg-parent');
      part._gkGuiLayer = G.layer.open({ key: 'styleguide-parent', title: o.title, content: el('p', null, o.text || ''), parent: part.closest('.gk-gui-stuff-pill'), opener: part });
      return;
    }
    var fly = t.closest && t.closest('[data-gk-gui-sg-fly]');
    if (fly && G && G.fly && G.fly.open) { e.preventDefault(); G.fly.open(fly, flyContent(data(fly, 'data-gk-gui-sg-fly'))); return; }
    var rb = t.closest && t.closest('[data-gk-gui-sg-ribbon]');
    if (rb) {
      var o = data(rb, 'data-gk-gui-sg-ribbon');
      // with action (the locked band): its button would lead to the live page; here a handler, never an address, so
      // that it says that the example leads nowhere and the page stays
      if (G && G.ribbon) {
        var rbFrame = G.ribbon.show({ key: 'styleguide', word: o.word, line: o.line, icon: o.icon, title: o.title, role: o.role, priority: o.priority || 0,
                                      action: o.action ? { label: o.action.label, handler: function (ev) { sayNowhere(ev.currentTarget || rb); } } : null });
        // also when a band of higher priority stands and this one did not come: the arrow leads to the band that is there
        if (rbFrame && G.showWhere) G.showWhere({ key: 'ribbon', target: rbFrame, word: G.showWhere.word('ribbon') });
      }
      if (o.action) return;
      var tpl = document.getElementById('gk-gui-stuff-sg-topfly'), acc = document.querySelector('#top-menu #account');
      if (tpl && acc && !acc.querySelector('details.gk-gui-stuff-fly')) {
        var d = tpl.content.firstElementChild.cloneNode(true);
        acc.insertBefore(d, acc.firstChild);
        d.open = true;
      }
      return;
    }
    var all = t.closest && t.closest('[data-gk-gui-sg-all-code]');
    if (all) { allCode(); return; }
    var chip = t.closest && t.closest('[data-gk-gui-sg-chip]');
    if (chip) { pickGroup(chip); return; }
    var cpt = t.closest && t.closest('.gk-gui-stuff-sg-counterpart a');
    if (cpt) { if (counterpart(cpt)) e.preventDefault(); return; }
    // a link in the menu on a phone closes the menu, so that the element it leads to is seen
    var item = t.closest && t.closest('[data-gk-gui-sg-item] a');
    if (item && narrow()) { var fold = item.closest('[data-gk-gui-sg-menu-fold]'); if (fold) fold.open = false; }
  });

  // ---- the page's form and the element's choices are view segments (gk_gui_stuff_view_segment): they only change the
  // view and are never posted; the segment presses the part clicked and tells the page by gk-gui-view-segment
  document.addEventListener('gk-gui-view-segment', function (e) {
    var sw = e.target, v = e.detail && e.detail.value;
    if (!sw.closest || v == null) return;
    // Sida or Bibliotek: the page again in the form chosen (?form=library; Sida without it), at the same element
    if (sw.closest('[data-gk-gui-sg-form]')) { pickForm(v); return; }
    if (sw.closest('[data-gk-gui-sg-choice]')) choose(sw, v);
  });
  function pickForm(value) {
    var u = new URL(window.location.href);
    if ((u.searchParams.get('form') === 'library') === (value === 'library')) return;
    if (value === 'library') u.searchParams.set('form', 'library'); else u.searchParams.delete('form');
    window.location.assign(u.toString());
  }

  // ---- the element's choices: light or dark, computer or phone (the view segments stand bare, pressed here, never posted)
  function press(sw, value) {
    sw.querySelectorAll(':scope > button').forEach(function (x) { x.setAttribute('aria-pressed', x.value === value ? 'true' : 'false'); }); // gk-r17 P2r: the view segment and its buttons are this plugin's own primitive, not core's
  }
  function page() { return document.querySelector('[data-gk-gui-sg-page]'); }
  function narrow() { return window.matchMedia && window.matchMedia('(max-width: 899px)').matches; }
  // light or dark is the page's (theme_engine's dark sits on the page's root), so every element's choice follows, every
  // phone frame too, and the element whose choice was pressed stays where it was in the window
  function setScheme(dark, keep) {
    var p = page(), h = document.documentElement, before = keep ? keep.getBoundingClientRect().top : 0;
    var cls = ['gk-theme-on'].concat(((p && p.getAttribute('data-gk-gui-sg-dark')) || '').split(' ').filter(Boolean));
    var paint = function (root) { root.setAttribute('data-gk-scheme', dark ? 'dark' : 'light'); cls.forEach(function (c) { root.classList.toggle(c, dark); }); };
    paint(h);
    document.querySelectorAll('iframe[data-gk-gui-sg-phone]').forEach(function (f) { try { if (f.contentDocument) paint(f.contentDocument.documentElement); } catch (e) { /* not loaded */ } });
    scheme();
    if (keep) window.scrollBy(0, keep.getBoundingClientRect().top - before);
  }
  // the page's own choice (data-gk-gui-sg-page-choice, the bar) sets every element's; an element's own choice of
  // computer or phone is the element's only, and its choices stay shown while it differs from the page's (-own). In
  // the library form the choices stand in the panel's head, beside the element and not in it: the panel's body holds both
  function choicesBox(sec) { return sec.closest('[data-gk-gui-lib-body]') || sec; }
  function elementOf(sw) {
    var body = sw.closest('[data-gk-gui-lib-body]');
    return sw.closest('[data-gk-gui-sg-element]') || (body && body.querySelector('[data-gk-gui-sg-element]'));
  }
  function choose(sw, value) {
    var box = sw.closest('[data-gk-gui-sg-choice]'), sec = elementOf(sw);
    if (box.getAttribute('data-gk-gui-sg-choice') === 'scheme') { setScheme(value === 'dark', sec); return; }
    press(sw, value);
    if (box.hasAttribute('data-gk-gui-sg-page-choice')) { pageWidth(value); return; }
    phone(sec, value === 'phone', box.getAttribute('data-gk-gui-sg-phone-title'));
    own(sec);
  }
  function pageWidthNow() {
    var b = document.querySelector('[data-gk-gui-sg-page-choice][data-gk-gui-sg-choice="width"] [aria-pressed="true"]');
    return b ? b.value : 'desktop';
  }
  function own(sec) {
    var at = sec && choicesBox(sec), tools = at && at.querySelector('.gk-gui-stuff-sg-element-tools'), b = at && at.querySelector('[data-gk-gui-sg-choice="width"] [aria-pressed="true"]');
    if (tools) tools.classList.toggle('gk-gui-stuff-sg-own', !!b && b.value !== pageWidthNow());
  }
  function pageWidth(value) {
    document.querySelectorAll('[data-gk-gui-sg-element]').forEach(function (sec) {
      var box = choicesBox(sec).querySelector('[data-gk-gui-sg-choice="width"]'), sw = box && box.querySelector('[data-gk-gui-view-segment]');
      if (sw) press(sw, value);
      phone(sec, value === 'phone', box ? box.getAttribute('data-gk-gui-sg-phone-title') : '');
      own(sec);
    });
    measure();
  }
  // every scheme segment presses what the page shows (theme_engine's head script set data-gk-scheme before it was
  // drawn); nothing is posted and html's style is never touched, so the drawer's unsaved values stay
  function scheme() {
    var now = document.documentElement.getAttribute('data-gk-scheme') === 'dark' ? 'dark' : 'light';
    document.querySelectorAll('[data-gk-gui-sg-choice="scheme"] [data-gk-gui-view-segment]').forEach(function (sw) { press(sw, now); });
  }
  // Telefon: the element's tiles in a frame 375 px wide, the guide's frame page for the element, so that every rule for
  // a narrow window applies; the frame takes the height of its page and follows it. Dator puts the tiles back
  function phone(sec, on, title) {
    if (!sec) return;
    var body = sec.querySelector('.gk-gui-stuff-sg-body'), box = sec.querySelector('.gk-gui-stuff-sg-phone');
    if (!on) { if (box) box.remove(); if (body) body.hidden = false; return; }
    if (box || !body) return;
    var p = page(), url = p && p.getAttribute('data-gk-gui-sg-frame');
    if (!url) return;
    box = el('div', 'gk-gui-stuff-sg-phone');
    var f = document.createElement('iframe');
    f.setAttribute('data-gk-gui-sg-phone', '1');
    // the page's Telefon draws every element so: a frame loads when it comes near the window
    f.loading = 'lazy';
    f.title = title || '';
    f.src = url.replace('__key__', encodeURIComponent(sec.getAttribute('data-gk-gui-sg-element')));
    f.addEventListener('load', function () {
      try {
        var d = f.contentDocument;
        if (!d) return;
        setSchemeIn(d.documentElement);
        // the frame grows with its page, so core's always-shown scrollbar (html overflow-y: scroll) would only take
        // room from the 375 px
        d.documentElement.style.overflowY = 'hidden';
        var fit = function () { f.style.blockSize = Math.max(120, d.documentElement.scrollHeight) + 'px'; };
        fit();
        if (window.ResizeObserver) new ResizeObserver(fit).observe(d.body);
      } catch (e) { /* the frame stays at its own height */ }
    });
    box.appendChild(f);
    body.hidden = true;
    body.insertAdjacentElement('afterend', box);
  }
  function setSchemeIn(root) {
    var h = document.documentElement, dark = h.getAttribute('data-gk-scheme') === 'dark', p = page();
    var cls = ['gk-theme-on'].concat(((p && p.getAttribute('data-gk-gui-sg-dark')) || '').split(' ').filter(Boolean));
    root.setAttribute('data-gk-scheme', dark ? 'dark' : 'light');
    cls.forEach(function (c) { root.classList.toggle(c, dark); });
  }
  // the page's mode can change without a press: while the account stands on Auto, theme_engine follows the computer and
  // sets the page's root. Every scheme choice then says what the page shows, and every phone frame follows. The root is
  // what is read, so the guide never needs to know the account's choice, and an account on Ljust or Mörkt stays. An
  // element's choice of computer or phone is its own and is left alone; nothing is saved, and the mode moves nothing
  function followPage() {
    if (!window.MutationObserver) return;
    var h = document.documentElement, last = h.getAttribute('data-gk-scheme');
    new MutationObserver(function () {
      var now = h.getAttribute('data-gk-scheme');
      if (now === last) return;
      last = now;
      scheme();
      document.querySelectorAll('iframe[data-gk-gui-sg-phone]').forEach(function (f) { try { if (f.contentDocument) setSchemeIn(f.contentDocument.documentElement); } catch (e) { /* not loaded */ } });
    }).observe(h, { attributes: true, attributeFilter: ['data-gk-scheme'] });
  }

  // ---- Visa all kod: every tile's code open, or all closed again; the button's words say what a click does (Dölj all
  // kod while every one is open), and follow when a tile's code is opened or closed by itself. The icon button of a
  // phone's width (data-gk-gui-sg-icon-show) says them as its tooltip and its name for a screen reader, and its icon
  // turns with them (toggle-plus, toggle-minus): the sprite's symbol in its use element changed, its address kept
  function codes() { return document.querySelectorAll('details.gk-gui-stuff-sg-code'); }
  function allOpen() { var l = codes(); return l.length > 0 && Array.prototype.every.call(l, function (d) { return d.open; }); }
  function allCodeWords() {
    var open = allOpen();
    document.querySelectorAll('[data-gk-gui-sg-all-code]').forEach(function (b) {
      var w = b.getAttribute(open ? 'data-gk-gui-sg-hide' : 'data-gk-gui-sg-show');
      if (!b.hasAttribute('data-gk-gui-sg-icon-show')) { b.textContent = w; return; }
      b.setAttribute('title', w);
      b.setAttribute('aria-label', w);
      var icon = b.getAttribute(open ? 'data-gk-gui-sg-icon-hide' : 'data-gk-gui-sg-icon-show'), u = b.querySelector('svg use');
      if (!u || !icon) return;
      ['href', 'xlink:href'].forEach(function (a) {
        var h = u.getAttribute(a);
        if (h && /#icon--[\w-]+$/.test(h)) u.setAttribute(a, h.replace(/#icon--[\w-]+$/, '#icon--' + icon));
      });
    });
  }
  function allCode() {
    var open = !allOpen();
    codes().forEach(function (d) { d.open = open; });
    allCodeWords();
  }
  document.addEventListener('toggle', function (e) { if (e.target.matches && e.target.matches('details.gk-gui-stuff-sg-code')) allCodeWords(); }, true);

  // ---- the menu: a group's pill shows only that group (Alla every one), the search the elements whose name, use or
  // states match; the pills are the library's chips, the one pressed filled in its role without a check
  var group = 'all';
  function pickGroup(btn) {
    var key = btn.getAttribute('data-gk-gui-sg-chip');
    group = key === group && key !== 'all' ? 'all' : key;
    var menu = btn.closest('[data-gk-gui-sg-menu]');
    if (!menu) return;
    menu.querySelectorAll('[data-gk-gui-sg-chip]').forEach(function (x) {
      var on = x.getAttribute('data-gk-gui-sg-chip') === group, pl = x.closest('.gk-gui-stuff-pill');
      x.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (pl) pl.classList.toggle('gk-gui-stuff-pill-chosen', on);
    });
    filter();
  }
  function words(sec) {
    var w = sec.getAttribute('data-gk-gui-sg-words') || '';
    sec.querySelectorAll('.gk-gui-stuff-sg-state').forEach(function (s) { w += ' ' + s.textContent; });
    return w.toLowerCase();
  }
  function filter() {
    var p = page();
    if (!p) return;
    var input = p.querySelector('[data-gk-gui-sg-search]'), q = input ? input.value.trim().toLowerCase() : '', seen = 0;
    p.querySelectorAll('[data-gk-gui-sg-element]').forEach(function (sec) {
      var key = sec.getAttribute('data-gk-gui-sg-element');
      var show = (group === 'all' || sec.getAttribute('data-gk-gui-sg-group') === group) && (!q || words(sec).indexOf(q) >= 0);
      sec.hidden = !show;
      if (show) seen++;
      var li = p.querySelector('[data-gk-gui-sg-item="' + key + '"]');
      if (li) li.hidden = !show;
    });
    p.querySelectorAll('[data-gk-gui-sg-menu-group]').forEach(function (g) {
      g.querySelector('ul').hidden = !g.querySelector('[data-gk-gui-sg-item]:not([hidden])');
    });
    var none = p.querySelector('[data-gk-gui-sg-none]');
    if (none) none.hidden = seen > 0;
  }
  document.addEventListener('input', function (e) { if (e.target.matches && e.target.matches('[data-gk-gui-sg-search]')) filter(); });
  // go to an element: into view, and the focus on its heading, so that Tab goes on in the element and a screen reader
  // follows
  function goTo(sec) {
    sec.scrollIntoView({ block: 'start' });
    var h = sec.querySelector('.gk-gui-stuff-sg-name');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  // Enter in the search goes to the first element shown
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || !e.target.matches || !e.target.matches('[data-gk-gui-sg-search]')) return;
    var first = document.querySelector('[data-gk-gui-sg-element]:not([hidden])');
    if (first) { e.preventDefault(); goTo(first); }
  });
  // the GK counterpart's link: when the group or the search hides the element it names, Alla and an empty search first
  function counterpart(a) {
    var id = (a.getAttribute('href') || '').replace(/^#/, ''), sec = id && document.getElementById(id);
    if (!sec || !sec.hidden) return false;
    var p = page(), input = p && p.querySelector('[data-gk-gui-sg-search]'), all = p && p.querySelector('[data-gk-gui-sg-chip="all"]');
    if (input) input.value = '';
    if (all) pickGroup(all); else filter();
    goTo(sec);
    return true;
  }
  // the element in view is marked in the menu (aria-current on its link)
  function follow() {
    if (!window.IntersectionObserver) return;
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (en) {
        if (!en.isIntersecting) return;
        var key = en.target.getAttribute('data-gk-gui-sg-element');
        document.querySelectorAll('[data-gk-gui-sg-item] a').forEach(function (a) {
          if (a.closest('[data-gk-gui-sg-item]').getAttribute('data-gk-gui-sg-item') === key) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '0px 0px -70% 0px' });
    document.querySelectorAll('[data-gk-gui-sg-page] [data-gk-gui-sg-element]').forEach(function (s) { io.observe(s); });
  }
  // ---- what leads nowhere. Every example has made-up values; what in it would lead somewhere does nothing but say so,
  // with the whisper "Exempel: leder ingenstans" under the element (the text from the page, data-gk-gui-sg-nowhere):
  // every link, button and field in a tile marked Bara bild (data-gk-gui-sg-mode="still"), an element of the guide's own
  // that only shows (data-gk-gui-sg-noop) in any tile, a link to an address in a part marked
  // data-gk-gui-sg-example-links (the guide's issue lists, the lock's Stega upp), and the links of core's context menu
  // opened from the guide's issue lists. A still copy is inert, so a click on one of its controls lands on what holds
  // it and is found by its place. The library's small and large pictures are copies, never asked: a click on a small
  // picture opens its panel as before. Prova, the copy button, Kod and the guide's own hooks are never stopped.
  // CONTROL is the same list as the stylesheet's rule for the pointer (gk_gui_stuff_styleguide.css): a label too, whose
  // click would otherwise give its field the focus or turn its check box
  var CONTROL = 'a[href], button, input, select, textarea, summary, label, [role="button"]';
  var FIELD = 'input, select, textarea';
  var HOOKED = '[data-gk-gui-sg-try], [data-gk-gui-sg-fly], [data-gk-gui-sg-ribbon], [data-gk-gui-sg-parent]';
  var COPY = '[data-gk-gui-lib-thumb-from], [data-gk-gui-lib-from]';
  var AWAY = 'a[href]:not([href^="#"]):not([href^="javascript:"])';
  function nowhereText(n) {
    var h = (n.closest && n.closest('[data-gk-gui-sg-nowhere]')) || document.querySelector('[data-gk-gui-sg-nowhere]');
    return h ? h.getAttribute('data-gk-gui-sg-nowhere') : '';
  }
  function sayNowhere(at) { var G = window.GkGui, t = nowhereText(at); if (t && G && G.whisper) G.whisper(t, at); }
  // the element under t that leads nowhere, or null
  function nowhere(t) {
    if (!t || !t.closest || t.closest(COPY)) return null;
    var noop = t.closest('[data-gk-gui-sg-noop]');
    if (noop) return noop;
    // a marker panel only shown (the band's part in the marker's tiles): its buttons have no places to move between
    var mb = t.closest('[data-gk-gui-marker]');
    if (mb && mb.closest('[data-gk-gui-sg-marker-noop]')) return mb;
    var c = t.closest(CONTROL);
    if (!c || c.closest(HOOKED)) return null;
    if (c.matches(AWAY) && c.closest('[data-gk-gui-sg-example-links]')) return c;
    var shown = c.closest('.gk-gui-stuff-sg-shown'), tile = shown && shown.closest('[data-gk-gui-sg-mode]');
    return tile && tile.getAttribute('data-gk-gui-sg-mode') === 'still' ? c : null;
  }
  // a control of a still copy under the pointer at x, y in t's tile or in a comparison under Visa, or null
  function stillAt(t, x, y) {
    var tile = t.closest('.gk-gui-stuff-sg-tile, [data-gk-gui-compare]'), hit = null;
    if (!tile || t.closest(COPY) || (!x && !y)) return null;
    tile.querySelectorAll('.gk-gui-stuff-sg-still[inert], [data-gk-gui-compare-picture][inert]').forEach(function (s) {
      s.querySelectorAll(CONTROL).forEach(function (c) {
        var r = c.getBoundingClientRect();
        if (!hit && r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) hit = c;
      });
    });
    return hit;
  }
  // the guide's issue list asks the guide's own address for core's context menu; a menu opened from it leads nowhere
  var fromDemo = false;
  document.addEventListener('contextmenu', function (e) { fromDemo = !!(e.target.closest && e.target.closest('.gk-gui-stuff-sg-cm')); }, true);
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest) return;
    var n = nowhere(t) || (fromDemo && t.closest('#context-menu a')) || stillAt(t, e.clientX, e.clientY);
    if (n) { e.preventDefault(); e.stopPropagation(); sayNowhere(n); return; }
    if (t.closest('.gk-gui-stuff-sg-cm')) fromDemo = true;
    back(t.closest('a[data-method]'));
  }, true);
  // A form posted from an example to the guide's address comes back to the same form of the page and the same
  // element: the element's key goes with it (sg_key; the server takes the form from where the post came from). A
  // form gets it as a hidden field, a link that core's script turns into a post (data-method) in its address
  function back(n) {
    var sec = n && n.closest('[data-gk-gui-sg-element]'), key = sec && sec.getAttribute('data-gk-gui-sg-element');
    if (!key) return;
    if (n.tagName === 'FORM') {
      if (n.querySelector('input[name="sg_key"]')) return;
      var h = document.createElement('input');
      h.type = 'hidden'; h.name = 'sg_key'; h.value = key;
      n.appendChild(h);
      return;
    }
    try {
      var u = new URL(n.getAttribute('href'), window.location.href);
      if (u.origin !== window.location.origin || u.searchParams.has('sg_key')) return;
      u.searchParams.set('sg_key', key);
      n.setAttribute('href', u.pathname + u.search + u.hash);
    } catch (err) { /* the address stays as it is, and the page comes back at its top */ }
  }
  document.addEventListener('submit', function (e) { if (e.target && e.target.tagName === 'FORM') back(e.target); }, true);
  // a field that leads nowhere, and a label, take no focus from the pointer and open no list; the click says so
  document.addEventListener('mousedown', function (e) {
    var n = nowhere(e.target);
    if (n && n.matches(FIELD + ', label')) e.preventDefault();
  }, true);
  // from the keyboard: Enter and Space on a link or a button, and every key that would change a field, say so; Tab and
  // Esc go on as always. With Alt, Ctrl or Meta held a link or a button goes on (the browser's own keys), and in a
  // field only copying and selecting all do (Alt+Pil ned would open a list)
  var PASS = { Tab: 1, Escape: 1, Shift: 1, Control: 1, Alt: 1, Meta: 1, CapsLock: 1 };
  document.addEventListener('keydown', function (e) {
    if (PASS[e.key]) return;
    var n = nowhere(e.target);
    if (!n) return;
    var field = n.matches(FIELD);
    if (e.ctrlKey || e.metaKey || e.altKey) {
      if (!field || ((e.ctrlKey || e.metaKey) && !e.altKey && /^[ac]$/i.test(e.key))) return;
    } else if (!field && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    sayNowhere(n);
  }, true);
  // a browser that clicks a button on Space's keyup (Firefox) is stopped there too, without a second whisper
  document.addEventListener('keyup', function (e) {
    if (e.key !== ' ') return;
    var n = nowhere(e.target);
    if (n && !n.matches(FIELD)) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.addEventListener('beforeinput', function (e) { if (nowhere(e.target)) { e.preventDefault(); sayNowhere(e.target); } }, true);
  // a value changed all the same (a list chosen without beforeinput) is put back to the page's own and says so
  function putBack(f) {
    if (f.tagName === 'SELECT') {
      Array.prototype.forEach.call(f.options, function (o) { o.selected = o.defaultSelected; });
    } else if (f.type === 'radio') {
      Array.prototype.forEach.call((f.form || document).querySelectorAll('input[type="radio"]'), function (r) { if (r.name === f.name) r.checked = r.defaultChecked; });
    } else if (f.type === 'checkbox') {
      f.checked = f.defaultChecked;
    } else if (f.type !== 'file') {
      f.value = f.defaultValue;
    }
  }
  document.addEventListener('change', function (e) {
    var n = nowhere(e.target);
    if (!n || !n.matches(FIELD)) return;
    putBack(n);
    e.stopPropagation();
    sayNowhere(n);
  }, true);
  // The side menu held at the top of the window while the page scrolls. CSS sticky cannot: core's #wrapper (overflow:
  // hidden) and #content (overflow-x: auto) are the boxes it would hold to, never the window. So, as core's own
  // sticky issue header, the menu is fixed by the script once its column ([data-gk-gui-sg-side], which keeps its place
  // in the grid) has passed the top, at the column's place and width, and stops at the page's end. Under 899 px it
  // stands in the flow at the top.
  function pin() {
    var side = document.querySelector('[data-gk-gui-sg-side]'), menu = side && side.querySelector('[data-gk-gui-sg-menu]'), p = page();
    if (!menu || !p) return;
    var fixed = 'gk-gui-stuff-sg-menu-fixed';
    var loose = function () { menu.classList.remove(fixed); menu.style.top = menu.style.left = menu.style.width = ''; };
    if (narrow()) { loose(); return; }
    // the top the stylesheet gives (--gk-gui-sg-top), as the fixed menu resolves it
    menu.style.top = '';
    menu.classList.add(fixed);
    var top = parseFloat(getComputedStyle(menu).top) || 8, s = side.getBoundingClientRect();
    if (s.top >= top) { loose(); return; }
    menu.style.left = s.left + 'px';
    menu.style.width = s.width + 'px';
    menu.style.top = Math.min(top, p.getBoundingClientRect().bottom - menu.offsetHeight) + 'px';
  }
  // The page's bar held the same way at the top of the window, on a computer and on a phone, while its place
  // ([data-gk-gui-sg-bar-place]) keeps its height in the flow; it stops at the page's end. Its height is measured
  // here, held at its place's width with its own padding and frame, as a jump finds it (in the flow it is lower,
  // and on a phone it may take two rows when held): the room at the top a jump must leave (--gk-gui-sg-bar-h). The
  // place keeps the bar's height in the flow (flowH, measured loose first), never the held height, so that nothing
  // under it moves when the bar is held or let go. The place keeps a height through the whole measure too: were it
  // empty for a moment (the bar held before the place has its height), the browser's scroll anchoring would move
  // the page by the bar's height, and that scroll would run this again, frame after frame, to the page's end
  function pinBar() {
    var place = document.querySelector('[data-gk-gui-sg-bar-place]'), bar = place && place.querySelector('[data-gk-gui-sg-bar]'), p = page();
    if (!bar || !p) return;
    var fixed = 'gk-gui-stuff-sg-tools-fixed';
    var loose = function () { bar.classList.remove(fixed); bar.style.top = bar.style.left = bar.style.width = ''; place.style.minBlockSize = ''; };
    place.style.minBlockSize = place.offsetHeight + 'px';
    bar.classList.remove(fixed); bar.style.top = bar.style.left = bar.style.width = '';
    var flowH = bar.offsetHeight;
    place.style.minBlockSize = flowH + 'px';
    bar.classList.add(fixed);
    var s = place.getBoundingClientRect();
    bar.style.width = s.width + 'px';
    var h = bar.offsetHeight, top = parseFloat(getComputedStyle(bar).top) || 8;
    if (p.style.getPropertyValue('--gk-gui-sg-bar-h') !== h + 'px') p.style.setProperty('--gk-gui-sg-bar-h', h + 'px');
    if (s.top >= top) { loose(); return; }
    bar.style.left = s.left + 'px';
    bar.style.top = Math.min(top, p.getBoundingClientRect().bottom - h) + 'px';
  }
  // Visa var's arrows up stand under the page's bar while it lies in the window's upper part, held or not
  function keepArrows() {
    var bar = document.querySelector('[data-gk-gui-sg-bar]'), root = document.documentElement.style;
    var r = bar ? bar.getBoundingClientRect() : null;
    if (r && r.bottom > 0 && r.top < window.innerHeight / 3) root.setProperty('--gk-gui-stuff-where-keep', Math.round(r.bottom) + 'px');
    else root.removeProperty('--gk-gui-stuff-where-keep');
  }
  // The room at the top a jump must leave: core's header where it is fixed is the library's to measure (its script,
  // --gk-gui-lib-head-h, in the page's library tones), and the page's bar is this page's (pinBar, the bar as it is
  // held); the stylesheet adds them to the elements' scroll-margin and, through --gk-gui-lib-jump-more, to the library
  // form's. Measured again whenever the bar or its place changes size (a window turned, words that wrap)
  function measure() {
    var p = page();
    if (!p) return;
    pinBar();
    keepArrows();
    var place = document.querySelector('[data-gk-gui-sg-bar-place]'), bar = place && place.querySelector('[data-gk-gui-sg-bar]');
    if (!bar) p.style.setProperty('--gk-gui-sg-bar-h', '0px');
    else if (window.ResizeObserver && !bar._gkGuiSgRo) {
      bar._gkGuiSgRo = new ResizeObserver(function () { pinSoon(); });
      bar._gkGuiSgRo.observe(bar);
      bar._gkGuiSgRo.observe(place);
    }
  }
  // An address with an element's anchor: the browser's first jump may come before the room at the top is measured,
  // so once it is, the element is brought into view again (the library form's items are the library's own)
  function fromHash() {
    var id = (window.location.hash || '').replace(/^#/, ''), sec = null;
    try { sec = id && document.getElementById(decodeURIComponent(id)); } catch (e) { sec = id && document.getElementById(id); }
    if (sec && sec.matches('[data-gk-gui-sg-element]') && !sec.hidden) sec.scrollIntoView({ block: 'start' });
  }
  // The flags and the marker's box for what is gone hide where a held bar lies over them, but they are laid in their
  // own frame on the same scroll, which may run before this one: when the bar or the menu has just been held or let
  // go, they are laid once more, so that a jump never leaves a flag drawn over the bar
  var held = '';
  function heldNow() {
    return ['[data-gk-gui-sg-bar]', '[data-gk-gui-sg-menu]'].map(function (s) {
      var n = document.querySelector(s);
      return n ? (n.classList.contains('gk-gui-stuff-sg-tools-fixed') || n.classList.contains('gk-gui-stuff-sg-menu-fixed') ? '1' : '0') + n.style.top : '-';
    }).join('|');
  }
  function relayOnTop() {
    var now = heldNow();
    if (now === held) return;
    held = now;
    var G = window.GkGui || {};
    if (G.flag && G.flag.place) G.flag.place();
    if (G.marker && G.marker.relay) G.marker.relay();
  }
  var pinQueued = false;
  function pinSoon() { if (!pinQueued) { pinQueued = true; window.requestAnimationFrame(function () { pinQueued = false; pin(); pinBar(); relayOnTop(); keepArrows(); }); } }
  // the fold: open on a computer's width (its summary is hidden there), closed when the window turns narrow
  function fold() {
    var n = narrow();
    document.querySelectorAll('[data-gk-gui-sg-menu-fold]').forEach(function (d) { d.open = !n; });
    pinSoon();
  }
  function start() {
    // the whisper's live region in the page from the start, so that the first "Exempel: leder ingenstans" is read
    if (window.GkGui && window.GkGui.whisperRegion) window.GkGui.whisperRegion();
    scheme();
    followPage();
    follow();
    // on a phone the menu stands folded at the top; a window made wide again opens it, since its summary is hidden there
    if (narrow()) fold();
    if (window.matchMedia) {
      var mq = window.matchMedia('(max-width: 899px)');
      if (mq.addEventListener) mq.addEventListener('change', fold); else if (mq.addListener) mq.addListener(fold);
    }
    measure();
    window.addEventListener('scroll', pinSoon, { passive: true });
    window.addEventListener('resize', function () { measure(); pinSoon(); });
    document.addEventListener('input', pinSoon);
    document.addEventListener('click', pinSoon);
    pin();
    pinBar();
    relayOnTop();
    window.requestAnimationFrame(fromHash);
    document.querySelectorAll('[data-gk-gui-sg-cm]').forEach(function (w) {
      var f = w.querySelector('form[data-cm-url]');
      if (f) f.setAttribute('data-cm-url', w.getAttribute('data-gk-gui-sg-cm'));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
