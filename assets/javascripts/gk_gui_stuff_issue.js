// gk_gui_stuff issue: two small things on the issue page.
// quick_done: a second button beside Spara that also sets % klart to 100 (only when the form has that field).
// parent_link: the parent issue also stands above the subtasks (or at the top of the related issues when the page has
// no box of subtasks), so it is found where one looks for what the issue hangs together with, not only above the subject.
(function () {
  var G = window.GkGui;
  if (!G) return;
  // the instance may tie a status to the quick button per tracker: the issue is then also given that status, when the
  // workflow lets this person set it from here (the status is among the form's choices)
  function target(form) {
    var map = G.opt('quick_done').status || {};
    var tr = form.querySelector('#issue_tracker_id'), st = form.querySelector('#issue_status_id');
    // core draws the tracker select only for someone who may change it; else the issue's own tracker-<id> class
    var cls = !tr && /\btracker-(\d+)\b/.exec((document.querySelector('div.issue.details') || {}).className || '');
    var id = map[tr ? tr.value : (cls && cls[1])];
    return id && st && st.querySelector('option[value="' + id + '"]') ? { select: st, id: String(id) } : null;
  }
  // the tip names the word on the form's own button (core's Skicka, or Spara with core_stuff's submit_word), so it
  // always says what the click does
  function tip(form, b) {
    var goal = target(form), word = form.querySelector('input[type="submit"][name="commit"]').value, names = G.opt('quick_done').names || {};
    b.title = goal ? G.t('quick_done_title_status', { status: names[goal.id] || '', button: word }) : G.t('quick_done_title', { button: word });
  }
  // core's own tip (setupHoverTooltips) reads the title, and keeps it empty while it shows so that the browser's tip
  // does not come too; written then, the title would bring that second tip. So the title is never written while core's
  // tip is up, and core's tip, on the pointer as on the focus, reads what the last pass over the page wrote
  function freshTip(form, b) { if (b.getAttribute('title')) tip(form, b); }
  G.onContent(function () {
    if (G.on('quick_done')) {
      var form = document.getElementById('issue-form');
      var ratio = form && form.querySelector('#issue_done_ratio');
      var submit = form && form.querySelector('input[type="submit"][name="commit"]');
      // core draws the form's attributes anew when the status changes, and the workflow may then leave the field out:
      // the button stands only while the field can take the value
      var done = form && form.querySelector('.gk-gui-stuff-quick-done');
      if (done) {
        done.classList.toggle('hidden', !(ratio && ratio.querySelector('option[value="100"]')));
        // the pass comes after core's redraw, so the tip is counted on the choices that now stand in the form
        freshTip(form, done);
      }
      if (ratio && submit && !form.dataset.gkGuiStuffQuickDone && ratio.querySelector('option[value="100"]') && form.closest('#update')) {
        form.dataset.gkGuiStuffQuickDone = '1';
        // the same kind of button as core's own (an input of type submit with the same attributes), so that it
        // looks, focuses, disables and submits exactly as "Skicka" does; it only sets the field first
        var b = submit.cloneNode(false);
        b.removeAttribute('id');
        // the button is ours: what a look did to core's button is not copied, and no look renames it afterwards
        b.removeAttribute('data-gk-core-stuff-effect');
        b.dataset.gkCoreStuffWord = '1';
        b.classList.add('gk-gui-stuff-quick-done');
        G.effect(b, 'quick_done');
        b.value = G.t('quick_done');
        if (b.dataset.disableWith) b.dataset.disableWith = G.t('quick_done');
        b.dataset.gkGuiStuffWord = '1';
        tip(form, b);
        // a redraw while core's tip was up left the title as it was: it is brought up to date when core's tip has closed
        ['mouseleave', 'blur'].forEach(function (k) { b.addEventListener(k, function () { setTimeout(function () { freshTip(form, b); }, 0); }); });
        // the field is asked for at the click, as in target(): the one found when the button was built may be gone
        b.addEventListener('click', function () { var r = form.querySelector('#issue_done_ratio'); if (r) r.value = '100'; var g = target(form); if (g) g.select.value = g.id; });
        submit.insertAdjacentElement('afterend', b);
      }
    }
    if (G.on('parent_link')) {
      // The parent comes with the page (window.gkGuiStuffPage.data.issue_parent: its address, its link text, core's
      // classes for the issue and its subject), never from core's chain of links above the subject: which link is the
      // nearest parent and which text is its subject is the server's to say
      var parent = ((window.gkGuiStuffPage || {}).data || {}).issue_parent;
      // above Underaktiviteter (the hierarchy it belongs to); in Relaterade ärenden only when there is no such box
      var box = document.getElementById('issue_tree') || document.getElementById('relations');
      // decided from what the box holds now, never from a mark on the box: core draws #relations anew (a relation
      // added or removed) inside the same element, and the line must come back then
      if (parent && parent.url && box && !box.querySelector('.gk-gui-stuff-parent')) {
        var p = G.effect(G.node('p', 'gk-gui-stuff-parent'), 'parent_link');
        // collapse_all leaves it standing when the box is folded (it is not the box's body)
        p.setAttribute('data-gk-gui-stuff-section-keep', '');
        // each part with its own class, for a theme to style (gk-gui-stuff-parent-label, -link, -subject)
        p.appendChild(G.node('strong', 'gk-gui-stuff-parent-label', G.t('parent') + ': '));
        // core's look of an issue link: its classes (issue, tracker, status, closed ...) as core gives them
        var a = G.node('a', ((parent.classes || 'issue') + ' gk-gui-stuff-parent-link').trim(), parent.text || '');
        a.href = parent.url;
        p.appendChild(a);
        if (parent.subject) p.appendChild(G.node('span', 'gk-gui-stuff-parent-subject', ': ' + parent.subject));
        box.insertAdjacentElement('afterbegin', p);
      }
    }
  });
})();
