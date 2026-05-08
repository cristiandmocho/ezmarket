import { BaseScraper } from '../BaseScraper.js';

const BASE_URL = 'https://www.lidl.pt';

// "1 kg = 3.00" or "100 ml = 0.75"
const BASE_PRICE_RE = /[\d.,]+\s*([a-zA-Z]+)\s*=\s*([\d.,]+)/;

export class LidlScraper extends BaseScraper {
  getName() { return 'Lidl'; }
  getSlug() { return 'lidl'; }

  async getCategoryUrls(page) {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await this.#dismissCookieBanner(page);
    await page.waitForSelector('ul.ux-base-slider__strip', { timeout: 15000 });

    return page.$$eval(
      'ul.ux-base-slider__strip li a',
      (anchors, base) => [...new Set(
        anchors.map(a => a.href).filter(h => h && h.startsWith(base))
      )],
      BASE_URL,
    );
  }

  async scrapeCategory(page, categoryUrl) {
    await page.goto(categoryUrl, { waitUntil: 'networkidle' });
    await this.#dismissCookieBanner(page);

    const subcategoryUrls = await this.#getSubcategoryUrls(page, categoryUrl);
    this.log(`  ${subcategoryUrls.length} subcategories`);

    const targets = subcategoryUrls.length > 0 ? subcategoryUrls : [categoryUrl];
    const allById = new Map();

    for (const url of targets) {
      this.log(`  scraping ${url}`);
      if (page.url() !== url) {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
      }
      await this.#loadAllProducts(page);
      const products = await this.#extractProducts(page);
      this.log(`  found ${products.length} products`);
      for (const p of products) allById.set(p.external_id, p);
    }

    return [...allById.values()];
  }

