// gk_gui_stuff issue: two small things on the issue page.
// quick_done: a second button beside Spara that also sets % klart to 100 (only when the form has that field).
// parent_link: the parent issue also stands above the subtasks (or at the top of the related issues when the page has
// no box of subtasks), so it is found where one looks for what the issue hangs together with, not only above the subject.
(function () {
  var G = window.GkGui;
  if (!G) return;
  G.onContent(function () {
    if (G.on('quick_done')) {
      var form = document.getElementById('issue-form');
      var ratio = form && form.querySelector('#issue_done_ratio');
      var submit = form && form.querySelector('input[type="submit"][name="commit"]');
      if (ratio && submit && !form.dataset.gkGuiStuffQuickDone && ratio.querySelector('option[value="100"]') && form.closest('#update')) {
        form.dataset.gkGuiStuffQuickDone = '1';
        // the same kind of button as core's own (an input of type submit with the same attributes), so that it
        // looks, focuses, disables and submits exactly as "Skicka" does; it only sets the field first
        var b = submit.cloneNode(false);
        b.removeAttribute('id');
        b.classList.add('gk-gui-stuff-quick-done');
        b.value = G.t('quick_done');
        if (b.dataset.disableWith) b.dataset.disableWith = G.t('quick_done');
        b.dataset.gkGuiStuffWord = '1';
        // the instance may tie a status to the button per tracker: the issue is then also given that status,
        // when the workflow lets this person set it from here (the status is among the form's choices)
        var map = G.opt('quick_done').status || {}, names = G.opt('quick_done').names || {};
        function target() {
          var tr = form.querySelector('#issue_tracker_id'), st = form.querySelector('#issue_status_id');
          var id = tr && map[tr.value];
          return id && st && st.querySelector('option[value="' + id + '"]') ? { select: st, id: String(id) } : null;
        }
        // the tip names the word on the form's own button when it is read (core's Skicka, or Spara with core_stuff's
        // submit_word), so it always says what the click does
        function tip() {
          var goal = target(), word = submit.value;
          b.title = goal ? G.t('quick_done_title_status', { status: names[goal.id] || '', button: word }) : G.t('quick_done_title', { button: word });
        }
        tip();
        ['mouseenter', 'focus'].forEach(function (k) { b.addEventListener(k, tip); });
        b.addEventListener('click', function () { ratio.value = '100'; var g = target(); if (g) g.select.value = g.id; });
        submit.insertAdjacentElement('afterend', b);
      }
    }
    if (G.on('parent_link')) {
      var issue = document.querySelector('div.issue');
      var tree = issue && issue.querySelector('.subject');
      var links = tree ? tree.querySelectorAll('p > a.issue') : [];
      // above Underaktiviteter (the hierarchy it belongs to); in Relaterade ärenden only when there is no such box
      var box = document.getElementById('issue_tree') || document.getElementById('relations');
      if (links.length && box && !box.dataset.gkGuiStuffParent) {
        box.dataset.gkGuiStuffParent = '1';
        var parent = links[links.length - 1];
        var p = G.node('p', 'gk-gui-stuff-parent');
        // each part with its own class, for a theme to style (gk-gui-stuff-parent-label, -link, -subject)
        p.appendChild(G.node('strong', 'gk-gui-stuff-parent-label', G.t('parent') + ': '));
        var a = parent.cloneNode(true);
        a.classList.add('gk-gui-stuff-parent-link');
        p.appendChild(a);
        var rest = parent.parentElement.textContent.replace(parent.textContent, '');
        if (rest) p.appendChild(G.node('span', 'gk-gui-stuff-parent-subject', rest));
        box.insertAdjacentElement('afterbegin', p);
      }
    }
  });
})();
