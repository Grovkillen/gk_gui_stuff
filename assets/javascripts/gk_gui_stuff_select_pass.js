// gk_gui_stuff: the pass of the searchable chooser, loaded right after gk_gui_stuff_select.js (whose
// GkGui.selectSearch.enhance and skip it uses), before the kernel; what it puts on GkGui is kept.
//   GkGui.selectSearch.pass(root)   the fields under root that ask for the chooser get it
// A field that asks for the chooser (data-gk-gui-select="on", "create" or "create-denied") gets it whether
// select_search is on or not; the module only gives core's long lists the chooser by itself (gk_gui_stuff_lists.js).
// The pass runs over #content when the page is read, over new content through the kernel's onContent, and over a
// layer's or a fly's box when it opens (GkGui.layer and the fly call it), with no observer of its own. Lists in
// core's query filters and column choice, in the toolbar, one a script shows or hides itself, a box of rows (size)
// and one that says off are left as they are.
(function () {
  var G = window.GkGui = window.GkGui || {};
  var S = G.selectSearch;
  if (!S) return;
  var ASKED = 'select[data-gk-gui-select="on"], select[data-gk-gui-select="create"], select[data-gk-gui-select="create-denied"]';
  function pass(root) {
    (root || document).querySelectorAll(ASKED).forEach(function (sel) {
      if (sel.dataset.gkGuiSs || sel.closest(S.skip) || !sel.closest('#content, .gk-gui-stuff-layer, .gk-gui-stuff-fly-box')) return;
      if (sel.hidden || sel.style.display === 'none' || Number(sel.getAttribute('size') || 0) > 1) return;
      S.enhance(sel);
    });
  }
  S.pass = pass;
  function start() {
    pass(document);
    // the kernel's GkGui, not the one this file found when it was read: onContent is only on the kernel's
    var K = window.GkGui;
    if (K.onContent) K.onContent(pass);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start, 0);
})();
