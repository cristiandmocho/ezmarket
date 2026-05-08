import { BaseScraper } from '../BaseScraper.js';

const CATEGORY_URLS = [
  'https://www.continente.pt/mercearia/',
  'https://www.continente.pt/frescos/',
  'https://www.continente.pt/congelados/',
  'https://www.continente.pt/bebidas-e-garrafeira/',
  'https://www.continente.pt/bio-e-saudavel/',
  'https://www.continente.pt/limpeza/',
  'https://www.continente.pt/bebe/',
  'https://www.continente.pt/beleza-e-higiene/',
  'https://www.continente.pt/animais/',
];

// Matches "15,38€/kg" or "0,33€/un"
const UNIT_PRICE_RE = /([\d,.]+)€\/(.+)/;

export class ContinenteScraper extends BaseScraper {
  getName() { return 'Continente'; }
  getSlug() { return 'continente'; }
  getCategoryUrls() { return CATEGORY_URLS; }

  async scrapeCategory(page, url) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await this.#dismissCookieBanner(page);
    await this.#loadAllProducts(page);
    return this.#extractProducts(page);
  }

  async #dismissCookieBanner(page) {
    const acceptBtn = page.locator('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
    if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptBtn.click();
      await page.waitForLoadState('networkidle');
    }
  }

  async #loadAllProducts(page) {
    // "35 de 5082 produtos" → { shown: 35, total: 5082 }
    const getCounters = () => page.evaluate(() => {
      const text = document.querySelector('.search-results-products-counter')?.innerText ?? '';
      const m = text.match(/(\d[\d\s]*)\s+de\s+([\d\s]+)/);
      if (!m) return { shown: 0, total: 0 };
      const parse = s => parseInt(s.replace(/\s/g, ''), 10);
      return { shown: parse(m[1]), total: parse(m[2]) };
    });

    const { total } = await getCounters();
    if (!total) return;

    while (true) {
      const { shown } = await getCounters();
      if (shown >= total) break;

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);

      const clicked = await page.evaluate(() => {
        const btn = document.querySelector('.js-show-more-products')
          ?? [...document.querySelectorAll('button, a, [role="button"]')]
               .find(el => /ver mais produtos/i.test(el.textContent?.trim()));
        if (!btn) return false;
        btn.click();
        return true;
      });
      if (!clicked) break;

      await page.waitForLoadState('networkidle');
    }
  }

  async #extractProducts(page) {
    return page.evaluate((unitPricePattern) => {
      const re = new RegExp(unitPricePattern);

      return [...document.querySelectorAll('.product-tile.ct-product-tile-vertical')]
        .map(tile => {
          let impression;
          try {
            impression = JSON.parse(tile.dataset.productTileImpression);
          } catch {
            return null;
          }

          const unitPriceText = tile.querySelector('.pwc-tile--price-secondary')?.innerText?.trim() ?? '';
          const match = unitPriceText.match(re);

          const imageEl = tile.querySelector('img.ct-tile-image');
          const linkEl  = tile.querySelector('a.image-link');

          return {
            external_id: impression.id,
            name:        impression.name,
            brand:       impression.brand || null,
            price:       impression.price,
            unit_price:  match ? parseFloat(match[1].replace(',', '.')) : null,
            unit:        match ? match[2].trim() : null,
            category:    impression.category || null,
            image_url:   imageEl ? (imageEl.src || imageEl.dataset.src || null) : null,
            product_url: linkEl?.href ?? null,
          };
        })
        .filter(p => p && p.external_id && p.price > 0);
    }, UNIT_PRICE_RE.source);
  }
}
