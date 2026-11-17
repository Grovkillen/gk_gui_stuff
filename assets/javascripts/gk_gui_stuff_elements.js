// gk_gui_stuff: the shared elements, so that no plugin draws its own variant.
//   GkGui.surface.open({title, content, buttons, footer, size, dismissable, onClose, list})  the one modal surface
//   GkGui.notice.show({level, text, buttons, life, closeLabel, onClose})  the one notice, in a corner (life: brief |
//                                                       sticky); buttons [{label, action, icon}], with icon: the icon
//                                                       button; level: tip, info, notice, warning, alarm or critical,
//                                                       lowest first; closeLabel: a text button in the cross's place,
//                                                       and onClose when the person closes it there. Returns {close(),
//                                                       update(text, level)}, which changes the notice where it stands
//   GkGui.wave.show({word, text, level, duration})      the full-page word that comes and goes
//   GkGui.banner.show({key, level, text, button, dismiss, before, where})  a row in the page, not over it; button {label,
//                                                       action, icon}, with icon: the icon button; outside the window
//                                                       Visa var points it out, where: its word instead of the
//                                                       banner's, false: no arrow
//   GkGui.ribbon.show({key, word, line, icon, title, priority, role, action: {label, href | handler}})  a word in the
//                                                       corner saying what the page is, in its role (admin when none is
//                                                       given), with an icon of icons before it and the whole sentence
//                                                       (title) for screen readers and the action button's tooltip;
//                                                       the band lets the pointer through, only its button takes it;
//                                                       outside the window Visa var points it out. Returns its frame
//   GkGui.corner.show({count, entries, level, onReload}) the fold: the page changed behind your back; outside the
//                                                       window a notice with the count says so, one notice that is
//                                                       updated, gone when the fold is seen; Visa there does what the
//                                                       arrow of Visa var does, Stäng closes the notice and not the fold
//   GkGui.palette.open({placeholder, items, onPick})     type and pick, a small surface at the top
//   GkGui.drawer.add({key, label, scope, render, attention})  the panel for tools used while looking at the page
// First editions: colours are neutral until theme_engine's roles exist, icons are characters until icons exists,
// and notices live in the client only (no server list yet). Plain DOM, no jQuery.
(function () {
  var G = window.GkGui;
  if (!G) return;
  var N = G.node;
  var LEVELS = ['tip', 'info', 'notice', 'warning', 'alarm', 'critical'];
  function level(l) { return LEVELS.indexOf(l) >= 0 ? l : 'info'; }
  function focusables(root) {
    return Array.prototype.filter.call(root.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (n) { return !n.disabled && n.offsetParent !== null; });
  }

  // ---------------------------------------------------------------- surface
  var stack = [];
  function surfaceOpen(o) {
    if (stack.length >= 2) surfaceClose(stack[stack.length - 1], true); // a third replaces the second
    var back = N('div', 'gk-gui-stuff-surface-back gk-gui-stuff-surface-' + (o.size || 'small'));
    var box = N('div', 'gk-gui-stuff-surface');
    var id = 'gk-gui-stuff-surface-title-' + Date.now();
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', id);
    var head = N('div', 'gk-gui-stuff-surface-head');
    var title = N('h3', 'gk-gui-stuff-surface-title', o.title || ''); title.id = id;
    head.appendChild(title);
    var top = N('div', 'gk-gui-stuff-surface-buttons');
    var s = { back: back, box: box, o: o, last: document.activeElement };
    function rank(b) { return b.role === 'cancel' ? 0 : b.role === 'primary' ? 2 : 1; }
    function button(b) {
      var n = N('button', 'gk-gui-stuff-btn gk-gui-stuff-btn-' + (b.role || 'secondary'), b.label); n.type = 'button';
      n.addEventListener('click', function () { if (b.role === 'cancel' && !b.action) return surfaceClose(s); if (b.action) b.action(s); });
      return n;
    }
    (o.buttons || []).forEach(function (b) { top.appendChild(button(b)); });
    head.appendChild(top);
    var x = G.put(N('button', 'gk-gui-stuff-surface-close'), 'close', '×', 18); x.type = 'button'; x.setAttribute('aria-label', G.t('close')); x.title = G.t('close');
    head.appendChild(x);
    var body = N('div', 'gk-gui-stuff-surface-body');
    if (typeof o.content === 'string') body.textContent = o.content; else if (o.content) body.appendChild(o.content);
    s.body = body;
    box.appendChild(head); box.appendChild(body);
    if (o.footer && o.footer.length) {
      var foot = N('div', 'gk-gui-stuff-surface-foot');
      // cancel always furthest to the left, the primary to the right
      o.footer.slice().sort(function (a, b) { return rank(a) - rank(b); }).forEach(function (b) { foot.appendChild(button(b)); });
      box.appendChild(foot);
    }
    back.appendChild(box);
    function tryClose() { if (o.dismissable === false) { if (o.onDismissAttempt) o.onDismissAttempt(s); return; } surfaceClose(s); }
    x.addEventListener('click', tryClose);
    back.addEventListener('mousedown', function (e) { if (e.target === back) tryClose(); });
    back.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); tryClose(); return; }
      if (o.list && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
        o.list(e.key === 'ArrowLeft' ? -1 : 1, s); return;
      }
      if (e.key !== 'Tab') return;
      var f = focusables(box); if (!f.length) { e.preventDefault(); return; }
      var first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    });
    s.close = function () { surfaceClose(s); };
    document.body.appendChild(back);
    document.documentElement.classList.add('gk-gui-stuff-surface-open');
    stack.push(s);
    var f = focusables(body)[0] || focusables(box)[0]; if (f) f.focus();
    return s;
  }
  function surfaceClose(s, silent) {
    var i = stack.indexOf(s); if (i < 0) return;
    stack.splice(i, 1);
    s.back.remove();
    if (!stack.length) document.documentElement.classList.remove('gk-gui-stuff-surface-open');
    if (s.last && s.last.focus) { try { s.last.focus(); } catch (e) { /* gone */ } }
    if (!silent && s.o.onClose) s.o.onClose(s);
  }

  // ---------------------------------------------------------------- notice
  var tray = null, shown = [];
  function noticeShow(o) {
    if (!tray) { tray = N('div', 'gk-gui-stuff-notices'); document.body.appendChild(tray); }
    var lv = level(o.level), sticky = o.life === 'sticky' || LEVELS.indexOf(lv) >= 3; // warning and up always stay
    var n = N('div', 'gk-gui-stuff-note gk-gui-stuff-note-' + lv);
    n.setAttribute('role', LEVELS.indexOf(lv) >= 3 ? 'alert' : 'status');
    var markOf = function (m, l) {
      return G.put(m, { tip: 'help', info: 'help', notice: 'checked', warning: 'warning', alarm: 'warning', critical: 'warning' }[l],
        { tip: 'i', info: 'i', notice: '!', warning: '!', alarm: '!!', critical: '!!!' }[l], 14); // Core's icons; the level also shows in the border
    };
    var noteMark = markOf(N('span', 'gk-gui-stuff-note-mark'), lv), noteText = N('span', 'gk-gui-stuff-note-text', o.text);
    n.appendChild(noteMark);
    n.appendChild(noteText);
    var row = N('span', 'gk-gui-stuff-note-buttons');
    var timer = null, ms = Math.max(4000, (G.opt('elements').notice_ms || 6000));
    function drop() { clearTimeout(timer); clearInterval(timer); n.remove(); shown = shown.filter(function (k) { return k !== n; }); }
    function arm() { if (!sticky) timer = setTimeout(drop, ms); }
    // a button with icon: is the icon button ("Försök igen" is reload), before the cross; without, a text button
    (o.buttons || []).slice(0, 2).forEach(function (b) {
      var bn = b.icon ? G.iconButton({ icon: b.icon, label: b.label, fallback: b.fallback }) : N('button', 'gk-gui-stuff-btn', b.label);
      if (!b.icon) bn.type = 'button';
      bn.addEventListener('click', function () { if (b.action) b.action(); drop(); });
      row.appendChild(bn);
    });
    // beside an icon button the cross is one too, so that the two stand on one line
    var x = (o.buttons || []).slice(0, 2).some(function (b) { return b.icon; }) ? G.iconButton({ icon: 'close', label: G.t('dismiss'), fallback: '×' }) : G.put(N('button', 'gk-gui-stuff-note-close'), 'close', '×', 14);
    x.type = 'button'; x.setAttribute('aria-label', G.t('dismiss')); x.title = G.t('dismiss');
    // a notice with buttons in words may say its closing in a word too
    if (o.closeLabel) { x = N('button', 'gk-gui-stuff-btn', o.closeLabel); x.type = 'button'; }
    x.addEventListener('click', function () { drop(); if (o.onClose) o.onClose(); });
    tray.appendChild(n); shown.push(n);
    if (o.effect) G.effect(n, o.effect);
    n.gkGuiStuffStays = sticky;
    // The shared value says how many at a time. The oldest that goes by itself makes room; one that is to stay is never
    // taken away, nor the one just shown, so the tray may hold more than the value and then scrolls.
    var most = G.opt('elements').notice_max || 3;
    for (var i = 0; i < shown.length - 1 && shown.length > most;) {
      if (shown[i].gkGuiStuffStays) { i++; continue; }
      shown.splice(i, 1)[0].remove();
    }
    // A notice that goes away by itself shows it (the same circle as on core's green message): a click on the
    // circle pauses and resumes, resting the pointer on the notice holds the time, the cross closes at once.
    if (!sticky && G.opt('elements').notice_countdown !== false) {
      var left = ms, paused = false, held = false, last = Date.now(), C = 2 * Math.PI * 9, NS = 'http://www.w3.org/2000/svg';
      var cb = N('button', 'gk-gui-stuff-flash-count'); cb.type = 'button';
      var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
      var ring = document.createElementNS(NS, 'circle'), arc = document.createElementNS(NS, 'circle');
      [ring, arc].forEach(function (c) { c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '9'); c.setAttribute('fill', 'none'); c.setAttribute('stroke-width', '3'); });
      ring.setAttribute('class', 'gk-gui-stuff-flash-ring'); arc.setAttribute('class', 'gk-gui-stuff-flash-arc');
      arc.setAttribute('stroke-dasharray', String(C)); arc.setAttribute('transform', 'rotate(-90 12 12)');
      svg.appendChild(ring); svg.appendChild(arc);
      var mark = N('span', 'gk-gui-stuff-flash-mark'); cb.appendChild(svg); cb.appendChild(mark);
      var paint = function () {
        arc.setAttribute('stroke-dashoffset', String(C * (1 - left / ms)));
        if (paused) { G.put(mark, 'play', '\u25B6', 12); } else { mark.textContent = String(Math.ceil(left / 1000)); }
        var label = paused ? G.t('flash_resume') : G.t('flash_pause', { count: Math.ceil(left / 1000) });
        cb.title = label; cb.setAttribute('aria-label', label); cb.setAttribute('aria-pressed', paused ? 'true' : 'false');
      };
      cb.addEventListener('click', function () { paused = !paused; last = Date.now(); n.classList.toggle('gk-gui-stuff-flash-paused', paused); paint(); });
      n.addEventListener('mouseenter', function () { held = true; });
      n.addEventListener('mouseleave', function () { held = false; last = Date.now(); });
      timer = setInterval(function () {
        var now = Date.now();
        if (!paused && !held && !document.hidden) left -= now - last;
        last = now;
        if (left <= 0) { clearInterval(timer); drop(); return; }
        paint();
      }, 100);
      paint();
      row.appendChild(cb);
    } else {
      n.addEventListener('mouseenter', function () { clearTimeout(timer); });
      n.addEventListener('mouseleave', arm);
      arm();
    }
    row.appendChild(x); n.appendChild(row);
    return {
      close: drop,
      update: function (text, newLevel) {
        noteText.textContent = text;
        var l2 = level(newLevel || lv);
        if (l2 === lv) return;
        n.classList.remove('gk-gui-stuff-note-' + lv); n.classList.add('gk-gui-stuff-note-' + l2);
        n.setAttribute('role', LEVELS.indexOf(l2) >= 3 ? 'alert' : 'status');
        markOf(noteMark, l2);
        lv = l2;
      }
    };
  }

  // ---------------------------------------------------------------- wave
  var waveEl = null, waveTimer = null, waveSince = 0;
  function waveShow(o) {
    var opacity = G.opt('elements').wave_opacity; if (opacity == null) opacity = 0.6;
    if (!waveEl) {
      // the wave the page was born with (the body's first script drew it, carried over from the page before)
      // is the wave: the same element goes on, so nothing is swapped and nothing can blink
      waveEl = document.getElementById('gk-gui-stuff-wave');
      if (!waveEl) {
        waveEl = N('div', 'gk-gui-stuff-wave'); waveEl.id = 'gk-gui-stuff-wave';
        G.effect(waveEl, 'wave');
        waveEl.appendChild(N('div', 'gk-gui-stuff-wave-backdrop'));
        waveEl.appendChild(N('div', 'gk-gui-stuff-wave-motion')); // empty until a theme fills it
        var t = N('div', 'gk-gui-stuff-wave-text');
        t.appendChild(N('div', 'gk-gui-stuff-wave-word')); t.appendChild(N('div', 'gk-gui-stuff-wave-line'));
        waveEl.appendChild(t);
        document.body.appendChild(waveEl);
      }
      // never a must to look: any input fades it at once, and the click reaches what was clicked
      ['mousedown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
        window.addEventListener(ev, function () {
          if (!waveEl || !waveEl.classList.contains('gk-gui-stuff-wave-on') || waveEl.dataset.hold) return;
          waveHide(true);
          // The person closed it; the kernel remembers that for the next page
          document.dispatchEvent(new CustomEvent('gk-gui-stuff:wave-closed'));
        }, { passive: true, capture: true });
      });
    }
    clearTimeout(waveTimer);
    // A wave that stands is updated, never rebuilt: it keeps standing while its state changes, so the colour
    // glides from the waiting tone to the outcome's tone (the transition on the backdrop) instead of fading
    // out and in again. Only a wave that was not there fades in.
    var standing = waveEl.classList.contains('gk-gui-stuff-wave-on');
    if (standing && waveEl.classList.contains('gk-gui-stuff-wave-born')) waveSince = o.since || Date.now();
    waveEl.className = 'gk-gui-stuff-wave gk-gui-stuff-wave-' + (o.level || 'done') + (o.waiting ? ' gk-gui-stuff-wave-waiting' : '') + (standing ? ' gk-gui-stuff-wave-on' : '');
    waveEl.querySelector('.gk-gui-stuff-wave-backdrop').style.opacity = opacity;
    // A standing wave whose word changes cross-fades it, never a gap or a swap
    var wd = waveEl.querySelector('.gk-gui-stuff-wave-word:not(.gk-gui-stuff-wave-word-out)'), nw = String(o.word || '').toUpperCase();
    if (standing && wd.textContent && wd.textContent !== nw) { // gk-r17 P4r: the word is the wave's own element, drawn by this plugin, not core's
      var old = wd.cloneNode(true); old.className = 'gk-gui-stuff-wave-word gk-gui-stuff-wave-word-out';
      wd.parentNode.insertBefore(old, wd); setTimeout(function () { old.remove(); }, 450);
      wd.classList.remove('gk-gui-stuff-wave-word-in'); void wd.offsetWidth; wd.classList.add('gk-gui-stuff-wave-word-in');
    }
    wd.textContent = nw;
    waveEl.querySelector('.gk-gui-stuff-wave-line').textContent = o.text || '';
    // the input that started the wave (the click on Spara) must not also end it
    waveEl.dataset.hold = '1'; setTimeout(function () { if (waveEl) delete waveEl.dataset.hold; }, 150);
    if (!standing) { void waveEl.offsetWidth; waveSince = o.since || Date.now(); waveEl.classList.add('gk-gui-stuff-wave-on'); }
    if (o.duration !== 0) waveTimer = setTimeout(waveHide, o.duration || 600);
  }
  // A wave that has come stays at least the minimum time (a page that loads "too fast" must not make it a
  // blink); the one who clicks or types takes it away at once all the same (now = true).
  function waveHide(now) {
    clearTimeout(waveTimer);
    if (!waveEl) return;
    var left = (G.opt('wave').min_ms || 0) - (Date.now() - waveSince);
    if (!now && left > 0) { waveTimer = setTimeout(function () { waveHide(true); }, left); return; }
    waveEl.classList.remove('gk-gui-stuff-wave-on');
  }

  // ---------------------------------------------------------------- banner
  function bannerShow(o) {
    var key = 'banner.' + (o.key || o.text);
    if (o.dismiss && G.get(key) === '1') return null;
    var host = o.before || document.getElementById('content');
    if (!host || document.querySelector('.gk-gui-stuff-banner[data-key="' + (o.key || '') + '"]')) return null;
    var b = N('div', 'gk-gui-stuff-banner gk-gui-stuff-banner-' + level(o.level));
    b.dataset.key = o.key || '';
    b.setAttribute('role', LEVELS.indexOf(level(o.level)) >= 3 ? 'alert' : 'status');
    b.appendChild(N('span', 'gk-gui-stuff-banner-text', o.text));
    // button.icon makes it the icon button (the banner when the contact is lost has reload for "Försök nu")
    if (o.button) {
      var bt = o.button, bn = bt.icon ? G.iconButton({ icon: bt.icon, label: bt.label, fallback: bt.fallback }) : N('button', 'gk-gui-stuff-btn', bt.label);
      if (!bt.icon) bn.type = 'button';
      bn.addEventListener('click', bt.action);
      b.appendChild(bn);
    }
    if (o.dismiss) {
      var x = G.put(N('button', 'gk-gui-stuff-banner-close'), 'close', '×', 14); x.type = 'button'; x.setAttribute('aria-label', G.t('dismiss'));
      x.addEventListener('click', function () { G.set(key, '1'); b.remove(); });
      b.appendChild(x);
    }
    host.insertAdjacentElement('afterbegin', b);
    if (o.where !== false) G.showWhere({ key: 'banner.' + (o.key || o.text), target: b, word: o.where || G.showWhere.word('banner') });
    return b;
  }

  // ---------------------------------------------------------------- ribbon (at most one, the highest priority wins)
  // The band never takes the pointer: a click or a hover goes through to what lies under it. While the pointer is
  // over the band it is fainter, worked out from the pointer's place since the band hears no events of its own (no
  // fading with reduced motion, the CSS). A band with an action (a locked page, seeing as, stepped up) has one small
  // round button with core's cancel, always upright, the only part that takes the pointer: a link (action.href, for a
  // locked page the live page) or a button (action.handler); action.label is what a screen reader says, and the
  // tooltip after the band's title. Over the button, or with the focus in it, the band is fully seen. A band without
  // an action has no button.
  // The band runs from edge to edge, cut by the two edges of its frame (the window's corner on a phone, the corner of
  // #main on a computer), with the word in the middle of what is seen. Its distance from the corner follows the
  // word's measured width, so that the word and the button fit with room between them; the button stands far down
  // the band, a small gap from the window's edge, and never over the middle of core's menu button on a phone.
  var ribbonNow = null, ribbonAt = null, ribbonFrame = 0, ribbonHeard = false;
  var RB = { r: 11, edge: 6, gap: 8, end: 10 }; // the button's radius, its gap to the edge and to the word, room at the ends
  function ribbonMenu(r) {
    var m = document.querySelector('#header .mobile-toggle-button');
    var q = m && m.getBoundingClientRect();
    if (!q || !q.width) return null;
    var f = r.el.getBoundingClientRect(), mx = q.left + q.width / 2;
    return { x: r.rtl ? mx - f.left : f.right - mx, y: q.top + q.height / 2 - f.top };
  }
  function ribbonPlace() {
    var r = ribbonNow;
    if (!r || !r.band.isConnected) return;
    var a = r.band, k = Math.SQRT2;
    r.text.style.maxInlineSize = Math.max(80, Math.round(Math.min(window.innerWidth, r.host.clientWidth || window.innerWidth) * 0.4)) + 'px';
    var w = r.text.offsetWidth, h = a.offsetHeight;
    // the corner's distance where the band's middle line meets the edges: the word fits in the band's inner edge
    var c = (w + 2 * RB.end + h) / k, bx = RB.edge + RB.r;
    if (r.btn) {
      // the button's middle bx from the edge, the word's half and the gap and the button between them
      c = Math.max(c, 2 * bx + (w + 2 * (RB.gap + RB.r)) / k);
      var m = ribbonMenu(r), need = RB.r + RB.gap;
      if (m && Math.abs(m.x - bx) < need) c = Math.max(c, m.y + bx + Math.sqrt(need * need - (m.x - bx) * (m.x - bx)));
    }
    c = Math.ceil(c);
    var len = Math.ceil(c * k + 2 * h);
    a.style.inlineSize = len + 'px';
    a.style.insetBlockStart = (c / 2 - h / 2) + 'px';
    a.style.insetInlineEnd = (c / 2 - len / 2) + 'px';
    r.el.style.inlineSize = r.el.style.blockSize = Math.ceil(c + h) + 'px';
    if (r.btn) r.btn.style.insetInlineEnd = (len / 2 - k * (c / 2 - bx) - RB.r) + 'px';
  }
  function ribbonFade() {
    ribbonFrame = 0;
    var r = ribbonNow;
    if (!r || !r.band.isConnected) return;
    var over = false;
    if (ribbonAt && !r.onButton) {
      var f = r.el.getBoundingClientRect(), x = ribbonAt.x, y = ribbonAt.y;
      if (x >= f.left && x <= f.right && y >= f.top && y <= f.bottom) {
        // the pointer in the band's own turned frame: rotate back by the band's angle round its middle
        var b = r.band.getBoundingClientRect(), dx = x - (b.left + b.width / 2), dy = y - (b.top + b.height / 2);
        var t = (r.rtl ? -1 : 1) * Math.PI / 4, u = dx * Math.cos(t) + dy * Math.sin(t), v = dy * Math.cos(t) - dx * Math.sin(t);
        over = Math.abs(u) <= r.band.offsetWidth / 2 && Math.abs(v) <= r.band.offsetHeight / 2;
      }
    }
    r.band.classList.toggle('gk-gui-stuff-ribbon-faded', over);
  }
  function ribbonLater() { if (!ribbonFrame) ribbonFrame = window.requestAnimationFrame(ribbonFade); }
  function ribbonHear() {
    if (ribbonHeard) return;
    ribbonHeard = true;
    document.addEventListener('pointermove', function (e) { ribbonAt = { x: e.clientX, y: e.clientY }; ribbonLater(); }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { ribbonAt = null; ribbonLater(); });
    window.addEventListener('scroll', ribbonLater, { passive: true, capture: true });
    window.addEventListener('resize', ribbonPlace);
    window.addEventListener('load', ribbonPlace);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ribbonPlace);
  }
  function ribbonShow(o) {
    if (ribbonNow && (ribbonNow.priority || 0) >= (o.priority || 0)) return ribbonNow.el;
    if (ribbonNow) ribbonNow.el.remove();
    var host = document.getElementById('main') || document.body;
    var frame = N('div', 'gk-gui-stuff-ribbon-frame');
    var a = N('div', 'gk-gui-stuff-ribbon gk-gui-stuff-ribbon-' + (o.key || 'plain'));
    var rc = G.roleClass ? G.roleClass(o.role || 'admin') : '';
    if (rc) a.classList.add(rc);
    // the icon only from icons (core has neither the shield nor the mask); without it the word stands alone
    var text = N('span', 'gk-gui-stuff-ribbon-text'), word = N('span', 'gk-gui-stuff-ribbon-word');
    if (o.icon && window.GkIcons) word.appendChild(G.icon(o.icon, '', 14));
    word.appendChild(N('span', 'gk-gui-stuff-ribbon-name', String(o.word || '').toUpperCase()));
    text.appendChild(word);
    if (o.line) text.appendChild(N('span', 'gk-gui-stuff-ribbon-line', o.line));
    a.appendChild(text);
    if (o.title) {
      text.setAttribute('aria-hidden', 'true');
      a.appendChild(N('span', 'gk-gui-stuff-sr-only', o.title));
    }
    var r = { el: frame, band: a, text: text, btn: null, host: host, priority: o.priority || 0, onButton: false, rtl: false };
    var act = o.action && o.action.label ? o.action : null;
    if (act) {
      var btn = N(act.href ? 'a' : 'button', 'gk-gui-stuff-ribbon-action');
      if (act.href) btn.href = act.href;
      else {
        btn.type = 'button';
        btn.addEventListener('click', function (e) { e.preventDefault(); if (act.handler) act.handler(e); });
      }
      G.put(btn, 'cancel', '↶', 13);
      // the band takes no pointer, so its sentence is also the button's tooltip, before what the button does
      btn.title = o.title ? o.title + '\n' + act.label : act.label;
      btn.setAttribute('aria-label', act.label);
      r.btn = btn;
      var full = function (on) { r.onButton = on; ribbonLater(); };
      btn.addEventListener('pointerenter', function () { full(true); });
      btn.addEventListener('pointerleave', function () { full(false); });
      btn.addEventListener('focus', function () { full(true); });
      btn.addEventListener('blur', function () { full(false); });
      a.appendChild(btn);
    }
    frame.appendChild(a); host.classList.add('gk-gui-stuff-ribbon-host'); host.appendChild(frame);
    r.rtl = window.getComputedStyle(a).direction === 'rtl';
    ribbonNow = r;
    ribbonPlace();
    ribbonHear();
    G.showWhere({ key: 'ribbon', target: frame, word: G.showWhere.word('ribbon') });
    return frame;
  }

  // ---------------------------------------------------------------- corner
  // The fold stands in the content's corner. Out of the window a notice says the count: one notice, updated and never
  // stacked, gone when the fold is seen, back when the person scrolls away from it again. Stäng and Visa hold it back until
  // the count grows. Stäng closes the notice and never the fold.
  var cornerEl = null, cornerNote = null, cornerStop = null, cornerCount = 0, cornerClosed = 0, cornerLevel = 'info';
  function cornerTell() {
    var W = G.showWhere, fold = cornerEl && cornerEl.querySelector('.gk-gui-stuff-corner-fold');
    var where = W && fold ? W.place(fold) : null;
    if (!where || where === 'here' || cornerCount <= cornerClosed) {
      if (cornerNote) { cornerNote.close(); cornerNote = null; }
      return;
    }
    var text = W.word(cornerCount === 1 ? 'corner_one' : 'corner_other', { count: cornerCount });
    if (cornerNote) { cornerNote.update(text, cornerLevel); return; }
    cornerNote = noticeShow({ level: cornerLevel, text: text, life: 'sticky', effect: 'corner', closeLabel: G.t('close'),
                              onClose: function () { cornerClosed = cornerCount; cornerNote = null; },
                              buttons: [{ label: W.word('show'), action: function () { cornerClosed = cornerCount; cornerNote = null; W.go(fold); } }] });
  }
  function cornerGone() {
    if (cornerStop) { cornerStop(); cornerStop = null; }
    if (cornerNote) { cornerNote.close(); cornerNote = null; }
    cornerCount = 0; cornerClosed = 0;
  }
  function cornerShow(o) {
    var host = document.getElementById('content'); if (!host) return;
    if (!cornerEl) {
      cornerEl = N('div', 'gk-gui-stuff-corner');
      var fold = N('button', 'gk-gui-stuff-corner-fold'); fold.type = 'button';
      fold.appendChild(N('span', 'gk-gui-stuff-corner-count'));
      var card = N('div', 'gk-gui-stuff-corner-card'); card.hidden = true;
      cornerEl.appendChild(fold); cornerEl.appendChild(card);
      var enter = null;
      var open = function (v) { card.hidden = !v; fold.setAttribute('aria-expanded', v ? 'true' : 'false'); };
      fold.addEventListener('click', function () { clearTimeout(enter); open(card.hidden); });
      // it stays a moment after the pointer has left, so that the way from the fold to the card need not be exact
      var leave = null;
      // Two ways in, two rules: a click opens at once; the pointer resting on the fold opens after the same
      // wait as every hover card (the instance's setting), so that passing over it shows nothing
      var wait = (G.cfg.preview && G.cfg.preview.delay != null) ? G.cfg.preview.delay : 500;
      cornerEl.addEventListener('mouseenter', function () { clearTimeout(leave); clearTimeout(enter); if (card.hidden) enter = setTimeout(function () { open(true); }, wait); });
      // a popover open in the card (the question before Ladda om) keeps the card open until it closes; its Esc is its own
      var asking = function () { return !!card.querySelector('details.gk-gui-stuff-popover[open]'); };
      cornerEl.addEventListener('mouseleave', function () { clearTimeout(enter); clearTimeout(leave); leave = setTimeout(function () { if (!asking()) open(false); }, 250); });
      cornerEl.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !e.target.closest('details.gk-gui-stuff-popover')) { open(false); fold.focus(); } });
      host.classList.add('gk-gui-stuff-corner-host', 'gk-gui-stuff-corner-room');
      host.insertAdjacentElement('afterbegin', cornerEl);
    }
    cornerEl.className = 'gk-gui-stuff-corner gk-gui-stuff-corner-' + (o.level === 'notice' ? 'notice' : 'info');
    var count = cornerEl.querySelector('.gk-gui-stuff-corner-count');
    // a pulse when the fold comes or its count grows, so that it is seen (none for a person who asks for less motion)
    var foldEl = cornerEl.querySelector('.gk-gui-stuff-corner-fold');
    if (String(o.count) !== count.textContent) { foldEl.classList.remove('gk-gui-stuff-corner-new'); void foldEl.offsetWidth; foldEl.classList.add('gk-gui-stuff-corner-new'); }
    count.textContent = o.count; count.setAttribute('aria-live', 'polite');
    cornerEl.querySelector('.gk-gui-stuff-corner-fold').setAttribute('aria-label', G.t('corner_title') + ' (' + o.count + ')');
    var card2 = cornerEl.querySelector('.gk-gui-stuff-corner-card');
    var ul = N('ul');
    ul.setAttribute('data-gk-gui-corner-list', '');
    var max = G.opt('elements').corner_max || 20;
    (o.entries || []).slice(0, max).forEach(function (e) { ul.appendChild(N('li', null, e)); });
    if ((o.entries || []).length > max) ul.appendChild(N('li', 'gk-gui-stuff-corner-more', G.t('and_more', { count: o.entries.length - max })));
    cornerCount = o.count;
    cornerLevel = o.level === 'notice' ? 'notice' : 'info';
    if (!cornerStop) cornerStop = G.showWhere.watch(foldEl, cornerTell);
    // a question open in the card (the popover before Ladda om) stays with its button and its focus: only the list is
    // new, so that the card is not drawn again under the person who is answering and the sheet's lock is let go by
    // the popover itself when it closes
    var oldList = card2.querySelector('[data-gk-gui-corner-list]');
    if (oldList && card2.querySelector('details.gk-gui-stuff-popover[open]')) {
      card2.replaceChild(ul, oldList);
      cornerTell();
      return;
    }
    card2.textContent = '';
    // the title with reload and the cross at its end, top right as in the notices (no "Ladda om" and "Avfärda"
    // as words at the foot)
    var head = N('div', 'gk-gui-stuff-corner-head');
    head.appendChild(N('strong', null, G.t('corner_title')));
    var row = N('span', 'gk-gui-stuff-corner-buttons');
    // onReload(button): the caller may ask first, in a popover at the button
    row.appendChild(G.iconButton({ icon: 'reload', label: G.t('reload'), fallback: '↻', onClick: function (e) { if (o.onReload) o.onReload(e.currentTarget); else location.reload(); } }));
    row.appendChild(G.iconButton({ icon: 'close', label: G.t('dismiss'), fallback: '×', onClick: function () { cornerEl.remove(); cornerEl = null; cornerGone(); if (o.onDismiss) o.onDismiss(); } }));
    head.appendChild(row);
    card2.appendChild(head);
    card2.appendChild(ul);
    cornerTell();
  }

  // ---------------------------------------------------------------- palette
  function paletteOpen(o) {
    var wrap = N('div', 'gk-gui-stuff-palette-body');
    var input = N('input', 'gk-gui-stuff-palette-input'); input.type = 'text'; input.placeholder = o.placeholder || '';
    input.setAttribute('aria-label', o.placeholder || o.title || '');
    var list = N('ul', 'gk-gui-stuff-palette-list'); list.setAttribute('role', 'listbox');
    wrap.appendChild(input); wrap.appendChild(list);
    var items = o.items || [], hits = [], at = 0, s;
    function pick(i) { s.close(); if (o.onPick) o.onPick(i); else if (i.href) location.href = i.href; }
    function paint() {
      var q = input.value.trim().toLowerCase();
      hits = items.filter(function (i) { return !q || (i.label + ' ' + (i.hint || '') + ' ' + (i.search || '')).toLowerCase().indexOf(q) >= 0; });
      if (at >= hits.length) at = Math.max(0, hits.length - 1);
      list.textContent = '';
      if (!hits.length) list.appendChild(N('li', 'gk-gui-stuff-palette-empty', G.t('no_hits')));
      hits.slice(0, 80).forEach(function (i, n) {
        var li = N('li', 'gk-gui-stuff-palette-item' + (n === at ? ' gk-gui-stuff-palette-at' : ''));
        li.setAttribute('role', 'option'); li.setAttribute('aria-selected', n === at ? 'true' : 'false');
        li.appendChild(N('span', 'gk-gui-stuff-palette-label', i.label));
        if (i.hint) li.appendChild(N('span', 'gk-gui-stuff-palette-hint', i.hint));
        li.addEventListener('mousedown', function (e) { e.preventDefault(); pick(i); });
        list.appendChild(li);
      });
      var cur = list.querySelector('.gk-gui-stuff-palette-at'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
    }
    input.addEventListener('input', function () { at = 0; paint(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); at = Math.min(at + 1, hits.length - 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); at = Math.max(at - 1, 0); paint(); }
      else if (e.key === 'Enter' && hits[at]) { e.preventDefault(); pick(hits[at]); }
    });
    at = Math.max(0, o.start || 0);
    s = surfaceOpen({ title: o.title || '', content: wrap, size: 'palette' });
    paint(); input.focus();
    return s;
  }

  // ---------------------------------------------------------------- drawer
  // Exists only while something lies in it. Open or minimized; the cross empties it, without a question.
  var drawer = null, tabs = [], chosen = null;
  var ORDER = ['global', 'context', 'page'];
  function drawerPaint(open) {
    if (!tabs.length) { if (drawer) { drawer.remove(); drawer = null; } return; }
    if (!drawer) {
      drawer = N('div', 'gk-gui-stuff-drawer');
      drawer.appendChild(N('div', 'gk-gui-stuff-drawer-tabs')); drawer.appendChild(N('div', 'gk-gui-stuff-drawer-body'));
      drawer.addEventListener('keydown', function (e) { if (e.key === 'Escape') drawer.classList.add('gk-gui-stuff-drawer-min'); });
      document.body.appendChild(drawer);
      drawer.dataset.size = G.get('drawer.size') || 'small';
    }
    if (open) drawer.classList.remove('gk-gui-stuff-drawer-min');
    var bar = drawer.querySelector('.gk-gui-stuff-drawer-tabs'), body = drawer.querySelector('.gk-gui-stuff-drawer-body');
    bar.textContent = '';
    tabs.forEach(function (t) {
      var tab = N('span', 'gk-gui-stuff-drawer-tab' + (t.key === chosen ? ' gk-gui-stuff-drawer-tab-on' : '') + (t.attention && t.attention !== 'none' ? ' gk-gui-stuff-drawer-' + t.attention : ''));
      var b = N('button', 'gk-gui-stuff-drawer-name', t.label); b.type = 'button';
      b.addEventListener('click', function () {
        if (chosen === t.key) drawer.classList.toggle('gk-gui-stuff-drawer-min'); else { chosen = t.key; drawerPaint(true); }
      });
      tab.appendChild(b);
      if (t.attention === 'count' || t.attention === 'blink') tab.appendChild(N('span', 'gk-gui-stuff-drawer-count', t.count || ''));
      var x = G.put(N('button', 'gk-gui-stuff-drawer-x'), 'close', '×', 12); x.type = 'button'; x.setAttribute('aria-label', G.t('close') + ': ' + t.label);
      x.addEventListener('click', function () { drawerRemove(t.key); });
      tab.appendChild(x); bar.appendChild(tab);
    });
    // the size button, its tooltip and name the size a click gives: small, half, full, half, small again. Growing it
    // is core's maximize; in the whole window it is the minimize icon (GK Icons' own; without GK Icons the kernel draws
    // maximize, with the tooltip that says smaller). From the whole window "Smaller" goes back to half.
    var nextSize = function () {
      var now = drawer.dataset.size || 'small';
      if (now === 'full') return 'half';
      if (now === 'half') return drawer.dataset.shrink === '1' ? 'small' : 'full';
      return 'half';
    };
    var sizeWord = function (next) { return G.t(next === 'half' && drawer.dataset.size === 'full' ? 'drawer_size_back' : 'drawer_size_' + next); };
    var sizes = G.iconButton({ icon: 'maximize', label: '', fallback: '⤢', className: 'gk-gui-stuff-drawer-size' });
    var sizeShow = function () {
      var next = nextSize(), said = sizeWord(next);
      var mini = drawer.dataset.size === 'full' && window.GkIcons;
      G.put(sizes, mini ? 'minimize' : 'maximize', mini ? '⤡' : '⤢', 16);
      sizes.title = said; sizes.setAttribute('aria-label', said);
    };
    sizes.addEventListener('click', function () {
      var now = drawer.dataset.size || 'small', next = nextSize();
      if (now === 'full') drawer.dataset.shrink = '1';
      if (next === 'full' || (next === 'half' && now === 'small')) delete drawer.dataset.shrink;
      drawer.dataset.size = next; G.set('drawer.size', next);
      sizeShow();
    });
    sizeShow();
    var all = G.put(N('button', 'gk-gui-stuff-drawer-close'), 'close', '×', 14); all.type = 'button'; all.title = G.t('drawer_empty'); all.setAttribute('aria-label', G.t('drawer_empty'));
    all.addEventListener('click', function () { tabs = []; chosen = null; drawerPaint(); });
    bar.appendChild(sizes); bar.appendChild(all);
    body.textContent = '';
    var cur = tabs.filter(function (t) { return t.key === chosen; })[0];
    if (cur && cur.render) cur.render(body);
  }
  function drawerRemove(key) {
    tabs = tabs.filter(function (x) { return x.key !== key; });
    if (chosen === key) chosen = tabs.length ? tabs[0].key : null;
    drawerPaint();
  }
  // open: false puts the tab there quietly: a new drawer comes minimized and an open one keeps the tab it shows
  function drawerAdd(t) {
    tabs = tabs.filter(function (x) { return x.key !== t.key; });
    if (tabs.length >= 6) return null;
    tabs.push(t);
    tabs.sort(function (a, b) { return ORDER.indexOf(a.scope || 'page') - ORDER.indexOf(b.scope || 'page'); });
    var quiet = t.open === false, fresh = !drawer;
    if (!quiet || !chosen || !tabs.some(function (x) { return x.key === chosen; })) chosen = t.key;
    drawerPaint(!quiet);
    if (quiet && fresh && drawer) drawer.classList.add('gk-gui-stuff-drawer-min');
    return { remove: function () { drawerRemove(t.key); }, attention: function (a, n) { t.attention = a; t.count = n; drawerPaint(); } };
  }

  G.surface = { open: surfaceOpen, close: function () { if (stack.length) surfaceClose(stack[stack.length - 1]); }, count: function () { return stack.length; } };
  // callable as before (G.notice('text'): a brief info notice) and with everything (G.notice.show({...}))
  G.notice = function (text) { return noticeShow({ level: 'info', text: text }); };
  G.notice.show = noticeShow;
  G.wave = { show: waveShow, hide: waveHide };
  G.banner = { show: bannerShow };
  G.ribbon = { show: ribbonShow };
  G.corner = { show: cornerShow };
  G.palette = { open: paletteOpen };
  // Handles: small tabs on the window's edge that open something in the drawer. A handle is the page's own way
  // in; the drawer itself still never opens by itself. handle({key, label, title, count, open}) gives {count(n),
  // remove}.
  var handles = {};
  function handlesPaint() {
    var box = document.querySelector('.gk-gui-stuff-drawer-handles'), keys = Object.keys(handles);
    if (!keys.length) { if (box) box.remove(); return; }
    if (!box) { box = N('div', 'gk-gui-stuff-drawer-handles'); document.body.appendChild(box); }
    box.textContent = '';
    keys.forEach(function (k) {
      var h = handles[k];
      var b = N('button', 'gk-gui-stuff-drawer-handle'); b.type = 'button'; b.dataset.key = k;
      b.appendChild(N('span', 'gk-gui-stuff-drawer-handle-label', h.label));
      if (h.count) { b.appendChild(N('span', 'gk-gui-stuff-drawer-handle-count', String(h.count))); b.classList.add('gk-gui-stuff-drawer-handle-news'); }
      b.title = h.title || h.label;
      b.setAttribute('aria-label', h.count ? h.label + ' (' + h.count + ')' : h.label);
      b.addEventListener('click', function () { h.open(); });
      box.appendChild(b);
    });
  }
  function drawerHandle(h) {
    handles[h.key] = h;
    handlesPaint();
    return { count: function (n) { if (h.count !== n) { h.count = n; handlesPaint(); } }, remove: function () { delete handles[h.key]; handlesPaint(); } };
  }
  G.drawer = { add: drawerAdd, remove: drawerRemove, handle: drawerHandle, tabs: function () { return tabs.map(function (t) { return t.key; }); } };
})();
