/* Colour palettes. Each palette is a gradient from the darkest visible cell
   to the brightest one. */
(function (GF) {
  'use strict';

  const n = (en, tr) => ({ en, tr });

  GF.PALETTE_CATEGORIES = [
    {
      id: 'medieval', name: n('Medieval', 'Ortaçağ'), palettes: [
        { id: 'ember', name: n('Ember', 'Kor'), stops: ['#2a0400', '#8a1500', '#ff3b1f', '#ffb347'] },
        { id: 'blood', name: n('Blood', 'Kan'), stops: ['#1f0000', '#7a0000', '#e01010', '#ff5a4a'] },
        { id: 'gold', name: n('Gold leaf', 'Varak altın'), stops: ['#2b1a00', '#8f5f00', '#e8b34a', '#fff1c2'] },
        { id: 'bone', name: n('Bone', 'Kemik'), stops: ['#3a332a', '#a89c86', '#efe6d2', '#fffdf6'] },
        { id: 'parchment', name: n('Parchment', 'Parşömen'), stops: ['#4a3420', '#a77f4f', '#e0c38f', '#fbf0d6'] },
        { id: 'royal', name: n('Royal', 'Kraliyet'), stops: ['#1a0638', '#5b1a9e', '#b46cff', '#ead6ff'] },
        { id: 'verdigris', name: n('Verdigris', 'Bakır pası'), stops: ['#032420', '#16705f', '#5fd3b0', '#d7fff1'] },
        { id: 'candle', name: n('Candlelight', 'Mum ışığı'), stops: ['#1d0d02', '#7a3b0c', '#f29a38', '#fff3c9'] }
      ]
    },
    {
      id: 'crt', name: n('Terminal & CRT', 'Terminal ve CRT'), palettes: [
        { id: 'phosphor', name: n('Phosphor green', 'Fosfor yeşili'), stops: ['#002a0e', '#00a83c', '#3dff7a', '#d4ffe0'] },
        { id: 'amber', name: n('Amber', 'Kehribar'), stops: ['#2a1400', '#b86800', '#ffad1f', '#ffe7b0'] },
        { id: 'ice', name: n('Ice blue', 'Buz mavisi'), stops: ['#001a3a', '#1f63d6', '#6fc2ff', '#e8f7ff'] },
        { id: 'white', name: n('Paper white', 'Kâğıt beyazı'), stops: ['#3c3c3c', '#9a9a9a', '#e6e6e6', '#ffffff'] }
      ]
    },
    {
      id: 'neon', name: n('Neon', 'Neon'), palettes: [
        { id: 'cyber', name: n('Cyberpunk', 'Siberpunk'), stops: ['#2a0050', '#ff00aa', '#ff7a00', '#00e5ff'] },
        { id: 'synthwave', name: n('Synthwave', 'Synthwave'), stops: ['#2d0b59', '#b31b8e', '#ff2e88', '#ffcc00'] },
        { id: 'toxic', name: n('Toxic', 'Zehir'), stops: ['#0a2a00', '#2fbf0f', '#7dff2a', '#f0ff6a'] },
        { id: 'vapor', name: n('Vaporwave', 'Vaporwave'), stops: ['#b967ff', '#ff71ce', '#01cdfe', '#05ffa1'] },
        { id: 'sunset', name: n('Sunset', 'Gün batımı'), stops: ['#2a0b3d', '#843b62', '#f67e7d', '#ffd3a5'] }
      ]
    },
    {
      id: 'elements', name: n('Elements', 'Elementler'), palettes: [
        { id: 'fire', name: n('Fire', 'Ateş'), stops: ['#1a0000', '#b00000', '#ff6a00', '#ffd000', '#ffffff'] },
        { id: 'ocean', name: n('Deep sea', 'Derin deniz'), stops: ['#00111f', '#004f7a', '#00a6c7', '#9ff4ff'] },
        { id: 'forest', name: n('Forest', 'Orman'), stops: ['#0b1a0b', '#24502a', '#6da35d', '#d8f0b0'] },
        { id: 'aurora', name: n('Aurora', 'Kutup ışığı'), stops: ['#061a2e', '#0d7a6b', '#4fffb0', '#c38bff'] }
      ]
    },
    {
      id: 'custom', name: n('Custom', 'Özel'), palettes: [
        { id: 'custom', name: n('My palette', 'Paletim'), stops: null }
      ]
    },
    {
      id: 'mono', name: n('Monochrome', 'Monokrom'), palettes: [
        { id: 'gray', name: n('Grayscale', 'Gri tonlar'), stops: ['#2a2a2a', '#ffffff'] },
        { id: 'sepia', name: n('Sepia', 'Sepya'), stops: ['#2b1d12', '#8a6a4a', '#e8d3b0'] },
        { id: 'ink', name: n('Ink on paper', 'Kâğıtta mürekkep'), stops: ['#c9c2b4', '#1b1611'] }
      ]
    }
  ];

  function hexToRgb(hex) {
    const h = String(hex).replace('#', '');
    const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
    return [parseInt(v.slice(0, 2), 16) || 0, parseInt(v.slice(2, 4), 16) || 0, parseInt(v.slice(4, 6), 16) || 0];
  }
  GF.hexToRgb = hexToRgb;

  /* "#000000,#ff3b1f,#ffffff" → valid stops, at least two. */
  GF.parseStops = function (text) {
    const stops = String(text || '').split(',').map((x) => x.trim().toLowerCase()).filter((x) => /^#[0-9a-f]{6}$/.test(x));
    return stops.length >= 2 ? stops.slice(0, 8) : ['#000000', '#ffffff'];
  };

  GF.paletteStops = function (key, settings) {
    const [catId, palId] = String(key || '').split('/');
    if (catId === 'custom') return GF.parseStops(settings && settings.customStops);
    const cat = GF.PALETTE_CATEGORIES.find((c) => c.id === catId) || GF.PALETTE_CATEGORIES[0];
    const pal = cat.palettes.find((p) => p.id === palId) || cat.palettes[0];
    return pal.stops;
  };

  /* 256-entry RGB lookup table for a list of colour stops. */
  GF.gradientLUT = function (stops) {
    const rgb = stops.map(hexToRgb);
    const lut = new Uint8ClampedArray(256 * 3);
    const segs = rgb.length - 1;
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      if (segs <= 0) {
        lut.set(rgb[0], i * 3);
        continue;
      }
      const pos = Math.min(segs - 1e-9, t * segs);
      const k = Math.floor(pos);
      const f = pos - k;
      const a = rgb[k];
      const b = rgb[k + 1];
      lut[i * 3] = a[0] + (b[0] - a[0]) * f;
      lut[i * 3 + 1] = a[1] + (b[1] - a[1]) * f;
      lut[i * 3 + 2] = a[2] + (b[2] - a[2]) * f;
    }
    return lut;
  };

  GF.gradientCSS = function (stops) {
    return 'linear-gradient(90deg, ' + stops.join(', ') + ')';
  };
})(window.GF = window.GF || {});
