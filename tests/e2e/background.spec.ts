import { expect, test, type Page } from '@playwright/test';
import { ACTIVE, PANEL, waitForApp } from './helpers.ts';

/**
 * A page nobody is looking at — in the background, or with the other view in front — gives the
 * GPU back the screen-sized buffers behind the arcs, which is most of what it holds, and takes
 * them back the moment it is seen again. A phone decides whether a background page may stay in
 * memory by its weight, so this is what stands between the reader and watching it load again.
 */

/**
 * The stage's two canvases (WebGL and the overlay), as `width×height` in device pixels. The
 * card's small picture is a canvas too, but a small one that stays as it is.
 */
async function arcCanvasSizes(page: Page): Promise<string[]> {
  return page.locator('div[data-view="arcs"] [role="application"] canvas').evaluateAll((canvases) =>
    canvases.map((element) => {
      const canvas = element as HTMLCanvasElement;
      return `${String(canvas.width)}×${String(canvas.height)}`;
    }),
  );
}

/** The sizes of the two canvases asleep: a pixel, at the device's ratio (capped at 2) for the WebGL one. */
async function asleepSizes(page: Page): Promise<string[]> {
  const ratio = await page.evaluate(() => Math.min(window.devicePixelRatio, 2));
  return [`${String(ratio)}×${String(ratio)}`, '1×1'];
}

/** Tells the page it has gone to the background, or come back, the way the browser would. */
async function setVisibility(page: Page, state: 'hidden' | 'visible'): Promise<void> {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'visibilityState', { value, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

test.describe('a page in the background', () => {
  test('lets go of the arcs’ buffers, and draws the same passage again on return', async ({
    page,
  }) => {
    await page.goto('./?ref=Sir.24.3');
    await waitForApp(page);
    const ASLEEP = await asleepSizes(page);
    const awake = await arcCanvasSizes(page);
    expect(awake).toHaveLength(2);
    for (const size of awake) {
      expect(ASLEEP).not.toContain(size);
    }

    await setVisibility(page, 'hidden');
    await expect.poll(() => arcCanvasSizes(page)).toEqual(ASLEEP);

    await setVisibility(page, 'visible');
    await expect.poll(() => arcCanvasSizes(page)).toEqual(awake);
    // Still where the reader left it: no reload, no intro, the same passage open.
    await expect(page.locator(PANEL).getByRole('heading', { name: 'Sirach 24:3' })).toBeVisible();
    await expect(page).toHaveURL(/ref=Sir\.24\.3/);
  });

  test('the arcs sleep behind the Threads view too, and wake when it comes back', async ({
    page,
  }) => {
    await page.goto('./?ref=Sir.24.3');
    await waitForApp(page);
    const ASLEEP = await asleepSizes(page);
    const awake = await arcCanvasSizes(page);

    await page.locator(ACTIVE).getByRole('link', { name: 'Threads', exact: true }).click();
    await expect.poll(() => arcCanvasSizes(page)).toEqual(ASLEEP);

    await page.locator(ACTIVE).getByRole('link', { name: 'Arcs', exact: true }).click();
    await expect.poll(() => arcCanvasSizes(page)).toEqual(awake);
    await expect(page.locator(PANEL).getByRole('heading', { name: 'Sirach 24:3' })).toBeVisible();
  });
});
