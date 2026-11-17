// gk_gui_stuff: the sentence (sentence.rb), always loaded with the primitives; before the kernel, which keeps
// what this puts on GkGui. A script draws it with the same markup as gk_gui_stuff_sentence; the caller owns the model
// and every word, and says what a click means (queries in its next candidate):
//   s = GkGui.sentence.mount(el, {key, lead, inline, empty, items, add: {label, title}, pending,
//                                 on: {field(key, el), value(key, el), remove(key, el), word(key, el), choice(key, el), add(el)}})
//   s.update(model)  s.open(key, part)  s.pending(on)  s.destroy()
//   items: [{kind: 'condition', key, field, op, value, incomplete, role}, {kind: 'word', key, text, logic: and|or|not,
//           fixed, title}, {kind: 'group', items}, {kind: 'text', text}, {kind: 'choice', key, text, dashed}]
//   GkGui.sentence.bind(frame, on)        the same clicks on a sentence the server drew
//   GkGui.sentence.box({anchor, title, content, remove, onDone, onCancel, onRemove})  a part's box: GkGui.layer
//       under the pill, Klar and "Ta bort villkoret", the keys; Enter in a field and a click outside are Klar, Esc and
//       the cross close with no change (the caller puts the old values back in onCancel); the focus goes back to the part
//   GkGui.sentence.note(after, text)      "Inte verkställt: …" beside core's Verkställ, null takes it away
(function () {
  var G = window.GkGui = window.GkGui || {};
  var T = {};
  var tEl = document.getElementById('gk-gui-stuff-primitives-texts');
  try { if (tEl) T = JSON.parse(tEl.textContent); } catch (e) { /* the keys */ }
  function t(k) { return T[k] || k; }
  function K() { return window.GkGui; }
  function N(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function icon(name, fallback, size) { var k = K(); return k.icon ? k.icon(name, fallback, size) : document.createTextNode(fallback); }

  // ---------------------------------------------------------------- drawing
  function condition(i) {
    var value = i.incomplete ? '?' : String(i.value == null ? '' : i.value), shown = document.createDocumentFragment();
    shown.appendChild(N('span', 'gk-gui-stuff-pill-op', i.op || ''));
    shown.appendChild(document.createTextNode(' '));
    var v = N('span', 'gk-gui-stuff-pill-value', value);
    v.title = value;
    shown.appendChild(v);
    if (i.incomplete) shown.appendChild(N('span', 'gk-gui-stuff-sr-only', t('sentence_incomplete')));
    var data = function (part) { return { 'gk-gui-sentence-part': part, 'gk-gui-sentence-key': i.key }; };
    var x = document.createDocumentFragment();
    x.appendChild(icon('close', '×', 12));
    return K().pill({ text: i.field, role: i.incomplete ? 'warning' : (i.role || 'choice'),
                      button: { title: t('sentence_field'), aria: { haspopup: 'true', expanded: 'false' }, data: data('field') },
                      parts: [{ content: shown, title: t('sentence_edit'), aria: { haspopup: 'true', expanded: 'false' }, data: data('value') },
                              { content: x, title: t('sentence_remove'), ariaLabel: t('sentence_remove'), data: data('remove') }] });
  }
  function item(i) {
    switch (i.kind) {
      case 'condition': return condition(i);
      case 'word': {
        var cls = 'gk-gui-stuff-sentence-word gk-gui-stuff-sentence-' + (i.logic === 'or' || i.logic === 'not' ? i.logic : 'and');
        var w = N(i.fixed ? 'span' : 'button', cls + (i.fixed ? ' gk-gui-stuff-sentence-word-fixed' : ''), i.text);
        if (!i.fixed) { w.type = 'button'; w.setAttribute('data-gk-gui-sentence-word', i.key); }
        if (i.title) w.title = i.title;
        return w;
      }
      case 'group': {
        var g = N('span', 'gk-gui-stuff-sentence-paren');
        (i.items || []).forEach(function (c, n) { if (n) g.appendChild(document.createTextNode(' ')); g.appendChild(item(c)); });
        return g;
      }
      case 'text': return N('span', 'gk-gui-stuff-sentence-text', i.text);
      case 'choice':
        return K().pill({ text: i.text, role: i.dashed ? null : (i.role || 'choice'), dashed: !!i.dashed,
                          button: { title: i.title, aria: { haspopup: 'true', expanded: 'false' }, data: { 'gk-gui-sentence-part': 'choice', 'gk-gui-sentence-key': i.key } } });
      default: return document.createTextNode('');
    }
  }
  function draw(frame, m) {
    frame.className = 'gk-gui-stuff-sentence' + (m.inline ? ' gk-gui-stuff-sentence-inline' : '') + ' gk-gui-stuff-rail';
    frame.setAttribute('data-gk-gui-sentence', m.key || '');
    if (!frame.hasAttribute('data-gk-gui-save')) frame.setAttribute('data-gk-gui-save', m.pending ? 'changed' : 'direct');
    frame.textContent = '';
    var add = function (n) { if (frame.childNodes.length) frame.appendChild(document.createTextNode(' ')); frame.appendChild(n); };
    if (m.lead) add(N('strong', 'gk-gui-stuff-sentence-lead', m.lead));
    var items = m.items || [];
    if (!items.length && m.empty) add(N('em', 'gk-gui-stuff-sentence-empty', m.empty));
    items.forEach(function (i) { add(item(i)); });
    if (m.add) {
      var b = N('button', 'gk-gui-stuff-sentence-add');
      b.type = 'button';
      b.setAttribute('data-gk-gui-sentence-add', '1');
      if (m.add.title) b.title = m.add.title;
      b.appendChild(icon('add', '+', 14));
      b.appendChild(document.createTextNode(' '));
      b.appendChild(N('span', null, m.add.label || t('sentence_add')));
      add(b);
    }
    var bar = N('span', 'gk-gui-stuff-rail-bar');
    bar.setAttribute('aria-hidden', 'true');
    frame.appendChild(bar);
  }

  // ---------------------------------------------------------------- clicks
  // a part's button says which condition or choice and which part; the word and "+ Villkor" have their own
  function bind(frame, on) {
    on = on || {};
    function click(e) {
      var n = e.target.closest && e.target.closest('button');
      if (!n) return;
      // the box's Klar on this click drew the sentence again: the same part in the new drawing
      if (!frame.contains(n) && !n.isConnected && n.hasAttribute('data-gk-gui-sentence-part')) n = partOf(frame, n.getAttribute('data-gk-gui-sentence-key'), n.getAttribute('data-gk-gui-sentence-part'));
      if (!n || !frame.contains(n)) return;
      var part = n.getAttribute('data-gk-gui-sentence-part'), key = n.getAttribute('data-gk-gui-sentence-key');
      if (part && on[part]) { e.preventDefault(); on[part](key, n); return; }
      if (n.hasAttribute('data-gk-gui-sentence-word') && on.word) { e.preventDefault(); on.word(n.getAttribute('data-gk-gui-sentence-word'), n); return; }
      if (n.hasAttribute('data-gk-gui-sentence-add') && on.add) { e.preventDefault(); on.add(n); }
    }
    frame.addEventListener('click', click);
    return function () { frame.removeEventListener('click', click); };
  }
  function partOf(frame, key, part) {
    return [].find.call(frame.querySelectorAll('[data-gk-gui-sentence-part="' + part + '"]'), function (n) { return n.getAttribute('data-gk-gui-sentence-key') === key; }) || null;
  }
  function mount(el, model) {
    var frame = el.classList && el.classList.contains('gk-gui-stuff-sentence') ? el : N('div');
    if (frame !== el) { el.textContent = ''; el.appendChild(frame); }
    var m = model, unbind = bind(frame, m.on);
    draw(frame, m);
    return {
      el: frame,
      update: function (next) { m = Object.assign({}, m, next); var st = frame.getAttribute('data-gk-gui-save'); draw(frame, m); frame.setAttribute('data-gk-gui-save', st); },
      open: function (key, part) {
        var b = partOf(frame, key, part || 'value');
        if (!b) return null;
        b.setAttribute('aria-expanded', 'true');
        b.closest('.gk-gui-stuff-pill').classList.add('gk-gui-stuff-pill-open');
        return b;
      },
      pending: function (on) { var s = K().save; if (s) s.set(frame, on ? 'changed' : 'direct', null); else frame.setAttribute('data-gk-gui-save', on ? 'changed' : 'direct'); },
      destroy: function () { unbind(); frame.remove(); }
    };
  }

  // ---------------------------------------------------------------- the part's box
  function box(o) {
    var body = document.createDocumentFragment(), how = 'outside';
    if (o.content) body.appendChild(typeof o.content === 'string' ? N('p', null, o.content) : o.content);
    var bar = N('div', 'gk-gui-stuff-popover-buttons'), ok = N('button', null, t('sentence_done'));
    ok.type = 'button';
    bar.appendChild(ok);
    var rm = null;
    if (o.remove !== false) {
      rm = N('a', 'gk-gui-stuff-sentence-remove', t('sentence_remove'));
      rm.href = '#';
      bar.appendChild(rm);
    }
    body.appendChild(bar);
    body.appendChild(N('p', 'gk-gui-stuff-sentence-keys', t('sentence_keys')));
    var pill = o.anchor && o.anchor.closest ? o.anchor.closest('.gk-gui-stuff-pill') : null;
    // the part, so that the focus finds it again when the caller draws the sentence anew in onDone, onCancel or onRemove
    var frame = o.anchor && o.anchor.closest ? o.anchor.closest('.gk-gui-stuff-sentence') : null;
    var key = o.anchor && o.anchor.getAttribute ? o.anchor.getAttribute('data-gk-gui-sentence-key') : null;
    var part = o.anchor && o.anchor.getAttribute ? o.anchor.getAttribute('data-gk-gui-sentence-part') : null;
    function refocus() {
      if (!frame || !frame.isConnected || (o.anchor && o.anchor.isConnected)) return;
      var b = (part && partOf(frame, key, part)) || frame.querySelector('[data-gk-gui-sentence-add]');
      if (b) b.focus({ preventScroll: true });
    }
    // Esc and the cross: no change; Klar, Enter in a field and a click outside: done; the remove link: away. A click
    // outside closes it on the click (outside: 'click'), so that a click on another part opens that part at once
    var L = K().layer.open({ key: 'sentence', title: o.title, content: body, parent: pill || o.anchor, opener: o.anchor, outside: 'click',
                             onClose: function (why) {
                               if (how === 'remove') { if (o.onRemove) o.onRemove(); } else if (why === 'escape' || why === 'x') { if (o.onCancel) o.onCancel(); } else if (o.onDone) o.onDone();
                               if (why !== 'outside') refocus();
                             } });
    ok.addEventListener('click', function () { how = 'done'; L.close(true); });
    if (rm) rm.addEventListener('click', function (e) { e.preventDefault(); how = 'remove'; L.close(true); });
    // Enter in an input is Klar, heard after the fields (bubble): an Enter a field took for itself (the chooser's
    // search, a popover in the box) is left to it, and a select keeps its own Enter. Esc is the layer's own (why escape),
    // and an Esc the chooser or a popover takes never reaches it
    L.el.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.defaultPrevented || e.target.tagName !== 'INPUT') return;
      if (e.target.closest('.gk-gui-stuff-ss, details.gk-gui-stuff-popover[open]') || e.target.getAttribute('aria-expanded') === 'true') return;
      e.preventDefault(); how = 'done'; L.close(true);
    });
    return L;
  }

  // ---------------------------------------------------------------- what waits for Verkställ
  // the quiet text after core's Verkställ, the class of the text by a box's Save
  function note(after, text) {
    if (!after) return null;
    var n = after.nextElementSibling;
    if (!(n && n.classList.contains('gk-gui-stuff-sentence-note'))) n = null;
    if (text == null) { if (n) n.remove(); return null; }
    if (!n) {
      n = N('span', 'gk-gui-stuff-form-status gk-gui-stuff-sentence-note');
      n.setAttribute('role', 'status');
      n.setAttribute('aria-live', 'polite');
      after.after(n);
    }
    n.textContent = text;
    return n;
  }

  G.sentence = { mount: mount, bind: bind, box: box, note: note };
})();
