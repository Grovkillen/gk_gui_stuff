// gk_gui_stuff GK lists: on GK's own pages a list's heading is set as its column's cells when they all stand at the
// start (or all at the end); core centres every heading. A column of centred or mixed cells keeps its centred heading,
// and a heading row with spans is left as it is. Only the headings change, never a cell. Loaded only on GK's own pages,
// whatever modules are on; lists drawn later (a tab, a reloaded part) are set when they appear.
(function () {
  function side(el) {
    var cs = window.getComputedStyle(el), a = cs.textAlign, rtl = cs.direction === 'rtl';
    if (a === 'start' || a === (rtl ? 'right' : 'left')) return 'start';
    if (a === 'end' || a === (rtl ? 'left' : 'right')) return 'end';
    return 'center';
  }
  function align(root) {
    root.querySelectorAll('table.list').forEach(function (table) {
      if (table.dataset.gkGuiStuffGkAlign) return;
      var head = table.tHead && table.tHead.rows[table.tHead.rows.length - 1];
      if (!head) return;
      for (var i = 0; i < head.cells.length; i++) if (head.cells[i].colSpan > 1) return;
      var rows = [];
      Array.prototype.forEach.call(table.tBodies, function (b) {
        Array.prototype.forEach.call(b.rows, function (r) { if (rows.length < 8 && r.cells.length === head.cells.length) rows.push(r); });
      });
      if (!rows.length) return;
      table.dataset.gkGuiStuffGkAlign = '1';
      Array.prototype.forEach.call(head.cells, function (th, i) {
        if (side(th) !== 'center') return;
        var sides = rows.map(function (r) { return r.cells[i].textContent.trim() === '' ? null : side(r.cells[i]); }).filter(Boolean);
        if (!sides.length || sides.some(function (s) { return s !== sides[0]; }) || sides[0] === 'center') return;
        th.style.textAlign = sides[0];
      });
    });
  }
  function start() {
    align(document);
    var timer = null;
    new MutationObserver(function () { if (!timer) timer = setTimeout(function () { timer = null; align(document); }, 60); })
      .observe(document.getElementById('content') || document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
