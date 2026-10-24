// gk_gui_stuff login_warning: someone who is not logged in is told so, in both of core's layouts.
// Desktop (#top-menu): a banner under the top menu, a ring around the real "Logga in" link and an arrow in the
// banner's upper edge pointing at it; three rounds, then the arrow fades and the ring stays still; hovering the
// banner brings the arrow back. Phone (core's .mobile-toggle-button): the same banner, above everything at the top of
// the page (core's header stands under it), and in the open menu "Logga in" is lifted to the top with one arrow.
// Instance settings only (nobody is logged in): animation on or off, without end or three rounds.
// prefers-reduced-motion is always followed. The cross is remembered in this browser until local midnight.
(function () {
  var G = window.GkGui;
  if (!G || !G.on('login_warning') || G.cfg.logged) return;
  if (/\/login$/.test(location.pathname) || /\/account\//.test(location.pathname)) return;
  var o = G.opt('login_warning');
  var still = !o.animate || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function dismissed() { return G.get('login_warning') === today(); }
  // the banner's height goes with it, also for the instance band's rules that read it (no white strip left)
  function dismiss() { G.set('login_warning', today()); document.documentElement.classList.remove('gk-gui-stuff-lw-phone-on'); document.documentElement.style.removeProperty('--gk-gui-stuff-lw-h');document.querySelectorAll('.gk-gui-stuff-lw').forEach(function (n) { n.remove(); }); document.querySelectorAll('.gk-gui-stuff-lw-ring, .gk-gui-stuff-lw-pulse, .gk-gui-stuff-lw-dot').forEach(function (n) { n.classList.remove('gk-gui-stuff-lw-ring', 'gk-gui-stuff-lw-pulse', 'gk-gui-stuff-lw-dot'); }); }
  function cross() {
    var x = G.put(G.node('button', 'gk-gui-stuff-lw-close'), 'close', '×', 14);
    x.type = 'button';
    x.setAttribute('aria-label', G.t('lw_close'));
    x.title = G.t('lw_close');
    x.addEventListener('click', dismiss);
    return x;
  }
  function visible(n) { return !!(n && n.offsetParent !== null); }
  var cls = still ? '' : (o.endless ? ' gk-gui-stuff-lw-endless' : '');

  function desktop(login) {
    var top = document.getElementById('top-menu');
    if (!top || document.querySelector('.gk-gui-stuff-lw-banner')) return;
    var banner = G.node('div', 'gk-gui-stuff-lw gk-gui-stuff-lw-banner' + cls);
    banner.setAttribute('role', 'status');
    banner.appendChild(G.node('span', 'gk-gui-stuff-lw-text', o.text));
    banner.appendChild(cross());
    top.insertAdjacentElement('afterend', banner);
    login.classList.add('gk-gui-stuff-lw-ring');
    if (still) return;
    login.classList.add('gk-gui-stuff-lw-pulse');
    if (o.endless) login.classList.add('gk-gui-stuff-lw-endless');
    var arrow = G.put(G.node('span', 'gk-gui-stuff-lw-arrow'), 'arrow-right', '\u279C', 18);
    arrow.setAttribute('aria-hidden', 'true');
    banner.appendChild(arrow);
    function place() {
      // the link is measured, never a fixed place: the arrow stands under it and turns toward it
      var l = login.getBoundingClientRect(), b = banner.getBoundingClientRect();
      var x = Math.min(Math.max(l.left + l.width / 2 - b.left, 12), b.width - 12);
      arrow.style.insetInlineStart = 'auto';
      arrow.style.left = (x - 8) + 'px';
      var ax = b.left + x, ay = b.top + 10;
      var angle = Math.atan2((l.top + l.height / 2) - ay, (l.left + l.width / 2) - ax) * 180 / Math.PI;
      arrow.style.setProperty('--gk-gui-stuff-lw-angle', angle + 'deg');
    }
    place();
    window.addEventListener('resize', place);
    function again() { arrow.classList.remove('gk-gui-stuff-lw-run'); void arrow.offsetWidth; arrow.classList.add('gk-gui-stuff-lw-run'); }
    again();
    banner.addEventListener('mouseenter', again);
  }

  function phone() {
    // the banner above everything, as on a desktop. Core's header stands fixed at the top in this layout, so the banner
    // is fixed above it and the header and the page move down by its height (--gk-gui-stuff-lw-h)
    if (!document.querySelector('.gk-gui-stuff-lw-banner')) {
      var banner = G.node('div', 'gk-gui-stuff-lw gk-gui-stuff-lw-banner gk-gui-stuff-lw-phone');
      banner.setAttribute('role', 'status');
      banner.appendChild(G.node('span', 'gk-gui-stuff-lw-text', o.text));
      banner.appendChild(cross());
      document.body.insertAdjacentElement('afterbegin', banner);
      var root = document.documentElement;
      var size = function () { root.style.setProperty('--gk-gui-stuff-lw-h', banner.offsetHeight + 'px'); };
      root.classList.add('gk-gui-stuff-lw-phone-on');
      size();
      window.addEventListener('resize', size);
    }
    function opened() {
      if (!document.documentElement.classList.contains('flyout-is-active') || dismissed()) return;
      var fly = document.querySelector('.js-flyout-menu');
      if (!fly || fly.querySelector('.gk-gui-stuff-lw-login')) return;
      var login = fly.querySelector('a.login');
      if (login) {
        var lift = G.node('div', 'gk-gui-stuff-lw gk-gui-stuff-lw-login');
        var arrow = G.put(G.node('span', 'gk-gui-stuff-lw-arrow-h'), 'arrow-right', '\u279C', 18);
        arrow.setAttribute('aria-hidden', 'true');
        var copy = login.cloneNode(true);
        lift.appendChild(arrow); lift.appendChild(copy);
        fly.insertAdjacentElement('afterbegin', lift);
      }
    }
    // a listener on the menu opening (the class core sets), never a timer
    new MutationObserver(opened).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  function start() {
    if (dismissed()) return;
    var button = document.querySelector('.mobile-toggle-button');
    // the layout is known by core's own button being shown, not by the screen width
    if (visible(button)) { phone(); return; }
    var login = document.querySelector('#top-menu a.login');
    if (login) desktop(login);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
