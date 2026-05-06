export class BaseScraper {
  getName()  { throw new Error(`${this.constructor.name} must implement getName()`); }
  getSlug()  { throw new Error(`${this.constructor.name} must implement getSlug()`); }

  /**
   * Return the list of category URLs to scrape.
   * May be async for scrapers that discover categories dynamically.
   * @param {import('playwright').Page} page
   * @returns {Promise<string[]>|string[]}
   */
  getCategoryUrls(page) {
    throw new Error(`${this.constructor.name} must implement getCategoryUrls()`);
  }

  /**
   * Scrape all products from a single category page.
   * @param {import('playwright').Page} page
   * @param {string} url
   * @returns {Promise<ScrapedProduct[]>}
   */
  async scrapeCategory(page, url) {
    throw new Error(`${this.constructor.name} must implement scrapeCategory()`);
  }
}

/**
 * @typedef {Object} ScrapedProduct
 * @property {string}      external_id
 * @property {string}      name
 * @property {string|null} brand
 * @property {number}      price
 * @property {number|null} unit_price
 * @property {string|null} unit
 * @property {string|null} category    - slash-separated path, e.g. "Mercearia/Conservas/Atum"
 * @property {string|null} image_url
 * @property {string|null} product_url
 */
