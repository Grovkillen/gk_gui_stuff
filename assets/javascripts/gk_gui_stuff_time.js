// gk_gui_stuff time: week_number. Every date field says which ISO week its date is in ("v. 40"), and follows
// the field as it changes. The week is ISO 8601 (Monday first, week 1 holds the first Thursday).
(function () {
  var G = window.GkGui;
  if (!G || !G.on('week_number')) return;
  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - y0) / 86400000 + 1) / 7);
  }
  function paint(input, tag) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.value || '');
    tag.textContent = m ? G.t('week_short', { week: isoWeek(new Date(+m[1], +m[2] - 1, +m[3])) }) : '';
  }
  G.onContent(function () {
    document.querySelectorAll('input[type="date"]:not([data-gk-gui-stuff-week])').forEach(function (input) {
      input.dataset.gkGuiStuffWeek = '1';
      var tag = G.node('span', 'gk-gui-stuff-week');
      input.insertAdjacentElement('afterend', tag);
      ['change', 'input'].forEach(function (ev) { input.addEventListener(ev, function () { paint(input, tag); }); });
      paint(input, tag);
    });
  });
})();
