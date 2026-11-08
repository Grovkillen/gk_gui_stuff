// gk_gui_stuff fold: something long is shown short with "visa allt". One primitive, several modules that are
// only declarations of where: long_fields (the description), notes_collapse (long notes), code_blocks,
// private_notes_collapse (private notes start closed) and attachments_collapse (many attachments). Remembers
// what was opened per place, locally. aria-expanded and a real button; never folded in print (stylesheet).
//
// The fold list's slot: another plugin's control first on a block's bar, beside its button, so that using it does not
// fold. From the server: an element with data-gk-gui-fold-slot-for="<the block's id>" is moved there when the block has
// its bar, whichever comes first; a block that gets no bar leaves the element where it stands, and the plugin decides
// where that is. From a script:
//   GkGui.fold.slot(block)        the block's slot; null when the block has no bar
//   GkGui.fold.fill(block, item)  puts item in the slot; false when the block has no bar
//   gk-gui-fold-bar               event from a block (it bubbles) when it has got its bar
//   gk-gui-fold-slot-left         event from an element in the slot (it bubbles) when its block went and no new bar took it;
//                                 it stands where the bar stood, and the plugin decides where it goes
// GkGui.fold is there only with one of the fold's rows on; without it there is no bar.
(function () {
  var G = window.GkGui;
  if (!G) return;
  var o = G.opt('fold'), maxH = o.height || 320, maxFiles = o.attachments || 6;
  var page = location.pathname;
  // each fold's setting, for the effect mark on the block it folds and on its button
  var SETTING = { code: 'code_blocks', long_fields: 'long_fields', private: 'private_notes_collapse', notes: 'notes_collapse',
                  attachments: 'attachments_collapse' };
  function mark(key, el, b) { G.effect(el, SETTING[key]); G.effect(b, SETTING[key]); }

  // What is remembered is keyed on what the block is, not on its number on the page: the nearest thing core names on
  // purpose around it (a journal's id change-<n>, a section's data-section, any element's id), and only within that
  // its number among the blocks of the same kind. A new note, a history tab that hides some, or a block more elsewhere
  // on the page then never moves an opened block's memory to another one.
  function memKey(key, el) {
    var host = el.parentElement && el.parentElement.closest('[id], [data-section]');
    var name = host ? (host.id || 'section-' + host.getAttribute('data-section')) : '';
    var scope = host || document, n = 0;
    scope.querySelectorAll('[data-gk-gui-stuff-fold="' + key + '"]').forEach(function (x, i) { if (x === el) n = i; });
    return 'fold.' + page + '.' + key + '.' + name + '.' + n;
  }

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
    document.querySelectorAll(selector).forEach(function (el) {
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
      var mem = memKey(key, el), open = G.get(mem) === '1';
      var b = button(open, more, less);
      mark(key, el, b);
      function apply() {
        el.classList.toggle('gk-gui-stuff-fold', !open);
        el.style.maxBlockSize = open ? '' : (startClosed ? '0px' : limit + 'px');
        el.classList.toggle('gk-gui-stuff-fold-closed', !open && !!startClosed);
        b.paint(open);
      }
      b.addEventListener('click', function () { open = !open; G.set(mem, open ? '1' : null); apply(); });
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
    var framed = parseFloat(cs.borderBottomWidth) > 0;
    if (framed) { b.classList.add('gk-gui-stuff-fold-bar-framed'); b.style.borderColor = cs.borderBottomColor; b.style.background = cs.backgroundColor; }
    // a block with its own frame or background is not masked (the mask would fade the frame and background too):
    // its fade is drawn inside the frame in the colour behind the text, its own or the nearest one around it
    if (framed || !clear(cs.backgroundColor)) {
      el.classList.add('gk-gui-stuff-fold-framed');
      el.style.setProperty('--gk-gui-fold-bg', behind(el));
    }
    el.classList.add('gk-gui-stuff-fold-host');
    el.insertAdjacentElement('afterend', b);
    el._gkGuiFoldBar = b;
    b._gkGuiFoldBlock = el;
    el.dispatchEvent(new CustomEvent('gk-gui-fold-bar', { bubbles: true }));
  }
  // The slot is made when it is first asked for, so that a bar with nothing in it stays as it was. The bar's margins
  // from the block go over to the list around it.
  function slot(block) {
    var b = block && block._gkGuiFoldBar;
    if (!b || !b.isConnected) return null;
    if (b.parentElement.classList.contains('gk-gui-stuff-fold-list')) return b.previousElementSibling;
    var list = G.node('div', 'gk-gui-stuff-fold-list'), s = G.node('div', 'gk-gui-stuff-fold-slot');
    ['marginInlineStart', 'marginInlineEnd', 'marginBlockEnd'].forEach(function (k) { list.style[k] = b.style[k]; b.style[k] = ''; });
    b.insertAdjacentElement('beforebegin', list);
    list.appendChild(s);
    list.appendChild(b);
    return s;
  }
  function fill(block, item) {
    var s = slot(block);
    if (!s) return false;
    if (item.parentElement !== s) s.appendChild(item);
    // room for all that stands in it; a bar in a hidden tab keeps the stylesheet's room for one
    if (s.offsetWidth) s.nextElementSibling.style.paddingInline = (s.offsetWidth + 8) + 'px';
    return true;
  }
  function claim() {
    document.querySelectorAll('[data-gk-gui-fold-slot-for]').forEach(function (item) {
      fill(document.getElementById(item.getAttribute('data-gk-gui-fold-slot-for')), item);
    });
  }
  // A block can go while its bar stays: Redmine's answer to a changed note puts a new text in the old one's place. The bar
  // goes too, and what stood in its slot comes out to where the bar stood, for claim() to lay on a new bar. Returns those.
  function tidy() {
    var out = [];
    document.querySelectorAll('.gk-gui-stuff-fold-bar').forEach(function (b) {
      if (!b._gkGuiFoldBlock || b._gkGuiFoldBlock.isConnected) return;
      var list = b.parentElement;
      if (!list.classList.contains('gk-gui-stuff-fold-list')) { b.remove(); return; }
      Array.prototype.slice.call(b.previousElementSibling.children).forEach(function (item) {
        list.insertAdjacentElement('beforebegin', item);
        out.push(item);
      });
      list.remove();
    });
    return out;
  }
  G.fold = { slot: slot, fill: fill };
  function clear(c) {
    if (!c || c === 'transparent') return true;
    var m = c.match(/rgba?\(([^)]*)\)/);
    if (!m) return false;
    var p = m[1].split(/[\s,\/]+/).filter(Boolean);
    return p.length > 3 && parseFloat(p[3]) === 0;
  }
  function behind(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      var c = window.getComputedStyle(n).backgroundColor;
      if (!clear(c)) return c;
    }
    return 'Canvas';
  }

  // count: hide the rows beyond the limit
  function byCount(key, selector, rowSelector, moreKey, less) {
    document.querySelectorAll(selector).forEach(function (box) {
      if (box.dataset.gkGuiStuffFold) return;
      var rows = box.querySelectorAll(rowSelector);
      if (rows.length <= maxFiles + 1) return;
      box.dataset.gkGuiStuffFold = key;
      var mem = memKey(key, box), open = G.get(mem) === '1';
      var b = button(open, G.t(moreKey, { count: rows.length }), less);
      mark(key, box, b);
      function apply() {
        rows.forEach(function (r, n) { r.classList.toggle('gk-gui-stuff-fold-row', !open && n >= maxFiles); });
        b.paint(open);
      }
      b.addEventListener('click', function () { open = !open; G.set(mem, open ? '1' : null); apply(); });
      apply();
      attach(box, b);
    });
  }

  G.onContent(function () {
    var out = tidy();
    var more = G.t('fold_more'), less = G.t('fold_less');
    // code first, so that a text is measured with its code blocks already short; a still sample (the style guide,
    // Visa under Administration, Appearance) is Redmine's own and never folded
    if (G.on('code_blocks')) byHeight('code', '.wiki pre:not(.gk-gui-stuff-sg-still *)', more, less);
    if (G.on('long_fields')) byHeight('long_fields', 'div.issue .description > .wiki:not(.gk-gui-stuff-sg-still *)', more, less);
    if (G.on('private_notes_collapse')) byHeight('private', '#history .journal.private-notes .wiki', G.t('fold_private'), less, true);
    if (G.on('notes_collapse')) byHeight('notes', '#history .journal:not(.private-notes) .wiki, #history .journal.private-notes .wiki:not([data-gk-gui-stuff-fold])', more, less);
    if (G.on('attachments_collapse')) {
      // the newest first when the instance says so (Values): core lists them oldest first; the rows are only moved,
      // before the fold counts them, so the short list shows the newest
      if (o.newest) {
        document.querySelectorAll('div.issue .attachments').forEach(function (box) {
          if (box.dataset.gkGuiStuffNewest) return;
          box.dataset.gkGuiStuffNewest = '1';
          // each file row goes last in its own parent, in reverse: the order within the parent turns round
          Array.prototype.slice.call(box.querySelectorAll('[data-attachment-id]')).reverse().forEach(function (r) { r.parentNode.appendChild(r); });
        });
      }
      // a file is a row GK Core Stuff's anchor_marks marks with its attachment's id, at any depth in core's box of
      // attachments; without the marks there are no files to count and nothing folds
      byCount('attachments', 'div.issue .attachments', '[data-attachment-id]', 'fold_files', less);
    }
    claim();
    out.forEach(function (item) {
      if (!item.closest('.gk-gui-stuff-fold-slot')) item.dispatchEvent(new CustomEvent('gk-gui-fold-slot-left', { bubbles: true }));
    });
  });
})();
