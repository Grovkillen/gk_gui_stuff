// gk_gui_stuff: the top band as a row of parts (gk_gui_stuff_top_band, top_band.rb). The band is always one row. Each
// part has three lengths, full, short and the icon with its count (classes gk-gui-stuff-band-len-*); the band starts
// from the longest the server allows (data-gk-gui-band-max: full for one or two parts, short from three) and shortens
// the lightest part first (data-gk-gui-band-weight), one length at a time over every part, until the row fits. Below
// 899 px every part shows its icon and count. What still does not fit goes, lightest first, into +N
// ([data-gk-gui-band-more]), whose panel lists those parts with their full words; a part that opens still opens there.
// The parts come back in their order when the room grows. Nothing moves while a panel is open: the band is fitted
// again when it closes. The panels themselves are flies (gk_gui_stuff_primitives.js): one open at a time, Esc and a
// click outside close them, a sheet below 899 px. window.GkGuiTopBand: fit(band) and fitAll() for a page's own script.
(function () {
  if (window.GkGuiTopBand) return;
  var LEN = ['full', 'short', 'icon'];
  var NARROW = window.matchMedia('(max-width: 899px)');
  function num(el, k) { return parseInt(el.getAttribute(k), 10) || 0; }
  function partsOf(band) {
    return Array.prototype.filter.call(band.querySelectorAll('[data-gk-gui-band-part]'), function (p) {
      return p.parentElement && p.parentElement.closest('[data-gk-gui-band]') === band;
    }).sort(function (a, b) { return num(a, 'data-gk-gui-band-order') - num(b, 'data-gk-gui-band-order'); });
  }
  function setLen(p, l) { LEN.forEach(function (x) { p.classList.toggle('gk-gui-stuff-band-len-' + x, x === l); }); }
  // the room the band's own row needs: every segment shown, each at its own width
  function need(band) {
    var w = 0;
    Array.prototype.forEach.call(band.children, function (c) { if (!c.hidden) w += c.getBoundingClientRect().width; });
    return w;
  }
  function fits(band) { return need(band) <= band.clientWidth + 0.5; }
  function label(more, n) {
    var s = more.querySelector(':scope > summary'), w = more.querySelector('.gk-gui-stuff-band-more-n');
    var t = (more.getAttribute(n === 1 ? 'data-one' : 'data-other') || '+%{count}').replace('%{count}', String(n));
    if (w) w.textContent = '+' + n;
    if (s) { s.setAttribute('aria-label', t); s.title = t; }
  }
  function fit(band) {
    if (!band || band.querySelector('details[open]')) { if (band) band._gkGuiBandLater = true; return; }
    band._gkGuiBandLater = false;
    if (band.clientWidth === 0) return; // not shown yet (a folded example): fitted when it shows
    var more = band.querySelector(':scope > [data-gk-gui-band-more]');
    var list = more && more.querySelector('[data-gk-gui-band-more-list]');
    var parts = partsOf(band);
    if (!parts.length) return;
    // every part back in its place, in its order, before +N
    parts.forEach(function (p) { if (more) band.insertBefore(p, more); else band.appendChild(p); });
    // a part put away (hidden) stays in its place and is neither shortened nor moved into +N
    parts = parts.filter(function (p) { return !p.hidden; });
    band.classList.add('gk-gui-stuff-band-measuring');
    band.classList.remove('gk-gui-stuff-band-tight');
    if (more) more.hidden = true;
    var max = NARROW.matches ? 'icon' : (band.getAttribute('data-gk-gui-band-max') || 'full');
    if (LEN.indexOf(max) < 0) max = 'full';
    parts.forEach(function (p) { setLen(p, max); });
    // the lightest first, and of the same weight the later one
    var light = parts.slice().sort(function (a, b) {
      return (num(a, 'data-gk-gui-band-weight') - num(b, 'data-gk-gui-band-weight')) || (num(b, 'data-gk-gui-band-order') - num(a, 'data-gk-gui-band-order'));
    });
    var i, s;
    for (s = LEN.indexOf(max) + 1; s < LEN.length && !fits(band); s++) {
      for (i = 0; i < light.length && !fits(band); i++) setLen(light[i], LEN[s]);
    }
    // the instance's name and its copy button give way before any part leaves the row
    if (!fits(band)) band.classList.add('gk-gui-stuff-band-tight');
    var moved = [];
    if (more && list && !fits(band)) {
      more.hidden = false;
      for (i = 0; i < light.length && !fits(band); i++) {
        list.appendChild(light[i]);
        moved.push(light[i]);
        label(more, moved.length);
      }
      // in +N's panel in the band's order
      moved.sort(function (a, b) { return num(a, 'data-gk-gui-band-order') - num(b, 'data-gk-gui-band-order'); }).forEach(function (p) { list.appendChild(p); });
    }
    if (more) { more.hidden = moved.length === 0; label(more, moved.length); }
    band.classList.remove('gk-gui-stuff-band-measuring');
  }
  function fitAll() { document.querySelectorAll('[data-gk-gui-band]').forEach(fit); }
  var queued = false;
  function soon() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () { queued = false; fitAll(); });
  }
  // a panel closed: the band is fitted as the room now says
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (!d || d.tagName !== 'DETAILS' || d.open) return;
    var band = d.closest('[data-gk-gui-band]');
    if (band && band._gkGuiBandLater) window.requestAnimationFrame(function () { fit(band); });
  }, true);
  window.addEventListener('resize', soon);
  if (NARROW.addEventListener) NARROW.addEventListener('change', soon);
  function start() {
    fitAll();
    // an example that is shown later or changes its width (the style guide's tiles, its phone frame)
    if (window.ResizeObserver) {
      var ro = new window.ResizeObserver(function (entries) { entries.forEach(function (en) { fit(en.target); }); });
      document.querySelectorAll('[data-gk-gui-band]').forEach(function (b) { ro.observe(b); });
    }
    // the words' own font may come after the first fit
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(soon, function () {});
  }
  window.GkGuiTopBand = { fit: fit, fitAll: fitAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
