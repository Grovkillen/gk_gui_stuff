// gk_gui_stuff: the light, dark or automatic button in the top menu (color_mode.rb). The server draws the button with
// GK GUI Stuff's cycle button in a template; this script puts it where the account is and lets the page follow the
// person's choice. The cycle button itself (gk_gui_stuff_primitives.js) moves to the next mode at a press, saves it,
// says it with the whisper and goes back with a notice when the save fails; it tells this script with gk-gui-cycle,
// and the page takes that mode at once, also when it goes back. The row under My account says the mode saved at the
// button (gk-gui-cycle-saved) and the mode the button goes back to. Under automatic the tooltip says what the device shows
// right now (GkGui.cycle.note), and follows the device while the page is open. Where the account is a list the button
// takes the place of the plugin's own item in core's account menu (found by its own class); where the account is a
// dropdown it stands before the account (core's id #account), and moves to the item's place while core's phone menu
// (.js-profile-menu) holds the account's list, back again when it does not. In core's phone menu the button is a row
// with the mode in words (the cycle button's row class). The row under My account, a rail found by the address in the
// data, is followed too: when the rail says saved, the saved choice goes on the attribute GK Core Stuff names (its
// script sets the dark mode's class again when the attribute changes) and on the button. Only the newest choice
// pressed there is put on the page: an answer to an older one is kept, and put on the page if the newer one is not
// saved. A choice that was not saved changes nothing. Without the template (My account without the button) only the
// following is done. Plain DOM, no jQuery.
(function () {
  if (window.__gkGuiStuffColorMode) return;
  var dataEl = document.getElementById('gk-gui-stuff-color-mode-data');
  var tpl = document.getElementById('gk-gui-stuff-color-mode-tpl');
  if (!dataEl) return;
  var c;
  try { c = JSON.parse(dataEl.textContent); } catch (e) { return; }
  if (!c || !c.values || !c.attribute) return;
  window.__gkGuiStuffColorMode = true;

  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function button() { return document.getElementById(c.id); }

  // under automatic the tooltip and the name say what the device shows right now
  function noteDevice() {
    var node = button();
    if (!node) return;
    var words = c.device || {};
    window.GkGui.cycle.note(node, 'auto', words[mq && mq.matches ? 'dark' : 'light'] || '');
  }

  // the choice on GK Core Stuff's attribute: on, off, or taken away so that the device decides
  function apply(mode) {
    if (!has(c.values, mode)) return;
    var v = c.values[mode], h = document.documentElement;
    if (v) h.setAttribute(c.attribute, v); else h.removeAttribute(c.attribute);
    c.mode = mode;
  }

  // a rail that saves the choice (the row under My account): its address is the one in the data
  function railOf(el) {
    var r = el && el.closest ? el.closest('.gk-gui-stuff-rail') : null;
    return r && c.url && r.getAttribute('data-gk-gui-save-url') === c.url ? r : null;
  }

  // the rows of the same choice say a choice made at the button
  function rows(mode) {
    document.querySelectorAll('.gk-gui-stuff-rail').forEach(function (r) {
      if (r.getAttribute('data-gk-gui-save-url') !== c.url) return;
      r.querySelectorAll('.gk-gui-stuff-segment > button[value]').forEach(function (b) {
        b.setAttribute('aria-pressed', b.value === mode ? 'true' : 'false');
      });
    });
  }

  // the button's press, and its going back after a save that failed: the page takes the mode at once
  // (going back is to the mode last saved, so the row under My account says that one again)
  document.addEventListener('gk-gui-cycle', function (e) {
    var node = button();
    if (!node || e.target !== node || !e.detail) return;
    apply(String(e.detail.value));
    if (e.detail.back) rows(String(e.detail.value));
  });
  // the button's save: the row under My account says the mode that was saved, not the one shown after a newer press
  document.addEventListener('gk-gui-cycle-saved', function (e) {
    var node = button();
    if (node && e.target === node && e.detail) rows(String(e.detail.value));
  });

  // the choice pressed in the row, kept on its rail when it is pressed: the newest one waits for its own answer
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.gk-gui-stuff-segment > button[value]') : null;
    var r = b && railOf(b);
    if (!r || !has(c.values, b.value)) return;
    r._gkColorModeWant = b.value;
    watchFailure(r);
  }, true);

  // the row's answer: the choice the server saved (its answer names it, else the one pressed); on the page and the
  // button only when it is the newest pressed, else kept until the newest is answered
  function fromRow(mode) {
    apply(mode);
    var node = button();
    if (node) window.GkGui.cycle.set(node, mode);
  }
  document.addEventListener('gk-gui-saved', function (e) {
    var r = railOf(e.target);
    if (!r) return;
    var saved = e.detail && e.detail.choice ? String(e.detail.choice) : r._gkColorModeWant;
    if (!has(c.values, saved)) return;
    r._gkColorModeSaved = saved;
    if (!r._gkColorModeWant || r._gkColorModeWant === saved) { r._gkColorModeWant = null; fromRow(saved); }
  });

  // a newer choice in the row that was not saved: the page takes the last one that was, if it is not on the page already
  function watchFailure(r) {
    if (r._gkColorModeWatch || !window.MutationObserver) return;
    r._gkColorModeWatch = new MutationObserver(function () {
      if (r.getAttribute('data-gk-gui-save') !== 'failed') return;
      r._gkColorModeWant = null;
      if (r._gkColorModeSaved && r._gkColorModeSaved !== c.mode) fromRow(r._gkColorModeSaved);
    });
    r._gkColorModeWatch.observe(r, { attributes: true, attributeFilter: ['data-gk-gui-save'] });
  }

  // in core's phone menu the button is a row with the mode in words; elsewhere the icon alone
  function rowState() {
    var node = button();
    if (node) node.classList.toggle('gk-gui-stuff-cycle-row', !!node.closest('.js-profile-menu'));
  }

  // where the account is a dropdown: before the account, or in the item's place while core's phone menu holds the list
  function home() {
    var node = button();
    if (!node) return;
    if (c.dropdown) {
      var item = document.querySelector('a.' + c.item);
      var account = document.getElementById('account');
      if (item && item.parentNode && item.closest('.js-profile-menu')) {
        if (node.nextElementSibling !== item) item.parentNode.insertBefore(node, item);
      } else if (account && account.parentNode && node.nextElementSibling !== account) {
        account.parentNode.insertBefore(node, account);
      }
    }
    rowState();
  }

  function place() {
    if (!tpl || !tpl.content || button()) return;
    var node = tpl.content.querySelector('#' + c.id);
    if (!node) return;
    node = node.cloneNode(true);
    var item = document.querySelector('a.' + c.item);
    var account = c.dropdown ? document.getElementById('account') : null;
    if (!c.dropdown && item && item.parentNode) {
      item.parentNode.replaceChild(node, item);
    } else if (account && account.parentNode) {
      account.parentNode.insertBefore(node, account);
    } else {
      return;
    }
    home();
    noteDevice();
    // core moves the account's list when the page is ready and on a resize; the button follows after core has moved it
    setTimeout(home, 0);
    window.addEventListener('load', home);
    window.addEventListener('resize', function () { setTimeout(home, 0); });
    // under automatic the page follows the device, and so does the tooltip
    if (mq && mq.addEventListener) mq.addEventListener('change', noteDevice);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place); else place();
})();
