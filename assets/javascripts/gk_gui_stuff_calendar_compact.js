// gk_gui_stuff calendar_compact.
// The calendar page gets a choice beside core's view: Compact shows the month tighter (gk_gui_stuff_calendar_compact.css,
// class gk-gui-stuff-cal-compact on core's ul.cal). The days keep core's widths; each issue is one short line, its
// number and the start of its subject cut with "...", and the tracker and the whole subject are in core's tip when the
// pointer rests on it (and in the line's name for a screen reader). The short line is a link of its own beside core's
// own content, which stays in the page and is what core's view shows. The choice is a link among the calendar's
// buttons and is kept with the account on the server (core's preferences), so it follows the person between computers;
// core's view is what one gets without it.
(function () {
  var G = window.GkGui;
  if (!G || !G.on('calendar_compact')) return;

  var CLS = 'gk-gui-stuff-cal-compact';
  function token() { var m = document.querySelector('meta[name="csrf-token"]'); return m ? m.content : ''; }
  function save(on) {
    var body = new URLSearchParams({ key: 'calendar_compact', value: on ? 'on' : 'off' });
    fetch((G.cfg.urlRoot || '') + '/gk_gui_stuff/view_state', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': token(), 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
      .catch(function () { /* the page keeps the view; the next page asks the server again */ });
  }

  function draw(link, cal, on) {
    cal.classList.toggle(CLS, on);
    G.put(link, on ? 'zoom-in' : 'zoom-out', '');
    link.appendChild(document.createTextNode(' '));
    link.appendChild(G.node('span', 'gk-gui-stuff-cal-mode-text', G.t(on ? 'cal_normal' : 'cal_compact')));
    link.title = G.t(on ? 'cal_normal_title' : 'cal_compact_title');
    link.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  // the issue's short line: "#12 Subject", from core's tip (its first link is "Tracker #12", followed by the whole subject)
  function lines(cal) {
    cal.querySelectorAll('.calbody > div.issue').forEach(function (d) {
      if (d.querySelector(':scope > .gk-gui-stuff-cal-line')) return;
      var tip = d.querySelector(':scope > span.tip'), a = tip && tip.querySelector('a[href]');
      var own = Array.prototype.find.call(d.children, function (n) { return n.tagName === 'A' && n.getAttribute('href'); });
      if (!a && !own) return;
      var head = (a || own).textContent.trim(), m = /#(\d+)\s*$/.exec(head);
      var rest = a && a.nextSibling && a.nextSibling.nodeType === 3 ? a.nextSibling.textContent.replace(/^\s*:\s*/, '').trim() : '';
      var line = G.node('a', 'gk-gui-stuff-cal-line');
      line.href = (own || a).getAttribute('href');
      line.appendChild(G.node('span', 'gk-gui-stuff-cal-no', m ? '#' + m[1] : head));
      if (rest) line.appendChild(document.createTextNode(' ' + rest));
      line.setAttribute('aria-label', rest ? head + ': ' + rest : head);
      // core's own text in the box (project, tracker and number, the subject cut at 30) in an element of its own, so
      // that the compact view can leave it out; nothing changes in core's view
      Array.prototype.slice.call(d.childNodes).forEach(function (n) {
        if (n.nodeType === 3 && n.textContent.trim()) {
          var s = G.node('span', 'gk-gui-stuff-cal-text');
          d.insertBefore(s, n);
          s.appendChild(n);
        }
      });
      // after core's start and end marks, which say as much in the compact view
      d.insertBefore(line, own || d.firstChild);
    });
    // a version's line: its whole text as tooltip
    cal.querySelectorAll('.calbody > span.icon').forEach(function (v) { if (!v.title) v.title = v.textContent.replace(/\s+/g, ' ').trim(); });
  }

  G.onContent(function () {
    if (!document.body.classList.contains('controller-calendars')) return; // the calendar page, not My page's box
    var cal = document.querySelector('#content ul.cal'), buttons = document.querySelector('#query_form p.buttons');
    if (!cal || !buttons) return;
    lines(cal);
    if (buttons.querySelector('.gk-gui-stuff-cal-mode')) return;
    var link = G.node('a', 'icon gk-gui-stuff-cal-mode');
    link.href = '#';
    link.setAttribute('role', 'button');
    draw(link, cal, !!G.opt('calendar_compact').on);
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var on = !cal.classList.contains(CLS);
      save(on);
      draw(link, cal, on);
    });
    buttons.appendChild(link);
  });
})();
