// gk_gui_stuff report_clarity: core's report table (Ärenden per ...) says what its columns are. The status
// columns are statuses; Öppna and Stängda are sums of statuses (which ones is written out); Totalt is everything.
// The three kinds get a heading row of their own and a look of their own, and each chart below gets a heading and
// a line saying what it shows and how to switch a series on and off. Core's table and charts are left as they are
// underneath: this only adds. Plain DOM, no jQuery.
(function () {
  function run() {
    var el = document.getElementById('gk-gui-stuff-stuff-config');
    if (!el) return;
    var cfg;
    try { cfg = JSON.parse(el.textContent); } catch (e) { return; }
    var L = cfg.report;
    if (!L) return;
    document.querySelectorAll('table.issue-report-detailed').forEach(function (table) {
      if (table.dataset.gkGuiStuffReport) return;
      table.dataset.gkGuiStuffReport = '1';
      var head = table.querySelector('thead tr');
      if (!head) return;
      var ths = head.children, n = ths.length - 4; // name, the statuses, open, closed, total
      if (n < 1) return;
      // which statuses are closed: core's own chart data beside the table says it
      var closed = {};
      var tpl = document.querySelector('.issue-report-graph template[data-reports--details-target="datasets"]');
      try { JSON.parse(tpl.innerHTML).forEach(function (d) { if (d.hidden) closed[d.label] = true; }); } catch (e) {}
      var open = [], shut = [];
      for (var i = 1; i <= n; i++) (closed[ths[i].textContent.trim()] ? shut : open).push(ths[i].textContent.trim());
      function mark(row) {
        var c = row.children;
        for (var i = 1; i < c.length; i++) {
          if (i <= n) { c[i].classList.add('gk-gui-stuff-rep-status'); if (i === 1) c[i].classList.add('gk-gui-stuff-rep-first'); }
          else if (i <= n + 2) { c[i].classList.add('gk-gui-stuff-rep-sum'); if (i === n + 1) c[i].classList.add('gk-gui-stuff-rep-first'); }
          else c[i].classList.add('gk-gui-stuff-rep-total', 'gk-gui-stuff-rep-first');
        }
      }
      table.querySelectorAll('tr').forEach(mark);
      for (var j = 1; j <= n; j++) {
        if (closed[ths[j].textContent.trim()]) {
          ths[j].classList.add('gk-gui-stuff-rep-closed');
          var tag = document.createElement('span'); tag.className = 'gk-gui-stuff-rep-note'; tag.textContent = L.closed_status;
          ths[j].appendChild(tag);
        }
      }
      function sub(th, names) {
        var s = document.createElement('span'); s.className = 'gk-gui-stuff-rep-note';
        s.textContent = names.length ? '= ' + names.join(' + ') : '= 0';
        th.appendChild(s);
      }
      sub(ths[n + 1], open); sub(ths[n + 2], shut);
      var s3 = document.createElement('span'); s3.className = 'gk-gui-stuff-rep-note'; s3.textContent = L.total_note; ths[n + 3].appendChild(s3);
      var group = document.createElement('tr'); group.className = 'gk-gui-stuff-rep-groups';
      function cell(text, span, cls) {
        var th = document.createElement('th'); th.colSpan = span; th.textContent = text; if (cls) th.className = cls;
        group.appendChild(th);
      }
      cell('', 1, '');
      cell(L.group_status, n, 'gk-gui-stuff-rep-status gk-gui-stuff-rep-first');
      cell(L.group_sum, 2, 'gk-gui-stuff-rep-sum gk-gui-stuff-rep-first');
      cell(L.group_total, 1, 'gk-gui-stuff-rep-total gk-gui-stuff-rep-first');
      head.parentNode.insertBefore(group, head);
    });
    document.querySelectorAll('.issue-report-graph').forEach(function (g, i) {
      if (g.dataset.gkGuiStuffReport) return;
      g.dataset.gkGuiStuffReport = '1';
      var box = document.createElement('div'); box.className = 'gk-gui-stuff-rep-chart-head';
      var h = document.createElement('h3'); h.textContent = g.getAttribute('data-reports--details-title-value') || '';
      var p = document.createElement('p'); p.textContent = i === 0 ? L.chart_by_row : L.chart_by_status;
      box.appendChild(h); box.appendChild(p);
      g.parentNode.insertBefore(box, g);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
