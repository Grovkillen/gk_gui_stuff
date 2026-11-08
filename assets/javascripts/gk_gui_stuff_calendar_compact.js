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

  // the issue's short line: "#12 Subject". What it is comes from what core sets on purpose, never from the text of
  // core's link or tip: the issue's id is the value of the box's ids[] check box (core's context menu reads the same),
  // the address is core's issue link (a.issue, the one outside core's tip), and the tracker and whole subject come
  // with the page (window.gkGuiStuffPage.data.calendar_issues, by id); without them the line is the number alone.
  // Core's own text in the box is left out by the compact view's CSS (gk_gui_stuff_calendar_compact.css), so nothing
  // in core's box is wrapped or moved.
  function lines(cal) {
    var data = ((window.gkGuiStuffPage || {}).data || {}).calendar_issues || {};
    cal.querySelectorAll('.calbody div.issue').forEach(function (d) {
      if (d.querySelector('.gk-gui-stuff-cal-line')) return;
      var box = d.querySelector('input[name="ids[]"]'), id = box && box.value;
      var link = Array.prototype.find.call(d.querySelectorAll('a.issue[href]'), function (a) { return !a.closest('.tip'); });
      if (!id || !link) return;
      var it = data[id] || {}, no = '#' + id;
      var line = G.effect(G.node('a', 'gk-gui-stuff-cal-line'), 'calendar_compact');
      line.href = link.getAttribute('href');
      line.appendChild(G.node('span', 'gk-gui-stuff-cal-no', no));
      if (it.subject) line.appendChild(document.createTextNode(' ' + it.subject));
      var head = it.tracker ? it.tracker + ' ' + no : no;
      line.setAttribute('aria-label', it.subject ? head + ': ' + it.subject : head);
      // after core's start and end marks, which say as much in the compact view, before core's own link
      link.insertAdjacentElement('beforebegin', line);
    });
    // a version's line (core's icon-package entry): its whole text, as it is laid out, as tooltip
    cal.querySelectorAll('.calbody .icon-package').forEach(function (v) { if (!v.title) v.title = v.innerText.trim(); });
  }

  G.onContent(function () {
    if (!document.body.classList.contains('controller-calendars')) return; // the calendar page, not My page's box
    var cal = document.querySelector('#content ul.cal'), buttons = document.querySelector('#query_form p.buttons');
    if (!cal || !buttons) return;
    lines(cal);
    if (buttons.querySelector('.gk-gui-stuff-cal-mode')) return;
    var link = G.effect(G.node('a', 'icon gk-gui-stuff-cal-mode'), 'calendar_compact');
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