  async #getSubcategoryUrls(page, parentUrl) {
    const hasCarousel = await page.locator('ul.ods-carousel__track').isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasCarousel) return [];

    // Try DOM extraction first — no clicks needed if buttons have a parent <a> or data-href
    const domUrls = await page.$$eval(
      'ul.ods-carousel__track li button.odsc-link-action',
      (btns, base) => btns.map(btn => {
        const anchor = btn.closest('a[href]') ?? btn.querySelector('a[href]');
        const raw = anchor?.getAttribute('href') ?? btn.dataset?.href ?? btn.dataset?.url ?? null;
        return raw ? new URL(raw, base).href : null;
      }).filter(Boolean),
      BASE_URL,
    );
    if (domUrls.length > 0) {
      this.log(`  subcategories via DOM: ${domUrls.length}`);
      return [...new Set(domUrls)];
    }

    // Fall back: click each button, capture URL, go back
    const count = await page.locator('ul.ods-carousel__track li button.odsc-link-action').count();
    if (count === 0) return [];

    this.log(`  subcategories via click: ${count}`);
    const urls = [];

    for (let i = 0; i < count; i++) {
      const btn = page.locator('ul.ods-carousel__track li button.odsc-link-action').nth(i);
      if (!await btn.isVisible().catch(() => false)) continue;

      const prevUrl = page.url();
      await btn.click();
      await page.waitForFunction(
        prev => window.location.href !== prev,
        prevUrl,
        { timeout: 10000 },
      ).catch(() => { });

      const newUrl = page.url();
      if (newUrl !== prevUrl) urls.push(newUrl);

      await page.goBack({ waitUntil: 'domcontentloaded' })
        .catch(() => page.goto(parentUrl, { waitUntil: 'domcontentloaded' }));
      await page.waitForSelector('ul.ods-carousel__track li button.odsc-link-action', { timeout: 10000 }).catch(() => { });
    }

    return [...new Set(urls)];
  }

  async #loadAllProducts(page) {
    const TIMEOUT_MS = 120_000;
    const deadline = Date.now() + TIMEOUT_MS;

    const gridFound = await page.waitForSelector('ol.s-product-grid', { state: 'attached', timeout: 30000 })
      .then(() => true)
      .catch(() => false);
    if (!gridFound) {
      this.log('  no ol.s-product-grid');
      return;
    }

    while (true) {
      if (Date.now() > deadline) throw new Error(`load-more timed out after ${TIMEOUT_MS / 1000}s`);

      // Scroll in steps until the load-more button enters the viewport
      await this.#scrollToLoadMore(page);

      // Read the X/Y counter
      const counterText = await page.evaluate(
        () => document.querySelector('div.s-load-more')?.innerText?.trim() ?? '',
      );
      const match = counterText.match(/(\d+)\s*\/\s*(\d+)/);

      if (!match) break; // no pagination on this page

      const shown = parseInt(match[1], 10);
      const total = parseInt(match[2], 10);
      this.log(`  ${shown}/${total}`);

      if (shown >= total) break; // numbers match — all products loaded

      if (await page.locator('.s-load-more__button').count() === 0) break;

      // Wait briefly for the button to be fully interactive, then click via JS
      // (bypasses OneTrust overlay that intercepts pointer events)
      await page.waitForTimeout(2000);
      await page.evaluate(() => document.querySelector('.s-load-more__button')?.click());

      // Wait for counter to leave its "..." loading state before next iteration
      await page.waitForFunction(
        () => !/^\s*\.\.\.\s*$/.test(document.querySelector('div.s-load-more')?.innerText ?? '...'),
        { timeout: 15000 },
      );
    }
  }

  async #extractProducts(page) {
    return page.evaluate(({ baseUrl, pattern }) => {
      const re = new RegExp(pattern);

      return [...document.querySelectorAll('div.product-grid-box')]
        .map(box => {
          // All key data lives in data-gridbox-impression (URL-encoded JSON)
          let imp = null;
          try { imp = JSON.parse(decodeURIComponent(box.dataset.gridboxImpression ?? '')); } catch { }

          const external_id =
            imp?.id ??
            box.getAttribute('data-qa-label')?.match(/(\d+)$/)?.[1] ??
            null;
          if (!external_id) return null;

          const name = box.getAttribute('fulltitle') ?? imp?.name ?? null;
          if (!name) return null;

          const price = imp?.price ?? null;
          if (!price || price <= 0) return null;

          // Category: strip "Mundos de necessidade/" prefix from wonCategoryPrimary
          const rawCat = imp?.wonCategoryPrimary ?? null;
          const category = rawCat ? rawCat.replace(/^Mundos de necessidade\//i, '') : null;

          // Unit price: parse "1 kg = 13.00" from tile text content
          const contentEl = box.querySelector('.odsc-tile__content');
          const unitMatch = (contentEl?.innerText ?? '').match(re);

          // Product URL
          const linkEl = box.querySelector('a.odsc-tile__link');
          const rawHref = linkEl?.getAttribute('href') ?? '';
          const product_url = rawHref ? new URL(rawHref, baseUrl).href : null;

          // Image
          const imgEl = box.querySelector('img');
          const image_url = imgEl?.src || imgEl?.dataset?.src || null;

          return {
            external_id: String(external_id),
            name,
            brand: imp?.brand ?? null,
            price,
            unit_price: unitMatch ? parseFloat(unitMatch[2].replace(',', '.')) : null,
            unit: unitMatch ? unitMatch[1].trim() : null,
            category,
            image_url,
            product_url,
          };
        })
        .filter(p => p && p.external_id && p.price > 0);
    }, { baseUrl: BASE_URL, pattern: BASE_PRICE_RE.source });
  }

  async #scrollToLoadMore(page) {
    // Scroll in 600px steps until the s-load-more element enters the viewport.
    // This is enough to trigger lazy-rendered product cards along the way.
    for (let y = 600; y <= 8000; y += 600) {
      await page.evaluate(pos => window.scrollTo(0, pos), y);
      await page.waitForTimeout(300);
      const inView = await page.evaluate(() => {
        const el = document.querySelector('div.s-load-more');
        if (!el) return true; // no load-more means we can stop
        return el.getBoundingClientRect().top <= window.innerHeight + 300;
      });
      if (inView) break;
    }
    await page.waitForTimeout(200);
  }

  async #dismissCookieBanner(page) {
    const btn = page.locator('#onetrust-accept-btn-handler');
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await page.waitForLoadState('networkidle').catch(() => { });
    }
    // Remove OneTrust SDK entirely — its dark overlay can re-appear and block clicks
    await page.evaluate(() => {
      document.getElementById('onetrust-consent-sdk')?.remove();
      document.querySelector('.onetrust-pc-dark-filter')?.remove();
    });
  }
}
