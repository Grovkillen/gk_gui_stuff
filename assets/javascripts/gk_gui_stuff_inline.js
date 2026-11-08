// gk_gui_stuff: Redigera på plats (gk_gui_stuff_inline_edit), loaded on every page after the primitives, which
// hand it a click on the value (GkGui.inline.open) and give it GkGui.save and GkGui.sheet. Plain DOM, no jQuery.
//   GkGui.inline.open(rail, span)    the value becomes a field with the buttons the server wrote for its reason mode
// The value becomes a field with the buttons of its mode (a template the server wrote): Av Spara and Avbryt;
// Valfritt [ Spara | ✎ ] and Avbryt, Spara saving at once with an empty reason and the pen opening the box; Krävs
// "Spara…" and Avbryt, Spara… opening the box. The box (its Spara and Avbryt, the reason under them) lies under the field, a
// sheet on a narrow screen; its Spara saves with the reason, a blank required reason is refused in the box. Enter in
// the field is the first button, Esc puts the value back; empty, core's word for none, quiet. What was written in the
// reason stays while the field is open.
(function () {
  var G = window.GkGui = window.GkGui || {};

  function open(rail, box) {
    if (box._gkGuiOpen) return;
    var val = box.getAttribute('data-gk-gui-value') || '', shown = box.querySelector(':scope > .gk-gui-stuff-inline-value');
    var mode = box.getAttribute('data-gk-gui-reason') || 'off';
    var btnTpl = box.querySelector(':scope > template.gk-gui-stuff-inline-buttons-tpl'), boxTpl = box.querySelector(':scope > template.gk-gui-stuff-inline-tpl');
    if (!shown || !btnTpl) return;
    box._gkGuiOpen = true;
    function paint(text) {
      var empty = text.trim() === '';
      shown.textContent = empty ? (box.getAttribute('data-gk-gui-none') || '') : text;
      shown.classList.toggle('gk-gui-stuff-inline-empty', empty);
      shown.setAttribute('aria-label', (box.getAttribute('data-gk-gui-label') || '') + ': ' + shown.textContent);
    }
    var input = document.createElement('input');
    input.type = 'text'; input.value = val; input.setAttribute('aria-label', box.getAttribute('data-gk-gui-label') || '');
    var buttons = document.createElement('span');
    buttons.className = 'gk-gui-stuff-inline-buttons';
    buttons.appendChild(btnTpl.content.cloneNode(true));
    var reasonBox = null;
    shown.hidden = true;
    box.append(input, buttons);
    input.focus(); input.select();
    function boxOpen() {
      if (!boxTpl) return;
      if (!reasonBox) {
        box.appendChild(boxTpl.content.cloneNode(true));
        reasonBox = box.querySelector(':scope > .gk-gui-stuff-mount-box');
      }
      reasonBox.hidden = false;
      box.classList.add('gk-gui-stuff-sheet-open');
      if (G.sheet) G.sheet.on(reasonBox, function () { boxClose(true); }, false);
      var ta = reasonBox.querySelector('textarea');
      if (ta) ta.focus({ preventScroll: true });
    }
    function boxClose(refocus) {
      if (!reasonBox || reasonBox.hidden) return;
      reasonBox.hidden = true;
      box.classList.remove('gk-gui-stuff-sheet-open');
      if (G.sheet) G.sheet.off(reasonBox);
      if (refocus) input.focus({ preventScroll: true });
    }
    function close(text) {
      boxClose(false);
      input.remove(); buttons.remove();
      if (reasonBox) { reasonBox.remove(); reasonBox = null; }
      box._gkGuiOpen = false;
      paint(text); shown.hidden = false; shown.focus();
    }
    // reason null: no reason of its own (Av)
    function save(reason) {
      var v = input.value;
      if (v === val) return close(val);
      box.setAttribute('data-gk-gui-value', v);
      close(v);
      var fd = new FormData();
      fd.append(box.getAttribute('data-gk-gui-save-name'), v);
      if (reason !== null) fd.append('reason', reason);
      if (G.save) G.save.post(rail, fd, function () { box.setAttribute('data-gk-gui-value', val); paint(val); });
    }
    function boxOk() {
      var ta = reasonBox && reasonBox.querySelector('textarea'), text = ta ? ta.value.trim() : '';
      if (mode === 'required' && text === '') {
        var err = ta.closest('.gk-gui-stuff-reason').querySelector('.gk-gui-stuff-reason-error');
        if (err) err.hidden = false;
        ta.setAttribute('aria-invalid', 'true');
        ta.focus();
        return;
      }
      save(text);
    }
    // the first button: Spara (Av, and Valfritt with an empty reason), or Spara… (Krävs: the box first)
    function first() { if (mode === 'required') boxOpen(); else save(mode === 'off' ? null : ''); }
    box._gkGuiClick = function (e) {
      var t = e.target;
      if (reasonBox && reasonBox.contains(t)) {
        if (t.closest('.gk-gui-stuff-inline-box-ok')) { e.stopPropagation(); boxOk(); } else if (t.closest('[data-gk-gui-fly-cancel]')) { e.stopPropagation(); boxClose(true); }
        return;
      }
      if (t.closest('.gk-gui-stuff-inline-ok')) { e.stopPropagation(); first(); } else if (t.closest('.gk-gui-stuff-inline-pen')) { e.stopPropagation(); if (reasonBox && !reasonBox.hidden) boxClose(true); else boxOpen(); } else if (t.closest('.gk-gui-stuff-inline-cancel')) { e.stopPropagation(); close(val); }
    };
    box._gkGuiKey = function (e) {
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        if (reasonBox && !reasonBox.hidden && reasonBox.contains(e.target)) boxClose(true); else close(val);
      } else if (e.key === 'Enter' && e.target === input) {
        e.preventDefault(); first();
      } else if (e.key === 'Enter' && !e.shiftKey && reasonBox && e.target.tagName === 'TEXTAREA' && reasonBox.contains(e.target)) {
        e.preventDefault(); boxOk();
      }
    };
    // a press outside the field and its box closes the box (the value stays open); a press on the sheet's dim does too
    box._gkGuiDown = function (e) {
      if (reasonBox && !reasonBox.hidden && (!box.contains(e.target) || e.target === box)) boxClose(false);
    };
  }
  document.addEventListener('click', function (e) {
    var box = e.target.closest && e.target.closest('.gk-gui-stuff-inline-edit');
    if (box && box._gkGuiOpen && box._gkGuiClick) box._gkGuiClick(e);
  }, true);
  document.addEventListener('keydown', function (e) {
    var box = e.target.closest && e.target.closest('.gk-gui-stuff-inline-edit');
    if (box && box._gkGuiOpen && box._gkGuiKey) box._gkGuiKey(e);
  }, true);
  document.addEventListener('mousedown', function (e) {
    document.querySelectorAll('.gk-gui-stuff-inline-edit.gk-gui-stuff-sheet-open').forEach(function (b) { if (b._gkGuiDown) b._gkGuiDown(e); });
  }, true);
  G.inline = { open: open };
})();
