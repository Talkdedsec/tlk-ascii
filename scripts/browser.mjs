// Starts the static server and a Chromium-based browser for the scripts.
// Uses an installed Edge or Chrome, or BROWSER_PATH when set.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { serve } from './serve.mjs';

function findBrowser() {
  if (process.env.BROWSER_PATH) return { executablePath: process.env.BROWSER_PATH };
  const candidates = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];
  const hit = candidates.find((p) => existsSync(p));
  if (hit) return { executablePath: hit };
  throw new Error('No Chromium-based browser found. Set BROWSER_PATH.');
}

export async function open({ width = 1440, height = 900, lang = 'en' } = {}) {
  const server = await serve(0);
  const { port } = server.address();
  const browser = await chromium.launch({ ...findBrowser(), headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: lang === 'tr' ? 'tr-TR' : 'en-US' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));
  const url = `http://127.0.0.1:${port}/`;
  return {
    page, errors, url,
    async close() {
      await browser.close();
      server.close();
    }
  };
}
