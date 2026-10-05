/* Default settings and the built-in demos. */
(function (GF) {
  'use strict';

  GF.DEFAULTS = Object.freeze({
    outWidth: 1080,
    frame: 'source',
    frameZoom: 1,
    frameX: 0,
    frameY: 0,
    rotate: 0,
    flipX: false,
    mode: 'ascii',
    edgeThreshold: 35,
    edgeGlyphs: 'ascii',
    edgeFill: true,
    halftoneChar: '●',
    dither: 'none',
    charSet: 'classic/detailed',
    inject: '',
    depth: 24,
    cell: 10,
    grid: 'text',
    offset: 0,
    glyphFont: 'plex',
    glyphScale: 100,
    bold: false,
    invert: false,
    brightness: 0,
    contrast: 10,
    gamma: 1,
    threshold: 8,
    saturation: 120,
    colorMode: 'palette',
    palette: 'medieval/ember',
    customStops: '#08080a,#2f4fd8,#ff5ab4,#fff3d6',
    color: '#ff3b1f',
    fade: 55,
    bg: '#000000',
    transparent: false,
    glow: 80,
    glowRadius: 6,
    chroma: 0,
    scanlines: 0,
    vignette: 25,
    grain: 0,
    curvature: 0,
    title: '',
    titleFont: 'unifraktur',
    titleSize: 11,
    titleColor: '#ff3b1f',
    titlePos: 'bottom',
    titleMode: 'overlay',
    titleGlow: 60,
    anim: 'none',
    animSpeed: 6,
    animAmount: 12,
    text: 'TLK\nASCII',
    textFont: 'unifraktur',
    textAspect: '16:9',
    textWeight: 'regular',
    mirror: true,
    pngScale: 2,
    pngTrim: false,
    recSeconds: 6,
    gifWidth: 600,
    gifFps: 15,
    gifSeconds: 3
  });

  /* Export-only settings: not part of undo history, looks or share links. */
  GF.EXPORT_KEYS = ['pngScale', 'pngTrim', 'recSeconds', 'gifWidth', 'gifFps', 'gifSeconds'];

  const n = (en, tr) => ({ en, tr });

  GF.DEMOS = [
    {
      id: 'skull', name: n('Memento mori', 'Memento mori'),
      source: { type: 'image', url: 'demos/skull.jpg' },
      credit: 'Andreas Vesalius, De humani corporis fabrica, 1543. Public domain.',
      settings: {
        invert: true, charSet: 'classic/detailed', palette: 'medieval/bone', cell: 9, depth: 32,
        contrast: 35, threshold: 26, fade: 45, glow: 120, glowRadius: 6, vignette: 40,
        title: 'Memento Mori', titleFont: 'unifraktur', titleColor: '#f3e7cf', titleSize: 10, titleGlow: 70
      }
    },
    {
      id: 'knight', name: n('Knight, Death and Devil', 'Şövalye, Ölüm ve Şeytan'),
      source: { type: 'image', url: 'demos/knight.jpg' },
      credit: 'Albrecht Dürer, Knight, Death and Devil, 1513. National Gallery of Art, CC0.',
      settings: {
        charSet: 'geometric/dots', grid: 'square', cell: 6, depth: 5,
        colorMode: 'single', color: '#ff2a1a', fade: 35, contrast: 30, threshold: 30,
        glow: 90, glowRadius: 5, vignette: 30,
        title: 'Ritter, Tod und Teufel', titleFont: 'unifraktur', titleMode: 'baked', titleSize: 9
      }
    },
    {
      id: 'dragon', name: n('Runes of the dragon', 'Ejderhanın runları'),
      source: { type: 'image', url: 'demos/dragon.jpg' },
      credit: 'Albrecht Dürer, Saint George Killing the Dragon, 1501–1504. National Gallery of Art, CC0.',
      settings: {
        invert: true, charSet: 'medieval/futhark', cell: 7, depth: 24,
        palette: 'medieval/ember', contrast: 40, threshold: 35, fade: 40, glow: 110, glowRadius: 7, vignette: 35
      }
    },
    {
      id: 'rhino', name: n('Gilded rhinoceros', 'Yaldızlı gergedan'),
      source: { type: 'image', url: 'demos/rhino.jpg' },
      credit: 'Albrecht Dürer, The Rhinoceros, 1515. National Gallery of Art, CC0.',
      settings: {
        invert: true, charSet: 'cards/suits', grid: 'square', cell: 8, depth: 9, gamma: 1.7,
        palette: 'medieval/gold', contrast: 40, threshold: 10, fade: 35, glow: 110, glowRadius: 6, vignette: 30
      }
    },
    {
      id: 'helmet', name: n('Forged helmet', 'Dövme miğfer'),
      source: { type: 'image', url: 'demos/helmet.jpg' },
      credit: 'Close Helmet, c. 1555. The Metropolitan Museum of Art, CC0.',
      settings: {
        invert: true, inject: 'TLK', cell: 9, depth: 3, contrast: 40, threshold: 34, gamma: 1.1,
        palette: 'medieval/candle', fade: 50, glow: 130, glowRadius: 8, vignette: 45, bold: true
      }
    },
    {
      id: 'portrait', name: n('Self-portrait in colour', 'Renkli otoportre'),
      source: { type: 'image', url: 'demos/portrait.jpg' },
      credit: 'Albrecht Dürer, Self-Portrait at Twenty-Eight, 1500. Public domain.',
      settings: {
        colorMode: 'source', charSet: 'classic/detailed', cell: 8, depth: 32, saturation: 150, gamma: 1.8,
        brightness: 25, contrast: 20, threshold: 3, fade: 25, glow: 55, glowRadius: 5, vignette: 20
      }
    },
    {
      id: 'melencolia', name: n('Phosphor Melencolia', 'Fosfor Melankoli'),
      source: { type: 'image', url: 'demos/melencolia.jpg' },
      credit: 'Albrecht Dürer, Melencolia I, 1514. National Gallery of Art, CC0.',
      settings: {
        invert: true, charSet: 'braille/full', cell: 8, depth: 48, palette: 'crt/phosphor',
        contrast: 45, threshold: 38, fade: 40, glow: 100, glowRadius: 6, scanlines: 45, chroma: 1.5,
        vignette: 55, curvature: 45, grain: 18, anim: 'flicker', animAmount: 6, animSpeed: 8
      }
    },
    {
      id: 'fire', name: n('Living fire', 'Canlı ateş'),
      source: { type: 'procedural', name: 'fire' },
      credit: 'Generated live in your browser.',
      settings: {
        charSet: 'classic/detailed', palette: 'elements/fire', cell: 10, depth: 32, outWidth: 900,
        contrast: 15, threshold: 10, fade: 30, glow: 140, glowRadius: 8, vignette: 30
      }
    },
    {
      id: 'gothic', name: n('Gothic title', 'Gotik başlık'),
      source: { type: 'text' },
      credit: 'UnifrakturMaguntia, SIL Open Font License.',
      settings: {
        text: 'TLK\nASCII', textFont: 'unifraktur', textAspect: '16:9', charSet: 'classic/detailed', cell: 8,
        depth: 24, palette: 'medieval/blood', threshold: 20, fade: 20, glow: 130, glowRadius: 7,
        vignette: 35, anim: 'flicker', animAmount: 8, animSpeed: 7
      }
    },
    {
      id: 'sketch', name: n('Line sketch', 'Çizgi eskiz'),
      source: { type: 'image', url: 'demos/helmet.jpg' },
      credit: 'Close Helmet, c. 1555. The Metropolitan Museum of Art, CC0.',
      settings: {
        mode: 'edges', edgeThreshold: 30, edgeFill: true, invert: true, cell: 8, depth: 16,
        charSet: 'classic/standard', palette: 'crt/ice', contrast: 30, threshold: 34, fade: 30,
        glow: 90, glowRadius: 6, vignette: 40
      }
    },
    {
      id: 'halftone', name: n('Colour halftone', 'Renkli yarım ton'),
      source: { type: 'image', url: 'demos/portrait.jpg' },
      credit: 'Albrecht Dürer, Self-Portrait at Twenty-Eight, 1500. Public domain.',
      settings: {
        mode: 'halftone', grid: 'square', cell: 9, depth: 10, colorMode: 'source', saturation: 160,
        gamma: 1.8, brightness: 25, contrast: 20, threshold: 3, fade: 0, glow: 45, glowRadius: 5, vignette: 25
      }
    },
    {
      id: 'bitmap', name: n('One-bit Atkinson', 'Tek bit Atkinson'),
      source: { type: 'image', url: 'demos/rhino.jpg' },
      credit: 'Albrecht Dürer, The Rhinoceros, 1515. National Gallery of Art, CC0.',
      settings: {
        dither: 'atkinson', depth: 2, charSet: 'blocks/shade', grid: 'square', cell: 5, outWidth: 1200,
        colorMode: 'single', color: '#e9e4d8', fade: 0, gamma: 1.2, threshold: 0, glow: 25, glowRadius: 3,
        vignette: 0, grain: 25
      }
    },
    {
      id: 'plasma', name: n('Vapour plasma', 'Buhar plazma'),
      source: { type: 'procedural', name: 'plasma' },
      credit: 'Generated live in your browser.',
      settings: {
        charSet: 'blocks/shade', palette: 'neon/vapor', cell: 12, depth: 5, outWidth: 960,
        threshold: 0, fade: 0, glow: 60, glowRadius: 6, scanlines: 30, vignette: 30
      }
    }
  ];
})(window.GF = window.GF || {});
