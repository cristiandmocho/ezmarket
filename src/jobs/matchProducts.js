import { fileURLToPath } from 'url';
import pool from '../db/connection.js';
import {
  normaliseText,
  normaliseProductName,
  extractPackSize,
  trigramSimilarity,
} from './normalise.js';

const SIMILARITY_THRESHOLD = 0.85;

// --- Union-Find (path-compressed, smaller-ID wins as canonical) ---

class UnionFind {
  #parent = new Map();

  find(x) {
    if (!this.#parent.has(x)) return x;
    const root = this.find(this.#parent.get(x));
    this.#parent.set(x, root);
    return root;
  }

  union(x, y) {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx === ry) return;
    // Lower product_id becomes the canonical one
    if (rx < ry) this.#parent.set(ry, rx);
    else         this.#parent.set(rx, ry);
  }

  /**
   * Returns a Map<canonical_id, Set<duplicate_ids>> for every component
   * that has more than one member.
   */
  components() {
    const groups = new Map();
    for (const id of this.#parent.keys()) {
      const root = this.find(id);
      if (root === id) continue; // id IS the canonical — only track duplicates
      if (!groups.has(root)) groups.set(root, new Set());
      groups.get(root).add(id);
    }
    return groups;
  }
}

// --- Main matching function ---

export async function runMatching() {
  // Load all branded, available offers
  const [offers] = await pool.query(`
    SELECT po.id          AS offer_id,
           po.product_id,
           po.supermarket_id,
           po.listing_name,
           po.brand,
           po.unit,
           po.unit_price
    FROM   product_offers po
    WHERE  po.is_available = 1
      AND  po.brand IS NOT NULL
      AND  po.brand != ''
    ORDER  BY po.product_id
  `);

  // Annotate each offer with pre-computed normalised fields
  const annotated = offers.map(o => ({
    ...o,
    brandKey: normaliseText(o.brand),
    normName: normaliseProductName(o.listing_name, o.brand),
    packSize: extractPackSize(o.listing_name, o.unit, o.unit_price),
  }));

  // Group by normalised brand
  const byBrand = new Map();
  for (const o of annotated) {
    if (!byBrand.has(o.brandKey)) byBrand.set(o.brandKey, []);
    byBrand.get(o.brandKey).push(o);
  }

  const uf = new UnionFind();
  let comparisons = 0;
  let matches = 0;

  for (const group of byBrand.values()) {
    // Skip brand groups that only appear in one supermarket
    const markets = new Set(group.map(o => o.supermarket_id));
    if (markets.size < 2) continue;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];

        if (a.supermarket_id === b.supermarket_id) continue;
        if (uf.find(a.product_id) === uf.find(b.product_id)) continue;

        comparisons++;

        // Pack sizes must match when both are known
        if (a.packSize && b.packSize && a.packSize !== b.packSize) continue;

        const sim = trigramSimilarity(a.normName, b.normName);
        if (sim >= SIMILARITY_THRESHOLD) {
          uf.union(a.product_id, b.product_id);
          matches++;
        }
      }
    }
  }

  // Apply merges in the database
  const mergeGroups = uf.components();
  let merged = 0;

  for (const [canonical, duplicates] of mergeGroups) {
    const dupIds = [...duplicates];

    // Re-point all offers and list items to the canonical product
    await pool.query(
      'UPDATE product_offers SET product_id = ? WHERE product_id IN (?)',
      [canonical, dupIds],
    );
    await pool.query(
      'UPDATE shopping_list_items SET product_id = ? WHERE product_id IN (?)',
      [canonical, dupIds],
    );

    // Update the canonical product's normalised_name and pack_size
    const [rep] = await pool.query(
      `SELECT po.listing_name, po.brand, po.unit, po.unit_price
       FROM   product_offers po
       WHERE  po.product_id = ?
       LIMIT  1`,
      [canonical],
    );
    if (rep.length > 0) {
      const { listing_name, brand, unit, unit_price } = rep[0];
      await pool.query(
        'UPDATE products SET normalised_name = ?, pack_size = ? WHERE id = ?',
        [
          normaliseProductName(listing_name, brand) || null,
          extractPackSize(listing_name, unit, unit_price) || null,
          canonical,
        ],
      );
    }

    // Delete the now-orphaned duplicate product rows
    await pool.query('DELETE FROM products WHERE id IN (?)', [dupIds]);

    merged += dupIds.length;
  }

  return { comparisons, matches, merged };
}

// --- Run as CLI script ---

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('Running product matching job…');
  const t0 = Date.now();

  runMatching()
    .then(({ comparisons, matches, merged }) => {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`Finished in ${elapsed}s`);
      console.log(`  Offer pairs compared : ${comparisons}`);
      console.log(`  Matches found        : ${matches}`);
      console.log(`  Duplicate products   : ${merged}`);
      process.exit(0);
    })
    .catch(err => {
      console.error('Matching job failed:', err.message);
      process.exit(1);
    });
}
