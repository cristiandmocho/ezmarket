import { ContinenteScraper } from './continente/ContinenteScraper.js';
import { PingoDuceScraper } from './pingo-doce/PingoDuceScraper.js';
import { AuchanScraper } from './auchan/AuchanScraper.js';
import { LidlScraper } from './lidl/LidlScraper.js';

export const scrapers = [
  new ContinenteScraper(),
  new PingoDuceScraper(),
  new AuchanScraper(),
  new LidlScraper(),
];
