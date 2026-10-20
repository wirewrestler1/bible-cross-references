import { expect, test } from '@playwright/test';
import { ACTIVE, PANEL } from './helpers.ts';

/**
 * The one test that lets the motion play: the loading screen holds until its spectrum is
 * full, the page arrives after it, and opening a passage glides the arcs to its reach. Every
 * other test asks for reduced motion (see playwright.config.ts), which skips all of this.
 */
test.use({ reducedMotion: 'no-preference' });

test('the page arrives: the loading screen holds, the chrome comes in, the arcs fit the passage', async ({
  page,
}) => {
  // On the software renderer the arcs' first frames alone can take a while; the motion waits
  // for them, so this test waits longer than the rest.
  test.setTimeout(180_000);
  await page.goto('./?ref=Sir.24.3');
  // The loading screen first, with its arcs, held even though the data is quick.
  const loading = page.getByRole('status').filter({ hasText: /Loading [0-9,]+ verses/ });
  await expect(loading).toBeVisible();
  // Then the page, its chrome arriving over the next seconds; the loading screen leaves.
  const header = page.locator(`${ACTIVE} header`).first();
  await expect(header).toBeAttached({ timeout: 60_000 });
  await expect(loading).toHaveCount(0, { timeout: 60_000 });
  await expect
    .poll(() => header.evaluate((element) => getComputedStyle(element).opacity), {
      timeout: 60_000,
    })
    .toBe('1');
  await expect(page.locator(PANEL).getByRole('heading', { name: 'Sirach 24:3' })).toBeVisible();
  // Sirach 24:3 reaches from Genesis to Sirach, not the whole canon: the arcs zoom to that.
  await expect(page.getByRole('button', { name: 'Whole Bible' })).toBeVisible({ timeout: 60_000 });
});
