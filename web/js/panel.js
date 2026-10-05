/* The tabbed settings panel. The app passes a context with the settings
   object and a few actions; the panel never touches the renderer directly. */
(function (GF) {
  'use strict';

  const { el } = GF.UI;
  let ctx = null;
  const t = (k, v) => GF.i18n.t(k, v);
  const nm = (o) => GF.i18n.name(o);

  const bindings = [];
  const tabButtons = {};
  const panes = {};
  let activeTab = 'looks';
  let csCat = null;
  let csSeen = null;
  let palCat = null;
  let palSeen = null;
  let lastPalette = 'medieval/ember';
  const thumbs = { tiles: [], timer: 0, token: 0, dirty: true };

  try {
    activeTab = localStorage.getItem('tlk-ascii.tab') || 'looks';
  } catch (e) { /* storage may be unavailable */ }

  const S = () => ctx.S;
  const is = (k, v) => () => S()[k] === v;
  const hasTitle = () => !!String(S().title || '').trim();

  const TABS = [
    {
      id: 'looks', label: 'tab.looks', sections: [
        { title: 'sec.looks', rows: [{ type: 'looks' }] },
        { title: 'sec.saved', rows: [{ type: 'presets' }] }
      ]
    },
    {
      id: 'glyphs', label: 'tab.glyphs', sections: [
        {
          title: 'sec.mode', rows: [
            { k: 'mode', type: 'segmented', bare: true, options: [['ascii', 'modeAscii'], ['edges', 'modeEdges'], ['halftone', 'modeHalftone']] },
            { k: 'edgeThreshold', type: 'range', min: 5, max: 95, step: 1, unit: '%', when: is('mode', 'edges') },
            { k: 'edgeGlyphs', type: 'segmented', options: [['ascii', 'edgeAscii'], ['box', 'edgeBox']], when: is('mode', 'edges') },
            { k: 'edgeFill', type: 'check', when: is('mode', 'edges') },
            { k: 'halftoneChar', type: 'text', maxlength: 2, when: is('mode', 'halftone') },
            { k: 'dither', type: 'segmented', options: [['none', 'ditherNone'], ['floyd', 'ditherFloyd'], ['atkinson', 'ditherAtkinson'], ['bayer', 'ditherBayer']] }
          ]
        },
        {
          title: 'sec.charset', when: () => S().mode !== 'halftone', rows: [
            { type: 'charsets' },
            { k: 'inject', type: 'text', hint: 'injectHint', maxlength: 64 }
          ]
        },
        {
          title: 'sec.grid', rows: [
            { k: 'depth', type: 'range', min: 2, max: 64, step: 1 },
            { k: 'cell', type: 'range', min: 4, max: 48, step: 1, unit: 'px' },
            { k: 'grid', type: 'segmented', options: [['text', 'gridText'], ['square', 'gridSquare']] },
            { k: 'glyphFont', type: 'select', options: () => GF.FONTS.map((f) => [f.id, f.name]) },
            { k: 'glyphScale', type: 'range', min: 50, max: 160, step: 1, unit: '%' },
            { k: 'bold', type: 'check', label: 'glyphBold' },
            { k: 'offset', type: 'range', min: 0, max: 32, step: 1, when: () => S().mode !== 'halftone' }
          ]
        }
      ]
    },
    {
      id: 'color', label: 'tab.color', sections: [
        {
          title: 'sec.tone', rows: [
            { k: 'invert', type: 'check' },
            { k: 'brightness', type: 'range', min: -100, max: 100, step: 1 },
            { k: 'contrast', type: 'range', min: -100, max: 100, step: 1 },
            { k: 'gamma', type: 'range', min: 0.2, max: 3, step: 0.05 },
            { k: 'threshold', type: 'range', min: 0, max: 95, step: 1, unit: '%' },
            { k: 'saturation', type: 'range', min: 0, max: 300, step: 5, unit: '%', when: is('colorMode', 'source') }
          ]
        },
        {
          title: 'sec.color', rows: [
            { k: 'colorMode', type: 'segmented', options: [['palette', 'modePalette'], ['single', 'modeSingle'], ['source', 'modeSource']] },
            { type: 'palettes', when: is('colorMode', 'palette') },
            { type: 'customPalette', when: () => S().colorMode === 'palette' && S().palette.startsWith('custom') },
            { k: 'color', type: 'color', when: is('colorMode', 'single') },
            { k: 'fade', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
            { k: 'bg', type: 'color', when: () => !S().transparent },
            { k: 'transparent', type: 'check' }
          ]
        }
      ]
    },
    {
      id: 'effects', label: 'tab.effects', sections: [
        {
          title: 'sec.light', rows: [
            { k: 'glow', type: 'range', min: 0, max: 300, step: 5, unit: '%' },
            { k: 'glowRadius', type: 'range', min: 1, max: 40, step: 1, unit: 'px', when: () => S().glow > 0 },
            { k: 'chroma', type: 'range', min: 0, max: 12, step: 0.5, unit: 'px' }
          ]
        },
        {
          title: 'sec.screen', rows: [
            { k: 'scanlines', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
            { k: 'vignette', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
            { k: 'grain', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
            { k: 'curvature', type: 'range', min: 0, max: 100, step: 1, unit: '%' }
          ]
        },
        {
          title: 'sec.title', rows: [
            { k: 'title', type: 'textarea', maxlength: 120 },
            { k: 'titleFont', type: 'select', options: () => GF.FONTS.map((f) => [f.id, f.name]), when: hasTitle },
            { k: 'titleSize', type: 'range', min: 3, max: 30, step: 0.5, unit: '%', when: hasTitle },
            { k: 'titleMode', type: 'segmented', options: [['overlay', 'modeOverlay'], ['baked', 'modeBaked']], when: hasTitle },
            { k: 'titlePos', type: 'segmented', options: [['top', 'posTop'], ['center', 'posCenter'], ['bottom', 'posBottom']], when: hasTitle },
            { k: 'titleColor', type: 'color', when: () => hasTitle() && (S().titleMode !== 'baked' || S().colorMode === 'source') },
            { k: 'titleGlow', type: 'range', min: 0, max: 200, step: 5, unit: '%', when: () => hasTitle() && S().titleMode !== 'baked' }
          ]
        },
        {
          title: 'sec.motion', rows: [
            { k: 'anim', type: 'segmented', bare: true, options: [['none', 'animNone'], ['cycle', 'animCycle'], ['flicker', 'animFlicker'], ['wave', 'animWave']] },
            { k: 'animSpeed', type: 'range', min: 1, max: 30, step: 1, when: () => S().anim !== 'none' },
            { k: 'animAmount', type: 'range', min: 1, max: 100, step: 1, unit: '%', when: () => S().anim === 'flicker' || S().anim === 'wave' }
          ]
        }
      ]
    },
    {
      id: 'frame', label: 'tab.frame', sections: [
        {
          title: 'sec.source', rows: [
            { type: 'sourceInfo' },
            { k: 'text', type: 'textarea', label: 'textContent', maxlength: 200, when: () => ctx.kind() === 'text' },
            { k: 'textFont', type: 'select', options: () => GF.FONTS.map((f) => [f.id, f.name]), when: () => ctx.kind() === 'text' },
            { k: 'textWeight', type: 'segmented', options: [['regular', 'regular'], ['bold', 'bold']], when: () => ctx.kind() === 'text' },
            { k: 'textAspect', type: 'segmented', wrap: true, options: () => GF.TEXT_ASPECTS.map((a) => [a, '']), when: () => ctx.kind() === 'text' },
            { k: 'mirror', type: 'check', when: () => ctx.kind() === 'webcam' }
          ]
        },
        {
          title: 'sec.framing', rows: [
            { k: 'frame', type: 'segmented', wrap: true, options: [['source', 'frameSource'], ['1:1', ''], ['4:5', ''], ['9:16', ''], ['16:9', ''], ['3:2', ''], ['21:9', '']] },
            { k: 'frameZoom', type: 'range', min: 1, max: 4, step: 0.05, unit: '×' },
            { k: 'frameX', type: 'range', min: -100, max: 100, step: 1 },
            { k: 'frameY', type: 'range', min: -100, max: 100, step: 1 },
            { type: 'frameButtons' },
            { type: 'hint', text: 'frameHint' }
          ]
        },
        {
          title: 'sec.output', rows: [
            { k: 'outWidth', type: 'range', min: 320, max: 2400, step: 20, unit: 'px' },
            { k: 'outWidth', type: 'segmented', wrap: true, id: 'widthChips', bare: true, options: [[720, ''], [1080, ''], [1440, ''], [1920, ''], [2400, '']] }
          ]
        }
      ]
    }
  ];

  /* Custom blocks refresh when these keys change. */
  const DEPS = {
    charsets: ['charSet', 'glyphFont', 'bold', 'inject'],
    palettes: ['palette', 'customStops', 'colorMode'],
    customPalette: ['customStops', 'palette'],
    sourceInfo: ['anim', '_source', '_play'],
    frameButtons: ['flipX', 'rotate']
  };

  function sampleOf(chars) {
    const list = Array.from(chars).filter((c) => c.trim());
    if (list.length <= 9) return list.join('');
    const out = [];
    for (let i = 0; i < 9; i++) out.push(list[Math.round((i * (list.length - 1)) / 8)]);
    return out.join('');
  }

  /* ---------- custom blocks ---------- */

  function charsets() {
    const cats = el('div', { class: 'chips', role: 'group', 'aria-label': t('sec.charset') });
    const grid = el('div', { class: 'tiles' });
    const note = el('small', { class: 'hint' });
    function render() {
      const s = S();
      /* follow the setting when it changes from outside (demo, look, undo) */
      if (s.charSet !== csSeen) {
        csSeen = s.charSet;
        csCat = s.charSet.split('/')[0];
      }
      cats.replaceChildren(...GF.CHARSET_CATEGORIES.map((c) => el('button', {
        type: 'button', class: 'chip', 'aria-pressed': c.id === csCat ? 'true' : 'false', text: nm(c.name),
        onclick: () => {
          csCat = c.id;
          render();
        }
      })));
      const cat = GF.CHARSET_CATEGORIES.find((c) => c.id === csCat) || GF.CHARSET_CATEGORIES[0];
      const family = GF.fontStack(s.glyphFont);
      grid.replaceChildren(...cat.sets.map((set) => {
        const key = cat.id + '/' + set.id;
        const on = s.charSet === key;
        return el('button', {
          type: 'button', class: 'tile', 'aria-pressed': on ? 'true' : 'false', title: nm(set.name),
          onclick: () => ctx.set('charSet', key)
        }, [
          el('span', { class: 'tile-glyphs', style: { fontFamily: family, fontWeight: s.bold ? 700 : 400 }, text: sampleOf(set.chars) }),
          el('span', { class: 'tile-name', text: nm(set.name) })
        ]);
      }));
      grid.classList.toggle('muted', !!(s.inject && s.inject.trim()));
      note.textContent = s.inject && s.inject.trim() ? t('injectHint') : '';
      note.hidden = !note.textContent;
    }
    return { node: el('div', { class: 'picker' }, [cats, grid, note]), sync: render };
  }

  function palettes() {
    const cats = el('div', { class: 'chips', role: 'group', 'aria-label': t('sec.color') });
    const grid = el('div', { class: 'swatches' });
    function render() {
      const s = S();
      if (s.palette !== palSeen) {
        palSeen = s.palette;
        palCat = s.palette.split('/')[0];
      }
      cats.replaceChildren(...GF.PALETTE_CATEGORIES.map((c) => el('button', {
        type: 'button', class: 'chip', 'aria-pressed': c.id === palCat ? 'true' : 'false', text: nm(c.name),
        onclick: () => {
          palCat = c.id;
          render();
        }
      })));
      const cat = GF.PALETTE_CATEGORIES.find((c) => c.id === palCat) || GF.PALETTE_CATEGORIES[0];
      grid.replaceChildren(...cat.palettes.map((p) => {
        const key = cat.id + '/' + p.id;
        const stops = GF.paletteStops(key, s);
        const on = s.palette === key;
        return el('button', {
          type: 'button', class: 'swatch', 'aria-pressed': on ? 'true' : 'false', title: nm(p.name),
          onclick: () => {
            if (!key.startsWith('custom')) lastPalette = key;
            ctx.set('palette', key);
          }
        }, [el('span', { class: 'swatch-bar', style: { background: GF.gradientCSS(stops) } }), el('span', { class: 'swatch-name', text: nm(p.name) })]);
      }));
    }
    return { node: el('div', { class: 'picker' }, [cats, grid]), sync: render };
  }

  function customPalette() {
    const list = el('div', { class: 'stops' });
    const add = el('button', { type: 'button', class: 'btn small', text: '+ ' + t('addStop') });
    const copy = el('button', { type: 'button', class: 'btn small quiet', text: t('fromCurrent') });
    add.addEventListener('click', () => {
      const stops = GF.parseStops(S().customStops);
      if (stops.length < 8) ctx.set('customStops', stops.concat(stops[stops.length - 1]).join(','));
    });
    copy.addEventListener('click', () => ctx.set('customStops', GF.paletteStops(lastPalette).join(',')));
    function render() {
      const stops = GF.parseStops(S().customStops);
      list.replaceChildren(...stops.map((c, i) => {
        const pick = el('input', { type: 'color', value: c, 'aria-label': t('customStops') + ' ' + (i + 1) });
        pick.addEventListener('input', () => {
          const next = GF.parseStops(S().customStops);
          next[i] = pick.value;
          ctx.set('customStops', next.join(','));
        });
        return el('div', { class: 'stop' }, [pick, stops.length > 2 ? el('button', {
          type: 'button', class: 'icon-btn', text: '×', title: t('removeStop'), 'aria-label': t('removeStop') + ' ' + (i + 1),
          onclick: () => {
            const next = GF.parseStops(S().customStops);
            next.splice(i, 1);
            ctx.set('customStops', next.join(','));
          }
        }) : null]);
      }));
      add.disabled = stops.length >= 8;
    }
    return {
      node: el('div', { class: 'row' }, [el('span', { class: 'label', text: t('customStops') }), list, el('div', { class: 'btn-row' }, [add, copy])]),
      sync: render
    };
  }

  function sourceInfo() {
    const kindLabel = el('strong');
    const name = el('span', { class: 'muted' });
    const play = el('button', { type: 'button', class: 'btn small', onclick: () => ctx.togglePlay() });
    const restart = el('button', { type: 'button', class: 'btn small', text: t('restart'), onclick: () => ctx.restart() });
    const ctrls = el('div', { class: 'btn-row' }, [play, restart]);
    const node = el('div', { class: 'src-info' }, [el('div', { class: 'src-name' }, [kindLabel, name]), ctrls]);
    return {
      node,
      sync() {
        const k = ctx.kind();
        const map = { none: 'sourceNone', image: 'sourceImage', video: 'sourceVideo', animation: 'sourceAnimation', webcam: 'sourceWebcam', text: 'sourceText', procedural: 'sourceProcedural' };
        kindLabel.textContent = t(map[k] || 'sourceNone');
        const n = ctx.sourceName();
        name.textContent = n ? ' · ' + n : '';
        ctrls.hidden = !ctx.isAnimated();
        play.textContent = ctx.isPlaying() ? t('pause') : t('play');
      }
    };
  }

  function frameButtons() {
    const flip = el('button', { type: 'button', class: 'btn small', text: t('flipX'), onclick: () => ctx.set('flipX', !S().flipX) });
    const node = el('div', { class: 'btn-row' }, [
      el('button', { type: 'button', class: 'btn small', text: '⟲', title: t('rotateLeft'), 'aria-label': t('rotateLeft'), onclick: () => ctx.set('rotate', (S().rotate + 270) % 360) }),
      el('button', { type: 'button', class: 'btn small', text: '⟳', title: t('rotateRight'), 'aria-label': t('rotateRight'), onclick: () => ctx.set('rotate', (S().rotate + 90) % 360) }),
      flip,
      el('button', {
        type: 'button', class: 'btn small quiet', text: t('resetFrame'),
        onclick: () => ctx.setMany({ frame: 'source', frameZoom: 1, frameX: 0, frameY: 0, rotate: 0, flipX: false })
      })
    ]);
    return { node, sync() { flip.setAttribute('aria-pressed', S().flipX ? 'true' : 'false'); } };
  }

  function looks() {
    const grid = el('div', { class: 'looks' });
    thumbs.tiles = GF.LOOKS.map((look) => {
      const canvas = el('canvas', { width: 4, height: 3 });
      const node = el('button', { type: 'button', class: 'look', onclick: () => ctx.applyLook(GF.lookSettings(look)) }, [
        el('span', { class: 'look-img' }, [canvas]),
        el('span', { class: 'look-name', text: nm(look.name) })
      ]);
      grid.append(node);
      return { look, canvas };
    });
    const node = el('div', { class: 'looks-block' }, [
      el('div', { class: 'btn-row' }, [el('button', { type: 'button', class: 'btn', text: t('randomLook') + '  (R)', onclick: () => ctx.applyLook(GF.randomLook()) })]),
      el('small', { class: 'hint', text: t('looksHint') }),
      grid
    ]);
    scheduleThumbs(50);
    return { node, sync() {} };
  }

  function presets() {
    const KEY = 'tlk-ascii.presets';
    const read = () => {
      try {
        const v = JSON.parse(localStorage.getItem(KEY) || '[]');
        return Array.isArray(v) ? v : [];
      } catch (e) {
        return [];
      }
    };
    const write = (l) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(l));
        return true;
      } catch (e) {
        return false;
      }
    };
    const name = el('input', { type: 'text', maxlength: 40, placeholder: t('presetName'), 'aria-label': t('presetName') });
    const list = el('ul', { class: 'presets' });
    const importInput = el('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    importInput.addEventListener('change', async () => {
      const f = importInput.files[0];
      importInput.value = '';
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        ctx.setMany(data.settings || data, GF.DEFAULTS);
        ctx.toast(t('presetLoaded'));
      } catch (e) {
        ctx.toast(t('openFailed'), true);
      }
    });
    function render() {
      const items = read();
      if (!items.length) {
        list.replaceChildren(el('li', { class: 'empty', text: t('noPresets') }));
        return;
      }
      list.replaceChildren(...items.map((p, i) => el('li', {}, [
        el('button', {
          type: 'button', class: 'link', text: p.name, title: t('loadPreset'),
          onclick: () => {
            ctx.setMany(p.settings, GF.DEFAULTS);
            ctx.toast(t('presetLoaded'));
          }
        }),
        el('button', {
          type: 'button', class: 'icon-btn', text: '×', title: t('deletePreset'), 'aria-label': t('deletePreset') + ': ' + p.name,
          onclick: () => {
            const l = read();
            l.splice(i, 1);
            write(l);
            render();
          }
        })
      ])));
    }
    const save = el('button', {
      type: 'button', class: 'btn', text: t('savePreset'),
      onclick: () => {
        const n = name.value.trim() || 'Preset ' + (read().length + 1);
        const l = read().filter((p) => p.name !== n);
        l.unshift({ name: n, settings: Object.assign({}, S()) });
        if (write(l.slice(0, 50))) {
          name.value = '';
          ctx.toast(t('presetSaved'));
          render();
        } else ctx.toast(t('renderFailed'), true);
      }
    });
    const node = el('div', { class: 'preset-block' }, [
      el('div', { class: 'inline-form' }, [name, save]),
      list,
      el('div', { class: 'btn-row' }, [
        el('button', {
          type: 'button', class: 'btn small', text: t('exportPreset'),
          onclick: () => {
            const blob = new Blob([JSON.stringify({ app: 'tlk-ascii', version: 2, settings: S() }, null, 2)], { type: 'application/json' });
            GF.Exporter.download(blob, 'tlk-ascii-preset-' + GF.Exporter.stamp() + '.json');
          }
        }),
        el('button', { type: 'button', class: 'btn small', text: t('importPreset'), onclick: () => importInput.click() }),
        el('button', { type: 'button', class: 'btn small quiet', text: t('reset'), onclick: () => ctx.setMany({}, GF.DEFAULTS) })
      ]),
      importInput
    ]);
    return { node, sync: render };
  }

  /* ---------- rows ---------- */

  function control(row) {
    const s = S();
    const label = row.label ? t(row.label) : row.k ? t(row.k) : '';
    const base = { key: row.k, label, get: () => S()[row.k], onInput: (v) => ctx.set(row.k, v) };
    switch (row.type) {
      case 'range':
        return GF.UI.range(Object.assign(base, { min: row.min, max: row.max, step: row.step, unit: row.unit, reset: GF.DEFAULTS[row.k] }));
      case 'segmented': {
        const opts = () => (typeof row.options === 'function' ? row.options() : row.options).map(([v, l]) => [v, l ? t(l) : String(v)]);
        return GF.UI.segmented(Object.assign(base, { options: opts, wrap: row.wrap, label: row.bare || row.id === 'widthChips' ? '' : label }));
      }
      case 'select':
        return GF.UI.select(Object.assign(base, { options: row.options }));
      case 'check':
        return GF.UI.check(base);
      case 'color':
        return GF.UI.color(base);
      case 'text':
        return GF.UI.text(Object.assign(base, { maxlength: row.maxlength, hint: row.hint ? t(row.hint) : '' }));
      case 'textarea':
        return GF.UI.text(Object.assign(base, { maxlength: row.maxlength, multiline: true }));
      case 'charsets': return charsets();
      case 'palettes': return palettes();
      case 'customPalette': return customPalette();
      case 'sourceInfo': return sourceInfo();
      case 'frameButtons': return frameButtons();
      case 'looks': return looks();
      case 'presets': return presets();
      case 'hint': return { node: el('small', { class: 'hint', text: t(row.text) }), sync() {} };
      default:
        void s;
        return { node: el('div'), sync() {} };
    }
  }

  function build() {
    const tabbar = document.getElementById('tabs');
    const body = document.getElementById('panel');
    bindings.length = 0;
    tabbar.replaceChildren();
    body.replaceChildren();
    for (const tab of TABS) {
      const btn = el('button', {
        type: 'button', role: 'tab', id: 'tab-' + tab.id, 'aria-controls': 'pane-' + tab.id, text: t(tab.label),
        onclick: () => setTab(tab.id)
      });
      tabButtons[tab.id] = btn;
      tabbar.append(btn);
      const pane = el('div', { role: 'tabpanel', id: 'pane-' + tab.id, 'aria-labelledby': 'tab-' + tab.id, class: 'pane' });
      for (const sec of tab.sections) {
        const secNode = el('section', { class: 'sec' }, [el('h3', { text: t(sec.title) })]);
        bindings.push({ row: { when: sec.when }, node: secNode, sync() {}, section: true });
        for (const row of sec.rows) {
          const c = control(row);
          secNode.append(c.node);
          bindings.push({ row, node: c.node, sync: c.sync, id: row.k || row.type });
        }
        pane.append(secNode);
      }
      panes[tab.id] = pane;
      body.append(pane);
    }
    tabbar.addEventListener('keydown', onTabKey);
    setTab(TABS.some((x) => x.id === activeTab) ? activeTab : 'looks');
    sync();
  }

  function onTabKey(e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const ids = TABS.map((x) => x.id);
    const i = ids.indexOf(activeTab);
    setTab(ids[(i + (e.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length]);
    tabButtons[activeTab].focus();
    e.preventDefault();
  }

  function setTab(id) {
    activeTab = id;
    try {
      localStorage.setItem('tlk-ascii.tab', id);
    } catch (e) { /* storage may be unavailable */ }
    for (const k in panes) {
      const on = k === id;
      panes[k].hidden = !on;
      tabButtons[k].setAttribute('aria-selected', on ? 'true' : 'false');
      tabButtons[k].tabIndex = on ? 0 : -1;
    }
    document.getElementById('panel').scrollTop = 0;
    if (id === 'looks' && thumbs.dirty) scheduleThumbs(30);
  }

  /* Without a key everything refreshes; with one, only the matching row,
     rows that depend on it and rows that just became visible. */
  function sync(changed) {
    for (const b of bindings) {
      const show = !b.row.when || b.row.when();
      const wasHidden = b.node.hidden;
      b.node.hidden = !show;
      if (!show || b.section) continue;
      if (!changed || wasHidden || b.id === changed || (DEPS[b.id] && DEPS[b.id].includes(changed))) b.sync();
    }
    if (changed && !GF.LOOK_KEYS.includes(changed) && !GF.EXPORT_KEYS.includes(changed) && changed.charAt(0) !== '_') scheduleThumbs(450);
  }

  /* ---------- look thumbnails ---------- */

  function scheduleThumbs(delay) {
    thumbs.dirty = true;
    if (activeTab !== 'looks' || !thumbs.tiles.length || !ctx || !ctx.hasSource()) return;
    clearTimeout(thumbs.timer);
    thumbs.timer = setTimeout(runThumbs, delay || 0);
  }

  function runThumbs() {
    thumbs.dirty = false;
    const token = ++thumbs.token;
    let i = 0;
    const step = () => {
      if (token !== thumbs.token || activeTab !== 'looks') return;
      const tile = thumbs.tiles[i++];
      if (!tile) return;
      ctx.renderThumb(tile.canvas, GF.lookSettings(tile.look));
      setTimeout(step, 0);
    };
    step();
  }

  GF.Panel = {
    mount(context) {
      ctx = context;
      build();
    },
    rebuild: build,
    sync,
    setTab,
    sourceChanged() {
      sync('_source');
      scheduleThumbs(60);
    },
    get tab() {
      return activeTab;
    }
  };
})(window.GF = window.GF || {});
