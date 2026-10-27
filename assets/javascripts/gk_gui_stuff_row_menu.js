// gk_gui_stuff row menu: a list's row actions in a menu, as core's issue list has it (redmine.org #44627): a "..." button
// at the row's end (core's icon-actions with the 3-bullets icon) and the same menu on a right click on the row, in the
// look of core's context menu. Delete stands last, with core's icon-del. Shared, so that every GK list works the same
// way. Not a module: it is the list's own behaviour, loaded by the helper gk_gui_stuff_row_menu where a view uses it.
// Plain DOM, no jQuery, no kernel. Only tables marked data-gk-gui-rowmenu: core's own context menu (issues, time
// entries; rows with .hascontextmenu) is never touched.
//
// Markup contract (README, "Row menu"):
//   <table class="list" data-gk-gui-rowmenu>
//     <tr>...<td class="buttons">
//       <%= link_to l(:button_edit), edit_path, class: 'icon icon-edit', data: { gk_gui_row_action: true } %>
//       <%= link_to l(:button_delete), path, method: :delete, data: { confirm: l(:text_are_you_sure), gk_gui_row_action: true }, class: 'icon icon-del' %>
//       <%= button_to l(:button_x), path, form: { data: { gk_gui_row_action: true } } %>   (a form: its button is pressed)
//       <%= link_to l(:button_y), path, data: { gk_gui_row_action: 'keep' } %>          (stays visible in the row too)
//     </td></tr>
//   </table>
//   <%= gk_gui_stuff_row_menu %>
// An action is a link, a button or a form (button_to); it stays in the row, hidden, and the menu's item presses it:
// the same click, so Rails' data-confirm and data-method (and any script on it) work exactly as before. Without
// JavaScript nothing moves: the actions stand in the row as they always did. An action with data-gk-gui-row-action=
// "delete", a.icon-del, data-method=delete or a form with _method=delete is the delete and goes last. The "..." button
// goes into the cell of the row's first action (else the row's last cell); data-gk-gui-row-menu-label on the row names
// the menu for a screen reader (else the row's first cell). Keyboard: the button opens with Enter or Space, arrow up and
// down, Home and End move, Enter chooses, Escape and Tab close; focus goes back to the button.
(function () {
  if (window.gkGuiStuffRowMenu) return;
  var menu = null, openFor = null, opener = null;

  function kit(part) {
    var t = document.getElementById('gk-gui-stuff-rowmenu-kit');
    var el = t && t.content.querySelector('[data-kit="' + part + '"]');
    if (!el) return null;
    var c = el.cloneNode(true);
    c.removeAttribute('data-kit');
    return c;
  }
  function actions(row) {
    return Array.prototype.filter.call(row.querySelectorAll('[data-gk-gui-row-action]'), function (a) {
      return a.getAttribute('data-gk-gui-row-action') !== 'keep' && a.closest('tr') === row;
    });
  }
  function isDelete(a) {
    var v = a.getAttribute('data-gk-gui-row-action');
    if (v === 'delete' || a.classList.contains('icon-del') || (a.getAttribute('data-method') || '').toLowerCase() === 'delete') return true;
    var f = a.tagName === 'FORM' ? a : null;
    return !!(f && f.querySelector('input[name=_method][value=delete i]'));
  }
  // what the item presses: a form's own submit button, else the action itself. The buttons of a reason field
  // (gk_records' .gk-records-reason-wrap: "use the reason", the cross) are submit buttons for core's look but
  // never the form's action, so they are skipped
  function target(a) {
    if (a.tagName !== 'FORM') return a;
    var own = Array.prototype.find.call(a.querySelectorAll('[type=submit], button:not([type])'), function (b) {
      return !b.closest('.gk-records-reason-wrap');
    });
    return own || a;
  }
  function label(a) {
    var t = target(a);
    var s = (a.getAttribute('data-gk-gui-row-action-label') || t.getAttribute('aria-label') || t.value || t.textContent || t.title || '').replace(/\s+/g, ' ').trim();
    return s || (a.title || '');
  }
  function disabled(a) { var t = target(a); return t.disabled || t.classList.contains('disabled') || t.getAttribute('aria-disabled') === 'true'; }

  function close(back) {
    if (!menu) return;
    menu.remove();
    menu = null;
    if (openFor) openFor.classList.remove('gk-gui-stuff-rowmenu-row');
    var b = opener;
    if (b) b.setAttribute('aria-expanded', 'false');
    openFor = null;
    opener = null;
    if (back && b) b.focus();
  }
  function items() { return menu ? Array.prototype.slice.call(menu.querySelectorAll('a[role=menuitem]:not([aria-disabled=true])')) : []; }
  function move(d) {
    var list = items(), i = list.indexOf(document.activeElement);
    if (!list.length) return;
    i = d === 'first' ? 0 : d === 'last' ? list.length - 1 : (i + d + list.length) % list.length;
    list[i].focus();
  }
  function open(row, at, button, keyboard) {
    close(false);
    var acts = actions(row);
    if (!acts.length) return;
    var dels = acts.filter(isDelete), rest = acts.filter(function (a) { return !isDelete(a); });
    menu = document.createElement('div');
    menu.className = 'gk-gui-stuff-rowmenu';
    var ul = document.createElement('ul');
    ul.setAttribute('role', 'menu');
    var name = row.getAttribute('data-gk-gui-row-menu-label') || (row.cells[0] ? row.cells[0].textContent.replace(/\s+/g, ' ').trim() : '');
    if (name) ul.setAttribute('aria-label', name);
    rest.concat(dels).forEach(function (a) {
      var li = document.createElement('li');
      li.setAttribute('role', 'none');
      var it = document.createElement('a');
      it.href = '#';
      it.setAttribute('role', 'menuitem');
      it.tabIndex = -1;
      var del = isDelete(a);
      var t = target(a), svg = t.querySelector('svg');
      it.className = 'icon' + (del ? ' icon-del' : '');
      var ic = svg ? svg.cloneNode(true) : (del ? kit('del') : null);
      if (ic) it.appendChild(ic);
      var sp = document.createElement('span');
      sp.className = 'icon-label';
      sp.textContent = label(a);
      it.appendChild(sp);
      if (disabled(a)) { it.classList.add('disabled'); it.setAttribute('aria-disabled', 'true'); }
      it.addEventListener('click', function (e) {
        e.preventDefault();
        if (it.getAttribute('aria-disabled') === 'true') return;
        close(true);
        // the action's own click: Rails' confirm and method, and every script on it, as when it stood in the row
        target(a).click();
      });
      li.appendChild(it);
      ul.appendChild(li);
    });
    menu.appendChild(ul);
    document.body.appendChild(menu);
    openFor = row;
    opener = button || row.querySelector('.gk-gui-stuff-rowmenu-btn');
    if (opener) opener.setAttribute('aria-expanded', 'true');
    row.classList.add('gk-gui-stuff-rowmenu-row');
    // near the pointer, or under the button; turned back inside the window when it would leave it
    var x = at.x, y = at.y, w = menu.offsetWidth, h = menu.offsetHeight;
    var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    if (x - window.scrollX + w > vw) x = Math.max(window.scrollX, x - w);
    if (y - window.scrollY + h > vh) y = Math.max(window.scrollY, y - h - (at.h || 0));
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); } else if (e.key === 'Home') { e.preventDefault(); move('first'); } else if (e.key === 'End') { e.preventDefault(); move('last'); } else if (e.key === 'Escape') { e.preventDefault(); close(true); } else if (e.key === 'Tab') { close(true); } else if (e.key === ' ') { e.preventDefault(); if (document.activeElement.click) document.activeElement.click(); }
    });
    if (keyboard || button) { move('first'); } else { ul.tabIndex = -1; ul.focus(); }
  }

  function init(table) {
    if (table.dataset.gkGuiRowmenuReady) return;
    table.dataset.gkGuiRowmenuReady = '1';
    table.classList.add('gk-gui-stuff-rowmenu-on');
    Array.prototype.forEach.call(table.tBodies, function (tb) { Array.prototype.forEach.call(tb.rows, row); });
    // a right click on a row opens its menu; on a field, or with Shift, the browser's own
    table.addEventListener('contextmenu', function (e) {
      var r = e.target.closest('tr');
      if (!r || !table.contains(r) || r.closest('table') !== table || e.shiftKey || e.target.closest('input, textarea, select, [contenteditable]')) return;
      if (!r.dataset.gkGuiRowmenuReady || !actions(r).length) return;
      e.preventDefault();
      open(r, { x: e.pageX, y: e.pageY }, null, false);
    });
  }
  function row(r) {
    if (r.dataset.gkGuiRowmenuReady) return;
    var acts = actions(r);
    if (!acts.length) return;
    r.dataset.gkGuiRowmenuReady = '1';
    acts.forEach(function (a) { a.classList.add('gk-gui-stuff-rowmenu-moved'); });
    var b = kit('button');
    if (!b) return;
    var cell = acts[0].closest('td, th') || r.cells[r.cells.length - 1];
    if (!cell) return;
    cell.appendChild(b);
    function show(kb) {
      if (openFor === r) { close(true); return; }
      var rc = b.getBoundingClientRect();
      open(r, { x: rc.left + window.scrollX, y: rc.bottom + window.scrollY, h: rc.height }, b, kb);
    }
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); show(e.detail === 0); });
    b.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); show(true); }
    });
  }

  document.addEventListener('mousedown', function (e) { if (menu && !menu.contains(e.target) && !(opener && opener.contains(e.target))) close(false); }, true);
  window.addEventListener('resize', function () { close(false); });
  document.addEventListener('keydown', function (e) { if (menu && e.key === 'Escape') close(true); });

  function scan(root) {
    if (root.matches && root.matches('table[data-gk-gui-rowmenu]')) init(root);
    if (root.querySelectorAll) {
      root.querySelectorAll('table[data-gk-gui-rowmenu]').forEach(init);
      // a row a script adds later (the row editor, a refreshed list) gets its button too
      var t = root.closest && root.closest('table[data-gk-gui-rowmenu]');
      if (t && t.dataset.gkGuiRowmenuReady) (root.tagName === 'TR' ? [root] : Array.prototype.slice.call(root.querySelectorAll('tr'))).forEach(row);
    }
  }
  function start() {
    scan(document);
    new MutationObserver(function (list) {
      list.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1 && !n.classList.contains('gk-gui-stuff-rowmenu')) scan(n); }); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  window.gkGuiStuffRowMenu = { init: init, close: close };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
