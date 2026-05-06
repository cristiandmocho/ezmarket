import { BaseScraper } from '../BaseScraper.js';

const BASE_URL  = 'https://www.lidl.pt';
const MERCEARIA = `${BASE_URL}/c/mercearia-e-frescos/s10068374`;

// Food subcategory filter URLs — each maps to ?category.id=<h-page-id>
const FOOD_CATEGORY_IDS = [
  10071012, // Frutas e Legumes
  10071015, // Padaria & Pastelaria
  10071045, // Ovos e alimentos de base
  10071017, // Queijos & Laticínios & Ovos
  10071016, // Carne
  10071050, // Peixe & Marisco
  10071683, // Café, Chá & Bebidas Solúveis
  10071681, // Azeites, Óleos & Conservas
  10071682, // Molhos & Temperos
  10071020, // Refeições Prontas
  10071049, // Congelados
  10071044, // Snacks
  10071019, // Saúde & Bem-estar
  10071687, // Vinhos & Espirituosas
  10071022, // Bebidas
  10071024, // Flores & Plantas
  10071025, // Rações para Animais
];

// Non-food rotating-offer category pages
const NON_FOOD_URLS = [
  `${BASE_URL}/c/cozinha-e-cuidado-do-lar/s10068166`,
  `${BASE_URL}/c/ferramentas-e-jardim/s10068222`,
  `${BASE_URL}/c/desporto-e-tempos-livres/s10068226`,
  `${BASE_URL}/c/casa-e-decoracao/s10068371`,
  `${BASE_URL}/c/moda-e-acessorios/s10068373`,
  `${BASE_URL}/c/bebe-crianca-e-brinquedos/s10068225`,
];

// "1 kg = 13.00" or "100 ml = 1.50"
const BASE_PRICE_RE = /[\d.,]+\s*([a-zA-Z]+)\s*=\s*([\d.]+)/;

export class LidlScraper extends BaseScraper {
  getName() { return 'Lidl'; }
  getSlug() { return 'lidl'; }

  getCategoryUrls() {
    const foodUrls = FOOD_CATEGORY_IDS.map(id => `${MERCEARIA}?category.id=${id}`);
    return [...foodUrls, ...NON_FOOD_URLS];
  }

  async scrapeCategory(page, url) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await this.#dismissCookieBanner(page);
    await page.waitForSelector('[data-grid-data]', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await this.#loadAllProducts(page);
    return this.#extractProducts(page);
  }

  async #dismissCookieBanner(page) {
    const btn = page.locator('#onetrust-accept-btn-handler');
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await page.waitForLoadState('networkidle');
    }
  }

  async #loadAllProducts(page) {
    const btn = page.locator('.s-load-more__button');
    while (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await page.waitForLoadState('networkidle');
    }
  }

  async #extractProducts(page) {
    return page.evaluate(({ baseUrl, pattern }) => {
      const re = new RegExp(pattern);

      return [...document.querySelectorAll('[data-grid-data]')]
        .map(el => {
          let d;
          try { d = JSON.parse(el.getAttribute('data-grid-data')); } catch { return null; }

          // Regular price; fall back to Lidl Plus price
          const price = d.price?.price ?? d.lidlPlus?.[0]?.price?.price ?? null;
          if (!price || price <= 0) return null;

          // Unit price from "1 kg = 13.00" format
          const basePriceText = d.price?.basePrice?.text ?? '';
          const match = basePriceText.match(re);

          // Brand only populated when showBrand flag is true
          const brand = d.brand?.showBrand ? (d.brand.name ?? null) : null;

          // Category path from wonCategoryPrimary, strip the "Mundos de necessidade/" prefix
          const rawCategory = d.keyfacts?.wonCategoryPrimary ?? d.category ?? null;
          const category = rawCategory
            ? rawCategory.replace(/^Mundos de necessidade\//i, '')
            : null;

          return {
            external_id: String(d.productId),
            name:        d.fullTitle,
            brand,
            price,
            unit_price:  match ? parseFloat(match[2]) : null,
            unit:        match ? match[1].trim() : null,
            category,
            image_url:   d.image ?? null,
            product_url: d.canonicalPath ? `${baseUrl}${d.canonicalPath}` : null,
          };
        })
        .filter(p => p && p.external_id && p.price > 0);
    }, { baseUrl: BASE_URL, pattern: BASE_PRICE_RE.source });
  }
}
