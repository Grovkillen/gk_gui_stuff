// gk_gui_stuff: the library (gk_gui_stuff_library, library.rb). The search and the chips filter the items, Rutnät or
// Lista by the view segment (Lista is core's table.list with headings, the open item's row core's selected row), the
// panel of the item chosen beside the grid, under the grid over the whole width for a wide item, and under the row of
// the item chosen under 899 px. Arrow keys move between the items, Enter opens, Esc closes and gives the focus back to
// the item; the item open stands in the address (its anchor) and an address or a link to an item opens it. The code
// field selects all of it on focus, and its copy button copies it: "Kopierat" stands by the button for a moment and a
// screen reader hears "Kopierat: <what>".
//
// Two modes. Drawn on the server (data-gk-gui-lib-mode="page"): every item and panel is in the page, and the script
// shows and hides them; the small pictures and the large one that are copies of a part of the item's body are made
// when the page has loaded: still, without ids, out of reach, the large one with the flags the real part has on the
// copy's own places and the small ones with none. As data (data-gk-gui-lib-mode="data"), which copies nothing: the script draws
// the items from the list (data-gk-gui-lib-items in the page, the address data-gk-gui-lib-source, or the caller's
// own), with core's page numbers and Per sida, the sort, the chip rows, the selection over every page and reload().
// window.GkGuiLibrary.bind(root, opts) gives a library its caller's own parts (also GkGui.library); opts, every one
// optional, each item being the caller's own object:
//   load()            a promise of the list (else items, the list in the page or the address)
//   items             the list, or a function giving it
//   key, name, anchor, words, group (item) the item's key, name, id (and address), search words and group key
//   tile(item)        the words under the small picture in the grid (else the name; the name is still what a screen
//                     reader hears, and what the panel, Lista and the box to check say)
//   title(item)       the item's tooltip in the grid
//   thumb(item)       the small picture (a node), drawn plain without a frame (an icon)
//   decorate(item, node, lib) more on an item's node in the grid (a mark with words, a class)
//   facts(item)       in the panel's head: texts, a short legend after the name, or { text, role, kind, short }, flags on
//                     the name for what says something about the item itself, as
//                     GkGui.flag.put takes them; a node stands beside the name
//   panel(item, box, lib) the panel's content under its head (else the item's codes, item.code [{label, code}])
//   search(items, q, lib) the items that match q in their order (a ranked search); else every word in the words
//   sort(items, key)  the items in the order of the key chosen in Sortera (else name_asc and name_desc by name)
//   rows(items, lib)  the chip rows: [{ key, label, chips: [{ value, label, count, disabled, reason, dashed }],
//                     filter(item, value) }]; '' is the value of Alla; a chip that cannot be chosen says its reason
//   cell(item, column, lib) a cell of Lista for a column of the caller's own (a node or text)
//   check             true, or a function: the items have a box to check while it answers true
//   onSelect(keys, lib) after the checked items changed; onPick(item, node, lib) a click on an item does this too
//   (copies), and the panel opens; focusSearch: the search field gets the focus when the list has come
// The library given back: reload(keepPage), open(key), close(), item(key), items(), hits(), selected(), select(keys,
// on), selectHits(), clearSelection(), checking(on), refresh(), say(text), copy(text, what, at), code(label, code).
(function () {
  if (window.GkGuiLibrary) return;
  var NARROW = '(max-width: 899px)';
  var LAQUO = String.fromCharCode(171), RAQUO = String.fromCharCode(187), HELLIP = String.fromCharCode(8230);
  function narrow() { return window.matchMedia && window.matchMedia(NARROW).matches; }
  function libs() { return document.querySelectorAll('[data-gk-gui-lib]'); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function part(root, k) { return root.querySelector('[data-gk-gui-lib-' + k + ']'); }
  function json(s, d) { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } }
  function store(k, v) {
    try {
      if (v === undefined) return window.localStorage.getItem('gkguistuff.' + k);
      window.localStorage.setItem('gkguistuff.' + k, v);
    } catch (e) { /* no memory in this browser: the defaults hold */ }
    return null;
  }
  function fmt(s, vars) { s = s || ''; Object.keys(vars || {}).forEach(function (k) { s = s.split('%{' + k + '}').join(vars[k]); }); return s; }

  // ---- the live region: a screen reader hears what was copied, a chip's reason, a failed list. Put into the page
  // empty, the text a frame later, since many screen readers do not read a region that comes with its text
  var region = null;
  function announce(text, at) {
    var r = (at && at.closest && at.closest('[data-gk-gui-lib]') && part(at.closest('[data-gk-gui-lib]'), 'said')) || region;
    if (!r) {
      region = el('span', 'gk-gui-stuff-sr-only'); region.setAttribute('role', 'status'); region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region); r = region;
    }
    r.textContent = '';
    (window.requestAnimationFrame || setTimeout)(function () { r.textContent = text; });
  }

  // ---- copying: the text to the clipboard; "Kopierat" stands by the button (or in the item's corner) for a moment,
  // and a screen reader hears said ("Kopierat: kod"); nothing is said when nothing was copied
  function copy(text, said, short, at) {
    function ok() {
      if (at) {
        var near = at.matches && at.matches('.gk-gui-stuff-lib-copy') ? at.parentElement : at;
        var old = near.querySelector(':scope > .gk-gui-stuff-lib-copied'); if (old) old.remove();
        var n = el('span', 'gk-gui-stuff-lib-copied' + (near === at ? ' gk-gui-stuff-lib-copied-over' : ''), short || 'OK');
        n.setAttribute('aria-hidden', 'true');
        near.appendChild(n);
        setTimeout(function () { n.remove(); }, 1600);
      }
      announce(said || short || '', at);
    }
    function old() {
      var ta = el('textarea'); ta.value = text; ta.className = 'gk-gui-stuff-offscreen'; ta.setAttribute('aria-hidden', 'true');
      ta.style.position = 'fixed'; ta.style.insetBlockStart = '-1000px';
      document.body.appendChild(ta); ta.select();
      try { if (own(function () { return document.execCommand('copy'); })) ok(); } catch (e) { /* nothing copied, nothing said */ }
      ta.remove();
    }
    // a copy this library says itself, which core_copy_whisper leaves alone
    function own(fn) { return window.GkGui && window.GkGui.ownCopy ? window.GkGui.ownCopy(fn) : fn(); }
    if (navigator.clipboard && window.isSecureContext) own(function () { navigator.clipboard.writeText(text).then(ok, old); }); else old();
  }
  function codeOf(btn) {
    var p = btn.parentElement;
    var f = p && p.querySelector('[data-gk-gui-lib-code-field]');
    if (f) return f.value;
    var c = p && p.querySelector('code');
    return c ? c.textContent : null;
  }

  // ---- the still copies: the part the selector names, copied without ids, names and links to other elements, and
  // without scripts, frames and forms, so that nothing in it can be reached, sent or found as the real one. A flag's
  // word for a screen reader, which stands in its target, goes too: the copy is hidden from one and may have no flags
  var DROP = ['id', 'name', 'for', 'form', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'tabindex', 'autofocus', 'data-gk-gui-view-segment'];
  function still(src) {
    var c = src.cloneNode(true);
    c.querySelectorAll('script, template, iframe, noscript, [data-gk-gui-flag-said="1"]').forEach(function (n) { n.remove(); });
    [c].concat(Array.prototype.slice.call(c.querySelectorAll('*'))).forEach(function (n) {
      DROP.forEach(function (a) { n.removeAttribute(a); });
    });
    c.querySelectorAll('form').forEach(function (f) {
      var d = document.createElement('div');
      d.className = f.className;
      while (f.firstChild) d.appendChild(f.firstChild);
      f.replaceWith(d);
    });
    return c;
  }
  function fill(st) {
    if (st.mode !== 'page') return;
    st.all.forEach(function (e) {
      var body = e.body, thumb = e.el.querySelector('[data-gk-gui-lib-thumb-from]');
      var previews = body ? body.querySelectorAll('[data-gk-gui-lib-from]') : [];
      // every source found before any copy is put in, so that a copy is never the source of another
      var src = function (sel) { try { return body && sel ? body.querySelector(sel) : null; } catch (x) { return null; } };
      var plan = [];
      if (thumb && !thumb._gkGuiFilled) plan.push([thumb.firstElementChild || thumb, src(thumb.getAttribute('data-gk-gui-lib-thumb-from')), thumb, false]);
      previews.forEach(function (p) { if (!p._gkGuiFilled) plan.push([p, src(p.getAttribute('data-gk-gui-lib-from')), p, true]); });
      plan.forEach(function (x) {
        if (!x[1]) return;
        // the large picture shows the flags the real one has, on the copy's own places (the small pictures, drawn
        // smaller, show none): each flagged place marked for the copy by a data attribute of its own, then unmarked
        var flagged = x[3] && window.GkGui && window.GkGui.flag && window.GkGui.flag.copy ?
          [x[1]].concat(Array.prototype.slice.call(x[1].querySelectorAll('*'))).filter(function (n) { return n._gkGuiFlags && n._gkGuiFlags.length; }) : [];
        flagged.forEach(function (n, i) { n.setAttribute('data-gk-gui-lib-flag-ref', String(i)); });
        var c = still(x[1]);
        flagged.forEach(function (n) { n.removeAttribute('data-gk-gui-lib-flag-ref'); });
        x[0].appendChild(c);
        [c].concat(Array.prototype.slice.call(c.querySelectorAll('[data-gk-gui-lib-flag-ref]'))).forEach(function (n) {
          var i = n.getAttribute('data-gk-gui-lib-flag-ref');
          if (i == null) return;
          n.removeAttribute('data-gk-gui-lib-flag-ref');
          window.GkGui.flag.copy(flagged[+i], n);
        });
        x[2]._gkGuiFilled = true;
        x[2].setAttribute('inert', '');
        x[2].setAttribute('aria-hidden', 'true');
      });
    });
  }

  // ---- one library's state
  function stateOf(root) { return root && root._gkGuiLib; }
  function words(st, k, d) { return (st.texts && st.texts[k]) || d; }
  function raw(st, e) { return st.mode === 'page' ? e : e.raw; }
  function entryOf(st, item) { return st.mode === 'page' ? item : st.byRaw.get(item); }

  // the entries drawn on the server, read from the page
  function readPage(st) {
    st.all = Array.prototype.map.call(st.root.querySelectorAll('[data-gk-gui-lib-item]'), function (n) {
      var key = n.getAttribute('data-gk-gui-lib-item');
      return { key: key, name: n.getAttribute('data-gk-gui-lib-name') || key, anchor: n.id, words: n.getAttribute('data-gk-gui-lib-words') || '',
               group: n.getAttribute('data-gk-gui-lib-group') || '', wide: n.hasAttribute('data-gk-gui-lib-wide'),
               facts: n.getAttribute('data-gk-gui-lib-facts') || '', el: n,
               body: st.root.querySelector('[data-gk-gui-lib-body="' + CSS.escape(key) + '"]') };
    });
    st.byKey = {};
    st.all.forEach(function (e) { st.byKey[e.key] = e; });
  }
  // the entries of a list as data, each its item's key, name, anchor and words through the caller's functions
  function readData(st, list) {
    var o = st.opts;
    function f(name, item, d) { return typeof o[name] === 'function' ? o[name](item) : d; }
    st.byRaw = new Map();
    st.byKey = {};
    st.all = (list || []).map(function (item) {
      var key = String(f('key', item, item.key));
      var name = String(f('name', item, item.name != null ? item.name : key));
      var e = { key: key, name: name, anchor: String(f('anchor', item, item.anchor || 'lib-' + key)), group: String(f('group', item, item.group || '')),
                words: String(f('words', item, [name, item.words || ''].join(' '))).toLowerCase(), wide: !!item.wide, raw: item };
      st.byRaw.set(item, e);
      st.byKey[key] = e;
      return e;
    });
    // checked items that are gone are no longer checked
    Object.keys(st.selected).forEach(function (k) { if (!st.byKey[k]) delete st.selected[k]; });
  }

  // ---- the chip rows. Drawn on the server: one row of groups. As data: the caller's rows (or one of item.group with
  // opts.groups), drawn here as GK GUI Stuff's choice pills: filled in their role when chosen, no check, the count a
  // part of the pill (GkGui.pill, as gk_gui_stuff_library_chip draws one with gk_gui_stuff_pill); a chip that cannot be
  // chosen is greyed, keeps its focus and says its reason
  function chipNode(st, c, on) {
    var data = { 'gk-gui-lib-chip': c.value == null ? '' : String(c.value) };
    if (c.disabled && c.reason) data['gk-gui-lib-reason'] = c.reason;
    return window.GkGui.pill({ text: c.label, count: c.count, choice: true, pressed: !!on, check: false, dashed: !!c.dashed, className: 'gk-gui-stuff-lib-chip',
                               disabled: !!c.disabled, reason: c.reason || '', reasonLabel: words(st, 'chip_off', ''), button: { data: data } });
  }
  function rowsOf(st) {
    var o = st.opts;
    if (typeof o.rows === 'function') return o.rows(st.all.map(function (e) { return e.raw; }), st.api) || [];
    if (o.groups) {
      var n = {};
      st.all.forEach(function (e) { n[e.group] = (n[e.group] || 0) + 1; });
      var chips = [{ value: '', label: words(st, 'all', 'All'), count: st.all.length }].concat(o.groups.filter(function (g) { return n[g.key]; }).map(function (g) {
        return { value: g.key, label: g.title, count: n[g.key] };
      }));
      return [{ key: 'group', label: o.groupsLabel || '', chips: chips, filter: function (item, v) { return !v || entryOf(st, item).group === v; } }];
    }
    return [];
  }
  function paintRows(st) {
    if (st.mode === 'page') {
      st.rows = [{ key: 'group', filter: function (e, v) { return !v || e.group === v; } }];
      st.groupNames = {};
      st.root.querySelectorAll('[data-gk-gui-lib-chip]').forEach(function (b) {
        var t = b.querySelector('.gk-gui-stuff-pill-text');
        st.groupNames[b.getAttribute('data-gk-gui-lib-chip')] = t ? t.textContent : b.textContent;
      });
      return;
    }
    var box = part(st.root, 'rows');
    st.rows = rowsOf(st);
    st.groupNames = {};
    if (!box) return;
    box.textContent = '';
    st.rows.forEach(function (row) {
      var open = row.chips.filter(function (c) { return !c.disabled; }).map(function (c) { return c.value == null ? '' : String(c.value); });
      // a value that can no longer be chosen gives way to Alla
      if (st.filters[row.key] && open.indexOf(st.filters[row.key]) < 0) st.filters[row.key] = '';
      var r = el('div', 'gk-gui-stuff-lib-chips'); r.setAttribute('role', 'group');
      if (row.label) r.setAttribute('aria-label', row.label);
      r.setAttribute('data-gk-gui-lib-row', row.key);
      row.chips.forEach(function (c) {
        var v = c.value == null ? '' : String(c.value);
        if (row.key === 'group') st.groupNames[v] = c.label;
        r.appendChild(chipNode(st, c, (st.filters[row.key] || '') === v));
        r.appendChild(document.createTextNode(' '));
      });
      box.appendChild(r);
    });
  }
  function pick(st, btn) {
    if (btn.getAttribute('aria-disabled') === 'true') {
      var why = btn.getAttribute('data-gk-gui-lib-reason');
      if (why) announce(why, btn);
      return;
    }
    var row = btn.closest('[data-gk-gui-lib-row]'), key = row ? row.getAttribute('data-gk-gui-lib-row') : 'group';
    st.filters[key] = btn.getAttribute('data-gk-gui-lib-chip') || '';
    (row || st.root).querySelectorAll('[data-gk-gui-lib-chip]').forEach(function (b) {
      var on = b === btn, pl = b.closest('.gk-gui-stuff-pill');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (pl) pl.classList.toggle('gk-gui-stuff-pill-chosen', on);
    });
    run(st, false);
  }

  // ---- the hits: the sort, the chips, then the search (a ranked search keeps its own order)
  function sorted(st, list) {
    var key = st.sort;
    if (!key) return list;
    var items = list.map(function (e) { return raw(st, e); });
    var out = typeof st.opts.sort === 'function' ? st.opts.sort(items.slice(), key) : null;
    if (out) return out.map(function (i) { return entryOf(st, i); }).filter(Boolean);
    if (key !== 'name_asc' && key !== 'name_desc') return list;
    var s = list.slice().sort(function (a, b) { return a.name.localeCompare(b.name) || a.key.localeCompare(b.key); });
    return key === 'name_desc' ? s.reverse() : s;
  }
  function compute(st) {
    var list = sorted(st, st.all);
    st.rows.forEach(function (row) {
      var v = st.filters[row.key] || '';
      if (v && row.filter) list = list.filter(function (e) { return row.filter(raw(st, e), v); });
    });
    var input = part(st.root, 'search'), q = input ? input.value.trim() : '';
    if (q) {
      if (typeof st.opts.search === 'function' && st.mode === 'data') {
        list = (st.opts.search(list.map(function (e) { return e.raw; }), q, st.api) || []).map(function (i) { return entryOf(st, i); }).filter(Boolean);
      } else {
        var ws = q.toLowerCase().split(/\s+/).filter(Boolean);
        list = list.filter(function (e) { return ws.every(function (w) { return e.words.indexOf(w) >= 0; }); });
      }
    }
    st.hits = list;
  }
  function run(st, keepPage) {
    compute(st);
    if (keepPage !== true) st.page = 1;
    draw(st);
  }

  // ---- drawing: the page of hits as items in the grid or rows of core's table, the count, the page numbers
  function checking(st) { var c = st.opts.check; return st.mode === 'data' && (typeof c === 'function' ? !!c(st.api) : !!c); }
  function checkBox(st, e, holder) {
    var box = el('input'); box.type = 'checkbox'; box.checked = !!st.selected[e.key];
    box.setAttribute('data-gk-gui-lib-check', e.key);
    box.setAttribute('aria-label', fmt(words(st, 'check', '%{name}'), { name: e.name }));
    if (holder) { holder.appendChild(box); return holder; }
    return box;
  }
  function itemNode(st, e) {
    var o = st.opts, item = e.raw;
    var n = el('div', 'gk-gui-stuff-lib-item' + (e.wide ? ' gk-gui-stuff-lib-item-wide' : '') + (st.selected[e.key] ? ' gk-gui-stuff-lib-item-checked' : ''));
    n.setAttribute('role', 'listitem');
    n.id = e.anchor;
    n.setAttribute('data-gk-gui-lib-item', e.key);
    if (e.wide) n.setAttribute('data-gk-gui-lib-wide', '1');
    if (typeof o.title === 'function') n.title = o.title(item) || '';
    if (st.checkingNow) n.appendChild(checkBox(st, e, el('span', 'gk-gui-stuff-lib-check')));
    var th = el('div', 'gk-gui-stuff-lib-thumb gk-gui-stuff-lib-thumb-plain');
    th.setAttribute('aria-hidden', 'true');
    var pic = typeof o.thumb === 'function' ? o.thumb(item) : null;
    if (pic) th.appendChild(pic);
    n.appendChild(th);
    // the words under the picture: the caller's shorter ones (an icon's name without its pack), the whole name heard
    var shown = typeof o.tile === 'function' ? String(o.tile(item) || e.name) : e.name;
    var b = el('button', 'gk-gui-stuff-lib-item-name', shown); b.type = 'button';
    if (shown !== e.name) b.setAttribute('aria-label', e.name);
    b.setAttribute('data-gk-gui-lib-open', e.key);
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-controls', e.anchor + '-panel');
    n.appendChild(b);
    if (typeof o.decorate === 'function') o.decorate(item, n, st.api);
    return n;
  }
  function columns(st) { return json(st.root.getAttribute('data-gk-gui-lib-columns'), [{ key: 'name', label: '' }]); }
  function cellOf(st, e, col) {
    if (col.key === 'name') {
      var b = el('button', 'gk-gui-stuff-lib-row-open', e.name); b.type = 'button';
      b.setAttribute('data-gk-gui-lib-open', e.key);
      b.setAttribute('aria-expanded', 'false');
      b.setAttribute('aria-controls', e.anchor + '-panel');
      return b;
    }
    if (st.mode === 'data' && typeof st.opts.cell === 'function') {
      var c = st.opts.cell(e.raw, col.key, st.api);
      if (c != null) return c;
    }
    if (col.key === 'group') return st.groupNames[e.group] || e.group;
    if (col.key === 'facts') return e.facts || '';
    return '';
  }
  function table(st, slice) {
    var t = el('table', 'list gk-gui-stuff-lib-list'), head = el('tr'), body = el('tbody'), cols = columns(st);
    // a heading that stands empty (the boxes, a picture) still has a word for a screen reader
    function heading(cls, label, heard) {
      var h = el('th', cls, label || null); h.scope = 'col';
      if (!label && heard) h.appendChild(el('span', 'gk-gui-stuff-sr-only', heard));
      head.appendChild(h);
    }
    if (st.checkingNow) heading('checkbox', '', words(st, 'check_column', ''));
    cols.forEach(function (c) { heading(c.key, c.label, c.heard); });
    var th = el('thead'); th.appendChild(head); t.appendChild(th); t.appendChild(body);
    slice.forEach(function (e, i) {
      var tr = el('tr', i % 2 ? 'even' : 'odd');
      tr.setAttribute('data-gk-gui-lib-row-item', e.key);
      if (st.checkingNow) { var c0 = el('td', 'checkbox'); c0.appendChild(checkBox(st, e)); tr.appendChild(c0); }
      cols.forEach(function (c) {
        var td = el('td', c.key), v = cellOf(st, e, c);
        if (v && v.nodeType) td.appendChild(v); else td.textContent = v == null ? '' : String(v);
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    return t;
  }
  function draw(st) {
    var grid = part(st.root, 'grid'), tbox = part(st.root, 'table'), none = part(st.root, 'none');
    if (!grid) return;
    st.checkingNow = checking(st);
    st.root.classList.toggle('gk-gui-stuff-lib-checking', st.checkingNow);
    var n = st.hits.length, per = st.per || n || 1, last = Math.max(1, Math.ceil(n / per));
    st.page = Math.min(Math.max(1, st.page || 1), last);
    var from = (st.page - 1) * per, slice = st.per ? st.hits.slice(from, from + per) : st.hits;
    st.slice = slice;
    var list = st.view === 'list';
    if (st.mode === 'page') {
      var on = {};
      slice.forEach(function (e) { on[e.key] = 1; });
      st.all.forEach(function (e) { e.el.hidden = !on[e.key]; });
      if (st.sort) slice.forEach(function (e) { grid.appendChild(e.el); });
    } else {
      // the panel under a row on a narrow screen stands in the grid: back in the main box first, so that emptying the
      // grid never takes it away (place puts it under its row again)
      var panel = part(st.root, 'panel'), main = part(st.root, 'main');
      if (panel && main && panel.parentElement === grid) main.appendChild(panel);
      grid.textContent = '';
      slice.forEach(function (e) { grid.appendChild(itemNode(st, e)); });
      grid.removeAttribute('aria-busy');
      var count = part(st.root, 'count');
      if (count) count.textContent = '(' + n + ')';
    }
    grid.hidden = list || !n;
    if (tbox) { tbox.textContent = ''; tbox.hidden = !list || !n; if (list && n) tbox.appendChild(table(st, slice)); }
    if (none) {
      if (st.noneText == null) st.noneText = none.textContent;
      none.hidden = n > 0;
      none.textContent = st.failed ? words(st, 'load_failed', st.noneText) : st.noneText;
    }
    paginate(st, from, slice.length);
    // drawn on the server, the item open stays open while it is shown and one the chips or the search took away
    // closes; as data its panel stays, since it may have been opened from the panel of another item
    if (st.open && st.mode === 'page' && st.byKey[st.open] && st.byKey[st.open].el.hidden) close(st, false);
    mark(st);
    place(st);
  }
  // core's page numbers, as pagination_links_full draws them: ul.pages with previous, the pages near this one, the
  // first and the last, next; then (first-last/count) and Per sida with the choices up to the first that holds every hit
  function paginate(st, from, count) {
    var box = part(st.root, 'pages');
    if (!box) return;
    box.textContent = '';
    var n = st.hits.length;
    if (!n || !st.per) return;
    var per = st.per, last = Math.ceil(n / per), page = st.page, ul = el('ul', 'pages');
    function li(cls, text, to) {
      var l = el('li', cls);
      if (to) {
        var a = el('a', null, text); a.href = '#';
        a.setAttribute('data-gk-gui-lib-page', String(to));
        l.appendChild(a);
      } else {
        l.appendChild(el('span', null, text));
      }
      ul.appendChild(l);
    }
    if (last > 1) li(page > 1 ? 'previous page' : 'previous', LAQUO + ' ' + words(st, 'previous', 'Previous'), page > 1 ? page - 1 : 0);
    var linked = [1, page, last];
    for (var p = page - 2; p <= page + 2; p++) { if (p > 1 && p < last) linked.push(p); }
    linked = linked.filter(function (x, k) { return linked.indexOf(x) === k; }).sort(function (x, y) { return x - y; });
    if (linked.length > 1) {
      var prev = null;
      linked.forEach(function (x) {
        if (prev && prev !== x - 1) li('spacer', HELLIP);
        if (x === page) li('current', String(x)); else li('page', String(x), x);
        prev = x;
      });
    }
    if (last > 1) li(page < last ? 'next page' : 'next', words(st, 'next', 'Next') + ' ' + RAQUO, page < last ? page + 1 : 0);
    box.appendChild(ul);
    var info = el('span');
    info.appendChild(el('span', 'items', '(' + (from + 1) + '-' + (from + count) + '/' + n + ')'));
    var opts = st.perOpts, max = n > opts[0] ? (opts.filter(function (v) { return v >= n; })[0] || n) : n;
    opts = opts.filter(function (v) { return v <= max || v === per; });
    if (opts.length && !(opts.length === 1 && opts[0] === per)) {
      info.appendChild(document.createTextNode(' '));
      var pp = el('span', 'per-page'), w = words(st, 'per_page', 'Per page: %{value}').split('%{value}');
      pp.appendChild(document.createTextNode(w[0]));
      opts.forEach(function (v, k) {
        if (k) pp.appendChild(document.createTextNode(', '));
        if (v === per) { pp.appendChild(el('span', 'selected', String(v))); return; }
        var a = el('a', null, String(v)); a.href = '#';
        a.setAttribute('data-gk-gui-lib-per', String(v));
        pp.appendChild(a);
      });
      pp.appendChild(document.createTextNode(w[1] || ''));
      info.appendChild(pp);
    }
    box.appendChild(info);
  }

  // ---- Rutnät or Lista: the view segment (it remembers the choice itself)
  function setView(st, v) {
    st.view = v === 'list' ? 'list' : 'grid';
    st.root.classList.toggle('gk-gui-stuff-lib-as-list', st.view === 'list');
    draw(st);
  }

  // ---- the panel: beside the grid; under the grid over the whole width for a wide item and in Lista on a narrow
  // screen; under 899 px in the grid under the row of the item chosen (after the last item shown on its row)
  function shownItems(st) {
    var grid = part(st.root, 'grid');
    return grid ? Array.prototype.filter.call(grid.querySelectorAll('[data-gk-gui-lib-item]'), function (i) { return !i.hidden; }) : [];
  }
  function rowEnd(st, item) {
    var top = item.offsetTop, last = item;
    shownItems(st).forEach(function (i) { if (i.offsetTop === top) last = i; });
    return last;
  }
  function itemNodeOf(st, key) {
    var grid = part(st.root, 'grid');
    return grid ? grid.querySelector('[data-gk-gui-lib-item="' + CSS.escape(key) + '"]') : null;
  }
  function place(st) {
    var key = st.open, panel = part(st.root, 'panel'), main = part(st.root, 'main');
    if (!panel || !main) return;
    panel.classList.remove('gk-gui-stuff-lib-panel-in-grid');
    if (!key) {
      main.classList.remove('gk-gui-stuff-lib-with-panel', 'gk-gui-stuff-lib-panel-under');
      panel.classList.remove('gk-gui-stuff-lib-panel-wide');
      if (panel.parentElement !== main) main.appendChild(panel);
      return;
    }
    var e = st.byKey[key], item = itemNodeOf(st, key), wide = e && e.wide;
    // a wide item's large picture lays its example out over the whole canvas, wherever the panel stands
    panel.classList.toggle('gk-gui-stuff-lib-panel-wide', !!wide);
    // first back in the main box, so that the row is measured without the panel in the grid
    if (panel.parentElement !== main) main.appendChild(panel);
    if (narrow()) {
      main.classList.remove('gk-gui-stuff-lib-with-panel');
      if (st.view !== 'list' && item && !item.hidden) {
        main.classList.remove('gk-gui-stuff-lib-panel-under');
        rowEnd(st, item).insertAdjacentElement('afterend', panel);
        panel.classList.add('gk-gui-stuff-lib-panel-in-grid');
      } else {
        main.classList.add('gk-gui-stuff-lib-panel-under');
      }
      return;
    }
    main.classList.toggle('gk-gui-stuff-lib-with-panel', !wide);
    main.classList.toggle('gk-gui-stuff-lib-panel-under', !!wide);
    headOrder(panel, !wide);
  }
  // The Tab order follows the eye in the panel's head: the caller's choices stand as the last row in a panel beside the
  // grid, after the close button, and before it in the head's own row in a panel under the grid. Only moved when they
  // stand wrong, and the focus stays where it was
  function headOrder(panel, beside) {
    panel.querySelectorAll('[data-gk-gui-lib-head-tools]').forEach(function (t) {
      var x = t.parentElement && t.parentElement.querySelector(':scope > [data-gk-gui-lib-close]');
      if (!x) return;
      var after = !!(x.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (after === beside) return;
      var had = t.contains(document.activeElement) ? document.activeElement : null;
      if (beside) x.insertAdjacentElement('afterend', t); else x.insertAdjacentElement('beforebegin', t);
      if (had) had.focus({ preventScroll: true });
    });
  }
  // the item open marked in the grid and its row in Lista as core's selected row; a checked item marked too
  function mark(st) {
    st.root.querySelectorAll('[data-gk-gui-lib-item]').forEach(function (i) {
      var k = i.getAttribute('data-gk-gui-lib-item'), on = k === st.open, b = i.querySelector('[data-gk-gui-lib-open]');
      i.classList.toggle('gk-gui-stuff-lib-item-open', on);
      i.classList.toggle('gk-gui-stuff-lib-item-checked', !!st.selected[k]);
      if (b) b.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
    st.root.querySelectorAll('[data-gk-gui-lib-row-item]').forEach(function (tr) {
      var on = tr.getAttribute('data-gk-gui-lib-row-item') === st.open, b = tr.querySelector('[data-gk-gui-lib-open]');
      tr.classList.toggle('context-menu-selection', on);
      if (b) b.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
  }
  function hash(v) {
    try { window.history.replaceState(null, '', v ? '#' + v : window.location.pathname + window.location.search); } catch (e) { /* the address stays */ }
  }
  function tpl(st, name) {
    var t = st.root.querySelector('template[data-gk-gui-lib-tpl="' + name + '"]');
    return t && t.content.firstElementChild ? t.content.firstElementChild.cloneNode(true) : null;
  }
  // a code to read and copy, as gk_gui_stuff_library_code draws it: a field that selects all on focus with the copy
  // button beside it, a code block for a code longer than one line
  var fieldN = 0;
  function codeNode(st, label, code) {
    var box = el('div', 'gk-gui-stuff-lib-code'), body = el('div', 'gk-gui-stuff-lib-code-body');
    var btn = tpl(st, 'copy') || el('button', 'gk-gui-stuff-lib-copy', words(st, 'code', 'Copy'));
    btn.type = 'button';
    var what = fmt(words(st, 'copy', '%{what}'), { what: label });
    btn.title = what; btn.setAttribute('aria-label', what);
    btn.setAttribute('data-gk-gui-lib-copy', fmt(words(st, 'copied', '%{what}'), { what: label }));
    btn.setAttribute('data-gk-gui-lib-copied', words(st, 'copied_short', ''));
    if (String(code).indexOf('\n') >= 0) {
      box.appendChild(el('span', 'gk-gui-stuff-lib-code-label', label));
      var pre = el('pre', 'gk-gui-stuff-lib-code-block'); pre.appendChild(el('code', null, String(code)));
      body.appendChild(pre);
    } else {
      var id = 'gk-gui-stuff-lib-field-' + (++fieldN), lb = el('label', 'gk-gui-stuff-lib-code-label', label); lb.htmlFor = id;
      var f = el('input', 'gk-gui-stuff-lib-code-field'); f.type = 'text'; f.readOnly = true; f.value = String(code); f.id = id;
      f.spellcheck = false; f.setAttribute('data-gk-gui-lib-code-field', '1');
      box.appendChild(lb); body.appendChild(f);
    }
    body.appendChild(btn);
    box.appendChild(body);
    return box;
  }
  function drawPanel(st, e) {
    var panel = part(st.root, 'panel'), o = st.opts, item = e.raw;
    panel.textContent = '';
    var body = el('div', 'gk-gui-stuff-lib-body');
    body.id = e.anchor + '-panel';
    body.setAttribute('role', 'region');
    body.setAttribute('aria-label', e.name);
    body.setAttribute('data-gk-gui-lib-body', e.key);
    var head = el('div', 'gk-gui-stuff-lib-panel-head'), title = el('div', 'gk-gui-stuff-lib-panel-title'), h = el('h3', 'gk-gui-stuff-lib-name'), nm = el('span', null, e.name);
    h.tabIndex = -1;
    nm.id = e.anchor + '-name';
    h.appendChild(nm);
    title.appendChild(h);
    head.appendChild(title);
    // the facts: a text is a fact about the item, part of a short legend after the name (the flag's own elements, with
    // their words); { text, role, kind, short } says something about the item itself and is the flag on the name, on
    // top (GkGui.flag.put), with the room it needs above the name; a node stands beside the name
    var facts = typeof o.facts === 'function' ? o.facts(item) : item.facts;
    var legend = [];
    (facts || []).forEach(function (f) {
      if (f && f.nodeType) head.appendChild(f);
      else if (f != null && f !== '' && window.GkGui && window.GkGui.flag) {
        if (typeof f === 'object') { window.GkGui.flag.put(nm, f.text, f); head.classList.add('gk-gui-stuff-lib-panel-head-flagged'); }
        else legend.push({ text: String(f) });
      }
    });
    if (legend.length) title.appendChild(window.GkGui.flag.legend(legend, { area: '#' + body.id }));
    var x = tpl(st, 'close') || el('button', 'gk-gui-stuff-lib-close', words(st, 'close', 'Close'));
    x.type = 'button'; x.setAttribute('data-gk-gui-lib-close', '1');
    head.appendChild(x);
    body.appendChild(head);
    var box = el('div', 'gk-gui-stuff-lib-panel-content');
    if (typeof o.panel === 'function') o.panel(item, box, st.api);
    else (item.code || []).forEach(function (c) { box.appendChild(codeNode(st, c.label, c.code)); });
    body.appendChild(box);
    panel.appendChild(body);
  }
  function open(st, key, opts) {
    var e = st.byKey[key], panel = part(st.root, 'panel');
    if (!e || !panel) return;
    opts = opts || {};
    if (st.mode === 'page') {
      if (e.el.hidden) {
        // a link to an item the chips or the search hide: Alla and an empty search first
        var input = part(st.root, 'search'), all = st.root.querySelector('[data-gk-gui-lib-chip=""]');
        if (input) input.value = '';
        if (all) pick(st, all); else run(st, false);
      }
      st.root.querySelectorAll('[data-gk-gui-lib-body]').forEach(function (b) { b.hidden = b !== e.body; });
    } else {
      // an item on another page of the list: that page first (an anchor, a link of the panel), but stay: the page
      // stays as it is and only the panel is drawn again (a reload, while the item open may be on another page)
      var at = st.hits.indexOf(e);
      if (!opts.stay && st.per && at >= 0 && Math.floor(at / st.per) + 1 !== st.page) { st.page = Math.floor(at / st.per) + 1; st.open = key; draw(st); }
      drawPanel(st, e);
    }
    st.open = key;
    panel.hidden = false;
    mark(st);
    place(st);
    if (opts.hash !== false) hash(e.anchor);
    if (opts.focus) { var h = panel.querySelector('.gk-gui-stuff-lib-name'); if (h) h.focus({ preventScroll: true }); }
    if (opts.scroll !== false) panel.scrollIntoView({ block: 'nearest' });
  }
  function close(st, refocus) {
    var key = st.open, panel = part(st.root, 'panel');
    if (!key) return;
    st.open = null;
    if (panel) {
      panel.hidden = true;
      if (st.mode === 'page') panel.querySelectorAll('[data-gk-gui-lib-body]').forEach(function (b) { b.hidden = true; });
      else panel.textContent = '';
    }
    mark(st);
    place(st);
    hash(null);
    if (refocus) {
      var b = st.root.querySelector('[data-gk-gui-lib-item="' + CSS.escape(key) + '"] [data-gk-gui-lib-open], [data-gk-gui-lib-row-item="' + CSS.escape(key) + '"] [data-gk-gui-lib-open]');
      var s = part(st.root, 'search');
      if (b && b.offsetParent) b.focus(); else if (s) s.focus();
    }
  }
  // an address's anchor decoded; one with a stray % stays as it is written
  function decoded(r) { try { return decodeURIComponent(r); } catch (e) { return r; } }
  // an address or a link to an item of a library: its panel opens (as data: the item's page first)
  function fromHash(focus) {
    var id = decoded((window.location.hash || '').replace(/^#/, ''));
    if (!id) return false;
    var done = false;
    libs().forEach(function (root) {
      var st = stateOf(root);
      if (done || !st) return;
      var e = st.all.filter(function (x) { return x.anchor === id; })[0];
      if (!e) return;
      done = true;
      open(st, e.key, { hash: false, focus: focus });
      reveal(st, e.key);
    });
    return done;
  }
  // The item an address or a link names brought into view: beside the grid the panel's heading (the panel starts at
  // the top of the main box, above the grid's rows, so the item alone would leave the heading out of sight), else the
  // item, each at the top under the room their scroll-margin leaves (core's fixed header, a page's own bar). A frame
  // later, so that the browser's own jump to the anchor and a page's measure of its bar come first
  function reveal(st, key) {
    (window.requestAnimationFrame || setTimeout)(function () {
      var main = part(st.root, 'main'), panel = part(st.root, 'panel');
      if (st.open !== key) return;
      var beside = main && main.classList.contains('gk-gui-stuff-lib-with-panel') && panel && !panel.hidden;
      var h = beside ? Array.prototype.filter.call(panel.querySelectorAll('.gk-gui-stuff-lib-name'), function (x) { return x.offsetParent !== null; })[0] : null;
      var n = h || itemNodeOf(st, key);
      if (n) n.scrollIntoView({ block: 'start' });
    });
  }

  // ---- the keys: the arrows move between the items on the page (up and down by a row in the grid, by one in
  // Lista), Home and End to the first and the last; past the first or the last the page before or after; Enter is
  // the item's button; Esc closes the panel
  function openers(st) {
    if (st.view === 'list') return Array.prototype.slice.call(st.root.querySelectorAll('[data-gk-gui-lib-table] [data-gk-gui-lib-open]'));
    return shownItems(st).map(function (i) { return i.querySelector('[data-gk-gui-lib-open]'); }).filter(Boolean);
  }
  function move(st, from, key) {
    var list = openers(st), at = list.indexOf(from), to = at;
    if (at < 0) return;
    var cols = 1;
    if (st.view !== 'list') {
      var items = list.map(function (b) { return b.closest('[data-gk-gui-lib-item]'); });
      cols = Math.max(1, items.filter(function (i) { return i.offsetTop === items[0].offsetTop; }).length);
    }
    if (key === 'ArrowRight') to = at + 1;
    else if (key === 'ArrowLeft') to = at - 1;
    else if (key === 'ArrowDown') to = at + cols;
    else if (key === 'ArrowUp') to = at - cols;
    else if (key === 'Home') to = 0;
    else if (key === 'End') to = list.length - 1;
    // right to left from the page's direction as drawn (core sets no dir on <html> in every series)
    if (window.getComputedStyle(st.root).direction === 'rtl' && (key === 'ArrowRight' || key === 'ArrowLeft')) to = at - (to - at);
    var last = st.per ? Math.max(1, Math.ceil(st.hits.length / st.per)) : 1;
    if (to > list.length - 1 && st.page < last && (key === 'ArrowRight' || key === 'ArrowLeft' || key === 'ArrowDown')) {
      st.page += 1; draw(st); list = openers(st); if (list[0]) list[0].focus(); return;
    }
    if (to < 0 && st.page > 1 && (key === 'ArrowRight' || key === 'ArrowLeft' || key === 'ArrowUp')) {
      st.page -= 1; draw(st); list = openers(st); if (list.length) list[list.length - 1].focus(); return;
    }
    to = Math.max(0, Math.min(list.length - 1, to));
    if (list[to]) list[to].focus();
  }

  // ---- the selection over every page
  function selectedKeys(st) { return Object.keys(st.selected); }
  function selChanged(st) { mark(st); if (typeof st.opts.onSelect === 'function') st.opts.onSelect(selectedKeys(st), st.api); }

  // ---- the list as data: the caller's own load, the list given, the list in the page, or the address
  function fetchList(st) {
    var o = st.opts, src = st.root.getAttribute('data-gk-gui-lib-source'), inline = part(st.root, 'items');
    if (typeof o.load === 'function') return Promise.resolve(o.load(st.api));
    if (o.items) return Promise.resolve(typeof o.items === 'function' ? o.items(st.api) : o.items);
    if (inline) return Promise.resolve(json(inline.textContent, []));
    if (src) {
      return fetch(src, { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .then(function (d) { return Array.isArray(d) ? d : (d && d.items) || []; });
    }
    return Promise.resolve([]);
  }
  // the focus in the items, Lista or the panel before they are drawn again: in the panel, or on an item's box to check
  // or its button (by the item's key); nothing when it is elsewhere (the search, a box above the library)
  function whereFocus(st) {
    var a = document.activeElement, panel = part(st.root, 'panel');
    if (!a || !st.root.contains(a)) return null;
    if (panel && panel.contains(a)) return { panel: true };
    var holder = a.closest('[data-gk-gui-lib-item], [data-gk-gui-lib-row-item]');
    if (!holder) return null;
    return { key: holder.getAttribute('data-gk-gui-lib-item') || holder.getAttribute('data-gk-gui-lib-row-item'), check: a.matches('[data-gk-gui-lib-check]') };
  }
  // the focus back where it was: the panel's heading, or the same item's box or button where it is still shown, else
  // the heading of the panel open
  function focusAgain(st, was) {
    var panel = part(st.root, 'panel'), h = panel && !panel.hidden ? panel.querySelector('.gk-gui-stuff-lib-name') : null, to = null;
    if (was.key && st.byKey[was.key]) {
      var k = CSS.escape(was.key), sel = was.check ? '[data-gk-gui-lib-check="' + k + '"]' : '[data-gk-gui-lib-open="' + k + '"]';
      to = Array.prototype.filter.call(st.root.querySelectorAll(sel), function (n) { return n.offsetParent !== null; })[0] || null;
    }
    to = to || h;
    if (to && document.activeElement !== to) to.focus({ preventScroll: true });
  }
  function load(st, keepPage) {
    var grid = part(st.root, 'grid');
    if (grid) grid.setAttribute('aria-busy', 'true');
    var page = st.page, openKey = st.open, before = whereFocus(st);
    return fetchList(st).then(function (list) {
      // where the focus was, so that it is not left on the page's body when the items and the panel are drawn again;
      // where it was at the call when it has fallen to the body meanwhile (a button disabled while it sent)
      var a = document.activeElement, was = whereFocus(st) || (!a || a === document.body ? before : null);
      st.failed = false;
      readData(st, list);
      paintRows(st);
      compute(st);
      st.page = keepPage ? page : 1;
      if (openKey && !st.byKey[openKey]) st.open = null;
      draw(st);
      if (openKey && st.byKey[openKey]) open(st, openKey, { hash: false, scroll: false, stay: true }); else if (openKey) close(st, false);
      if (was) focusAgain(st, was);
      // the first time, an address that names an item of the list opens it (the list came after the page)
      if (!st.loadedOnce && !openKey) {
        var id = decoded((window.location.hash || '').replace(/^#/, '')), at = id && st.all.filter(function (x) { return x.anchor === id; })[0];
        if (at) { open(st, at.key, { hash: false }); reveal(st, at.key); }
      }
      if (st.opts.focusSearch && !st.loadedOnce) { var s = part(st.root, 'search'); if (s) s.focus(); }
      st.loadedOnce = true;
    }, function () {
      st.failed = true;
      st.all = []; st.hits = []; st.byKey = {};
      draw(st);
      announce(words(st, 'load_failed', ''), st.root);
    });
  }

  // ---- binding a library: drawn on the server at once, as data by the caller's call (or by itself when nobody calls)
  function bind(root, opts) {
    if (!root || !root.hasAttribute('data-gk-gui-lib')) return null;
    var st = stateOf(root);
    if (st) {
      // a second call gives the caller's parts to the library bound by itself, and draws it again
      if (opts) { st.opts = opts; if (st.mode === 'data') load(st, false); }
      return st.api;
    }
    st = { root: root, key: root.getAttribute('data-gk-gui-lib'), mode: root.getAttribute('data-gk-gui-lib-mode') === 'data' ? 'data' : 'page', opts: opts || {},
           texts: json(root.getAttribute('data-gk-gui-lib-texts'), {}), all: [], hits: [], byKey: {}, filters: {}, selected: {}, page: 1, open: null };
    root._gkGuiLib = st;
    st.perOpts = (root.getAttribute('data-gk-gui-lib-per-page') || '').split(',').map(Number).filter(function (v) { return v > 0; });
    var keptPer = Number(store('lib.' + st.key + '.per'));
    st.per = st.perOpts.length ? (st.perOpts.indexOf(keptPer) >= 0 ? keptPer : st.perOpts[0]) : 0;
    var sortSel = part(root, 'sort');
    if (sortSel) {
      var keptSort = store('lib.' + st.key + '.sort');
      if (keptSort && Array.prototype.some.call(sortSel.options, function (op) { return op.value === keptSort; })) sortSel.value = keptSort;
      st.sort = sortSel.value;
    } else {
      st.sort = root.getAttribute('data-gk-gui-lib-sort') || '';
    }
    var sw = root.querySelector('[data-gk-gui-lib-view] [data-gk-gui-view-segment]');
    var v = sw && window.GkGuiViewSegment ? window.GkGuiViewSegment.restore(sw) : null;
    st.view = v === 'list' ? 'list' : 'grid';
    root.classList.toggle('gk-gui-stuff-lib-as-list', st.view === 'list');
    st.api = {
      root: root,
      reload: function (keepPage) { return st.mode === 'data' ? load(st, keepPage !== false) : Promise.resolve(); },
      open: function (key) { open(st, String(key), { focus: false }); },
      close: function () { close(st, false); },
      item: function (key) { var e = st.byKey[String(key)]; return e ? raw(st, e) : null; },
      items: function () { return st.all.map(function (e) { return raw(st, e); }); },
      hits: function () { return st.hits.map(function (e) { return raw(st, e); }); },
      selected: function () { return selectedKeys(st); },
      select: function (keys, on) { (keys || []).forEach(function (k) { if (on === false) delete st.selected[k]; else if (st.byKey[k]) st.selected[k] = 1; }); draw(st); selChanged(st); },
      selectHits: function () { st.hits.forEach(function (e) { st.selected[e.key] = 1; }); draw(st); selChanged(st); },
      clearSelection: function () { st.selected = {}; draw(st); selChanged(st); },
      checking: function () { draw(st); },
      // the chips and the hits again after the caller changed its items (a group's members); the panel stays as it is
      refresh: function () { paintRows(st); run(st, true); },
      say: function (text) { announce(text, root); },
      copy: function (text, what, at) { copy(text, fmt(words(st, 'copied', '%{what}'), { what: what }), words(st, 'copied_short', ''), at); },
      code: function (label, code) { return codeNode(st, label, code); },
      openKey: function () { return st.open; }
    };
    if (st.mode === 'page') {
      readPage(st);
      paintRows(st);
      compute(st);
      draw(st);
    } else {
      load(st, false);
    }
    return st.api;
  }

  // ---- the page's events, one listener each for every library
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest) return;
    var cp = t.closest('[data-gk-gui-lib-copy]');
    if (cp) {
      var code = codeOf(cp);
      if (code != null) copy(code, cp.getAttribute('data-gk-gui-lib-copy'), cp.getAttribute('data-gk-gui-lib-copied'), cp);
      return;
    }
    var f = t.closest('[data-gk-gui-lib-code-field]');
    if (f) { f.select(); return; }
    var st = stateOf(t.closest('[data-gk-gui-lib]'));
    if (!st) return;
    var b;
    if ((b = t.closest('[data-gk-gui-lib-chip]'))) { pick(st, b); return; }
    if ((b = t.closest('[data-gk-gui-lib-open]'))) {
      var key = b.getAttribute('data-gk-gui-lib-open'), en = st.byKey[key];
      if (st.mode === 'data' && typeof st.opts.onPick === 'function' && en) {
        st.opts.onPick(en.raw, b.closest('[data-gk-gui-lib-item]') || b.closest('td') || b, st.api);
        open(st, key);
        return;
      }
      if (st.open === key) close(st, false); else open(st, key);
      return;
    }
    if (t.closest('[data-gk-gui-lib-close]')) { close(st, true); return; }
    if ((b = t.closest('a[data-gk-gui-lib-page]'))) {
      e.preventDefault();
      st.page = Number(b.getAttribute('data-gk-gui-lib-page')) || 1;
      draw(st);
      var g = part(st.root, st.view === 'list' ? 'table' : 'grid'); if (g) g.scrollIntoView({ block: 'nearest' });
      return;
    }
    if ((b = t.closest('a[data-gk-gui-lib-per]'))) {
      e.preventDefault();
      st.per = Number(b.getAttribute('data-gk-gui-lib-per')) || st.per;
      store('lib.' + st.key + '.per', String(st.per));
      st.page = 1;
      draw(st);
      return;
    }
    // a link to an item of the same library opens it, the address following
    var a = t.closest('a[href^="#"]');
    if (a) {
      var id = decoded(a.getAttribute('href').slice(1)), it = id && st.all.filter(function (x) { return x.anchor === id; })[0];
      if (it) { e.preventDefault(); open(st, it.key, { focus: true }); }
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t.closest) return;
    var st = stateOf(t.closest('[data-gk-gui-lib]'));
    if (!st) return;
    if (t.matches('[data-gk-gui-lib-check]')) {
      var k = t.getAttribute('data-gk-gui-lib-check');
      if (t.checked) st.selected[k] = 1; else delete st.selected[k];
      selChanged(st);
      return;
    }
    if (t.matches('[data-gk-gui-lib-sort]')) { st.sort = t.value; store('lib.' + st.key + '.sort', t.value); run(st, false); }
  });
  document.addEventListener('gk-gui-view-segment', function (e) {
    var t = e.target;
    if (!t.closest || !t.closest('[data-gk-gui-lib-view]')) return;
    var st = stateOf(t.closest('[data-gk-gui-lib]'));
    if (st && e.detail) setView(st, e.detail.value);
  });
  var timers = {};
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t.matches || !t.matches('[data-gk-gui-lib-search]')) return;
    var st = stateOf(t.closest('[data-gk-gui-lib]'));
    if (!st) return;
    // a long list as data waits for a pause in the typing
    if (st.mode === 'data') { clearTimeout(timers[st.key]); timers[st.key] = setTimeout(function () { run(st, false); }, 120); } else run(st, false);
  });
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (t.matches && t.matches('[data-gk-gui-lib-code-field]')) t.select();
  });
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (!t.closest) return;
    var st = stateOf(t.closest('[data-gk-gui-lib]'));
    if (!st) return;
    if (e.key === 'Escape' && st.open && !e.defaultPrevented) {
      // a layer, a fly or a box open in the panel takes its own Esc first, and a reason being written keeps it; a plain
      // fold (a tile's Kod) has none
      if (t.closest('[data-gk-gui-lib-panel]') && t.closest('.gk-gui-stuff-layer, details.gk-gui-stuff-fly[open], .gk-gui-stuff-mount-box, textarea, [data-gk-reason]')) return;
      e.preventDefault();
      close(st, true);
      return;
    }
    // with Alt, Ctrl or Meta the keys stay the browser's (Alt+Left is back)
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var b = t.closest('[data-gk-gui-lib-open]');
    if (b && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].indexOf(e.key) >= 0) {
      e.preventDefault();
      move(st, b, e.key);
      return;
    }
    // Enter in the search opens the first item shown
    if (e.key === 'Enter' && t.matches('[data-gk-gui-lib-search]')) {
      var first = st.hits[0];
      if (first) { e.preventDefault(); clearTimeout(timers[st.key]); compute(st); draw(st); if (st.hits[0]) open(st, st.hits[0].key, { focus: true }); }
    }
  });
  window.addEventListener('hashchange', function () { fromHash(true); });

  var queued = false;
  function placeAll() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () { queued = false; libs().forEach(function (l) { var st = stateOf(l); if (st) place(st); }); });
  }
  // The room at the top a jump to an item must leave: core's header where it is fixed (a phone: its lower edge,
  // measured, since its height follows the series and the theme), written on every library and on every page that
  // stands in the library's tones (--gk-gui-lib-head-h); the stylesheet adds it to the items' scroll-margin. Core's
  // header is found by its own id
  function measureHead() {
    var h = document.getElementById('header'), head = 0;
    if (h) {
      var pos = window.getComputedStyle(h).position;
      if (pos === 'fixed' || pos === 'sticky') head = Math.max(0, Math.round(h.getBoundingClientRect().bottom));
    }
    document.querySelectorAll('.gk-gui-stuff-lib, .gk-gui-stuff-lib-tokens').forEach(function (n) { n.style.setProperty('--gk-gui-lib-head-h', head + 'px'); });
  }
  function start() {
    var G = window.GkGui = window.GkGui || {};
    G.library = bind;
    measureHead();
    libs().forEach(function (root) { if (root.getAttribute('data-gk-gui-lib-mode') !== 'data') bind(root); });
    fromHash(false);
    window.addEventListener('resize', function () { measureHead(); placeAll(); });
    // a library as data that no script of its caller bound draws itself with what the list gives
    setTimeout(function () {
      libs().forEach(function (root) { if (!stateOf(root)) bind(root); });
    }, 0);
  }
  // the copies when everything on the page has been drawn by its scripts
  function late() { libs().forEach(function (l) { var st = stateOf(l); if (st) fill(st); }); }
  window.GkGuiLibrary = { bind: bind, get: function (root) { var st = stateOf(root); return st ? st.api : null; }, copy: copy };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  if (document.readyState === 'complete') late(); else window.addEventListener('load', late);
})();
