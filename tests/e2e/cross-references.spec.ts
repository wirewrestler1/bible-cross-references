import { expect, test } from '@playwright/test';
import { ACTIVE, LINK_COUNT, openPassage, PANEL, waitForApp } from './helpers.ts';

test.describe('cross-references', () => {
  test('a verse lists where it points and what points at it, behind two chips', async ({
    page,
  }) => {
    await openPassage(page, 'John.3.16');
    const card = page.locator(PANEL);
    const out = card.getByRole('tab', { name: /points? out/ });
    const inward = card.getByRole('tab', { name: /points? in/ });
    await expect(out).toHaveAttribute('aria-selected', 'true');
    await expect(card.getByRole('button', { name: /^Romans 5:8/ }).first()).toBeVisible();
    await inward.click();
    await expect(inward).toHaveAttribute('aria-selected', 'true');
    await expect(out).toHaveAttribute('aria-selected', 'false');
    // The passages that point here, 1 John among them. (Romans 5:8 is in both lists: it points
    // at John 3:16 and John 3:16 points at it, so its presence proves nothing either way.)
    await expect(card.getByRole('button', { name: /^1 John/ }).first()).toBeVisible();
  });

  test('the card carries the verse’s own links, drawn small, above the headline', async ({
    page,
  }) => {
    await openPassage(page, 'John.3.16');
    const mini = page.locator(PANEL).getByRole('img', { name: /drawn small/ });
    await expect(mini).toBeVisible();
    expect(await mini.locator('path').count()).toBeGreaterThan(10);
  });

  test('the spectrum narrows the list to one genre, and widens it again', async ({ page }) => {
    await openPassage(page, 'John.3.16');
    const card = page.locator(PANEL);
    const spectrum = card.getByRole('group', { name: 'Narrow to a genre' });
    const gospels = spectrum.getByRole('button', { name: /^Gospels:/ });
    const before = await card.getByRole('button', { name: /^Romans 5:8/ }).count();
    expect(before).toBeGreaterThan(0);
    await gospels.click();
    await expect(gospels).toHaveAttribute('aria-pressed', 'true');
    await expect(card.getByRole('button', { name: /^Romans 5:8/ })).toHaveCount(0);
    await expect(
      card.getByRole('button', { name: /^(Matthew|Mark|Luke|John) / }).first(),
    ).toBeVisible();
    await gospels.click();
    await expect(card.getByRole('button', { name: /^Romans 5:8/ }).first()).toBeVisible();
  });

  test('a long list shows its first links, and the rest on request', async ({ page }) => {
    await openPassage(page, 'Gen.1.1');
    const card = page.locator(PANEL);
    const more = card.getByRole('button', { name: /^Show all/ });
    await expect(more).toBeVisible();
    const before = await card.locator('[class*="rowButton"]').count();
    await more.click();
    await expect(more).toHaveCount(0);
    expect(await card.locator('[class*="rowButton"]').count()).toBeGreaterThan(before);
  });

  test('raising the vote threshold shows fewer links, and says so in the address', async ({
    page,
  }) => {
    await page.goto('./');
    await waitForApp(page);
    const shownBefore = await page
      .locator(ACTIVE)
      .getByText(new RegExp(`of ${LINK_COUNT} links shown`))
      .textContent();
    await page
      .locator(ACTIVE)
      .getByRole('button', { name: /Filters/ })
      .click();
    await page.locator(ACTIVE).getByRole('combobox').first().selectOption('20');
    await expect(page).toHaveURL(/votes=20/);
    await expect(
      page.locator(ACTIVE).getByText(new RegExp(`of ${LINK_COUNT} links shown`)),
    ).not.toHaveText(shownBefore ?? '');
  });

  test('a filtered link is shared by its address', async ({ page }) => {
    await page.goto('./?votes=20');
    await waitForApp(page);
    await page
      .locator(ACTIVE)
      .getByRole('button', { name: /Filters/ })
      .click();
    await expect(page.locator(ACTIVE).getByRole('combobox').first()).toHaveValue('20');
  });

  test('a genre can be hidden and shown again', async ({ page }) => {
    await page.goto('./');
    await waitForApp(page);
    // On a phone the legend is folded into an icon button; the genres are behind it.
    const legend = page.locator(ACTIVE).getByRole('button', { name: 'Show genres' });
    if (await legend.isVisible()) {
      await legend.click();
    }
    const law = page.locator(ACTIVE).getByRole('button', { name: /^Law/ }).first();
    await law.click();
    await expect(law).toHaveAttribute('aria-pressed', 'false');
    await law.click();
    await expect(law).toHaveAttribute('aria-pressed', 'true');
  });
});
