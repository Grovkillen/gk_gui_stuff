// gk_gui_stuff admin_groups: core's administration menu (the page Administration and the sidebar on every
// administration page) sorted under headings. The rows are core's own links, moved, never drawn again; which group
// a row stands in and the word it carries come from the server (AdminGroups.options). A heading folds its group
// and remembers it in this browser; the group with the page one is on is always open. Plain DOM, no jQuery.
(function () {
  var turnedOn = GkGui.on('admin_groups');
  if (!turnedOn) return;
  var opt = GkGui.opt('admin_groups'), rows = opt.rows || [], groups = opt.groups || [];
  if (!rows.length || !groups.length) return;

  function linkOf(menu, cls) {
    try { return menu.querySelector('a.' + CSS.escape(cls)); } catch (e) { return null; }
  }
  // the word only: core's icon in the link stays
  function rename(a, text) {
    var span = a.querySelector('.icon-label');
    if (span) { span.textContent = text; return; }
    for (var i = 0; i < a.childNodes.length; i++) {
      var n = a.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue.trim()) { n.nodeValue = text; return; }
    }
    a.appendChild(document.createTextNode(text));
  }
  // The page of a renamed row carries the row's word in its heading and the window's title too: that is the server's
  // to write as the page is drawn, never this script's by finding the old word in core's heading or title
  function setClosed(sec, btn, closed) {
    sec.classList.toggle('gk-gui-stuff-ag-closed', closed);
    btn.setAttribute('aria-expanded', closed ? 'false' : 'true');
  }
  function build(menu) {
    if (menu.getAttribute('data-gk-gui-stuff-ag')) return;
    // core's rows are found by the class core gives each link of the menu (its item's name); the row is the li core
    // draws around the link, and core's list is the one that holds those rows
    var by = {}, ul = null;
    rows.forEach(function (r) {
      var a = linkOf(menu, r.cls), li = a && a.closest('li');
      if (!li) return; // a row core does not draw right now (its condition), or not for this person
      if (!ul) ul = li.parentNode;
      if (r.caption) rename(a, r.caption);
      (by[r.group] = by[r.group] || []).push(li);
    });
    if (!ul) return;
    menu.setAttribute('data-gk-gui-stuff-ag', '1');
    var wrap = GkGui.effect(GkGui.node('div', 'gk-gui-stuff-ag'), 'admin_groups');
    groups.forEach(function (g) {
      var list = by[g.key];
      if (!list || !list.length) return;
      var sec = GkGui.node('div', 'gk-gui-stuff-ag-group');
      sec.setAttribute('data-gk-gui-stuff-ag-group', g.key);
      var head = GkGui.node('div', 'gk-gui-stuff-ag-head');
      head.setAttribute('role', 'heading');
      head.setAttribute('aria-level', '3');
      var btn = GkGui.node('button', 'gk-gui-stuff-ag-toggle');
      btn.type = 'button';
      btn.appendChild(GkGui.put(GkGui.node('span', 'gk-gui-stuff-ag-chev'), 'angle-down', '▾', 14));
      btn.appendChild(GkGui.node('span', 'gk-gui-stuff-ag-label', g.label));
      btn.appendChild(GkGui.node('span', 'gk-gui-stuff-ag-count', String(list.length)));
      head.appendChild(btn);
      var gul = GkGui.node('ul', 'gk-gui-stuff-ag-rows');
      list.forEach(function (li) { gul.appendChild(li); });
      var here = !!gul.querySelector('a.selected');
      setClosed(sec, btn, !here && GkGui.get('ag.' + g.key) === '0');
      btn.addEventListener('click', function () {
        var closed = !sec.classList.contains('gk-gui-stuff-ag-closed');
        setClosed(sec, btn, closed);
        GkGui.set('ag.' + g.key, closed ? '0' : null);
      });
      sec.appendChild(head);
      sec.appendChild(gul);
      wrap.appendChild(sec);
    });
    if (!wrap.children.length) return;
    ul.parentNode.insertBefore(wrap, ul);
    // a row the server did not name stays in core's list, which then stands last; an emptied list is hidden
    if (!ul.children.length) ul.hidden = true;
  }
  GkGui.onContent(function () {
    document.querySelectorAll('#admin-menu').forEach(build);
  });
})();
