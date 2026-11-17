// gk_gui_stuff: the form pages Administration > Utseende and Administration > Funktioner (form.gk-gui-stuff-form-page,
// gk_gui_stuff_form_page_helper.rb), and the search of My account > Appearance. The form is a GK form (gk_gui_stuff_form_changes): the primitives mark a changed
// field's row with the rail and keep what stood before. Here, on top of that:
//   the count by Spara is of rows, not fields, and stands last in the bar at the bottom, after the buttons;
//   a row whose level changed says "var: <level>" in its name cell;
//   a row's values show while its level is not off, and a fold of a table value opens when something in it changes;
//   each group's heading counts the rows that are on;
//   the fill links (data-gk-gui-fill, in core's div.contextual with data-gk-gui-form naming the form) set the levels
//   the form's data names, and save nothing;
//   Ångra alla puts every field back as it stood;
//   the box of Spara's reason lists the changes as the values in the mode changes (GkGui.values), one row per level and
//   per value, the old struck through and the new after an arrow;
//   a row that needs another (data-gk-gui-requires) asks, in a popover at its name, whether to switch on both;
//   the search keeps the rows whose name, description, plugin, key or English name has every word, and the groups
//   with a hit; a folded group with a hit opens while the search lasts, and an empty box puts the groups back as they
//   stood;
//   leaving the page with changes not saved makes the browser ask (not on the form's own Spara);
//   a row with a warning (data-gk-gui-warning) shows the sharper text while the field data-gk-gui-sharp-field holds
//   the line data-gk-gui-sharp-includes, and the box of Spara's reason lists the warning of a row that went on or
//   turned sharp, before the row's change;
//   Spara does not send while a row that needs a reason in its sharp state (data-gk-gui-reason-sharp) stands on and
//   sharp without one: the reason's box opens with its error; and the first Spara after a warned row went on opens the
//   reason's box instead of sending, once, so that the warning in it is read;
//   while the page's place for reasons is off, Spara opens the same box with the changes and the warnings and no field
//   for a reason; a row that needs a reason in its sharp state always asks, so the box then carries the field hidden
//   (.gk-gui-stuff-form-page-sharp-reason), and it is shown, required and sent only while such a row stands changed,
//   on and sharp;
//   a box at the top of the form, outside the table (.gk-gui-stuff-form-page-lead, gk_gui_stuff_form_page_lead), is a
//   row like any other: the rail when its choice changed, "var:" with the choice's own word, and counted by Spara;
//   a box at the top whose choices lock the rows under it (data-gk-gui-lead-locks: the values that do, as JSON)
//   switches the rows' choices that follow it (data-gk-gui-follows-lead: the box's field name) off and on at once, and the line over the
//   table (in the place the box names, data-gk-gui-lead-line) says the choice that locks, in its own words
//   (data-gk-gui-lock-unsaved) while that choice is not the one the page was read with; a row changed and then locked goes back to what
//   stood, since nothing of a switched off choice is sent, and gets what was chosen back when the rows open again;
//   a form that only shows how the page works (data-gk-gui-example, the style guide) is never sent and never makes
//   the browser ask on leaving;
//   the flags under Visa of the flag's icons follow the form's pickers before anything is saved.
// Plain DOM, no jQuery.
(function () {
  var G = window.GkGui = window.GkGui || {};
  var T = {};
  try { T = JSON.parse((document.getElementById('gk-gui-stuff-primitives-texts') || {}).textContent || '{}'); } catch (e) { T = {}; }
  var FIELDS = 'input[name], select[name], textarea[name]';

  function json(el, name) { try { return JSON.parse(el.getAttribute(name) || '{}'); } catch (e) { return {}; } }
  function fill(text, vals) { return String(text || '').replace(/%\{(\w+)\}/g, function (m, k) { return k in vals ? vals[k] : m; }); }
  function norm(s) { return String(s || '').toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  function searchWords(q) { return norm(q).split(' ').filter(Boolean); }
  function searchHit(row, words) {
    var text = norm(row.getAttribute('data-gk-gui-search'));
    return words.every(function (w) { return text.indexOf(w) >= 0; });
  }
  function isOff(v) { return v === 'off' || v === '0'; }
  // a row: a row of the page's table, or the box at the top of the form
  var ROW = 'tr.gk-gui-stuff-form-page-row, .gk-gui-stuff-form-page-lead';
  function isLead(row) { return row.classList.contains('gk-gui-stuff-form-page-lead'); }
  function rowsOf(form) { return Array.prototype.slice.call(form.querySelectorAll(ROW)); }
  // the radio buttons of a row's level: the row's own (bare in its cell or in the choice's label), not those of a
  // value under it
  function levelRadios(row) {
    var sel = isLead(row) ? ':scope > .gk-gui-stuff-form-page-lead-choices > label.gk-gui-stuff-form-page-choice > input[type=radio]'
                          : ':scope > td > input[type=radio], :scope > td > label.gk-gui-stuff-form-page-choice > input[type=radio]'; // gk-r17 P2r: the row and its cells are this plugin's own form page, not core's
    return Array.prototype.filter.call(row.querySelectorAll(sel), function (r) { return !!r.name; });
  }
  function levelNow(row) { var c = levelRadios(row).filter(function (r) { return r.checked; })[0]; return c ? c.value : null; }
  // the level that stood when the page was read (the primitives keep it, also after a refused save)
  function levelFirst(row) { var c = levelRadios(row).filter(function (r) { return r.dataset.gkGuiFirst === 'true'; })[0]; return c ? c.value : levelNow(row); }
  // a level's word: the choice's own (data-gk-gui-word, the box at the top, whose words are not the columns'), else
  // the column's, from the form's words
  function levelWord(row, value, modes) {
    var r = levelRadios(row).filter(function (x) { return x.value === value; })[0];
    return (r && r.getAttribute('data-gk-gui-word')) || modes[value] || '';
  }
  function changed(f) { return !!f._gkGuiChanged; }
  function rowChanged(row) { return Array.prototype.some.call(row.querySelectorAll(FIELDS), changed); }
  function onNow(row) { var v = levelNow(row); return !!v && !isOff(v); }
  function warned(row) { return row.hasAttribute('data-gk-gui-warning'); }
  // the row's sharp state: the lines of its sharp field hold the entry; first: as the field stood when the page was read
  function sharp(row, first) {
    var name = row.getAttribute('data-gk-gui-sharp-field'), entry = row.getAttribute('data-gk-gui-sharp-includes');
    var f = name && entry !== null ? row.querySelector('[name="' + CSS.escape(name) + '"]') : null;
    if (!f) return false;
    var text = first && 'gkGuiFirst' in f.dataset ? f.dataset.gkGuiFirst : f.value;
    return String(text || '').split(/\r?\n/).some(function (l) { return l.trim() === entry; });
  }
  // a box at the top whose choices lock the rows under it: the values that do
  function locksOf(row) {
    if (!isLead(row) || !row.hasAttribute('data-gk-gui-lead-locks')) return null;
    try { var l = JSON.parse(row.getAttribute('data-gk-gui-lead-locks')); return Array.isArray(l) ? l.map(String) : null; } catch (e) { return null; }
  }
  // the choices of a row that the box with the field name switches off and on
  function followers(row, name) { return levelRadios(row).filter(function (r) { return r.getAttribute('data-gk-gui-follows-lead') === name; }); }
  function warningText(row) {
    return (sharp(row, false) && row.getAttribute('data-gk-gui-warning-sharp')) || row.getAttribute('data-gk-gui-warning') || '';
  }

  function Page(form) {
    this.form = form;
    this.fills = json(form, 'data-gk-gui-fills');
    this.words = json(form, 'data-gk-gui-words');
    this.bar = form.querySelector('.gk-gui-stuff-form-page-bar');
    this.sending = false;
    // a form page that only shows how it works (data-gk-gui-example, the style guide): never sent, never asks on leaving
    this.example = form.hasAttribute('data-gk-gui-example');
    var self = this;
    // on the document, after the primitives' own listeners: they mark the field first, then the rows are counted
    document.addEventListener('input', function (e) { if (form.contains(e.target)) self.after(e); });
    document.addEventListener('change', function (e) { if (form.contains(e.target)) self.after(e); });
    form.addEventListener('click', function (e) { self.click(e); });
    // the fill links stand in core's div.contextual beside the heading, outside the form; they name it
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-gk-gui-fill][data-gk-gui-form]');
      if (b && !form.contains(b) && b.getAttribute('data-gk-gui-form') === form.id) self.click(e);
    });
    // core marks a form sent (data-submitted) and refuses the next send, also when this one was stopped here; a send
    // stopped here takes the mark away again once core's handler has run, so that the box's Spara sends
    var stop = function (e) { e.preventDefault(); setTimeout(function () { form.removeAttribute('data-submitted'); }, 0); };
    // nothing changed: nothing is sent, and the bar says so
    form.addEventListener('submit', function (e) {
      // an example never sends anything
      if (self.example) { stop(e); return; }
      if (!self.count()) {
        stop(e);
        if (self.status) {
          self.status.classList.remove('gk-gui-stuff-form-status-saved', 'gk-gui-stuff-form-status-on');
          self.status.textContent = self.words.nothing || '';
        }
        return;
      }
      if (self.gate()) { stop(e); return; }
      self.sending = true;
    });
    // whether the reason's box in the bar has been opened since the page was read (toggle does not bubble)
    if (this.bar) this.bar.addEventListener('toggle', function (e) { if (e.target.open) self.boxSeen = true; }, true);
    var search = form.querySelector('.gk-gui-stuff-form-page-search');
    if (search) {
      search.addEventListener('input', function () { self.search(search.value); });
      // Enter in the search searches; it never sends the form
      search.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
    }
    window.addEventListener('beforeunload', function (e) {
      if (self.example || self.sending || !self.count()) return;
      e.preventDefault();
      e.returnValue = '';
    });
    // the primitives mark the fields and put back what a refused save lost when the page is read; then the count
    setTimeout(function () {
      self.placeStatus();
      // a box that locks: the rows as its choice stands now (a refused save may have put another choice back)
      rowsOf(form).forEach(function (row) { if (locksOf(row)) self.lock(row); });
      rowsOf(form).forEach(function (row) { row._gkGuiPrev = levelNow(row); self.level(row, null); });
      self.all();
    }, 0);
  }

  // the text of the count, made by the primitives beside Spara, last in the bar: the buttons never move when it comes
  Page.prototype.placeStatus = function () {
    var st = this.form.querySelector('.gk-gui-stuff-form-status');
    if (st && this.bar && this.bar.lastChild !== st) this.bar.appendChild(st);
    this.status = st;
  };

  Page.prototype.count = function () {
    return rowsOf(this.form).filter(rowChanged).length;
  };

  Page.prototype.after = function (e) {
    var t = e.target;
    if (!t || !t.name) return;
    var row = t.closest(ROW);
    if (row) {
      var d = t.closest('details.gk-gui-stuff-form-page-details');
      if (d && changed(t)) d.open = true;
      if (t.type === 'radio' && levelRadios(row).indexOf(t) >= 0 && e.type === 'change') {
        this.level(row, t);
        if (locksOf(row)) this.lock(row);
      }
      this.warn(row);
    }
    this.all();
  };

  // a row's warning: the sharper text while the row is sharp, else the plain one
  Page.prototype.warn = function (row) {
    if (!warned(row)) return;
    var t = row.querySelector('.gk-gui-stuff-form-page-warning-text');
    if (t) t.textContent = warningText(row);
  };

  // the reason's box in the bar: the pen of an optional reason, or the popover of a required one
  Page.prototype.reasonBox = function () {
    return this.bar ? this.bar.querySelector('details.gk-gui-stuff-btn-split-pen, details.gk-gui-stuff-popover') : null;
  };

  // before sending: a row that needs a reason in its sharp state and has none opens the box with its error; a warned
  // row that went on opens the box once, if it has not been opened, so that the warning in it is read. True: wait.
  Page.prototype.gate = function () {
    var box = this.reasonBox(), rows = rowsOf(this.form);
    if (!box) return false;
    var ta = box.querySelector('.gk-gui-stuff-reason textarea');
    var given = !!ta && !ta.disabled && ta.value.trim() !== '';
    if (this.needReason() && !given) { this.openBox(box, ta, true); return true; }
    var rose = rows.some(function (row) { return warned(row) && rowChanged(row) && onNow(row) && isOff(levelFirst(row) || 'off'); });
    if (rose && !box.open && !this.boxSeen) { this.openBox(box, ta, false); return true; }
    return false;
  };

  // a changed row that is on and sharp, and whose sharp state needs a reason
  Page.prototype.needReason = function () {
    return rowsOf(this.form).some(function (row) {
      return row.getAttribute('data-gk-gui-reason-sharp') === '1' && rowChanged(row) && onNow(row) && sharp(row, false);
    });
  };

  // the reason's box in the bar says what holds: while a reason is needed, the red star in place of the word optional and
  // the text area marked required, as a required reason is drawn; back to optional when none is needed. A box that is
  // required already carries its star.
  Page.prototype.markReason = function () {
    var box = this.reasonBox();
    var head = box && box.querySelector('.gk-gui-stuff-reason-head');
    var word = head && head.querySelector('.gk-gui-stuff-reason-optional-word');
    if (!word) return;
    var need = this.needReason(), ta = box.querySelector('.gk-gui-stuff-reason textarea');
    // the place is off: the field is there only while a sharp row asks, and nothing of it is sent otherwise
    var only = box.querySelector('.gk-gui-stuff-form-page-sharp-reason');
    if (only) {
      only.hidden = !need;
      if (ta) ta.disabled = !need;
    }
    var star = head.querySelector('[data-gk-gui-sharp-star]');
    if (need && !star) {
      star = document.createElement('span');
      star.className = 'required';
      star.setAttribute('data-gk-gui-sharp-star', '1');
      star.textContent = '*';
      word.parentNode.insertBefore(star, word);
    }
    if (star) star.hidden = !need;
    word.hidden = need;
    if (ta) { if (need) ta.setAttribute('aria-required', 'true'); else ta.removeAttribute('aria-required'); }
  };

  Page.prototype.openBox = function (box, ta, error) {
    this.boxSeen = true;
    // a blank reason in the pen stays off until its box opens; the primitives turn it on with the box, this is at once
    if (ta) ta.disabled = false;
    box.open = true;
    if (!ta) return;
    if (error) {
      var err = ta.closest('.gk-gui-stuff-reason').querySelector('.gk-gui-stuff-reason-error');
      if (err) err.hidden = false;
      ta.setAttribute('aria-invalid', 'true');
    }
    setTimeout(function () { ta.focus({ preventScroll: true }); }, 0);
  };

  // a row's level changed: "var:", its values shown or hidden, and the question when it needs another row
  Page.prototype.level = function (row, radio) {
    var now = levelNow(row), first = levelFirst(row), modes = this.words.modes || {};
    var was = row.querySelector('.gk-gui-stuff-form-page-was');
    if (was) {
      was.hidden = now === first;
      was.textContent = was.hidden ? '' : fill(this.words.was, { was: levelWord(row, first, modes) || first || '' });
    }
    // a shared value has no level: its values always show
    var vals = row.querySelector('.gk-gui-stuff-form-page-values');
    if (vals && levelRadios(row).length) vals.hidden = !now || isOff(now);
    this.warn(row);
    var prev = row._gkGuiPrev;
    row._gkGuiPrev = now;
    if (radio && !this.filling && now && !isOff(now)) this.ask(row, now, prev);
  };

  // a row's level set here, where it is not the one chosen already: the primitives mark it and the row says "var:"
  Page.prototype.put = function (row, value) {
    var r = levelRadios(row).filter(function (x) { return x.value === value; })[0];
    if (!r || r.checked) return;
    r.checked = true;
    r.dispatchEvent(new Event('change', { bubbles: true }));
  };

  // the box at the top locks or opens the rows under it, by its choice now. Locked: a row's choices that follow the
  // box are switched off; a row that stood changed goes back to what stood first, while it can still be set, so it
  // is no change (nothing of a switched off choice is sent), and what was chosen is held. Open: the choices are
  // switched on, and what was held comes back. The line over the table shows the part of the choice that locks, and
  // is gone while none does. Nothing here asks a question.
  Page.prototype.lock = function (lead) {
    var self = this, locks = locksOf(lead) || [], now = levelNow(lead), locked = locks.indexOf(now) >= 0, filling = this.filling;
    var name = (levelRadios(lead)[0] || {}).name || '';
    this.filling = true;
    rowsOf(this.form).forEach(function (row) {
      var radios = isLead(row) ? [] : followers(row, name);
      if (!radios.length) return;
      if (locked && radios.some(function (r) { return !r.disabled; })) {
        var chosen = levelNow(row), first = levelFirst(row);
        row._gkGuiHeld = chosen !== first ? chosen : null;
        if (row._gkGuiHeld) self.put(row, first);
      }
      radios.forEach(function (r) { r.disabled = locked; });
      if (!locked && row._gkGuiHeld) {
        self.put(row, row._gkGuiHeld);
        row._gkGuiHeld = null;
      }
    });
    this.filling = filling;
    // the line's place is named by the box (data-gk-gui-lead-line, its id) and is always in the page; the line in it
    // is shown and hidden
    var place = document.getElementById(lead.getAttribute('data-gk-gui-lead-line') || '');
    var line = place && place.hasAttribute('data-gk-gui-lock-lines') ? place.querySelector('.gk-gui-stuff-form-page-lead-locked') : null;
    if (line) {
      // a choice that locks and is not the one the page was read with has its own words (data-gk-gui-lock-unsaved),
      // where the box gave them: that part is shown in place of the saved one, and the saved one when the choice is
      // the one that stood. What is shown comes into the place that is said to the one who listens
      var fresh = Array.prototype.filter.call(line.querySelectorAll('[data-gk-gui-lock-unsaved]'), function (part) {
        return part.getAttribute('data-gk-gui-lock-unsaved') === now;
      })[0];
      // the one that stood is the choice the server drew as chosen (defaultChecked) and the one the primitives keep
      // as the first: a browser that puts a form's choices back itself when the page is read again changes the
      // second, and a page drawn again with what was sent changes the first, so the choice is saved only when it is
      // both. With no choice drawn as chosen, a choice that locks is never the saved one
      var drawn = levelRadios(lead).filter(function (r) { return r.defaultChecked; })[0];
      var unsaved = locked && !!fresh && (!drawn || now !== drawn.value || now !== levelFirst(lead));
      line.hidden = !locked;
      line.querySelectorAll('[data-gk-gui-lock-line]').forEach(function (part) { part.hidden = unsaved || part.getAttribute('data-gk-gui-lock-line') !== now; });
      line.querySelectorAll('[data-gk-gui-lock-unsaved]').forEach(function (part) { part.hidden = !unsaved || part !== fresh; });
    }
  };

  // what changed in a row's values, one row of the list per value: the setting's name and the value's label
  // (words.value_label), and what stood and what stands in the value's own words: a select's option, Ja or Nej for a
  // flag, a choice's word (data-gk-gui-word), a number or a text as it is. A list (data-gk-gui-value-kind list) says
  // the entries taken out and those put in; a table (data-gk-gui-value-kind table) says only that it changed. A
  // value's block is found by its own mark
  // (data-gk-gui-value-label), never by its text
  Page.prototype.valueRows = function (row, name) {
    var w = this.words, out = [], seen = {}, blocks = [];
    var vals = row.querySelector('.gk-gui-stuff-form-page-values');
    if (!vals) return out;
    function optionText(sel, v) {
      var o = Array.prototype.filter.call(sel.options, function (x) { return x.value === v; })[0];
      return o ? o.textContent.trim() : v;
    }
    // a value that was or is empty is said as core's "(ingen)" (words.none), as the event log says it, so that the
    // box shows both sides of the change
    function say(v) { var s = String(v == null ? '' : v).trim(); return s || w.none || ''; }
    function word(r) { return r ? (r.getAttribute('data-gk-gui-word') || r.value) : ''; }
    vals.querySelectorAll(FIELDS).forEach(function (f) {
      if (!changed(f)) return;
      var block = f.closest('[data-gk-gui-value-label]');
      if (!block || !vals.contains(block)) return;
      var label = fill(w.value_label, { name: name, value: block.getAttribute('data-gk-gui-value-label') });
      var kind = block.getAttribute('data-gk-gui-value-kind');
      if (kind === 'list' && f.tagName === 'TEXTAREA') {
        // a list: the entries taken out struck through, those put in after the arrow, each once in its order
        var lines = function (s) { return String(s || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean); };
        var before = lines(f.dataset.gkGuiFirst), after = lines(f.value);
        var gone = before.filter(function (x) { return after.indexOf(x) < 0; }), come = after.filter(function (x) { return before.indexOf(x) < 0; });
        out.push(gone.length || come.length ? { label: label, from: gone.join(', '), to: come.join(', ') } : { label: label, value: w.values_changed || '' });
        return;
      }
      if (kind) {
        if (blocks.indexOf(block) < 0) { blocks.push(block); out.push({ label: label, value: w.values_changed || '' }); }
        return;
      }
      if (f.type === 'radio') {
        if (seen[f.name]) return;
        seen[f.name] = true;
        var group = Array.prototype.filter.call(block.querySelectorAll('input[type=radio]'), function (r) { return r.name === f.name; });
        var was = group.filter(function (r) { return r.dataset.gkGuiFirst === 'true'; })[0], now = group.filter(function (r) { return r.checked; })[0];
        if (was !== now) out.push({ label: label, from: say(word(was)), to: say(word(now)) });
        return;
      }
      if (f.type === 'checkbox') {
        out.push({ label: label, from: f.dataset.gkGuiFirst === 'true' ? w.yes : w.no, to: f.checked ? w.yes : w.no });
      } else if (f.tagName === 'SELECT') {
        out.push({ label: label, from: say(optionText(f, f.dataset.gkGuiFirst)), to: say(optionText(f, f.value)) });
      } else {
        out.push({ label: label, from: say(f.dataset.gkGuiFirst), to: say(f.value) });
      }
    });
    return out;
  };

  // every row's rail (a change in a value's own table counts for its row), the count, the list in the reason's box
  // and the groups' headings. The list is GK GUI Stuff's values in the mode changes (GkGui.values, the same markup as
  // the event log's): a row for a level that changed, the old struck through, an arrow and the new, and a row for each
  // value that changed
  Page.prototype.all = function () {
    var self = this, warnings = [], rows = [], n = 0, modes = this.words.modes || {};
    rowsOf(this.form).forEach(function (row) {
      var on = rowChanged(row);
      row.classList.toggle('gk-gui-stuff-field-changed', on);
      if (!on) return;
      n++;
      var name = (row.querySelector('.gk-gui-stuff-form-page-name') || {}).textContent || '';
      var now = levelNow(row), first = levelFirst(row), own = [];
      // a warned row that went on, or that is on and turned sharp: its warning first
      if (warned(row) && onNow(row) && (isOff(first || 'off') || (sharp(row, false) && !sharp(row, true)))) warnings.push(warningText(row));
      if (now !== first) own.push({ label: name, from: levelWord(row, first, modes), to: levelWord(row, now, modes) });
      own = own.concat(self.valueRows(row, name));
      // a change the list cannot name is still a row: the setting, and that its values changed
      if (!own.length) own.push({ label: name, value: self.words.values_changed || '' });
      rows = rows.concat(own);
    });
    var st = this.status;
    if (st && !(n === 0 && st.classList.contains('gk-gui-stuff-form-status-saved'))) {
      st.classList.remove('gk-gui-stuff-form-status-saved', 'gk-gui-stuff-form-status-on');
      st.textContent = n === 0 ? '' : n === 1 ? (T.changes_one || '') : fill(T.changes_other, { count: n });
    }
    // the warnings first, each in core's warning box as on its row, with room before the list of the changes
    this.form.querySelectorAll('.gk-gui-stuff-form-page-changes').forEach(function (box) {
      box.textContent = '';
      warnings.forEach(function (text) {
        var w = document.createElement('div'), b = document.createElement('strong');
        w.className = 'flash warning gk-gui-stuff-form-page-change-warning';
        w.setAttribute('role', 'note');
        b.textContent = (self.words.warning || '') + ':';
        w.appendChild(b);
        w.appendChild(document.createTextNode(' ' + text));
        box.appendChild(w);
      });
      if (rows.length) box.appendChild(G.values(rows, 'changes'));
    });
    this.form.querySelectorAll('tbody.gk-gui-stuff-form-page-group').forEach(function (head) {
      var count = head.querySelector('.gk-gui-stuff-count'), body = document.getElementById(head.getAttribute('data-gk-gui-body'));
      var rows = body ? rowsOf(body).filter(function (r) { return levelRadios(r).length > 0; }) : [];
      if (!count || !rows.length) return;
      var on = rows.filter(function (r) { var v = levelNow(r); return v && !isOff(v); }).length;
      count.textContent = fill(self.words.on, { on: on, count: rows.length });
    });
    this.markReason();
  };

  Page.prototype.click = function (e) {
    var b = e.target.closest && e.target.closest('[data-gk-gui-fill], [data-gk-gui-undo-all]');
    if (!b || !(this.form.contains(b) || (this.form.id && b.getAttribute('data-gk-gui-form') === this.form.id))) return;
    e.preventDefault();
    // a fill or an undo asks nothing
    this.filling = true;
    if (b.hasAttribute('data-gk-gui-fill')) this.fillWith(this.fills[b.getAttribute('data-gk-gui-fill')] || {});
    else this.undoAll();
    this.filling = false;
    this.all();
  };

  // a fill link: the radio button named and valued as the target, where it can be chosen; nothing is saved
  Page.prototype.fillWith = function (target) {
    var form = this.form;
    Object.keys(target).forEach(function (name) {
      var r = form.querySelector('input[type=radio][name="' + CSS.escape(name) + '"][value="' + CSS.escape(String(target[name])) + '"]');
      if (!r || r.disabled || r.checked) return;
      r.checked = true;
      r.dispatchEvent(new Event('change', { bubbles: true }));
    });
  };

  // every field back to what stood when the page was read
  Page.prototype.undoAll = function () {
    var back = [];
    // what a locked row held is dropped: it comes back with nothing
    rowsOf(this.form).forEach(function (row) { row._gkGuiHeld = null; });
    this.form.querySelectorAll(FIELDS).forEach(function (f) {
      if (!('gkGuiFirst' in f.dataset)) return;
      var first = f.dataset.gkGuiFirst;
      if (f.type === 'radio' || f.type === 'checkbox') {
        var want = first === 'true';
        if (f.checked !== want) { f.checked = want; back.push(f); }
      } else if (f.value !== first) { f.value = first; back.push(f); }
    });
    // the rows first and the box at the top last: the box may switch the rows' choices off, and they say their change
    // while they are still on
    var inLead = function (f) { return !!f.closest('.gk-gui-stuff-form-page-lead'); };
    back.filter(function (f) { return !inLead(f); }).concat(back.filter(inLead))
        .forEach(function (f) { if (f.type !== 'radio' || f.checked) f.dispatchEvent(new Event('change', { bubbles: true })); });
    this.form.querySelectorAll('details.gk-gui-stuff-form-page-details[open]').forEach(function (d) { d.open = false; });
    this.all();
  };

  // a row that needs other rows on: the question in a popover at the row's name, Ja sets them to the same level (or the
  // nearest one they have), Avbryt or closing puts the row's level back
  Page.prototype.ask = function (row, now, prev) {
    var self = this, need = (row.getAttribute('data-gk-gui-requires') || '').split(/\s+/).filter(Boolean);
    var off = need.map(function (k) { return self.form.querySelector('tr[data-gk-gui-row="' + CSS.escape(k) + '"]'); })
                  .filter(function (r) { return r && levelRadios(r).length && isOff(levelNow(r) || 'off'); });
    var anchor = row.querySelector('.gk-gui-stuff-form-page-name');
    if (!off.length || !anchor) return;
    var name = anchor.textContent, other = off.map(function (r) { return (r.querySelector('.gk-gui-stuff-form-page-name') || {}).textContent || ''; }).join(', ');
    var box = document.createElement('div'), p = document.createElement('p'), btns = document.createElement('div');
    p.textContent = fill(this.words.ask, { name: name, other: other });
    btns.className = 'gk-gui-stuff-popover-buttons';
    var yes = document.createElement('button'), no = document.createElement('button'), agreed = false, popover;
    yes.type = 'button'; yes.textContent = this.words.yes || '';
    no.type = 'button'; no.textContent = this.words.cancel || '';
    btns.appendChild(yes); btns.appendChild(no);
    box.appendChild(p); box.appendChild(btns);
    // setting the other rows, or putting the level back, asks nothing again
    yes.addEventListener('click', function () {
      agreed = true;
      self.filling = true;
      off.forEach(function (r) {
        var radios = levelRadios(r), pick = radios.filter(function (x) { return x.value === now; })[0] || radios.filter(function (x) { return !isOff(x.value); }).pop();
        if (pick && !pick.disabled && !pick.checked) { pick.checked = true; pick.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      self.filling = false;
      self.all();
      if (popover) G.popover.close(popover);
    });
    no.addEventListener('click', function () { if (popover) G.popover.close(popover); });
    popover = G.popover.open(anchor, box, {
      onClose: function () {
        if (agreed) return;
        var r = levelRadios(row).filter(function (x) { return x.value === prev; })[0];
        if (!r || r.checked) return;
        self.filling = true;
        r.checked = true;
        r.dispatchEvent(new Event('change', { bubbles: true }));
        self.filling = false;
      }
    });
  };

  // the search: a row stays when its text has every word; a group's heading stays when a row of it does. A folded group
  // with a hit opens while the search lasts: the fold buttons' states are kept when the search starts, and an empty box
  // puts them back (nothing of this is remembered as the group's own state)
  Page.prototype.search = function (q) {
    var words = searchWords(q), heads = Array.prototype.slice.call(this.form.querySelectorAll('tbody.gk-gui-stuff-form-page-group'));
    function toggle(head) { return head.querySelector('.gk-gui-stuff-group-toggle'); }
    if (words.length && !this.folds) {
      this.folds = heads.map(function (head) { var b = toggle(head); return { button: b, open: !!b && b.getAttribute('aria-expanded') === 'true' }; });
    }
    heads.forEach(function (head) {
      var body = document.getElementById(head.getAttribute('data-gk-gui-body')), any = false;
      if (!body) return;
      rowsOf(body).forEach(function (row) {
        var hit = searchHit(row, words);
        row.hidden = !hit;
        if (hit) any = true;
      });
      head.hidden = !any;
      var b = toggle(head);
      if (words.length && any && b && b.getAttribute('aria-expanded') !== 'true') G.group.set(b, true);
    });
    if (!words.length && this.folds) {
      this.folds.forEach(function (f) { if (f.button) G.group.set(f.button, f.open); });
      this.folds = null;
    }
  };

  // The same search where the rows stand in sections and not in a form (My account > Appearance): a section stays when
  // a row of it does
  function sectionSearch(input) {
    input.addEventListener('input', function () {
      var words = searchWords(input.value);
      document.querySelectorAll('section.gk-gui-stuff-form-page-my').forEach(function (section) {
        var any = !words.length;
        section.querySelectorAll('[data-gk-gui-search]').forEach(function (row) {
          var hit = searchHit(row, words);
          row.hidden = !hit;
          if (hit) any = true;
        });
        section.hidden = !any;
      });
    });
  }

  // The flag's icons (flag_icons.rb): the flags marked data-gk-gui-flag-preview draw what the pickers hold now, by the
  // server's own order: the sort's icon, else the common one, else the pennant. What the server found for the saved
  // names goes with their fields, and a newly picked one is loaded first, for its proportion and so that a picture that
  // does not load is the pennant here too, never an empty mask. Flags on a target lie in the flags' layer, outside the
  // form, so they are looked up in the document
  function flagIcons(form) {
    var fields = {}, known = {}, turn = 0;
    form.querySelectorAll('input[data-gk-gui-flag-icon]').forEach(function (f) {
      fields[f.getAttribute('data-gk-gui-flag-icon')] = f;
      var url = f.getAttribute('data-gk-gui-flag-icon-url');
      if (f.value) known[f.value] = url ? { url: url, w: f.getAttribute('data-gk-gui-flag-icon-w') } : null;
    });
    if (!fields.common) return;
    function load(name, done) {
      if (!name) { done(null); return; }
      if (name in known) { done(known[name]); return; }
      var url = window.GkIcons && window.GkIcons.url ? window.GkIcons.url(name) : null;
      if (!url) { done(null); return; }
      var img = new Image();
      img.onload = function () {
        var r = img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1;
        known[name] = { url: url, w: Math.round(1000 * Math.min(4, Math.max(0.25, r || 1))) / 100 };
        done(known[name]);
      };
      img.onerror = function () { known[name] = null; done(null); };
      img.src = url;
    }
    function draw(sort, icon, own) {
      document.querySelectorAll('[data-gk-gui-flag-preview="' + sort + '"]').forEach(function (n) {
        n.style.setProperty('--gk-gui-flag-mask', icon ? 'url("' + icon.url + '")' : 'initial');
        n.style.setProperty('--gk-gui-flag-clip', icon ? 'none' : 'initial');
        n.style.setProperty('--gk-gui-flag-w', icon ? icon.w + 'px' : 'initial');
        n.style.setProperty('--gk-gui-flag-fill', icon && own ? 'linear-gradient(currentColor, currentColor)' : 'initial');
      });
      G.flag.place();
    }
    form.addEventListener('change', function (e) {
      if (!e.target.hasAttribute || !e.target.hasAttribute('data-gk-gui-flag-icon')) return;
      var mine = ++turn;
      ['fixed', 'new', 'changed', 'gone'].forEach(function (sort) {
        load(fields[sort] ? fields[sort].value : '', function (own) {
          if (own) { if (mine === turn) draw(sort, own, true); return; }
          load(fields.common.value, function (common) { if (mine === turn) draw(sort, common, false); });
        });
      });
    });
  }

  // core's defaultFocus (on jQuery's ready, a turn after this) focuses the first visible text field in #content, and on a
  // long form page that scrolls the page down to it; the page's own search, first on the page, takes the focus instead,
  // without scrolling, so the page stays at its top. As core: not when the address names a place or a field has the focus.
  function stay() {
    if (window.location.hash || document.querySelector('#content :focus')) return;
    var s = document.querySelector('#content form.gk-gui-stuff-form-page .gk-gui-stuff-form-page-search');
    if (s) s.focus({ preventScroll: true });
  }
  // core asks with jQuery's :focus, which only matches while the window itself has the focus (a page opened in a
  // tab behind, or a window without the focus): then core still focuses the far-down field. This script loads after
  // core's, so its own ready callback runs after core's defaultFocus: a field of the form page core focused there goes
  // back to the search, and the page back to where it stood before
  var stood = null;
  function back() {
    var s = document.querySelector('#content form.gk-gui-stuff-form-page .gk-gui-stuff-form-page-search'), a = document.activeElement;
    if (!s || stood === null || window.location.hash || a === s || !a || !a.closest || !a.closest('form.gk-gui-stuff-form-page')) return;
    s.focus({ preventScroll: true });
    window.scrollTo(window.scrollX, stood);
  }
  function start() {
    document.querySelectorAll('form.gk-gui-stuff-form-page').forEach(function (f) { if (!f._gkGuiPage) { f._gkGuiPage = new Page(f); flagIcons(f); } });
    document.querySelectorAll('input.gk-gui-stuff-form-page-search').forEach(function (s) {
      if (s.closest('form.gk-gui-stuff-form-page') || s._gkGuiSearch) return;
      s._gkGuiSearch = true;
      sectionSearch(s);
    });
    stood = window.scrollY;
    stay();
  }
  if (window.jQuery) window.jQuery(back);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
