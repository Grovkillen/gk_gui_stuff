// gk_gui_stuff recent_pages: the pages you were last on, as a list in the top menu ("Senast besökta").
// Kept in this browser only (local storage), at most 15, newest first, the page you are on left out. Issues,
// wiki pages, projects and the other pages with a title; never forms (new, edit) or the administration.
(function () {
  var G = window.GkGui;
  if (!G || !G.on('recent_pages')) return;
  var MAX = 15, KEY = 'history';
  function read() {
    try { return JSON.parse(G.get(KEY) || '[]').map(function (x) { return { u: x.u, t: String(x.t).replace(/^\[[^\]]+\]\s*/, '') }; }); } catch (e) { return []; }
  }
  function remember() {
    var path = location.pathname;
    if (/\/(new|edit|login|logout|admin|settings)(\/|$)/.test(path) || path === '/' ) return;
    var title = document.title.replace(/^\[[^\]]+\]\s*/, '').replace(/\s+-\s+[^-]+$/, '').trim(); // without the instance band's prefix // drop the instance name at the end
    if (!title) return;
    var list = read().filter(function (x) { return x.u !== path; });
    list.unshift({ u: path, t: title.slice(0, 120) });
    G.set(KEY, JSON.stringify(list.slice(0, MAX)));
  }
  function build() {
    var menu = document.querySelector('#top-menu .top-menu__links ul, #top-menu > ul');
    if (!menu || document.getElementById('gk-gui-stuff-history')) return;
    var li = G.node('li', 'gk-gui-stuff-history');
    li.id = 'gk-gui-stuff-history';
    var a = G.node('a', 'gk-gui-stuff-history-toggle', G.t('history'));
    a.href = '#';
    a.setAttribute('aria-haspopup', 'true');
    a.setAttribute('aria-expanded', 'false');
    var panel = G.node('ul', 'gk-gui-stuff-history-list');
    panel.hidden = true;
    function fill() {
      panel.textContent = '';
      var list = read().filter(function (x) { return x.u !== location.pathname; });
      if (!list.length) { panel.appendChild(G.node('li', 'gk-gui-stuff-history-empty', G.t('history_empty'))); return; }
      list.forEach(function (x) {
        var item = G.node('li'), link = G.node('a', null, x.t);
        link.href = x.u;
        item.appendChild(link);
        panel.appendChild(item);
      });
    }
    function toggle(open) {
      if (open) fill();
      panel.hidden = !open;
      a.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { var first = panel.querySelector('a'); if (first) first.focus(); }
    }
    a.addEventListener('click', function (e) { e.preventDefault(); toggle(panel.hidden); });
    // a click or a touch anywhere outside closes it (capture: also where the page stops the event itself)
    ['mousedown', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, function (e) { if (!panel.hidden && !li.contains(e.target)) toggle(false); }, true);
    });
    document.addEventListener('focusin', function (e) { if (!panel.hidden && !li.contains(e.target)) toggle(false); });
    li.addEventListener('keydown', function (e) { if (e.key === 'Escape') { toggle(false); a.focus(); } });
    li.appendChild(a); li.appendChild(panel);
    menu.appendChild(li);
  }
  remember();
  G.onContent(build);
})();
