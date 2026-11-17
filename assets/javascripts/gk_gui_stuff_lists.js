// gk_gui_stuff list_filter and select_search: finding one's way in long lists, on core's pages and ours.
// list_filter: a filter field above a long list of check boxes (more than 12: a tracker's projects and custom fields,
// the notified events, a multiple setting) and above a long table (more than 12 rows: the palette, a plugin's
// settings). Typing hides what does not match (every word must be found, case and accents ignored); Escape empties
// the field (so does its clear button). The field has a magnifier, and while it filters it says how many of how many
// are shown. A long list of check boxes also stands in a box of its own height that scrolls, so that it does not push
// the page down. Pages with core's query filters (the issue list and the like) have their own and get none.
// What is hidden is only hidden: every check box and field is still in the form and is sent as before.
// select_search: a list with more than 15 choices (single or multiple) gets the searchable chooser
// (gk_gui_stuff_select.js, GkGui.selectSearch, always loaded; its own doc says what it does). Lists inside core's query
// filters and column choice, in the toolbar, and a list a script shows or hides itself, are left as they are. A list
// that asks for the chooser gets it from gk_gui_stuff_select.js whether this module is on or not.
// A check box in a table's cell is a control of its row, never an item of a list: such a table's rows are the list.
// A table of settings rows that is the one list of a section (a fieldset) gets its field above the section. A list
// never gets two fields. Every list or table can say no with data-gk-gui-filter="off" or data-gk-gui-select="off", or ask for a filter
// whatever its length with data-gk-gui-filter.
// The style guide's example of the filter (data-gk-gui-filter="example") has it whatever its length and whether the
// module is on or not: the guide loads this script for it when neither module is on, and the example carries the
// filter's words (data-gk-gui-filter-words, JSON), taken only where the page's configuration lacks them. With neither
// module on nothing else is touched.
// A select asks for the chooser whatever its length with data-gk-gui-select="on", "create" or "create-denied"; that
// is gk_gui_stuff_select.js's pass, not this module's.
(function () {
  var G = window.GkGui;
  if (!G) return;
  var FILTER = G.on('list_filter'), SELECT = G.on('select_search');
  var N = G.node, LIST_MIN = 12, SELECT_MIN = 15;
  // the chooser's search, shared with the filter (gk_gui_stuff_select.js)
  var F = G.selectSearch.find, norm = F.norm, words = F.words, hit = F.hit, textOf = F.textOf, searchIcon = F.searchIcon;
  // a page with core's query filters has its own way of narrowing its lists
  function queryPage() { return !!document.querySelector('#query_form, #filters'); }

  // ---------------------------------------------------------------- list_filter
  // the filter field: core's input with a magnifier at its start, and at its end how many are shown and a clear button
  // the effect mark only with the module on: the style guide's example with the module off is not the module's effect
  function filterField(label) {
    var wrap = N('span', 'gk-gui-stuff-lf');
    if (FILTER) G.effect(wrap, 'list_filter');
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
  // A fieldset's caption is its own legend (HTML's: the legend whose fieldset is this one), at any depth
  function legendOf(fs) {
    return fs ? Array.prototype.filter.call(fs.querySelectorAll('legend'), function (l) { return l.closest('fieldset') === fs; })[0] || null : null;
  }
  // What names a list: the caption of the fieldset it stands in, else a label in its box that belongs to no control
  // (core's multiple setting starts with such a label; a label's control is HTML's own tie, never a guess)
  function nameOf(box) {
    var lg = legendOf(box.closest('fieldset'));
    if (lg && box.closest('fieldset').contains(box)) return textOf(lg);
    var free = Array.prototype.find.call(box.querySelectorAll('label'), function (l) { return !l.control; });
    return free ? textOf(free) : '';
  }
  function itemText(el) {
    var t = el.textContent || '';
    el.querySelectorAll('input[type=text], input:not([type]), input[type=search]').forEach(function (i) { t += ' ' + i.value; });
    return norm(t);
  }
  // The nearest element that holds all of nodes (computed from the nodes, never assumed)
  function common(nodes) {
    var c = nodes[0] && nodes[0].parentElement;
    while (c && !nodes.every(function (n) { return c.contains(n); })) c = c.parentElement;
    return c;
  }
  // A list of check boxes is what a form sends as one value with many choices: its check boxes share one name that
  // ends in [] (Rails' list of values: a tracker's projects and custom fields, the notified events, a multiple
  // setting), found by that name and never by the box, the tags or the rows they stand in. A check box in a table's
  // cell is a control of its row (a row's "Lock"), never an item of a list: such a table's rows are the list. An
  // element marked data-gk-gui-filter is a list of the check boxes in it, whatever their names. A project tree is
  // core's ul.projects.root: its items are the li core draws around each check box.
  // the filter's words an example carries (data-gk-gui-filter-words), for a page whose configuration lacks them (the
  // style guide with the module off); the configuration's own words are never replaced
  function exampleWords(box) {
    var raw = box.getAttribute('data-gk-gui-filter-words'), w = null, t = (G.cfg.t = G.cfg.t || {});
    if (!raw) return;
    try { w = JSON.parse(raw); } catch (e) { return; }
    Object.keys(w || {}).forEach(function (k) { if (!(k in t)) t[k] = w[k]; });
  }
  // examples: only the style guide's example (the module off), its words taken where the configuration lacks them
  function groups(root, examples) {
    var out = [], by = {};
    root.querySelectorAll(examples ? '#content [data-gk-gui-filter="example"]' : '#content [data-gk-gui-filter]:not([data-gk-gui-filter="off"])').forEach(function (box) {
      if (box.matches('table, tbody')) return;
      var boxes = Array.prototype.slice.call(box.querySelectorAll('input[type=checkbox]'));
      if (boxes.length) out.push({ box: box, inputs: boxes, asked: true });
      exampleWords(box);
    });
    if (examples) return out;
    // a name shared across sections (core's role form: role[permissions][] in one fieldset per module) is one list
    // per section, named by that section's legend, never one list across them all
    var sections = [];
    root.querySelectorAll('#content input[type=checkbox][name$="[]"]').forEach(function (cb) {
      if (cb.closest('table') || cb.closest('[data-gk-gui-filter]')) return;
      var fs = cb.closest('fieldset'), at = fs ? sections.indexOf(fs) : -1;
      if (fs && at < 0) { sections.push(fs); at = sections.length - 1; }
      var key = (cb.form ? 'f' + Array.prototype.indexOf.call(document.forms, cb.form) : 'x') + ':' + at + ':' + cb.name;
      (by[key] = by[key] || []).push(cb);
    });
    Object.keys(by).forEach(function (k) { out.push({ box: null, inputs: by[k], asked: false }); });
    return out;
  }
  // the element that is hidden for an item: its label when the check box stands in it, else the check box and its
  // label together in the box the script makes around them (scrollBox), or the project's li in a tree
  function unitOf(cb, tree) {
    if (tree) return cb.closest('li');
    var l = cb.labels && cb.labels[0];
    return l && l.contains(cb) ? l : null;
  }
  function checkboxLists(root, examples) {
    groups(root, examples).forEach(function (g) {
      var first = g.inputs[0];
      // a check box in a list table is its row's control; a list that asks for the filter is a list also when it
      // stands in one of that table's cells (the table holds the asking box, not the other way round)
      var cell = first.closest('table.list');
      if (first.closest('[data-gk-gui-filter="off"]') || (cell && !(g.asked && cell.contains(g.box)))) return;
      var tree = first.closest('ul.projects.root');
      if (tree && !g.inputs.every(function (cb) { return tree.contains(cb); })) tree = null;
      var items = [];
      g.inputs.forEach(function (cb) { var u = unitOf(cb, tree); if (u && items.indexOf(u) < 0) items.push(u); });
      if (!items.length || items.length !== g.inputs.length) return;
      if (items.length <= LIST_MIN && !(g.asked && items.length)) return;
      var box = g.box || (tree ? tree : common(items));
      if (!box || box.dataset.gkGuiLf) return;
      // one filter per list: a list that already has one (its table's, or a pass before) gets no second
      if (items[0].closest('.gk-gui-stuff-lf-scroll')) return;
      box.dataset.gkGuiLf = '1';
      var f = filterField(nameOf(box));
      // the list in a box of its own height, and the field right above the list
      var scroll = tree || scrollBox(items);
      if (tree) tree.classList.add('gk-gui-stuff-lf-scroll');
      if (scroll) scroll.parentNode.insertBefore(f.wrap, scroll);
      else items[0].parentNode.insertBefore(f.wrap, items[0]);
      // a tree's item is read by its own check box's label, so that a project's children are not part of its text
      var texts = items.map(function (it, i) {
        if (!tree) return itemText(it);
        var l = g.inputs[i].labels && g.inputs[i].labels[0];
        return norm(textOf(l || it));
      });
      f.input.addEventListener('input', function () {
        var ws = words(f.input.value), shown = 0;
        if (tree) {
          // a project is shown when it or one of the projects under it matches: each match shows the li of its
          // project and every li around it in the tree
          var vis = new Set();
          items.forEach(function (li, i) {
            if (ws.length && !hit(texts[i], ws)) return;
            shown++;
            for (var up = li; up && tree.contains(up); up = up.parentElement && up.parentElement.closest('li')) vis.add(up);
          });
          items.forEach(function (li) { li.classList.toggle('gk-gui-stuff-lf-miss', !vis.has(li)); });
        } else {
          items.forEach(function (it, i) {
            var ok = !ws.length || hit(texts[i], ws);
            it.classList.toggle('gk-gui-stuff-lf-miss', !ok);
            if (ok) shown++;
          });
          // while it filters, the items stand one per line in the script's box and core's line breaks there rest
          // (gk_gui_stuff_lists.css), so that no empty lines are left where items are hidden
          if (scroll) scroll.classList.toggle('gk-gui-stuff-lf-on', ws.length > 0);
        }
        f.say(shown, items.length, ws.length);
      });
    });
  }
  // the run from the first item to the last in a span that scrolls, when they stand side by side; the span, or null
  function scrollBox(items) {
    var first = items[0], last = items[items.length - 1], parent = first.parentNode;
    if (items.some(function (i) { return i.parentNode !== parent; })) return null;
    var box = N('span', 'gk-gui-stuff-lf-scroll');
    parent.insertBefore(box, first);
    var n = first;
    while (n) { var next = n.nextSibling; box.appendChild(n); if (n === last) break; n = next; }
    return box;
  }
  // a section whose one list is a table of settings rows (not core's .list): the table alone in its fieldset, at any
  // depth (a wrapper such as core's div.autoscroll between them changes nothing)
  function sectionOf(table) {
    var fs = table.closest('fieldset');
    if (!fs || table.classList.contains('list')) return null;
    return fs.querySelectorAll('table').length === 1 ? fs : null;
  }
  function tables(root) {
    if (queryPage()) return;
    root.querySelectorAll('#content table.list, #content table[data-gk-gui-filter], #content fieldset table').forEach(function (table) {
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
      // core's list stands in its scrolling box (div.autoscroll, at any depth); the field goes above that box
      var at = section || table.closest('.autoscroll') || table;
      if (at.dataset.gkGuiLfAt) return;
      at.dataset.gkGuiLfAt = '1';
      table.dataset.gkGuiLf = '1';
      var cap = table.caption || legendOf(section);
      var f = filterField(cap ? textOf(cap) : '');
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
  // only by length: a list that asks for the chooser has it from gk_gui_stuff_select.js, with the module or without
  var SKIP_SELECT = G.selectSearch.skip;
  function selects(root) {
    root.querySelectorAll('#content select').forEach(function (sel) {
      if (sel.dataset.gkGuiSs || sel.options.length <= SELECT_MIN || sel.closest(SKIP_SELECT)) return;
      // a list a script shows and hides itself, and a list shown as a box of rows (size), are its own
      if (sel.hidden || sel.style.display === 'none' || Number(sel.getAttribute('size') || 0) > 1) return;
      var h = G.selectSearch.enhance(sel);
      if (h && h.el) G.effect(h.el, 'select_search');
    });
  }

  G.onContent(function (root) {
    if (FILTER) { checkboxLists(root); tables(root); }
    // the style guide's example has its filter with the module off too (data-gk-gui-filter="example")
    else checkboxLists(root, true);
    if (SELECT) selects(root);
  });
})();
