// gk_gui_stuff: the module help_link. Core's Hjälp in the top menu (and its copy in the narrow screen's menu) leads
// where the instance says. The target comes as a JSON element the server writes with this file while the module is on
// (#gk-gui-stuff-help-link, {href, new_tab}); core's link stays in the HTML, so with the module off the page is
// core's. Loaded deferred: it runs before core's own ready handlers copy the menu, and reaches a copy made before it
// too. Plain DOM, no jQuery.
(function () {
  var G = window.GkGui;
  function point() {
    var el = document.getElementById('gk-gui-stuff-help-link'), t = null;
    try { t = el ? JSON.parse(el.textContent) : null; } catch (e) { t = null; }
    if (!t || !t.href) return;
    document.querySelectorAll('#top-menu a.help, .js-flyout-menu a.help').forEach(function (a) {
      a.href = t.href;
      if (!t.new_tab) a.removeAttribute('target');
      G.effect(a, 'help_link');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', point); else point();
})();
