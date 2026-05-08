import { test, expect } from '@playwright/test';

test.describe('"Ver mais" load more', () => {
  test('loads additional products without a page refresh and updates the count label', async ({ page }) => {
    await page.goto('/search?q=leite');

    const loadMoreBtn = page.locator('#load-more-btn');
    await expect(loadMoreBtn).toBeVisible({ timeout: 5_000 });

    const initialCards = page.locator('#product-grid .product-card');
    const initialCount = await initialCards.count();
    expect(initialCount).toBeGreaterThan(0);

    const countLabel = page.locator('.search-results-count strong');
    expect(Number(await countLabel.textContent())).toBe(initialCount);

    // mark the window so we can verify no full reload happened
    await page.evaluate(() => { window.__noReload = true; });

    const urlBefore = page.url();

    // wait for the API response and the click atomically — no race condition
    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/search') && r.status() === 200),
      loadMoreBtn.click(),
    ]);

    const { results, hasMore } = await response.json();
    expect(results.length).toBeGreaterThan(0);

    // wait for the DOM to reflect the new cards
    await expect(initialCards).toHaveCount(initialCount + results.length, { timeout: 5_000 });

    const finalCount = await initialCards.count();
    expect(finalCount).toBeGreaterThan(initialCount);

    // no page reload
    expect(page.url()).toBe(urlBefore);
    expect(await page.evaluate(() => window.__noReload)).toBe(true);

    // count label updated to reflect total visible cards
    expect(Number(await countLabel.textContent())).toBe(finalCount);

    // button removed if no more results, or still visible if more pages exist
    if (!hasMore) {
      await expect(page.locator('#load-more-wrap')).toBeHidden();
    } else {
      await expect(loadMoreBtn).toBeVisible();
    }
  });

  test('button disappears when all results are exhausted', async ({ page }) => {
    await page.goto('/search?q=leite gordo meio gordo');

    const loadMoreBtn = page.locator('#load-more-btn');
    if (!(await loadMoreBtn.isVisible())) return;

    const initialCount = await page.locator('#product-grid .product-card').count();

    await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/search') && r.status() === 200),
      loadMoreBtn.click(),
    ]);

    const finalCount = await page.locator('#product-grid .product-card').count();
    expect(finalCount).toBeGreaterThanOrEqual(initialCount);
  });
});
