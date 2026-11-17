// gk_gui_stuff: GK's own marks on the root (documentElement), so that the root's rules find what GK draws by GK's own
// mark and never by core's body or its children. The server loads this file (never deferred) right where the part is
// drawn, with the marks as the script tag's own data-gk-gui-stuff-* attributes, and they are copied onto the root
// before the first paint: data-gk-gui-stuff-band (instance or band, core.rb band_mark, after the bar at the top of the
// body) and data-gk-gui-stuff-sg-frame (the style guide's frame page, in its head). Plain DOM.
(function () {
  var s = document.currentScript, root = document.documentElement;
  if (!s) return;
  Array.prototype.forEach.call(s.attributes, function (a) {
    if (a.name.indexOf('data-gk-gui-stuff-') === 0) root.setAttribute(a.name, a.value);
  });
})();
