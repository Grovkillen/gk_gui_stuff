// gk_gui_stuff sticky_save, settings_frame and attachment_sizes: long settings pages.
// sticky_save: a long form keeps its one Save in reach. While the form is on the screen and its own Save is below the
// screen's edge, a bar at the bottom of the window holds a button with the same word that presses the form's own
// Save (so the form is sent exactly as by that button, with its name, its reason field and every script on it).
// There is still one Save; the bar is only where it can be reached. On core's settings (every tab, and every
// plugin's Configure page) by itself; any other form asks with data-gk-gui-sticky-save (its value, if any, a selector
// for the form's own Save; else the form's one submit button). While the bar shows, the
// page's root has the class gk-gui-stuff-savebar-on and --gk-gui-stuff-savebar-size (its height), so that what stands
// at the bottom of the window (the notices) stands above it.
// settings_frame: the Configure page of every GK plugin (Administration > Plugins, /settings/plugin/gk_*) and any
// element marked data-gk-gui-settings-frame. Its boxes start folded under their headings (a page with one box keeps
// it open), or as they were left on the page the last time in this browser, a search field above them finds settings by their label, help text and key (the boxes with a hit open, the
// rows without one hide), each row shows its key quietly, and the change log is folded, with one section per version, the latest first and open.
// A row's key is the name of its field, settings[key]; a row with data-gk-gui-search is found by that text too (its
// English name, gk_gui_stuff_form_page_search_text).
// #gk-find=<text> in the address fills in the search (a link to one setting from another page). Nothing in the form
// changes: a hidden or folded field is still sent.
// attachment_sizes: on core's Files settings, buttons beside the sizes (largest attachment, largest download of
// several) fill in 5 MB, 20 MB, 100 MB or 1 GB in core's unit, kB; the field stays and takes any value.
(function () {
  var G = window.GkGui;
  if (!G) return;
  var STICKY = G.on('sticky_save'), FRAME = G.on('settings_frame'), SIZES = G.on('attachment_sizes');
  if (!STICKY && !FRAME && !SIZES) return;
  var N = G.node;
  function body(cls) { return document.body.classList.contains(cls); }
  function norm(s) { return String(s || '').toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  function words(q) { var n = norm(q); return n ? n.split(' ') : []; }
  function hit(text, ws) { for (var i = 0; i < ws.length; i++) { if (text.indexOf(ws[i]) < 0) return false; } return true; }

  // ---------------------------------------------------------------- sticky_save
  var bar = null, barButton = null, barFor = null, tick = false;
  function ownSave(f) {
    var sel = f.getAttribute('data-gk-gui-sticky-save');
    if (sel) { try { var el = f.querySelector(sel); if (el) return el; } catch (e) { /* not a selector: the default */ } }
    // else the form's one submit button that sends it to its own address (the form's own list of controls, wherever
    // they stand in it; a button with a formaction of its own sends it elsewhere); a form with more than one names
    // its Save with the mark, it is never chosen by where it stands
    var subs = Array.prototype.filter.call(f.elements, function (el) {
      return el.type === 'submit' && el.matches('input, button') && !el.hasAttribute('formaction');
    });
    return subs.length === 1 ? subs[0] : null;
  }
  function stickyForms() {
    var list = Array.prototype.slice.call(document.querySelectorAll('form[data-gk-gui-sticky-save]'));
    if (body('controller-settings')) {
      document.querySelectorAll('#content form').forEach(function (f) { if (list.indexOf(f) < 0) list.push(f); });
    }
    return list;
  }
  function makeBar() {
    bar = G.effect(N('div', 'gk-gui-stuff-savebar'), 'sticky_save');
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', G.t('savebar'));
    bar.hidden = true;
    var inner = N('div', 'gk-gui-stuff-savebar-inner');
    barButton = N('input');
    barButton.type = 'button';
    barButton.addEventListener('click', function () { if (barFor) barFor.click(); });
    inner.appendChild(barButton);
    bar.appendChild(inner);
    document.body.appendChild(bar);
  }
  function showBar(save) {
    var root = document.documentElement;
    if (!save) {
      if (bar && !bar.hidden) { bar.hidden = true; root.classList.remove('gk-gui-stuff-savebar-on'); root.style.removeProperty('--gk-gui-stuff-savebar-size'); }
      barFor = null;
      return;
    }
    if (!bar) makeBar();
    barFor = save;
    barButton.value = save.value || save.textContent.trim();
    barButton.className = save.className;
    barButton.disabled = save.disabled;
    // the bar spans the window, and its button stands at the start of the page's main part (#main), not of the content:
    // with the sidebar before the content (layout_sidebar) the button is not pushed in by the sidebar's width
    var c = (document.getElementById('content') || document.body).getBoundingClientRect();
    var m = (document.getElementById('main') || document.getElementById('content') || document.body).getBoundingClientRect();
    var rtl = document.dir === 'rtl';
    bar.style.insetInlineStart = '0';
    bar.style.inlineSize = '100%';
    bar.firstChild.style.marginInlineStart = Math.max(0, rtl ? window.innerWidth - m.right : m.left) + 'px';
    bar.firstChild.style.inlineSize = Math.max(0, rtl ? m.right - c.left : c.right - m.left) + 'px';
    if (bar.hidden) { bar.hidden = false; root.classList.add('gk-gui-stuff-savebar-on'); }
    root.style.setProperty('--gk-gui-stuff-savebar-size', bar.offsetHeight + 'px');
  }
  function placeBar() {
    tick = false;
    var vh = window.innerHeight, h = bar && !bar.hidden ? bar.offsetHeight : 0, chosen = null;
    stickyForms().forEach(function (f) {
      if (chosen || !f.offsetParent) return;
      var s = ownSave(f);
      if (!s || !s.offsetParent) return;
      var fr = f.getBoundingClientRect(), sr = s.getBoundingClientRect();
      // the form is on the screen, its own Save below the edge (or behind the bar)
      if (fr.top < vh - 60 && sr.top > vh - h - 4) chosen = s;
    });
    showBar(chosen);
  }
  function soon() { if (!tick) { tick = true; requestAnimationFrame(placeBar); } }

  // ---------------------------------------------------------------- settings_frame
  // What the frame reads: core gives the frame on /settings/plugin/<id> (its #settings with the class plugin-<id>, and
  // the box .box.tabular.settings it draws the plugin's partial in; ids and classes core sets on purpose), and every
  // thing inside is the GK plugin's own partial. In it a section is a fieldset with its caption (the fieldset's own
  // legend), a row is a table row of a tbody, a list item, a form row (p) or anything marked data-gk-gui-settings-row,
  // and the change log is the box gk_gui_stuff_changelog draws (data-gk-gui-stuff-changelog, the log's .wiki in its
  // disclosure; a plugin not yet drawing its log with the helper has its own details with the .wiki, or a .wiki
  // alone). They are found at any depth, by what they are and
  // never by how deep they stand or what stands before them, so a wrapper or another order in a partial changes
  // nothing. A partial may mark a row (data-gk-gui-settings-row) or a part to leave out (gk-gui-stuff-sf-skip).
  function frameRoots(root) {
    var out = Array.prototype.slice.call(root.querySelectorAll('[data-gk-gui-settings-frame]'));
    if (body('controller-settings') && body('action-plugin')) {
      var s = document.querySelector('#settings[class*="plugin-gk_"]');
      var r = s && (s.querySelector('.box.tabular.settings') || s.querySelector('form'));
      if (r && out.indexOf(r) < 0) out.push(r);
    }
    return out;
  }
  // the fieldset's own caption: a legend whose nearest fieldset is this one
  function legendOf(f) {
    return Array.prototype.filter.call(f.querySelectorAll('legend'), function (l) { return l.closest('fieldset') === f; })[0] || null;
  }
  // the sections of a frame: its fieldsets with a caption that stand in no other fieldset of the frame, nor in another
  // frame marked inside it
  function sectionsOf(root) {
    return Array.prototype.filter.call(root.querySelectorAll('fieldset'), function (f) {
      var up = f.parentElement && f.parentElement.closest('fieldset');
      var fr = f.closest('[data-gk-gui-settings-frame]');
      if (fr && fr !== root && root.contains(fr)) return false;
      return !(up && root.contains(up)) && !!legendOf(f);
    });
  }
  function setIcon(lg, open) {
    var old = lg.querySelector(':scope > .gk-gui-stuff-sf-chev');
    var chev = N('span', 'gk-gui-stuff-sf-chev');
    chev.setAttribute('aria-hidden', 'true');
    chev.appendChild(G.icon(open ? 'angle-down' : 'angle-right', open ? '▾' : '▸', 14));
    if (old) lg.replaceChild(chev, old); else lg.insertBefore(chev, lg.firstChild);
  }
  function fold(sec, open) {
    if (sec.own) return; // a section with a fold of its own is never folded by the frame (foldsItself)
    sec.el.classList.toggle('collapsed', !open);
    sec.body.hidden = !open;
    sec.legend.setAttribute('aria-expanded', open ? 'true' : 'false');
    setIcon(sec.legend, open);
  }
  // a section's rows: what the search shows or hides. A row inside another row is part of it (the outer one is the
  // row); a caption, a details' summary, a table's head or foot, a skipped part and a list's own filter field
  // (list_filter) are no rows. What holds no row at all (a line of text in a div) is a row of its own.
  var ROW = 'tr, li, p, [data-gk-gui-settings-row]';
  var NOT_ROW = 'legend, summary, thead, tfoot, .gk-gui-stuff-sf-skip, .gk-gui-stuff-lf-line, .gk-gui-stuff-lf';
  function rowsOf(el, out) {
    el.querySelectorAll(ROW).forEach(function (n) {
      if (n.closest(NOT_ROW)) return;
      var outer = n.parentElement && n.parentElement.closest(ROW);
      if (outer && el.contains(outer)) return;
      out.push(n);
    });
    Array.prototype.forEach.call(el.querySelectorAll('*'), function (n) {
      if (n.matches(ROW) || n.matches(NOT_ROW) || n.closest(NOT_ROW) || n.matches('input[type=hidden], br')) return;
      if (n.querySelector(ROW)) return;
      // the largest part with no row in it: outside every row, and its parent is the section or holds rows elsewhere
      if (n.closest(ROW)) return;
      var p = n.parentElement;
      if (p !== el && !p.querySelector(ROW)) return;
      if ((n.textContent || '').trim() === '' && !n.querySelector('input, select, textarea')) return; // gk-r17 P4r: the frame's parts are the GK plugin's own settings partial, and only whether a part holds any text is asked
      out.push(n);
    });
    return out;
  }
  // The settings a row's fields belong to: the first part of each field's name, settings[key] or settings[key][...]
  function keysOf(r) {
    var out = [], list = Array.prototype.slice.call(r.querySelectorAll('[name]'));
    if (r.hasAttribute('name')) list.push(r);
    list.forEach(function (f) {
      var m = /^settings\[([^\]]+)\]/.exec(f.getAttribute('name') || '');
      if (m && out.indexOf(m[1]) < 0) out.push(m[1]);
    });
    return out;
  }
  // A row of one plain setting shows its key quietly at its end (in its first cell, if it is a table's row). A row of
  // several settings, or of a setting's nested parts, shows none; the search still finds their keys.
  function showKey(r) {
    var keys = keysOf(r);
    if (keys.length !== 1 || r.querySelector('.gk-gui-stuff-sf-key')) return;
    var fields = Array.prototype.filter.call(r.querySelectorAll('[name^="settings["]'), function (f) { return f.type !== 'hidden'; });
    if (!fields.length || !fields.every(function (f) { return /^settings\[[^\]]+\](\[\])?$/.test(f.name); })) return;
    var key = G.effect(N('span', 'gk-gui-stuff-sf-key', keys[0]), 'settings_frame');
    key.dir = 'ltr';
    key.setAttribute('translate', 'no');
    (r.matches('tr') ? r.querySelector('td, th') || r : r).appendChild(key);
  }
  // The general rule against double folding: a section folds by itself when it is core's fieldset.collapsible (its
  // legend toggles it), when its legend has a toggle of its own (an onclick, aria-expanded, core's
  // icon-expanded/icon-collapsed, or a button or toggle inside it), when it is marked data-gk-gui-own-fold, or when all
  // it holds is details elements (a details folds by itself; the change log's fold is not counted, the frame takes it
  // apart and folds it per version). Such a section is never folded again by the frame.
  // The change log's own fold: the disclosure in the box gk_gui_stuff_changelog draws, or, while a plugin has not gone
  // over to the helper, its details.gk-changelog
  var LOG_MARK = '[data-gk-gui-stuff-changelog]';
  function isLogFold(d) {
    if (d.matches('details.gk-gui-stuff-disclosure') && d.closest(LOG_MARK)) return true;
    return d.matches('details.gk-changelog'); // gk-u U11: plugins that still draw their own change log fold until they move to the helper
  }
  function foldsItself(f, legend) {
    if (f.matches('.collapsible, [data-gk-gui-own-fold]')) return true;
    if (legend.hasAttribute('onclick') || legend.matches('[aria-expanded], .icon-expanded, .icon-collapsed') ||
        legend.querySelector('button, [aria-expanded], [onclick]')) return true;
    // every row it has stands in a details of its own (not the change log's)
    function inOwnDetails(n) { var d = n.closest('details'); return !!d && f.contains(d) && !isLogFold(d); }
    var rs = rowsOf(f, []);
    return rs.length > 0 && rs.every(inOwnDetails);
  }
  // the log's .wiki out of the fold it stands in, the fold taken away, so that the frame alone folds the log
  function unfold(d) {
    var dw = d && d.querySelector('.wiki');
    if (dw) { d.parentNode.insertBefore(dw, d); d.remove(); }
    return dw || null;
  }
  // the log a section holds, f being the part under its heading: first the helper's box (gk_gui_stuff_changelog, the
  // section itself or a box inside it), then a plugin's own details.gk-changelog, last a .wiki with version headings
  // ("## " lines, h2) the plugin draws open (compat)
  function changelogOf(f) {
    var box = f.closest(LOG_MARK) || f.querySelector(LOG_MARK);
    if (box) {
      // the helper's own fold is the box's first disclosure (one inside the log comes after it)
      var w = unfold(box.querySelector('details.gk-gui-stuff-disclosure'));
      if (w) return w;
    }
    var old = f.querySelector('details.gk-changelog'); // gk-u U11: plugins that still draw their own change log fold until they move to the helper
    if (old) unfold(old);
    return Array.prototype.filter.call(f.querySelectorAll('.wiki'), function (w) { return w.querySelector('h2'); })[0] || null;
  }
  function version(h) {
    var m = /(\d+)\.(\d+)\.(\d+)/.exec(h.textContent || ''); // gk-r17 P4r: the heading is a version line of the GK plugin's own change log, not core's
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  }
  // one section per version, an empty one (Unreleased with nothing yet) left out, the latest first and open. The log is
  // the plugin's own CHANGELOG as the formatter draws it: a version is an h2 and what follows it up to the next
  function shapeLog(wiki) {
    var parts = [], cur = null;
    Array.prototype.slice.call(wiki.childNodes).forEach(function (n) {
      if (n.nodeType === 1 && n.matches('h2')) { cur = { head: n, nodes: [] }; parts.push(cur); return; }
      if (cur) cur.nodes.push(n);
    });
    var before = Array.prototype.slice.call(wiki.childNodes).filter(function (n) { return !parts.some(function (p) { return p.head === n || p.nodes.indexOf(n) >= 0; }); });
    parts = parts.filter(function (p) { return p.nodes.some(function (n) { return n.nodeType === 1; }); });
    var a = parts.length > 1 && version(parts[0].head), b = parts.length > 1 && version(parts[parts.length - 1].head);
    if (a && b && (a[0] - b[0] || a[1] - b[1] || a[2] - b[2]) < 0) parts.reverse();
    wiki.textContent = '';
    before.forEach(function (n) { wiki.appendChild(n); });
    parts.forEach(function (p, i) {
      var d = N('details', 'gk-gui-stuff-sf-version');
      if (i === 0) d.open = true;
      var s = N('summary');
      s.appendChild(p.head);
      d.appendChild(s);
      p.nodes.forEach(function (n) { d.appendChild(n); });
      wiki.appendChild(d);
    });
  }
  function frame(root) {
    if (root.dataset.gkGuiFrame) return;
    var fs = sectionsOf(root);
    if (!fs.length) return;
    root.dataset.gkGuiFrame = '1';
    var secs = fs.map(function (f) {
      var legend = legendOf(f);
      // One fold, never two on top of each other: a section that already folds by itself keeps its own fold and gets
      // none from the frame. The search still reaches its settings (it shows or hides the section and its rows).
      if (foldsItself(f, legend)) return { el: f, legend: legend, body: f, own: true, log: false, title: norm(legend.textContent) };
      // what is under the heading in one part that folds; the fields stay where they are in the form
      var inner = N('div', 'gk-gui-stuff-sf-body');
      Array.prototype.slice.call(f.childNodes).forEach(function (n) { if (!n.contains(legend)) inner.appendChild(n); });
      f.appendChild(inner);
      f.classList.add('gk-gui-stuff-sf-section');
      legend.classList.add('gk-gui-stuff-sf-legend');
      legend.setAttribute('role', 'button');
      legend.tabIndex = 0;
      var log = changelogOf(inner);
      if (log) shapeLog(log);
      var sec = { el: f, legend: legend, body: inner, log: !!log, title: norm(legend.textContent) };
      function flip() { fold(sec, sec.body.hidden); remember(); }
      legend.addEventListener('click', flip);
      legend.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
      return sec;
    });
    secs.forEach(function (s) { rowsOf(s.body, []).forEach(showKey); });
    var plain = secs.filter(function (s) { return !s.log && !s.own; });
    secs.forEach(function (s) { fold(s, !s.log && plain.length === 1); });
    // the boxes open or folded as they were left on this page the last time, in this browser (localStorage, per path);
    // the search never changes what is remembered
    var memo = 'sf:' + location.pathname;
    function remember() { var m = {}; secs.forEach(function (s) { if (!s.own) m[s.title] = !s.body.hidden; }); G.set(memo, JSON.stringify(m)); }
    try { var was = JSON.parse(G.get(memo) || 'null'); if (was) secs.forEach(function (s) { if (Object.prototype.hasOwnProperty.call(was, s.title)) fold(s, !!was[s.title]); }); } catch (e) { /* nothing remembered */ }

    var barEl = G.effect(N('div', 'gk-gui-stuff-sf-bar'), 'settings_frame');
    var input = N('input', 'gk-gui-stuff-sf-input');
    input.type = 'search';
    input.autocomplete = 'off';
    input.placeholder = G.t('sf_placeholder');
    input.setAttribute('aria-label', G.t('sf_label'));
    var count = N('span', 'gk-gui-stuff-sf-count');
    count.setAttribute('aria-live', 'polite');
    var openAll = N('a', 'gk-gui-stuff-sf-all', G.t('sf_open_all'));
    var closeAll = N('a', 'gk-gui-stuff-sf-all', G.t('sf_close_all'));
    [openAll, closeAll].forEach(function (a, i) {
      a.href = '#';
      a.setAttribute('role', 'button');
      a.addEventListener('click', function (e) { e.preventDefault(); clear(); secs.forEach(function (s) { fold(s, i === 0); }); remember(); });
    });
    barEl.appendChild(input);
    barEl.appendChild(count);
    barEl.appendChild(openAll);
    barEl.appendChild(document.createTextNode(' | '));
    barEl.appendChild(closeAll);
    root.parentNode.insertBefore(barEl, root);

    var saved = null, rowsCache = null;
    function rows() {
      if (!rowsCache) rowsCache = secs.map(function (s) { return rowsOf(s.body, []); });
      return rowsCache;
    }
    function clear() {
      if (input.value) input.value = '';
      root.querySelectorAll('.gk-gui-stuff-sf-miss').forEach(function (n) { n.classList.remove('gk-gui-stuff-sf-miss'); });
      if (saved) { secs.forEach(function (s, i) { fold(s, saved[i].open); s.body.querySelectorAll('details').forEach(function (d, j) { d.open = saved[i].details[j]; }); }); saved = null; }
      count.textContent = '';
    }
    function search() {
      var ws = words(input.value);
      if (!ws.length) { clear(); return; }
      if (!saved) saved = secs.map(function (s) { return { open: !s.body.hidden, details: Array.prototype.map.call(s.body.querySelectorAll('details'), function (d) { return d.open; }) }; });
      var hits = 0, all = rows();
      secs.forEach(function (s, i) {
        var whole = hit(s.title, ws), any = whole;
        all[i].forEach(function (r) {
          var t = r.textContent || '';
          r.querySelectorAll('input[type=text], input[type=search], input:not([type]), option:checked').forEach(function (x) { t += ' ' + (x.value || x.textContent); });
          keysOf(r).forEach(function (k) { t += ' ' + k + ' ' + k.replace(/_/g, ' '); });
          t += ' ' + (r.getAttribute('data-gk-gui-search') || '');
          var ok = whole || hit(norm(t), ws);
          r.classList.toggle('gk-gui-stuff-sf-miss', !ok);
          if (ok && !whole) { hits++; any = true; }
        });
        // a version of the change log with a hit opens
        s.body.querySelectorAll('details').forEach(function (d) {
          d.open = whole || all[i].some(function (r) { return d.contains(r) && !r.classList.contains('gk-gui-stuff-sf-miss'); });
        });
        if (whole) hits++;
        s.el.classList.toggle('gk-gui-stuff-sf-miss', !any);
        fold(s, any);
      });
      count.textContent = hits ? G.t('sf_hits', { count: hits }) : G.t('sf_none');
    }
    input.addEventListener('input', search);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') e.preventDefault();
      if (e.key === 'Escape' && input.value) { e.preventDefault(); clear(); }
    });
    var m = /[#&]gk-find=([^&]*)/.exec(window.location.hash);
    if (m) { try { input.value = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { input.value = m[1]; } search(); }
  }

  // ---------------------------------------------------------------- attachment_sizes
  var SIZES_KB = [[5, 'mb'], [20, 'mb'], [100, 'mb'], [1, 'gb']];
  function sizes(root) {
    if (!body('controller-settings')) return;
    root.querySelectorAll('#settings_attachment_max_size, #settings_bulk_download_max_size').forEach(function (field) {
      if (field.dataset.gkGuiSizes) return;
      field.dataset.gkGuiSizes = '1';
      var o = G.opt('attachment_sizes'), row = G.effect(N('span', 'gk-gui-stuff-sizes'), 'attachment_sizes');
      var buttons = SIZES_KB.map(function (s) {
        var kb = s[0] * (s[1] === 'gb' ? 1048576 : 1024), label = s[0] + ' ' + (o[s[1]] || s[1].toUpperCase());
        var b = N('button', 'gk-gui-stuff-size', label);
        b.type = 'button';
        b.title = G.t('size_fill', { size: label, kb: kb });
        b.addEventListener('click', function () {
          field.value = String(kb);
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
          mark();
        });
        b._kb = kb;
        row.appendChild(b);
        return b;
      });
      function mark() { buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(field.value).trim() === String(b._kb) ? 'true' : 'false'); }); }
      field.addEventListener('input', mark);
      mark();
      // after core's unit, at the end of the field's form row (the nearest p around it, however core wraps the field)
      (field.closest('p') || field.parentNode).appendChild(row);
    });
  }

  G.onContent(function (root) {
    if (FRAME) frameRoots(root).forEach(frame);
    if (SIZES) sizes(root);
    if (STICKY) soon();
  });
  if (STICKY) {
    window.addEventListener('scroll', soon, { passive: true });
    window.addEventListener('resize', soon);
    // a tab of core's settings shown, a box folded or unfolded
    document.addEventListener('click', function () { setTimeout(soon, 0); }, true);
  }
})();
