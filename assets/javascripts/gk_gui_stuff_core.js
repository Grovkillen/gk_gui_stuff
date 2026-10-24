// gk_gui_stuff kernel: what the small modules share. One content observer (modules register an idempotent
// function with onContent, never their own observer), the whisper ("kopierat"), local memory, the texts and
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
  // The whisper: a confirmation nobody needs to read or answer ("Kodblock kopierat"). Small, dark, dim, low in
  // the middle, no cross, no countdown, gone in a moment. Unlike a notice, which says something.
  function whisper(text) {
    if (!noticeEl) {
      noticeEl = document.createElement('div');
      noticeEl.className = 'gk-gui-stuff-notice';
      noticeEl.setAttribute('role', 'status');
      noticeEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(noticeEl);
    }
    noticeEl.textContent = text;
    noticeEl.classList.add('gk-gui-stuff-notice-on');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(function () { noticeEl.classList.remove('gk-gui-stuff-notice-on'); }, 1600);
  }
  // copy(text, said): said is the whisper that confirms it ("E-postadress kopierad"): where it was copied from,
  // never the copied text itself, which nobody reads
  function copy(text, said) {
    function ok() { whisper(said || (cfg.t && cfg.t.copied) || 'Copied'); }
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(ok, fallback); } else { fallback(); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.className = 'gk-gui-stuff-offscreen';
      document.body.appendChild(ta); ta.select();
      try { if (document.execCommand('copy')) ok(); } catch (e) { /* nothing copied, nothing said */ }
      ta.remove();
    }
  }
  var NOT_IN_SPRITE = { play: 1, pause: 1 }; // names core's sprite does not have
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
    copy: copy,
    get: function (k) { try { return window.localStorage.getItem('gkguistuff.' + k); } catch (e) { return null; } },
    set: function (k, v) { try { if (v == null) window.localStorage.removeItem('gkguistuff.' + k); else window.localStorage.setItem('gkguistuff.' + k, v); } catch (e) { /* no memory */ } },
    // an icon from icons (core's or the environment's own); without icons core's own sprite (the address read from
    // an icon core drew on the page); the character only when neither is there
    // Names core's sprite does not have (NOT_IN_SPRITE) are not asked of it, which
    // would draw an empty icon; without icons they are the character
    icon: function (name, fallback, size) {
      if (window.GkIcons) { var s = window.GkIcons.svg(name, size || 16); s.classList.add('gk-gui-stuff-icon'); return s; }
      var u = name && !NOT_IN_SPRITE[name] && document.querySelector('svg.icon-svg use'), base = u ? (u.getAttribute('href') || '').split('#')[0] : '';
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
  return api; // copy() says it through api.notice, so that the shared notice takes over when the elements are loaded
})();
