// gk_gui_stuff row editor: rows a person adds, removes and moves in a form, with no limit on their number. Shared, so
// that every plugin's list of rows (requirements, checklist items, words per language) works the same way. Not a
// module: it is the form's own behaviour, loaded by the helper gk_gui_stuff_row_editor where a view uses it. Plain
// DOM, no jQuery, no kernel. Core's markup and icons: the sort handle (span.icon-sort-handle with the reorder icon,
// as core's reorder_handle), the delete link (a.icon-only.icon-del) and the add link (a.icon.icon-add).
//
// Markup contract (README, "Row editor"):
//   <tbody data-gk-gui-rows="plugin.list"            the container; any element whose children are the rows
//          data-gk-gui-rows-name="thing[rows]"       optional: the rows' field names start with thing[rows][N]; N is
//                                                    renumbered 0, 1, 2 ... in the order shown after every change
//                                                    (ids thing_rows_N_... follow), so the order sent is the order seen
//          data-gk-gui-rows-min="1"                  optional: never fewer rows (default 0)
//          data-gk-gui-rows-sortable="false">        optional: no handle, no moving (default: rows can be moved)
//     <tr data-gk-gui-row>                           a row; whatever it holds is the plugin's
//       <td data-gk-gui-row-handle></td>             optional slot for the handle, else it goes first in the first cell
//       <td><input name="thing[rows][0][text]"></td>
//       <td data-gk-gui-row-remove></td>             optional slot for the delete link, else last in the last cell
//     </tr>
//     <template data-gk-gui-row-template>            the new row; __INDEX__ in any attribute becomes the row's number
//       <tr data-gk-gui-row>...<input name="thing[rows][__INDEX__][text]">...</tr>
//     </template>
//   </tbody>
//   Optional in a row: input[data-gk-gui-row-position] gets 1, 2, 3 ... in the order shown; input[data-gk-gui-row-destroy]
//   (a saved row, Rails' _destroy) makes Ta bort set it to 1 and hide the row instead of taking it out of the form.
//   Optional anywhere: an element with data-gk-gui-rows-add="plugin.list" is where the add link goes (else after the
//   table or container). The template may also stand outside: template[data-gk-gui-row-template="plugin.list"].
// Keyboard: the handle is focusable, arrow up and down move its row. Every change says gk-gui-rows:change on the
// container (detail.action: add, remove, move). window.gkGuiStuffRows.init(el) and .add(el) for a script that draws rows.
(function () {
  if (window.gkGuiStuffRows) return;
  var PLACEHOLDER = /__INDEX__/g;

  function kit(part) {
    var t = document.getElementById('gk-gui-stuff-rows-kit');
    var el = t && t.content.querySelector('[data-kit="' + part + '"]');
    if (!el) return null;
    var c = el.cloneNode(true);
    c.removeAttribute('data-kit');
    return c;
  }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function rows(c, all) {
    return Array.prototype.filter.call(c.children, function (n) {
      return n.hasAttribute('data-gk-gui-row') && (all || !n.classList.contains('gk-gui-stuff-row-gone'));
    });
  }
  function template(c) {
    return c.querySelector(':scope > template[data-gk-gui-row-template]') ||
      document.querySelector('template[data-gk-gui-row-template="' + CSS.escape(c.getAttribute('data-gk-gui-rows')) + '"]');
  }
  function say(c, action) { c.dispatchEvent(new CustomEvent('gk-gui-rows:change', { bubbles: true, detail: { action: action } })); }
  function cells(row) { return Array.prototype.filter.call(row.children, function (n) { return n.tagName === 'TD' || n.tagName === 'TH'; }); }

  // the numbers in the names follow the order shown; the positions too
  function renumber(c) {
    var prefix = c.getAttribute('data-gk-gui-rows-name');
    if (prefix) {
      var name = new RegExp('^' + esc(prefix) + '\\[[^\\]]*\\]');
      var idp = prefix.replace(/\]\[|\[|\]/g, '_').replace(/_+$/, '');
      var id = new RegExp('^' + esc(idp) + '_[^_]+(?=_|$)');
      rows(c, true).forEach(function (row, i) {
        row.querySelectorAll('[name], [id], label[for]').forEach(function (el) {
          if (el.name && name.test(el.name)) el.name = el.name.replace(name, prefix + '[' + i + ']');
          if (el.id && id.test(el.id)) el.id = el.id.replace(id, idp + '_' + i);
          var f = el.getAttribute('for');
          if (f && id.test(f)) el.setAttribute('for', f.replace(id, idp + '_' + i));
        });
      });
    }
    rows(c).forEach(function (row, i) {
      row.querySelectorAll('input[data-gk-gui-row-position]').forEach(function (p) { p.value = String(i + 1); });
    });
    var min = Number(c.getAttribute('data-gk-gui-rows-min') || 0), live = rows(c);
    live.forEach(function (row) {
      var x = row.querySelector('.gk-gui-stuff-row-remove');
      if (!x) return;
      var off = live.length <= min;
      x.classList.toggle('disabled', off);
      x.setAttribute('aria-disabled', off ? 'true' : 'false');
    });
  }

  function decorate(c, row) {
    if (row.dataset.gkGuiRowReady) return;
    row.dataset.gkGuiRowReady = '1';
    var sortable = c.getAttribute('data-gk-gui-rows-sortable') !== 'false';
    var cs = cells(row);
    if (sortable) {
      var h = kit('handle');
      if (h) {
        var hs = row.querySelector('[data-gk-gui-row-handle]') || cs[0] || row;
        hs.insertBefore(h, hs.firstChild);
        h.addEventListener('keydown', function (e) {
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
          e.preventDefault();
          var live = rows(c), i = live.indexOf(row), j = i + (e.key === 'ArrowUp' ? -1 : 1);
          if (j < 0 || j >= live.length) return;
          if (j < i) c.insertBefore(row, live[j]); else c.insertBefore(row, live[j].nextSibling);
          h.focus();
          renumber(c);
          say(c, 'move');
        });
        h.addEventListener('pointerdown', function (e) { drag(c, row, h, e); });
      }
    }
    var x = kit('remove');
    if (x) {
      var xs = row.querySelector('[data-gk-gui-row-remove]') || cs[cs.length - 1] || row;
      xs.appendChild(x);
      x.addEventListener('click', function (e) { e.preventDefault(); remove(c, row); });
    }
  }

  function drag(c, row, handle, e) {
    if (e.button !== 0) return;
    e.preventDefault();
    try { handle.setPointerCapture(e.pointerId); } catch (err) { /* not captured: the moves still come */ }
    row.classList.add('gk-gui-stuff-row-dragging');
    var moved = false;
    function move(ev) {
      var y = ev.clientY, live = rows(c);
      for (var i = 0; i < live.length; i++) {
        var r = live[i];
        if (r === row) continue;
        var b = r.getBoundingClientRect();
        if (y > b.top && y < b.bottom) {
          var before = y < b.top + b.height / 2;
          var ref = before ? r : r.nextSibling;
          if (ref !== row && ref !== row.nextSibling) { c.insertBefore(row, ref); moved = true; }
          break;
        }
      }
    }
    function up() {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      row.classList.remove('gk-gui-stuff-row-dragging');
      if (moved) { renumber(c); say(c, 'move'); }
    }
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  function remove(c, row) {
    var live = rows(c), min = Number(c.getAttribute('data-gk-gui-rows-min') || 0);
    if (live.length <= min) return;
    var i = live.indexOf(row), next = live[i + 1] || live[i - 1];
    var destroy = row.querySelector('input[data-gk-gui-row-destroy]');
    if (destroy) {
      // a saved row: kept in the form with its mark, so that the server takes it away
      destroy.value = '1';
      row.classList.add('gk-gui-stuff-row-gone');
      row.hidden = true;
      row.querySelectorAll('[required]').forEach(function (el) { el.required = false; });
    } else {
      row.remove();
    }
    renumber(c);
    var f = next && next.querySelector('.gk-gui-stuff-row-remove');
    if (!f) f = c._gkAdd;
    if (f) f.focus();
    say(c, 'remove');
  }

  function add(c) {
    var t = template(c);
    if (!t || !t.content.firstElementChild) return null;
    var n = String(c._gkNext++);
    var row = t.content.firstElementChild.cloneNode(true);
    [row].concat(Array.prototype.slice.call(row.querySelectorAll('*'))).forEach(function (el) {
      Array.prototype.forEach.call(el.attributes, function (a) { if (a.value.indexOf('__INDEX__') >= 0) el.setAttribute(a.name, a.value.replace(PLACEHOLDER, n)); });
    });
    var all = rows(c, true), last = all[all.length - 1];
    c.insertBefore(row, last ? last.nextSibling : (t.parentNode === c ? t : null));
    decorate(c, row);
    renumber(c);
    var first = row.querySelector('input:not([type=hidden]), select, textarea');
    if (first) first.focus();
    say(c, 'add');
    return row;
  }

  function init(c) {
    if (c.dataset.gkGuiRowsReady) return;
    c.dataset.gkGuiRowsReady = '1';
    c._gkNext = rows(c, true).length;
    rows(c, true).forEach(function (row) { decorate(c, row); });
    if (template(c)) {
      var a = kit('add');
      if (a) {
        var key = c.getAttribute('data-gk-gui-rows');
        var slot = document.querySelector('[data-gk-gui-rows-add="' + CSS.escape(key) + '"]');
        if (slot && slot.tagName !== 'A' && slot.tagName !== 'BUTTON') { slot.appendChild(a); } else if (slot) { a = slot; } else {
          var p = document.createElement('p');
          p.className = 'gk-gui-stuff-rows-add';
          p.appendChild(a);
          var after = c.closest('table') || c;
          after.parentNode.insertBefore(p, after.nextSibling);
        }
        a.addEventListener('click', function (e) { e.preventDefault(); add(c); });
        c._gkAdd = a;
      }
    }
    renumber(c);
  }

  function scan(root) {
    if (root.matches && root.matches('[data-gk-gui-rows]')) init(root);
    if (root.querySelectorAll) root.querySelectorAll('[data-gk-gui-rows]').forEach(init);
  }
  function start() {
    scan(document);
    new MutationObserver(function (list) {
      list.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); }); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  window.gkGuiStuffRows = { init: init, add: add };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
