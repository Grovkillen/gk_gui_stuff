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
    // the page's name comes with the page (window.gkGuiStuffPage.data.page_title: the parts core's html_title was
    // given, without the instance's name), never cut out of the window's title
    var title = String(((window.gkGuiStuffPage || {}).data || {}).page_title || '').trim();
    if (!title) return;
    var list = read().filter(function (x) { return x.u !== path; });
    list.unshift({ u: path, t: title.slice(0, 120) });
    G.set(KEY, JSON.stringify(list.slice(0, MAX)));
  }
  // The menu entry is the server's: an item of core's top menu (Redmine::MenuManager, :top_menu) whose link has the
  // class gk-gui-stuff-history-toggle, so that core draws it among its own items wherever core puts them, and it can
  // be renamed as every top menu entry. This script finds that link by its own class and hangs the list on the row
  // core drew around it; it never looks for core's list.
  function build() {
    var a = document.querySelector('#top-menu a.gk-gui-stuff-history-toggle'), li = a && a.closest('li');
    if (!li || document.getElementById('gk-gui-stuff-history')) return;
    li.classList.add('gk-gui-stuff-history');
    li.id = 'gk-gui-stuff-history';
    G.effect(li, 'recent_pages');
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
    li.appendChild(panel);
  }
  // The page's data is written at the end of the body (view_layouts_base_body_bottom), after this script in the head
  // has run: the page is remembered once, on the first pass over the content (DOMContentLoaded), when the data is there
  var remembered = false;
  G.onContent(function () { if (!remembered) { remembered = true; remember(); } });
  G.onContent(build);
})();
