/* The ASCII renderer.

   Pipeline per frame:
   1. the source is framed (aspect, zoom, pan, rotation) into a work canvas
      and sampled down to one pixel per cell;
   2. every cell gets a tone; tones are quantised to glyph levels, optionally
      with dithering; edge mode replaces strong edges with line glyphs;
   3. glyphs are stamped from pre-rendered white atlases;
   4. one "source-in" pass paints each cell with its colour;
   5. glow, chromatic aberration, title, scanlines, vignette, grain and CRT
      curvature go on top. */
(function (GF) {
  'use strict';

  const FALLBACK_STACK = '"IBM Plex Mono", "Noto Sans Symbols 2 Subset", "Noto Sans Runic", "Segoe UI Symbol", "Segoe UI Historic", "Apple Symbols", monospace';

  GF.FONTS = [
    { id: 'plex', name: 'IBM Plex Mono', family: '"IBM Plex Mono"' },
    { id: 'vt323', name: 'VT323', family: '"VT323"' },
    { id: 'pixel', name: 'Press Start 2P', family: '"Press Start 2P"' },
    { id: 'unifraktur', name: 'UnifrakturMaguntia', family: '"UnifrakturMaguntia"' },
    { id: 'pirata', name: 'Pirata One', family: '"Pirata One"' },
    { id: 'grenze', name: 'Grenze Gotisch', family: '"Grenze Gotisch"' },
    { id: 'jacquard', name: 'Jacquard 24', family: '"Jacquard 24"' },
    { id: 'system', name: 'System mono', family: 'ui-monospace, Consolas, "Courier New"' }
  ];

  /* Blackletter faces fall back to another blackletter (Pirata One covers
     every Turkish letter) before the mono fallback. */
  const BLACKLETTER = ['unifraktur', 'grenze', 'jacquard'];

  GF.fontStack = function (id) {
    const f = GF.FONTS.find((x) => x.id === id) || GF.FONTS[0];
    return f.family + ', ' + (BLACKLETTER.includes(f.id) ? '"Pirata One", ' : '') + FALLBACK_STACK;
  };

  /* Edge glyphs in orientation order: vertical, rising, horizontal, falling. */
  GF.EDGE_SETS = {
    ascii: ['|', '/', '-', '\\'],
    box: ['│', '╱', '─', '╲']
  };

  /* pixel packing for Uint32 writes into ImageData */
  const LITTLE_ENDIAN = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

  const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = w || 1;
    c.height = h || 1;
    return c;
  }

  function size(c, w, h) {
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
  }

  function hash(x, y, t) {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(t, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function rotation(s) {
    return (((Math.round(s.rotate || 0) / 90) * 90) % 360 + 360) % 360;
  }

  /* Width / height of the output frame. */
  GF.frameAspect = function (s, srcW, srcH) {
    if (s.frame && s.frame !== 'source') {
      const [a, b] = String(s.frame).split(':').map(Number);
      if (a > 0 && b > 0) return a / b;
    }
    const r = rotation(s);
    return r === 90 || r === 270 ? srcH / srcW : srcW / srcH;
  };

  /* Error-diffusion and ordered dithering on the per-cell tone grid.
     Cells with tone < 0 are empty and take no part. */
  function quantize(tone, out, cols, rows, depth, mode) {
    const n = depth - 1;
    if (mode === 'floyd' || mode === 'atkinson') {
      const buf = Float32Array.from(tone);
      const add = (x, y, e) => {
        if (x < 0 || x >= cols || y >= rows) return;
        const j = y * cols + x;
        if (tone[j] >= 0) buf[j] += e;
      };
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          if (tone[i] < 0) continue;
          const v = buf[i];
          const q = clamp(Math.round(v * n), 0, n);
          out[i] = q;
          const err = v - q / n;
          if (mode === 'floyd') {
            add(x + 1, y, (err * 7) / 16);
            add(x - 1, y + 1, (err * 3) / 16);
            add(x, y + 1, (err * 5) / 16);
            add(x + 1, y + 1, err / 16);
          } else {
            const e = err / 8;
            add(x + 1, y, e);
            add(x + 2, y, e);
            add(x - 1, y + 1, e);
            add(x, y + 1, e);
            add(x + 1, y + 1, e);
            add(x, y + 2, e);
          }
        }
      }
      return;
    }
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const v = tone[i];
        if (v < 0) continue;
        out[i] = mode === 'bayer'
          ? clamp(Math.floor(v * n + BAYER4[(y & 3) * 4 + (x & 3)]), 0, n)
          : Math.min(n, Math.floor(v * depth));
      }
    }
  }

  class Renderer {
    constructor() {
      this.comp = mk();
      this.sample = mk();
      this.sample2 = mk();
      this.glyph = mk();
      this.tint = mk();
      this.blur = mk();
      this.warp = mk();
      this.warp2 = mk();
      this.noise = null;
      this.atlasCache = new Map();
      this.lutCache = new Map();
      this.last = null;
      const probe = mk().getContext('2d');
      this.filterOK = typeof probe.filter === 'string';
    }

    clearCache() {
      this.atlasCache.clear();
    }

    lut(stops) {
      const key = stops.join(',');
      let l = this.lutCache.get(key);
      if (!l) {
        l = GF.gradientLUT(stops);
        if (this.lutCache.size > 40) this.lutCache.clear();
        this.lutCache.set(key, l);
      }
      return l;
    }

    /* Renders every glyph once, white on transparent, and measures its ink.
       opts.sort orders the cells sparse to dense; opts.sizes renders a single
       glyph at that many sizes (halftone). */
    atlas(chars, fontId, bold, fontSize, cw, ch, opts) {
      opts = opts || {};
      const key = [chars, fontId, bold ? 1 : 0, fontSize, cw, ch, opts.sizes || 0, opts.sort === false ? 0 : 1].join('|');
      const hit = this.atlasCache.get(key);
      if (hit) return hit;

      let glyphs;
      let scales;
      if (opts.sizes) {
        const chr = Array.from(chars)[0] || '●';
        glyphs = [];
        scales = [];
        for (let k = 0; k < opts.sizes; k++) {
          glyphs.push(chr);
          scales.push(k === 0 ? 0 : Math.sqrt(k / (opts.sizes - 1)) * 1.12);
        }
      } else {
        glyphs = Array.from(new Set(Array.from(chars)));
        if (!glyphs.length) glyphs.push('#');
      }
      const perRow = Math.ceil(Math.sqrt(glyphs.length));
      const canvas = mk(perRow * cw, Math.ceil(glyphs.length / perRow) * ch);
      const g = canvas.getContext('2d', { willReadFrequently: true });
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#fff';

      const cells = glyphs.map((chr, i) => {
        const x = (i % perRow) * cw;
        const y = Math.floor(i / perRow) * ch;
        const px = scales ? fontSize * scales[i] : fontSize;
        if (px >= 1) {
          g.font = (bold ? '700 ' : '400 ') + Math.max(1, Math.round(px)) + 'px ' + GF.fontStack(fontId);
          g.save();
          g.beginPath();
          g.rect(x, y, cw, ch);
          g.clip();
          g.fillText(chr, x + cw / 2, y + ch / 2 + px * 0.04);
          g.restore();
        }
        return { chr: scales && px < 1 ? ' ' : chr, x, y, density: 0, canvas };
      });

      const data = g.getImageData(0, 0, canvas.width, canvas.height).data;
      const area = cw * ch * 255;
      for (const c of cells) {
        const mask = new Uint8Array(cw * ch);
        let sum = 0;
        let k = 0;
        for (let yy = c.y; yy < c.y + ch; yy++) {
          let p = (yy * canvas.width + c.x) * 4 + 3;
          for (let xx = 0; xx < cw; xx++, p += 4) {
            mask[k++] = data[p];
            sum += data[p];
          }
        }
        c.mask = mask;
        c.density = sum / area;
      }
      if (opts.sort !== false && !opts.sizes) cells.sort((a, b) => a.density - b.density);

      const atlas = { canvas, cells };
      if (this.atlasCache.size > 32) this.atlasCache.delete(this.atlasCache.keys().next().value);
      this.atlasCache.set(key, atlas);
      return atlas;
    }

    /* Grid geometry for a source size and settings. */
    geometry(srcW, srcH, s, scale) {
      const ch = Math.max(2, Math.round(s.cell * scale));
      const cw = s.grid === 'square' ? ch : Math.max(2, Math.round(s.cell * 0.6 * scale));
      const W0 = Math.max(32, Math.round(s.outWidth * scale));
      const H0 = Math.max(32, Math.round(W0 / GF.frameAspect(s, srcW, srcH)));
      const cols = Math.max(1, Math.floor(W0 / cw));
      const rows = Math.max(1, Math.floor(H0 / ch));
      return { cw, ch, cols, rows, W: cols * cw, H: rows * ch };
    }

    /* Draws the source into the work canvas: cover-fit, then zoom, pan,
       rotation and mirror. */
    compose(src, s, w, h) {
      size(this.comp, w, h);
      const cc = this.comp.getContext('2d');
      cc.setTransform(1, 0, 0, 1, 0, 0);
      cc.globalCompositeOperation = 'source-over';
      cc.globalAlpha = 1;
      cc.clearRect(0, 0, w, h);
      cc.imageSmoothingEnabled = true;
      cc.imageSmoothingQuality = 'high';
      const r = rotation(s);
      const swap = r === 90 || r === 270;
      const sw = swap ? src.height : src.width;
      const sh = swap ? src.width : src.height;
      const cover = Math.max(w / sw, h / sh) * clamp(s.frameZoom || 1, 1, 8);
      const dw = sw * cover;
      const dh = sh * cover;
      const cx = w / 2 - (clamp(s.frameX || 0, -100, 100) / 100) * Math.max(0, (dw - w) / 2);
      const cy = h / 2 - (clamp(s.frameY || 0, -100, 100) / 100) * Math.max(0, (dh - h) / 2);
      cc.save();
      cc.translate(cx, cy);
      if (r) cc.rotate((r * Math.PI) / 180);
      if (s.flipX) cc.scale(swap ? 1 : -1, swap ? -1 : 1);
      cc.drawImage(src.el, (-src.width * cover) / 2, (-src.height * cover) / 2, src.width * cover, src.height * cover);
      cc.restore();
      return cc;
    }

    render(src, s, target, opt) {
      opt = opt || {};
      const t0 = performance.now();
      const scale = opt.scale || 1;
      const time = opt.time || 0;
      if (!src || !src.width || !src.height) return null;
      if (src.grid) return this.renderGrid(src, s, target, opt);

      const geo = this.geometry(src.width, src.height, s, scale);
      const { cw, ch, cols, rows, W, H } = geo;
      const total = cols * rows;

      /* 1. frame, sample. The work canvas has the output's aspect ratio
         (cells are not square), so framing and titles are never distorted;
         sampling then squeezes it onto the cell grid. */
      let compW = Math.min(4096, cols * 4);
      let compH = Math.round((compW * H) / W);
      if (compH > 4096) {
        compW = Math.max(1, Math.round((compW * 4096) / compH));
        compH = 4096;
      }
      let cc;
      try {
        cc = this.compose(src, s, compW, compH);
      } catch (e) {
        return null;
      }
      if (opt.before) {
        size(opt.before, W, H);
        const bc = opt.before.getContext('2d');
        bc.imageSmoothingQuality = 'high';
        bc.clearRect(0, 0, W, H);
        bc.drawImage(this.comp, 0, 0, W, H);
      }
      if (s.title && s.titleMode === 'baked') {
        /* drawn into the source, so it has to come out bright after "invert" */
        const flip = (hex) => '#' + GF.hexToRgb(hex).map((v) => (255 - v).toString(16).padStart(2, '0')).join('');
        let c = s.colorMode === 'source' ? s.titleColor : '#ffffff';
        if (s.invert) c = flip(c);
        this.drawTitle(cc, compW, compH, s, c, false, s.invert ? '#ffffff' : '#000000');
      }

      size(this.sample, cols, rows);
      const sc = this.sample.getContext('2d', { willReadFrequently: true });
      sc.clearRect(0, 0, cols, rows);
      sc.imageSmoothingEnabled = true;
      sc.imageSmoothingQuality = 'high';
      sc.drawImage(this.comp, 0, 0, cols, rows);
      const d = sc.getImageData(0, 0, cols, rows).data;

      /* 2. glyph sets */
      const mode = s.mode === 'edges' || s.mode === 'halftone' ? s.mode : 'ascii';
      const depth = clamp(Math.round(s.depth), 2, 64);
      const base = s.grid === 'square' ? ch * 0.86 : ch * 0.92;
      const fontSize = Math.max(2, Math.round(base * (s.glyphScale / 100)));
      const inject = s.inject && s.inject.trim() ? s.inject : '';
      let ramp;
      if (mode === 'halftone') {
        const chr = Array.from(inject.trim() || s.halftoneChar || '●')[0];
        ramp = this.atlas(chr, s.glyphFont, s.bold, fontSize, cw, ch, { sizes: depth }).cells;
      } else {
        ramp = this.atlas(inject || GF.charsetChars(s.charSet), s.glyphFont, s.bold, fontSize, cw, ch).cells;
      }
      const N = ramp.length;
      const glyphs = ramp.slice();
      let edgeBase = -1;
      if (mode === 'edges') {
        edgeBase = glyphs.length;
        const set = GF.EDGE_SETS[s.edgeGlyphs] || GF.EDGE_SETS.ascii;
        glyphs.push(...this.atlas(set.join(''), s.glyphFont, s.bold, fontSize, cw, ch, { sort: false }).cells);
      }
      const levelIdx = new Int16Array(depth);
      for (let i = 0; i < depth; i++) levelIdx[i] = mode === 'halftone' ? i : Math.round((i * (N - 1)) / (depth - 1));

      /* 3a. tone per cell */
      const bright = (s.brightness / 100) * 0.5;
      const cf = s.contrast >= 0 ? 1 + (s.contrast / 100) * 2 : 1 + s.contrast / 100;
      const invGamma = 1 / clamp(s.gamma, 0.1, 5);
      const thr = clamp(s.threshold / 100, 0, 0.99);
      const tone = new Float32Array(total).fill(-1);
      const lum = new Float32Array(total);
      for (let i = 0; i < total; i++) {
        const p = i * 4;
        const a = d[p + 3] / 255;
        const lv = (0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2]) / 255;
        lum[i] = lv;
        if (a <= 0.01 && !s.invert) continue;
        let l = s.invert ? (1 - lv) * a : lv * a;
        l = (l - 0.5) * cf + 0.5 + bright;
        if (l <= 0) continue;
        l = l >= 1 ? 1 : Math.pow(l, invGamma);
        if (l < thr) continue;
        tone[i] = (l - thr) / (1 - thr);
      }

      /* 3b. edges: structure tensor over a 2× grid, binned to four directions */
      let edgeDir = null;
      let edgeMag = null;
      if (mode === 'edges') {
        const w2 = cols * 2, h2 = rows * 2;
        size(this.sample2, w2, h2);
        const s2 = this.sample2.getContext('2d', { willReadFrequently: true });
        s2.clearRect(0, 0, w2, h2);
        s2.imageSmoothingEnabled = true;
        s2.imageSmoothingQuality = 'high';
        s2.drawImage(this.comp, 0, 0, w2, h2);
        const d2 = s2.getImageData(0, 0, w2, h2).data;
        const L = new Float32Array(w2 * h2);
        for (let i = 0; i < L.length; i++) {
          const p = i * 4;
          L[i] = ((0.2126 * d2[p] + 0.7152 * d2[p + 1] + 0.0722 * d2[p + 2]) / 255) * (d2[p + 3] / 255);
        }
        const A = new Float32Array(total), B = new Float32Array(total), M = new Float32Array(total);
        const at = (x, y) => L[clamp(y, 0, h2 - 1) * w2 + clamp(x, 0, w2 - 1)];
        for (let y = 0; y < h2; y++) {
          for (let x = 0; x < w2; x++) {
            const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
            const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
            const i = (y >> 1) * cols + (x >> 1);
            A[i] += gx * gx - gy * gy;
            B[i] += 2 * gx * gy;
            M[i] += Math.sqrt(gx * gx + gy * gy);
          }
        }
        const sorted = Float32Array.from(M).sort();
        const ref = Math.max(1e-3, sorted[Math.floor(sorted.length * 0.98)]);
        const cut = clamp(s.edgeThreshold / 100, 0.02, 0.98);
        edgeDir = new Int8Array(total).fill(-1);
        edgeMag = new Float32Array(total);
        const q = Math.PI / 4;
        for (let i = 0; i < total; i++) {
          const m = Math.min(1, M[i] / ref);
          if (m < cut) continue;
          const phi = Math.atan2(B[i], A[i]);
          edgeDir[i] = Math.abs(phi) <= q ? 0 : phi > q && phi <= 3 * q ? 1 : phi < -q && phi >= -3 * q ? 3 : 2;
          edgeMag[i] = (m - cut) / (1 - cut);
        }
      }

      /* 3c. levels, glyphs and colours */
      const level = new Int16Array(total).fill(-1);
      quantize(tone, level, cols, rows, depth, s.dither);

      const fade = clamp(s.fade / 100, 0, 1);
      const sat = s.saturation / 100;
      const colorMode = s.colorMode;
      const lut = colorMode === 'palette' ? this.lut(GF.paletteStops(s.palette, s)) : null;
      const single = GF.hexToRgb(s.color);
      const speed = s.animSpeed;
      const amount = s.animAmount / 100;
      const tick = Math.floor(time * speed);
      let baseOff = Math.round(s.offset) || 0;
      if (s.anim === 'cycle') baseOff += tick;
      const fill = mode !== 'edges' || s.edgeFill;

      const idx = new Int16Array(total).fill(-1);
      const colors = new Uint8ClampedArray(total * 4);

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          let t = tone[i];
          let gi = -1;
          if (edgeDir && edgeDir[i] >= 0) {
            gi = edgeBase + edgeDir[i];
            t = Math.max(t, 0.55 + 0.45 * edgeMag[i]);
          } else if (t >= 0 && fill) {
            gi = levelIdx[level[i]];
            if (mode !== 'halftone') {
              let off = baseOff;
              if (s.anim === 'flicker') {
                const h = hash(x, y, tick);
                if (h < amount) off += 1 + (Math.floor(h * 977) % 3);
              } else if (s.anim === 'wave') {
                off += Math.round(((Math.sin(x * 0.17 + y * 0.09 - time * speed * 0.5) + 1) / 2) * amount * (N - 1));
              }
              if (off) gi = (((gi + off) % N) + N) % N;
            }
            if (mode === 'edges') t *= 0.6;
          }
          if (gi < 0 || glyphs[gi].density <= 0) continue;
          idx[i] = gi;

          const p = i * 4;
          let cr, cg, cb;
          if (colorMode === 'palette') {
            const li = (clamp(t, 0, 1) * 255) | 0;
            cr = lut[li * 3]; cg = lut[li * 3 + 1]; cb = lut[li * 3 + 2];
          } else if (colorMode === 'single') {
            cr = single[0]; cg = single[1]; cb = single[2];
          } else {
            const r = d[p], g = d[p + 1], b = d[p + 2];
            let rr = s.invert ? 255 - r : r;
            let gg = s.invert ? 255 - g : g;
            let bb = s.invert ? 255 - b : b;
            const gray = 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
            rr = gray + (rr - gray) * sat;
            gg = gray + (gg - gray) * sat;
            bb = gray + (bb - gray) * sat;
            const target = (thr + clamp(t, 0, 1) * (1 - thr)) * 255;
            const f = clamp(target / Math.max(gray, 6), 0, 4);
            cr = rr * f; cg = gg * f; cb = bb * f;
          }
          colors[p] = cr;
          colors[p + 1] = cg;
          colors[p + 2] = cb;
          colors[p + 3] = (1 - fade + fade * clamp(t, 0, 1)) * 255;
        }
      }

      /* 4–5. stamp glyphs, then light, title and screen effects */
      this.stamp(idx, colors, glyphs, cols, rows, cw, ch, W, H, 0, 0);
      this.composite(target, W, H, s, scale, time);

      const result = { cols, rows, cw, ch, W, H, idx, colors, glyphs, ramp, settings: s };
      if (!opt.keepLast) this.last = result;
      return { cols, rows, W, H, ms: performance.now() - t0 };
    }

    /* Coloured glyphs written straight into pixel memory: one pass, no
       per-cell draw calls (cells never overlap). ox/oy offset the grid. */
    stamp(idx, colors, glyphs, cols, rows, cw, ch, W, H, ox, oy) {
      size(this.glyph, W, H);
      if (!this.glyphImg || this.glyphImg.width !== W || this.glyphImg.height !== H) {
        this.glyphImg = new ImageData(W, H);
        this.glyphBuf = new Uint32Array(this.glyphImg.data.buffer);
      }
      const buf = this.glyphBuf;
      buf.fill(0);
      for (let y = 0; y < rows; y++) {
        const rowBase = (oy + y * ch) * W + ox;
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const gi = idx[i];
          if (gi < 0) continue;
          const mask = glyphs[gi].mask;
          const p = i * 4;
          const a = colors[p + 3];
          if (!a) continue;
          let m = 0;
          if (LITTLE_ENDIAN) {
            const rgb = (colors[p + 2] << 16) | (colors[p + 1] << 8) | colors[p];
            for (let yy = 0; yy < ch; yy++) {
              let o = rowBase + yy * W + x * cw;
              for (let xx = 0; xx < cw; xx++, o++, m++) {
                const ma = mask[m];
                if (ma) buf[o] = ((((ma * a + 127) / 255) | 0) << 24 | rgb) >>> 0;
              }
            }
          } else {
            const rgb = ((colors[p] << 24) | (colors[p + 1] << 16) | (colors[p + 2] << 8)) >>> 0;
            for (let yy = 0; yy < ch; yy++) {
              let o = rowBase + yy * W + x * cw;
              for (let xx = 0; xx < cw; xx++, o++, m++) {
                const ma = mask[m];
                if (ma) buf[o] = (rgb | (((ma * a + 127) / 255) | 0)) >>> 0;
              }
            }
          }
        }
      }
      this.glyph.getContext('2d').putImageData(this.glyphImg, 0, 0);
    }

    composite(target, W, H, s, scale, time) {
      size(target, W, H);
      const o = target.getContext('2d');
      o.save();
      o.globalCompositeOperation = 'source-over';
      o.globalAlpha = 1;
      o.clearRect(0, 0, W, H);
      if (!s.transparent) {
        o.fillStyle = s.bg;
        o.fillRect(0, 0, W, H);
      }
      if (s.glow > 0) this.drawGlow(o, this.glyph, W, H, s.glow / 100, Math.max(1, s.glowRadius * scale));
      if (s.chroma > 0) this.drawChroma(o, W, H, s.chroma * scale);
      o.globalCompositeOperation = 'source-over';
      o.globalAlpha = 1;
      o.drawImage(this.glyph, 0, 0);
      if (s.title && s.titleMode !== 'baked') this.drawTitle(o, W, H, s, s.titleColor, true);
      if (s.scanlines > 0) this.drawScanlines(o, W, H, s.scanlines / 100, scale, s.transparent);
      if (s.vignette > 0) this.drawVignette(o, W, H, s.vignette / 100, s.transparent);
      if (s.grain > 0) this.drawGrain(o, W, H, s.grain / 100, time, scale, s.transparent);
      o.restore();
      if (s.curvature > 0) this.drawCurvature(target, s.curvature / 100, s.transparent);
    }

    /* A source that is already text (a FIGlet banner): every character is
       drawn as it is; colour runs along a gradient across the banner. */
    renderGrid(src, s, target, opt) {
      const t0 = performance.now();
      const scale = opt.scale || 1;
      const lines = src.grid;
      const rows = Math.max(1, lines.length);
      const cols = Math.max(1, ...lines.map((l) => Array.from(l).length));
      const ch = Math.max(2, Math.round(s.cell * 1.6 * scale));
      const cw = Math.max(2, Math.round(ch * 0.6));
      const ox = cw * 3, oy = ch * 2;
      const W = cols * cw + ox * 2, H = rows * ch + oy * 2;
      const chars = Array.from(new Set(lines.join('').replace(/\s/g, ''))).join('') || '#';
      const fontSize = Math.max(2, Math.round(ch * 0.92 * (s.glyphScale / 100)));
      const cells = this.atlas(chars, s.glyphFont, s.bold, fontSize, cw, ch, { sort: false }).cells;
      const byChar = new Map(cells.map((c, k) => [c.chr, k]));
      const lut = this.lut(s.colorMode === 'palette' || s.colorMode === 'source' ? GF.paletteStops(s.palette, s) : ['#ffffff', '#ffffff']);
      const single = GF.hexToRgb(s.color);
      const fade = clamp(s.fade / 100, 0, 1);
      const total = cols * rows;
      const idx = new Int16Array(total).fill(-1);
      const colors = new Uint8ClampedArray(total * 4);
      const dir = s.bannerGradient;
      for (let y = 0; y < rows; y++) {
        const row = Array.from(lines[y] || '');
        for (let x = 0; x < row.length; x++) {
          const k = byChar.get(row[x]);
          if (k == null) continue;
          const i = y * cols + x;
          idx[i] = k;
          const u = cols > 1 ? x / (cols - 1) : 0.5;
          const v = rows > 1 ? y / (rows - 1) : 0.5;
          const tone = dir === 'horizontal' ? u : dir === 'diagonal' ? (u + v) / 2 : dir === 'flat' ? 1 : 1 - v;
          const p = i * 4;
          if (s.colorMode === 'single') {
            colors[p] = single[0]; colors[p + 1] = single[1]; colors[p + 2] = single[2];
          } else {
            const li = (clamp(0.25 + tone * 0.75, 0, 1) * 255) | 0;
            colors[p] = lut[li * 3]; colors[p + 1] = lut[li * 3 + 1]; colors[p + 2] = lut[li * 3 + 2];
          }
          colors[p + 3] = (1 - fade * 0.5 + fade * 0.5 * tone) * 255;
        }
      }
      this.stamp(idx, colors, cells, cols, rows, cw, ch, W, H, ox, oy);
      this.composite(target, W, H, s, scale, opt.time || 0);
      const result = { cols, rows, cw, ch, W, H, idx, colors, glyphs: cells, ramp: cells, settings: s };
      if (!opt.keepLast) this.last = result;
      return { cols, rows, W, H, ms: performance.now() - t0 };
    }

    /* Bloom: the glyph layer is shrunk, blurred and added back twice,
       once tight and once wide. Shrinking first keeps big radii cheap. */
    drawGlow(o, layer, W, H, strength, radius) {
      o.save();
      o.globalCompositeOperation = 'lighter';
      o.imageSmoothingEnabled = true;
      o.imageSmoothingQuality = 'high';
      const passes = [[radius, 0.8], [radius * 3, 0.55]];
      for (const [r, weight] of passes) {
        const f = clamp(Math.round(r / 3), 1, 12);
        const bw = Math.max(1, Math.round(W / f));
        const bh = Math.max(1, Math.round(H / f));
        size(this.blur, bw, bh);
        const bc = this.blur.getContext('2d');
        bc.globalCompositeOperation = 'source-over';
        bc.clearRect(0, 0, bw, bh);
        bc.imageSmoothingEnabled = true;
        bc.imageSmoothingQuality = 'high';
        if (this.filterOK) bc.filter = 'blur(' + (r / f).toFixed(2) + 'px)';
        bc.drawImage(layer, 0, 0, bw, bh);
        if (this.filterOK) bc.filter = 'none';
        let a = strength * weight;
        while (a > 0.001) {
          o.globalAlpha = Math.min(1, a);
          o.drawImage(this.blur, 0, 0, W, H);
          a -= 1;
        }
      }
      o.restore();
    }

    drawChroma(o, W, H, off) {
      size(this.tint, W, H);
      const tc = this.tint.getContext('2d');
      o.save();
      o.globalCompositeOperation = 'lighter';
      o.globalAlpha = 0.85;
      for (const [color, dx] of [['#ff0000', -off], ['#0050ff', off]]) {
        tc.globalCompositeOperation = 'source-over';
        tc.clearRect(0, 0, W, H);
        tc.drawImage(this.glyph, 0, 0);
        tc.globalCompositeOperation = 'source-in';
        tc.fillStyle = color;
        tc.fillRect(0, 0, W, H);
        o.drawImage(this.tint, dx, 0);
      }
      o.restore();
    }

    drawTitle(ctx, W, H, s, color, glow, knockout) {
      const lines = String(s.title).split('\n').filter((l) => l.length);
      if (!lines.length) return;
      let px = Math.max(6, Math.round((W * s.titleSize) / 100));
      const font = () => px + 'px ' + GF.fontStack(s.titleFont);
      ctx.save();
      ctx.font = font();
      const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
      if (widest > W * 0.94) {
        px = Math.max(6, Math.floor((px * W * 0.94) / widest));
        ctx.font = font();
      }
      const lh = px * 1.08;
      const block = lh * lines.length;
      const margin = H * 0.05;
      let y0;
      if (s.titlePos === 'top') y0 = margin + lh / 2;
      else if (s.titlePos === 'center') y0 = H / 2 - block / 2 + lh / 2;
      else y0 = H - margin - block + lh / 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      if (glow && s.titleGlow > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = px * 0.5 * (s.titleGlow / 100);
      }
      if (knockout) {
        /* a thick outline in the background tone keeps baked titles legible */
        ctx.lineJoin = 'round';
        ctx.lineWidth = px * 0.22;
        ctx.strokeStyle = knockout;
        lines.forEach((l, i) => ctx.strokeText(l, W / 2, y0 + i * lh));
      }
      lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * lh));
      ctx.restore();
    }

    drawScanlines(o, W, H, amount, scale, transparent) {
      const period = Math.max(2, Math.round(3 * scale));
      const thick = Math.max(1, Math.round(period / 3));
      o.save();
      o.globalAlpha = 1;
      o.globalCompositeOperation = transparent ? 'destination-out' : 'source-over';
      o.fillStyle = 'rgba(0,0,0,' + (amount * 0.65).toFixed(3) + ')';
      for (let y = 0; y < H; y += period) o.fillRect(0, y, W, thick);
      o.restore();
    }

    drawVignette(o, W, H, amount, transparent) {
      const r = Math.hypot(W, H) / 2;
      const g = o.createRadialGradient(W / 2, H / 2, r * 0.35, W / 2, H / 2, r);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,' + Math.min(1, amount).toFixed(3) + ')');
      o.save();
      o.globalAlpha = 1;
      o.globalCompositeOperation = transparent ? 'destination-out' : 'source-over';
      o.fillStyle = g;
      o.fillRect(0, 0, W, H);
      o.restore();
    }

    /* Film grain from a tiled noise texture, shifted every frame. */
    drawGrain(o, W, H, amount, time, scale, transparent) {
      if (!this.noise) {
        this.noise = mk(192, 192);
        const nc = this.noise.getContext('2d');
        const img = nc.createImageData(192, 192);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = Math.random() * 255;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
        nc.putImageData(img, 0, 0);
      }
      const pat = o.createPattern(this.noise, 'repeat');
      const t = Math.floor(time * 24);
      const ox = Math.floor(hash(t, 1, 7) * 192);
      const oy = Math.floor(hash(t, 2, 9) * 192);
      if (pat.setTransform) pat.setTransform(new DOMMatrix().translate(ox * scale, oy * scale).scale(Math.max(1, scale)));
      o.save();
      o.fillStyle = pat;
      if (transparent) {
        o.globalCompositeOperation = 'source-atop';
        o.globalAlpha = amount * 0.18;
        o.fillRect(0, 0, W, H);
      } else {
        o.globalCompositeOperation = 'overlay';
        o.globalAlpha = amount * 0.55;
        o.fillRect(0, 0, W, H);
        o.globalCompositeOperation = 'screen';
        o.globalAlpha = amount * 0.07;
        o.fillRect(0, 0, W, H);
      }
      o.restore();
    }

    /* CRT curvature as a separable warp: rows are squeezed toward the
       middle near the top and bottom, then columns near the sides. */
    drawCurvature(target, amount, transparent) {
      const W = target.width, H = target.height;
      const k = amount * 0.16;
      const step = Math.max(1, Math.round(Math.min(W, H) / 400));
      size(this.warp, W, H);
      size(this.warp2, W, H);
      const a = this.warp.getContext('2d');
      a.globalCompositeOperation = 'source-over';
      a.clearRect(0, 0, W, H);
      a.drawImage(target, 0, 0);
      const b = this.warp2.getContext('2d');
      b.globalCompositeOperation = 'source-over';
      b.clearRect(0, 0, W, H);
      for (let y = 0; y < H; y += step) {
        const ny = ((y + step / 2) / H) * 2 - 1;
        const w = W * (1 - k * ny * ny);
        b.drawImage(this.warp, 0, y, W, step, (W - w) / 2, y, w, step + 0.5);
      }
      const o = target.getContext('2d');
      o.save();
      o.globalCompositeOperation = 'source-over';
      o.globalAlpha = 1;
      o.clearRect(0, 0, W, H);
      if (!transparent) {
        o.fillStyle = '#000';
        o.fillRect(0, 0, W, H);
      }
      for (let x = 0; x < W; x += step) {
        const nx = ((x + step / 2) / W) * 2 - 1;
        const h = H * (1 - k * nx * nx);
        o.drawImage(this.warp2, x, 0, step, H, x, (H - h) / 2, step + 0.5, h);
      }
      o.restore();
    }
  }

  GF.Renderer = Renderer;
})(window.GF = window.GF || {});
