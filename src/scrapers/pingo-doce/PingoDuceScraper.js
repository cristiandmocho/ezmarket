import { BaseScraper } from '../BaseScraper.js';

const BASE_URL = 'https://www.pingodoce.pt';
const PRODUCTS_PAGE = `${BASE_URL}/produtos/`;

// Matches "18,99 €/Kg" or "8,99 €"
const PRICE_TEXT_RE = /([\d,]+)\s*€(?:\/(.+))?/;

export class PingoDuceScraper extends BaseScraper {
  getName() { return 'Pingo Doce'; }
  getSlug() { return 'pingo-doce'; }

  async getCategoryUrls(page) {
    await page.goto(PRODUCTS_PAGE, { waitUntil: 'networkidle' });

    const allLinks = await page.evaluate(() => {
      return [...document.querySelectorAll('a')]
        .map(a => a.href)
        .filter(href => href.includes('/home/produtos/') && !href.includes('?') && !href.includes('#') && !href.endsWith('.html'))
        .filter((v, i, arr) => arr.indexOf(v) === i); // unique
    });

    // Leaf categories: URLs that are not a prefix of any other URL
    return allLinks.filter(href =>
      !allLinks.some(other => other !== href && other.startsWith(href + '/'))
    );
  }

  async scrapeCategory(page, url) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await this.#dismissCookieBanner(page);
    return this.#extractProducts(page, url);
  }

  async #dismissCookieBanner(page) {
    const btn = page.locator('#onetrust-accept-btn-handler');
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await page.waitForLoadState('networkidle');
    }
  }

  async #extractProducts(page, categoryUrl) {
    return page.evaluate(({ baseUrl, pattern, categoryUrl }) => {
      const re = new RegExp(pattern);

      // Derive category path from the URL: /home/produtos/cat1/cat2/cat3 → "cat1/cat2/cat3"
      // Slugs are kept as-is for now; display names come from GTM item_category
      const urlPath = new URL(categoryUrl).pathname.replace('/home/produtos/', '');

      return [...document.querySelectorAll('.product-tile-pd')]
        .map(tile => {
          let gtm;
          try { gtm = JSON.parse(tile.dataset.gtmInfo); } catch { return null; }
          const item = gtm?.items?.[0];
          if (!item) return null;

          const priceText = tile.querySelector('.product-price .sales')?.innerText?.trim() ?? '';
          const match = priceText.match(re);
          const unit = match?.[2]?.trim() ?? null;

          const imageEl   = tile.querySelector('.product-tile-component-image');
          const linkEl    = tile.querySelector('.product-tile-image-link');
          const productHref = linkEl?.getAttribute('href') ?? null;

          return {
            external_id: String(item.item_id),
            name:        item.item_name,
            brand:       item.item_brand || null,
            price:       item.price,
            // When a unit is shown (e.g. €/Kg), the displayed price IS the unit price
            unit_price:  unit ? item.price : null,
            unit,
            category:    item.item_category || null,
            image_url:   imageEl?.src ?? null,
            product_url: productHref ? `${baseUrl}${productHref}` : null,
          };
        })
        .filter(p => p && p.external_id && p.price > 0);
    }, { baseUrl: BASE_URL, pattern: PRICE_TEXT_RE.source, categoryUrl });
  }
}
