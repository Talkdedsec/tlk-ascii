/* Input sources. Every source exposes the same shape:
   { kind, el, width, height, animated, name, update(time, settings), dispose() } */
(function (GF) {
  'use strict';

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function imageSource(img, name) {
    return {
      kind: 'image', el: img, name: name || 'image',
      width: img.naturalWidth, height: img.naturalHeight,
      animated: false, update() {}, dispose() {}
    };
  }

  function loadImage(url, name) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(imageSource(img, name));
      img.onerror = () => reject(new Error('image'));
      img.src = url;
    });
  }

  function loadVideo(url, name, revoke) {
    return new Promise((resolve, reject) => {
      const v = document.createElement('video');
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = 'auto';
      v.onloadeddata = () => {
        v.play().catch(() => {});
        resolve({
          kind: 'video', el: v, name: name || 'video',
          width: v.videoWidth, height: v.videoHeight, animated: true,
          update() {
            this.width = v.videoWidth;
            this.height = v.videoHeight;
          },
          dispose() {
            v.pause();
            v.removeAttribute('src');
            v.load();
            if (revoke) URL.revokeObjectURL(url);
          }
        });
      };
      v.onerror = () => reject(new Error('video'));
      v.src = url;
    });
  }

  /* Animated GIF / WebP / APNG through WebCodecs, where available. */
  async function loadAnimatedImage(file) {
    if (!('ImageDecoder' in window)) return null;
    try {
      const supported = await window.ImageDecoder.isTypeSupported(file.type);
      if (!supported) return null;
      const decoder = new window.ImageDecoder({ data: file.stream(), type: file.type });
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;
      if (!track || !track.animated || track.frameCount < 2) {
        decoder.close();
        return null;
      }
      await decoder.completed;
      const frames = [];
      for (let i = 0; i < track.frameCount; i++) {
        const { image } = await decoder.decode({ frameIndex: i });
        const c = canvas(image.displayWidth, image.displayHeight);
        c.getContext('2d').drawImage(image, 0, 0);
        frames.push({ c, ms: Math.max(20, (image.duration || 100000) / 1000) });
        image.close();
      }
      decoder.close();
      const totalMs = frames.reduce((a, f) => a + f.ms, 0);
      const out = canvas(frames[0].c.width, frames[0].c.height);
      const ctx = out.getContext('2d');
      return {
        kind: 'animation', el: out, name: file.name,
        width: out.width, height: out.height, animated: true, duration: totalMs / 1000,
        update(time) {
          let t = (time * 1000) % totalMs;
          let f = frames[0];
          for (const fr of frames) {
            if (t < fr.ms) { f = fr; break; }
            t -= fr.ms;
          }
          ctx.clearRect(0, 0, out.width, out.height);
          ctx.drawImage(f.c, 0, 0);
        },
        dispose() {}
      };
    } catch (e) {
      return null;
    }
  }

  async function fromFile(file) {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith('video/')) return loadVideo(url, file.name, true);
    if (/^image\/(gif|webp|png|apng)$/.test(file.type)) {
      const anim = await loadAnimatedImage(file);
      if (anim) {
        URL.revokeObjectURL(url);
        anim.update(0);
        return anim;
      }
    }
    const src = await loadImage(url, file.name);
    src.dispose = () => URL.revokeObjectURL(url);
    return src;
  }

  async function webcam() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.srcObject = stream;
    await v.play();
    const out = canvas(v.videoWidth || 1280, v.videoHeight || 720);
    const ctx = out.getContext('2d');
    return {
      kind: 'webcam', el: out, name: 'webcam',
      width: out.width, height: out.height, animated: true,
      update(time, s) {
        if (v.videoWidth && (out.width !== v.videoWidth || out.height !== v.videoHeight)) {
          out.width = v.videoWidth;
          out.height = v.videoHeight;
          this.width = out.width;
          this.height = out.height;
        }
        ctx.save();
        if (s && s.mirror) {
          ctx.translate(out.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(v, 0, 0, out.width, out.height);
        ctx.restore();
      },
      dispose() {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }

  const ASPECTS = { '16:9': [1600, 900], '1:1': [1200, 1200], '4:5': [1200, 1500], '9:16': [900, 1600], '3:1': [1800, 600], '5:1': [2000, 400] };
  GF.TEXT_ASPECTS = Object.keys(ASPECTS);

  /* Text drawn white on black; the renderer turns it into glyphs. */
  function textSource() {
    const c = canvas(1600, 900);
    const ctx = c.getContext('2d');
    let sig = '';
    return {
      kind: 'text', el: c, name: 'text', width: c.width, height: c.height, animated: false,
      grid: null,
      update(time, s) {
        const key = [s.text, s.textFont, s.textAspect, s.textWeight, s.textMode, s.figletFont, s.figletLayout].join('|');
        if (key === sig && !this.dirty) return;
        sig = key;
        this.dirty = false;
        if (s.textMode === 'figlet') {
          /* a FIGlet banner is already text: hand the renderer a grid */
          const lines = GF.Banner.lines(s.text, s.figletFont, s.figletLayout);
          if (!lines) {
            sig = '';
            GF.Banner.load(s.figletFont).then(() => {
              this.dirty = true;
              if (this.onChange) this.onChange();
            }, () => {});
            if (!this.grid) this.grid = [' '];
          } else this.grid = lines;
          this.width = Math.max(1, ...this.grid.map((l) => l.length));
          this.height = this.grid.length;
          return;
        }
        this.grid = null;
        const [w, h] = ASPECTS[s.textAspect] || ASPECTS['16:9'];
        c.width = w;
        c.height = h;
        this.width = w;
        this.height = h;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        const lines = String(s.text || ' ').split('\n');
        const family = GF.fontStack(s.textFont);
        const weight = s.textWeight === 'bold' ? '700 ' : '400 ';
        /* fit by the real ink bounds, so accents (Ş, Ö, İ) and tall
           blackletter capitals are never cut off */
        const probe = 200;
        ctx.font = weight + probe + 'px ' + family;
        const m = lines.map((l) => {
          if (!l.trim()) return { left: 0, width: 0, asc: probe * 0.4, desc: 0 };
          const t = ctx.measureText(l);
          const left = t.actualBoundingBoxLeft || 0;
          const width = left + (t.actualBoundingBoxRight || t.width);
          return { left, width, asc: t.actualBoundingBoxAscent || probe * 0.8, desc: t.actualBoundingBoxDescent || probe * 0.2 };
        });
        const gap = probe * 0.14;
        const blockW = Math.max(1, ...m.map((x) => x.width));
        const blockH = m.reduce((a, x) => a + x.asc + x.desc, 0) + gap * (m.length - 1);
        const k = Math.min((w * 0.9) / blockW, (h * 0.84) / blockH);
        ctx.font = weight + probe * k + 'px ' + family;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#fff';
        let y = (h - blockH * k) / 2;
        lines.forEach((l, i) => {
          y += m[i].asc * k;
          if (l.trim()) ctx.fillText(l, (w - m[i].width * k) / 2 + m[i].left * k, y);
          y += (m[i].desc + gap) * k;
        });
      },
      dispose() {}
    };
  }

  /* Classic demoscene fire, simulated at a fixed 30 Hz. */
  function fireSource() {
    const w = 200, h = 130;
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    const heat = new Float32Array(w * (h + 2));
    const img = ctx.createImageData(w, h);
    let steps = 0;
    function step(t) {
      for (let x = 0; x < w; x++) {
        const flick = Math.sin(x * 0.11 + t * 2.3) * 0.25 + Math.sin(x * 0.037 - t * 1.1) * 0.25;
        const v = Math.random() < 0.55 + flick * 0.3 ? 1 : 0.2;
        heat[(h + 1) * w + x] = v;
        heat[h * w + x] = v * (0.8 + Math.random() * 0.2);
      }
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const l = heat[(y + 1) * w + ((x - 1 + w) % w)];
          const m = heat[(y + 1) * w + x];
          const r = heat[(y + 1) * w + ((x + 1) % w)];
          const b = heat[(y + 2) * w + x];
          heat[y * w + x] = Math.max(0, (l + m + r + b) / 4.01 - 0.0052);
        }
      }
    }
    /* let the flames climb before the first frame is shown */
    for (let i = 0; i < 240; i++) step(i / 30);
    let base = -1;
    return {
      kind: 'procedural', el: c, name: 'fire', width: w, height: h, animated: true,
      update(time) {
        const want = Math.floor(time * 30);
        if (base < 0 || want < steps || want - steps > 90) steps = want;
        base = 0;
        while (steps < want) {
          step(steps / 30);
          steps++;
        }
        const data = img.data;
        for (let i = 0; i < w * h; i++) {
          const v = Math.min(255, heat[i] * 300);
          data[i * 4] = v;
          data[i * 4 + 1] = v;
          data[i * 4 + 2] = v;
          data[i * 4 + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
      },
      dispose() {}
    };
  }

  /* Old-school plasma. */
  function plasmaSource() {
    const w = 192, h = 128;
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    return {
      kind: 'procedural', el: c, name: 'plasma', width: w, height: h, animated: true,
      update(time) {
        const t = time * 0.9;
        const data = img.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const u = x / w * 6, v = y / h * 4;
            let s = Math.sin(u + t) + Math.sin(v * 1.3 - t * 0.7) + Math.sin((u + v + t * 0.6) * 0.8);
            const cx = u - 3 + Math.sin(t * 0.5) * 2, cy = v - 2 + Math.cos(t * 0.4) * 1.5;
            s += Math.sin(Math.sqrt(cx * cx + cy * cy) * 1.6 - t);
            const val = ((s + 4) / 8) * 255;
            const p = (y * w + x) * 4;
            data[p] = data[p + 1] = data[p + 2] = val;
            data[p + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      },
      dispose() {}
    };
  }

  GF.Sources = {
    loadImage,
    fromFile,
    webcam,
    text: textSource,
    procedural(name) {
      return name === 'plasma' ? plasmaSource() : fireSource();
    }
  };
})(window.GF = window.GF || {});
