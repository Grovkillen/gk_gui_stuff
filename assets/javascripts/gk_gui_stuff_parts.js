// gk_gui_stuff: the small primitives a script draws as the server's helpers draw them (primitives.rb, pill.rb), the
// pill, the icon button and the count, the foldable group's button, and the form of a mark's note in its fly. Loaded on every page right after
// gk_gui_stuff_primitives.js (whose GkGui.roleClass it uses and whose click and pass call GkGui.group), before the
// kernel, which keeps what this puts on GkGui. Plain DOM, no jQuery.
//   GkGui.group.set(button, open)                               a fold button's state and words (event gk-gui-group-toggle)
//   GkGui.pill({text, role, typeIcon, typeLabel, count, note, removeLabel, onRemove, disabled, reason, reasonLabel, button, choice,
//               pressed, check, parts, open, dashed, className})
//                                                               a pill as gk_gui_stuff_pill draws it
//   GkGui.choose(buttons, on)                                   a row of choice pills: the one pressed, its check moved
//   GkGui.iconButton({icon, label, fallback, href, onClick, className})  the icon button as gk_gui_stuff_icon_button
//   GkGui.count({n, shared, role, title})                       the count as gk_gui_stuff_count
//   GkGui.effect(element, name)                                 a module's effect mark (data-gk-gui-stuff-effect)
//   GkGui.uneffect(element, name)                               the name taken out of the mark when the effect is gone
(function () {
  var G = window.GkGui = window.GkGui || {};
  var T = {};
  var tEl = document.getElementById('gk-gui-stuff-primitives-texts');
  try { if (tEl) T = JSON.parse(tEl.textContent); } catch (e) { /* no words */ }
  function roleClass(role) { return G.roleClass ? G.roleClass(role) : ''; }
  // the person's own state in the browser (a group's fold), nothing when the browser keeps none
  function store(k, v) {
    try { if (v === undefined) return window.localStorage.getItem('gkguistuff.' + k); window.localStorage.setItem('gkguistuff.' + k, v); } catch (e) { return null; }
    return null;
  }

  // ---------------------------------------------------------------- pill
  // Bricka from a script, the same markup as gk_gui_stuff_pill: the type's icon first (typeIcon, only to read, with
  // "Typ: <typeLabel>" as its tooltip; nothing when no icon can be drawn), the text, a note part ("ny") and an x that is a button. The caller gives every text. The
  // x never takes the focus from the field it stands in.
  // With button ({title, aria, data}) the text is a button, and parts ([{content, title, ariaLabel, aria, data}]) are
  // buttons after it (the sentence's condition); open and dashed as the helper's. choice: true with a
  // button and no parts is a choice in a chooser; pressed (true or false) gives it aria-pressed, true filled with the
  // check, and check: false fills it without the check (the library's chips), as the helper's check: false. count is a
  // number inside the pill after the text, as the helper's count:. className: more classes on the pill (the helper's
  // html: { class: }). disabled on a choice: it cannot be chosen, keeps its focus (aria-disabled) and says its reason
  // (reason, as its tooltip and after the text for a screen reader, with reasonLabel before it); on a pill with
  // onRemove, disabled is its x's
  function attrs(n, b) {
    if (b.title) n.title = b.title;
    if (b.ariaLabel) n.setAttribute('aria-label', b.ariaLabel);
    Object.keys(b.aria || {}).forEach(function (k) { n.setAttribute('aria-' + k, b.aria[k]); });
    Object.keys(b.data || {}).forEach(function (k) { n.setAttribute('data-' + k, b.data[k]); });
  }
  function pillButton(cls, content, b) {
    var n = document.createElement('button');
    n.type = 'button';
    n.className = 'gk-gui-stuff-pill-button ' + cls;
    if (typeof content === 'string') n.textContent = content; else n.appendChild(content);
    attrs(n, b);
    return n;
  }
  // the kernel's icon (GK Icons or core's sprite) when it is there, else nothing
  function icon(name, size) { var K = window.GkGui; return K.icon ? K.icon(name, '', size) : null; }
  // the check of a pressed choice in its own mark, as the helper draws it, so that it is found by its anchor
  function check() {
    var ic = icon('checked', 12);
    if (!ic || ic.nodeType !== 1) return null;
    var s = document.createElement('span');
    s.className = 'gk-gui-stuff-pill-check';
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('data-gk-gui-pill-check', '1');
    s.appendChild(ic);
    return s;
  }
  function pill(o) {
    var p = document.createElement('span'), rc = roleClass(o.role), buttons = !!(o.button || (o.parts && o.parts.length));
    var choice = !!o.choice && !!o.button && !(o.parts && o.parts.length), pressed = choice && o.pressed === true, off = choice && !!o.disabled;
    p.className = 'gk-gui-stuff-pill' + (rc ? ' ' + rc : '') + (buttons ? ' gk-gui-stuff-pill-buttons' : '') + (choice ? ' gk-gui-stuff-pill-choice' : '') +
                  (pressed ? ' gk-gui-stuff-pill-chosen' : '') + (o.open ? ' gk-gui-stuff-pill-open' : '') + (o.dashed ? ' gk-gui-stuff-pill-dashed' : '') +
                  (off ? ' gk-gui-stuff-pill-off' : '') + (o.className ? ' ' + o.className : '');
    if (!buttons) p.title = o.text;
    var inner = document.createDocumentFragment();
    if (pressed && o.check !== false) { var ck = check(); if (ck) inner.appendChild(ck); }
    if (o.typeIcon) {
      var ti = icon(o.typeIcon, 12);
      if (ti && ti.nodeType === 1) {
        var ts = document.createElement('span');
        ts.className = 'gk-gui-stuff-pill-type';
        ts.setAttribute('aria-hidden', 'true');
        if (o.typeLabel) ts.title = (T.pill_type || '%{name}').replace('%{name}', o.typeLabel);
        ts.appendChild(ti);
        inner.appendChild(ts);
      }
    }
    var t = document.createElement('span');
    t.className = 'gk-gui-stuff-pill-text';
    t.textContent = o.text;
    // with a count the two are one part, so that they share a baseline (gk_gui_stuff_primitives.css)
    if (o.count != null) {
      var words = document.createElement('span'), cn = document.createElement('span');
      words.className = 'gk-gui-stuff-pill-words';
      cn.className = 'gk-gui-stuff-pill-count';
      cn.textContent = String(o.count);
      words.appendChild(t);
      words.appendChild(cn);
      inner.appendChild(words);
    } else {
      inner.appendChild(t);
    }
    if (off && o.reason) {
      var why = document.createElement('span');
      why.className = 'gk-gui-stuff-sr-only';
      why.textContent = ', ' + (o.reasonLabel ? o.reasonLabel + ': ' : '') + o.reason;
      inner.appendChild(why);
    }
    var main = o.button ? pillButton('gk-gui-stuff-pill-main', inner, o.button) : inner;
    if (choice && (o.pressed === true || o.pressed === false)) main.setAttribute('aria-pressed', o.pressed ? 'true' : 'false');
    if (off) { main.setAttribute('aria-disabled', 'true'); if (o.reason) main.title = o.reason; }
    p.appendChild(main);
    (o.parts || []).forEach(function (b) { p.appendChild(pillButton('gk-gui-stuff-pill-part', b.content, b)); });
    if (o.note) {
      var n = document.createElement('span');
      n.className = 'gk-gui-stuff-pill-note gk-gui-stuff-pill-part';
      n.textContent = o.note;
      p.appendChild(n);
    }
    if (o.onRemove) {
      var x = document.createElement('button'), K = window.GkGui;
      x.type = 'button';
      x.className = 'gk-gui-stuff-pill-x gk-gui-stuff-pill-part';
      x.tabIndex = -1;
      x.setAttribute('aria-label', o.removeLabel || '');
      x.title = o.removeLabel || '';
      if (K.put) K.put(x, 'close', '×', 10); else x.textContent = '×';
      x.disabled = !!o.disabled;
      x.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); });
      x.addEventListener('click', function (e) { e.stopPropagation(); o.onRemove(e); });
      p.appendChild(x);
    }
    return p;
  }
  G.pill = pill;
  // A row of choice pills where one is pressed: every button gets aria-pressed, its pill the chosen look, and the check
  // moves to the one pressed (made when the row has none); on is the button pressed, buttons every button of the row
  function choose(buttons, on) {
    var found = null;
    Array.prototype.forEach.call(buttons, function (b) { found = found || b.querySelector('[data-gk-gui-pill-check]'); });
    var ck = found || check();
    Array.prototype.forEach.call(buttons, function (b) {
      var yes = b === on, pl = b.closest('.gk-gui-stuff-pill');
      b.setAttribute('aria-pressed', yes ? 'true' : 'false');
      if (pl) pl.classList.toggle('gk-gui-stuff-pill-chosen', yes);
      if (yes && ck) b.insertBefore(ck, b.firstChild);
    });
  }
  G.choose = choose;

  // ---------------------------------------------------------------- a mark's note
  // "Ändra lappen" is a fold in the note's fly (details.gk-gui-stuff-pill-note-change): opened, its field gets the
  // focus, and on a sheet the Avbryt the sheet added steps aside for the form's own. Spara or Enter in the field sends
  // the note as PATCH to data-gk-gui-note-url; an answer that is not ok shows its error in the fly ({error},
  // {errors: []} or {message} as JSON, else the general words), an ok one loads the page again.
  document.addEventListener('toggle', function (e) {
    var c = e.target;
    if (!c.matches || !c.matches('details.gk-gui-stuff-pill-note-change')) return;
    var box = c.closest('.gk-gui-stuff-fly-box'), f = c.querySelector('.gk-gui-stuff-fly-field');
    if (box) box.querySelectorAll('[data-gk-gui-fly-cancel]').forEach(function (b) { if (!c.contains(b)) b.hidden = c.open; });
    if (c.open && f) { f.focus({ preventScroll: true }); f.select(); }
  }, true);
  function noteSend(form) {
    var f = form.querySelector('.gk-gui-stuff-fly-field'), err = form.querySelector('.gk-gui-stuff-pill-note-error');
    var tok = document.querySelector('meta[name="csrf-token"]'), fd = new FormData();
    function fail(text) { if (err) { err.textContent = text || T.failed || ''; err.hidden = false; } if (f) f.focus(); }
    fd.append('note', f ? f.value : '');
    if (err) err.hidden = true;
    fetch(form.getAttribute('data-gk-gui-note-url'), {
      method: 'PATCH', body: fd, credentials: 'same-origin',
      headers: { 'X-CSRF-Token': tok ? tok.getAttribute('content') : '', 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' }
    }).then(function (r) {
      if (r.ok) { window.location.reload(); return null; }
      return r.json().then(function (j) { fail(j && (j.error || (j.errors || []).join(' ') || j.message)); }, function () { fail(); });
    }, function () { fail(); });
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.gk-gui-stuff-pill-note-save') : null;
    if (b) noteSend(b.closest('.gk-gui-stuff-pill-note-form'));
  });
  document.addEventListener('keydown', function (e) {
    var form = e.key === 'Enter' && e.target && e.target.closest ? e.target.closest('.gk-gui-stuff-pill-note-form') : null;
    if (form && e.target.classList.contains('gk-gui-stuff-fly-field')) { e.preventDefault(); noteSend(form); }
  });

  // ---------------------------------------------------------------- icon button
  // Ikonknappen from a script, the same markup as gk_gui_stuff_icon_button: core's icon through the kernel's
  // GkGui.icon (core's sprite, found the way core's own updateSVGIcon finds it; GK Icons' for minimize; the character
  // without the kernel), the label as the tooltip and for the screen reader, a round hit area in the colour of the text
  // around it. o: {icon, label, fallback, href, onClick, className}; href makes it a link. Without fallback an accepted
  // icon has a character of its own, so that the button is never empty where no sprite is found.
  var ICON_CHARS = { close: '×', reload: '↻', maximize: '⤢', minimize: '⤡', cancel: '⊘' };
  function iconButton(o) {
    var b = document.createElement(o.href ? 'a' : 'button'), K = window.GkGui, ch = o.fallback || ICON_CHARS[o.icon] || '';
    b.className = 'gk-gui-stuff-icon-button' + (o.className ? ' ' + o.className : '');
    if (o.href) b.href = o.href; else b.type = 'button';
    if (K.put) K.put(b, o.icon, ch, 16); else b.textContent = ch;
    b.title = o.label || '';
    b.setAttribute('aria-label', o.label || '');
    if (o.onClick) b.addEventListener('click', o.onClick);
    return b;
  }
  G.iconButton = iconButton;

  // ---------------------------------------------------------------- count
  // Räknaren from a script, the same markup as gk_gui_stuff_count: {n, shared, role, title}. With an alert role it is
  // filled, without one quiet; shared more than 0 reads own and shared apart ("2+3").
  function count(o) {
    var s = document.createElement('span'), rc = roleClass(o.role), n = parseInt(o.n, 10) || 0, sh = parseInt(o.shared, 10) || 0;
    s.className = 'gk-gui-stuff-count ' + (rc || 'gk-gui-stuff-count-quiet');
    s.textContent = sh > 0 ? n + '+' + sh : String(n);
    if (o.title) { s.title = o.title; s.setAttribute('aria-label', o.title); }
    return s;
  }
  G.count = count;

  // ---------------------------------------------------------------- group
  function groupKey(sec) { var k = sec.getAttribute('data-gk-gui-group'); return k ? 'group.' + k : null; }
  // the fold button's state, the body it controls, and its words when it has two (gk_gui_stuff_group_toggle)
  function groupSet(btn, open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    var body = document.getElementById(btn.getAttribute('aria-controls'));
    if (body) body.hidden = !open;
    var word = btn.getAttribute(open ? 'data-gk-gui-text-open' : 'data-gk-gui-text-closed'), t = btn.querySelector('.gk-gui-stuff-group-title');
    if (word !== null && t) t.textContent = word;
  }
  // the click turns the button, and says so with gk-gui-group-toggle (detail {open}) for what has no body of its own
  // (the line's panel); the button stays the only owner of its state
  function groupToggle(btn) {
    var open = btn.getAttribute('aria-expanded') !== 'true';
    groupSet(btn, open);
    var sec = btn.closest('.gk-gui-stuff-group'), k = sec && groupKey(sec);
    if (k) store(k, open ? '1' : '0');
    btn.dispatchEvent(new CustomEvent('gk-gui-group-toggle', { bubbles: true, detail: { open: open } }));
  }
  function groupsFirst(root) {
    root.querySelectorAll('.gk-gui-stuff-group[data-gk-gui-group]').forEach(function (sec) {
      if (sec.dataset.gkGuiGroupReady) return;
      sec.dataset.gkGuiGroupReady = '1';
      var want = store(groupKey(sec)), btn = sec.querySelector('.gk-gui-stuff-group-toggle');
      if (btn && want !== null) groupSet(btn, want === '1');
    });
  }
  // the button and the remembered state: primitives.js calls toggle on a click and first in its pass
  G.group = { set: groupSet, toggle: groupToggle, first: groupsFirst };

  // ---------------------------------------------------------------- effect mark
  // What one of gui_stuff's modules draws or styles carries the setting's name in data-gk-gui-stuff-effect (several
  // names separated by a space, each once), as GkGuiStuff::Effect writes it on the server, so that what marks a change
  // on the page finds it by the mark. Returns the element.
  G.effect = function (el, name) {
    if (!el || el.nodeType !== 1 || !name) return el;
    var have = (el.getAttribute('data-gk-gui-stuff-effect') || '').split(/\s+/).filter(Boolean);
    if (have.indexOf(name) < 0) { have.push(name); el.setAttribute('data-gk-gui-stuff-effect', have.join(' ')); }
    return el;
  };
  // The name taken out of the mark again when the effect is gone; the attribute goes when no name is left. Returns the
  // element.
  G.uneffect = function (el, name) {
    if (!el || el.nodeType !== 1 || !name) return el;
    var have = (el.getAttribute('data-gk-gui-stuff-effect') || '').split(/\s+/).filter(function (n) { return n && n !== name; });
    if (have.length) el.setAttribute('data-gk-gui-stuff-effect', have.join(' '));
    else el.removeAttribute('data-gk-gui-stuff-effect');
    return el;
  };
})();
