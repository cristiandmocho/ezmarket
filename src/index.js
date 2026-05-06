import { chromium } from 'playwright';
import { scrapers } from './scrapers/registry.js';
import pool from './db/connection.js';
import { upsertProduct } from './models/product.js';
import { findOrCreateCategoryPath } from './models/category.js';

const browser = await chromium.launch({ headless: true });

for (const scraper of scrapers) {
  console.log(`\n[${scraper.getName()}] Starting…`);

  const [rows] = await pool.execute(
    'SELECT id FROM supermarkets WHERE slug = ?',
    [scraper.getSlug()],
  );
  const supermarketId = rows[0]?.id;
  if (!supermarketId) {
    console.error(`  Supermarket "${scraper.getSlug()}" not found in DB — skipping.`);
    continue;
  }

  const page = await browser.newPage();

  for (const url of scraper.getCategoryUrls()) {
    console.log(`  ${url}`);
    try {
      const products = await scraper.scrapeCategory(page, url);
      console.log(`    → ${products.length} products`);

      for (const product of products) {
        const categoryId = product.category
          ? await findOrCreateCategoryPath(supermarketId, product.category)
          : null;

        await upsertProduct({
          supermarket_id: supermarketId,
          category_id:    categoryId,
          external_id:    product.external_id,
          name:           product.name,
          brand:          product.brand,
          price:          product.price,
          unit_price:     product.unit_price,
          unit:           product.unit,
          image_url:      product.image_url,
          product_url:    product.product_url,
        });
      }
    } catch (err) {
      console.error(`    ERROR: ${err.message}`);
    }
  }

  await page.close();
  console.log(`[${scraper.getName()}] Done.`);
}

await browser.close();
await pool.end();
console.log('\nAll scrapers finished.');
