import { LRUCache } from 'lru-cache';
import pool from '../db/connection.js';

const cache = new LRUCache({ max: 500, ttl: 1000 * 60 * 5 });

function cacheKey(...parts) {
  return parts.join(':');
}

export async function searchProducts({ q, supermarket = '', limit = 24, offset = 0 }) {
  const key = cacheKey('search', q, supermarket, limit, offset);
  if (cache.has(key)) return cache.get(key);

  const like = `%${q}%`;
  const params = [like, like, limit, offset];
  let where = '(po.listing_name LIKE ? OR po.brand LIKE ?)';
  if (supermarket) {
    where += ' AND s.slug = ?';
    params.splice(2, 0, supermarket);
  }

  const [rows] = await pool.query(
    `SELECT po.id, po.listing_name, po.brand, po.price, po.unit_price, po.unit,
            po.price_per_base, po.base_unit, po.image_url, po.product_url,
            s.name AS supermarket_name, s.slug AS supermarket_slug
     FROM product_offers po
     JOIN supermarkets s ON s.id = po.supermarket_id
     WHERE ${where} AND po.is_available = 1
     ORDER BY po.listing_name
     LIMIT ? OFFSET ?`,
    params
  );

  cache.set(key, rows);
  return rows;
}

export async function getDeals(limit = 12) {
  const key = cacheKey('deals', limit);
  if (cache.has(key)) return cache.get(key);

  const [rows] = await pool.query(
    `SELECT po.id, po.listing_name, po.brand, po.price, po.unit_price, po.unit,
            po.price_per_base, po.base_unit, po.image_url, po.product_url,
            s.name AS supermarket_name, s.slug AS supermarket_slug
     FROM product_offers po
     JOIN supermarkets s ON s.id = po.supermarket_id
     WHERE po.is_available = 1
     ORDER BY po.scraped_at DESC
     LIMIT ?`,
    [limit]
  );

  cache.set(key, rows);
  return rows;
}

export async function getOfferBySlug(slug) {
  const key = cacheKey('offer-slug', slug);
  if (cache.has(key)) return cache.get(key);

  const [rows] = await pool.query(
    `SELECT po.*, s.name AS supermarket_name, s.slug AS supermarket_slug
     FROM product_offers po
     JOIN supermarkets s ON s.id = po.supermarket_id
     WHERE po.product_url LIKE ?
     LIMIT 1`,
    [`%${slug}%`]
  );

  const offer = rows[0] ?? null;
  if (offer) cache.set(key, offer);
  return offer;
}

export async function getOfferById(id) {
  const key = cacheKey('offer', id);
  if (cache.has(key)) return cache.get(key);

  const [rows] = await pool.query(
    `SELECT po.*, s.name AS supermarket_name, s.slug AS supermarket_slug
     FROM product_offers po
     JOIN supermarkets s ON s.id = po.supermarket_id
     WHERE po.id = ?`,
    [id]
  );

  const offer = rows[0] ?? null;
  if (offer) cache.set(key, offer);
  return offer;
}

export async function getSupermarkets() {
  const key = 'supermarkets';
  if (cache.has(key)) return cache.get(key);
  const [rows] = await pool.query('SELECT id, name, slug FROM supermarkets ORDER BY name');
  cache.set(key, rows);
  return rows;
}

function formatCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return n.toLocaleString('pt-PT');
}

export async function getPriceCount() {
  const key = 'price-count';
  if (cache.has(key)) return cache.get(key);
  const [[row]] = await pool.query('SELECT COUNT(*) AS total FROM product_offers WHERE is_available = 1');
  const formatted = formatCount(row.total);
  cache.set(key, formatted);
  return formatted;
}

function initials(name) {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export async function getDefaultList() {
  const key = 'default-list';
  if (cache.has(key)) return cache.get(key);

  const [rows] = await pool.query(`
    SELECT sl.id, sl.name,
           COUNT(sli.id) AS itemCount
    FROM shopping_lists sl
    LEFT JOIN shopping_list_items sli ON sli.list_id = sl.id
    GROUP BY sl.id, sl.name
    ORDER BY sl.updated_at DESC
    LIMIT 1
  `);

  const result = rows[0] ?? null;
  if (result) cache.set(key, result);
  return result;
}

export async function getListBasket(listId) {
  const key = cacheKey('basket', listId);
  if (cache.has(key)) return cache.get(key);

  const [rows] = await pool.query(`
    SELECT s.id AS supermarket_id, s.name, s.slug,
           SUM(cheapest.price * sli.quantity) AS total
    FROM shopping_list_items sli
    JOIN (
      SELECT po.product_id, po.supermarket_id, MIN(po.price) AS price
      FROM product_offers po
      WHERE po.is_available = 1
      GROUP BY po.product_id, po.supermarket_id
    ) cheapest ON cheapest.product_id = sli.product_id
    JOIN supermarkets s ON s.id = cheapest.supermarket_id
    WHERE sli.list_id = ?
    GROUP BY s.id, s.name, s.slug
    ORDER BY total ASC
  `, [listId]);

  if (!rows.length) return null;

  const totals = rows.map(r => Number(r.total));
  const avg = totals.reduce((a, b) => a + b, 0) / totals.length;

  const stores = rows.map(r => {
    const price = Number(r.total);
    const diff = price - avg;
    const trend = diff < -0.5 ? 'down' : diff > 0.5 ? 'up' : 'avg';
    return { name: r.name, slug: r.slug, initials: initials(r.name), price, diff, trend };
  });

  cache.set(key, stores);
  return stores;
}

export async function getPriceHistory(offerId, days = 90) {
  const key = cacheKey('history', offerId, days);
  if (cache.has(key)) return cache.get(key);

  const [rows] = await pool.query(
    `SELECT price, unit_price, price_per_base, captured_at
     FROM product_price_history
     WHERE product_offer_id = ?
       AND captured_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     ORDER BY captured_at ASC`,
    [offerId, days]
  );

  cache.set(key, rows);
  return rows;
}
