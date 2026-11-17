// gk_gui_stuff: the disclosure (fällningen) from a script, the same markup as gk_gui_stuff_disclosure (disclosure.rb)
// draws, for a block a script builds; one the server drew needs nothing from here, the details folds by itself.
// Loaded on every page right after gk_gui_stuff_parts.js (whose GkGui.count it draws the count with), before the
// kernel, which keeps what this puts on GkGui. Binds nothing and draws nothing when it is loaded. Plain DOM, no jQuery.
//   GkGui.disclosure.make({ texts, open, count, body, id })   a details as gk_gui_stuff_disclosure draws it
//       texts: [closed, open] or one text for both; count: a number after the words (none when left out);
//       open: drawn open; body: a node, a list of nodes or a text (never read as HTML); id: the body's id
//   GkGui.disclosure.set(el, open)                            opens or closes the disclosure el is or stands in; the
//       browser sends its toggle event as it does for a click
(function () {
  'use strict';
  var G = window.GkGui = window.GkGui || {};
  var made = 0;

  function span(cls, text) {
    var s = document.createElement('span');
    s.className = cls;
    s.textContent = text;
    return s;
  }
  function words(texts) {
    var list = Array.isArray(texts) ? texts : [texts];
    var closed = String(list[0] == null ? '' : list[0]);
    var open = list.length > 1 && list[1] != null && String(list[1]) !== '' ? String(list[1]) : closed;
    return [closed, open];
  }
  function fill(box, body) {
    if (body == null) return;
    var list = Array.isArray(body) ? body : [body];
    list.forEach(function (b) {
      if (b == null) return;
      box.appendChild(typeof b === 'string' || typeof b === 'number' ? document.createTextNode(String(b)) : b);
    });
  }

  function make(o) {
    o = o || {};
    var w = words(o.texts);
    var d = document.createElement('details');
    d.className = 'gk-gui-stuff-disclosure';
    d.setAttribute('data-gk-gui-stuff-disclosure', '');
    var s = document.createElement('summary');
    s.className = 'gk-gui-stuff-disclosure-toggle';
    if (w[0] === w[1]) {
      s.appendChild(span('gk-gui-stuff-disclosure-text', w[0]));
    } else {
      s.appendChild(span('gk-gui-stuff-disclosure-closed', w[0]));
      s.appendChild(span('gk-gui-stuff-disclosure-open', w[1]));
    }
    if (o.count != null) s.appendChild(G.count({ n: o.count }));
    var b = document.createElement('div');
    b.className = 'gk-gui-stuff-disclosure-body';
    made += 1;
    b.id = o.id || 'gk-gui-stuff-disclosure-js-' + made;
    fill(b, o.body);
    d.appendChild(s);
    d.appendChild(b);
    if (o.open) d.open = true;
    return d;
  }

  function set(el, open) {
    var d = el && el.closest ? el.closest('details.gk-gui-stuff-disclosure') : null;
    if (!d) return null;
    if (d.open !== !!open) d.open = !!open;
    return d;
  }

  G.disclosure = { make: make, set: set };
})();
