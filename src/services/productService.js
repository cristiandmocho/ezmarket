import { LRUCache } from 'lru-cache';
import pool from '../db/connection.js';

const cache = new LRUCache({ max: 500, ttl: 1000 * 60 * 5 });

function cacheKey(...parts) {
  return parts.join(':');
}

function castOffer(row) {
  return {
    ...row,
    price: Number(row.price),
    unit_price: row.unit_price != null ? Number(row.unit_price) : null,
    price_per_base: row.price_per_base != null ? Number(row.price_per_base) : null,
  };
}

export function buildSearchLike(q) {
  const normalized = q.split(' ').map(w => w.trim()).filter(Boolean).join('%');
  return { startLike: `${normalized}%`, containsLike: `%${normalized}%` };
}

export async function searchProducts({ q, supermarket = '', limit = 24, offset = 0 }) {
  const key = cacheKey('search', q, supermarket, limit, offset);

  if (cache.has(key))
    return cache.get(key);

  const { startLike, containsLike } = buildSearchLike(q);
  const supermarketClause = supermarket ? ' AND s.slug = ?' : '';

  const subParams = (like) => [like, like, like, ...(supermarket ? [supermarket] : []), limit + offset];

  const sub = `
    SELECT po.id, po.listing_name, po.brand, po.price, po.unit_price, po.unit,
           po.price_per_base, po.base_unit, po.image_url, po.product_url,
           s.name AS supermarket_name, s.slug AS supermarket_slug
    FROM product_offers po
    JOIN supermarkets s ON s.id = po.supermarket_id
    JOIN products p ON p.id = po.product_id
    WHERE (po.listing_name LIKE ? OR po.brand LIKE ? OR p.normalised_name LIKE ?)
      ${supermarketClause} AND po.is_available = 1
    ORDER BY po.listing_name
    LIMIT ?`;

  const [rows] = await pool.query(
    `(${sub}) UNION (${sub}) LIMIT ? OFFSET ?`,
    [...subParams(startLike), ...subParams(containsLike), limit, offset]
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

  const offer = rows[0] ? castOffer(rows[0]) : null;
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

  const offer = rows[0] ? castOffer(rows[0]) : null;
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

export async function getDefaultList(userId) {
  const key = cacheKey('default-list', userId);
  if (cache.has(key)) return cache.get(key);

  const [rows] = await pool.query(`
    SELECT sl.id, sl.name,
           COUNT(sli.id) AS itemCount
    FROM shopping_lists sl
    LEFT JOIN shopping_list_items sli ON sli.list_id = sl.id
    WHERE sl.user_id = ?
    GROUP BY sl.id, sl.name
    ORDER BY sl.updated_at DESC
    LIMIT 1
  `, [userId]);

  const result = rows[0] ?? null;
  if (result) cache.set(key, result);
  return result;
}

export async function getUserLists(userId) {
  const key = cacheKey('user-lists', userId);
  if (cache.has(key)) return cache.get(key);

  const [rows] = await pool.query(`
    SELECT sl.id, sl.name, sl.updated_at,
           COUNT(sli.id) AS item_count
    FROM shopping_lists sl
    LEFT JOIN shopping_list_items sli ON sli.list_id = sl.id
    WHERE sl.user_id = ?
    GROUP BY sl.id, sl.name, sl.updated_at
    ORDER BY sl.updated_at DESC
  `, [userId]);

  if (rows.length) cache.set(key, rows);
  return rows;
}

export async function getListBasket(listId) {
  const key = cacheKey('basket', listId);
  if (cache.has(key)) return cache.get(key);

  const [rows] = await pool.query(`
    SELECT s.id AS supermarket_id, s.name, s.slug,
           SUM(cheapest.price * sli.quantity) AS total,
           COUNT(DISTINCT sli.product_id) AS items_found
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
    return { name: r.name, slug: r.slug, initials: initials(r.name), price, diff, trend, itemsFound: Number(r.items_found) };
  });

  cache.set(key, stores);
  return stores;
}

export async function getListById(listId, userId) {
  const key = cacheKey('list', listId, userId);
  if (cache.has(key)) return cache.get(key);

  const [rows] = await pool.query(`
    SELECT sl.id, sl.name, COUNT(sli.id) AS item_count
    FROM shopping_lists sl
    LEFT JOIN shopping_list_items sli ON sli.list_id = sl.id
    WHERE sl.id = ? AND sl.user_id = ?
    GROUP BY sl.id, sl.name
  `, [listId, userId]);

  const result = rows[0] ?? null;
  if (result) cache.set(key, result);
  return result;
}

export async function getListItems(listId) {
  const key = cacheKey('list-items', listId);
  if (cache.has(key)) return cache.get(key);

  const [rows] = await pool.query(`
    SELECT
      sli.id AS item_id,
      sli.quantity,
      sli.product_id,
      best.listing_name,
      best.brand,
      best.price,
      best.unit,
      best.image_url,
      best.store_name,
      best.store_slug,
      stats.avg_price
    FROM shopping_list_items sli
    LEFT JOIN (
      SELECT po.product_id, po.listing_name, po.brand, po.price, po.unit, po.image_url,
             s.name AS store_name, s.slug AS store_slug,
             ROW_NUMBER() OVER (PARTITION BY po.product_id ORDER BY po.price ASC) AS rn
      FROM product_offers po
      JOIN supermarkets s ON s.id = po.supermarket_id
      WHERE po.is_available = 1
    ) best ON best.product_id = sli.product_id AND best.rn = 1
    LEFT JOIN (
      SELECT product_id, AVG(price) AS avg_price
      FROM product_offers
      WHERE is_available = 1
      GROUP BY product_id
    ) stats ON stats.product_id = sli.product_id
    WHERE sli.list_id = ?
    ORDER BY sli.id
  `, [listId]);

  if (rows.length) cache.set(key, rows);
  return rows;
}

export async function updateListItem(itemId, listId, userId, quantity) {
  if (quantity <= 0) {
    await pool.query(
      'DELETE FROM shopping_list_items WHERE id = ? AND list_id = ?',
      [itemId, listId]
    );
  } else {
    await pool.query(
      'UPDATE shopping_list_items SET quantity = ? WHERE id = ? AND list_id = ?',
      [quantity, itemId, listId]
    );
  }
  await pool.query('UPDATE shopping_lists SET updated_at = NOW() WHERE id = ?', [listId]);
  cache.delete(cacheKey('list-items', listId));
  cache.delete(cacheKey('basket', listId));
  cache.delete(cacheKey('list', listId, userId));
  cache.delete(cacheKey('user-lists', userId));
  cache.delete(cacheKey('default-list', userId));
}

export async function getAutocomplete(q, limit = 6) {
  const key = cacheKey('autocomplete', q, limit);
  if (cache.has(key)) return cache.get(key);

  const like = `%${q}%`;
  const [rows] = await pool.query(
    `SELECT po.listing_name, po.brand, MIN(po.image_url) AS image_url, MIN(po.price) AS min_price
     FROM product_offers po
     WHERE (po.listing_name LIKE ? OR po.brand LIKE ?) AND po.is_available = 1
     GROUP BY po.listing_name, po.brand
     ORDER BY po.listing_name
     LIMIT ?`,
    [like, like, limit]
  );

  if (rows.length) cache.set(key, rows);
  return rows;
}

export async function updateList(listId, userId, name) {
  await pool.query(
    `UPDATE shopping_lists SET name = ?, updated_at = NOW() WHERE id = ? AND user_id = ?`,
    [name, listId, userId]
  );
  cache.delete(cacheKey('list', listId, userId));
  cache.delete(cacheKey('user-lists', userId));
  cache.delete(cacheKey('default-list', userId));
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
