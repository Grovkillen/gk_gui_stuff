// gk_gui_stuff user_status: a dot after every link to a person (core's a.user), coloured by the state the source
// gives (readup's lamp: active, idle, away; absent and busy when the source knows them). Hovering gives the state in
// words and when the person was last seen, in rough terms only. One request for all names on the page, again about
// once a minute for the names still there; never one per name. A click on the dot is an event (gk-gui-stuff:user-click)
// for whoever listens (readup's chat). Plain DOM, no jQuery.
(function () {
  var G = window.GkGui;
  if (!G || !G.on('user_status')) return;
  var opt = G.opt('user_status');
  if (!opt.url) return;
  var known = {}, asked = {}, pending = null, STATES = ['active', 'idle', 'away', 'absent', 'busy'];

  function idOf(a) {
    var m = /\/users\/(\d+)(?:$|[?#])/.exec(a.getAttribute('href') || '');
    return m ? m[1] : null;
  }
  function links(root) {
    return Array.prototype.slice.call((root || document).querySelectorAll('a.user[href*="/users/"]'));
  }
  function paint(a) {
    var id = idOf(a), s = id && known[id];
    var dot = a.nextElementSibling && a.nextElementSibling.classList.contains('gk-gui-stuff-status') ? a.nextElementSibling : null;
    if (!s) { if (dot) dot.remove(); return; }
    if (!dot) {
      dot = G.node('span', 'gk-gui-stuff-status');
      dot.setAttribute('role', 'button');
      dot.tabIndex = 0;
      // a click on the dot is for the source's plugin (readup opens a direct channel): an event, never a route here
      var say = function (e) {
        if (e.type === 'keydown' && e.key !== 'Enter') return;
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('gk-gui-stuff:user-click', { detail: { id: idOf(a), name: a.textContent.trim() } }));
      };
      dot.addEventListener('click', say); dot.addEventListener('keydown', say);
      a.insertAdjacentElement('afterend', dot);
    }
    var st = STATES.indexOf(s.state) >= 0 ? s.state : 'away';
    dot.className = 'gk-gui-stuff-status gk-gui-stuff-status-' + st;
    var words = s.label + (s.seen ? ', ' + s.seen : '');
    dot.title = words; dot.setAttribute('aria-label', words);
  }
  function ask(ids) {
    if (!ids.length) return;
    ids.forEach(function (i) { asked[i] = true; });
    fetch(opt.url + (opt.url.indexOf('?') < 0 ? '?' : '&') + 'ids=' + ids.join(','), { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : { users: {} }; })
      .then(function (data) {
        var users = (data && data.users) || {};
        ids.forEach(function (i) { known[i] = users[i] || null; });
        links().forEach(paint);
      }).catch(function () { /* no dots */ });
  }
  function sweep(root) {
    var fresh = [];
    links(root).forEach(function (a) {
      var id = idOf(a);
      if (!id) return;
      if (id in known) paint(a); else if (!asked[id] && fresh.indexOf(id) < 0) fresh.push(id);
    });
    if (fresh.length) { clearTimeout(pending); pending = setTimeout(function () { ask(fresh); }, 50); }
  }
  function onPage() {
    var ids = [];
    links().forEach(function (a) { var id = idOf(a); if (id && ids.indexOf(id) < 0) ids.push(id); });
    return ids;
  }
  function take(users) {
    Object.keys(users || {}).forEach(function (i) { known[i] = users[i]; });
    links().forEach(paint);
  }
  // the page package and the pulse stand at the end of the page: set up once it is read
  function setup() {
    // The first answer came with the page (gkGuiStuffPage, the people it was drawn with); only names that came later
    // are asked for
    var P = window.gkGuiStuffPulse, given = P && P.data('user_status');
    if (given) {
      (given.asked || []).forEach(function (i) { asked[i] = true; if (!(i in known)) known[i] = null; });
      Object.keys(given.users || {}).forEach(function (i) { known[i] = given.users[i]; });
    }
    G.onContent(sweep);
    var every = Math.max(30, opt.refresh || 60) * 1000, last = Date.now(), sent = [];
    if (P && opt.pulse) {
      // the refresh rides on the shared pulse, about once a minute
      P.add('user_status', {
        collect: function () { if (Date.now() - last < every) return null; var ids = onPage(); if (!ids.length) return null; last = Date.now(); sent = ids; return { ids: ids }; },
        handle: function (d) { var u = (d && d.users) || {}; sent.forEach(function (i) { if (!(i in u)) known[i] = null; }); take(u); }
      });
    } else {
      setInterval(function () {
        if (document.hidden) return;
        ask(onPage());
      }, every);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
