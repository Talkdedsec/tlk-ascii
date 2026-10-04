/* Application shell: panel, sources, render loop, viewport, exports, presets. */
(function (GF) {
  'use strict';

  const REPO = 'https://github.com/Talkdedsec/tlk-ascii';
  const t = (k, v) => GF.i18n.t(k, v);
  const nm = (o) => GF.i18n.name(o);
  const $ = (sel, root) => (root || document).querySelector(sel);
  const isDesktop = /Electron/i.test(navigator.userAgent);

  const S = Object.assign({}, GF.DEFAULTS);
  const renderer = new GF.Renderer();
  const out = $('#out');
  const viewport = $('#viewport');

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
  let currentDemo = null;

  /* ---------- helpers ---------- */

  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'text') e.textContent = v;
        else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    (children || []).forEach((c) => c != null && e.append(c));
    return e;
  }

  let toastTimer = 0;
  function toast(msg, isError) {
    const box = $('#toast');
    box.textContent = msg;
    box.classList.toggle('error', !!isError);
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 2600);
  }

  function now() {
    return playing ? (performance.now() - clockStart) / 1000 : pausedTime;
  }

  function invalidate() {
    dirty = true;
  }

  function kind() {
    return source ? source.kind : 'none';
  }

  /* ---------- panel schema ---------- */

  const fontOptions = () => GF.FONTS.map((f) => [f.id, f.name]);
  const charCat = () => GF.CHARSET_CATEGORIES.find((c) => c.id === S.charSet.split('/')[0]) || GF.CHARSET_CATEGORIES[0];
  const palCat = () => GF.PALETTE_CATEGORIES.find((c) => c.id === S.palette.split('/')[0]) || GF.PALETTE_CATEGORIES[0];
  const isText = () => kind() === 'text';
  const isPalette = () => S.colorMode === 'palette';
  const hasTitle = () => !!S.title.trim();

  const SECTIONS = [
    {
      id: 'source', title: 'sec.source', open: true, rows: [
        { type: 'sourceInfo' },
        { k: 'text', type: 'textarea', label: 'textContent', when: isText, maxlength: 200 },
        { k: 'textFont', type: 'select', label: 'textFont', options: fontOptions, when: isText },
        { k: 'textWeight', type: 'select', options: () => [['regular', t('regular')], ['bold', t('bold')]], when: isText },
        { k: 'textAspect', type: 'select', options: () => GF.TEXT_ASPECTS.map((a) => [a, a]), when: isText },
        { k: 'mirror', type: 'check', when: () => kind() === 'webcam' },
        { k: 'outWidth', type: 'range', min: 320, max: 2400, step: 20, unit: 'px' }
      ]
    },
    {
      id: 'ascii', title: 'sec.ascii', open: true, rows: [
        {
          k: 'charCategory', type: 'select', options: () => GF.CHARSET_CATEGORIES.map((c) => [c.id, nm(c.name)]),
          get: () => S.charSet.split('/')[0],
          set: (v) => {
            const c = GF.CHARSET_CATEGORIES.find((x) => x.id === v);
            if (c) S.charSet = c.id + '/' + c.sets[0].id;
          }
        },
        { k: 'charSet', type: 'select', options: () => charCat().sets.map((s) => [charCat().id + '/' + s.id, nm(s.name)]) },
        { type: 'glyphPreview' },
        { k: 'inject', type: 'text', hint: 'injectHint', maxlength: 64 },
        { k: 'depth', type: 'range', min: 2, max: 64, step: 1 },
        { k: 'cell', type: 'range', min: 4, max: 48, step: 1, unit: 'px' },
        { k: 'grid', type: 'select', options: () => [['text', t('gridText')], ['square', t('gridSquare')]] },
        { k: 'offset', type: 'range', min: 0, max: 32, step: 1 },
        { k: 'glyphFont', type: 'select', options: fontOptions },
        { k: 'glyphScale', type: 'range', min: 50, max: 160, step: 1, unit: '%' },
        { k: 'bold', type: 'check', label: 'glyphBold' },
        { k: 'invert', type: 'check' }
      ]
    },
    {
      id: 'adjust', title: 'sec.adjust', open: false, rows: [
        { k: 'brightness', type: 'range', min: -100, max: 100, step: 1 },
        { k: 'contrast', type: 'range', min: -100, max: 100, step: 1 },
        { k: 'gamma', type: 'range', min: 0.2, max: 3, step: 0.05 },
        { k: 'threshold', type: 'range', min: 0, max: 95, step: 1, unit: '%' },
        { k: 'saturation', type: 'range', min: 0, max: 300, step: 5, unit: '%', when: () => S.colorMode === 'source' }
      ]
    },
    {
      id: 'color', title: 'sec.color', open: true, rows: [
        { k: 'colorMode', type: 'select', options: () => [['palette', t('modePalette')], ['single', t('modeSingle')], ['source', t('modeSource')]] },
        {
          k: 'paletteCategory', type: 'select', when: isPalette, options: () => GF.PALETTE_CATEGORIES.map((c) => [c.id, nm(c.name)]),
          get: () => S.palette.split('/')[0],
          set: (v) => {
            const c = GF.PALETTE_CATEGORIES.find((x) => x.id === v);
            if (c) S.palette = c.id + '/' + c.palettes[0].id;
          }
        },
        { type: 'paletteGrid', when: isPalette },
        { k: 'color', type: 'color', when: () => S.colorMode === 'single' },
        { k: 'fade', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
        { k: 'bg', type: 'color', when: () => !S.transparent },
        { k: 'transparent', type: 'check' }
      ]
    },
    {
      id: 'effects', title: 'sec.effects', open: true, rows: [
        { k: 'glow', type: 'range', min: 0, max: 300, step: 5, unit: '%' },
        { k: 'glowRadius', type: 'range', min: 1, max: 40, step: 1, unit: 'px', when: () => S.glow > 0 },
        { k: 'chroma', type: 'range', min: 0, max: 12, step: 0.5, unit: 'px' },
        { k: 'scanlines', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
        { k: 'vignette', type: 'range', min: 0, max: 100, step: 1, unit: '%' }
      ]
    },
    {
      id: 'title', title: 'sec.title', open: false, rows: [
        { k: 'title', type: 'textarea', maxlength: 120 },
        { k: 'titleFont', type: 'select', options: fontOptions, when: hasTitle },
        { k: 'titleSize', type: 'range', min: 3, max: 30, step: 0.5, unit: '%', when: hasTitle },
        { k: 'titleMode', type: 'select', options: () => [['overlay', t('modeOverlay')], ['baked', t('modeBaked')]], when: hasTitle },
        { k: 'titlePos', type: 'select', options: () => [['top', t('posTop')], ['center', t('posCenter')], ['bottom', t('posBottom')]], when: hasTitle },
        { k: 'titleColor', type: 'color', when: () => hasTitle() && (S.titleMode !== 'baked' || S.colorMode === 'source') },
        { k: 'titleGlow', type: 'range', min: 0, max: 200, step: 5, unit: '%', when: () => hasTitle() && S.titleMode !== 'baked' }
      ]
    },
    {
      id: 'anim', title: 'sec.anim', open: false, rows: [
        { k: 'anim', type: 'select', options: () => [['none', t('animNone')], ['cycle', t('animCycle')], ['flicker', t('animFlicker')], ['wave', t('animWave')]] },
        { k: 'animSpeed', type: 'range', min: 1, max: 30, step: 1, when: () => S.anim !== 'none' },
        { k: 'animAmount', type: 'range', min: 1, max: 100, step: 1, unit: '%', when: () => S.anim === 'flicker' || S.anim === 'wave' }
      ]
    },
    { id: 'export', title: 'sec.export', open: true, rows: [{ type: 'exportBlock' }] },
    { id: 'presets', title: 'sec.presets', open: false, rows: [{ type: 'presetBlock' }] }
  ];

  const bindings = [];
  const openSections = {};

  function fmt(row, v) {
    const dec = row.step < 1 ? (row.step < 0.1 ? 2 : 1) : 0;
    return Number(v).toFixed(dec) + (row.unit || '');
  }

  function rowValue(row) {
    return row.get ? row.get() : S[row.k];
  }

  function setValue(row, v) {
    if (row.set) row.set(v);
    else S[row.k] = v;
    onSettingChange(row.k);
  }

  function fillSelect(select, row) {
    const opts = row.options();
    const cur = String(rowValue(row));
    select.replaceChildren(...opts.map(([v, label]) => el('option', { value: v, text: label })));
    select.value = cur;
    if (select.value !== cur && opts.length) select.value = opts[0][0];
  }

  function buildRow(row) {
    const id = 'f-' + (row.k || row.type);
    const label = row.k ? t(row.label || row.k) : '';
    let node;
    let sync = () => {};

    if (row.type === 'range') {
      const input = el('input', { type: 'range', id, min: row.min, max: row.max, step: row.step });
      const output = el('output', { for: id });
      input.addEventListener('input', () => {
        output.textContent = fmt(row, input.value);
        setValue(row, parseFloat(input.value));
      });
      input.addEventListener('dblclick', () => {
        if (row.k in GF.DEFAULTS) {
          input.value = GF.DEFAULTS[row.k];
          input.dispatchEvent(new Event('input'));
        }
      });
      node = el('div', { class: 'row range' }, [el('label', { for: id }, [el('span', { text: label }), output]), input]);
      sync = () => {
        input.value = rowValue(row);
        output.textContent = fmt(row, rowValue(row));
      };
    } else if (row.type === 'select') {
      const select = el('select', { id });
      select.addEventListener('change', () => setValue(row, select.value));
      node = el('div', { class: 'row' }, [el('label', { for: id, text: label }), select]);
      sync = () => fillSelect(select, row);
    } else if (row.type === 'check') {
      const input = el('input', { type: 'checkbox', id });
      input.addEventListener('change', () => setValue(row, input.checked));
      node = el('div', { class: 'row check' }, [el('label', { for: id }, [input, el('span', { text: label })])]);
      sync = () => {
        input.checked = !!rowValue(row);
      };
    } else if (row.type === 'color') {
      const pick = el('input', { type: 'color', id });
      const hex = el('input', { type: 'text', class: 'hex', maxlength: 7, spellcheck: 'false', 'aria-label': label + ' (hex)' });
      pick.addEventListener('input', () => {
        hex.value = pick.value;
        setValue(row, pick.value);
      });
      hex.addEventListener('change', () => {
        const v = hex.value.trim();
        if (/^#?[0-9a-f]{6}$/i.test(v)) {
          const val = v.startsWith('#') ? v : '#' + v;
          pick.value = val;
          setValue(row, val.toLowerCase());
        } else hex.value = rowValue(row);
      });
      node = el('div', { class: 'row' }, [el('label', { for: id, text: label }), el('div', { class: 'color' }, [pick, hex])]);
      sync = () => {
        pick.value = rowValue(row);
        hex.value = rowValue(row);
      };
    } else if (row.type === 'text' || row.type === 'textarea') {
      const input = row.type === 'text'
        ? el('input', { type: 'text', id, maxlength: row.maxlength, spellcheck: 'false' })
        : el('textarea', { id, rows: 2, maxlength: row.maxlength, spellcheck: 'false' });
      input.addEventListener('input', () => setValue(row, input.value));
      const kids = [el('label', { for: id, text: label }), input];
      if (row.hint) kids.push(el('small', { class: 'hint', text: t(row.hint) }));
      node = el('div', { class: 'row' }, kids);
      sync = () => {
        if (document.activeElement !== input) input.value = rowValue(row);
      };
    } else if (row.type === 'sourceInfo') {
      node = buildSourceInfo();
      sync = () => syncSourceInfo(node);
    } else if (row.type === 'glyphPreview') {
      node = el('div', { class: 'glyphs', 'aria-hidden': 'true' });
      sync = () => syncGlyphPreview(node);
    } else if (row.type === 'paletteGrid') {
      node = el('div', { class: 'swatches' });
      sync = () => syncPaletteGrid(node);
    } else if (row.type === 'exportBlock') {
      node = buildExport();
      sync = () => syncExport(node);
    } else if (row.type === 'presetBlock') {
      node = buildPresets();
      sync = () => syncPresets(node);
    }
    bindings.push({ row, node, sync });
    return node;
  }

  function buildPanel() {
    const panel = $('#panel');
    panel.querySelectorAll('details').forEach((d) => (openSections[d.dataset.id] = d.open));
    bindings.length = 0;
    panel.replaceChildren(...SECTIONS.map((sec) => {
      const det = el('details', { 'data-id': sec.id, open: sec.id in openSections ? openSections[sec.id] : sec.open });
      det.append(el('summary', { text: t(sec.title) }));
      const body = el('div', { class: 'sec-body' });
      sec.rows.forEach((r) => body.append(buildRow(r)));
      det.append(body);
      return det;
    }));
    syncPanel();
  }

  /* Rows that must refresh when another setting changes. */
  const DEPS = {
    charSet: ['charCategory'],
    charCategory: ['charSet'],
    paletteGrid: ['palette', 'paletteCategory'],
    paletteCategory: ['palette'],
    sourceInfo: ['anim']
  };

  /* Without a key every row refreshes; with one, only visibility changes,
     dependent rows and rows that just became visible. */
  function syncPanel(changed) {
    for (const b of bindings) {
      const show = !b.row.when || b.row.when();
      const wasHidden = b.node.hidden;
      b.node.hidden = !show;
      if (!show) continue;
      const id = b.row.k || b.row.type;
      if (!changed || wasHidden || (DEPS[id] && DEPS[id].includes(changed))) b.sync();
    }
  }

  function onSettingChange(k) {
    if (k === 'text' || k === 'textFont' || k === 'textAspect' || k === 'textWeight') {
      if (source && source.kind === 'text') source.dirty = true;
    }
    if (k === 'textFont' || k === 'titleFont' || k === 'glyphFont') ensureFont(S[k]);
    syncPanel(k);
    if (k === 'anim') syncPlayButton();
    invalidate();
  }

  /* ---------- custom panel blocks ---------- */

  function buildSourceInfo() {
    const name = el('div', { class: 'src-name' });
    const play = el('button', { type: 'button', class: 'btn small', onclick: togglePlay });
    const restart = el('button', { type: 'button', class: 'btn small', text: t('restart'), onclick: restartClock });
    const ctrls = el('div', { class: 'src-ctrls' }, [play, restart]);
    return el('div', { class: 'src-info' }, [name, ctrls]);
  }

  function syncSourceInfo(node) {
    const k = kind();
    const label = {
      none: 'sourceNone', image: 'sourceImage', video: 'sourceVideo', animation: 'sourceAnimation',
      webcam: 'sourceWebcam', text: 'sourceText', procedural: 'sourceProcedural'
    }[k];
    const name = node.querySelector('.src-name');
    name.replaceChildren(el('strong', { text: t(label) }), source && source.kind !== 'text' ? el('span', { text: ' · ' + (currentDemo ? nm(currentDemo.name) : source.name) }) : '');
    const ctrls = node.querySelector('.src-ctrls');
    const animated = !!source && (source.animated || S.anim !== 'none');
    ctrls.hidden = !animated;
    ctrls.firstChild.textContent = playing ? t('pause') : t('play');
  }

  function syncGlyphPreview(node) {
    const ramp = renderer.last ? renderer.last.ramp.map((c) => c.chr).join('') : '';
    node.style.fontFamily = GF.fontStack(S.glyphFont);
    node.style.fontWeight = S.bold ? 700 : 400;
    node.textContent = Array.from(ramp).slice(0, 120).join('').replace(/ /g, ' ') || ' ';
  }

  function syncPaletteGrid(node) {
    const cat = palCat();
    node.replaceChildren(...cat.palettes.map((p) => {
      const key = cat.id + '/' + p.id;
      return el('button', {
        type: 'button', class: 'swatch' + (S.palette === key ? ' active' : ''), title: nm(p.name), 'aria-label': nm(p.name),
        'aria-pressed': S.palette === key ? 'true' : 'false',
        style: 'background:' + GF.gradientCSS(p.stops),
        onclick: () => {
          S.palette = key;
          onSettingChange('palette');
        }
      }, [el('span', { text: nm(p.name) })]);
    }));
  }

  function buildExport() {
    const scale = el('select', { id: 'f-pngScale' }, [1, 2, 3, 4].map((v) => el('option', { value: v, text: v + '×' })));
    scale.addEventListener('change', () => (S.pngScale = parseInt(scale.value, 10)));
    const dur = el('input', { type: 'range', id: 'f-recSeconds', min: 1, max: 30, step: 1 });
    const durOut = el('output', { for: 'f-recSeconds' });
    dur.addEventListener('input', () => {
      S.recSeconds = parseInt(dur.value, 10);
      durOut.textContent = S.recSeconds + ' ' + t('seconds');
    });
    const recBtn = el('button', { type: 'button', class: 'btn rec', onclick: toggleRecord });
    return el('div', { class: 'export' }, [
      el('div', { class: 'row inline' }, [el('label', { for: 'f-pngScale', text: t('pngScale') }), scale]),
      el('div', { class: 'btn-grid' }, [
        el('button', { type: 'button', class: 'btn primary', text: t('png'), onclick: exportPNG }),
        el('button', { type: 'button', class: 'btn', text: t('copyText'), onclick: copyText }),
        el('button', { type: 'button', class: 'btn', text: t('txt'), onclick: () => exportText('txt') }),
        el('button', { type: 'button', class: 'btn', text: t('html'), onclick: () => exportText('html') }),
        el('button', { type: 'button', class: 'btn', text: t('svg'), onclick: () => exportText('svg') })
      ]),
      el('div', { class: 'row range rec-len' }, [el('label', { for: 'f-recSeconds' }, [el('span', { text: t('duration') }), durOut]), dur]),
      recBtn,
      el('small', { class: 'hint', text: t('recordHint') })
    ]);
  }

  function syncExport(node) {
    node.querySelector('#f-pngScale').value = S.pngScale;
    const dur = node.querySelector('#f-recSeconds');
    dur.value = S.recSeconds;
    node.querySelector('output[for="f-recSeconds"]').textContent = S.recSeconds + ' ' + t('seconds');
    node.querySelector('.rec-len').hidden = kind() === 'video';
    const btn = node.querySelector('.rec');
    btn.textContent = recording ? t('stopRec') : t('record');
    btn.classList.toggle('on', !!recording);
  }

  /* ---------- presets ---------- */

  const PRESET_KEY = 'tlk-ascii.presets';

  function readPresets() {
    try {
      const v = JSON.parse(localStorage.getItem(PRESET_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }

  function writePresets(list) {
    try {
      localStorage.setItem(PRESET_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

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

  function applySettings(partial, base) {
    Object.assign(S, base || {}, clean(partial));
    ['textFont', 'titleFont', 'glyphFont'].forEach((k) => ensureFont(S[k]));
    if (source && source.kind === 'text') source.dirty = true;
    syncPanel();
    invalidate();
  }

  function buildPresets() {
    const name = el('input', { type: 'text', id: 'f-presetName', maxlength: 40, placeholder: t('presetName'), 'aria-label': t('presetName') });
    const list = el('ul', { class: 'presets' });
    const importInput = el('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    importInput.addEventListener('change', async () => {
      const f = importInput.files[0];
      importInput.value = '';
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        applySettings(data.settings || data, GF.DEFAULTS);
        toast(t('presetLoaded'));
      } catch (e) {
        toast(t('openFailed'), true);
      }
    });
    return el('div', { class: 'preset-block' }, [
      el('div', { class: 'inline-form' }, [name, el('button', {
        type: 'button', class: 'btn', text: t('savePreset'), onclick: () => {
          const n = name.value.trim() || ('Preset ' + (readPresets().length + 1));
          const listNow = readPresets().filter((p) => p.name !== n);
          listNow.unshift({ name: n, settings: Object.assign({}, S) });
          if (writePresets(listNow.slice(0, 50))) {
            name.value = '';
            toast(t('presetSaved'));
            syncPanel();
          } else toast(t('renderFailed'), true);
        }
      })]),
      list,
      el('div', { class: 'btn-grid' }, [
        el('button', {
          type: 'button', class: 'btn', text: t('exportPreset'), onclick: () => {
            const blob = new Blob([JSON.stringify({ app: 'tlk-ascii', version: 1, settings: S }, null, 2)], { type: 'application/json' });
            GF.Exporter.download(blob, 'tlk-ascii-preset-' + GF.Exporter.stamp() + '.json');
          }
        }),
        el('button', { type: 'button', class: 'btn', text: t('importPreset'), onclick: () => importInput.click() })
      ]),
      el('button', { type: 'button', class: 'btn ghost', text: t('reset'), onclick: () => applySettings({}, GF.DEFAULTS) }),
      importInput
    ]);
  }

  function syncPresets(node) {
    const list = node.querySelector('.presets');
    const items = readPresets();
    if (!items.length) {
      list.replaceChildren(el('li', { class: 'empty', text: t('noPresets') }));
      return;
    }
    list.replaceChildren(...items.map((p, i) => el('li', {}, [
      el('button', {
        type: 'button', class: 'link', text: p.name, title: t('loadPreset'), onclick: () => {
          applySettings(p.settings, GF.DEFAULTS);
          toast(t('presetLoaded'));
        }
      }),
      el('button', {
        type: 'button', class: 'icon-btn', title: t('deletePreset'), 'aria-label': t('deletePreset') + ': ' + p.name, text: '×', onclick: () => {
          const l = readPresets();
          l.splice(i, 1);
          writePresets(l);
          syncPanel();
        }
      })
    ])));
  }

  /* ---------- fonts ---------- */

  const fontReady = new Map();
  function ensureFont(id) {
    const f = GF.FONTS.find((x) => x.id === id);
    if (!f || id === 'system' || fontReady.has(id)) return fontReady.get(id) || Promise.resolve();
    const p = Promise.all([
      document.fonts.load('400 32px ' + f.family),
      document.fonts.load('700 32px ' + f.family)
    ]).catch(() => {}).then(() => {
      renderer.clearCache();
      if (source && source.kind === 'text') source.dirty = true;
      invalidate();
    });
    fontReady.set(id, p);
    return p;
  }

  function loadAllFonts() {
    const fams = ['"Noto Sans Symbols 2 Subset"', '"Noto Sans Runic"'];
    const extra = fams.map((f) => document.fonts.load('32px ' + f, '♠⠿ᚠ').catch(() => {}));
    return Promise.all(GF.FONTS.map((f) => ensureFont(f.id)).concat(extra));
  }

  /* ---------- sources ---------- */

  async function setSource(promise, demo) {
    const token = ++sourceToken;
    $('#stage').classList.add('busy');
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
      $('#stage').classList.remove('empty');
      syncPanel();
      invalidate();
      return true;
    } catch (e) {
      if (token === sourceToken) toast(t('openFailed'), true);
      return false;
    } finally {
      if (token === sourceToken) $('#stage').classList.remove('busy');
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

  function openText() {
    const src = GF.Sources.text();
    src.dirty = true;
    src.update(0, S);
    setSource(Promise.resolve(src));
  }

  async function loadDemo(id) {
    const demo = GF.DEMOS.find((d) => d.id === id) || GF.DEMOS[0];
    applySettings(demo.settings, GF.DEFAULTS);
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
    if (ok) {
      try {
        history.replaceState(null, '', '#demo=' + demo.id);
      } catch (e) { /* file:// may refuse */ }
    }
    return ok;
  }

  /* ---------- render loop ---------- */

  function frame(ts) {
    requestAnimationFrame(frame);
    if (!source) return;
    const animated = source.animated || S.anim !== 'none' || !!recording;
    if (!dirty && !(animated && playing)) return;
    if (!dirty && ts - lastFrame < 1000 / 30 - 2) return;
    lastFrame = ts;
    const time = now();
    try {
      source.update(time, S);
      const info = renderer.render(source, S, out, { time });
      if (info) {
        const sizeChanged = !lastInfo || lastInfo.W !== info.W || lastInfo.H !== info.H;
        lastInfo = info;
        if (sizeChanged) applyZoom();
        updateStatus(info);
        const prev = $('#panel .glyphs');
        if (prev && dirty) syncGlyphPreview(prev);
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
    syncPanel();
    syncPlayButton();
    invalidate();
  }

  function restartClock() {
    clockStart = performance.now();
    pausedTime = 0;
    if (source && source.kind === 'video') source.el.currentTime = 0;
    invalidate();
  }

  function syncPlayButton() {
    const b = $('#btn-play');
    const animated = !!source && (source.animated || S.anim !== 'none');
    b.hidden = !animated;
    b.textContent = playing ? '❚❚' : '▶';
    b.title = playing ? t('pause') : t('play');
    b.setAttribute('aria-label', b.title);
  }

  /* ---------- viewport ---------- */

  function applyZoom() {
    if (!lastInfo) return;
    let z = zoom;
    if (z === 'fit') {
      const pad = 48;
      z = Math.min((viewport.clientWidth - pad) / lastInfo.W, (viewport.clientHeight - pad) / lastInfo.H, 2);
      z = Math.max(0.05, z);
    }
    out.style.width = Math.round(lastInfo.W * z) + 'px';
    out.style.height = Math.round(lastInfo.H * z) + 'px';
    $('#zoom-label').textContent = Math.round(z * 100) + '%';
    viewport.classList.toggle('scroll', zoom !== 'fit');
  }

  function zoomBy(f) {
    if (!lastInfo) return;
    const cur = zoom === 'fit' ? parseFloat(out.style.width) / lastInfo.W : zoom;
    zoom = Math.max(0.05, Math.min(8, cur * f));
    applyZoom();
  }

  viewport.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });

  let pan = null;
  viewport.addEventListener('pointerdown', (e) => {
    if (zoom === 'fit' || e.button !== 0) return;
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

  /* ---------- exports ---------- */

  function needRender() {
    if (!source || !renderer.last) {
      toast(t('sourceNone'), true);
      return false;
    }
    return true;
  }

  function renderBlob(scale, type, quality) {
    const off = document.createElement('canvas');
    const eff = Math.max(0.25, Math.min(scale, 8192 / S.outWidth));
    source.update(now(), S);
    const info = renderer.render(source, S, off, { scale: eff, time: now() });
    if (!info) return Promise.reject(new Error('render'));
    invalidate();
    return new Promise((resolve, reject) => off.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), type || 'image/png', quality));
  }

  async function exportPNG() {
    if (!needRender()) return;
    toast(t('exporting'));
    try {
      const blob = await renderBlob(S.pngScale, 'image/png');
      GF.Exporter.download(blob, 'tlk-ascii-' + GF.Exporter.stamp() + '.png');
      toast(t('saved'));
    } catch (e) {
      toast(t('renderFailed'), true);
    }
  }

  function exportText(kindOut) {
    if (!needRender()) return;
    const last = renderer.last;
    let blob;
    if (kindOut === 'txt') blob = new Blob([GF.Exporter.toText(last)], { type: 'text/plain;charset=utf-8' });
    else if (kindOut === 'html') blob = new Blob([GF.Exporter.toHTML(last)], { type: 'text/html;charset=utf-8' });
    else blob = new Blob([GF.Exporter.toSVG(last)], { type: 'image/svg+xml;charset=utf-8' });
    GF.Exporter.download(blob, 'tlk-ascii-' + GF.Exporter.stamp() + '.' + kindOut);
    toast(t('saved'));
  }

  async function copyText() {
    if (!needRender()) return;
    const text = GF.Exporter.toText(renderer.last);
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = el('textarea', { style: 'position:fixed;opacity:0' });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast(t('copied'));
  }

  async function toggleRecord() {
    if (recording) {
      recording.stop();
      return;
    }
    if (!needRender()) return;
    if (!GF.Exporter.recorderType()) {
      toast(t('noRecorder'), true);
      return;
    }
    const isVideo = source.kind === 'video';
    let onEnded = null;
    if (isVideo) {
      source.el.loop = false;
      source.el.currentTime = 0;
      await source.el.play().catch(() => {});
      playing = true;
    }
    const rec = GF.Exporter.record(out, isVideo ? 0 : S.recSeconds, (s) => {
      $('#rec-badge').textContent = '● ' + t('recording') + ' ' + s.toFixed(1) + ' ' + t('seconds');
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
    syncPanel();
    const { blob, ext } = await rec.done;
    recording = null;
    document.body.classList.remove('recording');
    if (isVideo && source && source.el) {
      source.el.loop = true;
      if (onEnded) source.el.removeEventListener('ended', onEnded);
      source.el.play().catch(() => {});
    }
    syncPanel();
    GF.Exporter.download(blob, 'tlk-ascii-' + GF.Exporter.stamp() + '.' + ext);
    toast(t('saved'));
  }

  /* ---------- dialogs ---------- */

  function openDemos() {
    const grid = $('#demo-grid');
    grid.replaceChildren(...GF.DEMOS.map((d) => el('button', {
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

  /* ---------- static UI text ---------- */

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
    buildPanel();
    syncPlayButton();
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
  $('#btn-png').addEventListener('click', exportPNG);
  $('#btn-about').addEventListener('click', () => $('#dlg-about').showModal());
  $('#btn-play').addEventListener('click', togglePlay);
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
    const typing = e.target.closest && e.target.closest('input, textarea, select');
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      fileInput.click();
    } else if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      exportPNG();
    } else if (mod && e.shiftKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      copyText();
    } else if (!typing && !mod) {
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'f') {
        zoom = 'fit';
        applyZoom();
      } else if (e.key === 'd') openDemos();
      else if (e.key === '+' || e.key === '=') zoomBy(1.25);
      else if (e.key === '-') zoomBy(0.8);
    }
  });

  /* ---------- start ---------- */

  if (isDesktop) document.body.classList.add('desktop');
  $('#repo-link').href = REPO;
  $('#download-link').href = REPO + '/releases/latest';
  applyStaticText();
  buildPanel();
  syncPlayButton();
  requestAnimationFrame(frame);

  const ready = loadAllFonts().then(() => {
    const m = /demo=([\w-]+)/.exec(location.hash);
    return loadDemo(m ? m[1] : GF.DEMOS[0].id);
  }).then((ok) => {
    if (!source) $('#stage').classList.add('empty');
    $('#stage').classList.remove('busy');
    syncPlayButton();
    return ok;
  });

  /* Small scripting surface, used by the demo renderer and tests. */
  window.TLKASCII = {
    ready,
    loadDemo: (id) => loadDemo(id).then(() => {
      syncPlayButton();
      return true;
    }),
    set(partial) {
      applySettings(partial);
    },
    get settings() {
      return Object.assign({}, S);
    },
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
    text() {
      return renderer.last ? GF.Exporter.toText(renderer.last) : '';
    },
    html() {
      return renderer.last ? GF.Exporter.toHTML(renderer.last) : '';
    },
    svg() {
      return renderer.last ? GF.Exporter.toSVG(renderer.last) : '';
    }
  };
})(window.GF = window.GF || {});
