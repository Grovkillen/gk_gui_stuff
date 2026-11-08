// gk_gui_stuff kernel: what the small modules share. One content observer (modules register an idempotent
// function with onContent, never their own observer), the whisper ("Kopierat"), local memory, the texts and
// options the server sent for the modules that are on. Plain DOM, no jQuery. Loaded only when a module needs it.
window.GkGui = (function () {
  var el = document.getElementById('gk-gui-stuff-stuff-config');
  var cfg = {};
  try { cfg = JSON.parse(el.textContent); } catch (e) { cfg = { modules: [] }; }
  var fns = [], timer = null, ready = document.readyState !== 'loading';

  function run() {
    timer = null;
    fns.forEach(function (f) { try { f(document); } catch (e) { if (window.console) console.error('[gk_gui_stuff_ui]', e); } });
  }
  function schedule() { if (!timer) timer = setTimeout(run, 60); }
  function start() {
    ready = true;
    run();
    var target = document.getElementById('content') || document.body;
    new MutationObserver(function (list) {
      // our own nodes (class gk-gui-stuff-*) never start a new pass
      for (var i = 0; i < list.length; i++) {
        for (var j = 0; j < list[i].addedNodes.length; j++) {
          var n = list[i].addedNodes[j];
          if (n.nodeType === 1 && !/(^|\s)gk-gui-stuff-/.test(n.className || '')) { schedule(); return; }
        }
      }
    }).observe(target, { childList: true, subtree: true });
  }
  if (ready) setTimeout(start, 0); else document.addEventListener('DOMContentLoaded', start);

  var noticeEl = null, noticeTimer = null;
  // The whisper: a confirmation nobody needs to read or answer ("Kopierat: kodblock"). Small, in the role info, no
  // cross, no countdown, gone in 1.5 s. Unlike a notice, which says something. GkGui.whisper(text, at) or
  // GkGui.whisper(text, { at, place }): at is the button, field or code it came from, still on the page. place: element
  // (the default) right under at, and low in the middle when at is gone; top, center or bottom in the middle of the
  // window; pointer at the pointer, and after a key press, or with no pointer yet, at the focus, else at at. Its live region is put into the page empty (whisperRegion, which a page may ask for when it starts) and
  // the text set a frame later, since many screen readers do not read a live region that comes with its text
  function whisperRegion() {
    if (noticeEl || !document.body) return false;
    noticeEl = document.createElement('div');
    noticeEl.className = 'gk-gui-stuff-notice';
    noticeEl.setAttribute('role', 'status');
    noticeEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(noticeEl);
    return true;
  }
  // where the pointer last was, and whether a key was the last thing used: the whisper at the pointer goes by them
  var pointer = null, byKeys = false;
  function pointed(e) { pointer = { x: e.clientX, y: e.clientY }; byKeys = false; }
  document.addEventListener('pointerdown', pointed, true);
  document.addEventListener('pointermove', pointed, { capture: true, passive: true });
  document.addEventListener('keydown', function () { byKeys = true; }, true);
  function boxOf(n) {
    var r = n && n.isConnected && n.getBoundingClientRect ? n.getBoundingClientRect() : null;
    return r && r.width ? r : null;
  }
  // the box the whisper stands under, or null for the middle of the window
  function whisperBox(at, place) {
    if (place === 'top' || place === 'center' || place === 'bottom') return null;
    if (place !== 'pointer') return boxOf(at);
    // under the arrow, which reaches about 16 px below where it points
    if (pointer && !byKeys) return { left: pointer.x, top: pointer.y, bottom: pointer.y + 16, width: 0 };
    var focus = document.activeElement;
    return (focus && focus !== document.body && boxOf(focus)) || boxOf(at);
  }
  var noticePlace = 'bottom';
  function whisper(text, at) {
    if (whisperRegion() && window.requestAnimationFrame) {
      window.requestAnimationFrame(function () { whisper(text, at); });
      return;
    }
    if (!noticeEl) return;
    noticeEl.textContent = text;
    var o = at && !at.nodeType ? at : { at: at }, r = whisperBox(o.at, o.place), now = r ? 'at' : (o.place === 'top' || o.place === 'center' ? o.place : 'bottom');
    // a change between the places is made without the transition, so the whisper never slides from one place to
    // another; it only rises into place as before
    var moving = noticePlace !== now;
    if (moving) noticeEl.style.transition = 'none';
    noticePlace = now;
    noticeEl.classList.toggle('gk-gui-stuff-notice-at', now === 'at');
    noticeEl.classList.toggle('gk-gui-stuff-notice-top', now === 'top');
    noticeEl.classList.toggle('gk-gui-stuff-notice-center', now === 'center');
    // fixed, in the window's coordinates: it stays right under the element (also one in a fixed surface), above it
    // where there is no room under it, and, faded out, never makes the page longer
    var below = r ? r.bottom + 4 : 0, tall = noticeEl.offsetHeight;
    if (r && below + tall > document.documentElement.clientHeight - 8) below = Math.max(8, r.top - 4 - tall);
    noticeEl.style.top = r ? below + 'px' : '';
    if (r) {
      var half = noticeEl.offsetWidth / 2, x = r.left + r.width / 2;
      x = Math.max(half + 8, Math.min(x, document.documentElement.clientWidth - half - 8));
      noticeEl.style.left = x + 'px';
    } else { noticeEl.style.left = ''; }
    if (moving) { void noticeEl.offsetWidth; noticeEl.style.transition = ''; }
    noticeEl.classList.add('gk-gui-stuff-notice-on');
    // whisper_tooltip: Redmine's tooltip goes at once, and one that comes late stays out of sight while the whisper shows.
    // jQuery UI closes its own record of the removed tooltip when the pointer leaves, and gives the title back then.
    var tips = cfg.modules && cfg.modules.indexOf('whisper_tooltip') >= 0;
    function tipsOut(keep) {
      document.querySelectorAll('.ui-tooltip').forEach(function (n) {
        var target = n.id && document.querySelector('[aria-describedby="' + n.id + '"]');
        if (!(keep && keep(target))) n.remove();
      });
    }
    var under = document.querySelectorAll(':hover');
    under = under[under.length - 1] || null;
    if (tips) {
      tipsOut();
      document.documentElement.classList.add('gk-gui-stuff-tip-held');
    }
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(function () {
      noticeEl.classList.remove('gk-gui-stuff-notice-on');
      // the one that came while the whisper showed goes too, or it would come up when the whisper has gone; not the
      // one of an element the pointer has moved on to, which is a help text of its own
      if (tips) {
        tipsOut(function (target) { return target && target.matches(':hover') && !target.contains(under); });
        document.documentElement.classList.remove('gk-gui-stuff-tip-held');
      }
    }, 1500);
  }
  // copy(text, said, at): said is the whisper that confirms it ("Kopierat: e-postadress"): where it was copied from,
  // never the copied text itself, which nobody reads; at is the element it was copied from, the whisper stands under it
  // (or { at, place }, as the whisper's)
  function copy(text, said, at) {
    function ok() { whisper(said || (cfg.t && cfg.t.copied) || 'Copied', at); }
    if (navigator.clipboard && window.isSecureContext) { ownCopy(function () { navigator.clipboard.writeText(text).then(ok, fallback); }); } else { fallback(); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.className = 'gk-gui-stuff-offscreen';
      document.body.appendChild(ta); ta.select();
      try { if (ownCopy(function () { return document.execCommand('copy'); })) ok(); } catch (e) { /* nothing copied, nothing said */ }
      ta.remove();
    }
  }
  // ownCopy(fn): a copy GK says itself, which core_copy_whisper (gk_gui_stuff_copy.js) leaves alone
  var owning = false;
  function ownCopy(fn) { owning = true; try { return fn(); } finally { owning = false; } }
  var NOT_IN_SPRITE = { play: 1, pause: 1, minimize: 1 }; // names core's sprite does not have
  var api = {
    cfg: cfg,
    // the client side of actions_menu's rows of kind action: a plugin's script puts its function here by name
    actions: {},
    on: function (key) { return (cfg.modules || []).indexOf(key) >= 0; },
    opt: function (key) { return (cfg.opt && cfg.opt[key]) || {}; },
    t: function (key, vars) {
      var s = (cfg.t && cfg.t[key]) || key;
      Object.keys(vars || {}).forEach(function (k) { s = s.replace('%{' + k + '}', vars[k]); });
      return s;
    },
    onContent: function (fn) { fns.push(fn); if (ready) { try { fn(document); } catch (e) { /* next pass */ } } },
    notice: whisper, // replaced by the shared notice when the elements are loaded
    whisper: whisper,
    whisperRegion: whisperRegion,
    copy: copy,
    ownCopy: ownCopy,
    owningCopy: function () { return owning; },
    get: function (k) { try { return window.localStorage.getItem('gkguistuff.' + k); } catch (e) { return null; } },
    set: function (k, v) { try { if (v == null) window.localStorage.removeItem('gkguistuff.' + k); else window.localStorage.setItem('gkguistuff.' + k, v); } catch (e) { /* no memory */ } },
    // an icon from icons (core's or the environment's own); without icons core's own sprite (the address read from
    // an icon core drew on the page), or compat's for a name the series' sprite lacks; the character only when
    // neither is there
    // Names core's sprite does not have (NOT_IN_SPRITE) are not asked of it, which
    // would draw an empty icon; without icons they are the character
    icon: function (name, fallback, size) {
      if (window.GkIcons) { var s = window.GkIcons.svg(name, size || 16); s.classList.add('gk-gui-stuff-icon'); return s; }
      // a name the running series' core sprite lacks comes from the sprite the server names (cfg.sprites, from compat)
      var own = name && cfg.sprites && cfg.sprites[name];
      var u = !own && name && !NOT_IN_SPRITE[name] && document.querySelector('svg.icon-svg use'), base = own || (u ? (u.getAttribute('href') || '').split('#')[0] : '');
      if (base) {
        var NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'), use = document.createElementNS(NS, 'use');
        svg.setAttribute('class', 'icon-svg gk-gui-stuff-icon'); svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('width', size || 16); svg.setAttribute('height', size || 16);
        use.setAttribute('href', base + '#icon--' + name); svg.appendChild(use); return svg;
      }
      return document.createTextNode(fallback || '');
    },
    put: function (el, name, fallback, size) { el.textContent = ''; el.appendChild(api.icon(name, fallback, size)); return el; },
    node: function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  };
  // what the primitives put on GkGui before the kernel came (gk_gui_stuff_primitives.js: fly, save, layer) is kept
  var before = window.GkGui || {};
  Object.keys(before).forEach(function (k) { if (!(k in api)) api[k] = before[k]; });
  return api; // copy() says it through api.notice, so that the shared notice takes over when the elements are loaded
})();
