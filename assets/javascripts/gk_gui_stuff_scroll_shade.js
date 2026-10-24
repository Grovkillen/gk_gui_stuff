// gk_gui_stuff scroll_shade.
// A surface of GK's own that scrolls (a list in a panel, the columns chooser) shows a faint shadow at the edge where
// there is more to scroll to, and none at an end, so that a cut-off list is seen as going on under the edge. Only GK's
// elements (a class starting with gk-) that scroll on their own; core's pages are left as core has them.
(function () {
  var G = window.GkGui;
  if (!G || !G.on('scroll_shade')) return;

  function scrolls(el) {
    var o = window.getComputedStyle(el).overflowY;
    return (o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight + 1;
  }
  function paint(el) {
    var more = scrolls(el);
    el.classList.toggle('gk-gui-stuff-shade-above', more && el.scrollTop > 0);
    el.classList.toggle('gk-gui-stuff-shade-below', more && el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  }
  function scan() {
    document.querySelectorAll('[class*="gk-"]').forEach(function (el) {
      if (el.dataset.gkGuiStuffShade) { paint(el); return; }
      if (!scrolls(el)) return;
      el.dataset.gkGuiStuffShade = '1';
      // the surface's own shadow (a panel's) is kept under the edge's
      var own = window.getComputedStyle(el).boxShadow;
      if (own && own !== 'none') el.style.setProperty('--gk-gui-stuff-shade-own', own);
      paint(el);
    });
  }
  var timer = null;
  function later() { clearTimeout(timer); timer = setTimeout(scan, 60); }

  // a surface that scrolls updates at once; one that opens (a panel, a chooser) is found after the click that opened it
  document.addEventListener('scroll', function (e) { var t = e.target; if (t && t.dataset && t.dataset.gkGuiStuffShade) paint(t); }, true);
  document.addEventListener('click', later, true);
  window.addEventListener('resize', later);
  G.onContent(later);
})();
