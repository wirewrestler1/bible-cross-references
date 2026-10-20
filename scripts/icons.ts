/**
 * Rasterizes the mark (public/favicon.svg) into the app's PNG icons:
 *
 *   node scripts/icons.ts
 *
 * The favicon stays the one source of the drawing; this writes the sizes the manifest and iOS
 * ask for, on the page's surface colour, with the maskable one padded for the safe zone.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { SURFACE } from '../vite/site.ts';

const PUBLIC = resolve(import.meta.dirname, '../public');
const svg = readFileSync(resolve(PUBLIC, 'favicon.svg'), 'utf8')
  // The icon is always on the dark surface, whatever the device's theme.
  .replace(/<style>[\s\S]*?<\/style>/, '')
  .replace('class="mark"', 'stroke="#e8e6df"');

const icons: readonly { readonly file: string; readonly size: number; readonly inset: number }[] = [
  { file: 'icons/icon-192.png', size: 192, inset: 0.14 },
  { file: 'icons/icon-512.png', size: 512, inset: 0.14 },
  // Maskable: the platform may crop to a circle; the drawing stays inside the safe zone.
  { file: 'icons/icon-maskable-512.png', size: 512, inset: 0.24 },
  { file: 'apple-touch-icon.png', size: 180, inset: 0.16 },
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const { file, size, inset } of icons) {
    await page.setViewportSize({ width: size, height: size });
    const pad = Math.round(size * inset);
    await page.setContent(
      `<body style="margin:0;background:${SURFACE}">` +
        `<div style="position:absolute;inset:${String(pad)}px">${svg.replace('<svg ', '<svg style="width:100%;height:100%" ')}</div>` +
        '</body>',
    );
    await page.screenshot({ path: resolve(PUBLIC, file), type: 'png' });
    console.log(`✓ public/${file}`);
  }
} finally {
  await browser.close();
}
