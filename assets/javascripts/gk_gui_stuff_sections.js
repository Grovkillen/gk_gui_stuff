// gk_gui_stuff collapse_all (redmine.org #29034): the issue page's sections fold under their own label, and the page's
// action links get "Fäll ihop allt" / "Fäll ut allt". The sections: attributes, description, subtasks and related
// issues, and every section a plugin marks: an element with data-gk-gui-stuff-section="key" and, inside it, its label
// with data-gk-gui-stuff-section-label. A marked section inside the attributes is moved out to stand after them, with a
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

  function toggleButton(label) {
    var b = G.node('button', 'gk-gui-stuff-sec-toggle');
    b.dataset.gkLooksSkip = '1'; // core_stuff's control_heights leaves the toggle as it is
    b.type = 'button';
    b.setAttribute('aria-label', label);
    var chev = G.node('span', 'gk-gui-stuff-sec-chev');
    chev.appendChild(G.icon('angle-down', '▾', 14)); // Core's icon also without icons
    b.appendChild(chev);
    return b;
  }

  // Folds root under label: the button goes before the label, everything else in root (but core's own links) is
  // the body that is hidden
  function fold(k, root, label) {
    var row = label;
    while (row.parentNode && row.parentNode !== root) row = row.parentNode;
    var bodies = Array.prototype.filter.call(root.children, function (n) { return n !== row && !n.classList.contains('contextual'); });
    // a section that is only its label row (the tags on the issue) has nothing to fold: it gets no button
    if (!bodies.length) return;
    bodies.forEach(function (n) { n.classList.add('gk-gui-stuff-sec-body'); });
    var b = toggleButton(label.textContent.trim());
    label.parentNode.insertBefore(b, label);
    label.classList.add('gk-gui-stuff-sec-labelled');
    var s = { key: k, root: root, button: b, apply: function (open) {
      root.classList.toggle('gk-gui-stuff-sec-closed', !open);
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) empty(root, bodies);
    } };
    function flip() { set(s, root.classList.contains('gk-gui-stuff-sec-closed')); }
    b.addEventListener('click', flip);
    label.addEventListener('click', flip);
    replace(s);
    s.apply(!closed(k));
  }

  // An open section with nothing shown under its label (no related issues yet) says so, so that opening it is seen
  function empty(root, bodies) {
    var shown = bodies.some(function (n) { return !n.classList.contains('gk-gui-stuff-sec-empty') && n.offsetHeight > 0 && n.textContent.trim() !== ''; });
    var note = root.querySelector(':scope > .gk-gui-stuff-sec-empty');
    if (shown) { if (note) note.hidden = true; return; }
    if (!note) { note = G.node('p', 'gk-gui-stuff-sec-body gk-gui-stuff-sec-empty nodata', G.t('sec_empty')); root.appendChild(note); }
    note.hidden = false;
  }

  // A section with core's own label (p > strong): description, subtasks, related issues
  function labelled(k, root) {
    if (!root || root.dataset.gkGuiStuffSec) return;
    var p = Array.prototype.find.call(root.children, function (n) { return n.tagName === 'P' && n.querySelector(':scope > strong'); });
    if (!p) return;
    root.dataset.gkGuiStuffSec = k;
    fold(k, root, p.querySelector(':scope > strong'));
  }

  // The sections plugins mark (readup's Läskvittens, retention's Makulerat i ärendet, ...), in the order they come
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
        var prev = el.previousElementSibling;
        if (prev && prev.tagName === 'HR') prev.remove();
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
  // actions_menu the module puts its own link first among the issue's links, as before.
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
  function allButton() {
    if (G.on('actions_menu') || document.querySelector('a.gk-gui-stuff-sec-all')) return;
    var bar = document.querySelector('#content > .contextual');
    if (!bar || sections.length === 0) return;
    var a = G.node('a', 'gk-gui-stuff-sec-all icon');
    a.href = '#';
    a.setAttribute('role', 'button');
    a.addEventListener('click', function (e) { e.preventDefault(); toggleAll(); });
    bar.insertBefore(a, bar.firstChild);
  }

  G.onContent(function () {
    if (!issuePage()) return;
    attributes();
    marked();
    labelled('description', document.querySelector('div.issue div.description'));
    labelled('subtasks', document.getElementById('issue_tree'));
    labelled('relations', document.getElementById('relations'));
    allButton();
    paintAll();
  });
})();
