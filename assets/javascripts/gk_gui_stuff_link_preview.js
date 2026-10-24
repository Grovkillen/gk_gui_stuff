// gk_gui_stuff link_preview: one card for every linkable object. Hovering a link inside the instance whose
// path a registered type knows shows the card after a short delay; focus on the link and Alt+ArrowDown opens
// it, Escape closes it, a long press opens it on a touch screen. The card's content comes from the server
// (gk_gui_stuff/preview/:type/:id) for the session's user; nothing is scraped. Plain DOM, no jQuery.
(function () {
  var el = document.getElementById('gk-gui-stuff-stuff-config');
  if (!el) return;
  var cfg;
  try { cfg = JSON.parse(el.textContent); } catch (e) { return; }
  if (!cfg.preview) return;
  var root = cfg.urlRoot || '';
  var types = cfg.preview.types.map(function (t) { return { key: t.key, re: new RegExp(t.pattern) }; });
  var cache = {}, card = null, timer = null, hideTimer = null, current = null, pressTimer = null;

  function match(a) {
    if (!a || !a.href || a.origin !== location.origin || a.closest('.gk-gui-stuff-preview')) return null;
    if (a.dataset.method || a.getAttribute('href').charAt(0) === '#') return null;
    var path = a.pathname;
    if (root && path.indexOf(root) === 0) path = path.slice(root.length);
    if (a.pathname === location.pathname) return null; // the page itself needs no card
    for (var i = 0; i < types.length; i++) {
      var m = types[i].re.exec(path);
      if (m) return { type: types[i].key, id: m[1] };
    }
    return null;
  }
  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function build(data, href) {
    var c = node('div', 'gk-gui-stuff-preview');
    c.setAttribute('role', 'tooltip');
    var h = node('a', 'gk-gui-stuff-preview-title', data.title); h.href = href; c.appendChild(h);
    if (data.subtitle) c.appendChild(node('div', 'gk-gui-stuff-preview-subtitle', data.subtitle));
    if (data.badges && data.badges.length) {
      var b = node('div', 'gk-gui-stuff-preview-badges');
      data.badges.forEach(function (x) { b.appendChild(node('span', 'gk-gui-stuff-preview-badge', x)); });
      c.appendChild(b);
    }
    if (data.text) c.appendChild(node('p', 'gk-gui-stuff-preview-text', data.text));
    if (data.fields && data.fields.length) {
      var dl = node('dl', 'gk-gui-stuff-preview-fields');
      data.fields.forEach(function (f) { dl.appendChild(node('dt', null, f[0])); dl.appendChild(node('dd', null, f[1])); });
      c.appendChild(dl);
    }
    c.addEventListener('mouseenter', function () { clearTimeout(hideTimer); });
    c.addEventListener('mouseleave', scheduleHide);
    return c;
  }
  function place(a) {
    var r = a.getBoundingClientRect();
    card.style.insetBlockStart = (window.scrollY + r.bottom + 6) + 'px';
    var left = window.scrollX + r.left;
    var max = window.scrollX + document.documentElement.clientWidth - card.offsetWidth - 8;
    card.style.insetInlineStart = Math.max(8, Math.min(left, max)) + 'px';
    // no room below: above the link
    if (r.bottom + card.offsetHeight + 12 > window.innerHeight && r.top > card.offsetHeight + 12) {
      card.style.insetBlockStart = (window.scrollY + r.top - card.offsetHeight - 6) + 'px';
    }
  }
  function hide() {
    clearTimeout(timer); clearTimeout(hideTimer);
    if (card) { card.remove(); card = null; }
    current = null;
  }
  function scheduleHide() { clearTimeout(hideTimer); hideTimer = setTimeout(hide, 250); }
  var pending = {}, early = null;
  function load(hit) {
    var key = hit.type + ':' + hit.id;
    if (key in cache) return Promise.resolve(cache[key]);
    if (!pending[key]) {
      pending[key] = fetch(root + '/gk_gui_stuff/preview/' + hit.type + '/' + hit.id, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) { cache[key] = data; delete pending[key]; return data; })
        .catch(function () { delete pending[key]; return null; });
    }
    return pending[key];
  }
  // No card while the page is on its way somewhere else: a link was clicked, a form was sent, or a wave stands
  // in the foreground. The wait that was running is dropped, and a card that was up goes away.
  var leaving = false;
  function busy() { return leaving || !!document.querySelector('.gk-gui-stuff-wave-on'); }
  function drop() { clearTimeout(timer); clearTimeout(early); clearTimeout(pressTimer); hide(); }
  document.addEventListener('mousedown', function (e) { if (!(e.target.closest && e.target.closest('.gk-gui-stuff-preview'))) drop(); }, true);
  document.addEventListener('click', function (e) {
    var l = e.target.closest && e.target.closest('a[href]');
    if (l && !l.closest('.gk-gui-stuff-preview') && l.getAttribute('href').charAt(0) !== '#') { leaving = true; drop(); setTimeout(function () { leaving = false; }, 4000); }
  }, true);
  // a form sent by a script (fetch, a remote form) prevents the browser's own sending and the page stays: whether the
  // page leaves is known only once the event has run
  document.addEventListener('submit', function (e) {
    drop();
    setTimeout(function () {
      if (e.defaultPrevented) return;
      leaving = true;
      setTimeout(function () { leaving = false; }, 4000);
    }, 0);
  }, true);
  window.addEventListener('pagehide', function () { leaving = true; drop(); });
  window.addEventListener('pageshow', function () { leaving = false; });
  function show(a, hit) {
    if (busy()) return;
    var key = hit.type + ':' + hit.id;
    current = a;
    function render(data) {
      if (current !== a || !data || busy()) return;
      if (card) card.remove();
      card = build(data, a.href);
      document.body.appendChild(card);
      place(a);
    }
    load(hit).then(render);
  }
  document.addEventListener('mouseover', function (e) {
    var a = e.target.closest && e.target.closest('a');
    var hit = match(a);
    if (!hit) return;
    if (a === current) { clearTimeout(hideTimer); return; }
    clearTimeout(timer); clearTimeout(hideTimer);
    // fetched a moment before the wait is over, not at once: a pointer only passing over a link asks the server nothing
    clearTimeout(early); early = setTimeout(function () { load(hit); }, Math.max(0, cfg.preview.delay - 120));
    if (busy()) return;
    timer = setTimeout(function () { show(a, hit); }, cfg.preview.delay);
  });
  document.addEventListener('mouseout', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    clearTimeout(timer); clearTimeout(early);
    if (a === current) scheduleHide();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') return hide();
    if (e.altKey && e.key === 'ArrowDown') {
      var a = document.activeElement, hit = match(a);
      if (hit) { e.preventDefault(); show(a, hit); }
    }
  });
  document.addEventListener('touchstart', function (e) {
    var a = e.target.closest && e.target.closest('a'), hit = match(a);
    if (!hit) { if (card && !e.target.closest('.gk-gui-stuff-preview')) hide(); return; }
    pressTimer = setTimeout(function () { show(a, hit); }, 600);
  }, { passive: true });
  ['touchend', 'touchmove', 'touchcancel'].forEach(function (ev) {
    document.addEventListener(ev, function () { clearTimeout(pressTimer); }, { passive: true });
  });
  window.addEventListener('scroll', function () { if (card && current) place(current); }, { passive: true });
})();
