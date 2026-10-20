import { expect, test, type Page } from '@playwright/test';
import { ACTIVE, PANEL, waitForApp } from './helpers.ts';

/** The search box, open and ready: in the header on a wide screen, in its sheet on a phone. */
async function openSearch(page: Page) {
  const active = page.locator(ACTIVE);
  const box = active.getByRole('searchbox');
  if (!(await box.isVisible())) {
    await active.getByRole('button', { name: 'Search', exact: true }).click();
  }
  return { box, list: active.getByRole('listbox', { name: 'Suggestions' }) };
}

test.describe('what the search offers as a reference is typed', () => {
  test('a verse can be reached by taps alone: the book, then a chapter, then a verse', async ({
    page,
  }) => {
    await page.goto('./');
    await waitForApp(page);
    const { box, list } = await openSearch(page);
    await box.fill('ge');
    await list.getByRole('option', { name: 'Genesis', exact: true }).click();
    await expect(box).toHaveValue('Genesis ');
    await list.getByRole('option', { name: '2', exact: true }).click();
    await expect(box).toHaveValue('Genesis 2:');
    await list.getByRole('option', { name: '7', exact: true }).click();
    await expect(page.locator(PANEL).getByRole('heading', { name: 'Genesis 2:7' })).toBeVisible();
    await expect(page).toHaveURL(/ref=Gen\.2\.7/);
    // Found: the box is empty again, and its list gone.
    await expect(page.locator(ACTIVE).getByRole('listbox')).toHaveCount(0);
  });

  test('a whole chapter is the first offer among its verses', async ({ page }) => {
    await page.goto('./');
    await waitForApp(page);
    const { box, list } = await openSearch(page);
    await box.fill('Psalm 23:');
    await list.getByRole('option', { name: 'Whole chapter' }).click();
    await expect(page.locator(PANEL).getByRole('heading', { name: 'Psalm 23' })).toBeVisible();
  });

  test('typing on narrows the offers, and Enter still takes the text as typed', async ({
    page,
  }) => {
    await page.goto('./');
    await waitForApp(page);
    const { box, list } = await openSearch(page);
    await box.fill('Sirach 2');
    await expect(list.getByRole('option')).toHaveCount(11); // 2 and 20–29
    await box.press('Enter');
    await expect(page.locator(PANEL).getByRole('heading', { name: 'Sirach 2' })).toBeVisible();
  });
});
