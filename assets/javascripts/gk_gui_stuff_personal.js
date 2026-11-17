// The counts come with the page (window.gkGuiStuffPage.data.personal) and are renewed by the shared pulse; where the
// account is no dropdown (d.menu false, compat's account_dropdown) Mina sidor is moved from the page's foot to the top of
// Mitt konto's sidebar. Plain DOM, no jQuery.
(function () {
  // the words come with the page in a JSON element of their own (PersonalHooks)
  var T = {};
  var tEl = document.getElementById('gk-gui-stuff-personal-texts');
  try { if (tEl) T = JSON.parse(tEl.textContent); } catch (e) { /* the defaults */ }
  function said(c, split) {
    return split && c.shared ? (T.waits_split || '%{own} + %{shared}').replace('%{own}', c.own).replace('%{shared}', c.shared)
                             : (T.waits || '%{n}').replace('%{n}', c.n);
  }
  // the design language's count (GkGui.count, as gk_gui_stuff_count): filled in the role alarm when it waits,
  // quiet when not; own and shared apart when the person chose so
  function badge(c, split, info) {
    var apart = split && c.shared;
    return window.GkGui.count({ n: apart ? c.own : c.n, shared: apart ? c.shared : 0, role: info ? null : 'alarm', title: info ? null : said(c, split) });
  }
  function paint(d) {
    if (!d) return;
    document.querySelectorAll('.gk-gui-stuff-count[data-gk-gui-stuff-painted]').forEach(function (e) { e.remove(); });
    // the person's choice: waiting (more than 0), zero (also 0) or none
    var mode = d.mode || 'waiting';
    if (mode === 'none') return;
    function shows(c) { return c && c.n != null && (c.n > 0 || mode === 'zero'); }
    var at = d.menu ? document.querySelector('#account .dropdown-trigger') : document.querySelector('#loggedas a.user'); // core's class on its link to a person
    if (at && shows(d.total) && (d.rows || []).some(function (r) { return r.waits && r.n != null; })) {
      var b = badge(d.total, d.split, false); b.setAttribute('data-gk-gui-stuff-painted', '1'); window.GkGui.effect(b, 'personal_count');
      if (d.menu) at.appendChild(b); else at.insertAdjacentElement('afterend', b);
    }
    (d.rows || []).forEach(function (r) {
      if (!shows(r)) return;
      document.querySelectorAll('a[data-gk-gui-stuff-personal-key="' + r.key + '"]').forEach(function (a) {
        var b = badge(r, d.split, !r.waits); b.setAttribute('data-gk-gui-stuff-painted', '1'); window.GkGui.effect(b, 'personal_count');
        a.appendChild(b); // inside the link: the menu's rows are blocks
      });
    });
  }
  // other scripts (and a test) may paint again with fresh counts
  window.gkGuiStuffPersonal = { paint: paint };
  function start() {
    var box = document.getElementById('gk-gui-stuff-personal-box'), side = document.getElementById('sidebar');
    // first in the sidebar's content, after core's button that minimizes the sidebar and inside what it folds away
    if (box && side) {
      var into = side.querySelector('#sidebar-wrapper') || side;
      into.insertBefore(box, into.firstChild);
    }
    var pulse = window.gkGuiStuffPulse;
    paint(pulse ? pulse.data('personal') : ((window.gkGuiStuffPage || {}).data || {}).personal);
    if (pulse) pulse.add('personal', { collect: function () { return 1; }, handle: paint });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
