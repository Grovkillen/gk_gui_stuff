// gk_gui_stuff sticky_save, settings_frame and attachment_sizes: long settings pages.
// sticky_save: a long form keeps its one Save in reach. While the form is on the screen and its own Save is below the
// screen's edge, a bar at the bottom of the window holds a button with the same word that presses the form's own
// Save (so the form is sent exactly as by that button, with its name, its reason field and every script on it).
// There is still one Save; the bar is only where it can be reached. On core's settings (every tab, and every
// plugin's Configure page) by itself; any other form asks with data-gk-gui-sticky-save (its value, if any, a selector
// for the form's own Save; else the form's last submit button standing directly in it). While the bar shows, the
// page's root has the class gk-gui-stuff-savebar-on and --gk-gui-stuff-savebar-size (its height), so that what stands
// at the bottom of the window (the notices) stands above it.
// settings_frame: the Configure page of every GK plugin (Administration > Plugins, /settings/plugin/gk_*) and any
// element marked data-gk-gui-settings-frame. Its boxes start folded under their headings (a page with one box keeps
// it open), or as they were left on the page the last time in this browser, a search field above them finds settings by their label and help text (the boxes with a hit open, the
// rows without one hide) and the change log is folded, with one section per version, the latest first and open.
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
    var subs = f.querySelectorAll(':scope > input[type=submit], :scope > button[type=submit], :scope > button:not([type])');
    return subs.length ? subs[subs.length - 1] : null;
  }
  function stickyForms() {
    var list = Array.prototype.slice.call(document.querySelectorAll('form[data-gk-gui-sticky-save]'));
    if (body('controller-settings')) {
      document.querySelectorAll('#content form').forEach(function (f) { if (list.indexOf(f) < 0) list.push(f); });
    }
    return list;
  }
  function makeBar() {
    bar = N('div', 'gk-gui-stuff-savebar');
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
  function frameRoots(root) {
    var out = Array.prototype.slice.call(root.querySelectorAll('[data-gk-gui-settings-frame]'));
    if (body('controller-settings') && body('action-plugin')) {
      var s = document.querySelector('#settings[class*="plugin-gk_"]');
      var r = s && (s.querySelector('form > .box.tabular.settings') || s.querySelector('form'));
      if (r && out.indexOf(r) < 0) out.push(r);
    }
    return out;
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
  // a section's rows: what the search shows or hides. A table's rows, a list's items, a form row, a box's line.
  function rowsOf(el, out) {
    Array.prototype.forEach.call(el.children, function (n) {
      // a list's own filter field (list_filter) is not a setting
      if (n.tagName === 'LEGEND' || n.matches('.gk-gui-stuff-sf-skip, .gk-gui-stuff-lf-line, .gk-gui-stuff-lf, input[type=hidden]')) return;
      if (n.tagName === 'TABLE') { Array.prototype.forEach.call(n.tBodies, function (b) { Array.prototype.forEach.call(b.rows, function (r) { out.push(r); }); }); return; }
      if (n.tagName === 'UL' || n.tagName === 'OL') { n.querySelectorAll('li').forEach(function (li) { out.push(li); }); return; }
      if (n.tagName === 'DETAILS') { rowsOf(n, out); return; }
      if (n.tagName === 'SUMMARY') return;
      if (n.tagName === 'FIELDSET' || (n.tagName === 'DIV' && n.querySelector(':scope > p, :scope > table, :scope > ul, :scope > details, :scope > div'))) { rowsOf(n, out); return; }
      out.push(n);
    });
    return out;
  }
  // The general rule against double folding: a section folds by itself when it is core's fieldset.collapsible (its
  // legend toggles it), when its legend has a toggle of its own (an onclick, aria-expanded, core's
  // icon-expanded/icon-collapsed, or a button or toggle inside it), when it is marked data-gk-gui-own-fold, or when all
  // it holds is details elements (a details folds by itself; the change log's details.gk-changelog is not counted, the
  // frame takes it apart and folds it per version). Such a section is never folded again by the frame.
  function foldsItself(f, legend) {
    if (f.matches('.collapsible, [data-gk-gui-own-fold]')) return true;
    if (legend.hasAttribute('onclick') || legend.matches('[aria-expanded], .icon-expanded, .icon-collapsed') ||
        legend.querySelector('button, [aria-expanded], [onclick]')) return true;
    var kids = Array.prototype.filter.call(f.children, function (n) { return n !== legend && !n.matches('input[type=hidden]'); });
    return kids.length > 0 && kids.every(function (n) { return n.tagName === 'DETAILS' && !n.classList.contains('gk-changelog'); });
  }
  function changelogOf(f) {
    // a plugin's page folds its change log by itself (details.gk-changelog, also without this module): the frame takes
    // the log out of it and folds it per version as before
    var d = f.querySelector(':scope > details.gk-changelog');
    if (d) {
      var dw = d.querySelector(':scope > div.wiki');
      if (dw) { d.parentNode.insertBefore(dw, d); d.remove(); }
    }
    var w = f.querySelector(':scope > div.wiki');
    return w && w.querySelector(':scope > h2') ? w : null;
  }
  function version(h) {
    var m = /(\d+)\.(\d+)\.(\d+)/.exec(h.textContent || '');
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  }
  // one section per version, an empty one (Unreleased with nothing yet) left out, the latest first and open
  function shapeLog(wiki) {
    var parts = [], cur = null;
    Array.prototype.slice.call(wiki.childNodes).forEach(function (n) {
      if (n.nodeType === 1 && n.tagName === 'H2') { cur = { head: n, nodes: [] }; parts.push(cur); return; }
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
    var fs = Array.prototype.filter.call(root.children, function (n) { return n.tagName === 'FIELDSET' && n.querySelector(':scope > legend'); });
    if (!fs.length) return;
    root.dataset.gkGuiFrame = '1';
    var secs = fs.map(function (f) {
      var legend = f.querySelector(':scope > legend');
      // One fold, never two on top of each other: a section that already folds by itself keeps its own fold and gets
      // none from the frame. The search still reaches its settings (it shows or hides the section and its rows).
      if (foldsItself(f, legend)) return { el: f, legend: legend, body: f, own: true, log: false, title: norm(legend.textContent) };
      // what is under the heading in one part that folds; the fields stay where they are in the form
      var inner = N('div', 'gk-gui-stuff-sf-body');
      Array.prototype.slice.call(f.childNodes).forEach(function (n) { if (n !== legend) inner.appendChild(n); });
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
    var plain = secs.filter(function (s) { return !s.log && !s.own; });
    secs.forEach(function (s) { fold(s, !s.log && plain.length === 1); });
    // the boxes open or folded as they were left on this page the last time, in this browser (localStorage, per path);
    // the search never changes what is remembered
    var memo = 'sf:' + location.pathname;
    function remember() { var m = {}; secs.forEach(function (s) { if (!s.own) m[s.title] = !s.body.hidden; }); G.set(memo, JSON.stringify(m)); }
    try { var was = JSON.parse(G.get(memo) || 'null'); if (was) secs.forEach(function (s) { if (Object.prototype.hasOwnProperty.call(was, s.title)) fold(s, !!was[s.title]); }); } catch (e) { /* nothing remembered */ }

    var barEl = N('div', 'gk-gui-stuff-sf-bar');
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
      var o = G.opt('attachment_sizes'), row = N('span', 'gk-gui-stuff-sizes');
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
      // after core's unit, at the end of the row
      field.parentNode.appendChild(row);
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
