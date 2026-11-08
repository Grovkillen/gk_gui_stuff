// gk_gui_stuff: the view segment (gk_gui_stuff_view_segment, view_segment.rb). A click presses its part (aria-pressed) and
// tells the page by the event gk-gui-view-segment on the segment (detail: name, value), which bubbles; nothing is posted.
// A segment with data-gk-gui-view-remember keeps the choice in this browser (localStorage, gkguistuff.view.<name>) and
// presses the kept choice when the page has loaded, telling the page the same way. Without storage (a private window,
// blocked site data) the choice drawn by the server holds. window.GkGuiViewSegment: value(segment), press(segment, value,
// keep) and restore(segment) for a page's own script.
(function () {
  if (window.GkGuiViewSegment) return;
  var SEL = '[data-gk-gui-view-segment]';
  function store(name, v) {
    try {
      if (v === undefined) return window.localStorage.getItem('gkguistuff.view.' + name);
      window.localStorage.setItem('gkguistuff.view.' + name, v);
    } catch (e) { /* no memory in this browser: the server's choice holds */ }
    return null;
  }
  function buttons(sw) { return Array.prototype.filter.call(sw.children, function (b) { return b.tagName === 'BUTTON' && b.hasAttribute('value'); }); }
  function value(sw) {
    var on = buttons(sw).filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0];
    return on ? on.value : null;
  }
  function tell(sw, v) {
    var ev;
    try { ev = new CustomEvent('gk-gui-view-segment', { bubbles: true, detail: { name: sw.getAttribute('data-gk-gui-view-segment'), value: v } }); } catch (e) { return; }
    sw.dispatchEvent(ev);
  }
  // presses value; keep: the browser remembers it (a segment that remembers); quiet: the page is not told
  function press(sw, v, keep, quiet) {
    var found = false;
    buttons(sw).forEach(function (b) { var on = b.value === v; if (on) found = true; b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    if (!found) return false;
    if (keep && sw.hasAttribute('data-gk-gui-view-remember')) store(sw.getAttribute('data-gk-gui-view-segment'), v);
    if (!quiet) tell(sw, v);
    return true;
  }
  // the kept choice pressed (once per segment); returns the value shown
  function restore(sw) {
    if (!sw._gkGuiRestored) {
      sw._gkGuiRestored = true;
      if (sw.hasAttribute('data-gk-gui-view-remember')) {
        var kept = store(sw.getAttribute('data-gk-gui-view-segment'));
        if (kept && kept !== value(sw)) press(sw, kept, false, false);
      }
    }
    return value(sw);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest(SEL + ' > button[value]');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    press(b.parentElement, b.value, true, false);
  });
  function start() { document.querySelectorAll(SEL).forEach(restore); }
  window.GkGuiViewSegment = { value: value, press: press, restore: restore };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
