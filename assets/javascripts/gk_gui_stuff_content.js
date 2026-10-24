// gk_gui_stuff content: one pass over rendered text with small, idempotent transforms. arrows: <-->, --> and
// <-- written in text become real arrows. Never inside code, pre, links' addresses or form fields.
(function () {
  var G = window.GkGui;
  if (!G || !G.on('arrows')) return;
  var re = /<-->|-->|<--/;
  var map = { '<-->': '↔', '-->': '→', '<--': '←' };
  G.onContent(function () {
    document.querySelectorAll('.wiki').forEach(function (w) {
      if (w.closest('.jstEditor') || w.isContentEditable) return;
      var walker = document.createTreeWalker(w, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!re.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
          return n.parentElement.closest('pre, code, textarea, script, style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        }
      });
      var nodes = [], n;
      while ((n = walker.nextNode())) nodes.push(n);
      nodes.forEach(function (t) { t.nodeValue = t.nodeValue.replace(/<-->|-->|<--/g, function (m) { return map[m]; }); });
    });
  });
})();
