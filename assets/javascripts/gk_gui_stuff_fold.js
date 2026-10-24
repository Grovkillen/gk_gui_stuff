// gk_gui_stuff fold: something long is shown short with "visa allt". One primitive, several modules that are
// only declarations of where: long_fields (the description), notes_collapse (long notes), code_blocks,
// private_notes_collapse (private notes start closed) and attachments_collapse (many attachments). Remembers
// what was opened per place, locally. aria-expanded and a real button; never folded in print (stylesheet).
(function () {
  var G = window.GkGui;
  if (!G) return;
  var o = G.opt('fold'), maxH = o.height || 320, maxFiles = o.attachments || 6;
  var page = location.pathname;

  function memKey(key, i) { return 'fold.' + page + '.' + key + '.' + i; }

  function button(open, more, less) {
    var b = G.node('button', 'gk-gui-stuff-fold-btn');
    b.type = 'button';
    function paint(isOpen) {
      b.textContent = '';
      // Core's icon also without icons (the characters ▾ ▴ only where no sprite is on the page)
      b.appendChild(G.icon(isOpen ? 'angle-up' : 'angle-down', isOpen ? '\u25B4' : '\u25BE', 14)); b.classList.add('gk-gui-stuff-fold-icon');
      b.appendChild(document.createTextNode(' ' + (isOpen ? less : more)));
      b.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
    paint(open);
    b.paint = paint;
    return b;
  }

  // height: clamp an element taller than the limit (or always, when startClosed)
  function byHeight(key, selector, more, less, startClosed) {
    document.querySelectorAll(selector).forEach(function (el, i) {
      if (el.dataset.gkGuiStuffFold) return;
      // Never a fold inside a fold: a text is cut after a block it contains (a code block, already short by its
      // own fold, a table, a picture), never through it. The limit moves down to the block's lower edge.
      var limit = maxH;
      if (!startClosed) {
        var top = el.getBoundingClientRect().top;
        el.querySelectorAll('.pre-wrapper, table, img, blockquote').forEach(function (k) {
          var r = k.getBoundingClientRect(), from = r.top - top, to = r.bottom - top;
          if (from < limit && to > limit - 24) limit = Math.ceil(to) + 30; // room for the shade, so that it does not lie over the block's own bar
        });
      }
      if (!startClosed && el.scrollHeight <= limit + Math.max(80, maxH * 0.25)) return; // a little over the limit is not worth a button
      el.dataset.gkGuiStuffFold = key;
      var open = G.get(memKey(key, i)) === '1';
      var b = button(open, more, less);
      function apply() {
        el.classList.toggle('gk-gui-stuff-fold', !open);
        el.style.maxBlockSize = open ? '' : (startClosed ? '0px' : limit + 'px');
        el.classList.toggle('gk-gui-stuff-fold-closed', !open && !!startClosed);
        b.paint(open);
      }
      b.addEventListener('click', function () { open = !open; G.set(memKey(key, i), open ? '1' : null); apply(); });
      apply();
      attach(el, b);
    });
  }

  // The button is part of what it folds: a bar in the block's own width, sitting on its lower edge with no gap,
  // so that it is seen to belong to that block and not to the page
  function attach(el, b) {
    var cs = window.getComputedStyle(el);
    b.classList.add('gk-gui-stuff-fold-bar');
    b.style.marginInlineStart = cs.marginLeft; b.style.marginInlineEnd = cs.marginRight;
    b.style.marginBlockEnd = cs.marginBottom;
    if (parseFloat(cs.borderBottomWidth) > 0) { b.classList.add('gk-gui-stuff-fold-bar-framed'); b.style.borderColor = cs.borderBottomColor; b.style.background = cs.backgroundColor; }
    el.classList.add('gk-gui-stuff-fold-host');
    el.insertAdjacentElement('afterend', b);
  }

  // count: hide the rows beyond the limit
  function byCount(key, selector, rowSelector, moreKey, less) {
    document.querySelectorAll(selector).forEach(function (box, i) {
      if (box.dataset.gkGuiStuffFold) return;
      var rows = box.querySelectorAll(rowSelector);
      if (rows.length <= maxFiles + 1) return;
      box.dataset.gkGuiStuffFold = key;
      var open = G.get(memKey(key, i)) === '1';
      var b = button(open, G.t(moreKey, { count: rows.length }), less);
      function apply() {
        rows.forEach(function (r, n) { r.classList.toggle('gk-gui-stuff-fold-row', !open && n >= maxFiles); });
        b.paint(open);
      }
      b.addEventListener('click', function () { open = !open; G.set(memKey(key, i), open ? '1' : null); apply(); });
      apply();
      attach(box, b);
    });
  }

  G.onContent(function () {
    var more = G.t('fold_more'), less = G.t('fold_less');
    // code first, so that a text is measured with its code blocks already short
    if (G.on('code_blocks')) byHeight('code', '.wiki pre', more, less);
    if (G.on('long_fields')) byHeight('long_fields', 'div.issue .description > .wiki', more, less);
    if (G.on('private_notes_collapse')) byHeight('private', '#history .journal.private-notes .wiki', G.t('fold_private'), less, true);
    if (G.on('notes_collapse')) byHeight('notes', '#history .journal:not(.private-notes) .wiki, #history .journal.private-notes .wiki:not([data-gk-gui-stuff-fold])', more, less);
    if (G.on('attachments_collapse')) {
      // the newest first when the instance says so (Values): core lists them oldest first; the rows are only moved,
      // before the fold counts them, so the short list shows the newest
      if (o.newest) {
        document.querySelectorAll('div.issue .attachments table').forEach(function (t) {
          if (t.dataset.gkGuiStuffNewest) return;
          t.dataset.gkGuiStuffNewest = '1';
          var body = t.tBodies[0] || t;
          Array.prototype.slice.call(body.rows).reverse().forEach(function (r) { body.appendChild(r); });
        });
      }
      byCount('attachments', 'div.issue .attachments', 'table tr, p', 'fold_files', less);
    }
  });
})();
