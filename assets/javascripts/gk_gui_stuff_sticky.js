// gk_gui_stuff sticky_columns (redmine.org #43641, #14508): a list's column headers stay at the top of the window
// while the list is scrolled through. Core's layout makes CSS sticky impossible here (#wrapper has overflow: hidden
// and #content overflow-x: auto, so position: sticky holds to them and never to the window), so the header is a
// floating copy: shown when the real header has left the window and the list is still in it, with each column's
// width measured from the list, and moved sideways with the list when it scrolls in its own box. Sorting links work
// in the copy; a checkbox in the copy clicks the real one. In core's workflow matrix the first column (the current
// status) also stays at the start when the matrix scrolls sideways (CSS sticky, which works inside the box).
// In core's narrow layout (phone) the header stands fixed at the top of the window, so the copy stands right under it
// and shows when the real header has gone under it. Never in print.
(function () {
  var G = window.GkGui;
  if (!G || !G.on('sticky_columns')) return;
  var items = [];

  function setup(root) {
    root.querySelectorAll('table.list').forEach(function (table) {
      if (table.dataset.gkGuiStuffSticky || !table.tHead || table.closest('.gk-gui-stuff-sticky-clone')) return;
      if (table.tBodies.length === 0 || table.tHead.classList.contains('related-issues')) return;
      table.dataset.gkGuiStuffSticky = '1';
      var box = table.parentElement && table.parentElement.classList.contains('autoscroll') ? table.parentElement : null;
      if (box && table.classList.contains('workflows')) box.classList.add('gk-gui-stuff-sticky-first');
      var it = { table: table, box: box, clone: null, widths: null };
      items.push(it);
      if (box) box.addEventListener('scroll', function () { place(it); }, { passive: true });
    });
  }

  function build(it) {
    var wrap = G.node('div', 'gk-gui-stuff-sticky-clone');
    wrap.setAttribute('aria-hidden', 'true');
    var t = document.createElement('table');
    t.className = it.table.className;
    var head = it.table.tHead.cloneNode(true);
    head.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
    t.appendChild(head);
    wrap.appendChild(t);
    // a checkbox in the copy (core's "check all") clicks the real one
    head.querySelectorAll('input[type=checkbox]').forEach(function (cb, i) {
      cb.addEventListener('click', function (e) {
        e.preventDefault();
        var real = it.table.tHead.querySelectorAll('input[type=checkbox]')[i];
        if (real) { real.click(); cb.checked = real.checked; }
      });
    });
    head.querySelectorAll('a').forEach(function (a) { a.tabIndex = -1; });
    document.body.appendChild(wrap);
    it.clone = wrap;
    measure(it);
  }

  function measure(it) {
    if (!it.clone) return;
    var t = it.clone.firstChild;
    t.style.inlineSize = it.table.offsetWidth + 'px';
    var src = it.table.tHead.rows, dst = t.tHead.rows;
    for (var r = 0; r < src.length && r < dst.length; r++) {
      for (var c = 0; c < src[r].cells.length && c < dst[r].cells.length; c++) {
        var w = src[r].cells[c].getBoundingClientRect().width;
        dst[r].cells[c].style.inlineSize = w + 'px';
        dst[r].cells[c].style.boxSizing = 'border-box';
        dst[r].cells[c].style.minInlineSize = w + 'px';
        dst[r].cells[c].style.maxInlineSize = w + 'px';
      }
    }
    var cbs = it.table.tHead.querySelectorAll('input[type=checkbox]'), copies = t.querySelectorAll('input[type=checkbox]');
    cbs.forEach(function (cb, i) { if (copies[i]) copies[i].checked = cb.checked; });
  }

  // where the copy stands: under core's header when that one is fixed at the top (the narrow layout), else at the top
  function fixedTop() {
    var h = document.getElementById('header');
    if (!h || window.getComputedStyle(h).position !== 'fixed') return 0;
    return Math.max(0, h.getBoundingClientRect().bottom);
  }

  function place(it) {
    var head = it.table.tHead, hr = head.getBoundingClientRect(), tr = it.table.getBoundingClientRect();
    var top = fixedTop();
    var show = hr.top < top && tr.bottom > top + hr.height * 2 && it.table.offsetParent !== null;
    if (!show) { if (it.clone) it.clone.classList.remove('gk-gui-stuff-sticky-on'); return; }
    if (!it.clone) build(it);
    it.clone.style.top = top + 'px';
    var view = it.box ? it.box.getBoundingClientRect() : tr;
    var left = Math.max(view.left, tr.left), right = Math.min(view.right, tr.right, document.documentElement.clientWidth);
    it.clone.style.left = left + 'px';
    it.clone.style.inlineSize = Math.max(0, right - left) + 'px';
    var shift = tr.left - left;
    var t = it.clone.firstChild;
    t.style.transform = 'translateX(' + shift + 'px)';
    // the matrix: the first column stays at the start in the copy too
    if (it.box && it.box.classList.contains('gk-gui-stuff-sticky-first')) {
      Array.prototype.forEach.call(t.tHead.rows, function (row) {
        var first = row.cells[0];
        if (first) { first.style.position = 'relative'; first.style.zIndex = '1'; first.style.transform = 'translateX(' + (-shift) + 'px)'; }
      });
    }
    it.clone.classList.add('gk-gui-stuff-sticky-on');
  }

  var queued = false;
  function all(remeasure) {
    if (queued) return;
    queued = true;
    // a frame when the page is seen; a timer when it is not (frames do not run in a hidden page)
    var later = (window.requestAnimationFrame && !document.hidden) ? window.requestAnimationFrame.bind(window) : function (f) { setTimeout(f, 16); };
    later(function () {
      queued = false;
      items = items.filter(function (it) {
        if (document.body.contains(it.table)) return true;
        if (it.clone) it.clone.remove();
        return false;
      });
      items.forEach(function (it) { if (remeasure) measure(it); place(it); });
    });
  }

  G.onContent(function (root) { setup(root); all(true); });
  window.addEventListener('scroll', function () { all(false); }, { passive: true });
  window.addEventListener('resize', function () { all(true); });
  document.addEventListener('change', function (e) {
    if (e.target && e.target.type === 'checkbox') all(true); // keep "check all" in the copy as it is in the list
  });
})();
