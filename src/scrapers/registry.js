import { ContinenteScraper } from './continente/ContinenteScraper.js';
import { PingoDuceScraper } from './pingo-doce/PingoDuceScraper.js';

export const scrapers = [
  new ContinenteScraper(),
  new PingoDuceScraper(),
  // new AuchanScraper(), — coming soon
];
