// gk_gui_stuff row marks: the stripe at the start of a list's row (overdue_mark: overdue, due soon) says in its tip what
// it means. The marks are the module's own (its options) and any another script adds to window.gkGuiStuffRowMarks
// ({ cls, text }); a row with more than one mark lists them all, one per line.
(function () {
  var G = window.GkGui;
  if (!G || !G.on('overdue_mark')) return;

  function marks() { return (G.opt('overdue_mark').marks || []).concat(window.gkGuiStuffRowMarks || []); }

  G.onContent(function (root) {
    var all = marks();
    root.querySelectorAll('tr.issue').forEach(function (tr) {
      var td = tr.cells[0];
      if (!td || td.dataset.gkGuiStuffMarks) return;
      var said = all.filter(function (m) { return tr.classList.contains(m.cls); }).map(function (m) { return m.text; });
      if (!said.length) return;
      td.dataset.gkGuiStuffMarks = '1';
      td.title = said.join('\n');
    });
  });
})();
