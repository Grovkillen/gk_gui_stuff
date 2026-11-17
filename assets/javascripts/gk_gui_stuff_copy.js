// gk_gui_stuff copy: one click copies, and the same notice says so. mailto_copy: a small button after every
// mail link copies the address (the link still opens the mail program). mailto_issue: on an issue page an envelope
// before it opens a mail with the issue's subject filled in. inline_copy: a click on inline code in
// rendered text copies it; with the keyboard, Enter on the focused code.
(function () {
  var G = window.GkGui;
  if (!G) return;
  // core_copy_whisper: what Redmine's own buttons copy is confirmed with the whisper, also a button a later version
  // brings. Found at the browser's two ways of copying, never by the button: core has several copy functions of its own
  // and they differ between the series. The answer core waits for never comes, so that its own answer (the check mark) is
  // not given. A browser that refuses is answered here, by the older way, for the same reason. On a page without
  // navigator.clipboard (plain http) the same function stands in its place, so that core takes the same road. A copy of
  // GK's own goes through G.ownCopy.
  if (G.on('core_copy_whisper')) {
    var fromEvent = function () {
      var t = window.event && window.event.target;
      return t && t.closest ? (t.closest('a, button, [role="button"]') || t) : null;
    };
    // a frame later: a menu the button stood in has closed by then, and the whisper goes to the pointer
    var say = function (from) {
      window.requestAnimationFrame(function () {
        var inBlock = from && from.closest('.pre-wrapper'), shown = from && from.isConnected && from.getBoundingClientRect().width;
        G.whisper(G.t(inBlock ? 'copied_block' : 'copied'), { at: shown ? from : null, place: shown ? undefined : 'pointer' });
      });
    };
    var command = document.execCommand.bind(document);
    var byCommand = function (text) {
      var ta = document.createElement('textarea'), done = false;
      ta.value = text; ta.className = 'gk-gui-stuff-offscreen';
      document.body.appendChild(ta); ta.select();
      try { done = command('copy'); } catch (e) { done = false; }
      ta.remove();
      return done;
    };
    var board = navigator.clipboard, write = board && board.writeText ? board.writeText.bind(board) : null;
    var writeText = function (text) {
      if (G.owningCopy()) {
        if (write) return write(text);
        return byCommand(text) ? Promise.resolve() : Promise.reject(new Error('not copied'));
      }
      var from = fromEvent(), first = write ? write(text) : Promise.reject(new Error('no clipboard'));
      return new Promise(function (_, refused) {
        first.then(function () { say(from); }, function (why) {
          if (byCommand(text)) say(from); else refused(why);
        });
      });
    };
    if (write) board.writeText = writeText;
    else if (!board) Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: writeText } });
    document.execCommand = function (name) {
      var from = fromEvent(), result = command.apply(document, arguments);
      if (name === 'copy' && result && !G.owningCopy()) say(from);
      return result;
    };
  }
  G.onContent(function () {
    // The tools after a mail link, in one piece that never breaks away from the address (.gk-gui-stuff-mail-tools):
    // mailto_issue's envelope first, then mailto_copy's copy button, both icon buttons. The address itself stays core's
    // plain mailto and says so in its tooltip; each tool says what it does in its own. mailto_issue: only where the
    // page's data gives the issue's mail subject (window.gkGuiStuffPage.data.issue_mail, PageFacts: the issue page,
    // the subject as Redmine's own notifications write it), never in a link's preview card, which is another page's text.
    var mail = ((window.gkGuiStuffPage || {}).data || {}).issue_mail;
    var withIssue = G.on('mailto_issue') && mail && mail.subject, withCopy = G.on('mailto_copy');
    if (withIssue || withCopy) {
      // never the tools' own envelope (itself a mailto link): marked as done when made, and left out by its place, so
      // that a later pass (onContent runs again on every change in #content) never gives it tools of its own
      document.querySelectorAll('#content a[href^="mailto:"]:not([data-gk-gui-stuff-copy])').forEach(function (a) {
        if (a.closest('.gk-gui-stuff-mail-tools')) return;
        a.dataset.gkGuiStuffCopy = '1';
        var href = a.getAttribute('href'), raw = href.slice(7).split('?')[0], address;
        try { address = decodeURIComponent(raw); } catch (e) { address = raw; }
        if (!address) return;
        var tools = G.node('span', 'gk-gui-stuff-mail-tools');
        if (withIssue && !a.closest('.gk-gui-stuff-preview')) {
          // the link's own fields (cc, body) are kept; only the subject is the issue's
          var query = (href.split('?')[1] || '').split('&').filter(function (p) { return p && !/^subject=/i.test(p); });
          var m = G.iconButton({ icon: 'email', fallback: '\u2709', className: 'gk-gui-stuff-mail-issue',
                                 href: 'mailto:' + raw + '?' + ['subject=' + encodeURIComponent(mail.subject)].concat(query).join('&'),
                                 label: G.t('mail_issue', { address: address, subject: mail.subject }) });
          m.dataset.gkGuiStuffCopy = '1';
          G.effect(m, 'mailto_issue');
          a.classList.add('gk-gui-stuff-mail-issue-on');
          tools.appendChild(m);
        }
        if (withCopy) {
          var b = G.iconButton({ icon: 'copy', fallback: '\u29C9', className: 'gk-gui-stuff-copy-btn', label: G.t('copy_address_of', { address: address }),
                                 onClick: function (e) { e.preventDefault(); G.copy(address, G.t('copied_mail'), b); } });
          G.effect(b, 'mailto_copy');
          tools.appendChild(b);
        }
        if (!tools.firstChild) return;
        // the address's own words: "without a subject" only where that is so and an envelope with one stands beside it;
        // a link that brings its own subject, or stands with the copy button alone, just writes to the address
        var ownSubject = /(^|&)subject=/i.test(href.split('?')[1] || '');
        if (!a.title) a.title = G.t(!ownSubject && tools.querySelector('.gk-gui-stuff-mail-issue') ? 'mail_write' : 'mail_write_plain', { address: address });
        a.classList.add('gk-gui-stuff-mail-tools-on');
        a.insertAdjacentElement('afterend', tools);
      });
    }
    // code_copy: core already has a copy button on code blocks, shown only while the pointer is over the block
    // and answering with a changed icon. Here it is always there, reachable with the keyboard, and answers
    // with the same notice as every other copy. Core's button does the copying; nothing is replaced.
    if (G.on('code_copy')) {
      document.querySelectorAll('.pre-wrapper a.copy-pre-content-link:not([data-gk-gui-stuff-copy])').forEach(function (a) {
        a.dataset.gkGuiStuffCopy = '1';
        a.classList.add('gk-gui-stuff-copy-pre');
        G.effect(a, 'code_copy');
        if (!a.hasAttribute('href')) { a.tabIndex = 0; a.setAttribute('role', 'button'); }
        a.setAttribute('aria-label', G.t('copy_code'));
        a.title = G.t('copy_code');
        a.addEventListener('click', function () {
          if (!G.on('core_copy_whisper')) G.whisper(G.t('copied_block'), a);
        });
        a.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); a.click(); } });
      });
    }
    if (G.on('inline_copy')) {
      document.querySelectorAll('.wiki code:not([data-gk-gui-stuff-copy])').forEach(function (c) {
        if (c.closest('pre') || c.closest('a')) return;
        c.dataset.gkGuiStuffCopy = '1';
        c.classList.add('gk-gui-stuff-copy-code');
        G.effect(c, 'inline_copy');
        c.title = G.t('copy_click');
        c.tabIndex = 0;
        c.setAttribute('role', 'button');
        c.addEventListener('click', function () { G.copy(c.textContent, G.t('copied_code'), c); });
        c.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); G.copy(c.textContent, G.t('copied_code'), c); } });
      });
    }
  });
})();
