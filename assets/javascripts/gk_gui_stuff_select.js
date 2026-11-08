// gk_gui_stuff: the searchable chooser, always loaded with the primitives, so that a primitive
// can open it and a field that asks for it has it, whether select_search is on or not; the module only gives core's
// long lists the chooser by itself (gk_gui_stuff_lists.js). Its words come with the primitives'. Before the kernel;
// what it puts on GkGui is kept.
//   GkGui.selectSearch.enhance(select, { open: true })  -> { el, open(), close(), destroy() }  any select, anywhere
//   GkGui.selectSearch.pass(root)                        the fields under root that ask for the chooser get it (gk_gui_stuff_select_pass.js)
//   GkGui.selectSearch.find                              norm, words, hit, textOf, searchIcon, shared with list_filter
// The real select stays in the form, hidden, and is what is sent; the chooser sets it and tells it (input, change).
// An optgroup is a heading kept while searching (Mest använda, Alla fält); data-gk-gui-used="1" is quiet with
// "(används redan)". Several choices are pills (GkGui.pill, data-gk-gui-role). Over 500 rows are drawn only where
// scrolled to. data-gk-gui-select="create": typed text that is no choice exactly gives "Lägg till: …", a new
// chosen option (data-gk-gui-new, the pill's "ny"; -new-role, -prefix, -lower); "create-denied" the quiet row.
(function () {
  var G = window.GkGui = window.GkGui || {};
  var T = {};
  var tEl = document.getElementById('gk-gui-stuff-primitives-texts');
  try { if (tEl) T = JSON.parse(tEl.textContent); } catch (e) { /* the keys */ }
  function t(key, vars) {
    var s = T[key] || key;
    Object.keys(vars || {}).forEach(function (k) { s = s.replace('%{' + k + '}', vars[k]); });
    return s;
  }
  function N(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  // the kernel's icon when it is there (icons or core's sprite), else the character
  function icon(name, fallback, size) { var K = window.GkGui; return K.icon ? K.icon(name, fallback, size) : document.createTextNode(fallback || ''); }
  var seq = 0;

  function norm(s) { return String(s || '').toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  function words(q) { var n = norm(q); return n ? n.split(' ') : []; }
  function hit(text, ws) { for (var i = 0; i < ws.length; i++) { if (text.indexOf(ws[i]) < 0) return false; } return true; }
  function textOf(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); } // gk-r17 P4r: a list's own words, read to show and search them as typed; nothing is found by them
  // a magnifier at the field's start, the browser's own search glyph never shown
  function searchIcon(wrap, cls) {
    var ic = icon('search', '', 14);
    if (ic.nodeType !== 1) return;
    var s = N('span', cls);
    s.setAttribute('aria-hidden', 'true');
    s.appendChild(ic);
    wrap.appendChild(s);
    wrap.classList.add('gk-gui-stuff-has-icon');
  }
  function selectLabel(sel) {
    if (sel.getAttribute('aria-label')) return sel.getAttribute('aria-label');
    if (sel.id) { var l = document.querySelector('label[for="' + CSS.escape(sel.id) + '"]'); if (l) return textOf(l); }
    var p = sel.closest('label'); if (p) return textOf(p);
    return sel.title || '';
  }
  // a choice's text with the searched words in bold, found as norm() finds them, marked on the original characters
  function marked(raw, ws) {
    var frag = document.createDocumentFragment();
    if (!ws.length) { frag.appendChild(document.createTextNode(raw)); return frag; }
    var flat = '', map = [], on = new Uint8Array(raw.length), i, j;
    for (i = 0; i < raw.length; i++) {
      var c = raw[i].toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      for (j = 0; j < c.length; j++) { flat += c[j]; map.push(i); }
    }
    ws.forEach(function (w) {
      for (var p = flat.indexOf(w); p >= 0; p = flat.indexOf(w, p + w.length)) {
        for (var k = p; k < p + w.length; k++) on[map[k]] = 1;
      }
    });
    for (i = 0; i < raw.length; i = j) {
      for (j = i; j < raw.length && on[j] === on[i]; j++);
      var part = raw.slice(i, j);
      if (on[i]) { var m = N('mark', 'gk-gui-stuff-ss-hit', part); frag.appendChild(m); } else frag.appendChild(document.createTextNode(part));
    }
    return frag;
  }
  var VIRTUAL = 500;
  function enhance(sel, opts) {
    if (sel._gkGuiSs) { if (opts && opts.open) sel._gkGuiSs.open(); return sel._gkGuiSs; }
    sel.dataset.gkGuiSs = '1';
    var oldTab = sel.getAttribute('tabindex');
    var multi = sel.multiple, id = 'gk-gui-stuff-ss-' + (++seq), open = false, dirty = true, hideTimer = 0, frame = 0;
    var create = sel.dataset.gkGuiSelect === 'create', denied = sel.dataset.gkGuiSelect === 'create-denied';
    var prefix = sel.dataset.gkGuiSelectPrefix || '', lower = sel.hasAttribute('data-gk-gui-select-lower'), newRole = sel.dataset.gkGuiSelectNewRole || '';
    var ph = t(create ? 'ss_placeholder_create' : 'ss_placeholder');
    // entries: the list's choices and group headings in its order; view: those shown; active: the marked one in view
    var entries = [], view = [], active = -1, ws = [], qk = null, virt = false, rowH = 0;
    var cs = window.getComputedStyle(sel), width = sel.getBoundingClientRect().width, height = sel.offsetHeight;
    var wrap = N('span', 'gk-gui-stuff-ss ' + (multi ? 'gk-gui-stuff-ss-multi' : 'gk-gui-stuff-ss-single'));
    // the list's width as meant: relative (its own percentage, or filling its cell) stays relative, else in px
    var own = sel.style.inlineSize || sel.style.width, pr = sel.parentElement, pcs = pr && window.getComputedStyle(pr);
    var inner = pr ? pr.clientWidth - (parseFloat(pcs.paddingLeft) || 0) - (parseFloat(pcs.paddingRight) || 0) : 0;
    if (own && own.indexOf('%') > 0) wrap.style.inlineSize = own;
    else if (inner > 40 && width >= inner * 0.95) wrap.style.inlineSize = '100%';
    // one choice with create shows the chosen one as a pill ("ny" and its x included), wider than the text the list
    // was measured by: the list's width is then the least, and the field grows to the pill (never past its line)
    else if (width > 40 && create && !multi) wrap.style.minInlineSize = 'min(' + Math.ceil(width) + 'px, 100%)';
    else if (width > 40) wrap.style.inlineSize = Math.ceil(width) + 'px';
    else wrap.classList.add('gk-gui-stuff-ss-free');
    var label = selectLabel(sel);
    var box = N('span', 'gk-gui-stuff-ss-box');
    // the closed chooser in the list's own look: its font and corners, for a single list its padding, height and arrow
    box.style.fontFamily = cs.fontFamily;
    box.style.fontSize = cs.fontSize;
    box.style.borderRadius = cs.borderRadius;
    var value = null, caret = null, chips = null, input, find = null;
    if (!multi) {
      box.style.paddingBlock = cs.paddingBlockStart + ' ' + cs.paddingBlockEnd;
      box.style.paddingInline = cs.paddingInlineStart + ' ' + cs.paddingInlineEnd;
      var h = height || parseFloat(cs.height) || 0;
      if (h > 0) box.style.minBlockSize = h + 'px';
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        box.style.backgroundImage = cs.backgroundImage;
        box.style.backgroundRepeat = cs.backgroundRepeat;
        box.style.backgroundPosition = cs.backgroundPosition;
      } else {
        caret = N('span', 'gk-gui-stuff-ss-caret');
        caret.setAttribute('aria-hidden', 'true');
        caret.appendChild(icon('angle-down', '▾', 14));
      }
      box.tabIndex = 0;
      box.setAttribute('role', 'combobox');
      box.setAttribute('aria-haspopup', 'listbox');
      box.setAttribute('aria-expanded', 'false');
      box.setAttribute('aria-controls', id);
      if (label) box.setAttribute('aria-label', label);
      value = N('span', 'gk-gui-stuff-ss-value');
      box.appendChild(value);
      if (caret) box.appendChild(caret);
    } else {
      chips = N('span', 'gk-gui-stuff-ss-chips');
      box.appendChild(chips);
    }
    var drop = N('div', 'gk-gui-stuff-ss-drop');
    drop.hidden = true;
    var list = N('ul', 'gk-gui-stuff-ss-list');
    list.id = id;
    list.setAttribute('role', 'listbox');
    if (label) list.setAttribute('aria-label', label);
    if (multi) list.setAttribute('aria-multiselectable', 'true');
    // the keys are typed in the panel's search (one choice) or in the field among the pills (several)
    if (!multi) {
      var head = N('div', 'gk-gui-stuff-ss-search');
      searchIcon(head, 'gk-gui-stuff-ss-search-icon');
      find = N('input', 'gk-gui-stuff-ss-find');
      find.type = 'search';
      find.setAttribute('role', 'searchbox');
      find.placeholder = ph;
      find.setAttribute('aria-label', t('ss_search'));
      head.appendChild(find);
      drop.appendChild(head);
      input = find;
    } else {
      input = N('input', 'gk-gui-stuff-ss-input');
      input.dataset.gkLooksSkip = '1'; // core_stuff's widths and heights leave the chooser to us
      input.type = 'text';
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-haspopup', 'listbox');
      input.setAttribute('aria-expanded', 'false');
      input.setAttribute('aria-label', label || t('ss_search'));
      box.appendChild(input);
    }
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', id);
    drop.appendChild(list);
    wrap.appendChild(box);
    wrap.appendChild(drop);
    sel.parentNode.insertBefore(wrap, sel.nextSibling);
    sel.classList.add('gk-gui-stuff-ss-native');
    sel.dataset.gkLooksSkip = '1';
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');
    var focusEl = multi ? input : box;
    function toChooser() { focusEl.focus(); }
    sel.addEventListener('focus', toChooser);
    var empty = N('li', 'gk-gui-stuff-ss-empty', t('no_hits'));
    empty.setAttribute('role', 'presentation');
    var padTop = N('li', 'gk-gui-stuff-ss-spacer'), padEnd = N('li', 'gk-gui-stuff-ss-spacer');
    [padTop, padEnd].forEach(function (s) { s.setAttribute('role', 'presentation'); s.setAttribute('aria-hidden', 'true'); });

    function build() {
      dirty = false;
      entries = [];
      Array.prototype.forEach.call(sel.children, function (node) {
        if (node.tagName === 'OPTGROUP') {
          var g = { group: true, raw: node.label || '' };
          entries.push(g);
          Array.prototype.forEach.call(node.children, function (o) { if (o.tagName === 'OPTION') add(o, g); });
        } else if (node.tagName === 'OPTION') {
          add(node, null);
        }
      });
    }
    function add(o, g) {
      var raw = o.text; // the option's text as HTML gives it, spaces collapsed
      // the words that are this choice exactly: its value, its text without the prefix, and its data-gk-gui-also
      var same = !(create || denied) ? null
        : [key(o.value), key(bare(raw))].concat((o.dataset.gkGuiAlso || '').split(/\s+/).filter(Boolean).map(function (w) { return key(bare(w)); }));
      entries.push({ o: o, grp: g, raw: raw, text: norm(raw), same: same, n: entries.length, li: null, qk: null });
    }
    // create: a name is the same as a choice with case ignored, accents kept, and the prefix taken off once
    function key(s) { return String(s || '').normalize('NFC').toLocaleLowerCase().trim(); }
    function bare(s) {
      s = String(s || '').replace(/\s+/g, ' ').trim();
      if (prefix && s.indexOf(prefix) === 0) s = s.slice(prefix.length).trim();
      return s;
    }
    function exact(typed) {
      var k = key(typed);
      return k ? entries.find(function (e) { return e.o && e.same.indexOf(k) >= 0; }) || null : null;
    }
    function newText(typed) { return lower ? typed.toLocaleLowerCase() : typed; }
    // a new choice, chosen: its value without the prefix, its text with it; the pill says it is new
    function addNew(typed) {
      var text = newText(typed), made = new Option(prefix + text, text, true, true);
      made.dataset.gkGuiNew = '1';
      made.dataset.gkGuiRole = newRole;
      sel.appendChild(made);
      if (!multi) sel.value = text;
    }
    function unchoose(o) {
      if (o.dataset.gkGuiNew) { o.remove(); build(); } else o.selected = false;
      if (!multi) sel.value = '';
      told();
    }
    // an entry's row, made when first shown; create: "Lägg till" last under a line; create-denied: the quiet row

    function rowOf(e, i) {
      if (e.create || e.none) {
        if (!e.li) {
          if (e.create) {
            e.li = N('li', 'gk-gui-stuff-ss-option gk-gui-stuff-ss-create');
            e.li.id = id + '-new';
            e.li.setAttribute('role', 'option');
            var plus = N('span', 'gk-gui-stuff-ss-check');
            plus.setAttribute('aria-hidden', 'true');
            plus.appendChild(icon('add', '+', 14));
            e.li.appendChild(plus);
            e.li.appendChild(N('span', 'gk-gui-stuff-ss-text', t('ss_create', { name: e.raw })));
            e.li._gkEntry = e;
          } else {
            e.li = N('li', 'gk-gui-stuff-ss-none', t('ss_no_tag', { name: e.raw }));
            e.li.setAttribute('role', 'presentation');
          }
        }
        e.li._gkAt = i;
        if (e.create) e.li.classList.toggle('gk-gui-stuff-ss-active', i === active);
        return e.li;
      }
      if (!e.li) {
        if (e.group) {
          e.li = N('li', 'gk-gui-stuff-ss-group', e.raw);
          e.li.setAttribute('role', 'presentation');
        } else {
          e.li = N('li', 'gk-gui-stuff-ss-option' + (e.grp ? ' gk-gui-stuff-ss-grouped' : ''));
          e.li.id = id + '-' + e.n;
          e.li.setAttribute('role', 'option');
          var check = N('span', 'gk-gui-stuff-ss-check');
          check.setAttribute('aria-hidden', 'true');
          check.appendChild(icon('checked', '✓', 14));
          e.li.appendChild(check);
          e.txt = N('span', 'gk-gui-stuff-ss-text');
          e.li.appendChild(e.txt);
          // in use: quiet, the words after it; chosen or not as the caller says (disabled)
          if (e.o.dataset.gkGuiUsed) {
            e.li.classList.add('gk-gui-stuff-ss-used');
            e.li.appendChild(N('span', 'gk-gui-stuff-ss-used-note', '(' + t('ss_used') + ')'));
          }
          e.li._gkEntry = e;
        }
      }
      e.li._gkAt = i;
      if (e.o) {
        if (e.qk !== qk) { e.txt.textContent = ''; e.txt.appendChild(marked(e.raw || ' ', ws)); e.qk = qk; }
        e.li.title = e.raw;
        e.li.setAttribute('aria-selected', e.o.selected ? 'true' : 'false');
        if (e.o.disabled) e.li.setAttribute('aria-disabled', 'true'); else e.li.removeAttribute('aria-disabled');
        e.li.classList.toggle('gk-gui-stuff-ss-active', i === active);
      }
      return e.li;
    }
    // the rows shown: all of them, or for a long list those around where it is scrolled to and room for the rest
    function draw() {
      var frag = document.createDocumentFragment(), from = 0, to = view.length;
      list.classList.toggle('gk-gui-stuff-ss-virtual', virt);
      if (virt) {
        if (!rowH) {
          var probe = view.find(function (e) { return e.o; });
          list.textContent = '';
          list.appendChild(rowOf(probe, -1));
          rowH = probe.li.offsetHeight || 26;
          list.style.setProperty('--gk-gui-stuff-ss-row', rowH + 'px');
        }
        var top = list.scrollTop, room = list.clientHeight || 400;
        from = Math.max(0, Math.floor(top / rowH) - 8);
        to = Math.min(view.length, Math.ceil((top + room) / rowH) + 8);
        padTop.style.blockSize = (from * rowH) + 'px';
        frag.appendChild(padTop);
      }
      for (var i = from; i < to; i++) frag.appendChild(rowOf(view[i], i));
      if (virt) { padEnd.style.blockSize = ((view.length - to) * rowH) + 'px'; frag.appendChild(padEnd); }
      if (!view.length) frag.appendChild(empty);
      var keep = list.scrollTop;
      list.textContent = '';
      list.appendChild(frag);
      list.scrollTop = keep;
    }
    function selectedText() {
      var o = sel.options[sel.selectedIndex];
      return o ? o.text : '';
    }
    // a chosen option as a pill in its role, with its type's icon first when the option names one (data-gk-gui-icon,
    // the type's name in data-gk-gui-icon-label), "ny" when it is new, and the x that takes it away
    function pillOf(o, off, removed) {
      var name = o.text;
      return window.GkGui.pill({ text: name, role: o.dataset.gkGuiRole, typeIcon: o.dataset.gkGuiIcon || null, typeLabel: o.dataset.gkGuiIconLabel || null,
                      note: o.dataset.gkGuiNew ? t('ss_new') : null, removeLabel: t('ss_remove', { name: name }),
                      disabled: off, onRemove: function () { unchoose(o); removed(); } });
    }
    // the closed chooser: the chosen one (empty muted; with create a pill, empty the label), or the pills
    function paint() {
      var off = sel.disabled;
      wrap.classList.toggle('gk-gui-stuff-ss-disabled', off);
      entries.forEach(function (e) { if (e.li && e.o) e.li.setAttribute('aria-selected', e.o.selected ? 'true' : 'false'); });
      if (!multi) {
        box.tabIndex = off ? -1 : 0;
        box.setAttribute('aria-disabled', off ? 'true' : 'false');
        var o = sel.options[sel.selectedIndex];
        if (create) {
          value.textContent = '';
          if (o && o.value) value.appendChild(pillOf(o, off, show)); else value.textContent = label || '\u00a0';
        } else {
          value.textContent = selectedText() || '\u00a0';
        }
        value.classList.toggle('gk-gui-stuff-ss-placeholder', !o || !o.value);
        return;
      }
      input.disabled = off;
      chips.textContent = '';
      var n = 0;
      Array.prototype.forEach.call(sel.options, function (o) {
        if (!o.selected || !o.value) return;
        n++;
        chips.appendChild(pillOf(o, off, function () { input.focus(); if (open) { narrow(); place(); } }));
      });
      input.placeholder = n ? '' : ph;
    }
    function told() {
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      paint();
    }
    function choose(e) {
      if (e && e.create) {
        addNew(e.typed);
        build();
        told();
        input.value = '';
        if (multi) { narrow(); place(); } else close(true);
        return;
      }
      if (!e || !e.o || e.o.disabled) return;
      if (multi) {
        e.o.selected = !e.o.selected;
        told();
        var keep = e;
        input.value = '';
        narrow();
        var at = view.indexOf(keep);
        if (at >= 0) mark(at, true);
        place();
        return;
      }
      if (!e.o.selected) { sel.value = e.o.value; e.o.selected = true; told(); }
      close(true);
    }
    function mark(i, scroll) {
      if (active >= 0 && view[active] && view[active].li) view[active].li.classList.remove('gk-gui-stuff-ss-active');
      active = i;
      var e = view[i];
      if (!e) { input.removeAttribute('aria-activedescendant'); return; }
      if (scroll) inView(false);
      // a row not drawn (a long list scrolled elsewhere) is scrolled to, which draws it
      if (!e.li || !e.li.parentNode) { if (virt) inView(false); else draw(); }
      if (!e.li) return;
      e.li.classList.add('gk-gui-stuff-ss-active');
      input.setAttribute('aria-activedescendant', e.li.id);
    }
    // the marked row kept in view (its group's heading with it); centred when the panel opens
    function inView(centre) {
      if (active < 0) return;
      var from = view[active - 1] && view[active - 1].group ? active - 1 : active, t, b;
      if (virt) { t = from * rowH; b = (active + 1) * rowH; } else {
        var a = rowOf(view[active], active), f = rowOf(view[from], from);
        if (!a.parentNode) draw();
        t = f.offsetTop; b = a.offsetTop + a.offsetHeight;
      }
      var room = list.clientHeight, before = list.scrollTop;
      if (centre) list.scrollTop = Math.max(0, t - (room - (b - t)) / 2);
      else if (t < list.scrollTop) list.scrollTop = t;
      else if (b > list.scrollTop + room) list.scrollTop = b - room;
      if (virt && list.scrollTop !== before) draw();
    }
    function step(d, n) {
      var i = active, last = -1;
      if (i < 0) i = d > 0 ? -1 : view.length;
      while (n > 0) {
        i += d;
        if (i < 0 || i >= view.length) break;
        if ((view[i].o && !view[i].o.disabled) || view[i].create) { last = i; n--; }
      }
      if (last >= 0) mark(last, true);
    }
    function narrow() {
      ws = words(input.value);
      var key = ws.join(' '), changed = key !== qk, lastG = null;
      qk = key;
      view = [];
      entries.forEach(function (e) {
        if (e.group || (ws.length && !hit(e.text, ws))) return;
        if (e.grp && e.grp !== lastG) view.push(e.grp);
        lastG = e.grp;
        view.push(e);
      });
      // what was typed and is no choice exactly: Lägg till, or the quiet row for one who may not add
      var typed = (create || denied) ? bare(input.value) : '';
      if (typed && !exact(typed)) view.push(create ? { create: true, typed: typed, raw: prefix + newText(typed) } : { none: true, raw: prefix + typed });
      virt = view.length > VIRTUAL;
      if (changed) list.scrollTop = 0;
      // with nothing typed the chosen one is marked, else the first that can be chosen
      var at = -1, first = -1;
      view.forEach(function (e, i) {
        if (!e.o || e.o.disabled) return;
        if (first < 0) first = i;
        if (at < 0 && !ws.length && e.o.selected) at = i;
      });
      active = at >= 0 ? at : first;
      if (active < 0 && view.length && view[view.length - 1].create) active = view.length - 1;
      draw();
      mark(active, false);
    }
    // the open panel is fixed to the window, so that no box around the field hides it: under the field, or above
    // when there is more room there; at least as wide as the field, wider for long choices up to a limit
    function place() {
      if (!open) return;
      var r = box.getBoundingClientRect(), vh = window.innerHeight, vw = document.documentElement.clientWidth, gap = 2, edge = 4;
      var bw = Math.ceil(r.width);
      drop.style.maxBlockSize = '';
      drop.style.minInlineSize = bw + 'px';
      drop.style.maxInlineSize = 'max(' + bw + 'px, min(40em, ' + (vw - 2 * edge) + 'px))';
      drop.style.inlineSize = virt ? 'max(' + bw + 'px, min(28em, ' + (vw - 2 * edge) + 'px))' : '';
      var h = drop.offsetHeight, w = drop.offsetWidth, below = vh - r.bottom - gap - edge, above = r.top - gap - edge;
      var up = h > below && above > below;
      var room = Math.max(up ? above : below, 0);
      if (h > room) { drop.style.maxBlockSize = room + 'px'; h = room; }
      drop.style.top = (up ? r.top - gap - h : r.bottom + gap) + 'px';
      var left = document.dir === 'rtl' || window.getComputedStyle(wrap).direction === 'rtl' ? r.right - w : r.left;
      drop.style.left = Math.max(edge, Math.min(left, vw - edge - w)) + 'px';
      wrap.classList.toggle('gk-gui-stuff-ss-up', up);
      if (virt) draw();
    }
    // the page or a box around the field scrolled (not the panel itself); a press outside the chooser closes it
    function moved(e) { if (!drop.contains(e.target)) place(); }
    function outside(e) { if (!wrap.contains(e.target)) close(false); }
    function follow(on) {
      var m = on ? 'addEventListener' : 'removeEventListener';
      window[m]('scroll', moved, { capture: true, passive: true });
      window[m]('resize', place);
      document[m]('mousedown', outside, true);
    }
    function expanded(v) {
      input.setAttribute('aria-expanded', v ? 'true' : 'false');
      if (!multi) box.setAttribute('aria-expanded', v ? 'true' : 'false');
    }
    function show() {
      if (open || sel.disabled) return;
      open = true;
      clearTimeout(hideTimer);
      if (dirty) build();
      if (!multi) find.value = '';
      qk = null;
      drop.classList.remove('gk-gui-stuff-ss-in');
      drop.hidden = false;
      wrap.classList.add('gk-gui-stuff-ss-open');
      expanded(true);
      narrow();
      place();
      inView(true);
      follow(true);
      if (!multi) find.focus({ preventScroll: true });
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () { if (open) drop.classList.add('gk-gui-stuff-ss-in'); });
    }
    function close(refocus) {
      if (!open) return;
      open = false;
      follow(false);
      cancelAnimationFrame(frame);
      drop.classList.remove('gk-gui-stuff-ss-in');
      wrap.classList.remove('gk-gui-stuff-ss-open');
      expanded(false);
      input.removeAttribute('aria-activedescendant');
      if (multi) input.value = '';
      // hidden after the fade, never at once: a Tab that closes the panel still moves on from where it was
      hideTimer = setTimeout(function () { if (!open) drop.hidden = true; }, 120);
      if (refocus) focusEl.focus({ preventScroll: true });
      paint();
    }
    // the mouse in the panel: the row under it is marked, a click chooses; the search field keeps the focus
    drop.addEventListener('mousedown', function (e) { if (e.target !== find) e.preventDefault(); });
    list.addEventListener('mousemove', function (e) {
      var li = e.target.closest && e.target.closest('li.gk-gui-stuff-ss-option');
      if (li && li._gkEntry && li._gkAt !== active && (li._gkEntry.create || !li._gkEntry.o.disabled)) mark(li._gkAt, false);
    });
    list.addEventListener('click', function (e) {
      var li = e.target.closest && e.target.closest('li.gk-gui-stuff-ss-option');
      if (li && li._gkEntry) choose(li._gkEntry);
    });
    list.addEventListener('scroll', function () {
      if (!virt || !open) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    }, { passive: true });
    if (!multi) {
      box.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        if (open) close(true); else { box.focus({ preventScroll: true }); show(); }
      });
      box.addEventListener('keydown', function (e) {
        if (open || sel.disabled) return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); show(); return; }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          show();
          find.value = e.key;
          narrow();
          place();
        }
      });
    } else {
      input.addEventListener('mousedown', function () { if (!open) setTimeout(show, 0); });
      box.addEventListener('mousedown', function (e) {
        if (e.button !== 0 || e.target === input) return;
        e.preventDefault();
        input.focus();
        show();
      });
    }
    focusEl.addEventListener('focus', function () { if (!open) paint(); });
    input.addEventListener('input', function () {
      if (multi && (create || denied) && /[\s,;]/.test(input.value)) finish();
      if (!open) show();
      narrow();
      place();
    });
    // several with create: a space, a comma or a semicolon finishes each name before it, a choice or a new one; a
    // name nobody may add stays typed
    function finish() {
      var parts = input.value.split(/[\s,;]+/), rest = parts.pop(), kept = [], any = false;
      if (dirty) build();
      parts.forEach(function (p) {
        var t = bare(p), e = t && exact(t);
        if (!t) return;
        if (e) { if (!e.o.selected && !e.o.disabled) { e.o.selected = true; any = true; } } else if (create) { addNew(t); build(); any = true; } else kept.push(p);
      });
      // every refused name stays, with the separator after it, and what is being typed last
      input.value = kept.length ? kept.join(' ') + ' ' + rest : rest;
      if (any) told();
    }
    wrap.addEventListener('focusout', function () {
      setTimeout(function () { if (open && !wrap.contains(document.activeElement)) close(false); }, 0);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!open) { show(); return; }
        step(e.key === 'ArrowDown' ? 1 : -1, 1);
      } else if (e.key === 'PageDown' || e.key === 'PageUp') {
        if (!open) return;
        e.preventDefault();
        step(e.key === 'PageDown' ? 1 : -1, 10);
      } else if (e.key === 'Enter') {
        // Enter chooses; it never sends the form while the panel is open
        if (!open) return;
        e.preventDefault();
        choose(view[active]);
      } else if (e.key === 'Escape') {
        if (!open) return;
        e.preventDefault();
        e.stopPropagation();
        close(true);
      } else if (e.key === 'Tab') {
        close(false);
      } else if (e.key === 'Backspace' && multi && !input.value) {
        var chosen = Array.prototype.filter.call(sel.options, function (o) { return o.selected && o.value; });
        if (chosen.length) { unchoose(chosen[chosen.length - 1]); if (open) { narrow(); place(); } }
      }
    });
    // the select changed by someone else (a script, a reset of the form): the chooser follows
    function changed() { if (!open) paint(); }
    function reset() { setTimeout(paint, 0); }
    sel.addEventListener('change', changed);
    var form = sel.form;
    if (form) form.addEventListener('reset', reset);
    var mo = new MutationObserver(function () { if (open) { build(); narrow(); place(); } else { dirty = true; } paint(); });
    mo.observe(sel, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'label'] });
    paint();
    // the handle: open and close it from a script; destroy gives the list back as it was; el is the chooser drawn
    var handle = {
      el: wrap,
      open: function () { if (!open) { focusEl.focus({ preventScroll: true }); show(); } },
      close: function () { close(false); },
      destroy: function () {
        close(false);
        mo.disconnect();
        sel.removeEventListener('focus', toChooser);
        sel.removeEventListener('change', changed);
        if (form) form.removeEventListener('reset', reset);
        wrap.remove();
        sel.classList.remove('gk-gui-stuff-ss-native');
        sel.removeAttribute('aria-hidden');
        delete sel.dataset.gkGuiSs;
        delete sel.dataset.gkLooksSkip;
        if (oldTab === null) sel.removeAttribute('tabindex'); else sel.setAttribute('tabindex', oldTab);
        sel._gkGuiSs = null;
      }
    };
    sel._gkGuiSs = handle;
    if (opts && opts.open) handle.open();
    return handle;
  }
  // the fields that ask for the chooser get it from gk_gui_stuff_select_pass.js, loaded right after this file, which
  // adds pass; skip is here, since gk_gui_stuff_lists.js reads it when it is loaded
  var SKIP = '#query_form, #filters, .filters, .query-columns, table.query-columns, .contextual, .jstElements, [data-gk-gui-select="off"]';
  G.selectSearch = { enhance: enhance, skip: SKIP, find: { norm: norm, words: words, hit: hit, textOf: textOf, searchIcon: searchIcon } };
})();
