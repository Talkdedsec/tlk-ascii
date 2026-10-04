// Renders the demo previews, the app icons and the social image with the app
// itself, so every picture in the repository comes from the real renderer.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { open } from './browser.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const save = async (rel, dataUrl) => {
  const file = join(ROOT, rel);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('  wrote', rel);
};

const { page, errors, url, close } = await open();
try {
  await page.goto(url);
  await page.evaluate(() => window.TLKASCII.ready);

  // Draws a rendered data URL into a canvas of a given width (high quality).
  await page.evaluate(() => {
    window.__shrink = (src, width, type, q) => new Promise((ok) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = width;
        c.height = Math.round((img.height * width) / img.width);
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, 0, 0, c.width, c.height);
        ok(c.toDataURL(type, q));
      };
      img.src = src;
    });
  });

  const ids = await page.evaluate(() => window.GF.DEMOS.map((d) => d.id));
  for (const id of ids) {
    const data = await page.evaluate(async (d) => {
      await window.TLKASCII.loadDemo(d);
      await new Promise((r) => setTimeout(r, 300));
      const full = await window.TLKASCII.renderDataURL(1, 'image/png', undefined, 1.3);
      return window.__shrink(full, 640, 'image/jpeg', 0.84);
    }, id);
    await save(`web/demos/previews/${id}.jpg`, data);
  }

  // App icon: a blackletter "A" forged from glyphs.
  const icon = await page.evaluate(async () => {
    const T = window.TLKASCII;
    await T.loadDemo('gothic');
    T.set({
      text: 'A', textAspect: '1:1', textFont: 'unifraktur', outWidth: 1024, cell: 13, grid: 'square',
      charSet: 'classic/detailed', depth: 24, palette: 'medieval/ember', threshold: 18, fade: 15,
      glow: 170, glowRadius: 14, vignette: 0, anim: 'none', title: '', bg: '#120b07'
    });
    await new Promise((r) => setTimeout(r, 300));
    const art = await T.renderDataURL(1, 'image/png');
    const img = await new Promise((ok) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.src = art;
    });
    const out = {};
    for (const size of [512, 192, 64]) {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      const r = size * 0.2;
      g.beginPath();
      g.roundRect(0, 0, size, size, r);
      g.clip();
      g.fillStyle = '#120b07';
      g.fillRect(0, 0, size, size);
      g.imageSmoothingQuality = 'high';
      const pad = size * 0.04;
      g.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
      g.lineWidth = Math.max(1, size / 64);
      g.strokeStyle = 'rgba(255,110,60,.55)';
      g.beginPath();
      g.roundRect(g.lineWidth / 2, g.lineWidth / 2, size - g.lineWidth, size - g.lineWidth, r);
      g.stroke();
      out[size] = c.toDataURL('image/png');
    }
    return out;
  });
  await save('web/icons/icon-512.png', icon[512]);
  await save('web/icons/icon-192.png', icon[192]);
  await save('web/icons/icon-64.png', icon[64]);
  await save('build/icon.png', icon[512]);

  // Social image, 1200 × 630.
  const og = await page.evaluate(async () => {
    const T = window.TLKASCII;
    await T.loadDemo('skull');
    T.set({ title: '', outWidth: 760 });
    await new Promise((r) => setTimeout(r, 300));
    const art = await T.renderDataURL(1, 'image/png');
    const img = await new Promise((ok) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.src = art;
    });
    const c = document.createElement('canvas');
    c.width = 1200;
    c.height = 630;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, 1200, 630);
    const h = 630, w = (img.width * h) / img.height;
    g.drawImage(img, -40, 0, w, h);
    const fade = g.createLinearGradient(w - 260, 0, w - 20, 0);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = fade;
    g.fillRect(w - 260, 0, 1200, 630);
    g.fillStyle = '#000';
    g.fillRect(w - 20, 0, 1200, 630);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffd9b8';
    g.shadowColor = '#ff5a2a';
    g.shadowBlur = 40;
    g.font = '150px "UnifrakturMaguntia"';
    g.fillText('TLK', 900, 215);
    g.fillText('ASCII', 900, 365);
    g.shadowBlur = 0;
    g.fillStyle = '#c9b49b';
    g.font = '26px "IBM Plex Mono"';
    g.fillText('image · video · text', 900, 480);
    g.fillText('to glowing ASCII art', 900, 518);
    return c.toDataURL('image/jpeg', 0.88);
  });
  await save('web/icons/og.jpg', og);

  const bad = errors.filter((e) => !/404/.test(e));
  if (bad.length) {
    console.error(bad.join('\n'));
    process.exitCode = 1;
  }
} finally {
  await close();
}
