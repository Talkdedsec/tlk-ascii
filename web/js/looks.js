/* Looks: one-click styles. A look sets glyphs, colour and effects but never
   the source, its framing or its tone, so it suits whatever is loaded. */
(function (GF) {
  'use strict';

  const n = (en, tr) => ({ en, tr });

  GF.LOOK_KEYS = [
    'mode', 'edgeThreshold', 'edgeGlyphs', 'edgeFill', 'halftoneChar', 'dither',
    'charSet', 'depth', 'grid', 'glyphFont', 'glyphScale', 'bold', 'offset',
    'colorMode', 'palette', 'color', 'fade', 'bg', 'saturation',
    'glow', 'glowRadius', 'chroma', 'scanlines', 'vignette', 'grain', 'curvature',
    'anim', 'animSpeed', 'animAmount'
  ];

  GF.LOOKS = [
    { id: 'ember', name: n('Ember', 'Kor'), s: { palette: 'medieval/ember', glow: 100, fade: 50 } },
    { id: 'bone', name: n('Bone', 'Kemik'), s: { palette: 'medieval/bone', glow: 110, fade: 45, depth: 32 } },
    { id: 'phosphor', name: n('Phosphor CRT', 'Fosfor CRT'), s: { charSet: 'classic/standard', palette: 'crt/phosphor', glyphFont: 'vt323', glow: 90, scanlines: 45, curvature: 35, grain: 15, vignette: 45, chroma: 1 } },
    { id: 'amber', name: n('Amber terminal', 'Kehribar terminal'), s: { palette: 'crt/amber', glyphFont: 'vt323', glow: 80, scanlines: 35, curvature: 20, vignette: 40 } },
    { id: 'ice', name: n('Braille ice', 'Braille buz'), s: { charSet: 'braille/full', depth: 48, palette: 'crt/ice', glow: 80, fade: 40 } },
    { id: 'runes', name: n('Rune stone', 'Run taşı'), s: { charSet: 'medieval/futhark', grid: 'square', palette: 'medieval/gold', glow: 90, fade: 40 } },
    { id: 'cards', name: n('Card table', 'Kart masası'), s: { charSet: 'cards/suits', grid: 'square', depth: 9, palette: 'medieval/blood', glow: 80, fade: 35 } },
    { id: 'matrix', name: n('Rain code', 'Kod yağmuru'), s: { charSet: 'scripts/katakana', palette: 'elements/forest', colorMode: 'single', color: '#3dff7a', glow: 90, fade: 60, anim: 'flicker', animAmount: 10, animSpeed: 8 } },
    { id: 'neon', name: n('Neon', 'Neon'), s: { palette: 'neon/cyber', glow: 130, chroma: 2, fade: 35 } },
    { id: 'synth', name: n('Synth blocks', 'Synth blok'), s: { charSet: 'blocks/shade', depth: 5, palette: 'neon/synthwave', glow: 70, scanlines: 25, fade: 10 } },
    { id: 'dots', name: n('Red dots', 'Kızıl noktalar'), s: { charSet: 'geometric/dots', grid: 'square', depth: 5, colorMode: 'single', color: '#ff2a1a', glow: 90, fade: 35 } },
    { id: 'halftone', name: n('Gold halftone', 'Altın yarım ton'), s: { mode: 'halftone', grid: 'square', depth: 10, palette: 'medieval/gold', glow: 70, fade: 0 } },
    { id: 'sketch', name: n('Ink sketch', 'Mürekkep eskiz'), s: { mode: 'edges', edgeFill: false, edgeThreshold: 30, colorMode: 'single', color: '#f1ece2', glow: 35, fade: 0, vignette: 20 } },
    { id: 'edgefire', name: n('Lines on fire', 'Yanan çizgiler'), s: { mode: 'edges', edgeFill: true, edgeThreshold: 35, palette: 'elements/fire', glow: 120, fade: 35 } },
    { id: 'onebit', name: n('One-bit', 'Tek bit'), s: { dither: 'atkinson', depth: 2, charSet: 'blocks/shade', grid: 'square', colorMode: 'single', color: '#e9e4d8', glow: 0, fade: 0, vignette: 0 } },
    { id: 'bayer', name: n('Bayer amber', 'Bayer kehribar'), s: { dither: 'bayer', depth: 3, charSet: 'blocks/shade', palette: 'crt/amber', glow: 60, fade: 0, scanlines: 20 } },
    { id: 'source', name: n('True colour', 'Gerçek renk'), s: { colorMode: 'source', saturation: 140, glow: 50, fade: 25 } },
    { id: 'fraktur', name: n('Fraktur', 'Fraktur'), s: { charSet: 'letters/upper', glyphFont: 'unifraktur', glyphScale: 115, palette: 'medieval/parchment', glow: 70, fade: 40 } },
    { id: 'blueprint', name: n('Blueprint', 'Mavi kopya'), s: { mode: 'edges', edgeGlyphs: 'box', edgeFill: false, edgeThreshold: 28, colorMode: 'single', color: '#a8d4ff', bg: '#0a1a33', glow: 45, fade: 0, vignette: 15 } },
    { id: 'vapor', name: n('Vapour', 'Buhar'), s: { charSet: 'blocks/half', palette: 'neon/vapor', glow: 70, fade: 15, scanlines: 15 } },
    { id: 'aurora', name: n('Aurora braille', 'Kutup braille'), s: { charSet: 'braille/full', depth: 48, palette: 'elements/aurora', glow: 110, fade: 35 } },
    { id: 'ocean', name: n('Deep sea', 'Derin deniz'), s: { palette: 'elements/ocean', glow: 90, fade: 40, grain: 12 } },
    { id: 'binary', name: n('Binary', 'İkili'), s: { charSet: 'letters/binary', palette: 'crt/phosphor', glyphFont: 'vt323', glow: 80, scanlines: 30, fade: 45 } },
    { id: 'chess', name: n('Chess hall', 'Satranç salonu'), s: { charSet: 'cards/chess', grid: 'square', palette: 'medieval/bone', glow: 70, fade: 30 } },
    { id: 'hatch', name: n('Engraver', 'Gravürcü'), s: { charSet: 'classic/hatch', palette: 'mono/sepia', glow: 0, fade: 20, vignette: 20 } },
    { id: 'dice', name: n('Dice', 'Zarlar'), s: { charSet: 'cards/dice', grid: 'square', depth: 6, palette: 'crt/white', glow: 40, fade: 10 } }
  ];

  /* gallery categories */
  GF.LOOK_TAGS = [
    { id: 'glow', name: n('Glow', 'Işıltı') },
    { id: 'terminal', name: n('Terminal', 'Terminal') },
    { id: 'medieval', name: n('Medieval', 'Ortaçağ') },
    { id: 'print', name: n('Print', 'Baskı') },
    { id: 'lines', name: n('Lines', 'Çizgi') },
    { id: 'color', name: n('Colour', 'Renk') }
  ];
  const TAG = {
    ember: 'glow', bone: 'glow', ice: 'glow', aurora: 'glow',
    phosphor: 'terminal', amber: 'terminal', matrix: 'terminal', bayer: 'terminal', binary: 'terminal',
    runes: 'medieval', cards: 'medieval', fraktur: 'medieval', chess: 'medieval',
    dots: 'print', halftone: 'print', onebit: 'print', hatch: 'print', dice: 'print',
    sketch: 'lines', edgefire: 'lines', blueprint: 'lines',
    neon: 'color', synth: 'color', source: 'color', vapor: 'color', ocean: 'color'
  };
  GF.LOOKS.forEach((l) => (l.tag = TAG[l.id] || 'glow'));

  /* Values a look starts from, so every look is complete on its own. */
  GF.lookSettings = function (look) {
    const base = {};
    for (const k of GF.LOOK_KEYS) base[k] = GF.DEFAULTS[k];
    return Object.assign(base, look.s);
  };

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }
  function chance(p) {
    return Math.random() < p;
  }
  function between(a, b, step) {
    const v = a + Math.random() * (b - a);
    return step ? Math.round(v / step) * step : v;
  }

  function hslHex(h, s, l) {
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(c * 255).toString(16).padStart(2, '0');
    };
    return '#' + f(0) + f(8) + f(4);
  }

  /* A random but tasteful look. */
  GF.randomLook = function () {
    const sets = [];
    GF.CHARSET_CATEGORIES.forEach((c) => c.sets.forEach((s) => sets.push(c.id + '/' + s.id)));
    const pals = [];
    GF.PALETTE_CATEGORIES.forEach((c) => c.id !== 'custom' && c.palettes.forEach((p) => pals.push(c.id + '/' + p.id)));
    const r = Math.random();
    const mode = r < 0.7 ? 'ascii' : r < 0.85 ? 'edges' : 'halftone';
    const colorMode = chance(0.72) ? 'palette' : chance(0.5) ? 'source' : 'single';
    const hue = Math.floor(Math.random() * 360);
    return {
      mode,
      edgeFill: chance(0.6),
      edgeThreshold: between(25, 45, 1),
      dither: mode === 'ascii' && chance(0.25) ? pick(['floyd', 'atkinson', 'bayer']) : 'none',
      charSet: pick(sets),
      depth: pick([8, 12, 16, 24, 32, 48]),
      grid: chance(0.65) ? 'text' : 'square',
      glyphFont: pick(['plex', 'plex', 'plex', 'vt323', 'pixel', 'unifraktur', 'jacquard']),
      glyphScale: 100,
      bold: chance(0.2),
      offset: 0,
      colorMode,
      palette: pick(pals),
      color: hslHex(hue, 0.85, 0.6),
      fade: between(15, 70, 5),
      bg: '#000000',
      saturation: between(110, 180, 10),
      glow: chance(0.85) ? between(40, 160, 5) : 0,
      glowRadius: between(3, 12, 1),
      chroma: chance(0.3) ? between(0.5, 3, 0.5) : 0,
      scanlines: chance(0.35) ? between(15, 50, 5) : 0,
      vignette: between(10, 50, 5),
      grain: chance(0.35) ? between(5, 30, 5) : 0,
      curvature: chance(0.2) ? between(15, 45, 5) : 0,
      anim: 'none'
    };
  };
})(window.GF = window.GF || {});
