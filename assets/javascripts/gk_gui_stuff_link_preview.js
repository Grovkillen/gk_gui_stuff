// gk_gui_stuff link_preview: one card for every linkable object. Hovering a link inside the instance whose
// path a registered type knows shows the card after a short delay; focus on the link and Alt+ArrowDown opens
// it, Escape closes it, a long press opens it on a touch screen. The card's content comes from the server
// (gk_gui_stuff/preview/:type/:id) for the session's user; nothing is scraped. Plain DOM, no jQuery.
// The card of an external link: a link to another website that the server marked (data-gk-gui-ext-preview) gets
// the same hover, keys and long press. The mark is the server's signature of the address, sent back with it, so
// that only an address the server marked can be asked for. Its card comes from gk_gui_stuff/external_preview?url=,
// which the server fills from its own queue: an address not fetched yet answers 202, and the script asks once more after a while if
// the pointer or the focus is still on the link. The picture is the instance's own copy, so the reader never
// contacts the external website. Every text goes in as text; only the head's icon from the page's own config is
// markup.
(function () {
  var el = document.getElementById('gk-gui-stuff-stuff-config');
  if (!el) return;
  var cfg;
  try { cfg = JSON.parse(el.textContent); } catch (e) { return; }
  if (!cfg.preview) return;
  var root = cfg.urlRoot || '';
  var types = (cfg.preview.types || []).map(function (t) { return { key: t.key, re: new RegExp(t.pattern) }; });
  var ext = cfg.preview_external || null;
  var cache = {}, card = null, timer = null, hideTimer = null, current = null, pressTimer = null, pointed = null;

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
  // a link to another website that the server marked for a card
  function matchExternal(a) {
    if (!ext || !a || !a.href || a.origin === location.origin || a.closest('.gk-gui-stuff-preview')) return null;
    var sig = a.getAttribute('data-gk-gui-ext-preview');
    if (!sig) return null;
    return { ext: true, href: a.href, sig: sig };
  }
  function hitOf(a) { return match(a) || matchExternal(a); }
  function keyOf(hit) { return hit.ext ? 'ext:' + hit.href : hit.type + ':' + hit.id; }
  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function build(data, href) {
    var c = node('div', 'gk-gui-stuff-preview');
    window.GkGui.effect(c, 'link_preview');
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
  function newTab(a) {
    a.target = '_blank';
    window.GkGui.effect(a, 'external_new_tab');
    a.appendChild(node('span', 'hidden-for-sighted', ext.new_tab_hidden));
  }
  function buildExternal(data) {
    var c = node('div', 'gk-gui-stuff-preview gk-gui-stuff-preview-external');
    window.GkGui.effect(c, 'link_preview_external');
    c.setAttribute('role', 'tooltip');
    var head = node('div', 'gk-gui-stuff-preview-head');
    if (ext.icon) head.insertAdjacentHTML('beforeend', ext.icon);
    var words = node('span', null, ext.head + ' · ');
    var domain = node('span', null, data.domain || '');
    domain.setAttribute('dir', 'ltr');
    words.appendChild(domain);
    head.appendChild(words);
    c.appendChild(head);
    // the page's own picture over the card's width; the site's icon (data.icon) small at the title instead
    var img = null;
    if (data.image) {
      img = node('img', data.icon ? 'gk-gui-stuff-preview-icon' : 'gk-gui-stuff-preview-image');
      img.alt = '';
      img.decoding = 'async';
      // a picture removed at the cap since the card was loaded: the card stays, without a picture
      img.onerror = function () { img.remove(); };
      img.src = data.image;
      if (!data.icon) c.appendChild(img);
    }
    var body = node('div', 'gk-gui-stuff-preview-body');
    if (data.state === 'failed') {
      // the fetch failed: the address and the plain words, no picture, no text, no date
      c.classList.add('gk-gui-stuff-preview-failed');
      // the whole address (the head already names the domain)
      var a = node('a', 'gk-gui-stuff-preview-title', data.url || data.domain);
      a.href = data.url;
      a.rel = 'noopener noreferrer';
      if (ext.new_tab) newTab(a);
      body.appendChild(a);
      var why = node('p', 'gk-gui-stuff-preview-note', ext.failed || '');
      if (data.why) why.title = data.why;
      body.appendChild(why);
      c.appendChild(body);
      c.addEventListener('mouseenter', function () { clearTimeout(hideTimer); });
      c.addEventListener('mouseleave', scheduleHide);
      return c;
    }
    var t = node('a', 'gk-gui-stuff-preview-title', data.title || data.domain || data.url);
    t.href = data.url;
    t.rel = 'noopener noreferrer';
    if (ext.new_tab) newTab(t);
    if (img && data.icon) {
      var row = node('div', 'gk-gui-stuff-preview-title-row');
      row.appendChild(img);
      row.appendChild(t);
      body.appendChild(row);
    } else body.appendChild(t);
    if (data.text) body.appendChild(node('p', 'gk-gui-stuff-preview-text', data.text));
    // the site gives no picture of its own: the card says so, in plain words, with or without its icon
    var no = data.no_picture && ext.no_picture ? ext.no_picture[data.no_picture] : '';
    if (no) body.appendChild(node('p', 'gk-gui-stuff-preview-note', no));
    c.appendChild(body);
    c.appendChild(node('div', 'gk-gui-stuff-preview-foot', (data.fetched || '') + (ext.new_tab ? ' ' + ext.new_tab_foot : '')));
    c.addEventListener('mouseenter', function () { clearTimeout(hideTimer); });
    c.addEventListener('mouseleave', scheduleHide);
    return c;
  }
  // physical coordinates, as getBoundingClientRect gives them: the card starts at the link's start edge (its
  // right edge from right to left) and stays inside the window
  function place(a) {
    var r = a.getBoundingClientRect();
    card.style.top = (window.scrollY + r.bottom + 6) + 'px';
    var rtl = getComputedStyle(card).direction === 'rtl';
    var left = window.scrollX + (rtl ? r.right - card.offsetWidth : r.left);
    var min = window.scrollX + 8;
    var max = window.scrollX + document.documentElement.clientWidth - card.offsetWidth - 8;
    card.style.left = Math.max(min, Math.min(left, max)) + 'px';
    // no room below: above the link
    if (r.bottom + card.offsetHeight + 12 > window.innerHeight && r.top > card.offsetHeight + 12) {
      card.style.top = (window.scrollY + r.top - card.offsetHeight - 6) + 'px';
    }
  }
  // Core's tooltip of the link stands where the card comes (and it opens a moment before the card), so it is held back
  // from the moment a link may get a card until the card is gone. Core's widget goes on as usual: the link's title and
  // what the widget tells a screen reader stay, only the tooltip is not seen (the stylesheet, on this class). A link
  // that gets no card shows its tooltip as soon as that is known.
  function holdTip(on) { document.documentElement.classList.toggle('gk-gui-stuff-preview-tip-held', on); }
  function hide() {
    clearTimeout(timer); clearTimeout(hideTimer);
    if (card) { card.remove(); card = null; }
    current = null;
    holdTip(false);
  }
  function scheduleHide() { clearTimeout(hideTimer); hideTimer = setTimeout(hide, 250); }
  var pending = {}, early = null;
  // the card of an external address: ready (the card), queued (202: once more after retry_ms while the pointer or
  // the focus is still on the link; still not ready, no card for 30 s) or none (no card, kept)
  function askExternal(href, sig) {
    return fetch(ext.url + '?url=' + encodeURIComponent(href) + '&sig=' + encodeURIComponent(sig), { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (r.status === 202) return 'queued';
        // failed gives the card "Kunde inte hämtas" (the reason in its tooltip only for an administrator)
        return r.ok ? r.json().then(function (d) { return d && (d.state === 'ready' || d.state === 'failed') ? d : null; }) : null;
      });
  }
  function stillOn(href) {
    var f = document.activeElement;
    return (pointed && pointed.href === href) || (f && f.href === href) || (current && current.href === href);
  }
  function loadExternal(href, sig) {
    var key = 'ext:' + href;
    if (key in cache) return Promise.resolve(cache[key]);
    if (!pending[key]) {
      pending[key] = askExternal(href, sig)
        .then(function (d) {
          if (d !== 'queued') return d;
          return new Promise(function (ok) { setTimeout(ok, ext.retry_ms || 3000); }).then(function () {
            if (!stillOn(href)) return 'gone';
            return askExternal(href, sig).then(function (d2) {
              if (d2 !== 'queued') return d2;
              setTimeout(function () { delete cache[key]; }, 30000);
              return null;
            });
          });
        })
        .then(function (d) {
          delete pending[key];
          if (d === 'gone') return null; // nobody waits: asked again on the next hover
          cache[key] = d;
          return d;
        })
        .catch(function () { delete pending[key]; return null; });
    }
    return pending[key];
  }
  function load(hit) {
    if (hit.ext) return loadExternal(hit.href, hit.sig);
    var key = keyOf(hit);
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
    current = a;
    holdTip(true);
    function render(data) {
      if (current !== a) return;
      if (!data || busy()) { holdTip(false); return; }
      if (card) card.remove();
      card = hit.ext ? buildExternal(data) : build(data, a.href);
      document.body.appendChild(card);
      place(a);
    }
    load(hit).then(render);
  }
  document.addEventListener('mouseover', function (e) {
    var a = e.target.closest && e.target.closest('a');
    var hit = hitOf(a);
    if (!hit) return;
    pointed = a;
    if (a === current) { clearTimeout(hideTimer); return; }
    clearTimeout(timer); clearTimeout(hideTimer);
    // fetched a moment before the wait is over, not at once: a pointer only passing over a link asks the server nothing
    clearTimeout(early); early = setTimeout(function () { load(hit); }, Math.max(0, cfg.preview.delay - 120));
    if (busy()) return;
    holdTip(true);
    timer = setTimeout(function () { show(a, hit); }, cfg.preview.delay);
  });
  document.addEventListener('mouseout', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    if (a === pointed && !(e.relatedTarget && a.contains(e.relatedTarget))) pointed = null;
    clearTimeout(timer); clearTimeout(early);
    if (a === current) scheduleHide();
    else if (!card) holdTip(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') return hide();
    if (e.altKey && e.key === 'ArrowDown') {
      var a = document.activeElement, hit = hitOf(a);
      if (hit) { e.preventDefault(); show(a, hit); }
    }
  });
  document.addEventListener('touchstart', function (e) {
    var a = e.target.closest && e.target.closest('a'), hit = hitOf(a);
    if (!hit) { if (card && !e.target.closest('.gk-gui-stuff-preview')) hide(); return; }
    pressTimer = setTimeout(function () { show(a, hit); }, 600);
  }, { passive: true });
  ['touchend', 'touchmove', 'touchcancel'].forEach(function (ev) {
    document.addEventListener(ev, function () { clearTimeout(pressTimer); }, { passive: true });
  });
  window.addEventListener('scroll', function () { if (card && current) place(current); }, { passive: true });
})();
