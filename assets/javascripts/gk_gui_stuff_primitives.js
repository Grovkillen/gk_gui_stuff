// gk_gui_stuff: the client side of the design language's primitives (primitives.rb). Loaded on every page with their
// stylesheet, before the kernel; the kernel keeps what this puts on window.GkGui. Events are taken at the document, so
// content that comes later needs no pass; only the groups' remembered state is laid on in a pass (GkGui.onContent
// when the kernel is there, else once when the page is read). Plain DOM, no jQuery.
//   GkGui.fly.close(details)                                    the fold-out box
//   GkGui.fly.open(anchor, content, {role, onClose, className}) a fly at a link or a form button a script has, never in
//                                                               a menu (a role gives it gk-gui-stuff-fly-roled); its
//                                                               reason is laid under its buttons
//   GkGui.fly.formButton                                        true: fly.open takes a form button and className
//   (the category picker: its button follows the chosen radio; a click, Space or Enter on one closes the box,
//   the arrow keys only move the choice)
//   (a button with a reason: a required reason is checked before the box's button sends; Valfritt sends what was
//   written also after its box closed, unless the box was left with Avbryt or Esc)
//   (the mount of a switch, a round check, a segment or an icon toggle: its box, the change with the reason,
//   Esc and a click outside)
//   GkGui.sheet.on(box, close, addCancel) / .off(box) / .narrow()  a box as a sheet below 899 px
//   GkGui.save.set(rail, state, word)                           a rail's state: direct, changed, saved, failed
//   GkGui.save.rehearse(rail, {answer, delay, control, sweep, flip})  the rail and its sweep with a made-up answer, nothing sent
//   GkGui.save.formRecount(box)                                 a GK form's box counts its changed fields again
//   (an order that waits: a moved item gets the rail changed and the note says when the order holds)
//   GkGui.roleClass(role)                                       the class of a role: 1 to 12, an alert level, admin, muted,
//                                                               choice, effect, band-*, line-next, line-now
// Loaded right after this file: gk_gui_stuff_parts.js (GkGui.pill, GkGui.iconButton, GkGui.count, GkGui.group),
// gk_gui_stuff_layer.js (GkGui.layer) and gk_gui_stuff_inline.js (edit in place, GkGui.inline).
(function () {
  var G = window.GkGui = window.GkGui || {};
  var T = {
    saving: 'Sparar…', saved: '✓ Sparat', failed: 'Inte sparat', close: 'Stäng',
    changes_one: '1 ändring, inte sparad', changes_other: '%{count} ändringar, inte sparade', form_saved: 'Sparat',
    order_moved_save: '%{name} har flyttats. Ordningen gäller när du sparar.',
    order_moved_apply: '%{name} har flyttats. Ordningen gäller när du verkställer.'
  };
  var tEl = document.getElementById('gk-gui-stuff-primitives-texts');
  try { if (tEl) T = JSON.parse(tEl.textContent); } catch (e) { /* the defaults */ }
  function closest(n, sel) { return n && n.nodeType === 1 ? n.closest(sel) : (n && n.parentElement ? n.parentElement.closest(sel) : null); }

  // ---------------------------------------------------------------- fly
  // A <details class="gk-gui-stuff-fly"> is one: its summary is the button, the rest the box, laid in the page right
  // after the button and fastened to it like a tab, growing towards the side with room. It follows the page when
  // scrolled, takes the focus to its first field, and the tab order goes on from the button. No dark background; Esc, a
  // [data-gk-gui-fly-cancel] button and a click outside close it, the focus goes back to the button, and what was
  // written stays. Without the script the details simply opens in place. A fly in an inert container (the style
  // guide's still example, drawn open) is left alone.
  function flyClose(d, refocus) {
    if (!d.open || d.closest('[inert]')) return;
    // Valfritt's pen left with Avbryt or Esc: the reason stays in the box but does not go with the button beside it
    if (refocus && d.matches('.gk-gui-stuff-btn-split-pen')) d.setAttribute('data-gk-gui-reason-left', '1');
    d.open = false;
    if (refocus) { var s = d.querySelector(':scope > summary'); if (s) s.focus({ preventScroll: true }); }
  }
  // the room a box has: the window, narrowed by every container that cuts what overflows it (core's list tables, its
  // div.autoscroll and #content). A list table stays the width of the room also where a page lets it clip nothing while
  // a box is open, so that the box turns inside the list and does not run out over the sidebar
  function room(el) {
    var lo = 0, hi = document.documentElement.clientWidth;
    for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (window.getComputedStyle(p).overflowX === 'visible' && !p.matches('table.list')) continue;
      var pr = p.getBoundingClientRect();
      lo = Math.max(lo, pr.left); hi = Math.min(hi, pr.right);
    }
    return { lo: lo + 4, hi: hi - 4 };
  }
  // a box grows from one side of what it is fastened to; when that side is short of room, cls on el turns it to the
  // other side (the start side in right to left). When neither side has the room, the box stays on the side with
  // more of it and is made no wider than that. fromEnd: the box grows from the end side (a mount's box)
  function place(el, box, cls, fromEnd) {
    el.classList.remove(cls);
    box.style.maxInlineSize = '';
    var e = room(el), r = box.getBoundingClientRect();
    var rtl = window.getComputedStyle(el).direction === 'rtl';
    var right = fromEnd ? rtl : !rtl;
    if (right ? r.right <= e.hi : r.left >= e.lo) return;
    el.classList.add(cls);
    var f = box.getBoundingClientRect();
    if (f.left >= e.lo && f.right <= e.hi) return;
    var here = right ? e.hi - r.left : r.right - e.lo, there = right ? f.right - e.lo : e.hi - f.left;
    // max-inline-size counts the content only when the box sizes by its content: take its padding and border off
    var extra = f.width - parseFloat(window.getComputedStyle(box).width);
    if (here >= there) el.classList.remove(cls);
    box.style.maxInlineSize = Math.max(160, Math.floor(Math.max(here, there) - extra)) + 'px';
  }
  // a sheet at the bottom on a narrow screen needs no side
  function flyPlace(d) {
    var box = d.querySelector(':scope > .gk-gui-stuff-fly-box');
    if (!box) return;
    if (narrow()) { d.classList.remove('gk-gui-stuff-fly-end'); box.style.maxInlineSize = ''; } else place(d, box, 'gk-gui-stuff-fly-end', false);
  }
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (!d.matches || !d.matches('details.gk-gui-stuff-fly') || d.closest('[inert]')) return;
    // Valfritt's pen: a blank reason is not sent. What was written goes with the save also when the box has closed,
    // since a press on the button beside the pen closes the box before the click sends; only Avbryt and Esc leave it
    if (d.matches('.gk-gui-stuff-btn-split-pen')) {
      var pt = d.querySelector('.gk-gui-stuff-reason textarea');
      if (d.open) d.removeAttribute('data-gk-gui-reason-left');
      if (pt) pt.disabled = !d.open && (pt.value.trim() === '' || d.hasAttribute('data-gk-gui-reason-left'));
    }
    var fb = d.querySelector(':scope > .gk-gui-stuff-fly-box');
    if (!d.open) { if (fb) sheetOff(fb); return; }
    document.querySelectorAll('details.gk-gui-stuff-fly[open]').forEach(function (o) { if (o !== d && !o.contains(d)) flyClose(o, false); });
    flyPlace(d);
    if (fb) sheetOn(fb, function () { flyClose(d, true); });
    if (G.selectSearch) G.selectSearch.pass(d); // a field in the box that asks for the chooser
    // a box of radios gives the focus to the chosen one, else the first field, else the first button; the reason
    // stands under the box's buttons, so a box whose only field is the reason gives it the focus. What cannot be
    // undone gives it to the reason, else to Avbryt, never to the button that does it; so does a box whose button is in
    // the role alarm and has no field, so that Enter never does the alarm's action
    var irr = d.matches('.gk-gui-stuff-fly-irreversible') ? ':scope > .gk-gui-stuff-fly-box ' : null;
    var own = ':scope > .gk-gui-stuff-fly-box ';
    // only what is the box's own and seen: never a field in a closed box inside it (a part's panel in +N); a fold's
    // summary is seen when its fold is
    var seen = function (n) { return ownSeen(fb, n.tagName === 'SUMMARY' && n.parentElement && n.parentElement.parentElement ? n.parentElement.parentElement : n); };
    var pick = function (sel) { return fb ? [].filter.call(fb.querySelectorAll(sel), seen)[0] || null : null; };
    var f = (irr && (d.querySelector(irr + '.gk-gui-stuff-reason textarea') || d.querySelector(irr + '[data-gk-gui-fly-cancel]'))) ||
            pick('input[type=radio]:checked:not([disabled])') ||
            pick('input:not([type=hidden]):not([type=submit]):not([type=button]):not([disabled]), select:not([disabled]), textarea:not([disabled])') ||
            (d.querySelector(own + '.gk-gui-stuff-btn-alarm') && d.querySelector(own + '[data-gk-gui-fly-cancel]')) ||
            pick('button, a[href], summary');
    if (f) f.focus({ preventScroll: true });
  }, true);
  // a press outside closes; a press on a sheet's dimmed page (the details' or the mount's own ::before, so the target
  // is the element itself) is outside too, and goes no further
  document.addEventListener('mousedown', function (e) {
    var t = e.target;
    // a flag stands in its own layer outside the box: a press on one whose target is inside the box is a press inside
    var flag = t.closest && t.closest('.gk-gui-stuff-flags > .gk-gui-stuff-flag');
    var flagged = flag && flag._gkGuiTarget;
    document.querySelectorAll('details.gk-gui-stuff-fly[open]').forEach(function (d) {
      if (t === d) e.preventDefault();
      if (flagged && d.contains(flagged)) return;
      if (!d.contains(t) || t === d) flyClose(d, false);
    });
    document.querySelectorAll('.gk-gui-stuff-mount > .gk-gui-stuff-mount-box:not([hidden])').forEach(function (b) {
      var m = b.parentElement;
      if (t === m) e.preventDefault();
      if (!m.contains(t) || t === m) mountClose(m, false);
    });
  }, true);

  // ---------------------------------------------------------------- sheet
  // Below 899 px every fly, mount box, rail reason box, box of edit in place and layer is a sheet at the bottom of the
  // window (the stylesheet draws it, with the grip that is only drawn). While one is open: aria-modal true,
  // the page behind kept from scrolling (a class on the root), the focus kept in the sheet (Tab and Shift Tab go
  // round), and Avbryt added at the end when the box has none of its own (taken away again when it closes; its click
  // runs close). A window turned wide forgets the state; the box stays open as a box.
  // lockAt: where the page behind stood when the first sheet opened
  var NARROW = window.matchMedia('(max-width: 899px)'), sheets = [], lockAt = null, flyNames = 0;
  function narrow() { return NARROW.matches; }
  function sheetOf(n) { return sheets.filter(function (s) { return s.box.contains(n); }).pop() || null; }
  // a part of the box's own, and seen: not in a box inside it, nor in a hidden part or a closed fold of it
  function ownSeen(box, n) {
    var h = n.closest('[hidden], details:not([open])');
    return n.closest('.gk-gui-stuff-fly-box, .gk-gui-stuff-layer') === box && !(h && box.contains(h));
  }
  function sheetOn(box, close, addCancel) {
    if (!narrow() || sheets.some(function (s) { return s.box === box; })) return;
    var s = { box: box, close: close, modal: box.getAttribute('aria-modal'), role: box.hasAttribute('role'), added: null, named: false };
    var own = [].some.call(box.querySelectorAll('[data-gk-gui-fly-cancel]'), function (c) { return ownSeen(box, c); });
    if (addCancel !== false && !own) {
      // beside the box's own first button (Klar) when it has a row of buttons, else in a row of its own at the end
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = T.cancel || ''; b.setAttribute('data-gk-gui-fly-cancel', '1');
      var row = [].filter.call(box.querySelectorAll('.gk-gui-stuff-fly-buttons'), function (r) { return ownSeen(box, r); }).pop();
      if (row && row.firstElementChild) { row.firstElementChild.after(b); s.added = b; } else {
        s.added = document.createElement('div');
        s.added.className = 'gk-gui-stuff-fly-buttons';
        s.added.appendChild(b);
        box.appendChild(s.added);
      }
    }
    if (!s.role) box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    // a fly's box without a name is named by its button (aria-labelledby on the summary of the fly's own details),
    // so that the dialog is never read unnamed; its words are never copied
    var sum = box.parentElement && box.parentElement.tagName === 'DETAILS' ? box.parentElement.querySelector('summary') : null;
    if (sum && sum.parentElement === box.parentElement && !box.hasAttribute('aria-label') && !box.hasAttribute('aria-labelledby')) {
      if (!sum.id) sum.id = 'gk-gui-stuff-fly-name-' + (++flyNames);
      box.setAttribute('aria-labelledby', sum.id); s.named = true;
    }
    if (!sheets.length) lockAt = { x: window.scrollX, y: window.scrollY };
    sheets.push(s);
    document.documentElement.classList.add('gk-gui-stuff-sheet-lock');
    // the page behind stays where it was
    if (lockAt && (window.scrollX !== lockAt.x || window.scrollY !== lockAt.y)) window.scrollTo(lockAt.x, lockAt.y);
  }
  // a closing box also ends the sheets inside it (a fly open in a layer), and a sheet whose box has left the page
  // ends too, since its toggle may never be seen; else the page would stay kept from scrolling
  function sheetOff(box) {
    sheets = sheets.filter(function (s) {
      if (s.box !== box && !box.contains(s.box) && s.box.isConnected) return true;
      if (s.added) s.added.remove();
      if (s.named) s.box.removeAttribute('aria-labelledby');
      if (!s.role) s.box.removeAttribute('role');
      if (s.modal === null) s.box.removeAttribute('aria-modal'); else s.box.setAttribute('aria-modal', s.modal);
      return false;
    });
    if (sheets.length || !document.documentElement.classList.contains('gk-gui-stuff-sheet-lock')) return;
    document.documentElement.classList.remove('gk-gui-stuff-sheet-lock');
    // and is still there when the last sheet closes
    var at = lockAt;
    lockAt = null;
    if (at && (window.scrollX !== at.x || window.scrollY !== at.y)) window.scrollTo(at.x, at.y);
  }
  NARROW.addEventListener('change', function () { if (!narrow()) sheets.slice().forEach(function (s) { sheetOff(s.box); }); });
  document.addEventListener('keydown', function (e) {
    var s = sheets[sheets.length - 1];
    if (e.key !== 'Tab' || !s) return;
    var all = [].filter.call(s.box.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex="-1"])'),
                             function (n) { return !n.disabled && n.getClientRects().length > 0; });
    if (!all.length) return;
    var i = all.indexOf(document.activeElement);
    if (i < 0 || (e.shiftKey && i === 0) || (!e.shiftKey && i === all.length - 1)) {
      e.preventDefault();
      all[e.shiftKey ? (i <= 0 ? all.length - 1 : i - 1) : (i < 0 || i === all.length - 1 ? 0 : i + 1)].focus();
    }
  });
  G.sheet = { on: sheetOn, off: sheetOff, narrow: narrow };

  // A fly from a script at a link it drew outside a menu: the button copies the link (its classes, icon and text) and
  // stands in its place while the box is open. Closing it takes it away, shows the link again and gives it the focus.
  // An entry in a menu (the row menu, the three-dot menu) never opens a fly: it opens GkGui.layer and ends with "…".
  // The box keeps the order of every box with a reason: the question or the warning first, then the buttons
  // (.gk-gui-stuff-fly-buttons), and a reason (.gk-gui-stuff-reason) the content drew before them is laid under them.
  // A role gives the box its edge in the role and the class gk-gui-stuff-fly-roled, as gk_gui_stuff_fly on the server.
  // The anchor may also be a form's button (an input of type submit or button, or a button element): the summary then
  // takes the input's word from its value and is a button, not a plain link (core's Submit keeps its own word).
  // o.className: classes of the caller's own on the box (its details), for its own CSS or to know its fly again.
  function flyOpen(anchor, content, o) {
    o = o || {};
    if (anchor._gkGuiFly && anchor._gkGuiFly.isConnected) { flyClose(anchor._gkGuiFly, false); return anchor._gkGuiFly; }
    var d = document.createElement('details'), rc = roleClass(o.role);
    d.className = 'gk-gui-stuff-fly' + (rc ? ' ' + rc + ' gk-gui-stuff-fly-roled' : '') + (o.className ? ' ' + o.className : '');
    var input = anchor.matches('input[type=submit], input[type=button]');
    var formButton = input || anchor.matches('button');
    var s = document.createElement('summary');
    s.className = (anchor.className ? anchor.className + ' ' : '') + 'gk-gui-stuff-fly-button' + (formButton ? '' : ' gk-gui-stuff-fly-plain');
    ['title', 'aria-label'].forEach(function (k) { if (anchor.hasAttribute(k)) s.setAttribute(k, anchor.getAttribute(k)); });
    if (input) s.textContent = anchor.value;
    else Array.prototype.forEach.call(anchor.childNodes, function (n) { s.appendChild(n.cloneNode(true)); });
    var box = document.createElement('div');
    box.className = 'gk-gui-stuff-fly-box';
    if (content) box.appendChild(content);
    reasonUnder(box);
    d.appendChild(s);
    d.appendChild(box);
    anchor.parentNode.insertBefore(d, anchor.nextSibling);
    anchor.style.display = 'none';
    anchor._gkGuiFly = d;
    d.addEventListener('toggle', function () {
      if (d.open) return;
      d.remove();
      anchor._gkGuiFly = null;
      anchor.style.display = '';
      anchor.focus({ preventScroll: true });
      if (o.onClose) o.onClose();
    });
    d.open = true;
    return d;
  }
  // a reason of the box's own that stands before its buttons is moved to the line under them, within the same form
  // (a nested fly's reason and buttons are its own)
  function reasonUnder(box) {
    var own = function (el) { return el.closest('.gk-gui-stuff-fly-box') === box; };
    var row = [].filter.call(box.querySelectorAll('.gk-gui-stuff-fly-buttons'), own).pop();
    if (!row) return;
    [].filter.call(box.querySelectorAll('.gk-gui-stuff-reason'), own).reverse().forEach(function (r) {
      if (r.closest('form') !== row.closest('form')) return;
      if (r.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING) row.insertAdjacentElement('afterend', r);
    });
  }
  // formButton: this open takes a form button (its word from the value) and className, so a caller can ask for it
  G.fly = { close: function (d) { flyClose(d, true); }, open: flyOpen, formButton: true };

  // A button with a reason: the box's button does not send while a required reason is blank; the box says so
  // and the focus goes to the reason. Enter in the reason sends, Shift and Enter is a new line.
  function reasonReady(submit) {
    var box = submit.closest('.gk-gui-stuff-fly-box'), ta = box && box.querySelector('.gk-gui-stuff-reason textarea[aria-required="true"]');
    if (!ta || ta.closest('.gk-gui-stuff-fly-box') !== box || ta.value.trim() !== '') return true;
    reasonMissing(ta);
    return false;
  }
  function reasonMissing(ta) {
    var err = ta.closest('.gk-gui-stuff-reason').querySelector('.gk-gui-stuff-reason-error');
    if (err) err.hidden = false;
    ta.setAttribute('aria-invalid', 'true');
    ta.focus();
  }
  document.addEventListener('input', function (e) {
    var ta = e.target;
    if (!ta || ta.tagName !== 'TEXTAREA' || !ta.closest('.gk-gui-stuff-reason')) return;
    var err = ta.closest('.gk-gui-stuff-reason').querySelector('.gk-gui-stuff-reason-error');
    if (err) err.hidden = true;
    ta.removeAttribute('aria-invalid');
  });

  // ---------------------------------------------------------------- mount
  // Fäste: [ sign | control ] of a switch, a round check, a segment or an icon toggle. The sign (the pen or the
  // lock) opens the box under the control, which a locked control (required, step up) also does; Valfritt changes at
  // once and sends an empty reason, so that a rail that asks for one does not ask again. The box's button makes the
  // change with the reason and closes; a blank required reason is refused in the box. What was written stays when the
  // box closes and is emptied when the change is saved. Esc, Avbryt and a click outside close it. The box always says
  // the next change: a segment's is the part clicked (m._gkGuiWant), else the first part not chosen, its words the
  // templates with %{choice}.
  var CONTROLS = 'button.gk-gui-stuff-switch, button.gk-gui-stuff-round-check, button.gk-gui-stuff-icon-toggle, .gk-gui-stuff-segment';
  function mountBox(m) { return m.querySelector(':scope > .gk-gui-stuff-mount-box'); }
  function mountControl(m) { return [].find.call(m.children, function (c) { return c.matches(CONTROLS); }) || null; }
  function isOn(ctl) { return (ctl.getAttribute('aria-checked') || ctl.getAttribute('aria-pressed')) === 'true'; }
  function segWant(m, seg) {
    var w = m._gkGuiWant;
    return w && w.parentElement === seg ? w : seg.querySelector(':scope > button:not([aria-pressed="true"])'); // gk-r17 P2r: the segment and its buttons are this plugin's own primitive, not core's
  }
  function mountWords(m) {
    var ctl = mountControl(m), box = mountBox(m);
    if (!ctl || !box) return;
    var w = box.querySelector('.gk-gui-stuff-reason-what'), ok = box.querySelector('.gk-gui-stuff-mount-ok');
    var seg = ctl.classList.contains('gk-gui-stuff-segment'), on = !seg && isOn(ctl), want = seg ? segWant(m, ctl) : null;
    var fill = function (s) { return (s || '').replace('%{choice}', want ? want.textContent.trim() : ''); };
    if (w) w.textContent = fill(m.getAttribute(on ? 'data-gk-gui-what-off' : 'data-gk-gui-what-on'));
    if (ok) ok.textContent = fill(m.getAttribute(on ? 'data-gk-gui-turn-off' : 'data-gk-gui-turn-on'));
  }
  // a switch's or a round check's state, its word, and its mount's words for the next change
  function setChecked(b, v) {
    b.setAttribute('aria-checked', v ? 'true' : 'false');
    var w = b.querySelector('.gk-gui-stuff-switch-word');
    if (w) w.textContent = v ? b.getAttribute('data-gk-gui-on') : b.getAttribute('data-gk-gui-off');
    var m = b.closest('.gk-gui-stuff-mount');
    if (m) mountWords(m);
  }
  function mountOpen(m, opener) {
    var box = mountBox(m), tab = m.querySelector(':scope > .gk-gui-stuff-mount-tab');
    if (!box) return;
    document.querySelectorAll('.gk-gui-stuff-mount > .gk-gui-stuff-mount-box:not([hidden])').forEach(function (b) { if (b !== box) mountClose(b.parentElement, false); });
    document.querySelectorAll('details.gk-gui-stuff-fly[open]').forEach(function (d) { if (!d.contains(m)) flyClose(d, false); });
    m._gkGuiOpener = opener || tab;
    mountWords(m);
    box.hidden = false;
    m.classList.add('gk-gui-stuff-sheet-open');
    if (tab) tab.setAttribute('aria-expanded', 'true');
    // a sheet at the bottom on a narrow screen needs no side
    if (narrow()) { box.classList.remove('gk-gui-stuff-mount-box-start'); box.style.maxInlineSize = ''; sheetOn(box, function () { mountClose(m, true); }); } else place(box, box, 'gk-gui-stuff-mount-box-start', true);
    var f = box.querySelector('textarea') || box.querySelector('a[href], button');
    if (f) f.focus({ preventScroll: true });
  }
  function mountClose(m, refocus) {
    var box = mountBox(m), tab = m.querySelector(':scope > .gk-gui-stuff-mount-tab');
    if (!box || box.hidden) return;
    box.hidden = true;
    m.classList.remove('gk-gui-stuff-sheet-open');
    sheetOff(box);
    if (tab) tab.setAttribute('aria-expanded', 'false');
    var back = m._gkGuiOpener || tab;
    if (refocus && back) back.focus({ preventScroll: true });
  }
  // the change, posted by the rail it stands in; reason null for no reason of its own (a bare control). A segment
  // takes the part wanted, an icon toggle flips aria-pressed; each is put back when the save fails
  function mountChange(m, reason) {
    var ctl = mountControl(m), rail = m.closest('.gk-gui-stuff-rail');
    if (!ctl || !rail) return null;
    var name = ctl.getAttribute('data-gk-gui-save-name'), fd, undo;
    if (ctl.classList.contains('gk-gui-stuff-segment')) {
      var want = segWant(m, ctl), old = ctl.querySelector(':scope > [aria-pressed="true"]');
      if (!want || want === old) return null;
      var press = function (n) { ctl.querySelectorAll(':scope > button').forEach(function (x) { x.setAttribute('aria-pressed', x === n ? 'true' : 'false'); }); mountWords(m); }; // gk-r17 P2r: the segment and its buttons are this plugin's own primitive, not core's
      m._gkGuiWant = null;
      press(want);
      fd = one(name, want.value);
      undo = function () { press(old); };
    } else if (ctl.classList.contains('gk-gui-stuff-icon-toggle')) {
      var p = !isOn(ctl);
      ctl.setAttribute('aria-pressed', p ? 'true' : 'false');
      mountWords(m);
      fd = one(name, p ? '1' : '0');
      undo = function () { ctl.setAttribute('aria-pressed', p ? 'false' : 'true'); mountWords(m); };
    } else {
      var v = !isOn(ctl);
      setChecked(ctl, v);
      fd = one(name, v ? '1' : '0');
      undo = function () { setChecked(ctl, !v); };
    }
    if (reason !== null) fd.append('reason', reason);
    return post(rail, fd, undo);
  }
  function mountOk(m) {
    var box = mountBox(m), ta = box && box.querySelector('textarea');
    var text = ta ? ta.value.trim() : '';
    if (m.getAttribute('data-gk-gui-mount') === 'required' && text === '') { if (ta) reasonMissing(ta); return; }
    var p = mountChange(m, text);
    mountClose(m, true);
    if (p && p.then) p.then(function (j) { if (j && ta) ta.value = ''; });
  }
  // the clicks in a mount that is not bare; true when the click was the mount's. A segment's chosen part does nothing
  function mountClick(t, e) {
    var m = closest(t, '.gk-gui-stuff-mount');
    if (!m || m.getAttribute('data-gk-gui-mount') === 'off') return false;
    var box = mountBox(m), tab = closest(t, '.gk-gui-stuff-mount-tab');
    if (box && box.contains(t)) {
      if (closest(t, '.gk-gui-stuff-mount-ok')) mountOk(m);
      return true;
    }
    if (tab) {
      e.preventDefault();
      if (box && box.hidden) mountOpen(m, tab); else mountClose(m, true);
      return true;
    }
    var ctl = closest(t, 'button.gk-gui-stuff-switch, button.gk-gui-stuff-round-check, button.gk-gui-stuff-icon-toggle, .gk-gui-stuff-segment > button');
    if (!ctl) return true;
    if (ctl.parentElement.classList.contains('gk-gui-stuff-segment')) {
      if (ctl.getAttribute('aria-pressed') === 'true') return true;
      m._gkGuiWant = ctl;
    }
    if (m.classList.contains('gk-gui-stuff-mount-locked')) mountOpen(m, ctl); else mountChange(m, '');
    return true;
  }

  // The category picker: its button shows the chosen swatch and says its name; a click on a choice, or Space,
  // chooses and closes, Enter closes without sending the form, and the arrow keys only move the choice
  function pickerOf(n) { return closest(n, 'details.gk-gui-stuff-category-picker'); }
  document.addEventListener('change', function (e) {
    var r = e.target, d = r && r.type === 'radio' ? pickerOf(r) : null;
    var lab = d && r.closest('label.gk-gui-stuff-category-choice');
    if (!lab) return;
    var s = d.querySelector(':scope > summary'), was = s && s.querySelector('.gk-gui-stuff-swatch'), now = lab.querySelector('.gk-gui-stuff-swatch');
    if (was && now) was.replaceWith(now.cloneNode(true));
    if (s) { s.title = lab.title; s.setAttribute('aria-label', lab.title); }
    var txt = s && s.querySelector('.gk-gui-stuff-category-text');
    if (txt) txt.textContent = lab.title;
  });
  document.addEventListener('pointerdown', function (e) {
    var d = pickerOf(e.target);
    if (d) d._gkGuiPick = !!closest(e.target, '.gk-gui-stuff-fly-box label.gk-gui-stuff-category-choice');
  }, true);
  document.addEventListener('keydown', function (e) {
    var r = e.target, d = r && r.type === 'radio' ? pickerOf(r) : null;
    if (!d) return;
    d._gkGuiPick = e.key === ' ' || e.key === 'Spacebar';
    if (e.key === 'Enter') { e.preventDefault(); flyClose(d, true); }
  });
  // the click that a pointer or Space gives the radio closes the box once the choice is made; the arrow keys' click
  // does not
  document.addEventListener('click', function (e) {
    var r = e.target, d = r && r.type === 'radio' ? pickerOf(r) : null;
    if (!d || !d._gkGuiPick) return;
    d._gkGuiPick = false;
    setTimeout(function () { flyClose(d, true); }, 0);
  });

  // ---------------------------------------------------------------- save
  // A rail (.gk-gui-stuff-rail) saves what its controls change, posted as form data with the page's token to its
  // address; the answer is JSON {ok, message}. Changed while saving, saved for 3 s and back over 2 s, failed until the
  // row changes again, with a notice and the value back. The word over the row's end says it; the screen reader once.
  function token() { var m = document.querySelector('meta[name="csrf-token"]'); return m ? m.getAttribute('content') : ''; }
  // the word fades in 2 s and is then emptied, so that a faded word never widens the cell or a scrolling list
  function fadeWord(st) {
    st.classList.remove('gk-gui-stuff-save-status-on');
    clearTimeout(st._gkGuiFade);
    st._gkGuiFade = setTimeout(function () { if (!st.classList.contains('gk-gui-stuff-save-status-on')) st.textContent = ''; }, 2000);
  }
  function setState(rail, state, word) {
    rail.setAttribute('data-gk-gui-save', state);
    var st = rail.querySelector(':scope > .gk-gui-stuff-save-status');
    clearTimeout(rail._gkGuiTimer);
    if (st) {
      if (word) { clearTimeout(st._gkGuiFade); st.textContent = word; st.classList.add('gk-gui-stuff-save-status-on'); } else fadeWord(st);
    }
    if (state === 'saved') {
      rail._gkGuiTimer = setTimeout(function () {
        rail.setAttribute('data-gk-gui-save', 'direct');
        if (st) fadeWord(st);
      }, 3000);
    }
  }
  function fieldsOf(rail) {
    var fd = new FormData();
    rail.querySelectorAll('input[name], select[name], textarea[name]').forEach(function (f) {
      if (f.closest('.gk-gui-stuff-rail') !== rail || f.disabled) return;
      if ((f.type === 'checkbox' || f.type === 'radio') && !f.checked) return;
      fd.append(f.name, f.value);
    });
    return fd;
  }
  // The sweep (the setting save_sweep, off from the start): when a control on a long row saves at once, a line grows
  // along the row's lower edge from the control to the rail in the role changed. When it has got there and the answer
  // has come it takes the rail's state, saved or failed, and only then its tail is drawn after it, so that it shrinks
  // into the rail and goes. A slow answer leaves it whole in changed. Only where it is more than 400 px from the
  // control to the rail, never with reduced motion. It is a layer of its own in the rail, absolute and taking no room,
  // laid before the bar so that the bar and the word stand over it; its place is in logical directions, so that right
  // to left mirrors it. Every rail has its own; a new save on the same rail starts over. The times are the stylesheet's.
  var SWEEP_OVER = 400, SWEEP_GROW = 500, SWEEP_SHRINK = 650;
  var SWEEP_CONTROL = 'button, input:not([type="hidden"]), select, textarea, a[href], summary, [role="button"], [role="switch"]';
  var sweepPressed = null;
  // what is pressed in a rail is where its line starts; a mount or an edit in place counts as a whole, and the box that
  // asks for a reason lies over the row and is not the control
  function sweepNote(e) {
    var c = closest(e.target, SWEEP_CONTROL);
    if (!c || !c.closest('.gk-gui-stuff-rail') || c.closest('.gk-gui-stuff-save-reason')) return;
    sweepPressed = c.closest('.gk-gui-stuff-mount, .gk-gui-stuff-inline-edit') || c;
  }
  document.addEventListener('click', sweepNote, true);
  document.addEventListener('change', sweepNote, true);
  // a save nothing was pressed for (a list that was dragged, a script's) starts at the row's first control
  function sweepControl(rail) {
    if (sweepPressed && sweepPressed.isConnected && rail.contains(sweepPressed)) return sweepPressed;
    var first = Array.prototype.find.call(rail.querySelectorAll(SWEEP_CONTROL), function (c) { return !c.closest('.gk-gui-stuff-save-reason'); });
    return first ? (first.closest('.gk-gui-stuff-mount, .gk-gui-stuff-inline-edit') || first) : null;
  }
  // gap: from the control's end side to the bar; from: from the rail's start edge to the control's end side
  function sweepPlace(rail, bar, ctl) {
    var cs = window.getComputedStyle(rail), rtl = cs.direction === 'rtl', box = rail.getBoundingClientRect(), b = bar.getBoundingClientRect();
    var c = ctl && ctl.getClientRects().length ? ctl.getBoundingClientRect() : null;
    var edge = c ? (rtl ? c.left : c.right) : (rtl ? box.right : box.left);
    return { gap: rtl ? edge - b.right : b.left - edge,
             from: Math.max(0, (rtl ? box.right - edge : edge - box.left) - (parseFloat(cs.borderInlineStartWidth) || 0)) };
  }
  function sweepEnd(s) {
    clearTimeout(s.timer);
    s.gone = true;
    s.line.remove();
    if (s.rail._gkGuiSweep === s) s.rail._gkGuiSweep = null;
  }
  function sweepShrink(s) {
    s.line.setAttribute('data-gk-gui-sweep', s.answer);
    s.line.setAttribute('data-gk-gui-sweep-step', 'shrink');
    s.timer = setTimeout(function () { sweepEnd(s); }, SWEEP_SHRINK);
  }
  // how: 'always' whatever the setting and the distance (an example), 'never', else the setting and the distance decide
  function sweepStart(rail, control, how) {
    if (rail._gkGuiSweep) sweepEnd(rail._gkGuiSweep);
    var K = window.GkGui, bar = rail.querySelector(':scope > .gk-gui-stuff-rail-bar');
    if (!bar || how === 'never' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return null;
    if (how !== 'always' && !(K.on && K.on('save_sweep'))) return null;
    var place = sweepPlace(rail, bar, control || sweepControl(rail));
    if (how !== 'always' && place.gap <= SWEEP_OVER) return null;
    var line = document.createElement('span');
    line.className = 'gk-gui-stuff-rail-sweep';
    line.setAttribute('aria-hidden', 'true');
    line.setAttribute('data-gk-gui-sweep', 'changed');
    line.style.setProperty('--gk-gui-sweep-from', place.from + 'px');
    rail.insertBefore(line, bar);
    var s = rail._gkGuiSweep = { rail: rail, line: line, grown: false, answer: null, gone: false, timer: null };
    void line.offsetWidth; // the start is laid out, so that the growth has something to go from
    line.setAttribute('data-gk-gui-sweep-step', 'grow');
    s.timer = setTimeout(function () {
      s.grown = true;
      if (s.answer) sweepShrink(s);
    }, SWEEP_GROW);
    return s;
  }
  // the answer: at once when the line has got there, else when it does; an answer to a save that a newer one on the
  // same rail has taken over changes nothing
  function sweepAnswer(s, state) {
    if (!s || s.gone) return;
    s.answer = state;
    if (s.grown) sweepShrink(s);
  }
  // rehearse(rail, {answer, delay, control, sweep, flip}): the rail and its sweep with a made-up answer after delay ms
  // (1000 by default), so that a slow, a good and a failed answer can be seen on any rail: nothing is sent or saved,
  // and nothing else on the page hears of it. answer: 'saved' (the default) or 'failed'. sweep: 'always' or 'never',
  // without it the setting and the distance decide as for a real save. flip: true turns the row's switch as a press
  // would, back again when the answer is failed. Answers a promise of the answer.
  function rehearse(rail, o) {
    o = o || {};
    var answer = o.answer === 'failed' ? 'failed' : 'saved', delay = o.delay == null ? 1000 : o.delay;
    var ctl = o.control || sweepControl(rail);
    var sw = o.flip && ctl ? (ctl.matches('button.gk-gui-stuff-switch') ? ctl : ctl.querySelector('button.gk-gui-stuff-switch')) : null;
    var on = !!sw && sw.getAttribute('aria-checked') !== 'true';
    if (sw) setChecked(sw, on);
    clearTimeout(rail._gkGuiRehearsal);
    setState(rail, 'changed', T.saving);
    var s = sweepStart(rail, ctl, o.sweep);
    return new Promise(function (done) {
      rail._gkGuiRehearsal = setTimeout(function () {
        if (sw && answer === 'failed') setChecked(sw, !on);
        setState(rail, answer, answer === 'failed' ? T.failed : T.saved);
        sweepAnswer(s, answer);
        done(answer);
      }, delay);
    });
  }
  // post(rail, data, undo): data a FormData; undo puts the old value back when it fails
  function post(rail, fd, undo) {
    if (rail.getAttribute('data-gk-gui-save-reason') === '1' && !fd.has('reason')) return askReason(rail, fd, undo);
    var method = rail.getAttribute('data-gk-gui-save-method') || 'PATCH';
    if (method !== 'POST') fd.append('_method', method.toLowerCase());
    setState(rail, 'changed', T.saving);
    var sweep = sweepStart(rail);
    return fetch(rail.getAttribute('data-gk-gui-save-url'), {
      method: 'POST', body: fd, credentials: 'same-origin',
      headers: { 'X-CSRF-Token': token(), 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' }
    }).then(function (r) {
      return r.json().catch(function () { return { ok: r.ok }; }).then(function (j) { if (!r.ok || j.ok === false) throw j; return j; });
    }).then(function (j) {
      setState(rail, 'saved', T.saved);
      sweepAnswer(sweep, 'saved');
      rail.dispatchEvent(new CustomEvent('gk-gui-saved', { bubbles: true, detail: j }));
      return j;
    }, function (j) {
      if (undo) undo();
      setState(rail, 'failed', T.failed);
      sweepAnswer(sweep, 'failed');
      var text = (j && (j.message || (j.errors && j.errors.join(', ')))) || T.failed;
      var K = window.GkGui;
      if (K.notice && K.notice.show) K.notice.show({ level: 'alarm', text: text }); else if (K.notice) K.notice(text);
    });
  }
  // a reason before anything is saved, in the rail's own fly box
  function askReason(rail, fd, undo) {
    var box = rail.querySelector(':scope > .gk-gui-stuff-save-reason');
    if (!box) return post(rail, (fd.append('reason', ''), fd), undo);
    setState(rail, 'changed', null);
    box.hidden = false;
    // a sheet on a narrow screen, the page behind dimmed by the rail's own ::before; a press there is Avbryt
    rail.classList.add('gk-gui-stuff-sheet-open');
    sheetOn(box, function () { done(false); }, false);
    var ta = box.querySelector('textarea');
    ta.focus();
    function done(ok) {
      box.hidden = true;
      rail.classList.remove('gk-gui-stuff-sheet-open');
      sheetOff(box);
      okB.removeEventListener('click', onOk); noB.removeEventListener('click', onNo); box.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown, true);
      if (ok) { fd.append('reason', ta.value); ta.value = ''; post(rail, fd, undo); } else { if (undo) undo(); setState(rail, 'direct', null); }
    }
    var okB = box.querySelector('.gk-gui-stuff-save-reason-ok'), noB = box.querySelector('.gk-gui-stuff-save-reason-cancel');
    function onOk() { if (ta.value.trim() === '') { ta.focus(); return; } done(true); }
    function onNo() { done(false); }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); done(false); } }
    function onDown(e) { if (e.target === rail && narrow()) { e.preventDefault(); done(false); } }
    okB.addEventListener('click', onOk); noB.addEventListener('click', onNo); box.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown, true);
    return null;
  }
  function one(name, value) { var fd = new FormData(); fd.append(name, value); return fd; }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var sub = closest(t, '.gk-gui-stuff-fly-box [type=submit]');
    if (sub && !reasonReady(sub)) { e.preventDefault(); return; }
    var cancel = closest(t, '[data-gk-gui-fly-cancel]');
    if (cancel) {
      var mb = cancel.closest('.gk-gui-stuff-mount > .gk-gui-stuff-mount-box');
      if (mb) { e.preventDefault(); mountClose(mb.parentElement, true); return; }
      var d = cancel.closest('details.gk-gui-stuff-fly');
      if (d) { e.preventDefault(); flyClose(d, true); return; }
      // the Avbryt a sheet was given (a layer's)
      var sh = sheetOf(cancel);
      if (sh && sh.close) { e.preventDefault(); sh.close(); }
      return;
    }
    var lb = closest(t, '[data-gk-gui-layer]');
    if (lb) { if (G.layer) G.layer.from(lb); return; }
    var g = closest(t, '.gk-gui-stuff-group-toggle');
    if (g && G.group) return G.group.toggle(g);
    // a mount's tab and box work also outside a rail; its change needs one
    if (mountClick(t, e)) return;
    var rail = closest(t, '.gk-gui-stuff-rail');
    if (!rail) return;
    var b;
    if ((b = closest(t, 'button.gk-gui-stuff-switch'))) {
      var on = b.getAttribute('aria-checked') !== 'true';
      setChecked(b, on);
      post(rail, one(b.getAttribute('data-gk-gui-save-name'), on ? '1' : '0'), function () { setChecked(b, !on); });
    } else if ((b = closest(t, '.gk-gui-stuff-segment > button'))) {
      var seg = b.parentElement, old = seg.querySelector('[aria-pressed="true"]');
      if (old === b) return;
      var press = function (n) { seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === n ? 'true' : 'false'); }); };
      press(b);
      post(rail, one(seg.getAttribute('data-gk-gui-save-name'), b.value), function () { press(old); });
    } else if ((b = closest(t, 'button.gk-gui-stuff-icon-toggle'))) {
      var p = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', p ? 'true' : 'false');
      post(rail, one(b.getAttribute('data-gk-gui-save-name'), p ? '1' : '0'), function () { b.setAttribute('aria-pressed', p ? 'false' : 'true'); });
    } else if ((b = closest(t, 'button.gk-gui-stuff-round-check'))) {
      var c = b.getAttribute('aria-checked') !== 'true';
      setChecked(b, c);
      post(rail, one(b.getAttribute('data-gk-gui-save-name'), c ? '1' : '0'), function () { setChecked(b, !c); });
    } else if ((b = closest(t, 'button.gk-gui-stuff-inline-value'))) {
      if (G.inline) G.inline.open(rail, b.parentElement);
    } else if ((b = closest(t, 'button.gk-gui-stuff-row-save'))) {
      post(rail, fieldsOf(rail), null).then(function () { b.disabled = true; });
    }
  });
  // A row with its own Spara: its fields wake the button and the rail says changed
  function rowChanged(e) {
    var rail = closest(e.target, '.gk-gui-stuff-rail[data-gk-gui-save-row="1"]');
    if (rail) {
      setState(rail, 'changed', null);
      var b = rail.querySelector('button.gk-gui-stuff-row-save');
      if (b) b.disabled = false;
    }
    formChanged(e);
  }
  document.addEventListener('input', rowChanged);
  document.addEventListener('change', rowChanged);

  // Handtag: drag an item by its handle, or Alt and arrow up or down; the handle saves as what surrounds it:
  // in a rail the new order is posted at once, in an order that waits the items out of their first place get the rail
  // changed and the note names the item that moved (item), and the box's count by its Save counts the list once
  function orderPost(list, before, item) {
    var wrap = list.parentElement;
    if (wrap && wrap.classList.contains('gk-gui-stuff-order-wait')) return orderWait(wrap, list, before, item);
    var rail = list.closest('.gk-gui-stuff-rail');
    var ids = orderNow(list);
    if (!rail || ids.join() === before.join()) return;
    var fd = new FormData();
    ids.forEach(function (id) { fd.append(list.getAttribute('data-gk-gui-save-name'), id); });
    post(rail, fd, function () {
      before.forEach(function (id) { var n = list.querySelector(':scope > [data-gk-gui-id="' + CSS.escape(id) + '"]'); if (n) list.appendChild(n); });
    });
  }
  function orderNow(list) {
    return Array.prototype.map.call(list.querySelectorAll(':scope > .gk-gui-stuff-order-item'), function (n) { return n.getAttribute('data-gk-gui-id'); });
  }
  function orderWait(wrap, list, before, item) {
    if (!('gkGuiFirst' in wrap.dataset)) wrap.dataset.gkGuiFirst = before.join('\n');
    var first = wrap.dataset.gkGuiFirst.split('\n'), moved = false;
    list.querySelectorAll(':scope > .gk-gui-stuff-order-item').forEach(function (n, i) {
      var off = first[i] !== n.getAttribute('data-gk-gui-id');
      n.classList.toggle('gk-gui-stuff-field-changed', off);
      moved = moved || off;
    });
    var note = wrap.querySelector(':scope > .gk-gui-stuff-order-note');
    if (moved) {
      wrap.setAttribute('data-gk-gui-changed', '1');
      if (note && item) {
        var said = T['order_moved_' + wrap.getAttribute('data-gk-gui-order-applies')] || '';
        note.textContent = said.replace('%{name}', item.getAttribute('data-gk-gui-label') || item.textContent.trim()); // gk-r17 P4r: the item is a row of this plugin's own order primitive, its word is shown in the note
      }
    } else wrap.removeAttribute('data-gk-gui-changed');
    if (note) note.hidden = !moved;
    wrap.dispatchEvent(new Event('change', { bubbles: true }));
  }
  document.addEventListener('keydown', function (e) {
    var h = closest(e.target, 'button.gk-gui-stuff-handle');
    if (h && e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      var item = h.closest('.gk-gui-stuff-order-item'), list = item && item.parentElement;
      if (!list) return;
      e.preventDefault();
      var before = orderNow(list);
      if (e.key === 'ArrowUp' && item.previousElementSibling) list.insertBefore(item, item.previousElementSibling);
      else if (e.key === 'ArrowDown' && item.nextElementSibling) list.insertBefore(item.nextElementSibling, item);
      h.focus();
      orderPost(list, before, item);
      return;
    }
    var mb = closest(e.target, '.gk-gui-stuff-mount > .gk-gui-stuff-mount-box');
    if (e.key === 'Escape') {
      if (mb) { e.preventDefault(); e.stopPropagation(); mountClose(mb.parentElement, true); return; }
      var d = closest(e.target, 'details.gk-gui-stuff-fly[open]');
      if (d) { e.preventDefault(); e.stopPropagation(); flyClose(d, true); }
      return;
    }
    // Enter in a box's reason makes the change, Shift and Enter is a new line
    var ta = e.target;
    if (e.key !== 'Enter' || e.shiftKey || !ta || ta.tagName !== 'TEXTAREA' || !ta.closest('.gk-gui-stuff-reason')) return;
    if (mb) { e.preventDefault(); mountOk(mb.parentElement); return; }
    // the reason gives up the focus first, as it does when Spara is pressed with the pointer: the browser says the
    // field's change on blur, so the change is told before the send. Core's warning about unsaved text forgets every
    // text area on a send and asks them again as the page leaves (it blurs them), and a reason that still had the
    // focus would be told changed then, after the send, and stop the page with the question
    var fb = ta.closest('.gk-gui-stuff-fly-box'), send = fb && fb.querySelector('.gk-gui-stuff-fly-buttons [type=submit]');
    if (send) { e.preventDefault(); ta.blur(); send.click(); }
  });
  var drag = null;
  document.addEventListener('pointerdown', function (e) {
    var h = closest(e.target, 'button.gk-gui-stuff-handle');
    var item = h && h.closest('.gk-gui-stuff-order-item');
    if (!item) return;
    e.preventDefault();
    drag = { item: item, list: item.parentElement, before: orderNow(item.parentElement) };
    item.classList.add('gk-gui-stuff-order-moving');
  });
  document.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var over = document.elementFromPoint(e.clientX, e.clientY);
    var target = over && over.closest('.gk-gui-stuff-order-item');
    if (!target || target === drag.item || target.parentElement !== drag.list) return;
    var r = target.getBoundingClientRect();
    drag.list.insertBefore(drag.item, e.clientY < r.top + r.height / 2 ? target : target.nextElementSibling);
  });
  document.addEventListener('pointerup', function () {
    if (!drag) return;
    drag.item.classList.remove('gk-gui-stuff-order-moving');
    orderPost(drag.list, drag.before, drag.item);
    drag = null;
  });

  // ---------------------------------------------------------------- form
  // A GK form (gk_gui_stuff_form_changes): a field changed but not saved has the rail in the role changed beside its
  // row; writing back what stood takes it away. Each box with its own Save says beside it, quietly, how many
  // fields are changed and not saved, then "Sparat" for 3 s that fades in 2 after the save; when the save
  // failed the rails and the text stand again. A box is a fieldset.box or div.box in the form with a Save
  // inside, else the form; its Save is the button marked data-gk-gui-box-save, else its last submit button. The save
  // crosses the reload in the tab's sessionStorage. Fields of a rail on the same page are never part of a box.
  var STASH = 'gk.gui.formSave';
  function valueOf(f) {
    if (f.type === 'checkbox' || f.type === 'radio') return String(f.checked);
    if (f.type === 'select-multiple') {
      return Array.prototype.filter.call(f.options, function (o) { return o.selected; }).map(function (o) { return o.value; }).sort().join('\n');
    }
    return f.value;
  }
  function putValue(f, v) {
    if (v === undefined) return;
    if (f.type === 'checkbox' || f.type === 'radio') f.checked = v === 'true';
    else if (f.type === 'select-multiple') { var want = v.split('\n'); Array.prototype.forEach.call(f.options, function (o) { o.selected = want.indexOf(o.value) >= 0; }); }
    else f.value = v;
    f.dispatchEvent(new Event('change', { bubbles: true }));
  }
  // a reason goes with the save and is no change of its own; GK Icons' picker turns its field into a hidden one, and what
  // a person chooses there counts as in any other field
  function counted(f) { return f.name && (f.hasAttribute('data-gk-icons-picker') || !/^(hidden|submit|button|reset|image)$/.test(f.type)) && !f.closest('.gk-gui-stuff-rail, .gk-gui-stuff-reason'); }
  function boxOf(el) {
    var form = el.form || el.closest('form'), b = el.closest('fieldset.box, div.box');
    while (b && form.contains(b) && b !== form) {
      if (b.querySelector('[type=submit]')) return b;
      b = b.parentElement && b.parentElement.closest('fieldset.box, div.box');
    }
    return form;
  }
  function formOf(box) { return box.tagName === 'FORM' ? box : box.closest('form'); }
  function boxFields(box) {
    return Array.prototype.filter.call(formOf(box).querySelectorAll('input[name], select[name], textarea[name]'), function (f) { return counted(f) && boxOf(f) === box; });
  }
  function boxesOf(form) {
    var list = [form];
    form.querySelectorAll('fieldset.box, div.box').forEach(function (b) { if (boxOf(b) === b && list.indexOf(b) < 0) list.push(b); });
    return list;
  }
  function saveOf(box) {
    var own = Array.prototype.filter.call(box.querySelectorAll('[type=submit]'), function (s) { return boxOf(s) === box; });
    return own.filter(function (s) { return s.hasAttribute('data-gk-gui-box-save'); })[0] || own[own.length - 1] || null;
  }
  function statusOf(box) {
    if (box._gkGuiStatus) return box._gkGuiStatus;
    var save = saveOf(box);
    if (!save) return null;
    var st = document.createElement('span');
    st.className = 'gk-gui-stuff-form-status';
    st.setAttribute('role', 'status');
    st.setAttribute('aria-live', 'polite');
    // a Save with a reason is a fly or a button in two parts: the text after all of it
    (save.closest('.gk-gui-stuff-btn-split, details.gk-gui-stuff-fly') || save).insertAdjacentElement('afterend', st);
    box._gkGuiStatus = st;
    return st;
  }
  // a field's place in its form, so that a name used by several fields (a radio group, a list and its blank) is told apart
  function fieldKey(f) {
    var same = Array.prototype.filter.call(f.form.elements, function (x) { return x.name === f.name; });
    return f.name + '\u0000' + same.indexOf(f);
  }
  function markField(f) {
    f._gkGuiChanged = valueOf(f) !== f.dataset.gkGuiFirst;
    var row = f.closest('p, tr, .gk-gui-stuff-field') || f;
    var on = row === f ? f._gkGuiChanged : Array.prototype.some.call(row.querySelectorAll('input[name], select[name], textarea[name]'), function (x) { return x._gkGuiChanged; });
    row.classList.toggle('gk-gui-stuff-field-changed', on);
  }
  // the text by the box's Save: the fields changed and not saved, counted by name (a radio group or a list counts once);
  // an order that waits or a row editor's list that has moved (data-gk-gui-changed) counts once
  function recount(box) {
    var st = statusOf(box);
    if (!st) return;
    var names = {};
    boxFields(box).forEach(function (f) { if (f._gkGuiChanged) names[f.name] = 1; });
    formOf(box).querySelectorAll('[data-gk-gui-changed="1"]').forEach(function (w, i) { if (boxOf(w) === box) names['\u0000order' + i] = 1; });
    var n = Object.keys(names).length;
    clearTimeout(box._gkGuiTimer);
    st.classList.remove('gk-gui-stuff-form-status-saved', 'gk-gui-stuff-form-status-on');
    st.textContent = n === 0 ? '' : n === 1 ? T.changes_one : T.changes_other.replace('%{count}', n);
  }
  function formChanged(e) {
    var f = e.target;
    // an order that waits, or a row editor's list, says that its order changed
    if (f && f.nodeType === 1 && (f.hasAttribute('data-gk-gui-order-applies') || f.hasAttribute('data-gk-gui-rows'))) {
      if (f.closest('form[data-gk-gui-save-form]')) recount(boxOf(f));
      return;
    }
    var form = f && f.form;
    if (!form || !form.hasAttribute('data-gk-gui-save-form') || !counted(f) || !('gkGuiFirst' in f.dataset)) return;
    // a radio that is no longer chosen says nothing itself: its group is read again
    var group = f.type === 'radio' ? Array.prototype.filter.call(form.elements, function (x) { return x.name === f.name && 'gkGuiFirst' in x.dataset; }) : [f];
    group.forEach(markField);
    recount(boxOf(f));
  }
  function formsFirst(root) {
    root.querySelectorAll('form[data-gk-gui-save-form] input[name], form[data-gk-gui-save-form] select[name], form[data-gk-gui-save-form] textarea[name]').forEach(function (f) {
      if ('gkGuiFirst' in f.dataset) return;
      f.dataset.gkGuiFirst = valueOf(f);
    });
    root.querySelectorAll('form[data-gk-gui-save-form]').forEach(function (form) { boxesOf(form).forEach(statusOf); });
  }
  function formKey(form) {
    var all = Array.prototype.slice.call(document.querySelectorAll('form[data-gk-gui-save-form]'));
    return (form.getAttribute('action') || '') + '#' + (form.id || all.indexOf(form));
  }
  // the box being saved, what stood and what was written in its changed fields, for the page after the reload
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (e.defaultPrevented || !form || !form.hasAttribute || !form.hasAttribute('data-gk-gui-save-form')) return;
    var box = e.submitter && form.contains(e.submitter) ? boxOf(e.submitter) : form, first = {}, now = {};
    boxFields(box).forEach(function (f) { if (f._gkGuiChanged) { var k = fieldKey(f); first[k] = f.dataset.gkGuiFirst; now[k] = valueOf(f); } });
    try {
      window.sessionStorage.setItem(STASH, JSON.stringify({ key: formKey(form), box: boxesOf(form).indexOf(box), first: first, now: now, at: Date.now() }));
    } catch (err) { /* no memory: the page says nothing after the save */ }
  });
  // after the reload: "Sparat" by the box's Save, or, when core's error box or the error notice is on the page, the
  // written values back where the page lost them, and the rails and the text again
  function formsAfterSave() {
    var s = null;
    try { s = JSON.parse(window.sessionStorage.getItem(STASH) || 'null'); window.sessionStorage.removeItem(STASH); } catch (err) { s = null; }
    if (!s || !(Date.now() - s.at < 120000)) return;
    var form = Array.prototype.find.call(document.querySelectorAll('form[data-gk-gui-save-form]'), function (f) { return formKey(f) === s.key; });
    if (!form) return;
    var box = boxesOf(form)[s.box] || form;
    if (!document.querySelector('#errorExplanation:not(.gk-gui-stuff-sg-still *, [inert] *), #flash_error:not(.gk-gui-stuff-sg-still *, [inert] *)')) {
      var st = statusOf(box);
      if (!st) return;
      st.textContent = T.form_saved;
      st.classList.add('gk-gui-stuff-form-status-saved', 'gk-gui-stuff-form-status-on');
      box._gkGuiTimer = setTimeout(function () { st.classList.remove('gk-gui-stuff-form-status-on'); }, 3000);
      return;
    }
    boxFields(box).forEach(function (f) {
      var k = fieldKey(f);
      if (!(k in s.first)) return;
      if (valueOf(f) === s.first[k]) putValue(f, s.now[k]);
      f.dataset.gkGuiFirst = s.first[k];
      markField(f);
    });
    recount(box);
  }

  G.save = { set: setState, post: post, rehearse: rehearse, formRecount: recount };

  // ---------------------------------------------------------------- roles
  // The class of a role, as primitives.rb's role_class: a category 1 to 12, an alert level, admin, muted, choice, a
  // band or the line's next and now; '' for none. The pill, the icon button, the count and the group are in
  // gk_gui_stuff_parts.js
  function roleClass(role) {
    var r = role == null ? '' : String(role);
    if (/^(?:[1-9]|1[0-2])$/.test(r)) return 'gk-gui-stuff-cat-' + r;
    if (/^(?:tip|info|notice|warning|alarm|critical)$/.test(r)) return 'gk-gui-stuff-alert-' + r;
    r = r.replace(/_/g, '-');
    if (/^(?:admin|muted|choice|effect|line-next|line-now|band-(?:incoming|active|settled|closed|archived))$/.test(r)) return 'gk-gui-stuff-role-' + r;
    return '';
  }
  G.roleClass = roleClass;

  // ---------------------------------------------------------------- the pass
  function pass(root) { if (G.group) G.group.first(root || document); formsFirst(root || document); }
  function start() {
    pass(document);
    formsAfterSave();
    if (window.GkGui.onContent) window.GkGui.onContent(pass);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start, 0);
})();
