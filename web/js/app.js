/* Application shell: sources, render loop, viewport, history, exports. */
(function (GF) {
  'use strict';

  const REPO = 'https://github.com/Talkdedsec/tlk-ascii';
  const SITE = 'https://talkdedsec.github.io/tlk-ascii/';
  const t = (k, v) => GF.i18n.t(k, v);
  const nm = (o) => GF.i18n.name(o);
  const $ = (sel, root) => (root || document).querySelector(sel);
  const { el } = GF.UI;
  const isDesktop = /Electron/i.test(navigator.userAgent);

  const S = Object.assign({}, GF.DEFAULTS);
  const renderer = new GF.Renderer();
  const out = $('#out');
  const before = $('#before');
  const frameBox = $('#frame');
  const viewport = $('#viewport');
  const stage = $('#stage');

  let source = null;
  let sourceToken = 0;
  let dirty = true;
  let playing = true;
  let clockStart = performance.now();
  let pausedTime = 0;
  let lastFrame = 0;
  let zoom = 'fit';
  let lastInfo = null;
  let recording = null;
  let gifJob = null;
  let currentDemo = null;
  let compare = false;
  let split = 50;
  let accentStale = true;

  /* ---------- helpers ---------- */

  let toastTimer = 0;
  function toast(msg, isError) {
    const box = $('#toast');
    box.textContent = msg;
    box.classList.toggle('error', !!isError);
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 2600);
  }

  const now = () => (playing ? (performance.now() - clockStart) / 1000 : pausedTime);
  const invalidate = () => (dirty = true);
  const kind = () => (source ? source.kind : 'none');
  const isAnimated = () => !!source && (source.animated || S.anim !== 'none');

  /* Only known keys with the right type survive. */
  function clean(obj) {
    const outObj = {};
    if (!obj || typeof obj !== 'object') return outObj;
    for (const k in GF.DEFAULTS) {
      if (!(k in obj)) continue;
      const def = GF.DEFAULTS[k];
      const v = obj[k];
      if (typeof def === 'number' && typeof v === 'number' && isFinite(v)) outObj[k] = v;
      else if (typeof def === 'boolean' && typeof v === 'boolean') outObj[k] = v;
      else if (typeof def === 'string' && typeof v === 'string') outObj[k] = v.slice(0, 500);
    }
    return outObj;
  }

  /* ---------- settings ---------- */

  const TEXT_KEYS = ['text', 'textFont', 'textAspect', 'textWeight'];
  const ACCENT_KEYS = ['colorMode', 'palette', 'customStops', 'color'];

  const undo = GF.createHistory(
    () => {
      const snap = Object.assign({}, S);
      GF.EXPORT_KEYS.forEach((k) => delete snap[k]);
      return snap;
    },
    (snap) => {
      Object.assign(S, snap);
      afterBulk();
    },
    syncHistoryButtons
  );

  function set(k, v) {
    if (S[k] === v) return;
    S[k] = v;
    if (TEXT_KEYS.includes(k) && source && source.kind === 'text') source.dirty = true;
    if (k === 'textFont' || k === 'titleFont' || k === 'glyphFont') ensureFont(v);
    if (!GF.EXPORT_KEYS.includes(k)) undo.touch();
    GF.Panel.sync(k);
    if (ACCENT_KEYS.includes(k)) updateAccent();
    if (k === 'anim') syncPlay();
    if (k === 'transparent' || k === 'bg') syncCanvasBg();
    invalidate();
  }

  function setMany(partial, base) {
    Object.assign(S, base || {}, clean(partial));
    undo.touch();
    afterBulk();
  }

  function afterBulk() {
    ['textFont', 'titleFont', 'glyphFont'].forEach((k) => ensureFont(S[k]));
    if (source && source.kind === 'text') source.dirty = true;
    GF.Panel.sync();
    updateAccent();
    syncPlay();
    syncCanvasBg();
    invalidate();
  }

  function applyLook(look) {
    setMany(look);
  }

  function updateAccent() {
    accentStale = S.colorMode === 'source';
    GF.applyAccent(GF.accentFor(S, renderer.last));
  }

  function syncCanvasBg() {
    frameBox.classList.toggle('transparent', !!S.transparent);
  }

  function syncHistoryButtons() {
    $('#btn-undo').disabled = !undo.canUndo;
    $('#btn-redo').disabled = !undo.canRedo;
  }

  /* ---------- fonts ---------- */

  const fontReady = new Map();
  function ensureFont(id) {
    const f = GF.FONTS.find((x) => x.id === id);
    if (!f || id === 'system' || fontReady.has(id)) return fontReady.get(id) || Promise.resolve();
    const p = Promise.all([document.fonts.load('400 32px ' + f.family), document.fonts.load('700 32px ' + f.family)])
      .catch(() => {})
      .then(() => {
        renderer.clearCache();
        if (source && source.kind === 'text') source.dirty = true;
        invalidate();
      });
    fontReady.set(id, p);
    return p;
  }

  function loadAllFonts() {
    const extra = ['"Noto Sans Symbols 2 Subset"', '"Noto Sans Runic"'].map((f) => document.fonts.load('32px ' + f, '♠⠿ᚠ').catch(() => {}));
    return Promise.all(GF.FONTS.map((f) => ensureFont(f.id)).concat(extra));
  }

  /* ---------- sources ---------- */

  async function setSource(promise, demo) {
    const token = ++sourceToken;
    stage.classList.add('busy');
    try {
      const src = await promise;
      if (token !== sourceToken) {
        if (src) src.dispose();
        return false;
      }
      if (source) source.dispose();
      source = src;
      currentDemo = demo || null;
      playing = true;
      clockStart = performance.now();
      zoom = 'fit';
      stage.classList.remove('empty');
      GF.Panel.sourceChanged();
      syncPlay();
      syncStatusSource();
      accentStale = true;
      invalidate();
      return true;
    } catch (e) {
      if (token === sourceToken) toast(t('openFailed'), true);
      return false;
    } finally {
      if (token === sourceToken) stage.classList.remove('busy');
    }
  }

  function openFile(file) {
    if (!file) return;
    if (!/^(image|video)\//.test(file.type)) {
      toast(t('openFailed'), true);
      return;
    }
    setSource(GF.Sources.fromFile(file));
  }

  async function openWebcam() {
    try {
      await setSource(GF.Sources.webcam());
    } catch (e) {
      toast(t('webcamFailed'), true);
    }
  }

  async function openText() {
    const src = GF.Sources.text();
    await ensureFont(S.textFont);
    src.dirty = true;
    src.update(0, S);
    await setSource(Promise.resolve(src));
    GF.Panel.setTab('frame');
  }

  async function loadDemo(id, keepHash) {
    const demo = GF.DEMOS.find((d) => d.id === id) || GF.DEMOS[0];
    Object.assign(S, GF.DEFAULTS, clean(demo.settings));
    afterBulk();
    let p;
    if (demo.source.type === 'image') p = GF.Sources.loadImage(demo.source.url, demo.id);
    else if (demo.source.type === 'procedural') p = Promise.resolve(GF.Sources.procedural(demo.source.name));
    else {
      const src = GF.Sources.text();
      await ensureFont(S.textFont);
      src.dirty = true;
      src.update(0, S);
      p = Promise.resolve(src);
    }
    const ok = await setSource(p, demo);
    undo.reset();
    if (ok && !keepHash) {
      try {
        window.history.replaceState(null, '', '#demo=' + demo.id);
      } catch (e) { /* file:// may refuse */ }
    }
    return ok;
  }

  /* ---------- render loop ---------- */

  function frame(ts) {
    requestAnimationFrame(frame);
    if (!source || gifJob) return;
    const animated = isAnimated() || !!recording;
    if (!dirty && !(animated && playing)) return;
    if (!dirty && ts - lastFrame < 1000 / 30 - 2) return;
    lastFrame = ts;
    const time = now();
    try {
      source.update(time, S);
      const info = renderer.render(source, S, out, { time, before: compare ? before : null });
      if (recording) recording.frame();
      if (info) {
        const changed = !lastInfo || lastInfo.W !== info.W || lastInfo.H !== info.H;
        lastInfo = info;
        if (changed) applyZoom();
        updateStatus(info);
        if (accentStale && S.colorMode === 'source') {
          accentStale = false;
          GF.applyAccent(GF.accentFor(S, renderer.last));
        }
      }
    } catch (e) {
      console.error(e);
    }
    dirty = false;
  }

  function updateStatus(info) {
    $('#status-size').textContent = t('status', { cols: info.cols, rows: info.rows, w: info.W, h: info.H });
    $('#status-ms').textContent = t('lastFrame', { ms: info.ms.toFixed(0) });
  }

  function syncStatusSource() {
    const map = { none: 'sourceNone', image: 'sourceImage', video: 'sourceVideo', animation: 'sourceAnimation', webcam: 'sourceWebcam', text: 'sourceText', procedural: 'sourceProcedural' };
    const name = currentDemo ? nm(currentDemo.name) : source && source.kind !== 'text' ? source.name : '';
    $('#status-src').textContent = t(map[kind()]) + (name ? ' · ' + name : '');
  }

  function togglePlay() {
    if (!source) return;
    if (playing) {
      pausedTime = now();
      playing = false;
      if (source.kind === 'video') source.el.pause();
    } else {
      clockStart = performance.now() - pausedTime * 1000;
      playing = true;
      if (source.kind === 'video') source.el.play().catch(() => {});
    }
    syncPlay();
    invalidate();
  }

  function restart() {
    clockStart = performance.now();
    pausedTime = 0;
    if (source && source.kind === 'video') source.el.currentTime = 0;
    invalidate();
  }

  function syncPlay() {
    const b = $('#btn-play');
    b.hidden = !isAnimated();
    b.textContent = playing ? '❚❚' : '▶';
    b.title = playing ? t('pause') : t('play');
    b.setAttribute('aria-label', b.title);
    GF.Panel.sync('_play');
  }

  /* ---------- viewport: zoom, compare, framing by drag ---------- */

  function applyZoom() {
    if (!lastInfo) return;
    let z = zoom;
    if (z === 'fit') {
      const pad = 40;
      z = Math.min((viewport.clientWidth - pad) / lastInfo.W, (viewport.clientHeight - pad) / lastInfo.H, 2);
      z = Math.max(0.05, z);
    }
    frameBox.style.width = Math.round(lastInfo.W * z) + 'px';
    frameBox.style.height = Math.round(lastInfo.H * z) + 'px';
    $('#zoom-label').textContent = Math.round(z * 100) + '%';
    viewport.classList.toggle('scroll', zoom !== 'fit');
  }

  function zoomBy(f) {
    if (!lastInfo) return;
    const cur = zoom === 'fit' ? frameBox.clientWidth / lastInfo.W : zoom;
    zoom = Math.max(0.05, Math.min(8, cur * f));
    applyZoom();
  }

  function setCompare(on) {
    compare = on;
    frameBox.classList.toggle('comparing', on);
    $('#btn-compare').setAttribute('aria-pressed', on ? 'true' : 'false');
    frameBox.style.setProperty('--split', split + '%');
    invalidate();
  }

  /* Pan range of the framed source, in output pixels. */
  function panRange() {
    if (!source || !lastInfo) return { x: 0, y: 0 };
    const r = (((Math.round(S.rotate / 90) * 90) % 360) + 360) % 360;
    const swap = r === 90 || r === 270;
    const sw = swap ? source.height : source.width;
    const sh = swap ? source.width : source.height;
    const cover = Math.max(lastInfo.W / sw, lastInfo.H / sh) * S.frameZoom;
    return { x: Math.max(0, (sw * cover - lastInfo.W) / 2), y: Math.max(0, (sh * cover - lastInfo.H) / 2) };
  }

  let drag = null;
  frameBox.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.altKey && source) {
      drag = { mode: 'frame', x: e.clientX, y: e.clientY, fx: S.frameX, fy: S.frameY };
    } else if (compare) {
      drag = { mode: 'split' };
      moveSplit(e);
    } else return;
    frameBox.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  frameBox.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (drag.mode === 'split') moveSplit(e);
    else {
      const disp = frameBox.clientWidth / lastInfo.W;
      const range = panRange();
      const nx = range.x > 0.5 ? drag.fx - ((e.clientX - drag.x) / (range.x * disp)) * 100 : S.frameX;
      const ny = range.y > 0.5 ? drag.fy - ((e.clientY - drag.y) / (range.y * disp)) * 100 : S.frameY;
      set('frameX', Math.round(Math.max(-100, Math.min(100, nx))));
      set('frameY', Math.round(Math.max(-100, Math.min(100, ny))));
    }
  });
  const endDrag = () => (drag = null);
  frameBox.addEventListener('pointerup', endDrag);
  frameBox.addEventListener('pointercancel', endDrag);

  function moveSplit(e) {
    const r = frameBox.getBoundingClientRect();
    split = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    frameBox.style.setProperty('--split', split.toFixed(2) + '%');
  }

  viewport.addEventListener('wheel', (e) => {
    if (e.altKey && source) {
      e.preventDefault();
      const z = Math.max(1, Math.min(4, S.frameZoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
      set('frameZoom', Math.round(z * 100) / 100);
      return;
    }
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });

  let pan = null;
  viewport.addEventListener('pointerdown', (e) => {
    if (zoom === 'fit' || e.button !== 0 || drag || e.altKey) return;
    pan = { x: e.clientX, y: e.clientY, sl: viewport.scrollLeft, st: viewport.scrollTop };
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add('panning');
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!pan) return;
    viewport.scrollLeft = pan.sl - (e.clientX - pan.x);
    viewport.scrollTop = pan.st - (e.clientY - pan.y);
  });
  const endPan = () => {
    pan = null;
    viewport.classList.remove('panning');
  };
  viewport.addEventListener('pointerup', endPan);
  viewport.addEventListener('pointercancel', endPan);
  new ResizeObserver(() => zoom === 'fit' && applyZoom()).observe(viewport);

  /* ---------- thumbnails for looks ---------- */

  function renderThumb(canvas, look) {
    if (!source || !source.width) return;
    const s = Object.assign({}, S, look, { title: '', anim: 'none' });
    const scale = Math.min(1, 300 / S.outWidth);
    try {
      renderer.render(source, s, canvas, { scale, time: now(), keepLast: true });
    } catch (e) { /* a thumbnail is not worth an error */ }
  }

  /* ---------- exports ---------- */

  function needSource() {
    if (!source || !renderer.last) {
      toast(t('sourceNone'), true);
      return false;
    }
    return true;
  }

  function exportScale() {
    return Math.max(0.25, Math.min(S.pngScale, 8192 / S.outWidth));
  }

  function trimCanvas(c) {
    const g = c.getContext('2d');
    const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
    const [br, bgc, bb] = GF.hexToRgb(S.bg);
    let x0 = width, y0 = height, x1 = -1, y1 = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = (y * width + x) * 4;
        const on = S.transparent ? data[p + 3] > 8 : Math.abs(data[p] - br) + Math.abs(data[p + 1] - bgc) + Math.abs(data[p + 2] - bb) > 30;
        if (!on) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) return c;
    const pad = Math.round(Math.min(width, height) * 0.02);
    x0 = Math.max(0, x0 - pad);
    y0 = Math.max(0, y0 - pad);
    x1 = Math.min(width - 1, x1 + pad);
    y1 = Math.min(height - 1, y1 + pad);
    const o = document.createElement('canvas');
    o.width = x1 - x0 + 1;
    o.height = y1 - y0 + 1;
    o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    return o;
  }

  function renderBlob(scale, type, quality, trim) {
    let off = document.createElement('canvas');
    source.update(now(), S);
    const info = renderer.render(source, S, off, { scale, time: now() });
    if (!info) return Promise.reject(new Error('render'));
    invalidate();
    if (trim) off = trimCanvas(off);
    return new Promise((resolve, reject) => off.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), type || 'image/png', quality));
  }

  async function exportPNG() {
    if (!needSource()) return;
    toast(t('exporting'));
    try {
      const blob = await renderBlob(exportScale(), 'image/png', undefined, S.pngTrim);
      GF.Exporter.download(blob, 'tlk-ascii-' + GF.Exporter.stamp() + '.png');
      toast(t('saved'));
    } catch (e) {
      toast(t('renderFailed'), true);
    }
  }

  function exportText(fmt) {
    if (!needSource()) return;
    const last = renderer.last;
    let blob;
    if (fmt === 'txt') blob = new Blob([GF.Exporter.toText(last)], { type: 'text/plain;charset=utf-8' });
    else if (fmt === 'html') blob = new Blob([GF.Exporter.toHTML(last)], { type: 'text/html;charset=utf-8' });
    else blob = new Blob([GF.Exporter.toSVG(last)], { type: 'image/svg+xml;charset=utf-8' });
    GF.Exporter.download(blob, 'tlk-ascii-' + GF.Exporter.stamp() + '.' + fmt);
    toast(t('saved'));
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = el('textarea', { style: { position: 'fixed', opacity: '0' } });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  async function copyText() {
    if (!needSource()) return;
    await copyToClipboard(GF.Exporter.toText(renderer.last));
    toast(t('copied'));
  }

  function shareURL() {
    const diff = {};
    for (const k in GF.DEFAULTS) if (!GF.EXPORT_KEYS.includes(k) && S[k] !== GF.DEFAULTS[k]) diff[k] = S[k];
    const bytes = new TextEncoder().encode(JSON.stringify(diff));
    let bin = '';
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    const enc = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const base = isDesktop || location.protocol === 'file:' ? SITE : location.origin + location.pathname;
    const demo = currentDemo ? currentDemo.id : kind() === 'text' ? 'gothic' : GF.DEMOS[0].id;
    return base + '#demo=' + demo + '&s=' + enc;
  }

  function readShared() {
    const m = /(?:^|[#&])s=([\w-]+)/.exec(location.hash);
    if (!m) return null;
    try {
      const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
      const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      return clean(JSON.parse(new TextDecoder().decode(bytes)));
    } catch (e) {
      return null;
    }
  }

  async function toggleRecord() {
    if (recording) {
      recording.stop();
      return;
    }
    if (!needSource()) return;
    if (!GF.Exporter.recorderType()) {
      toast(t('noRecorder'), true);
      return;
    }
    $('#dlg-export').close();
    const isVideo = source.kind === 'video';
    let onEnded = null;
    if (isVideo) {
      source.el.loop = false;
      source.el.currentTime = 0;
      await source.el.play().catch(() => {});
      playing = true;
    }
    const rec = GF.Exporter.record(out, isVideo ? 0 : S.recSeconds, (sec) => {
      $('#rec-time').textContent = sec.toFixed(1) + ' ' + t('seconds');
    });
    if (!rec) {
      toast(t('noRecorder'), true);
      return;
    }
    recording = rec;
    if (isVideo) {
      onEnded = () => rec.stop();
      source.el.addEventListener('ended', onEnded, { once: true });
    }
    document.body.classList.add('recording');
    const { blob, ext } = await rec.done;
    recording = null;
    document.body.classList.remove('recording');
    if (isVideo && source && source.el) {
      source.el.loop = true;
      if (onEnded) source.el.removeEventListener('ended', onEnded);
      source.el.play().catch(() => {});
    }
    if (!blob) {
      toast(t('renderFailed'), true);
      return;
    }
    GF.Exporter.download(blob, 'tlk-ascii-' + GF.Exporter.stamp() + '.' + ext);
    toast(t('saved'));
  }

  async function makeGif(progress) {
    if (!needSource() || gifJob) return;
    const controller = new AbortController();
    gifJob = controller;
    stage.classList.add('busy');
    try {
      const seconds = source.kind === 'video' && source.el.duration ? Math.min(S.gifSeconds, source.el.duration) : S.gifSeconds;
      const blob = await GF.makeGif({
        renderer, source, settings: Object.assign({}, S),
        width: Math.min(S.gifWidth, S.outWidth * 4), fps: S.gifFps, seconds,
        animated: isAnimated(), signal: controller.signal,
        onProgress: (f) => progress(f)
      });
      GF.Exporter.download(blob, 'tlk-ascii-' + GF.Exporter.stamp() + '.gif');
      toast(t('saved'));
    } catch (e) {
      if (e.name !== 'AbortError') toast(t('renderFailed'), true);
    } finally {
      gifJob = null;
      stage.classList.remove('busy');
      progress(-1);
      invalidate();
    }
  }

  /* ---------- export dialog ---------- */

  function exportControls() {
    const bind = (o) => Object.assign(o, { get: () => S[o.key], onInput: (v) => { set(o.key, v); refresh(); } });
    const scale = GF.UI.segmented(bind({ key: 'pngScale', label: t('pngScale'), options: [[1, '1×'], [2, '2×'], [3, '3×'], [4, '4×']] }));
    const pngInfo = el('small', { class: 'hint' });
    const transparent = GF.UI.check(bind({ key: 'transparent', label: t('transparent') }));
    const trim = GF.UI.check(bind({ key: 'pngTrim', label: t('pngTrim') }));
    const gifW = GF.UI.range(bind({ key: 'gifWidth', label: t('gifWidth'), min: 160, max: 1080, step: 20, unit: 'px', reset: GF.DEFAULTS.gifWidth }));
    const gifFps = GF.UI.range(bind({ key: 'gifFps', label: t('gifFps'), min: 4, max: 30, step: 1, reset: GF.DEFAULTS.gifFps }));
    const gifSec = GF.UI.range(bind({ key: 'gifSeconds', label: t('gifSeconds'), min: 1, max: 12, step: 0.5, unit: t('seconds'), reset: GF.DEFAULTS.gifSeconds }));
    const recSec = GF.UI.range(bind({ key: 'recSeconds', label: t('gifSeconds'), min: 1, max: 30, step: 1, unit: t('seconds'), reset: GF.DEFAULTS.recSeconds }));
    const gifNote = el('small', { class: 'hint', text: t('gifStatic') });
    const bar = el('div', { class: 'progress', hidden: true }, [el('span')]);
    const gifBtn = el('button', { type: 'button', class: 'btn', text: t('gif') });
    const cancel = el('button', { type: 'button', class: 'btn quiet', text: t('cancel'), hidden: true, onclick: () => gifJob && gifJob.abort() });
    gifBtn.addEventListener('click', () => makeGif((f) => {
      const on = f >= 0;
      bar.hidden = !on;
      cancel.hidden = !on;
      gifBtn.disabled = on;
      if (on) {
        bar.firstChild.style.width = (f * 100).toFixed(1) + '%';
        gifBtn.textContent = t('gifWorking', { p: Math.round(f * 100) });
      } else gifBtn.textContent = t('gif');
    }));
    const controls = [scale, transparent, trim, gifW, gifFps, gifSec, recSec];
    function refresh() {
      controls.forEach((c) => c.sync());
      const sc = exportScale();
      if (lastInfo) pngInfo.textContent = t('pngInfo', { w: Math.round(lastInfo.W * sc), h: Math.round(lastInfo.H * sc) });
      gifNote.hidden = isAnimated();
      gifSec.node.hidden = !isAnimated();
      gifFps.node.hidden = !isAnimated();
      recSec.node.hidden = kind() === 'video';
    }
    const section = (title, kids) => el('section', { class: 'ex-sec' }, [el('h3', { text: title })].concat(kids));
    const body = el('div', { class: 'ex-body' }, [
      section(t('exImage'), [scale.node, pngInfo, transparent.node, trim.node, el('div', { class: 'btn-row' }, [el('button', { type: 'button', class: 'btn accent', text: t('png'), onclick: exportPNG })])]),
      section(t('exAnim'), [gifW.node, gifFps.node, gifSec.node, gifNote, bar, el('div', { class: 'btn-row' }, [gifBtn, cancel]),
        el('hr'), recSec.node, el('small', { class: 'hint', text: t('recordHint') }),
        el('div', { class: 'btn-row' }, [el('button', { type: 'button', class: 'btn', text: t('video'), onclick: toggleRecord })])]),
      section(t('exText'), [el('div', { class: 'btn-grid' }, [
        el('button', { type: 'button', class: 'btn', text: t('txt'), onclick: () => exportText('txt') }),
        el('button', { type: 'button', class: 'btn', text: t('html'), onclick: () => exportText('html') }),
        el('button', { type: 'button', class: 'btn', text: t('svg'), onclick: () => exportText('svg') }),
        el('button', { type: 'button', class: 'btn', text: t('copyText'), onclick: copyText })
      ])]),
      section(t('exShare'), [el('small', { class: 'hint', text: t('shareHint') }), el('div', { class: 'btn-row' }, [el('button', {
        type: 'button', class: 'btn', text: t('shareLink'),
        onclick: async () => {
          await copyToClipboard(shareURL());
          toast(t('linkCopied'));
        }
      })])])
    ]);
    refresh();
    return body;
  }

  function openExport() {
    if (!source) return;
    const dlg = $('#dlg-export');
    $('#export-body').replaceChildren(exportControls());
    if (!dlg.open) dlg.showModal();
  }

  /* ---------- dialogs ---------- */

  function openDemos() {
    $('#demo-grid').replaceChildren(...GF.DEMOS.map((d) => el('button', {
      type: 'button', class: 'demo-card', onclick: () => {
        $('#dlg-demos').close();
        loadDemo(d.id);
      }
    }, [
      el('img', { src: 'demos/previews/' + d.id + '.jpg', alt: '', loading: 'lazy', decoding: 'async' }),
      el('strong', { text: nm(d.name) }),
      el('small', { text: d.credit })
    ])));
    $('#dlg-demos').showModal();
  }

  /* ---------- static text and language ---------- */

  function applyStaticText() {
    document.querySelectorAll('[data-i18n]').forEach((n) => (n.textContent = t(n.dataset.i18n)));
    document.querySelectorAll('[data-i18n-title]').forEach((n) => {
      n.title = t(n.dataset.i18nTitle);
      n.setAttribute('aria-label', n.title);
    });
    $('#lang').value = GF.i18n.lang;
    document.title = 'TLK ASCII · ' + t('tagline');
  }

  function setLang(l) {
    GF.i18n.set(l);
    applyStaticText();
    GF.Panel.rebuild();
    syncPlay();
    syncStatusSource();
    if (lastInfo) updateStatus(lastInfo);
  }

  /* ---------- events ---------- */

  const fileInput = $('#file');
  fileInput.addEventListener('change', () => {
    openFile(fileInput.files[0]);
    fileInput.value = '';
  });
  $('#btn-open').addEventListener('click', () => fileInput.click());
  $('#btn-open-empty').addEventListener('click', () => fileInput.click());
  $('#btn-webcam').addEventListener('click', openWebcam);
  $('#btn-text').addEventListener('click', openText);
  $('#btn-demos').addEventListener('click', openDemos);
  $('#btn-demos-empty').addEventListener('click', openDemos);
  $('#btn-export').addEventListener('click', openExport);
  $('#btn-undo').addEventListener('click', () => undo.undo());
  $('#btn-redo').addEventListener('click', () => undo.redo());
  $('#btn-about').addEventListener('click', () => $('#dlg-about').showModal());
  $('#btn-play').addEventListener('click', togglePlay);
  $('#btn-compare').addEventListener('click', () => setCompare(!compare));
  $('#rec-stop').addEventListener('click', () => recording && recording.stop());
  $('#zoom-in').addEventListener('click', () => zoomBy(1.25));
  $('#zoom-out').addEventListener('click', () => zoomBy(0.8));
  $('#zoom-fit').addEventListener('click', () => {
    zoom = 'fit';
    applyZoom();
  });
  $('#zoom-label').addEventListener('click', () => {
    zoom = 1;
    applyZoom();
  });
  $('#lang').addEventListener('change', (e) => setLang(e.target.value));
  document.querySelectorAll('dialog [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => {
    if (e.target === d) d.close();
  }));

  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return;
    dragDepth++;
    document.body.classList.add('dragging');
  });
  window.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) document.body.classList.remove('dragging');
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    document.body.classList.remove('dragging');
    const f = e.dataTransfer && e.dataTransfer.files[0];
    if (f) openFile(f);
  });
  window.addEventListener('paste', (e) => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    const item = Array.from((e.clipboardData && e.clipboardData.items) || []).find((i) => i.type.startsWith('image/'));
    if (item) openFile(item.getAsFile());
  });

  window.addEventListener('keydown', (e) => {
    const typing = e.target.closest && e.target.closest('input[type="text"], textarea, select');
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (document.querySelector('dialog[open]') && !mod) return;
    if (mod && key === 'o') {
      e.preventDefault();
      fileInput.click();
    } else if (mod && key === 's') {
      e.preventDefault();
      exportPNG();
    } else if (mod && e.shiftKey && key === 'c') {
      e.preventDefault();
      copyText();
    } else if (mod && !typing && (key === 'z' || key === 'y')) {
      e.preventDefault();
      if (key === 'y' || e.shiftKey) undo.redo();
      else undo.undo();
    } else if (!typing && !mod && !e.altKey) {
      if (e.key === ' ') {
        if (e.target.closest && e.target.closest('button')) return;
        e.preventDefault();
        togglePlay();
      } else if (key === 'f') {
        zoom = 'fit';
        applyZoom();
      } else if (key === 'd') openDemos();
      else if (key === 'e') openExport();
      else if (key === 'c') setCompare(!compare);
      else if (key === 'r') applyLook(GF.randomLook());
      else if (e.key === '+' || e.key === '=') zoomBy(1.25);
      else if (e.key === '-') zoomBy(0.8);
    }
  });

  /* ---------- start ---------- */

  if (isDesktop) document.body.classList.add('desktop');
  $('#repo-link').href = REPO;
  $('#download-link').href = REPO + '/releases/latest';
  applyStaticText();

  GF.Panel.mount({
    S, set, setMany, applyLook, toast, renderThumb,
    kind,
    hasSource: () => !!source,
    sourceName: () => (currentDemo ? nm(currentDemo.name) : source && source.kind !== 'text' ? source.name : ''),
    isAnimated,
    isPlaying: () => playing,
    togglePlay,
    restart
  });
  updateAccent();
  syncPlay();
  syncHistoryButtons();
  requestAnimationFrame(frame);

  /* #demo=<id> and #demo=<id>&s=<settings> open a demo, optionally with
     shared settings on top. */
  function openFromHash() {
    const m = /demo=([\w-]+)/.exec(location.hash);
    const shared = readShared();
    if (shared) return loadDemo(m ? m[1] : GF.DEMOS[0].id, true).then((ok) => {
      setMany(shared, GF.DEFAULTS);
      undo.reset();
      return ok;
    });
    return loadDemo(m ? m[1] : GF.DEMOS[0].id);
  }

  window.addEventListener('hashchange', () => {
    if (/(?:^|[#&])(demo|s)=/.test(location.hash)) openFromHash();
  });

  const ready = loadAllFonts().then(openFromHash).then((ok) => {
    if (!source) stage.classList.add('empty');
    stage.classList.remove('busy');
    syncPlay();
    return ok;
  });

  /* Small scripting surface, used by the demo renderer and tests. */
  window.TLKASCII = {
    ready,
    loadDemo: (id) => loadDemo(id),
    set(partial) {
      setMany(Object.assign({}, S, partial));
    },
    get settings() {
      return Object.assign({}, S);
    },
    undo: () => undo.undo(),
    redo: () => undo.redo(),
    flushHistory: () => undo.flush(),
    shareURL,
    compare: setCompare,
    async renderDataURL(scale, type, quality, time) {
      if (!source) return null;
      if (time != null) {
        playing = false;
        pausedTime = time;
      }
      const blob = await renderBlob(scale || 1, type || 'image/png', quality);
      return new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.readAsDataURL(blob);
      });
    },
    async gif(progress) {
      let last = 0;
      const origDownload = GF.Exporter.download;
      let captured = null;
      GF.Exporter.download = (blob, name) => {
        captured = { size: blob.size, name, head: blob.slice(0, 6).text() };
      };
      try {
        await makeGif((f) => (last = f >= 0 ? f : last));
      } finally {
        GF.Exporter.download = origDownload;
      }
      if (progress) progress(last);
      if (captured) captured.head = await captured.head;
      return captured;
    },
    text: () => (renderer.last ? GF.Exporter.toText(renderer.last) : ''),
    html: () => (renderer.last ? GF.Exporter.toHTML(renderer.last) : ''),
    svg: () => (renderer.last ? GF.Exporter.toSVG(renderer.last) : '')
  };
})(window.GF = window.GF || {});
