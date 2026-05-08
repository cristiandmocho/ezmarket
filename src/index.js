import { chromium } from 'playwright';
import chalk from 'chalk';
import { scrapers } from './scrapers/registry.js';
import pool from './db/connection.js';
import { upsertOffer } from './models/offer.js';
import { findOrCreateCategoryPath } from './models/category.js';

// ── Brand palette ─────────────────────────────────────────────────────────────
const BRAND_COLOR = {
  'continente':   s => chalk.bold.hex('#E30613')(s),
  'pingo-doce':   s => chalk.bold.hex('#FFCC00')(s),
  'auchan':       s => chalk.bold.hex('#E8000B')(s),
  'lidl':         s => chalk.bold.hex('#0050AA')(s),
};

const BRAND_EMOJI = {
  'continente':   '🔴',
  'pingo-doce':   '🟡',
  'auchan':       '🟠',
  'lidl':         '🔵',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function colorName(scraper) {
  return (BRAND_COLOR[scraper.getSlug()] ?? chalk.bold)(scraper.getName());
}

function scraperEmoji(scraper) {
  return BRAND_EMOJI[scraper.getSlug()] ?? '⬜';
}

function dur(ms) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function num(n) {
  return n.toLocaleString('pt-PT');
}

function shortPath(url) {
  try {
    return new URL(url).pathname.replace(/\/$/, '').split('/').slice(-2).join('/');
  } catch {
    return url;
  }
}

const DIVIDER = chalk.gray('─'.repeat(56));

// ── Args & validation ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const debugMode = args.includes('--debug');
const targetArg = args.find(a => !a.startsWith('-'))?.toLowerCase();
const validSlugs = scrapers.map(s => s.getSlug());

if (targetArg && targetArg !== 'all' && !validSlugs.includes(targetArg)) {
  console.error(chalk.red(`\n  ✗  Mercado desconhecido "${targetArg}"`));
  console.error(chalk.gray(`     Opções válidas: all, ${validSlugs.join(', ')}\n`));
  process.exit(1);
}

const queue = targetArg && targetArg !== 'all'
  ? scrapers.filter(s => s.getSlug() === targetArg)
  : scrapers;

for (const s of queue) s.debug = debugMode;

// ── Banner ────────────────────────────────────────────────────────────────────
console.log('');
console.log(DIVIDER);
console.log(
  chalk.bgGreen.black.bold('  🛒  ezMarkets Scraper  ') +
  chalk.gray(`  ${queue.map(s => s.getName()).join(' · ')}`)
);
console.log(DIVIDER);

// ── Main scrape loop ──────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: !debugMode });
const startAll = Date.now();
const summary = [];

for (const scraper of queue) {
  const startScraper = Date.now();
  let totalProducts = 0;
  let totalErrors = 0;

  console.log('');
  console.log(`${scraperEmoji(scraper)}  ${colorName(scraper)}`);
  console.log('');

  // DB lookup
  const [rows] = await pool.execute(
    'SELECT id FROM supermarkets WHERE slug = ?',
    [scraper.getSlug()],
  );
  const supermarketId = rows[0]?.id;
  if (!supermarketId) {
    console.log(chalk.red(`   ✗  "${scraper.getSlug()}" não encontrado na base de dados — a ignorar.`));
    continue;
  }

  const page = await browser.newPage();

  // Category discovery
  process.stdout.write(chalk.gray('   ▸ A descobrir categorias'));
  const discoveryStart = Date.now();
  const categoryUrls = await scraper.getCategoryUrls(page);
  process.stdout.write(
    `  ${chalk.cyan.bold(categoryUrls.length)} encontradas` +
    chalk.gray(`  (${dur(Date.now() - discoveryStart)})\n\n`)
  );

  const total = categoryUrls.length;
  const idxWidth = String(total).length;

  for (let i = 0; i < categoryUrls.length; i++) {
    const url = categoryUrls[i];
    const label = shortPath(url).padEnd(38);
    const counter = chalk.gray(`[${String(i + 1).padStart(idxWidth)}/${total}]`);

    process.stdout.write(`   ${counter}  ${chalk.white(label)}`);
    const t0 = Date.now();

    try {
      const products = await scraper.scrapeCategory(page, url);
      const elapsed = dur(Date.now() - t0);
      totalProducts += products.length;

      const countStr = products.length > 0
        ? chalk.green(`${num(products.length).padStart(5)} produtos`)
        : chalk.gray('  sem produtos');
      process.stdout.write(`  ${countStr}  ${chalk.gray(elapsed)}\n`);

      for (const product of products) {
        const categoryId = product.category
          ? await findOrCreateCategoryPath(supermarketId, product.category)
          : null;

        await upsertOffer({
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
      const elapsed = dur(Date.now() - t0);
      process.stdout.write(`  ${chalk.red('  ERRO        ')}  ${chalk.gray(elapsed)}\n`);
      console.log(chalk.red(`          ${err.message}`));
      totalErrors++;
    }
  }

  await page.close();
  const scraperTime = Date.now() - startScraper;

  console.log('');
  const statusIcon = totalErrors === 0 ? '✅' : '⚠️ ';
  const statusText = totalErrors === 0
    ? chalk.green('Concluído')
    : chalk.yellow(`Concluído com ${totalErrors} erro${totalErrors !== 1 ? 's' : ''}`);
  const productsText = chalk.bold(`${num(totalProducts)} produtos`);
  const timeText = chalk.gray(dur(scraperTime));

  console.log(`   ${statusIcon}  ${statusText}  ·  ${productsText}  ·  ${timeText}`);
  summary.push({ name: scraper.getName(), slug: scraper.getSlug(), products: totalProducts, errors: totalErrors, ms: scraperTime });
}

await browser.close();
await pool.end();

// ── Summary table ─────────────────────────────────────────────────────────────
const grandTotal = summary.reduce((a, b) => a + b.products, 0);
const grandErrors = summary.reduce((a, b) => a + b.errors, 0);
const totalTime = Date.now() - startAll;

console.log('');
console.log(DIVIDER);
console.log(chalk.bold('  📊  Resumo da sessão'));
console.log(DIVIDER);

for (const s of summary) {
  const colorFn = BRAND_COLOR[s.slug] ?? chalk.bold;
  const errBit = s.errors > 0 ? chalk.red(`  ⚠  ${s.errors} erros`) : '';
  const namePadded = colorFn(s.name.padEnd(16));
  const countPadded = num(s.products).padStart(7);
  console.log(`  ${namePadded}  ${chalk.bold(countPadded)} produtos  ${chalk.gray(dur(s.ms))}${errBit}`);
}

console.log(chalk.gray('  ' + '─'.repeat(46)));
const grandOk = grandErrors === 0 ? chalk.green.bold('✅') : chalk.yellow.bold('⚠️ ');
console.log(
  `  ${'Total'.padEnd(18)}  ${chalk.bold.green(num(grandTotal).padStart(7))} produtos  ${chalk.gray(dur(totalTime))}  ${grandOk}`
);
console.log(DIVIDER);
console.log('');
