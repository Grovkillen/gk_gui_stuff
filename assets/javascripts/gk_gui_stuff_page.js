// gk_gui_stuff: the page's own primitives, always loaded with the primitives; before the kernel, which keeps what this
// puts on GkGui.
//   GkGui.toc.mount(nav)     the table of contents (gk_gui_stuff_toc): the section one reads is marked
//                            (aria-current), and a jump lands under the row (scroll padding the row's height)
//   GkGui.meaning.view(key)  'meaning' or 'classic' for the page type: what the server wrote at the bottom of a
//                            page of a registered type (#gk-gui-stuff-meaning), else 'meaning'
// The Meaning switch: drawn by the server in the page's action hook, or from its template in a row of actions of its
// own at the start of #content (place below); a saved choice loads the page again with the same address and parameters,
// a failed one puts the old choice back (the rail) with the notice. On the administrator's page a row's default shows
// only with Valbart and its latest change is said again after a save; the row for all pages is forms of the server's.
(function () {
  var G = window.GkGui = window.GkGui || {};

  // ---------------------------------------------------------------- toc
  function tocMount(nav) {
    if (nav._gkGuiToc || nav.closest('.gk-gui-stuff-sg-still')) return;
    nav._gkGuiToc = true;
    var links = [].slice.call(nav.querySelectorAll('a[href^="#"]'));
    var targets = links.map(function (a) { return document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); });
    function pad() { document.documentElement.style.scrollPaddingBlockStart = (nav.offsetHeight + 8) + 'px'; }
    pad();
    window.addEventListener('resize', pad);
    if (!window.IntersectionObserver) return;
    function mark() {
      // the last heading above the row's lower edge is the section one reads
      var at = -1, edge = nav.getBoundingClientRect().bottom + 4;
      targets.forEach(function (tg, i) { if (tg && tg.getBoundingClientRect().top <= edge) at = i; });
      links.forEach(function (a, i) { if (i === at) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }
    var io = new IntersectionObserver(function () { mark(); });
    targets.forEach(function (tg) { if (tg) io.observe(tg); });
    window.addEventListener('scroll', mark, { passive: true });
    mark();
  }
  G.toc = { mount: tocMount };

  // ---------------------------------------------------------------- meaning
  function data() {
    var el = document.getElementById('gk-gui-stuff-meaning');
    try { return el ? JSON.parse(el.textContent) : null; } catch (e) { return null; }
  }
  function view(key) { var d = data(); return d && d.key === key && (d.view === 'meaning' || d.view === 'classic') ? d.view : 'meaning'; }
  G.meaning = { view: view };
  // The segment among the page's actions. Where the page has a hook in its actions (GK Core Stuff's action_menus,
  // the _contextual hooks) the server draws the segment there and sends no template. A page without one gets the
  // template, and the segment stands in a row of actions of its own (core's class contextual, so that it looks and
  // floats as core's rows) at the start of #content; core's own row is never looked for by where it stands.
  function place() {
    var tpl = document.getElementById('gk-gui-stuff-meaning-tpl'), content = document.getElementById('content');
    if (!tpl || !content) return;
    var bar = document.createElement('div');
    bar.className = 'contextual gk-gui-stuff-meaning-bar';
    bar.appendChild(tpl.content.cloneNode(true));
    // after core's messages (render_flash_messages draws them first in #content, each with its id flash_<kind>), so
    // that the floating row never lies over a message's box; first in #content when there is none
    var flashes = Array.prototype.filter.call(document.querySelectorAll('#flash_notice, #flash_error, #flash_warning'), function (f) { return content.contains(f); });
    if (flashes.length) flashes[flashes.length - 1].after(bar); else content.prepend(bar);
    tpl.remove();
  }
  document.addEventListener('gk-gui-saved', function (e) {
    var t = e.target;
    if (t.matches && t.matches('.gk-gui-stuff-meaning[data-gk-gui-meaning-reload="1"]')) { window.location.reload(); return; }
    // the administrator's page: a row's mode shows or hides its default, and its latest change is said again
    var row = t.closest && t.closest('tr[data-gk-gui-meaning-row]');
    if (!row) return;
    var seg = t.querySelector('.gk-gui-stuff-segment[data-gk-gui-save-name="mode"] [aria-pressed="true"]');
    if (seg) turn(row, seg.value);
    var last = row.querySelector('.gk-gui-stuff-meaning-last'), text = last && last.querySelector('.gk-gui-stuff-meaning-last-text');
    if (text && e.detail && e.detail.last) { text.textContent = e.detail.last; last.hidden = false; }
  });
  function turn(row, mode) {
    var cell = row.querySelector('[data-gk-gui-meaning-default]');
    if (!cell) return;
    var rail = cell.querySelector('.gk-gui-stuff-rail'), nobody = cell.querySelector('.gk-gui-stuff-meaning-nobody');
    if (rail) rail.hidden = mode !== 'choice';
    if (nobody) nobody.hidden = mode === 'choice';
  }
  function start() {
    place();
    document.querySelectorAll('nav.gk-gui-stuff-toc').forEach(tocMount);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start, 0);
})();
