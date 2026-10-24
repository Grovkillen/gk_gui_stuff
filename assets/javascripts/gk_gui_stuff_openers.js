// gk_gui_stuff openers: a button the server writes that opens a content in the shared surface, as a panel (large)
// or the whole screen (full). The server's markup, so that the page holds without script:
//   <div class="gk-gui-stuff-opener" data-gk-gui-stuff-open="panel|full" data-gk-gui-stuff-title="...">
//     <div class="gk-gui-stuff-opener-text">the text version, always shown</div>
//     <template class="gk-gui-stuff-opener-content">what the surface shows</template>
//     <button type="button" class="gk-gui-stuff-opener-button" hidden>label</button>
//   </div>
// The button is shown here. The surface closes with Close and Esc, and the focus goes back to the button. The
// content gets the event gk-gui-stuff:opened (bubbling, detail.opener) once it is in the page, so that a field
// type can draw in it (a map), and gk-gui-stuff:closed when the surface closes.
(function () {
  var G = window.GkGui;
  if (!G || !G.surface) return;

  function fire(el, name, opener) {
    var ev;
    try { ev = new CustomEvent(name, { bubbles: true, detail: { opener: opener } }); } catch (e) { return; }
    el.dispatchEvent(ev);
  }

  function open(opener) {
    var tpl = opener.querySelector('template.gk-gui-stuff-opener-content');
    if (!tpl) return;
    var box = document.createElement('div');
    box.className = 'gk-gui-stuff-opener-body';
    box.appendChild(tpl.content.cloneNode(true));
    var full = opener.getAttribute('data-gk-gui-stuff-open') === 'full';
    opener.classList.add('gk-gui-stuff-opener-open');
    G.surface.open({
      title: opener.getAttribute('data-gk-gui-stuff-title') || '',
      content: box,
      size: full ? 'full' : 'large',
      onClose: function () { opener.classList.remove('gk-gui-stuff-opener-open'); fire(opener, 'gk-gui-stuff:closed', opener); }
    });
    fire(box, 'gk-gui-stuff:opened', opener);
  }

  function bind(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('.gk-gui-stuff-opener'), function (opener) {
      if (opener.dataset.gkGuiStuffBound) return;
      var b = opener.querySelector('.gk-gui-stuff-opener-button');
      if (!b) return;
      opener.dataset.gkGuiStuffBound = '1';
      b.hidden = false;
      b.addEventListener('click', function () { open(opener); });
    });
  }

  G.opener = { open: open, bind: bind };
  if (G.onContent) G.onContent(bind); else bind(document);
})();
