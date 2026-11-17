// gk_gui_stuff: the instance band's copy button. The band's name as a button (core.rb, instance_band, which loads
// this file with the band) copies the instance's tag from its data-tag and says data-done on itself for a moment; GK
// says the copy itself (GkGui.ownCopy), so the copy whisper leaves it alone. Bound once on the document, so that the
// band works wherever it is drawn, the login page included. Plain DOM, no jQuery.
(function () {
  var G = window.GkGui;
  if (G.instanceCopy) return; // a band drawn twice loads this twice
  G.instanceCopy = true;
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button.gk-gui-stuff-instance-copy');
    if (!b) return;
    var t = b.getAttribute('data-tag') || '', n = b._gkGuiWord || (b._gkGuiWord = b.textContent);
    var ok = function () { b.textContent = b.getAttribute('data-done') || n; setTimeout(function () { b.textContent = n; }, 1400); };
    if (navigator.clipboard && window.isSecureContext) {
      G.ownCopy(function () { navigator.clipboard.writeText(t).then(ok, function () { /* nothing copied, nothing said */ }); });
      return;
    }
    var a = document.createElement('textarea');
    a.value = t; a.style.position = 'fixed'; a.style.top = '-1000px';
    document.body.appendChild(a); a.select();
    try { if (G.ownCopy(function () { return document.execCommand('copy'); })) ok(); } catch (err) { /* nothing copied, nothing said */ }
    a.remove();
  });
})();
