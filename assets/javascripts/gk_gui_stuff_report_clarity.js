// gk_gui_stuff report_clarity: core's report table (Ärenden per ...) says what its columns are. The status
// columns are statuses; Öppna and Stängda are sums of statuses (which ones is written out); Totalt is everything.
// The three kinds get a heading row of their own and a look of their own, and each chart below gets a heading and
// a line saying what it shows and how to switch a series on and off. Core's table and charts are left as they are
// underneath: this only adds. Plain DOM, no jQuery.
// What a cell is comes only from the marks GK Core Stuff's anchor_marks puts on core's detailed report: every heading,
// count and total cell has data-report-column (status, open, closed or total), and a status's cells also have
// data-status-id and data-status-closed. Each cell is read by its own mark, so a column core adds, removes or moves
// keeps its kind, and a status's name is only shown, never matched. The heading row is the row of the marked heading
// cells. Without the marks (GK Core Stuff absent or off for the view) the table is left as core's. The chart per
// status is the one with core's canvas id issues_by_status; the other is per row.
(function () {
  var KIND = { status: 'status', open: 'sum', closed: 'sum', total: 'total' };
  function colOf(c) { var k = c.getAttribute('data-report-column'); return KIND[k] ? k : null; }
  function kindOf(c) { var k = colOf(c); return k ? KIND[k] : null; }
  function run() {
    var el = document.getElementById('gk-gui-stuff-stuff-config');
    if (!el) return;
    var cfg;
    try { cfg = JSON.parse(el.textContent); } catch (e) { return; }
    var L = cfg.report;
    if (!L) return;
    document.querySelectorAll('table.issue-report-detailed').forEach(function (table) {
      if (table.dataset.gkGuiStuffReport) return;
      var marked = table.tHead && table.tHead.querySelector('th[data-report-column]');
      var head = marked && marked.closest('tr');
      if (!head) return;
      table.dataset.gkGuiStuffReport = '1';
      var ths = Array.prototype.filter.call(head.cells, colOf);
      function name(th) { return th.textContent.trim(); }
      // the status names in each sum, read before the notes are added (shown, not matched)
      var open = [], shut = [];
      ths.forEach(function (th) { if (colOf(th) === 'status') (th.getAttribute('data-status-closed') === '1' ? shut : open).push(name(th)); });
      // each cell's look by its own mark; the first cell of a run of one kind, as core draws the row, gets the line before it
      function mark(row) {
        var prev = null;
        Array.prototype.forEach.call(row.cells, function (c) {
          var k = kindOf(c);
          if (k) {
            c.classList.add('gk-gui-stuff-rep-' + k);
            if (prev !== k) c.classList.add('gk-gui-stuff-rep-first');
          }
          prev = k;
        });
      }
      Array.prototype.forEach.call(table.rows, mark);
      function note(th, text) {
        var s = document.createElement('span'); s.className = 'gk-gui-stuff-rep-note'; s.textContent = text;
        th.appendChild(s);
      }
      function sum(names) { return names.length ? '= ' + names.join(' + ') : '= 0'; }
      ths.forEach(function (th) {
        var col = colOf(th);
        if (col === 'status' && th.getAttribute('data-status-closed') === '1') { th.classList.add('gk-gui-stuff-rep-closed'); note(th, L.closed_status); }
        else if (col === 'open') note(th, sum(open));
        else if (col === 'closed') note(th, sum(shut));
        else if (col === 'total') note(th, L.total_note);
      });
      // the heading row over the kinds, one cell per run of heading cells of one kind, as core draws the heading row
      var group = document.createElement('tr'); group.className = 'gk-gui-stuff-rep-groups'; window.GkGui.effect(group, 'report_clarity');
      var LABEL = { status: L.group_status, sum: L.group_sum, total: L.group_total }, cur = null;
      Array.prototype.forEach.call(head.cells, function (c) {
        var k = kindOf(c);
        if (cur && cur.k === k) { cur.th.colSpan += c.colSpan; return; }
        var th = document.createElement('th'); th.colSpan = c.colSpan;
        if (k) { th.textContent = LABEL[k] || ''; th.className = 'gk-gui-stuff-rep-' + k + ' gk-gui-stuff-rep-first'; }
        group.appendChild(th);
        cur = { k: k, th: th };
      });
      head.parentNode.insertBefore(group, head);
    });
    document.querySelectorAll('.issue-report-graph').forEach(function (g) {
      if (g.dataset.gkGuiStuffReport) return;
      g.dataset.gkGuiStuffReport = '1';
      var box = document.createElement('div'); box.className = 'gk-gui-stuff-rep-chart-head'; window.GkGui.effect(box, 'report_clarity');
      // the heading only where core gives the chart's title as an attribute (its Stimulus value); where core draws the
      // title inside the chart instead, the box has only the line
      var title = (g.getAttribute('data-reports--details-title-value') || '').trim();
      if (title) { var h = document.createElement('h3'); h.textContent = title; box.appendChild(h); }
      var p = document.createElement('p'); p.textContent = g.querySelector('#issues_by_status') ? L.chart_by_status : L.chart_by_row;
      box.appendChild(p);
      g.parentNode.insertBefore(box, g);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
