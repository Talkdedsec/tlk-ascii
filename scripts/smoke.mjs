// End-to-end check in a real browser: every demo renders glyphs, every
// export produces output, the interface switches language, no errors.
import { mkdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { open } from './browser.mjs';

const shots = process.env.SHOT_DIR;
const failures = [];
const check = (ok, msg) => {
  if (!ok) failures.push(msg);
  console.log((ok ? '  ok   ' : '  FAIL ') + msg);
};

const { page, errors, url, close } = await open();
try {
  await page.goto(url);
  await page.waitForFunction(() => window.TLKASCII && window.TLKASCII.ready);
  await page.evaluate(() => window.TLKASCII.ready);
  if (shots) await mkdir(shots, { recursive: true });

  const ids = await page.evaluate(() => window.GF.DEMOS.map((d) => d.id));
  check(ids.length >= 8, `${ids.length} demos are defined`);

  for (const id of ids) {
    await page.evaluate((d) => window.TLKASCII.loadDemo(d), id);
    await page.waitForTimeout(400);
    const stats = await page.evaluate(() => {
      const c = document.getElementById('out');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4 * 7) if (d[i] + d[i + 1] + d[i + 2] > 60) lit++;
      const text = window.TLKASCII.text();
      return { w: c.width, h: c.height, lit: lit / (d.length / 28), chars: text.replace(/\s/g, '').length };
    });
    check(stats.w > 300 && stats.h > 100 && stats.lit > 0.01 && stats.chars > 200,
      `demo ${id}: ${stats.w}x${stats.h}, ${(stats.lit * 100).toFixed(1)}% lit, ${stats.chars} glyphs`);
    if (shots) await page.screenshot({ path: `${shots}/${id}.png` });
  }

  const exp = await page.evaluate(async () => {
    const png = await window.TLKASCII.renderDataURL(2);
    return { png: png.length, html: window.TLKASCII.html().length, svg: window.TLKASCII.svg().length, txt: window.TLKASCII.text().length };
  });
  check(exp.png > 10000, `PNG export ${exp.png} bytes (base64)`);
  check(exp.html > 1000 && exp.svg > 1000 && exp.txt > 200, `HTML ${exp.html}, SVG ${exp.svg}, TXT ${exp.txt}`);

  // record a short clip, then open the recording as a video source
  await page.evaluate(async () => {
    await window.TLKASCII.loadDemo('fire');
    window.TLKASCII.set({ recSeconds: 2 });
  });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.click('.btn.rec')
  ]);
  const clip = join(tmpdir(), 'tlk-ascii-' + Date.now() + '-' + download.suggestedFilename());
  await download.saveAs(clip);
  const clipSize = (await stat(clip)).size;
  check(clipSize > 20000 && /\.(mp4|webm)$/.test(clip), `recorded ${download.suggestedFilename()} (${clipSize} bytes)`);
  await page.setInputFiles('#file', clip);
  await page.waitForFunction(() => /video/i.test(document.querySelector('.src-name strong').textContent), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(400);
  const video = await page.evaluate(() => ({ kind: document.querySelector('.src-name strong').textContent, glyphs: window.TLKASCII.text().replace(/\s/g, '').length }));
  check(/video/i.test(video.kind) && video.glyphs > 100, `recording reopens as a video source (${video.kind}, ${video.glyphs} glyphs)`);
  await rm(clip, { force: true });

  // webcam (the browser provides a fake camera)
  await page.click('#btn-webcam');
  await page.waitForTimeout(1200);
  const cam = await page.evaluate(() => ({ kind: document.querySelector('.src-name strong').textContent, glyphs: window.TLKASCII.text().replace(/\s/g, '').length }));
  check(cam.glyphs > 100, `webcam renders ${cam.glyphs} glyphs (${cam.kind})`);

  // text source and inject characters
  await page.click('#btn-text');
  await page.waitForTimeout(300);
  await page.fill('#f-inject', 'TLK');
  await page.waitForTimeout(300);
  const glyphs = await page.evaluate(() => new Set(window.TLKASCII.text().replace(/\s/g, '')).size);
  check(glyphs > 0 && glyphs <= 3, `inject "TLK" limits output to ${glyphs} glyph(s)`);

  // language switch
  await page.selectOption('#lang', 'tr');
  const tr = await page.textContent('#panel summary');
  check(tr.trim() === 'Kaynak', `Turkish panel heading: "${tr.trim()}"`);
  await page.selectOption('#lang', 'en');

  // demos dialog
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
