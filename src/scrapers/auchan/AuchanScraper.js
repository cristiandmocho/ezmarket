import { BaseScraper } from '../BaseScraper.js';

const BASE_URL = 'https://www.auchan.pt';
const NAV_ROOT  = `${BASE_URL}/pt/alimentar`;

const PRODUCT_ROOTS = [
  '/pt/produtos-frescos',
  '/pt/alimentacao',
  '/pt/bebidas-e-garrafeira',
  '/pt/biologicos-e-alternativas',
  '/pt/limpeza-e-cuidados-do-lar',
  '/pt/beleza-e-higiene',
  '/pt/saude-e-bem-estar',
  '/pt/o-mundo-do-bebe',
  '/pt/tecnologia-e-eletrodomesticos',
  '/pt/animais',
  '/pt/brinquedos',
  '/pt/papelaria-e-livraria',
  '/pt/casa-e-jardim',
  '/pt/automovel-e-bricolage',
  '/pt/viagem-desporto-e-outdoor',
  '/pt/reuse',
  '/pt/produtos-locais',
];

// "0.25 €/un" or "3.99 €/kg"
const UNIT_PRICE_RE = /([\d.]+)\s*€\/(.+)/;

export class AuchanScraper extends BaseScraper {
  getName() { return 'Auchan'; }
  getSlug() { return 'auchan'; }

  async getCategoryUrls(page) {
    await page.goto(NAV_ROOT, { waitUntil: 'networkidle' });

    const allLinks = await page.evaluate((roots) => {
      return [...document.querySelectorAll('a')]
        .map(a => a.href)
        .filter(href => {
          if (!href.includes('auchan.pt/pt/')) return false;
          if (href.includes('?') || href.includes('#')) return false;
          const path = new URL(href).pathname;
          return roots.some(r => path.startsWith(r + '/'));
        })
        .filter((v, i, arr) => arr.indexOf(v) === i);
    }, PRODUCT_ROOTS);

    // Leaf categories: paths not a prefix of any other path
    return allLinks.filter(href => {
      const path = new URL(href).pathname.replace(/\/?$/, '/');
      return !allLinks.some(other => other !== href && new URL(other).pathname.startsWith(path));
    });
  }

  async scrapeCategory(page, url) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await this.#dismissCookieBanner(page);
    await this.#scrollToLoadAll(page);
    return this.#extractProducts(page);
  }

  async #dismissCookieBanner(page) {
    const btn = page.locator('#onetrust-accept-btn-handler');
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await page.waitForLoadState('networkidle');
    }
  }

  async #scrollToLoadAll(page) {
    let previousCount = 0;
    let stableRounds = 0;
    while (true) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(3000);
      const count = await page.locator('.product-tile.auc-product-tile').count();
      if (count === previousCount) {
        stableRounds++;
        if (stableRounds >= 2) break; // two consecutive stable rounds = done
      } else {
        stableRounds = 0;
      }
      previousCount = count;
    }
  }

  async #extractProducts(page) {
    return page.evaluate((pattern) => {
      const re = new RegExp(pattern);

      return [...document.querySelectorAll('.product-tile.auc-product-tile')]
        .map(tile => {
          let gtm, urls;
          try { gtm  = JSON.parse(tile.dataset.gtm);  } catch { return null; }
          try { urls = JSON.parse(tile.dataset.urls); } catch { urls = {}; }

          const gtmNew = (() => {
            try { return JSON.parse(tile.dataset.gtmNew); } catch { return {}; }
          })();

          // Build the 3-level category path from data-gtm-new
          const category = [gtmNew.item_category, gtmNew.item_category2, gtmNew.item_category3]
            .filter(Boolean)
            .join('/') || gtm.category || null;

          const priceEl = tile.querySelector('.sales .value');
          const price   = priceEl ? parseFloat(priceEl.getAttribute('content')) : parseFloat(gtm.price);

          const unitPriceText = tile.querySelector('.auc-measures--price-per-unit')?.innerText?.trim() ?? '';
          const match = unitPriceText.match(re);

          return {
            external_id: tile.dataset.pid,
            name:        gtm.name,
            brand:       gtm.brand || null,
            price,
            unit_price:  match ? parseFloat(match[1]) : null,
            unit:        match ? match[2].trim() : null,
            category,
            image_url:   tile.querySelector('img.tile-image')?.src ?? null,
            product_url: urls.absoluteProductUrl ?? null,
          };
        })
        .filter(p => p && p.external_id && p.price > 0);
    }, UNIT_PRICE_RE.source);
  }
}
