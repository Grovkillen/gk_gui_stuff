// gk_gui_stuff list_filter and select_search: finding one's way in long lists, on core's pages and ours.
// list_filter: a filter field above a long list of check boxes (more than 12: a tracker's projects and custom fields,
// the notified events, a multiple setting) and above a long table (more than 12 rows: the palette, a plugin's
// settings). Typing hides what does not match (every word must be found, case and accents ignored); Escape empties
// the field (so does its clear button). The field has a magnifier, and while it filters it says how many of how many
// are shown. A long list of check boxes also stands in a box of its own height that scrolls, so that it does not push
// the page down. Pages with core's query filters (the issue list and the like) have their own and get none.
// What is hidden is only hidden: every check box and field is still in the form and is sent as before.
// select_search: a list with more than 15 choices (single or multiple) gets a searchable chooser. The real select
// stays in the form, hidden, and is what is sent; the chooser sets it and tells it ("input", "change"), so core's and
// other plugins' scripts on the select still run. Closed, a single chooser looks like the list itself (its font,
// padding, corners and arrow are read from it); open, a panel under it (or above, when there is more room there) has
// a search field and the choices in the order given, the chosen one marked, the matched words in bold. Several
// choices stand in the field as chips with a remove button, and the search is typed in the field itself. Keyboard:
// Enter, Space or the arrow keys open, arrow keys and Page Up/Down move, Enter chooses, Escape and Tab close,
// Backspace in an empty field takes the last of several choices away. More than 500 shown choices are drawn only
// where the list is scrolled to.
// Lists inside core's query filters and column choice, and a list a script shows or hides itself, are left as they are.
// A check box in a table's cell is a control of its row, never an item of a list: such a table's rows are the list.
// A table of settings rows that is the one list of a section (a fieldset) gets its field above the section. A list
// never gets two fields. Every list or table can say no with data-gk-gui-filter="off" or data-gk-gui-select="off", or ask for a filter
// whatever its length with data-gk-gui-filter.
(function () {
  var G = window.GkGui;
  if (!G) return;
  var FILTER = G.on('list_filter'), SELECT = G.on('select_search');
  if (!FILTER && !SELECT) return;
  var N = G.node, LIST_MIN = 12, SELECT_MIN = 15, seq = 0;

  function norm(s) { return String(s || '').toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  function words(q) { var n = norm(q); return n ? n.split(' ') : []; }
  function hit(text, ws) { for (var i = 0; i < ws.length; i++) { if (text.indexOf(ws[i]) < 0) return false; } return true; }
  function textOf(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }
  // a page with core's query filters has its own way of narrowing its lists
  function queryPage() { return !!document.querySelector('#query_form, #filters'); }

  // ---------------------------------------------------------------- list_filter
  // a magnifier at the field's start, the browser's own search glyph never shown
  function searchIcon(wrap, cls) {
    var ic = G.icon('search', '', 14);
    if (ic.nodeType !== 1) return;
    var s = N('span', cls);
    s.setAttribute('aria-hidden', 'true');
    s.appendChild(ic);
    wrap.appendChild(s);
    wrap.classList.add('gk-gui-stuff-has-icon');
  }
  // the filter field: core's input with a magnifier at its start, and at its end how many are shown and a clear button
  function filterField(label) {
    var wrap = N('span', 'gk-gui-stuff-lf');
    searchIcon(wrap, 'gk-gui-stuff-lf-icon');
    var input = N('input', 'gk-gui-stuff-lf-input');
    input.type = 'search';
    input.placeholder = G.t('lf_placeholder');
    input.setAttribute('aria-label', label ? G.t('lf_label_of', { name: label }) : G.t('lf_label'));
    input.autocomplete = 'off';
    input.spellcheck = false;
    function clear() { input.value = ''; input.dispatchEvent(new Event('input')); }
    // Enter in the filter never sends the form it stands in
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') e.preventDefault();
      if (e.key === 'Escape' && input.value) { e.preventDefault(); e.stopPropagation(); clear(); }
    });
    var end = N('span', 'gk-gui-stuff-lf-end');
    var count = N('span', 'gk-gui-stuff-lf-count');
    count.setAttribute('aria-live', 'polite');
    var x = N('button', 'gk-gui-stuff-lf-clear');
    x.type = 'button';
    x.hidden = true;
    x.setAttribute('aria-label', G.t('lf_clear'));
    x.title = G.t('lf_clear');
    G.put(x, 'close', '×', 12);
    x.addEventListener('click', function () { clear(); input.focus(); });
    end.appendChild(count);
    end.appendChild(x);
    wrap.appendChild(input);
    wrap.appendChild(end);
    return { wrap: wrap, input: input, say: function (shown, total, q) {
      count.textContent = !q ? '' : shown ? G.t('lf_count', { shown: shown, total: total }) : G.t('no_hits');
      x.hidden = !input.value;
      // the typed text never runs under the count and the button
      var w = end.offsetWidth;
      input.style.paddingInlineEnd = w ? (w + 6) + 'px' : '';
    } };
  }
  // the box's heading: its legend, or the form row's own label (the one without a check box)
  function headOf(box) {
    return box.querySelector(':scope > legend') ||
      Array.prototype.find.call(box.querySelectorAll(':scope > label'), function (l) { return !l.querySelector('input'); }) || null;
  }
  function legendText(box) { var h = headOf(box); return h ? textOf(h) : ''; }
  function itemText(el) {
    var t = el.textContent || '';
    el.querySelectorAll('input[type=text], input:not([type]), input[type=search]').forEach(function (i) { t += ' ' + i.value; });
    return norm(t);
  }
  // a list of check boxes in one box: a fieldset, a form row (core's multiple setting) or a marked element
  var BOX = 'fieldset, .tabular p, [data-gk-gui-filter]';
  function checkboxLists(root) {
    root.querySelectorAll('#content fieldset, #content .tabular p, #content [data-gk-gui-filter]').forEach(function (box) {
      if (box.dataset.gkGuiLf || box.closest('[data-gk-gui-filter="off"]')) return;
      if (box.matches('table, tbody') || box.closest('table.list')) return;
      // one filter per list: a box that already has one (its table's) gets no second
      if (box.querySelector(':scope > .gk-gui-stuff-lf, :scope > .gk-gui-stuff-lf-line')) return;
      var tree = box.querySelector(':scope > ul.projects.root, :scope > div > ul.projects.root, :scope > ul');
      if (tree && !tree.classList.contains('projects')) tree = null;
      var items;
      if (tree) {
        items = Array.prototype.slice.call(tree.querySelectorAll('li'));
      } else {
        // a check box in a table's cell is a control of that row (a row's "Lock"), not an item of a list: the
        // table's rows are the list, and the table gets the filter
        items = Array.prototype.filter.call(box.querySelectorAll('label'), function (l) {
          var t = l.closest('table');
          return l.querySelector('input[type=checkbox]') && l.closest(BOX) === box && !(t && box.contains(t));
        });
      }
      var asked = box.hasAttribute('data-gk-gui-filter') && box.getAttribute('data-gk-gui-filter') !== 'off';
      if (items.length <= LIST_MIN && !(asked && items.length)) return;
      box.dataset.gkGuiLf = '1';
      var f = filterField(legendText(box));
      // the field after the box's heading (legend, or the form row's label)
      var head = headOf(box);
      if (head && head.nextSibling) box.insertBefore(f.wrap, head.nextSibling); else if (head) box.appendChild(f.wrap); else box.insertBefore(f.wrap, box.firstChild);
      // the list in a box of its own height
      if (tree) tree.classList.add('gk-gui-stuff-lf-scroll');
      else scrollBox(items);
      var texts = items.map(function (it) {
        return tree ? norm(textOf(it.querySelector(':scope > div') || it)) : itemText(it);
      });
      f.input.addEventListener('input', function () {
        var ws = words(f.input.value), shown = 0;
        if (tree) {
          // from the leaves up: a project is shown when it or one of its children matches
          var vis = new Map();
          for (var i = items.length - 1; i >= 0; i--) {
            var li = items[i], ok = !ws.length || hit(texts[i], ws);
            if (!ok) li.querySelectorAll(':scope > ul > li').forEach(function (c) { if (vis.get(c)) ok = true; });
            vis.set(li, ok);
            li.classList.toggle('gk-gui-stuff-lf-miss', !ok);
            if (ok && (!ws.length || hit(texts[i], ws))) shown++;
          }
        } else {
          items.forEach(function (it, i) {
            var ok = !ws.length || hit(texts[i], ws);
            it.classList.toggle('gk-gui-stuff-lf-miss', !ok);
            // the line break after an item (core's notified events) goes with it
            var n = it.nextSibling;
            while (n && n.nodeType === 3 && !n.textContent.trim()) n = n.nextSibling;
            if (n && n.tagName === 'BR') n.classList.toggle('gk-gui-stuff-lf-miss', !ok);
            if (ok) shown++;
          });
        }
        f.say(shown, items.length, ws.length);
      });
    });
  }
  // the run from the first item to the last in a span that scrolls, when they stand side by side
  function scrollBox(items) {
    var first = items[0], last = items[items.length - 1], parent = first.parentNode;
    if (items.some(function (i) { return i.parentNode !== parent; })) return;
    var box = N('span', 'gk-gui-stuff-lf-scroll');
    parent.insertBefore(box, first);
    var n = first;
    while (n) { var next = n.nextSibling; box.appendChild(n); if (n === last) break; n = next; }
  }
  // a section whose one list is a table of settings rows (not core's .list): the table directly in a fieldset
  function sectionOf(table) {
    var p = table.parentElement;
    if (!p || p.tagName !== 'FIELDSET' || table.classList.contains('list')) return null;
    return p.querySelectorAll(':scope > table').length === 1 ? p : null;
  }
  function tables(root) {
    if (queryPage()) return;
    root.querySelectorAll('#content table.list, #content table[data-gk-gui-filter], #content fieldset > table').forEach(function (table) {
      if (table.dataset.gkGuiLf || table.getAttribute('data-gk-gui-filter') === 'off' || table.closest('[data-gk-gui-filter="off"]')) return;
      if (table.parentElement.closest('table')) return;
      var body = table.tBodies[0];
      if (!body) return;
      var rows = Array.prototype.filter.call(body.rows, function (r) { return !r.classList.contains('group'); });
      var asked = table.hasAttribute('data-gk-gui-filter');
      var section = sectionOf(table);
      // a table of a section that is not core's list is taken only when its rows are settings (they hold fields)
      if (!asked && !table.classList.contains('list') && !(section && body.querySelector('input, select, textarea'))) return;
      if (rows.length <= LIST_MIN && !(asked && rows.length)) return;
      // one filter per list: the box around it already has one
      var at = section || (table.parentElement.classList.contains('autoscroll') ? table.parentElement : table);
      var before = at.previousElementSibling;
      if (before && before.matches('.gk-gui-stuff-lf, .gk-gui-stuff-lf-line')) return;
      table.dataset.gkGuiLf = '1';
      var f = filterField(textOf(table.caption || (section && section.querySelector(':scope > legend')) || { textContent: '' }));
      // core's list: the field right above the table; a section's table: above the whole section, outside its frame
      var line = N('div', 'gk-gui-stuff-lf-line');
      line.appendChild(f.wrap);
      at.parentNode.insertBefore(line, at);
      f.input.addEventListener('input', function () {
        var ws = words(f.input.value), shown = 0, group = null, groupHit = false;
        function closeGroup() { if (group) group.classList.toggle('gk-gui-stuff-lf-miss', !groupHit); }
        Array.prototype.forEach.call(body.rows, function (r) {
          if (r.classList.contains('group')) { closeGroup(); group = r; groupHit = !ws.length; return; }
          // a row's text is read when it is asked for: a row a plugin adds later is found too
          var ok = !ws.length || hit(itemText(r), ws);
          r.classList.toggle('gk-gui-stuff-lf-miss', !ok);
          if (ok) { shown++; groupHit = true; }
        });
        closeGroup();
        f.say(shown, rows.length, ws.length);
      });
    });
  }

  // ---------------------------------------------------------------- select_search
  var SKIP_SELECT = '#query_form, #filters, .filters, .query-columns, table.query-columns, .contextual, .jstElements, [data-gk-gui-select="off"]';
  function selectLabel(sel) {
    if (sel.getAttribute('aria-label')) return sel.getAttribute('aria-label');
    if (sel.id) { var l = document.querySelector('label[for="' + CSS.escape(sel.id) + '"]'); if (l) return textOf(l); }
    var p = sel.closest('label'); if (p) return textOf(p);
    return sel.title || '';
  }
  // a choice's text with the searched words in bold: the words are found as norm() finds them (case and accents
  // ignored), and the marks are put on the original characters
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
  function enhance(sel) {
    sel.dataset.gkGuiSs = '1';
    var multi = sel.multiple, id = 'gk-gui-stuff-ss-' + (++seq), open = false, dirty = true, hideTimer = 0, frame = 0;
    // entries: the list's choices and group headings in its order; view: those shown; active: the marked one in view
    var entries = [], view = [], active = -1, ws = [], qk = null, virt = false, rowH = 0;
    var cs = window.getComputedStyle(sel), width = sel.getBoundingClientRect().width, height = sel.offsetHeight;
    var wrap = N('span', 'gk-gui-stuff-ss ' + (multi ? 'gk-gui-stuff-ss-multi' : 'gk-gui-stuff-ss-single'));
    // the chooser takes the list's width as it is meant: a relative width (a percentage of its own, or a list that
    // fills its cell or row) stays relative, so that it follows the box when that is laid out again; else in px
    var own = sel.style.inlineSize || sel.style.width, pr = sel.parentElement, pcs = pr && window.getComputedStyle(pr);
    var inner = pr ? pr.clientWidth - (parseFloat(pcs.paddingLeft) || 0) - (parseFloat(pcs.paddingRight) || 0) : 0;
    if (own && own.indexOf('%') > 0) wrap.style.inlineSize = own;
    else if (inner > 40 && width >= inner * 0.95) wrap.style.inlineSize = '100%';
    else if (width > 40) wrap.style.inlineSize = Math.ceil(width) + 'px';
    else wrap.classList.add('gk-gui-stuff-ss-free');
    var label = selectLabel(sel);
    var box = N('span', 'gk-gui-stuff-ss-box');
    // the closed chooser in the list's own look in this series and theme: its font, corners and, for a single list,
    // its padding, height and arrow, read from the list itself
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
        // a list without core's arrow (another theme): the arrow from the icons
        caret = N('span', 'gk-gui-stuff-ss-caret');
        caret.setAttribute('aria-hidden', 'true');
        caret.appendChild(G.icon('angle-down', '▾', 14));
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
    // the field the keys are typed in: for a single list the search at the top of the panel, for several the field
    // among the chips
    if (!multi) {
      var head = N('div', 'gk-gui-stuff-ss-search');
      searchIcon(head, 'gk-gui-stuff-ss-search-icon');
      find = N('input', 'gk-gui-stuff-ss-find');
      find.type = 'search';
      find.setAttribute('role', 'searchbox');
      find.placeholder = G.t('ss_placeholder');
      find.setAttribute('aria-label', G.t('ss_search'));
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
      input.setAttribute('aria-label', label || G.t('ss_search'));
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
    // a label pointing at the select, and the browser's own message for a required list, lead to the chooser
    sel.addEventListener('focus', function () { focusEl.focus(); });
    var empty = N('li', 'gk-gui-stuff-ss-empty', G.t('no_hits'));
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
      var raw = o.textContent.replace(/\s+/g, ' ').trim();
      entries.push({ o: o, grp: g, raw: raw, text: norm(raw), n: entries.length, li: null, qk: null });
    }
    // an entry's row, made when it is first shown
    function rowOf(e, i) {
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
          check.appendChild(G.icon('checked', '✓', 14));
          e.li.appendChild(check);
          e.txt = N('span', 'gk-gui-stuff-ss-text');
          e.li.appendChild(e.txt);
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
      return o ? o.textContent.replace(/\s+/g, ' ').trim() : '';
    }
    // what the closed chooser shows: the chosen one (an empty choice muted), or the chosen ones as removable chips
    function paint() {
      var off = sel.disabled;
      wrap.classList.toggle('gk-gui-stuff-ss-disabled', off);
      entries.forEach(function (e) { if (e.li && e.o) e.li.setAttribute('aria-selected', e.o.selected ? 'true' : 'false'); });
      if (!multi) {
        box.tabIndex = off ? -1 : 0;
        box.setAttribute('aria-disabled', off ? 'true' : 'false');
        var o = sel.options[sel.selectedIndex];
        value.textContent = selectedText() || ' ';
        value.classList.toggle('gk-gui-stuff-ss-placeholder', !o || !o.value);
        return;
      }
      input.disabled = off;
      chips.textContent = '';
      var n = 0;
      Array.prototype.forEach.call(sel.options, function (o) {
        if (!o.selected || !o.value) return;
        n++;
        var name = o.textContent.replace(/\s+/g, ' ').trim();
        var c = N('span', 'gk-gui-stuff-ss-chip');
        c.appendChild(N('span', 'gk-gui-stuff-ss-chip-text', name));
        c.title = name;
        var x = N('button', 'gk-gui-stuff-ss-chip-x');
        x.type = 'button';
        x.tabIndex = -1;
        x.setAttribute('aria-label', G.t('ss_remove', { name: name }));
        x.title = x.getAttribute('aria-label');
        G.put(x, 'close', '×', 10);
        x.disabled = off;
        x.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); });
        x.addEventListener('click', function () { o.selected = false; told(); input.focus(); if (open) { narrow(); place(); } });
        c.appendChild(x);
        chips.appendChild(c);
      });
      input.placeholder = n ? '' : G.t('ss_placeholder');
    }
    function told() {
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      paint();
    }
    function choose(e) {
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
        if (view[i].o && !view[i].o.disabled) { last = i; n--; }
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
      draw();
      mark(active, false);
    }
    // the open panel stands over the page, fixed to the window, so that no box around the field (one that scrolls or
    // cuts what overflows) hides part of it: under the field, or above it when there is more room there; at least as
    // wide as the field, wider for long choices up to a limit
    function place() {
      if (!open) return;
      var r = box.getBoundingClientRect(), vh = window.innerHeight, vw = document.documentElement.clientWidth, gap = 2, edge = 4;
      var bw = Math.ceil(r.width);
      drop.style.maxBlockSize = '';
      drop.style.minInlineSize = bw + 'px';
      drop.style.maxInlineSize = 'max(' + bw + 'px, min(40em, ' + (vw - 2 * edge) + 'px))';
      // a long list is drawn in part: its width is set, not taken from the rows that happen to be drawn
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
      // a short fade in from the field's side
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
      if (li && li._gkEntry && li._gkAt !== active && !li._gkEntry.o.disabled) mark(li._gkAt, false);
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
        // a letter typed on the closed chooser opens it and starts the search
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
    // a value a script set without telling (no change event) is shown when one comes back to the field
    focusEl.addEventListener('focus', function () { if (!open) paint(); });
    input.addEventListener('input', function () { if (!open) show(); narrow(); place(); });
    // the focus left the chooser (another field, another window)
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
        if (chosen.length) { chosen[chosen.length - 1].selected = false; told(); if (open) { narrow(); place(); } }
      }
    });
    // the select changed by someone else (a script, a reset of the form): the chooser follows
    sel.addEventListener('change', function () { if (!open) paint(); });
    if (sel.form) sel.form.addEventListener('reset', function () { setTimeout(paint, 0); });
    new MutationObserver(function () { if (open) { build(); narrow(); place(); } else { dirty = true; } paint(); })
      .observe(sel, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'label'] });
    paint();
  }
  function selects(root) {
    root.querySelectorAll('#content select').forEach(function (sel) {
      if (sel.dataset.gkGuiSs || sel.options.length <= SELECT_MIN || sel.closest(SKIP_SELECT)) return;
      // a list a script shows and hides itself, and a list shown as a box of rows (size), are its own
      if (sel.hidden || sel.style.display === 'none' || Number(sel.getAttribute('size') || 0) > 1) return;
      enhance(sel);
    });
  }

  G.onContent(function (root) {
    if (FILTER) { checkboxLists(root); tables(root); }
    if (SELECT) selects(root);
  });
})();
