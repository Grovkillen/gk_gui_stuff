// gk_gui_stuff: the client side of the choices' primitives (choice_list.rb). Loaded on every page with the primitives,
// before the kernel. Events are taken at the document, so content that comes later needs no pass. Plain DOM, no jQuery,
// and nothing put on window.GkGui.
//   the choice list (gk_gui_stuff_choice_list): the whole row is a press surface. A press on the row that is not on
//   its choice, its word or anything else that acts by itself presses the row's choice, so that the choice changes
//   and says so (change) as when it is pressed itself; a choice that cannot be changed is left alone. Both modes.
//   A press anywhere inside a popover that stands in the row is left to the popover.
//   the writing box (gk_gui_stuff_compose): the counter of characters under the text field, hidden until 80 per cent
//   of the field's longest length is used; then it says how many of how many, in the words the server gave it.
(function () {
  'use strict';
  // what acts by itself when pressed: never taken over by the row
  var OWN = 'a, button, input, label, select, textarea, summary';

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var row = t.closest('.gk-gui-stuff-choice-list-row');
    if (!row || t.closest(OWN)) return;
    // a popover that stands in the row is not the row: a press on its text or its empty space is left to it
    var box = t.closest('details.gk-gui-stuff-popover');
    if (box && row.contains(box)) return;
    var choice = row.querySelector(':scope > .gk-gui-stuff-choice-list-input');
    if (choice && !choice.disabled) choice.click();
  });

  // the counter of the text field's form: hidden below 80 per cent of the longest length, else the words with the
  // count and the longest length filled in
  function count(field) {
    var form = field.form, out = form ? form.querySelector('.gk-gui-stuff-compose-count') : null;
    var max = field.maxLength;
    if (!out || !(max > 0)) return;
    var used = field.value.length;
    if (used < Math.ceil(max * 0.8)) { out.hidden = true; out.textContent = ''; return; }
    out.textContent = (out.getAttribute('data-gk-gui-compose-count') || '').replace('%{count}', String(used)).replace('%{max}', String(max));
    out.hidden = false;
  }
  var FIELD = 'textarea.gk-gui-stuff-compose-text[maxlength]';
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t && t.matches && t.matches(FIELD)) count(t);
  });
  // a form put back to its start (reset) puts the counter back too, once the fields have their values again
  document.addEventListener('reset', function (e) {
    var form = e.target;
    if (!form || !form.querySelectorAll) return;
    window.setTimeout(function () { form.querySelectorAll(FIELD).forEach(count); }, 0);
  });
})();
