// gk_gui_stuff: the box of choices (choices_box.rb), the person's own state per box, kept in the browser; a box forced
// open (an empty list) is left open. Loaded once per page by gk_gui_stuff_choices_box where a view draws a box. Core's
// toggleFieldset folds it, as every collapsible fieldset. Plain DOM, no jQuery.
(function () {
  if (window.gkGuiStuffChoicesBox) return;
  window.gkGuiStuffChoicesBox = true;
  function key(f) { return 'gkguistuff.box.' + f.getAttribute('data-gk-gui-stuff-box'); }
  function open(f) { return !f.classList.contains('collapsed'); }
  function read(f) { try { return window.localStorage.getItem(key(f)); } catch (e) { return null; } }
  function save(f) { try { window.localStorage.setItem(key(f), open(f) ? '1' : '0'); } catch (e) { /* no memory */ } }
  function start() {
    document.querySelectorAll('fieldset[data-gk-gui-stuff-box]').forEach(function (f) {
      var lg = f.querySelector(':scope > legend.gk-gui-stuff-box-legend');
      if (!lg || f.dataset.gkGuiStuffBoxReady) return;
      f.dataset.gkGuiStuffBoxReady = '1';
      var want = read(f);
      if (!f.dataset.gkGuiStuffBoxForced && want !== null && (want === '1') !== open(f) && window.toggleFieldset) window.toggleFieldset(lg);
      lg.addEventListener('click', function () { setTimeout(function () { save(f); }, 0); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
