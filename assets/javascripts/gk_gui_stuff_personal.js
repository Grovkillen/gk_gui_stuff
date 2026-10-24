// The counts come with the page (window.gkGuiStuffPage.data.personal) and are renewed by the shared pulse; where the
// account is no dropdown (d.menu false, compat's account_dropdown) Mina sidor is moved from the page's foot to the top of
// Mitt konto's sidebar. Plain DOM, no jQuery.
(function () {
  var T = window.gkGuiStuffPersonalText || {};
  function text(c, split) { return split && c.shared ? c.own + '+' + c.shared : String(c.n); }
  function said(c, split) {
    return split && c.shared ? (T.waits_split || '%{own} + %{shared}').replace('%{own}', c.own).replace('%{shared}', c.shared)
                             : (T.waits || '%{n}').replace('%{n}', c.n);
  }
  function badge(c, split, info) {
    var s = document.createElement('span');
    s.className = 'badge gk-gui-stuff-count' + (info ? ' gk-gui-stuff-count-info' : '');
    s.textContent = text(c, split);
    if (!info) { s.setAttribute('aria-label', said(c, split)); s.title = said(c, split); }
    return s;
  }
  function paint(d) {
    if (!d) return;
    document.querySelectorAll('.gk-gui-stuff-count[data-gk-gui-stuff-painted]').forEach(function (e) { e.remove(); });
    // the person's choice: waiting (more than 0), zero (also 0) or none
    var mode = d.mode || 'waiting';
    if (mode === 'none') return;
    function shows(c) { return c && c.n != null && (c.n > 0 || mode === 'zero'); }
    var at = d.menu ? document.querySelector('#account .dropdown-trigger') : document.querySelector('#loggedas a');
    if (at && shows(d.total) && (d.rows || []).some(function (r) { return r.waits && r.n != null; })) {
      var b = badge(d.total, d.split, false); b.setAttribute('data-gk-gui-stuff-painted', '1');
      if (d.menu) at.appendChild(b); else at.insertAdjacentElement('afterend', b);
    }
    (d.rows || []).forEach(function (r) {
      if (!shows(r)) return;
      document.querySelectorAll('a[data-gk-gui-stuff-personal-key="' + r.key + '"]').forEach(function (a) {
        var b = badge(r, d.split, !r.waits); b.setAttribute('data-gk-gui-stuff-painted', '1');
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
