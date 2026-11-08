// gk_gui_stuff collapse_all (redmine.org #29034): the issue page's sections fold under their own label, and the page's
// action links get "Fäll ihop allt" / "Fäll ut allt". The sections: attributes, core's sections by their marks
// (data-section on the container, section-heading on the heading: description, files, subtasks and related issues),
// and every section a plugin marks: an element with data-gk-gui-stuff-section="key" and, inside it, its label with
// data-gk-gui-stuff-section-label. A marked section inside the attributes is moved out to stand after them, with a
// line before it like core's own sections, so that closing the attributes does not close it. A closed section keeps its
// label (and core's own links next to it, such as Lägg till); what is under it is hidden. The state is kept per section
// (GkGui.set), so the next issue opens the way one left the last. Everything is open until someone closes it; in print
// everything is shown.
(function () {
  var G = window.GkGui;
  if (!G || !G.on('collapse_all')) return;
  // the script is in the head: the body's classes are read when the content is there
  function issuePage() { return document.body.classList.contains('controller-issues') && document.body.classList.contains('action-show'); }
  var sections = [];

  function key(k) { return 'sec.' + k; }
  var folded = {}; // the sections folded by default, by key
  function closed(k) { var v = G.get(key(k)); return v === '0' || (v == null && !!folded[k]); }
  function store(k, open) { G.set(key(k), open ? (folded[k] ? '1' : null) : '0'); }

  // label: the words (a string), or the element that names the section (aria-labelledby, its words never copied)
  var labelIds = 0;
  function toggleButton(label) {
    var b = G.effect(G.node('button', 'gk-gui-stuff-sec-toggle'), 'collapse_all');
    b.dataset.gkLooksSkip = '1'; // core_stuff's control_heights leaves the toggle as it is
    b.type = 'button';
    if (typeof label === 'string') b.setAttribute('aria-label', label);
    else { if (!label.id) label.id = 'gk-gui-stuff-sec-label-' + (++labelIds); b.setAttribute('aria-labelledby', label.id); }
    var chev = G.node('span', 'gk-gui-stuff-sec-chev');
    chev.appendChild(G.icon('angle-down', '▾', 14)); // Core's icon also without icons
    b.appendChild(chev);
    return b;
  }

  // Folds root under label. The body that is hidden is everything in root but the label's own row (root's child that
  // holds the label, found by holding it, never by place), core's own links (.contextual, a class core sets on purpose)
  // and what a GK script marks to stay (data-gk-gui-stuff-section-keep: parent_link's parent task). inside: the label
  // is a whole marked heading (core's section-heading), and the button is its first child; else the button goes
  // before the label (a plugin's data-gk-gui-stuff-section-label). A click on the label folds too, but not one on a
  // link or a control in it (core's counts of open and closed subtasks are links).
  function fold(k, root, label, inside) {
    var row = Array.prototype.filter.call(root.children, function (n) { return n.contains(label); })[0];
    if (!row) return;
    var bodies = Array.prototype.filter.call(root.children, function (n) {
      return n !== row && !n.classList.contains('contextual') && !n.hasAttribute('data-gk-gui-stuff-section-keep');
    });
    // a section that is only its label row (the tags on the issue) has nothing to fold: it gets no button
    if (!bodies.length) return;
    bodies.forEach(function (n) { n.classList.add('gk-gui-stuff-sec-body'); });
    var b = toggleButton(label);
    if (inside) label.insertBefore(b, label.firstChild); else label.parentNode.insertBefore(b, label);
    label.classList.add('gk-gui-stuff-sec-labelled');
    var s = { key: k, root: root, button: b, apply: function (open) {
      root.classList.toggle('gk-gui-stuff-sec-closed', !open);
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) empty(root, bodies);
    } };
    function flip() { set(s, root.classList.contains('gk-gui-stuff-sec-closed')); }
    b.addEventListener('click', flip);
    label.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a, button, input, select, textarea, summary, label')) return;
      flip();
    });
    replace(s);
    s.apply(!closed(k));
  }

  // An open section with nothing shown under its label (no related issues yet) says so, so that opening it is seen
  function empty(root, bodies) {
    // shown is what takes room on the page (core hides an empty part, such as the form for a new relation)
    var shown = bodies.some(function (n) { return !n.classList.contains('gk-gui-stuff-sec-empty') && n.offsetHeight > 0; });
    var note = root.querySelector(':scope > .gk-gui-stuff-sec-empty');
    if (shown) { if (note) note.hidden = true; return; }
    if (!note) { note = G.node('p', 'gk-gui-stuff-sec-body gk-gui-stuff-sec-empty nodata', G.t('sec_empty')); root.appendChild(note); }
    note.hidden = false;
  }

  // core's own sections (description, files, subtasks, related issues), found only by the marks of the issue page's
  // sections: the container has data-section (its value is the key) and its heading the class section-heading. Never
  // by the heading's word or look, so that a row another module puts in the box (parent_link's parent task, bold and
  // first in #issue_tree) is never taken for the heading. Without the marks (GK Core Stuff absent or older, and a core
  // without them) core's sections are not folded. Whether a section is folded already is read from its label as it
  // is now (the class fold gives it), never from a mark on the container: core draws #relations anew inside the same
  // element when a relation is added or removed, and the new heading must get its button again. The heading is the
  // section-heading whose nearest data-section is this container (at any depth, so a wrapper core adds around it does
  // not hide it, and a section inside another is never taken for its heading); the whole marked heading is the label,
  // never a guessed element inside it.
  function sectioned() {
    document.querySelectorAll('div.issue [data-section]').forEach(function (root) {
      if (!root.dataset.section) return;
      var heading = Array.prototype.filter.call(root.querySelectorAll('.section-heading'), function (h) {
        return h.closest('[data-section]') === root;
      })[0];
      if (!heading || heading.classList.contains('gk-gui-stuff-sec-labelled')) return;
      fold(root.dataset.section, root, heading, true);
    });
  }

  // The sections plugins mark (readup's Läskvittens, retention's Makulerat i ärendet, ...), in the order they come. A
  // plugin's own line before its section is marked data-gk-gui-stuff-section-rule="<the same key>"; when the section
  // is moved out of the attributes that line is taken away (a new one stands before the section), found by its key and
  // never by being the element just before
  function marked() {
    var issue = document.querySelector('div.issue');
    if (!issue) return;
    var attrs = issue.querySelector('div.attributes'), after = attrs;
    issue.querySelectorAll('[data-gk-gui-stuff-section]').forEach(function (el) {
      if (el.dataset.gkGuiStuffSec) return;
      var label = el.querySelector('[data-gk-gui-stuff-section-label]');
      if (!label) return;
      var k = 'x.' + el.dataset.gkGuiStuffSection;
      el.dataset.gkGuiStuffSec = k;
      if (el.dataset.gkGuiStuffSectionDefault === 'collapsed') folded[k] = true;
      if (attrs && attrs.contains(el)) {
        issue.querySelectorAll('hr[data-gk-gui-stuff-section-rule]').forEach(function (hr) {
          if (hr.getAttribute('data-gk-gui-stuff-section-rule') === el.dataset.gkGuiStuffSection) hr.remove();
        });
        var hr = document.createElement('hr');
        after.parentNode.insertBefore(hr, after.nextSibling);
        hr.parentNode.insertBefore(el, hr.nextSibling);
        after = el;
      }
      // the line before it is the separator: its own top border and space would make a second line
      el.classList.add('gk-gui-stuff-sec-moved');
      fold(k, el, label);
    });
  }

  // The attributes have no label in core: a small one is put above them
  function attributes() {
    var box = document.querySelector('div.issue div.attributes');
    if (!box || box.dataset.gkGuiStuffSec) return;
    box.dataset.gkGuiStuffSec = 'attributes';
    var label = G.t('sec_attributes');
    var p = G.node('p', 'gk-gui-stuff-sec-label');
    var b = toggleButton(label);
    var strong = G.node('strong', 'gk-gui-stuff-sec-labelled', label);
    p.appendChild(b); p.appendChild(strong);
    box.parentNode.insertBefore(p, box);
    var s = { key: 'attributes', root: box, button: b, apply: function (open) {
      box.classList.toggle('gk-gui-stuff-sec-hidden', !open);
      p.classList.toggle('gk-gui-stuff-sec-closed', !open);
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    } };
    function flip() { set(s, box.classList.contains('gk-gui-stuff-sec-hidden')); }
    b.addEventListener('click', flip);
    strong.addEventListener('click', flip);
    replace(s);
    s.apply(!closed('attributes'));
  }

  function replace(s) {
    sections = sections.filter(function (x) { return x.key !== s.key; });
    sections.push(s);
  }

  function set(s, open) {
    store(s.key, open);
    s.apply(open);
    paintAll();
  }

  // "Fäll ihop allt" / "Fäll ut allt": a row of actions_menu (out among the issue's links by default; the
  // administrator may move it into the three-dot menu), so it stands where the other buttons stand. Without
  // actions_menu the server draws the module's own link among the issue's links through core_stuff's contextual hook.
  function anyOpen() { return sections.some(function (s) { return !closed(s.key); }); }
  function toggleAll() {
    var open = !anyOpen();
    sections.forEach(function (s) { store(s.key, open); s.apply(open); });
    paintAll();
  }
  G.actions.collapse_all = function () { toggleAll(); };
  function paintAll() {
    var open = anyOpen();
    document.querySelectorAll('[data-gk-gui-stuff-menu-key="collapse_all"], a.gk-gui-stuff-sec-all').forEach(function (a) {
      var label = a.querySelector('.icon-label') || a;
      // the icon says what the click does: up while something is open (fold it all), to the right when all is folded
      var icon = open ? 'angle-up' : 'angle-right';
      if (label === a) {
        a.textContent = '';
        if (window.GkIcons && a.classList.contains('gk-gui-stuff-sec-all')) a.appendChild(G.icon(icon, '', 16));
        a.appendChild(document.createTextNode((window.GkIcons && a.classList.contains('gk-gui-stuff-sec-all') ? ' ' : '') + G.t(open ? 'sec_close_all' : 'sec_open_all')));
      } else {
        label.textContent = G.t(open ? 'sec_close_all' : 'sec_open_all');
        var old = a.querySelector('svg');
        if (old) { var ico = G.icon(icon, '', 16); if (ico.nodeType === 1) { ico.classList.add('icon-svg'); old.replaceWith(ico); } }
        a.classList.toggle('icon-angle-up', open); a.classList.toggle('icon-angle-right', !open);
      }
    });
  }
  // The link without actions_menu is drawn by the server through the issue page's contextual hook (GkGuiStuff::Hooks,
  // view_issues_show_contextual); here it only gets its click, and it goes when the page has nothing to fold
  function allButton() {
    document.querySelectorAll('a.gk-gui-stuff-sec-all').forEach(function (a) {
      if (sections.length === 0) { a.remove(); return; }
      if (a.dataset.gkGuiStuffSecAll) return;
      a.dataset.gkGuiStuffSecAll = '1';
      a.addEventListener('click', function (e) { e.preventDefault(); toggleAll(); });
    });
  }

  G.onContent(function () {
    if (!issuePage()) return;
    attributes();
    marked();
    sectioned();
    allButton();
    paintAll();
  });
})();
