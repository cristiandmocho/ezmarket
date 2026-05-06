import pool from '../db/connection.js';

// In-process cache: "supermarketId|parentId|name" → { id, full_path }
const cache = new Map();

function toSlug(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Resolves a slash-separated category path to the leaf category's DB id,
 * creating any missing nodes along the way.
 * @param {number} supermarketId
 * @param {string} categoryPath  e.g. "Mercearia/Conservas/Atum"
 * @returns {Promise<number>}
 */
export async function findOrCreateCategoryPath(supermarketId, categoryPath) {
  const parts = categoryPath.split('/').map(p => p.trim()).filter(Boolean);

  let parentId   = null;
  let parentPath = null;

  for (let depth = 0; depth < parts.length; depth++) {
    const name     = parts[depth];
    const slug     = toSlug(name);
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    const key      = `${supermarketId}|${parentId}|${name}`;

    if (cache.has(key)) {
      const cached = cache.get(key);
      parentId   = cached.id;
      parentPath = cached.full_path;
      continue;
    }

    // <=> is MySQL's null-safe equals operator
    const [rows] = await pool.execute(
      'SELECT id FROM categories WHERE supermarket_id = ? AND name = ? AND parent_id <=> ?',
      [supermarketId, name, parentId],
    );

    if (rows.length > 0) {
      parentId = rows[0].id;
      // Backfill slug/full_path/depth if not yet set
      await pool.execute(
        'UPDATE categories SET slug = ?, full_path = ?, depth = ? WHERE id = ? AND slug IS NULL',
        [slug, fullPath, depth, parentId],
      );
    } else {
      const [result] = await pool.execute(
        'INSERT INTO categories (supermarket_id, name, slug, full_path, depth, parent_id) VALUES (?, ?, ?, ?, ?, ?)',
        [supermarketId, name, slug, fullPath, depth, parentId],
      );
      parentId = result.insertId;
    }

    cache.set(key, { id: parentId, full_path: fullPath });
    parentPath = fullPath;
  }

  return parentId;
}
