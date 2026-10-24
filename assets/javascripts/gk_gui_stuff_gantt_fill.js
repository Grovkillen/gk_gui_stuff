// gk_gui_stuff gantt_fill.
// When the Gantt chart's area is wider than the months chosen in core's form, the page is loaded once more with as
// many more months to the right as the area has room for, within core's own limit (the form's max, the setting
// Gantt months limit). The months chosen are the least that is shown: on a narrow screen they stand as chosen. The
// width of a month is read from the chart itself (core draws it as days times the zoom), so every zoom level fills.
(function () {
  var G = window.GkGui;
  if (!G || !G.on('gantt_fill')) return;

  var KEY = 'gk-gui-stuff-gantt-fill'; // the address this page went to, so that it is never loaded twice in a row

  function stored() { try { return window.sessionStorage.getItem(KEY); } catch (e) { return null; } }
  function store(v) { try { window.sessionStorage.setItem(KEY, v); } catch (e) { /* the fill still works once */ } }

  function fill() {
    var area = document.getElementById('gantt_area'), field = document.getElementById('months');
    if (!area || !field) return;
    var hdr = area.querySelector('.gantt_hdr'), months = parseInt(field.value, 10), max = parseInt(field.max, 10) || months;
    if (!hdr || !months || months >= max) return;
    var drawn = hdr.getBoundingClientRect().width + 1, room = area.clientWidth;
    var monthWidth = drawn / months, more = Math.floor((room - drawn) / monthWidth);
    if (more < 1) return;
    var url = new URL(window.location.href);
    url.searchParams.set('months', String(Math.min(max, months + more)));
    if (stored() === window.location.href) return; // this page is the one the fill went to; it never goes on
    store(url.href);
    window.location.replace(url.href);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
  else fill();
})();
