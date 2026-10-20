/**
 * Draws the share picture and the README's screenshots from the built site:
 *
 *   npm run build && npm run preview &   # serves dist/ at its deployed path
 *   node scripts/screenshots.ts
 *
 * The share picture is the arcs of the whole canon at twice 1200×630, which is what the link
 * previews scale down; the screenshots are the views the README describes. Chromium draws the
 * arcs with its software renderer here, as the end-to-end tests do.
 */
import { resolve } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { GUIDE_PREFERENCE, preferenceKey } from '../src/shared/lib/preference-keys.ts';
import { DEPLOY_BASE, SOCIAL_IMAGE_SIZE } from '../vite/site.ts';

const BASE_URL = process.env['BASE_URL'] ?? `http://localhost:4173${DEPLOY_BASE}`;
const PUBLIC = resolve(import.meta.dirname, '../public');

async function settled(page: Page): Promise<void> {
  await page.locator('div[data-active="true"] canvas').first().waitFor({ state: 'attached' });
  await page.locator('div[data-active="true"] footer').first().waitFor();
  // The arcs reveal themselves over a moment; let the intro finish.
  await page.waitForTimeout(3000);
}

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const shots: readonly {
    readonly file: string;
    readonly path: string;
    readonly width: number;
    readonly height: number;
    readonly scale?: number;
  }[] = [
    { file: 'social-preview.jpg', path: '', ...SOCIAL_IMAGE_SIZE, scale: 2 },
    { file: 'screenshots/arcs.jpg', path: '', width: 1440, height: 900 },
    { file: 'screenshots/arcs-verse.jpg', path: '?ref=Heb.11.35', width: 1440, height: 900 },
    { file: 'screenshots/threads.jpg', path: 'threads/?ref=Sir.24', width: 1440, height: 900 },
  ];
  for (const shot of shots) {
    const scale = shot.scale ?? 1;
    const context = await browser.newContext({
      viewport: { width: shot.width / scale, height: shot.height / scale },
      deviceScaleFactor: scale,
      colorScheme: 'dark',
      // A reader who has seen the first-visit guide: the pictures are of the arcs, not of it.
      storageState: {
        cookies: [],
        origins: [
          {
            origin: new URL(BASE_URL).origin,
            localStorage: [{ name: preferenceKey(GUIDE_PREFERENCE), value: 'seen' }],
          },
        ],
      },
    });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}${shot.path}`);
    await settled(page);
    await page.screenshot({
      path: resolve(PUBLIC, shot.file),
      type: 'jpeg',
      quality: 88,
    });
    console.log(`✓ public/${shot.file}`);
    await context.close();
  }
} finally {
  await browser.close();
}
