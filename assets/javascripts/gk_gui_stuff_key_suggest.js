// gk_gui_stuff key_suggest.
// A key field says where its name is written: data-gk-gui-stuff-key-from="<the name field's id>", and may say its longest
// length (data-gk-gui-stuff-key-max) and some keys of the same kind (data-gk-gui-stuff-key-examples="a, b, c"). While the key is empty
// or still what was suggested, it follows the name: small letters, å ä ö as a a o, other letters without their marks,
// everything else as one underscore, starting with a letter. Once the person writes the key themselves it is theirs.
// A line under the field shows how other keys of the kind look. Without this module the attributes do nothing.
(function () {
  var G = window.GkGui;
  if (!G || !G.on('key_suggest')) return;

  function slug(text, max) {
    var s = String(text || '').toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o');
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    s = s.replace(/[^a-z0-9]+/g, '_').replace(/^[^a-z]+/, '').replace(/_+$/, '');
    if (max > 0 && s.length > max) s = s.slice(0, max).replace(/_+$/, '');
    return s;
  }

  G.onContent(function (root) {
    root.querySelectorAll('input[data-gk-gui-stuff-key-from]').forEach(function (key) {
      if (key.dataset.gkGuiStuffKeyBound) return;
      key.dataset.gkGuiStuffKeyBound = '1';
      var examples = (key.dataset.gkGuiStuffKeyExamples || '').trim();
      if (examples) {
        var line = document.createElement('em');
        line.className = 'info gk-gui-stuff-key-examples';
        line.style.display = 'block';
        line.textContent = G.t('key_hint', { list: examples });
        key.insertAdjacentElement('afterend', line);
      }
      if (key.disabled || key.readOnly) return;
      var name = document.getElementById(key.dataset.gkGuiStuffKeyFrom);
      if (!name) return;
      var max = parseInt(key.dataset.gkGuiStuffKeyMax || '0', 10);
      var last = key.value === '' ? '' : null; // null: the key was there before, it is not ours to change
      var follow = function () {
        if (last === null || key.value !== last) return;
        last = slug(name.value, max);
        key.value = last;
      };
      key.addEventListener('input', function () { last = key.value === '' ? '' : null; if (last === '') follow(); });
      name.addEventListener('input', follow);
      if (name.value) follow();
    });
  });
})();
