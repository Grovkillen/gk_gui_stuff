// gk_gui_stuff gantt_width.
// A double click on the Gantt chart's subjects column (its heading or anywhere in its background) widens the column
// so that every subject is read in full, and a new double click gives it back the width it had. The widths are set
// the way core's own drag handle sets them: the column, its container, the container's headings and each subject
// row's width from its start. The chart keeps at least a strip beside the column.
(function () {
  var G = window.GkGui;
  if (!G || !G.on('gantt_width')) return;

  var KEEP_CHART = 120; // px of the chart left beside a widened column
  var SLACK = 8;        // px after the longest subject

  function px(el) { return parseFloat(el.style.width) || el.getBoundingClientRect().width; }

  function setWidth(td, w) {
    var delta = w - px(td);
    if (!delta) return;
    var container = td.querySelector('.gantt_subjects_container');
    var parts = container ? [container].concat(Array.prototype.slice.call(container.querySelectorAll(':scope > .gantt_hdr'))) : [];
    td.style.width = w + 'px';
    parts.forEach(function (el) { el.style.width = (px(el) + delta) + 'px'; });
    // as core does when the column is dragged: each row as wide as the column from where it starts
    td.querySelectorAll('.issue-subject, .project-name, .version-name').forEach(function (el) {
      el.style.width = Math.max(0, w - el.offsetLeft) + 'px';
    });
  }

  // the width at which the longest subject is read in full, within what the table leaves beside the chart
  function fullWidth(td) {
    var box = td.getBoundingClientRect(), rtl = window.getComputedStyle(td).direction === 'rtl', need = 0;
    td.querySelectorAll('.issue-subject, .project-name, .version-name').forEach(function (el) {
      var r = el.getBoundingClientRect(), from = rtl ? box.right - r.right : r.left - box.left;
      need = Math.max(need, from + el.scrollWidth);
    });
    var table = td.closest('table'), others = 0;
    if (table) {
      Array.prototype.forEach.call(td.parentNode.cells, function (c) {
        if (c !== td && c.classList.contains('gantt_selected_column') && c.offsetWidth) others += c.offsetWidth;
      });
    }
    var room = table ? table.getBoundingClientRect().width - others - KEEP_CHART : need + SLACK;
    return Math.round(Math.min(need + SLACK, room));
  }

  function toggle(td) {
    var now = Math.round(px(td)), wide = parseFloat(td.dataset.gkGuiStuffWide || '0');
    if (wide && now === wide && td.dataset.gkGuiStuffBefore) {
      setWidth(td, parseFloat(td.dataset.gkGuiStuffBefore));
      delete td.dataset.gkGuiStuffWide;
      delete td.dataset.gkGuiStuffBefore;
      return;
    }
    var full = fullWidth(td);
    if (full <= now) return; // every subject is already read in full
    td.dataset.gkGuiStuffBefore = String(now);
    td.dataset.gkGuiStuffWide = String(full);
    setWidth(td, full);
  }

  G.onContent(function (root) {
    root.querySelectorAll('td.gantt_subjects_column').forEach(function (td) {
      if (td.dataset.gkGuiStuffGanttWidth) return;
      td.dataset.gkGuiStuffGanttWidth = '1';
      td.addEventListener('dblclick', function (e) {
        // links, the tree's expanders, check boxes and the drag handle keep their own meaning
        if (e.target.closest('a, input, select, button, .expander, .ui-resizable-handle')) return;
        var sel = window.getSelection && window.getSelection();
        if (sel && sel.removeAllRanges) sel.removeAllRanges(); // the word the double click selected
        toggle(td);
      });
    });
  });
})();
