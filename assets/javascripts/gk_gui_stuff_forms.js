// gk_gui_stuff forms: core's own messages.
// flash_timeout: core's green "Uppdatering lyckades" goes away by itself after a time. A circle counts down;
//   a click on the circle pauses and resumes, the cross closes at once. Errors and warnings always stay.
(function () {
  var G = window.GkGui;
  if (!G) return;
  var NS = 'http://www.w3.org/2000/svg';

  G.onContent(function () {
    if (G.on('flash_timeout')) {
      var secs = G.opt('flash_timeout').seconds || 0;
      document.querySelectorAll('#content .flash.notice:not([data-gk-gui-stuff-timeout]), #flash_notice:not([data-gk-gui-stuff-timeout])').forEach(function (f) {
        f.dataset.gkGuiStuffTimeout = '1';
        f.classList.add('gk-gui-stuff-flash');
        var box = G.node('span', 'gk-gui-stuff-flash-tools');
        var x = G.put(G.node('button', 'gk-gui-stuff-flash-close'), 'close', '×', 14); x.type = 'button';
        x.title = G.t('close'); x.setAttribute('aria-label', G.t('close'));
        x.addEventListener('click', function () { clearInterval(timer); f.remove(); });
        var timer = null;
        if (secs > 0) {
          var total = secs * 1000, left = total, paused = false, last = Date.now();
          var b = G.node('button', 'gk-gui-stuff-flash-count'); b.type = 'button';
          var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
          var ring = document.createElementNS(NS, 'circle'), arc = document.createElementNS(NS, 'circle');
          [ring, arc].forEach(function (c) { c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '9'); c.setAttribute('fill', 'none'); c.setAttribute('stroke-width', '3'); });
          ring.setAttribute('class', 'gk-gui-stuff-flash-ring'); arc.setAttribute('class', 'gk-gui-stuff-flash-arc');
          var C = 2 * Math.PI * 9;
          arc.setAttribute('stroke-dasharray', String(C)); arc.setAttribute('transform', 'rotate(-90 12 12)');
          svg.appendChild(ring); svg.appendChild(arc);
          var mark = G.node('span', 'gk-gui-stuff-flash-mark');
          b.appendChild(svg); b.appendChild(mark);
          function paint() {
            arc.setAttribute('stroke-dashoffset', String(C * (1 - left / total)));
            if (paused) { G.put(mark, 'play', '\u25B6', 12); } else { mark.textContent = String(Math.ceil(left / 1000)); }
            var label = paused ? G.t('flash_resume') : G.t('flash_pause', { count: Math.ceil(left / 1000) });
            b.title = label; b.setAttribute('aria-label', label); b.setAttribute('aria-pressed', paused ? 'true' : 'false');
          }
          b.addEventListener('click', function () { paused = !paused; last = Date.now(); f.classList.toggle('gk-gui-stuff-flash-paused', paused); paint(); });
          timer = setInterval(function () {
            var now = Date.now();
            if (!paused && !document.hidden) left -= now - last; // a page nobody looks at does not count down
            last = now;
            if (left <= 0) { clearInterval(timer); f.classList.add('gk-gui-stuff-flash-out'); setTimeout(function () { f.remove(); }, 300); return; }
            paint();
          }, 100);
          paint();
          box.appendChild(b);
        }
        box.appendChild(x);
        f.appendChild(box);
      });
    }
  });
})();
