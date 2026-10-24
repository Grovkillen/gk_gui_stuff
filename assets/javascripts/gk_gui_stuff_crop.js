// gk_gui_stuff image_crop.
// A square part of a picture chosen in the browser, for pictures of users and anything else square. The box is
// <div data-gk-gui-stuff-crop data-out="256"> around a file field, and says where the result goes:
//   data-out-field="<name>"   the chosen part, drawn at data-out pixels, as a PNG data URL (the big file is not sent:
//                             the file field is switched off when the form is sent)
//   data-region-x/-y/-s="<name>" the part as fractions of the picture (left, top, side of the square), 0 to 1
//   data-src="<url>"          a picture already on the server to choose a part of, without a file (only the part is sent)
// The part is moved by dragging or with the arrow keys, and made larger or smaller with the slider, the wheel or + and -.
// Without this module the file field is sent as it is and the server takes the middle square.
(function () {
  var G = window.GkGui;
  if (!G || !G.on('image_crop')) return;

  var STAGE = 320;

  function bind(box) {
    if (box.dataset.gkGuiStuffCropBound) return;
    box.dataset.gkGuiStuffCropBound = '1';
    var form = box.closest('form');
    var file = box.querySelector('input[type=file]');
    var out = parseInt(box.dataset.out || '256', 10);
    var field = function (name) {
      if (!name || !form) return null;
      var f = form.querySelector('input[type=hidden][name="' + name + '"]');
      if (!f) { f = document.createElement('input'); f.type = 'hidden'; f.name = name; box.appendChild(f); }
      return f;
    };
    var outField = field(box.dataset.outField);
    var rx = field(box.dataset.regionX), ry = field(box.dataset.regionY), rs = field(box.dataset.regionS);

    var wrap = document.createElement('div');
    wrap.className = 'gk-gui-stuff-crop-stage';
    wrap.hidden = true;
    var canvas = document.createElement('canvas');
    canvas.width = STAGE; canvas.height = STAGE;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', G.t('crop_hint'));
    var size = document.createElement('input');
    size.type = 'range'; size.min = '10'; size.max = '100'; size.value = '100';
    size.setAttribute('aria-label', G.t('crop_size'));
    var hint = document.createElement('em');
    hint.className = 'info';
    hint.textContent = G.t('crop_hint');
    wrap.appendChild(canvas); wrap.appendChild(size); wrap.appendChild(hint);
    box.appendChild(wrap);

    var ctx = canvas.getContext('2d');
    var img = null, scale = 1, ox = 0, oy = 0; // the picture fitted in the stage
    var sel = { x: 0, y: 0, s: 0 };           // the square in the picture's own pixels

    function clamp() {
      var min = Math.min(img.naturalWidth, img.naturalHeight);
      sel.s = Math.max(8, Math.min(sel.s, min));
      sel.x = Math.max(0, Math.min(sel.x, img.naturalWidth - sel.s));
      sel.y = Math.max(0, Math.min(sel.y, img.naturalHeight - sel.s));
    }

    function draw() {
      ctx.clearRect(0, 0, STAGE, STAGE);
      ctx.drawImage(img, ox, oy, img.naturalWidth * scale, img.naturalHeight * scale);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      var x = ox + sel.x * scale, y = oy + sel.y * scale, s = sel.s * scale;
      ctx.beginPath();
      ctx.rect(0, 0, STAGE, STAGE);
      ctx.rect(x, y, s, s);
      ctx.fill('evenodd');
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
      if (rx) rx.value = (sel.x / img.naturalWidth).toFixed(5);
      if (ry) ry.value = (sel.y / img.naturalHeight).toFixed(5);
      if (rs) rs.value = (sel.s / Math.min(img.naturalWidth, img.naturalHeight)).toFixed(5);
    }

    function load(src, region) {
      var i = new Image();
      i.onload = function () {
        img = i;
        scale = Math.min(STAGE / i.naturalWidth, STAGE / i.naturalHeight);
        ox = (STAGE - i.naturalWidth * scale) / 2;
        oy = (STAGE - i.naturalHeight * scale) / 2;
        var min = Math.min(i.naturalWidth, i.naturalHeight);
        if (region) {
          sel = { x: region.x * i.naturalWidth, y: region.y * i.naturalHeight, s: region.s * min };
        } else {
          sel = { s: min, x: (i.naturalWidth - min) / 2, y: (i.naturalHeight - min) / 2 };
        }
        clamp();
        size.value = String(Math.round(sel.s / min * 100));
        wrap.hidden = false;
        draw();
      };
      i.src = src;
    }

    function resize(pct) {
      if (!img) return;
      var min = Math.min(img.naturalWidth, img.naturalHeight);
      var cx = sel.x + sel.s / 2, cy = sel.y + sel.s / 2;
      sel.s = min * Math.max(10, Math.min(100, pct)) / 100;
      sel.x = cx - sel.s / 2; sel.y = cy - sel.s / 2;
      clamp(); size.value = String(Math.round(sel.s / min * 100)); draw();
    }

    var drag = null;
    canvas.addEventListener('pointerdown', function (e) {
      if (!img) return;
      drag = { x: e.clientX, y: e.clientY, sx: sel.x, sy: sel.y };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      sel.x = drag.sx + (e.clientX - drag.x) / scale;
      sel.y = drag.sy + (e.clientY - drag.y) / scale;
      clamp(); draw();
    });
    canvas.addEventListener('pointerup', function () { drag = null; });
    canvas.addEventListener('wheel', function (e) {
      if (!img) return;
      e.preventDefault();
      resize(parseInt(size.value, 10) + (e.deltaY < 0 ? -5 : 5));
    }, { passive: false });
    canvas.addEventListener('keydown', function (e) {
      if (!img) return;
      var step = sel.s / 20, k = e.key;
      if (k === 'ArrowLeft') sel.x -= step; else if (k === 'ArrowRight') sel.x += step;
      else if (k === 'ArrowUp') sel.y -= step; else if (k === 'ArrowDown') sel.y += step;
      else if (k === '+') { resize(parseInt(size.value, 10) + 5); e.preventDefault(); return; }
      else if (k === '-') { resize(parseInt(size.value, 10) - 5); e.preventDefault(); return; }
      else return;
      e.preventDefault(); clamp(); draw();
    });
    size.addEventListener('input', function () { resize(parseInt(size.value, 10)); });

    if (file) {
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () { load(reader.result, null); };
        reader.readAsDataURL(f);
      });
    }
    if (box.dataset.src) {
      var region = null;
      if (rx && rx.value && ry && ry.value && rs && rs.value) region = { x: +rx.value, y: +ry.value, s: +rs.value };
      load(box.dataset.src, region);
    }

    if (form) {
      form.addEventListener('submit', function () {
        if (!img || !outField || !(file && file.files && file.files[0])) return;
        var c = document.createElement('canvas');
        c.width = out; c.height = out;
        c.getContext('2d').drawImage(img, sel.x, sel.y, sel.s, sel.s, 0, 0, out, out);
        outField.value = c.toDataURL('image/png');
        file.disabled = true; // the small part is sent, never the file
      });
    }
  }

  G.onContent(function (root) {
    root.querySelectorAll('[data-gk-gui-stuff-crop]').forEach(bind);
  });
})();
