// gk_gui_stuff: the shadow at the edge of a surface that scrolls, a primitive, always loaded with the primitives.
// A surface that scrolls shows a faint shadow at each edge where there is more to scroll to, and none at an end, so
// that a cut-off list or table is seen as going on under the edge: above and below, and at the inline start and end
// when it scrolls sideways, in logical directions so that it follows right to left, and on all those edges at once
// where it scrolls both ways.
//   GK's own pages (the server writes <meta name="gk-gui-stuff-page" content="gk"> in the head): always, for every
//     surface there: GK's elements (a class starting with gk-), Redmine's .autoscroll around a wide table, a pre and
//     anything with an overflow of its own in its style attribute.
//   Redmine's own pages: only while the module scroll_shade is on, for GK's elements and Redmine's .autoscroll.
// The shadow is the surface's ::after, laid over what it shows at the part that is seen (the custom properties
// --gk-gui-stuff-shade-x, -y, -w, -h, -dir, gk_gui_stuff_shade.css), so that rows with a background of their own
// never cover it; the surface is its containing block (the class gk-gui-stuff-shade-anchor gives a static one
// position: relative). The surface's own box-shadow is never touched.
//   GkGui.shade.paint(el)    measures one surface again (after a script changed its size)
(function () {
  var G = window.GkGui = window.GkGui || {};
  var CORE = '[class*="gk-"], .autoscroll';
  var GK = CORE + ', pre, [style*="overflow"]';
  var sel = null;

  function open(o) { return o === 'auto' || o === 'scroll'; }
  // which ways the surface scrolls: { y, x }
  function ways(el) {
    var cs = window.getComputedStyle(el);
    return { y: open(cs.overflowY) && el.scrollHeight > el.clientHeight + 1, x: open(cs.overflowX) && el.scrollWidth > el.clientWidth + 1 };
  }
  function paint(el) {
    // the layer is a positioned box in the surface and so counts towards what it scrolls over: taken away while
    // measuring, a surface whose content shrank (a filter that hides rows) lets the browser pull its scroll position
    // back, instead of the layer holding the old place open over empty space
    el.classList.remove('gk-gui-stuff-shaded');
    var w = ways(el), st = el.style;
    // in right to left the start is the right edge and scrollLeft runs from 0 to the negative
    var rtl = window.getComputedStyle(el).direction === 'rtl', along = Math.abs(el.scrollLeft);
    el.classList.toggle('gk-gui-stuff-shade-above', w.y && el.scrollTop > 0);
    el.classList.toggle('gk-gui-stuff-shade-below', w.y && el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    el.classList.toggle('gk-gui-stuff-shade-start', w.x && along > 0);
    el.classList.toggle('gk-gui-stuff-shade-end', w.x && along + el.clientWidth < el.scrollWidth - 1);
    el.classList.toggle('gk-gui-stuff-shaded', w.x || w.y);
    st.setProperty('--gk-gui-stuff-shade-x', along + 'px');
    st.setProperty('--gk-gui-stuff-shade-y', el.scrollTop + 'px');
    st.setProperty('--gk-gui-stuff-shade-w', el.clientWidth + 'px');
    st.setProperty('--gk-gui-stuff-shade-h', el.clientHeight + 'px');
    st.setProperty('--gk-gui-stuff-shade-dir', rtl ? '-1' : '1');
  }
  function scan() {
    if (!sel) return;
    document.querySelectorAll(sel).forEach(function (el) {
      // the page itself scrolls in the window, it is no surface: the html element carries gk- classes of its own
      if (el === document.documentElement || el === document.body) return;
      if (el.dataset.gkGuiStuffShade) { paint(el); return; }
      var w = ways(el);
      if (!w.x && !w.y) return;
      el.dataset.gkGuiStuffShade = '1';
      // on Redmine's own pages the shade on core's scrolling box (its class autoscroll) is the module's effect
      if (sel === CORE && el.classList.contains('autoscroll')) window.GkGui.effect(el, 'scroll_shade');
      // the shadow is laid in the surface's own frame
      if (window.getComputedStyle(el).position === 'static') el.classList.add('gk-gui-stuff-shade-anchor');
      paint(el);
    });
  }
  var timer = null;
  function later() { clearTimeout(timer); timer = setTimeout(scan, 60); }

  function start() {
    var gk = !!document.querySelector('meta[name="gk-gui-stuff-page"][content="gk"]');
    var api = window.GkGui || {};
    if (gk) sel = GK; else if (api.on && api.on('scroll_shade')) sel = CORE;
    if (!sel) return;
    // a surface that scrolls updates at once; one that opens (a panel, a chooser) is found after the click that
    // opened it, and typing in a filter hides rows, so the surfaces are measured again
    document.addEventListener('scroll', function (e) { var t = e.target; if (t && t.dataset && t.dataset.gkGuiStuffShade) paint(t); }, true);
    document.addEventListener('click', later, true);
    document.addEventListener('input', later, true);
    window.addEventListener('resize', later);
    // fonts and pictures that arrive late change what is wide
    window.addEventListener('load', later);
    if (api.onContent) api.onContent(later); else scan();
  }
  G.shade = { paint: paint };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start, 0);
})();
