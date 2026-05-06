import pool from '../db/connection.js';

// In-process cache: "supermarketId|parentId|name" → category id
const cache = new Map();

/**
 * Resolves a slash-separated category path to the leaf category's DB id,
 * creating any missing nodes along the way.
 * @param {number} supermarketId
 * @param {string} categoryPath  e.g. "Mercearia/Conservas/Atum"
 * @returns {Promise<number>}
 */
export async function findOrCreateCategoryPath(supermarketId, categoryPath) {
  const parts = categoryPath.split('/').map(p => p.trim()).filter(Boolean);

  let parentId = null;
  for (const name of parts) {
    const key = `${supermarketId}|${parentId}|${name}`;
    if (cache.has(key)) {
      parentId = cache.get(key);
      continue;
    }

    // <=> is MySQL's null-safe equals operator
    const [rows] = await pool.execute(
      'SELECT id FROM categories WHERE supermarket_id = ? AND name = ? AND parent_id <=> ?',
      [supermarketId, name, parentId],
    );

    if (rows.length > 0) {
      parentId = rows[0].id;
    } else {
      const [result] = await pool.execute(
        'INSERT INTO categories (supermarket_id, name, parent_id) VALUES (?, ?, ?)',
        [supermarketId, name, parentId],
      );
      parentId = result.insertId;
    }

    cache.set(key, parentId);
  }

  return parentId;
}
