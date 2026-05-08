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
        .filter((v, i, arr) => arr.indexOf(v) === i);
    });

    // Leaf categories: URLs that are not a prefix of any other URL
    return allLinks.filter(href =>
      !allLinks.some(other => other !== href && other.startsWith(href + '/'))
    );
  }

  async scrapeCategory(page, url) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await this.#dismissCookieBanner(page);
    return this.#collectAllProducts(page);
  }

  async #collectAllProducts(page) {
    const all = new Map();

    const collect = async () => {
      const products = await this.#extractProducts(page);
      for (const p of products) all.set(p.external_id, p);
    };

    if (this.debug) {
      const snap = await page.evaluate(() => {
        const grid = document.querySelector('.row.product-grid');
        const productEls = document.querySelectorAll('.product[data-pid]');
        const moreContainer = document.querySelector('[data-page-size][data-page-number]');
        const moreBtn = document.querySelector('[data-page-size][data-page-number] button.more');
        const anyBtn = document.querySelector('button.more');
        return {
          gridFound: !!grid,
          gridChildCount: grid ? grid.children.length : 0,
          productDataPidCount: productEls.length,
          firstPid: productEls[0]?.dataset?.pid ?? null,
          firstHasGtm: !!productEls[0]?.querySelector('[data-gtm-info]'),
          moreContainerFound: !!moreContainer,
          moreContainerAttrs: moreContainer
            ? { pageSize: moreContainer.dataset.pageSize, pageNumber: moreContainer.dataset.pageNumber }
            : null,
          moreBtnFound: !!moreBtn,
          anyMoreBtnFound: !!anyBtn,
          anyMoreBtnClass: anyBtn?.className ?? null,
          anyMoreBtnDataUrl: anyBtn?.dataset?.url ? anyBtn.dataset.url.slice(0, 80) : null,
        };
      });
      this.log('\n  [PD DEBUG] Initial DOM snapshot:');
      this.log('  ', JSON.stringify(snap, null, 2).replace(/\n/g, '\n  '));
    }

    await collect();
    this.log(`  [PD DEBUG] initial collect: ${all.size} products`);

    const btnSelector = '[data-page-size][data-page-number] button.more';
    let round = 0;

    while (true) {
      round++;
      if (await page.locator(btnSelector).count() === 0) {
        this.log(`  [PD DEBUG] Round ${round}: no button — done`);
        break;
      }

      const domCountBefore = await page.locator('.product[data-pid]').count();
      this.log(`  [PD DEBUG] Round ${round}: DOM=${domCountBefore}, Map=${all.size} — scrolling…`);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2500);

      const domCountMid = await page.locator('.product[data-pid]').count();

      if (domCountMid <= domCountBefore) {
        this.log(`  [PD DEBUG] Round ${round}: auto-load silent, clicking button`);
        await page.evaluate((sel) => {
          const btn = document.querySelector(sel);
          btn?.scrollIntoView({ behavior: 'instant', block: 'center' });
          btn?.click();
        }, btnSelector);
        await page.waitForFunction(
          n => document.querySelectorAll('.product[data-pid]').length > n,
          domCountBefore,
          { timeout: 8000 },
        ).catch(() => {});
        await page.waitForTimeout(300);
      }

      const domCountAfter = await page.locator('.product[data-pid]').count();
      this.log(`  [PD DEBUG] Round ${round}: DOM ${domCountBefore} → ${domCountAfter}`);
      if (domCountAfter <= domCountBefore) break;

      await collect();
    }

    return [...all.values()];
  }

  async #dismissCookieBanner(page) {
    const btn = page.locator('#onetrust-accept-btn-handler');
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await page.waitForLoadState('networkidle');
    }
  }

  async #extractProducts(page) {
    return page.evaluate(({ baseUrl, pattern }) => {
      const re = new RegExp(pattern);

      return [...document.querySelectorAll('.row.product-grid > div')]
        .map(container => {
          // Skip the "Ver mais" container and any non-product nodes
          const productEl = container.querySelector('.product[data-pid]');
          if (!productEl) return null;

          const gtmEl = productEl.querySelector('[data-gtm-info]');
          if (!gtmEl) return null;

          let gtm;
          try { gtm = JSON.parse(gtmEl.dataset.gtmInfo); } catch { return null; }
          const item = gtm?.items?.[0];
          if (!item) return null;

          const priceText = container.querySelector('.product-price .sales')?.innerText?.trim() ?? '';
          const match = priceText.match(re);
          const unit = match?.[2]?.trim() ?? null;

          const imageEl = container.querySelector('img');
          const linkEl  = container.querySelector('a[href*="/produtos/"]');
          const productHref = linkEl?.getAttribute('href') ?? null;

          return {
            external_id: String(item.item_id ?? productEl.dataset.pid),
            name:        item.item_name,
            brand:       item.item_brand || null,
            price:       parseFloat(item.price),
            unit_price:  unit ? parseFloat(item.price) : null,
            unit,
            category:    item.item_category || null,
            image_url:   imageEl?.src ?? null,
            product_url: productHref ? `${baseUrl}${productHref}` : null,
          };
        })
        .filter(p => p && p.external_id && p.price > 0);
    }, { baseUrl: BASE_URL, pattern: PRICE_TEXT_RE.source });
  }
}
