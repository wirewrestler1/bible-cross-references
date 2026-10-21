import { expect, test } from '@playwright/test';
import { ACTIVE, waitForApp } from './helpers.ts';

/**
 * The first-visit guide: the one page that explains the arcs, the kinds of link and their weight
 * to somebody who has never seen them. Starts from an empty storage, unlike every other test,
 * because that is what a first visit is.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('the first visit', () => {
  test('opens the guide over the arcs, once, and the arcs are there behind it', async ({
    page,
  }) => {
    await page.goto('./');
    await waitForApp(page);
    const guide = page.getByRole('dialog', { name: 'How to read this' });
    await expect(guide).toBeVisible();
    // The five kinds, by their plain names, and what weight means.
    for (const kind of [
      'Classic references',
      'Swedish Bible notes',
      'Hand-picked',
      'Similar wording',
      'Haydock’s notes',
    ]) {
      await expect(guide.getByText(kind, { exact: true })).toBeVisible();
    }
    await expect(guide.getByRole('heading', { name: /weight/i })).toBeVisible();

    await guide.getByRole('button', { name: 'Got it' }).click();
    await expect(guide).toBeHidden();

    // Seen: a reload does not bring it back.
    await page.reload();
    await waitForApp(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // But the "?" does, from either view.
    await page.locator(ACTIVE).getByRole('button', { name: 'How to read this' }).click();
    await expect(page.getByRole('dialog', { name: 'How to read this' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('a shared link to a verse still opens the verse, with the guide on top', async ({
    page,
  }) => {
    await page.goto('./?ref=Sir.24.3');
    await waitForApp(page);
    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(
      page.locator(`${ACTIVE} aside`).getByRole('heading', { name: 'Sirach 24:3' }),
    ).toBeVisible();
  });
});
