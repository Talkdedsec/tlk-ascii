// Launches the desktop build in development mode and checks that the app
// loads offline from app://, renders a demo and has no page errors.
import { _electron as electron } from 'playwright-core';
import electronPath from 'electron';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = await electron.launch({ executablePath: electronPath, args: [ROOT] });
const errors = [];
let failed = false;
try {
  const win = await app.firstWindow();
  win.on('pageerror', (e) => errors.push(e.message));
  win.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await win.waitForFunction(() => window.TLKASCII && window.TLKASCII.ready);
  await win.evaluate(() => window.TLKASCII.ready);
  await win.waitForTimeout(500);
  const info = await win.evaluate(() => ({
    url: location.href,
    glyphs: window.TLKASCII.text().replace(/\s/g, '').length,
    fonts: document.fonts.check('32px "UnifrakturMaguntia"'),
    desktop: document.body.classList.contains('desktop')
  }));
  console.log(info);
  if (process.env.SHOT) await win.screenshot({ path: process.env.SHOT });
  failed = !info.url.startsWith('app://') || info.glyphs < 200 || !info.fonts || !info.desktop || errors.length > 0;
  if (errors.length) console.error(errors.join('\n'));
} finally {
  await app.close();
}
console.log(failed ? 'Desktop check failed' : 'Desktop check passed');
process.exit(failed ? 1 : 0);
