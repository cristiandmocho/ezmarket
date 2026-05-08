import { test, expect } from '@playwright/test';

test.describe('product detail', () => {
  test('clicking a search result renders the product page with a valid price', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/search?q=leite');

    const firstCard = page.locator('.product-card__link').first();
    await expect(firstCard).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/product\//),
      firstCard.click(),
    ]);

    const price = page.locator('.product-detail__price');
    await expect(price).toBeVisible();
    await expect(price).toContainText('€');
    await expect(price).toHaveText(/[\d,\.]+€/);

    expect(errors).toHaveLength(0);
  });

  test('product page shows the listing name as a heading', async ({ page }) => {
    await page.goto('/search?q=leite');
    await Promise.all([
      page.waitForURL(/\/product\//),
      page.locator('.product-card__link').first().click(),
    ]);
    await expect(page.locator('.product-detail__name')).toBeVisible();
  });

  test('unit price is formatted correctly when present', async ({ page }) => {
    await page.goto('/search?q=leite');
    await Promise.all([
      page.waitForURL(/\/product\//),
      page.locator('.product-card__link').first().click(),
    ]);

    const unitPrice = page.locator('.product-detail__unit');
    if (await unitPrice.isVisible()) {
      await expect(unitPrice).toHaveText(/[\d,\.]+€\//);
    }
  });
});
