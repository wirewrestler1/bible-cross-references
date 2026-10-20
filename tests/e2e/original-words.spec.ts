import { expect, test, type Page } from '@playwright/test';
import { PANEL, openPassage, waitForApp } from './helpers.ts';

/** Opens the verse's words: the card's last chip. */
async function openWords(page: Page, ref: string): Promise<void> {
  await openPassage(page, ref);
  await page.locator(PANEL).getByRole('tab', { name: 'Words' }).click();
}

test.describe('the Hebrew and Greek behind a verse', () => {
  test('a Greek verse lists its words as pills, with how they sound and what they mean', async ({
    page,
  }) => {
    await openWords(page, 'Acts.5.14');
    const words = page.locator(PANEL).getByLabel(/Same Greek word/);
    await expect(words).toBeVisible();
    await expect(words.getByRole('button', { name: /plēthos/ })).toContainText('multitude');
  });

  test('a Hebrew verse says Hebrew, and marks the script', async ({ page }) => {
    await openWords(page, 'Gen.1.1');
    await expect(page.locator(PANEL).getByLabel(/Same Hebrew word/)).toBeVisible();
    await expect(page.locator(`${PANEL} strong[lang="he"]`).first()).toBeVisible();
  });

  test('a word opens to every other verse that uses it', async ({ page }) => {
    await openWords(page, 'Acts.5.14');
    await page
      .locator(PANEL)
      .getByRole('button', { name: /plēthos/ })
      .click();
    // The connection the cross-references do not make.
    await expect(page.locator(PANEL).getByRole('button', { name: /^Luke 5:6/ })).toBeVisible();
  });

  test('one of those verses can be followed', async ({ page }) => {
    await openWords(page, 'Acts.5.14');
    await page
      .locator(PANEL)
      .getByRole('button', { name: /plēthos/ })
      .click();
    await page
      .locator(PANEL)
      .getByRole('button', { name: /^Luke 5:6/ })
      .click();
    await expect(page.locator(PANEL).getByRole('heading', { name: 'Luke 5:6' })).toBeVisible();
    await expect(page).toHaveURL(/ref=Luke\.5\.6/);
  });

  test('the credit stays with the words', async ({ page }) => {
    await openWords(page, 'Gen.1.1');
    await expect(page.locator(PANEL).getByRole('link', { name: 'STEP Bible' })).toBeVisible();
  });

  test('the words file is fetched only once their chip is opened', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/data/words/')) {
        requests.push(request.url());
      }
    });
    await page.goto('./');
    await waitForApp(page);
    await page.waitForTimeout(1500);
    expect(requests).toHaveLength(0);

    await openPassage(page, 'Gen.1.1');
    await page.waitForTimeout(500);
    expect(requests).toHaveLength(0);

    await page.locator(PANEL).getByRole('tab', { name: 'Words' }).click();
    await expect(page.locator(PANEL).getByLabel(/Same Hebrew word/)).toBeVisible();
    expect(requests.length).toBeGreaterThan(0);
  });
});
