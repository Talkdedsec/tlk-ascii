// End-to-end checks in a real browser: demos, drawing modes, framing,
// looks, history, compare, every export, share links, language, no errors.
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { open } from './browser.mjs';

const shots = process.env.SHOT_DIR;
const ROOT = new URL('..', import.meta.url);
const pkg = JSON.parse(await readFile(new URL('package.json', ROOT), 'utf8'));
const webVersion = /VERSION = '([^']+)'/.exec(await readFile(new URL('web/js/version.js', ROOT), 'utf8'))[1];
const swVersion = /tlk-ascii-([\d.]+)'/.exec(await readFile(new URL('web/sw.js', ROOT), 'utf8'))[1];
const failures = [];
const check = (ok, msg) => {
  if (!ok) failures.push(msg);
  console.log((ok ? '  ok   ' : '  FAIL ') + msg);
};

const glyphCount = () => window.TLKASCII.text().replace(/\s/g, '').length;
const settle = (page, ms = 350) => page.waitForTimeout(ms);

const { page, errors, url, close } = await open();
try {
  await page.goto(url);
  await page.waitForFunction(() => window.TLKASCII && window.TLKASCII.ready);
  await page.evaluate(() => window.TLKASCII.ready);
  if (shots) await mkdir(shots, { recursive: true });
  check(pkg.version === webVersion && pkg.version === swVersion, `version ${pkg.version} matches web (${webVersion}) and offline cache (${swVersion})`);

  /* demos */
  const ids = await page.evaluate(() => window.GF.DEMOS.map((d) => d.id));
  check(ids.length >= 12, `${ids.length} demos are defined`);
  for (const id of ids) {
    await page.evaluate((d) => window.TLKASCII.loadDemo(d), id);
    await settle(page);
    const st = await page.evaluate(() => {
      const c = document.getElementById('out');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 28) if (d[i] + d[i + 1] + d[i + 2] > 60) lit++;
      return { w: c.width, h: c.height, lit: lit / (d.length / 28), chars: window.TLKASCII.text().replace(/\s/g, '').length };
    });
    check(st.w > 300 && st.h > 100 && st.lit > 0.01 && st.chars > 200, `demo ${id}: ${st.w}x${st.h}, ${(st.lit * 100).toFixed(1)}% lit, ${st.chars} glyphs`);
    if (shots) await page.screenshot({ path: `${shots}/${id}.png` });
  }

  /* the whole picture is drawn: a white frame must reach all four edges,
     on both grids */
  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 900;
    c.height = 600;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, 900, 600);
    g.strokeStyle = '#fff';
    g.lineWidth = 40;
    g.strokeRect(20, 20, 860, 560);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'frame.png', { type: 'image/png' }));
    const input = document.getElementById('file');
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
  });
  await page.waitForFunction(() => /frame\.png/.test(document.getElementById('status-src').textContent));
  for (const grid of ['text', 'square']) {
    await page.evaluate((g) => window.TLKASCII.set({ grid: g, charSet: 'blocks/shade', threshold: 10, glow: 0, vignette: 0 }), grid);
    await settle(page);
    const edges = await page.evaluate(() => {
      const lines = window.TLKASCII.text().replace(/\n+$/, '').split('\n');
      const full = (l) => l.replace(/\s/g, '').length;
      const cols = Math.max(...lines.map((l) => l.length));
      return { top: full(lines[0]) / cols, bottom: full(lines[lines.length - 1]) / cols, left: lines.filter((l) => l[0] && l[0] !== ' ').length / lines.length, right: lines.filter((l) => l.length >= cols - 1).length / lines.length, rows: lines.length };
    });
    check(edges.top > 0.8 && edges.bottom > 0.8 && edges.left > 0.8 && edges.right > 0.8,
      `${grid} grid keeps the whole picture (edges top ${edges.top.toFixed(2)}, bottom ${edges.bottom.toFixed(2)}, left ${edges.left.toFixed(2)}, right ${edges.right.toFixed(2)})`);
  }

  /* drawing modes and dithering */
  await page.evaluate(() => window.TLKASCII.loadDemo('helmet'));
  await page.evaluate(() => window.TLKASCII.set({ mode: 'edges', edgeFill: false }));
  await settle(page);
  const edgeChars = await page.evaluate(() => [...new Set(window.TLKASCII.text().replace(/\s/g, ''))].sort().join(''));
  check(edgeChars.length > 0 && /^[-/\\|]+$/.test(edgeChars), `edge mode uses only line glyphs ("${edgeChars}")`);
  await page.evaluate(() => window.TLKASCII.set({ mode: 'halftone', inject: '', halftoneChar: '●' }));
  await settle(page);
  const ht = await page.evaluate(() => [...new Set(window.TLKASCII.text().replace(/\s/g, ''))].join(''));
  check(ht === '●', `halftone mode draws one dot glyph ("${ht}")`);
  await page.evaluate(() => window.TLKASCII.set({ mode: 'ascii', dither: 'atkinson', depth: 2, charSet: 'blocks/shade' }));
  await settle(page);
  const dith = await page.evaluate(() => [...new Set(window.TLKASCII.text().replace(/\s/g, ''))].join(''));
  check(dith === '█', `two-level dithering leaves one glyph ("${dith}")`);

  /* framing */
  await page.evaluate(() => window.TLKASCII.set({ dither: 'none', depth: 24, charSet: 'classic/detailed', frame: '9:16', frameZoom: 1.5, frameX: 40, rotate: 90, flipX: true, curvature: 40, grain: 30 }));
  await settle(page);
  const ar = await page.evaluate(() => {
    const c = document.getElementById('out');
    return c.width / c.height;
  });
  check(Math.abs(ar - 9 / 16) < 0.03, `9:16 frame gives aspect ${ar.toFixed(3)}`);

  /* history */
  await page.evaluate(() => window.TLKASCII.loadDemo('skull'));
  await page.evaluate(() => {
    window.TLKASCII.set({ glow: 222 });
    window.TLKASCII.flushHistory();
  });
  await page.evaluate(() => window.TLKASCII.undo());
  const afterUndo = await page.evaluate(() => window.TLKASCII.settings.glow);
  await page.evaluate(() => window.TLKASCII.redo());
  const afterRedo = await page.evaluate(() => window.TLKASCII.settings.glow);
  check(afterUndo !== 222 && afterRedo === 222, `undo restores glow (${afterUndo}), redo brings it back (${afterRedo})`);

  /* looks gallery: thumbnails, filters, search, favourites */
  await page.waitForTimeout(2500);
  const thumbs = await page.evaluate(() => [...document.querySelectorAll('#rail .look canvas')].filter((c) => c.width > 40).length);
  const lookCount = await page.evaluate(() => window.GF.LOOKS.length);
  check(thumbs === lookCount, `${thumbs}/${lookCount} look thumbnails rendered`);
  await page.locator('#rail .look-hit').nth(2).click();
  await settle(page);
  const look = await page.evaluate(() => ({ p: window.TLKASCII.settings.palette, s: window.GF.LOOKS[2].s.palette, toast: document.getElementById('toast-action').hidden }));
  check(look.p === look.s && !look.toast, `clicking a look applies its palette (${look.p}) and offers undo`);
  await page.locator('#rail .chip', { hasText: 'Terminal' }).click();
  const terminal = await page.locator('#rail .look').count();
  await page.fill('#rail .search', 'amber');
  const searched = await page.locator('#rail .look').count();
  check(terminal > 2 && terminal < lookCount && searched >= 1 && searched < terminal, `category filter shows ${terminal}, search "amber" shows ${searched}`);
  await page.fill('#rail .search', '');
  await page.locator('#rail .star').first().click();
  await page.locator('#rail .chip', { hasText: 'Favourites' }).click();
  check(await page.locator('#rail .look').count() === 1, 'starred look appears under favourites');
  await page.locator('#rail .chip', { hasText: 'All' }).click();

  /* command palette */
  await page.keyboard.press('Control+k');
  await page.keyboard.type('rune stone');
  await page.keyboard.press('Enter');
  await settle(page);
  check(await page.evaluate(() => window.TLKASCII.settings.charSet) === 'medieval/futhark', 'Ctrl+K finds and applies a look');

  /* focus mode */
  await page.keyboard.press('h');
  const focused = await page.evaluate(() => getComputedStyle(document.querySelector('.panel')).display === 'none');
  await page.keyboard.press('Escape');
  const back = await page.evaluate(() => getComputedStyle(document.querySelector('.panel')).display !== 'none');
  check(focused && back, 'focus mode hides and restores the interface');
  await page.keyboard.press('r');
  await settle(page);
  check(await page.evaluate(glyphCount) > 0, 'random look still renders');

  /* compare */
  await page.keyboard.press('c');
  await settle(page);
  const cmp = await page.evaluate(() => getComputedStyle(document.getElementById('before')).display !== 'none' && document.getElementById('before').width > 10);
  check(cmp, 'before/after overlay is visible and filled');
  await page.keyboard.press('c');

  /* exports */
  await page.evaluate(() => window.TLKASCII.loadDemo('fire'));
  await settle(page);
  const exp = await page.evaluate(async () => ({
    png: (await window.TLKASCII.renderDataURL(2)).length,
    html: window.TLKASCII.html().length, svg: window.TLKASCII.svg().length, txt: window.TLKASCII.text().length
  }));
  check(exp.png > 10000, `PNG export ${exp.png} bytes (base64)`);
  check(exp.html > 1000 && exp.svg > 1000 && exp.txt > 200, `HTML ${exp.html}, SVG ${exp.svg}, TXT ${exp.txt}`);
  await page.evaluate(() => window.TLKASCII.set({ gifWidth: 320, gifFps: 10, gifSeconds: 1 }));
  const gif = await page.evaluate(() => window.TLKASCII.gif());
  check(gif && gif.head === 'GIF89a' && gif.size > 5000, `animated GIF ${gif && gif.size} bytes, header ${gif && gif.head}`);

  /* video: record from the export dialog, then reopen the clip */
  await page.evaluate(() => window.TLKASCII.set({ recSeconds: 2 }));
  await page.keyboard.press('e');
  await page.waitForSelector('#dlg-export[open]');
  if (shots) await page.screenshot({ path: `${shots}/_export.png` });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.getByRole('button', { name: 'Record video' }).click()
  ]);
  const clip = join(tmpdir(), 'tlk-ascii-' + Date.now() + '-' + download.suggestedFilename());
  await download.saveAs(clip);
  const clipSize = (await stat(clip)).size;
  check(clipSize > 20000 && /\.(mp4|webm)$/.test(clip), `recorded ${download.suggestedFilename()} (${clipSize} bytes)`);
  await page.setInputFiles('#file', clip);
  await page.waitForFunction(() => /video/i.test(document.getElementById('status-src').textContent), null, { timeout: 15000 }).catch(() => {});
  /* make any decoded, non-black frame produce glyphs */
  await page.evaluate(() => window.TLKASCII.set({ threshold: 0, gamma: 2.5, contrast: 0, brightness: 0, invert: false }));
  await page.waitForFunction(() => window.TLKASCII.text().replace(/\s/g, '').length > 200, null, { timeout: 10000 }).catch(() => {});
  const video = await page.evaluate(() => ({ src: document.getElementById('status-src').textContent, glyphs: window.TLKASCII.text().replace(/\s/g, '').length }));
  check(/video/i.test(video.src) && video.glyphs > 200, `recording reopens as a playing video source (${video.src}, ${video.glyphs} glyphs)`);
  await rm(clip, { force: true });

  /* webcam (fake camera from the browser) */
  await page.click('#btn-webcam');
  await page.waitForTimeout(1200);
  check(await page.evaluate(glyphCount) > 100, 'webcam renders glyphs');

  /* text source, own characters */
  await page.click('#btn-text');
  await settle(page);
  await page.click('#tab-glyphs');
  await page.getByLabel('Your own characters').fill('TLK');
  await settle(page);
  const own = await page.evaluate(() => new Set(window.TLKASCII.text().replace(/\s/g, '')).size);
  check(own > 0 && own <= 3, `"TLK" as own characters limits output to ${own} glyph(s)`);

  /* share link round trip */
  await page.evaluate(() => window.TLKASCII.loadDemo('rhino'));
  await page.evaluate(() => window.TLKASCII.set({ glow: 155, palette: 'neon/cyber', mode: 'edges', frame: '1:1' }));
  const link = await page.evaluate(() => window.TLKASCII.shareURL());
  const shared = await page.context().newPage();
  await shared.goto(link);
  await shared.evaluate(() => window.TLKASCII.ready);
  const got = await shared.evaluate(() => {
    const s = window.TLKASCII.settings;
    return [s.glow, s.palette, s.mode, s.frame].join(' ');
  });
  check(got === '155 neon/cyber edges 1:1', `share link restores settings (${got})`);
  await shared.close();

  /* FIGlet banner: exact text out, rendered with effects */
  await page.evaluate(() => window.TLKASCII.loadDemo('banner'));
  await page.waitForFunction(() => window.TLKASCII.text().startsWith('████████╗'), null, { timeout: 10000 }).catch(() => {});
  const banner = await page.evaluate(() => window.TLKASCII.text().split('\n')[0]);
  check(banner.startsWith('████████╗██╗     ██╗  ██╗'), `FIGlet banner text is exact ("${banner.slice(0, 26)}")`);
  await page.evaluate(() => window.TLKASCII.set({ figletFont: 'slant' }));
  await page.waitForFunction(() => window.TLKASCII.text().includes('/'), null, { timeout: 10000 }).catch(() => {});
  check(await page.evaluate(() => window.TLKASCII.text().includes('/_/')), 'switching the banner font loads it and redraws');

  /* the last settings survive a reload */
  await page.evaluate(() => window.TLKASCII.loadDemo('dragon'));
  await page.evaluate(() => window.TLKASCII.set({ glow: 177 }));
  await page.waitForTimeout(900);
  await page.goto(url);
  await page.evaluate(() => window.TLKASCII.ready);
  const restored = await page.evaluate(() => [window.TLKASCII.settings.glow, document.getElementById('status-src').textContent].join(' | '));
  check(/^177 \| .*(dragon|runes)/i.test(restored), `session restored after reload (${restored})`);

  /* installable web app */
  const pwa = await page.evaluate(async () => {
    const m = await fetch('manifest.webmanifest').then((r) => r.json());
    const reg = await navigator.serviceWorker.ready.then(() => true, () => false);
    return m.name + ' ' + reg;
  });
  check(pwa === 'TLK ASCII true', `manifest and offline worker (${pwa})`);

  /* language */
  await page.selectOption('#lang', 'tr');
  const tr = await page.textContent('#tab-glyphs');
  check(tr.trim() === 'Karakter', `Turkish tab label: "${tr.trim()}"`);
  await page.selectOption('#lang', 'en');

  /* demos dialog */
  await page.keyboard.press('d');
  const cards = await page.locator('.demo-card').count();
  check(cards === ids.length, `demo dialog lists ${cards} cards`);
  if (shots) await page.screenshot({ path: `${shots}/_dialog.png` });
  await page.keyboard.press('Escape');

  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
} finally {
  await close();
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed');
