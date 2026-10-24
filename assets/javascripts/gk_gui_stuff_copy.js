// gk_gui_stuff copy: one click copies, and the same notice says so. mailto_copy: a small button after every
// mail link copies the address (the link still opens the mail program). inline_copy: a click on inline code in
// rendered text copies it; with the keyboard, Enter on the focused code.
(function () {
  var G = window.GkGui;
  if (!G) return;
  G.onContent(function () {
    if (G.on('mailto_copy')) {
      document.querySelectorAll('#content a[href^="mailto:"]:not([data-gk-gui-stuff-copy])').forEach(function (a) {
        a.dataset.gkGuiStuffCopy = '1';
        var address = decodeURIComponent(a.getAttribute('href').slice(7).split('?')[0]);
        if (!address) return;
        var b = G.put(G.node('button', 'gk-gui-stuff-copy-btn'), 'copy', '\u29C9', 14);
        b.type = 'button';
        b.title = G.t('copy_address');
        b.setAttribute('aria-label', G.t('copy_address') + ': ' + address);
        b.addEventListener('click', function (e) { e.preventDefault(); G.copy(address, G.t('copied_mail')); });
        a.insertAdjacentElement('afterend', b);
      });
    }
    // code_copy: core already has a copy button on code blocks, shown only while the pointer is over the block
    // and answering with a changed icon. Here it is always there, reachable with the keyboard, and answers
    // with the same notice as every other copy. Core's button does the copying; nothing is replaced.
    if (G.on('code_copy')) {
      document.querySelectorAll('.pre-wrapper a.copy-pre-content-link:not([data-gk-gui-stuff-copy])').forEach(function (a) {
        a.dataset.gkGuiStuffCopy = '1';
        a.classList.add('gk-gui-stuff-copy-pre');
        if (!a.hasAttribute('href')) { a.tabIndex = 0; a.setAttribute('role', 'button'); }
        a.setAttribute('aria-label', G.t('copy_code'));
        a.title = G.t('copy_code');
        a.addEventListener('click', function () {
          G.whisper(G.t('copied_block'));
        });
        a.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); a.click(); } });
      });
    }
    if (G.on('inline_copy')) {
      document.querySelectorAll('.wiki code:not([data-gk-gui-stuff-copy])').forEach(function (c) {
        if (c.closest('pre') || c.closest('a')) return;
        c.dataset.gkGuiStuffCopy = '1';
        c.classList.add('gk-gui-stuff-copy-code');
        c.title = G.t('copy_click');
        c.tabIndex = 0;
        c.setAttribute('role', 'button');
        c.addEventListener('click', function () { G.copy(c.textContent, G.t('copied_code')); });
        c.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); G.copy(c.textContent, G.t('copied_code')); } });
      });
    }
  });
})();
