// gk_gui_stuff: the first users of the shared elements, each a module switched on its own.
//   wave            core's "sparat" as a wave; SPARAR when a form is sent, taken over by the next page; LADDAR when a page is slow
//   corner          the fold on the issue page when the issue changed since it was loaded (the heartbeat)
//   history_navigator  Snabbhopp: jump in the issue's history (g opens, j/n next, k/p previous note)
//   actions_menu    registered rows in core's three-dot menu, in sections; a menu without rows is hidden
//   fullscreen      a view state: only the content, remembered per user on the server
//   branch_jump     the separator in the project breadcrumb opens the branch of the project tree
(function () {
  var G = window.GkGui;
  if (!G || !G.surface) return;
  var N = G.node, root = G.cfg.urlRoot || '', page = G.cfg.page || {};
  function typing(e) { var t = e.target; return /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable; }
  function token() { var m = document.querySelector('meta[name="csrf-token"]'); return m ? m.content : ''; }
  function ss(k, v) { try { if (v === undefined) return window.sessionStorage.getItem('gkguistuff.' + k); if (v === null) window.sessionStorage.removeItem('gkguistuff.' + k); else window.sessionStorage.setItem('gkguistuff.' + k, v); } catch (e) { return null; } }

  // ------------------------------------------------------------------ wave
  if (G.on('wave')) {
    var o = G.opt('wave');
    // takeover: the page we came from started a wave (SPARAR). The body's first script has read what was handed
    // over (window.gkGuiStuffWaveHanded) and, when the word had already shown there, drawn the wave standing. This
    // script runs in the head, before that, so everything about the takeover is read when the page stands.
    var handed = null, outcome = null, fresh = false, carried = false;
    // The page that sent the form left the wave's whole state in the tab (word, outcome words, tone, line, whether it
    // was closed, when the page was left); the body's first script drew it as it stood and glided to the outcome the
    // server put in the page (window.gkGuiStuffWaveOutcome). Fresh counts from the leaving, so a run of minutes is the
    // same wave.
    function takeOver() {
      handed = window.gkGuiStuffWaveHanded || null;
      if (window.gkGuiStuffWaveHanded === undefined) { try { handed = JSON.parse(ss('wave') || 'null'); } catch (e) { handed = null; } }
      ss('wave', null);
      outcome = window.gkGuiStuffWaveOutcome || null;
      fresh = !!handed && (Date.now() - (handed.left || handed.at)) < 30000;
      carried = fresh && !!document.querySelector('#gk-gui-stuff-wave.gk-gui-stuff-wave-born, #gk-gui-stuff-wave[data-carried]');
    }
    function count(word) { var n = parseInt(G.get('wave.n.' + word) || '0', 10) + 1; G.set('wave.n.' + word, String(n)); return n; }
    function doneMs(word) { return Math.max(count(word) <= 10 ? (o.first_ms || 1600) : (o.ms || 600), o.min_ms || 0); }
    function flash() { return document.querySelector('#content > .flash.notice, #flash_notice'); }
    function failure() { return document.querySelector('#content > .flash.error, #flash_error'); }
    // the message's own words, without what other modules put in the box (the countdown, the cross)
    function said(f) { var c = f.cloneNode(true); c.querySelectorAll('.gk-gui-stuff-flash-tools').forEach(function (x) { x.remove(); }); return c.textContent.trim().slice(0, 80); }
    // The outcome for a reload: kept in localStorage with this tab's id and the request's, short, read once
    function tabId() { var t = ss('tab'); if (!t) { t = Math.random().toString(36).slice(2); ss('tab', t); } return t; }
    function remember(word, level, text) {
      try { window.localStorage.setItem('gkguistuff.outcome', JSON.stringify({ tab: tabId(), req: handed && handed.req, url: location.href, word: word, level: level, text: text, until: Date.now() + 60000 })); } catch (e) { /* no memory */ }
    }
    function recalled() {
      var r = null;
      try { r = JSON.parse(window.localStorage.getItem('gkguistuff.outcome') || 'null'); window.localStorage.removeItem('gkguistuff.outcome'); } catch (e) { r = null; }
      var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
      return r && r.tab === tabId() && r.url === location.href && r.until > Date.now() && nav.type === 'reload' ? r : null;
    }
    function asNotice(word, level, text) {
      if (!G.notice || !G.notice.show) return;
      G.notice.show({ level: level === 'error' ? 'alarm' : 'info', text: String(word).toUpperCase() + (text ? ': ' + text : ''), life: level === 'error' ? 'sticky' : undefined });
    }
    // a wave born with the page that nothing takes over (no outcome to show) just fades
    function carryOff() { var w = document.getElementById('gk-gui-stuff-wave'); if (w && !carried) w.classList.remove('gk-gui-stuff-wave-on'); }
    function arrive() {
      takeOver();
      var good = flash(), bad = failure(), box = bad || good;
      var level = bad ? 'error' : 'done';
      var word = handed ? (bad ? handed.failed || o.failed : handed.done) : (bad ? o.failed : o.saved);
      if (box && o.hide_flash) box.classList.add('gk-gui-stuff-flash-waved');
      if (fresh && box) {
        box.dataset.gkGuiStuffWave = '1';
        var text = said(box);
        if (handed.dismissed) { asNotice(word, level, text); remember(word, level, text); return; }
        // the wave the first script drew is adopted as it stands (already in the outcome's state): nothing blinks;
        // FEL stays until closed, the done word for its time
        G.wave.show({ word: word, text: text, level: level, duration: bad ? 0 : doneMs(word), since: handed.at });
        remember(word, level, text);
        return;
      }
      if (carried) { G.wave.hide(); return; } // no outcome on this page: the wave fades
      carryOff();
      // a reload of the page that showed an outcome shows it once more, as a notice
      var r = !box && recalled();
      if (r) { asNotice(r.word, r.level, r.text); return; }
      // a message with no form sent before it (a link, a redirect): the old way, the done word or FEL
      if (box && !box.dataset.gkGuiStuffWave) {
        box.dataset.gkGuiStuffWave = '1';
        if (bad) G.wave.show({ word: o.failed, text: said(bad), level: 'error', duration: 0 });
        else G.wave.show({ word: o.saved, text: said(good), level: 'done', duration: doneMs(o.saved) });
      }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrive); else arrive();
    // the state goes on with the tab: when the person closes the wave, and when the page is left (the time counts)
    function touch(fn) { var w = null; try { w = JSON.parse(ss('wave') || 'null'); } catch (e) { w = null; } if (w) { fn(w); ss('wave', JSON.stringify(w)); } }
    document.addEventListener('gk-gui-stuff:wave-closed', function () { touch(function (w) { w.dismissed = true; }); });
    window.addEventListener('pagehide', function () { touch(function (w) { w.left = Date.now(); }); });
    // entry intent: a form that saves says SPARAR and hands over; GET forms (filters, search) say nothing
    document.addEventListener('submit', function (e) {
      var f = e.target;
      if (!f || f.id === 'sudo-form' || (f.method || '').toLowerCase() !== 'post' || f.dataset.remote === 'true' || e.defaultPrevented) return;
      var del = (f.querySelector('input[name="_method"]') || {}).value === 'delete';
      var pair = del ? [o.deleting, o.deleted] : [o.saving, o.saved];
      // A form says what it does. data-gk-gui-stuff-wave-word (the waiting word), -done (the outcome), -level (running:
      // the yellow tone while it runs) and -text (the line under the word), on the button that sent it or the form;
      // data-gk-gui-stuff-wave="none": no wave. Forms of core's that are not a save are known by their address (G.opt
      // wave.forms).
      var b = e.submitter && e.submitter.dataset ? e.submitter.dataset : {}, d = f.dataset || {};
      var known = (o.forms || []).filter(function (x) { return new RegExp(x.match).test(f.getAttribute('action') || ''); })[0] || {};
      if ((b.gkGuiStuffWave || d.gkGuiStuffWave) === 'none' || known.none) return;
      var word = b.gkGuiStuffWaveWord || d.gkGuiStuffWaveWord || known.word || pair[0], done = b.gkGuiStuffWaveDone || d.gkGuiStuffWaveDone || known.done || pair[1];
      var lvl = b.gkGuiStuffWaveLevel || d.gkGuiStuffWaveLevel || known.level || 'done', text = b.gkGuiStuffWaveText || d.gkGuiStuffWaveText || '';
      var failed = b.gkGuiStuffWaveFailed || d.gkGuiStuffWaveFailed || o.failed;
      ss('wave', JSON.stringify({ word: word, done: done, failed: failed, level: lvl, text: text, at: Date.now(), req: Math.random().toString(36).slice(2) }));
      // the start delay: a save that answers at once never shows the waiting word, only the outcome
      setTimeout(function () { G.wave.show({ word: word, text: text, level: lvl, waiting: true, duration: 0 }); }, o.start_delay || 0);
    }, false);
    // loading: only when the page really leaves and the next one is slow. The browser says when it leaves
    // (beforeunload); a click says nothing, for many links never leave the page (core's row menu, a tab, a
    // dialog). A download also begins as a leaving but never arrives anywhere, so those links are left out,
    // and LADDAR gives up by itself.
    var loadTimer = null, noLeave = 0;
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (a && (a.hasAttribute('download') || /\/attachments\/download\//.test(a.getAttribute('href')) || /^(mailto|tel|msteams):/.test(a.getAttribute('href')) || /\.(csv|pdf|atom|zip)(\?|$)/.test(a.getAttribute('href')))) noLeave = Date.now();
    }, true);
    window.addEventListener('beforeunload', function () {
      if (Date.now() - noLeave < 1500) return;
      if (document.querySelector('.gk-gui-stuff-wave-on')) return; // SPARAR already stands: never a second word
      clearTimeout(loadTimer);
      loadTimer = setTimeout(function () {
        G.wave.show({ word: o.loading, level: 'loading', duration: 0 });
        setTimeout(function () { G.wave.hide(true); }, 15000);
      }, o.loading_delay || 1300);
    });
    window.addEventListener('pageshow', function () { clearTimeout(loadTimer); if (!fresh) G.wave.hide(); });
    window.addEventListener('pagehide', function () { clearTimeout(loadTimer); });
  }

  // ------------------------------------------------------------------ the outcome as a notice
  // With the wave off for the person, a form that was sent says its outcome in the corner: the done word (SPARAT,
  // KLART) briefly, FEL (alarm) until it is closed. The words come from the form (data-gk-gui-stuff-wave-done, -failed)
  // as for the wave.
  if (!G.on('wave') && G.notice && G.notice.show) {
    document.addEventListener('submit', function (e) {
      var f = e.target;
      if (!f || f.id === 'sudo-form' || (f.method || '').toLowerCase() !== 'post' || f.dataset.remote === 'true' || e.defaultPrevented) return;
      var b = e.submitter && e.submitter.dataset ? e.submitter.dataset : {}, d = f.dataset || {};
      if ((b.gkGuiStuffWave || d.gkGuiStuffWave) === 'none') return;
      var del = (f.querySelector('input[name="_method"]') || {}).value === 'delete';
      ss('outcome', JSON.stringify({ done: b.gkGuiStuffWaveDone || d.gkGuiStuffWaveDone || G.t(del ? 'wave_deleted' : 'wave_saved'),
                                     failed: b.gkGuiStuffWaveFailed || d.gkGuiStuffWaveFailed || G.t('wave_failed'), at: Date.now() }));
    }, false);
    var told = function () {
      var h = null;
      try { h = JSON.parse(ss('outcome') || 'null'); } catch (e) { h = null; }
      ss('outcome', null);
      if (!h || Date.now() - h.at > 30000) return;
      var bad = document.querySelector('#content > .flash.error, #flash_error'), good = document.querySelector('#content > .flash.notice, #flash_notice');
      // the message's own words, without what flash_timeout put in it (the countdown and the cross)
      var words = function (el) { var c = el.cloneNode(true); c.querySelectorAll('.gk-gui-stuff-flash-tools').forEach(function (x) { x.remove(); }); return c.textContent.trim().slice(0, 160); };
      if (bad) G.notice.show({ level: 'alarm', text: String(h.failed).toUpperCase() + ': ' + words(bad), life: 'sticky' });
      else if (good) G.notice.show({ level: 'notice', text: String(h.done).toUpperCase() + ': ' + words(good) });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', told); else told();
  }

  // ------------------------------------------------------------------ heartbeat and corner
  if (G.on('corner') && page.kind === 'issue' && (G.opt('beat').seconds || 0) > 0) {
    var seen = [], since = page.at, gone = false;
    function took(d) {
      if (!d) return;
      since = d.at;
      if (!d.changes || !d.changes.length) return;
      seen = seen.concat(d.changes); gone = false;
      G.corner.show({
        count: seen.length, entries: seen, level: d.mine ? 'notice' : 'info',
        onDismiss: function () { seen = []; gone = true; },
        onReload: function () {
          // only text the person has written since the page came (the description is in the form from the start)
          var changed = Array.prototype.some.call(document.querySelectorAll('#issue-form textarea, #issue-form input[type=text]'), function (t) { return t.value !== t.defaultValue; });
          if (changed && !window.confirm(G.t('reload_unsaved'))) return;
          location.reload();
        }
      });
    }
    function beat() {
      if (document.hidden) return; // a page nobody looks at asks nothing
      fetch(root + '/gk_gui_stuff/beat?kind=issue&id=' + page.id + '&since=' + encodeURIComponent(since), { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(took).catch(function () { /* next beat */ });
    }
    // The heartbeat is a part of the shared pulse when there is one (one request for every plugin)
    function startBeat() {
      if (window.gkGuiStuffPulse) {
        window.gkGuiStuffPulse.add('corner', { collect: function () { return { kind: 'issue', id: page.id, since: since }; }, handle: took });
        return;
      }
      setInterval(beat, Math.max(10, G.opt('beat').seconds) * 1000);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) beat(); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startBeat); else startBeat();
  }

  // ------------------------------------------------------------------ history_navigator (Snabbhopp)
  var actions = G.actions; // shared: plugins add theirs (GkGui.actions.<name> = function (link) {})
  if (G.on('history_navigator') && page.kind === 'issue') {
    function notes() {
      return Array.prototype.map.call(document.querySelectorAll('#history .journal'), function (j) {
        // core's header without the avatar and the note's own menu; the number from the note's anchor
        var info = j.querySelector('.journal-info') || j.querySelector('h4');
        var who = '';
        if (info) { var c = info.cloneNode(true); c.querySelectorAll('.avatar, .journal-actions, .drdn, img').forEach(function (x) { x.remove(); }); who = c.textContent.replace(/\s+/g, ' ').trim(); }
        var noteEl = j.querySelector('[id^="note-"]');
        var num = noteEl ? '#' + noteEl.id.slice(5) : '';
        var wiki = j.querySelector('.wiki');
        var text = wiki ? wiki.textContent.trim().replace(/\s+/g, ' ') : '';
        var details = Array.prototype.map.call(j.querySelectorAll('ul.journal-details li, ul.details li'), function (li) { return li.textContent.replace(/\s+/g, ' ').trim(); });
        return { el: j, label: (num + ' ' + who).trim().slice(0, 90),
                 hint: text ? text.slice(0, 110) : (details[0] || '').slice(0, 110) + (details.length > 1 ? ' ' + G.t('and_more', { count: details.length - 1 }) : ''),
                 search: text + ' ' + details.join(' '), anchor: noteEl ? '#' + noteEl.id : null, note: !!text };
      });
    }
    function go(item) {
      if (!item) return;
      // a jump unfolds the note one lands in
      var folded = item.el.querySelector('.gk-gui-stuff-fold'), btn = item.el.querySelector('.gk-gui-stuff-fold-btn');
      if (folded && btn) btn.click();
      item.el.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      item.el.classList.add('gk-gui-stuff-hn-at');
      setTimeout(function () { item.el.classList.remove('gk-gui-stuff-hn-at'); }, 1800);
      if (item.anchor && item.anchor.indexOf('#') >= 0) history.replaceState(null, '', item.anchor.slice(item.anchor.indexOf('#')));
    }
    function current(list) {
      var best = -1;
      list.forEach(function (n, i) { if (n.el.getBoundingClientRect().top < 120) best = i; });
      return best;
    }
    actions.history = function () {
      var list = notes();
      if (!list.length) { G.notice.show({ level: 'info', text: G.t('hn_empty') }); return; }
      G.palette.open({ title: G.t('hn_title'), placeholder: G.t('hn_placeholder'), items: list, start: Math.max(0, current(list)), onPick: go });
    };
    document.addEventListener('keydown', function (e) {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey || G.surface.count()) return;
      var list;
      if (e.key === 'g') { e.preventDefault(); actions.history(); }
      else if (e.key === 'j' || e.key === 'n') { list = notes().filter(function (n) { return n.note; }); var c = list.filter(function (n) { return n.el.getBoundingClientRect().top > 130; })[0]; if (c) { e.preventDefault(); go(c); } }
      else if (e.key === 'k' || e.key === 'p') { list = notes().filter(function (n) { return n.note; }); var b = list.filter(function (n) { return n.el.getBoundingClientRect().top < -10; }).pop(); if (b) { e.preventDefault(); go(b); } }
    });
  }

  // ------------------------------------------------------------------ fullscreen (view_state)
  if (G.on('fullscreen')) {
    var view = G.cfg.view || {};
    function apply(v) { document.documentElement.classList.toggle('gk-gui-stuff-fullscreen', v === 'on'); }
    apply(view.fullscreen);
    actions.fullscreen = function () {
      var next = document.documentElement.classList.contains('gk-gui-stuff-fullscreen') ? 'off' : 'on';
      apply(next);
      var body = new URLSearchParams({ key: 'fullscreen', value: next });
      fetch(root + '/gk_gui_stuff/view_state', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': token(), 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
        .then(function (r) { if (!r.ok) G.notice.show({ level: 'warning', text: G.t('view_not_saved') }); });
    };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !G.surface.count() && document.documentElement.classList.contains('gk-gui-stuff-fullscreen') && !typing(e)) actions.fullscreen(); });
  }

  // ------------------------------------------------------------------ layout: the sidebar's place, the header's height
  (G.cfg.layout || []).forEach(function (k) { document.documentElement.classList.add(k); });

  // ------------------------------------------------------------------ the project menu as icons
  // A tab with an icon shows the icon only; its name stays for screen readers (aria-label) and as tooltip. Core draws
  // its project tabs without icons in every series, so they get one from core's sprite here, an icon every supported
  // series has; a tab with no such icon (Kalender) keeps its text.
  var TAB_ICONS = { 'overview': 'project', 'activity': 'history', 'roadmap': 'package', 'issues': 'issue', 'new-issue-sub': 'add',
                    'new-object': 'add', 'time-entries': 'time', 'gantt': 'stats', 'news': 'news', 'documents': 'document', 'wiki': 'wiki-page',
                    'boards': 'comments', 'files': 'file', 'repository': 'changeset', 'settings': 'settings' };
  // tabs_icons: both (icon and text) or icon (the icon only); as Redmine it is not set
  if (G.cfg.tabs_icons) {
    if (G.cfg.tabs_icons === 'icon') document.documentElement.classList.add('gk-gui-stuff-main-menu-icons');
    document.querySelectorAll('#main-menu li a').forEach(function (a) {
      var name = null;
      Object.keys(TAB_ICONS).forEach(function (k) { if (!name && a.classList.contains(k)) name = TAB_ICONS[k]; });
      if (!a.querySelector('svg') && name) {
        var ico = G.icon(name, '', 18), bare = a.textContent.trim();
        if (ico && ico.nodeType === 1 && bare) {
          a.textContent = '';
          a.appendChild(ico);
          a.appendChild(N('span', 'icon-label', bare));
        }
      }
      var span = a.querySelector('.icon-label'), text = (span || a).textContent.trim();
      if (!a.querySelector('svg') || !span || !text) { a.classList.add('gk-gui-stuff-keeps-text'); return; }
      if (G.cfg.tabs_icons !== 'icon') return; // icon and text: the name is on the tab already
      a.setAttribute('aria-label', text);
      if (!a.title) a.title = text;
    });
  }

  // ------------------------------------------------------------------ actions_menu
  // A three-dot menu without a row for the reader is hidden instead of opening an empty list: core's menu (its rows
  // can be hidden by declutter or moved out) and ours. Decided when the page is drawn and again when a row comes or
  // goes; a row moved out can be moved back under My account.
  function menuRows(items) {
    return Array.prototype.filter.call(items.children, function (c) {
      return c.tagName !== 'HR' && !c.classList.contains('gk-gui-stuff-menu-line') && window.getComputedStyle(c).display !== 'none';
    }).length;
  }
  function menuFit(drdn) {
    var items = drdn.querySelector('.drdn-items');
    if (!items) return;
    var empty = !menuRows(items);
    drdn.style.display = empty ? 'none' : '';
    if (empty) drdn.classList.remove('expanded');
  }
  function menuWatch() {
    document.querySelectorAll('#content > .contextual .drdn').forEach(function (drdn) {
      menuFit(drdn);
      var items = drdn.querySelector('.drdn-items');
      if (!items || items.dataset.gkGuiStuffMenuWatch) return;
      items.dataset.gkGuiStuffMenuWatch = '1';
      new MutationObserver(function () { menuFit(drdn); }).observe(items, { childList: true });
    });
  }
  if (G.on('actions_menu')) G.onContent(menuWatch);
  // Core's own buttons the person sees with the icon only (core_icons, Menu.core_icon_selectors): the text is kept for
  // screen readers (aria-label) and as tooltip, and hidden on the page
  function iconOnly(a) {
    if (a.dataset.gkGuiStuffIconOnly || !a.querySelector('svg')) return; // a button without an icon keeps its text
    var span = a.querySelector('.icon-label'), text = (span || a).textContent.trim();
    if (!span || !text) return;
    a.dataset.gkGuiStuffIconOnly = '1';
    a.classList.add('icon-only');
    span.hidden = true;
    a.setAttribute('aria-label', text);
    if (!a.title) a.title = text;
  }
  function coreIcons() {
    // the selectors are in full (Menu::CORE_BUTTONS), so buttons outside the page's own links are found too
    // a core link an older series draws without its icon gets the icon compat drew, only for a button the person sees as
    // an icon (core_fill is empty otherwise), so the text stays as the series has it
    (G.cfg.core_fill || []).forEach(function (f) {
      document.querySelectorAll(f.sel).forEach(function (a) {
        if (a.querySelector('svg')) return;
        var text = a.textContent.trim();
        if (!text) return;
        a.textContent = '';
        a.classList.add('icon');
        a.insertAdjacentHTML('afterbegin', f.svg);
        a.appendChild(N('span', 'icon-label', text));
        if (f.only) iconOnly(a); // icon and text keeps the text
      });
    });
    (G.cfg.core_icons || []).forEach(function (sel) { document.querySelectorAll(sel).forEach(iconOnly); });
    // the area's buttons to the right as icons only (Menu.icons), every plugin's and core's, never in the three-dot menu; the
    // gk rows have their own placement, and core's buttons the person keeps with text are left
    if (!G.cfg.all_icons) return;
    var keep = (G.cfg.core_text || []).join(', ');
    document.querySelectorAll('#content .contextual a.icon').forEach(function (a) {
      if (a.closest('.drdn') || a.dataset.gkGuiStuffMenuKey || (keep && a.matches(keep))) return;
      iconOnly(a);
    });
  }
  if (G.on('actions_menu') && ((G.cfg.core_icons || []).length || G.cfg.all_icons)) G.onContent(coreIcons);
  if (G.on('actions_menu') && (G.cfg.menu || []).length) {
    G.onContent(function () {
      var items = document.querySelector('#content > .contextual .drdn-items');
      var rows = G.cfg.menu;
      if (!items) {
        // a page without core's menu gets the same menu, with only the registered rows
        var ctx = document.querySelector('#content > .contextual');
        if (!ctx || ctx.querySelector('.gk-gui-stuff-menu')) return;
        var drdn = N('span', 'drdn gk-gui-stuff-menu');
        var trig = N('span', 'drdn-trigger'); var ic = G.put(N('span', 'icon-only gk-gui-stuff-menu-trigger'), '3-bullets', '⋯', 16); ic.title = G.t('menu'); trig.appendChild(ic);
        var content = N('div', 'drdn-content'); items = N('div', 'drdn-items'); content.appendChild(items);
        drdn.appendChild(trig); drdn.appendChild(content); ctx.appendChild(drdn);
        trig.tabIndex = 0; trig.setAttribute('role', 'button'); trig.setAttribute('aria-label', G.t('menu'));
        function toggle() { drdn.classList.toggle('expanded'); }
        trig.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
        trig.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
        document.addEventListener('click', function (e) { if (!drdn.contains(e.target)) drdn.classList.remove('expanded'); });
      }
      if (items.dataset.gkGuiStuffMenu) return;
      items.dataset.gkGuiStuffMenu = '1';
      var bar = items.closest('.contextual'), firstOwn = bar ? bar.firstChild : null;
      var last = null;
      rows.forEach(function (r) {
        if (r.kind === 'action' && !actions[r.action]) return; // the module behind the row is off
        // out: icon and text among the page's own links; icon: out with the icon only, the text as tooltip and name
        var out = (r.placement === 'out' || r.placement === 'icon') && bar, iconOnly = out && r.placement === 'icon' && r.icon;
        // the same shape as core's own links, out and in the menu: icon, then the text
        var a = N('a', (out ? 'gk-gui-stuff-out' : 'gk-gui-stuff-menu-row gk-gui-stuff-menu-' + r.section) + ' icon' + (r.icon ? ' icon-' + r.icon : ''));
        if (r.icon) { var ico = G.icon(r.icon, '', out ? 16 : 18); if (ico.nodeType === 1) ico.classList.add('icon-svg'); a.appendChild(ico); }
        if (iconOnly) { a.classList.add('icon-only'); a.setAttribute('aria-label', r.label); } else a.appendChild(N('span', 'icon-label', r.label));
        a.href = r.href || '#';
        a.dataset.gkGuiStuffMenuKey = r.key;
        // Every row has a tooltip, and a row that shows a state that is on is marked
        // an icon alone says its name in the tooltip, before the row's own explanation
        if (iconOnly) a.title = r.title ? r.label + ': ' + r.title : r.label; else if (r.title) a.title = r.title;
        if (r.active) { a.classList.add('gk-gui-stuff-row-active'); a.setAttribute('aria-pressed', 'true'); }
        if (r.kind === 'action') a.addEventListener('click', function (e) { e.preventDefault(); var d = a.closest('.drdn'); if (d) d.classList.remove('expanded'); actions[r.action](a); });
        if (r.kind === 'post') a.addEventListener('click', function (e) {
          e.preventDefault();
          if (r.confirm && !window.confirm(r.confirm)) return;
          var f = N('form'); f.method = 'post'; f.action = r.href; f.style.display = 'none';
          var tk = N('input'); tk.type = 'hidden'; tk.name = 'authenticity_token'; tk.value = token(); f.appendChild(tk);
          document.body.appendChild(f); f.submit();
        });
        if (out) { bar.insertBefore(a, firstOwn); return; }
        // a line only between rows: never first in the menu, never after another line
        if (r.section !== last) {
          var prev = items.lastElementChild;
          if (prev && !prev.classList.contains('gk-gui-stuff-menu-line') && prev.tagName !== 'HR') items.appendChild(N('div', 'gk-gui-stuff-menu-line'));
          last = r.section;
        }
        items.appendChild(a);
      });
      // and never last
      var tail = items.lastElementChild;
      if (tail && tail.classList.contains('gk-gui-stuff-menu-line')) tail.remove();
      menuWatch();
    });
  }

  // ------------------------------------------------------------------ branch_jump
  if (G.on('branch_jump') && page.project) {
    var card = null;
    function closeCard() { if (card) { card.remove(); card = null; } document.querySelectorAll('.gk-gui-stuff-branch-btn[aria-expanded="true"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); }); }
    function tab() { var m = /^\/projects\/[^/]+\/([a-z_]+)/.exec(location.pathname.slice(root.length)); return m ? m[1] : ''; }
    var branches = {}, branchData = G.cfg.branch || {}; // the current project's branch came with the page
    // fetched once per project and page, the first time when the page is idle: a click then shows the card at once
    function branch(ident) {
      if (!branches[ident]) {
        branches[ident] = fetch(root + '/gk_gui_stuff/branch/' + encodeURIComponent(ident) + '?tab=' + tab(), { credentials: 'same-origin', headers: { Accept: 'application/json' } })
          .then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { if (d) branchData[ident] = d; return d; }).catch(function () { delete branches[ident]; return null; });
      }
      return branches[ident];
    }
    // A button opens its card at once: the card stands the moment it is clicked, and the rows fill in when they
    // are there (usually already)
    function show(btn, ident) {
      closeCard();
      btn.setAttribute('aria-expanded', 'true');
      card = N('div', 'gk-gui-stuff-preview gk-gui-stuff-branch');
      var mine = card, ul = N('ul');
      ul.appendChild(N('li', 'gk-gui-stuff-branch-wait', G.t('loading')));
      card.appendChild(ul);
      document.body.appendChild(card);
      var r = btn.getBoundingClientRect();
      card.style.insetBlockStart = (window.scrollY + r.bottom + 6) + 'px';
      card.style.insetInlineStart = Math.max(8, window.scrollX + r.left) + 'px';
      function line(p, cls) {
        var li = N('li', cls + (p.current ? ' gk-gui-stuff-branch-current' : '') + (p.closed ? ' gk-gui-stuff-branch-closed' : ''));
        if (p.current) li.appendChild(G.put(N('span', 'gk-gui-stuff-branch-mark'), 'angle-right', '▸', 12)); // Core's icon
        var a = N('a', null, p.name); a.href = p.href; li.appendChild(a);
        li.appendChild(N('span', 'gk-gui-stuff-branch-count', p.count != null ? G.t('branch_projects', { count: p.count }) : G.t('branch_open', { count: p.open })));
        return li;
      }
      function fill(d) {
        if (card !== mine) return;
        if (!d) { closeCard(); return; }
        ul.textContent = '';
        if (d.parent) ul.appendChild(line(d.parent, 'gk-gui-stuff-branch-parent'));
        d.rows.forEach(function (p) {
          ul.appendChild(line(p, 'gk-gui-stuff-branch-row'));
          (p.children || []).forEach(function (c) { ul.appendChild(line(c, 'gk-gui-stuff-branch-child')); });
        });
        var first = card.querySelector('.gk-gui-stuff-branch-current a') || card.querySelector('a'); if (first) first.focus();
      }
      if (branchData[ident]) fill(branchData[ident]); else branch(ident).then(fill);
    }
    G.onContent(function () {
      // every level of the breadcrumb, and the current project itself (so that a project at the top can reach its siblings)
      var h1 = document.querySelector('#header h1');
      if (!h1 || h1.dataset.gkGuiStuffBranch) return;
      h1.dataset.gkGuiStuffBranch = '1';
      var links = h1.querySelectorAll('.breadcrumbs a.ancestor, .breadcrumbs a');
      function add(after, ident) {
        var b = G.put(N('button', 'gk-gui-stuff-branch-btn'), 'chevrons-right', '\u00BB', 16); b.type = 'button';
        b.setAttribute('aria-label', G.t('branch')); b.title = G.t('branch'); b.setAttribute('aria-expanded', 'false');
        b.addEventListener('click', function (e) { e.stopPropagation(); if (b.getAttribute('aria-expanded') === 'true') closeCard(); else show(b, ident); });
        // nothing is fetched ahead: the current project's branch is in the page, another level is asked for at the click
        after(b);
      }
      h1.querySelectorAll('.breadcrumbs .separator').forEach(function (sep, i) {
        // the separator after ancestor i leads to the level below it: the branch of the next project in the path
        var next = links[i + 1], ident = next ? (/\/projects\/([^/?#]+)/.exec(next.getAttribute('href')) || [])[1] : page.project;
        sep.textContent = '';
        add(function (b) { sep.appendChild(b); }, ident || page.project);
      });
      // a project at the top has no separator: the sign stands after its name (core's h1 is a column, so inside the name's own element)
      var cur = h1.querySelector('.current-project');
      if (!h1.querySelector('.breadcrumbs') && cur) add(function (b) { b.classList.add('gk-gui-stuff-branch-lead'); cur.appendChild(b); }, page.project);
    });
    document.addEventListener('click', function (e) { if (card && !card.contains(e.target)) closeCard(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCard(); });
  }
})();
