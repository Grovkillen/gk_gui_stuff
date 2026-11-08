// gk_gui_stuff short_descriptions.
// A project's description in a list is cut after a few lines (the rule in the head); the whole text is the cell's
// tooltip, so nothing is lost. A cell whose text is not cut gets no tooltip.
(function () {
  var G = window.GkGui;
  if (!G || !G.on('short_descriptions')) return;

  G.onContent(function (root) {
    root.querySelectorAll('table.list td.short_description').forEach(function (td) {
      var wiki = td.querySelector('.wiki'); // core's formatted description in core's cell td.short_description
      if (!wiki || td.dataset.gkGuiStuffShort) return;
      td.dataset.gkGuiStuffShort = '1';
      G.effect(td, 'short_descriptions');
      if (wiki.scrollHeight > wiki.clientHeight + 1 && !td.title) td.title = wiki.innerText.trim(); // the text as laid out
    });
  });
})();
