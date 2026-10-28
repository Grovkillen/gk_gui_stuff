// gk_gui_stuff pulse: one request for what the plugins must ask after the page has opened. A plugin adds a part:
// gkGuiStuffPulse.add(key, { collect: function  { return payload or null; }, handle: function (answer) {} }).
// About every few seconds while the tab is in view, the parts that have something to say go in one POST; a pulse with
// nothing in it is not sent. now() sends at once (a tab coming back into view does it by itself). Plain DOM, no jQuery.
window.gkGuiStuffPulse = (function () {
  var page = window.gkGuiStuffPage || {};
  var cfg = page.pulse || {};
  var parts = {}, busy = false, stale = false;
  function token() { var m = document.querySelector('meta[name="csrf-token"]'); return m ? m.getAttribute('content') : ''; }
  function tick() {
    if (busy || stale || document.hidden || !cfg.url) return;
    var body = {}, any = false;
    Object.keys(parts).forEach(function (k) {
      var v = null;
      try { v = parts[k].collect(); } catch (e) { v = null; }
      if (v != null) { body[k] = v; any = true; }
    });
    if (!any) return;
    busy = true;
    fetch(cfg.url, { method: 'POST', credentials: 'same-origin', body: JSON.stringify({ parts: body }),
                     headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-Token': token() } })
      // 401 or 422: the page belongs to a session that has ended (signed out, signed in again or switched user in
      // another tab); it asks no more until it is opened again
      .then(function (r) { if (r.status === 401 || r.status === 422) { stale = true; } return r.ok ? r.json() : {}; })
      .then(function (d) {
        Object.keys(d || {}).forEach(function (k) { if (parts[k] && parts[k].handle) { try { parts[k].handle(d[k]); } catch (e) { /* next pulse */ } } });
      })
      .catch(function () { /* next pulse */ })
      .then(function () { busy = false; });
  }
  if (cfg.url) {
    setInterval(tick, Math.max(10, cfg.seconds || 30) * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
  }
  return {
    add: function (key, part) { parts[key] = part; },
    now: tick,
    data: function (key) { return (page.data || {})[key]; }
  };
})();
