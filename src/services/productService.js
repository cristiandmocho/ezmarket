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
