import pool from '../db/connection.js';

const UNIT_MAP = {
  kg:  { base_unit: 'g',  factor: 1 / 1000  },
  '100g': { base_unit: 'g', factor: 1 / 100  },
  g:   { base_unit: 'g',  factor: 1         },
  l:   { base_unit: 'ml', factor: 1 / 1000  },
  lt:  { base_unit: 'ml', factor: 1 / 1000  },
  ltr: { base_unit: 'ml', factor: 1 / 1000  },
  cl:  { base_unit: 'ml', factor: 1 / 10    },
  ml:  { base_unit: 'ml', factor: 1         },
  mlt: { base_unit: 'ml', factor: 1         },
};

function normalizeUnitPrice(unitPrice, unit) {
  if (!unitPrice || !unit) return { price_per_base: null, base_unit: null };
  const entry = UNIT_MAP[unit.toLowerCase().trim()];
  if (!entry) return { price_per_base: null, base_unit: null };
  return { price_per_base: unitPrice * entry.factor, base_unit: entry.base_unit };
}

export async function upsertOffer(offer) {
  const {
    supermarket_id, category_id, external_id,
    name, brand, barcode,
    price, unit_price, unit,
    image_url, product_url,
  } = offer;

  const { price_per_base, base_unit } = normalizeUnitPrice(unit_price, unit);

  // Find existing offer to reuse its product_id
  const [existing] = await pool.execute(
    'SELECT id, product_id FROM product_offers WHERE supermarket_id = ? AND external_id = ?',
    [supermarket_id, external_id],
  );

  let productId;
  if (existing.length > 0) {
    productId = existing[0].product_id;
  } else {
    const [result] = await pool.execute(
      'INSERT INTO products (name, brand, barcode) VALUES (?, ?, ?)',
      [name, brand ?? null, barcode ?? null],
    );
    productId = result.insertId;
  }

  // Upsert offer; id = LAST_INSERT_ID(id) ensures LAST_INSERT_ID() works on UPDATE too
  const [offerResult] = await pool.execute(
    `INSERT INTO product_offers
       (supermarket_id, product_id, category_id, external_id, listing_name, brand,
        price, unit_price, unit, price_per_base, base_unit, image_url, product_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id             = LAST_INSERT_ID(id),
       product_id     = VALUES(product_id),
       category_id    = VALUES(category_id),
       listing_name   = VALUES(listing_name),
       brand          = VALUES(brand),
       price          = VALUES(price),
       unit_price     = VALUES(unit_price),
       unit           = VALUES(unit),
       price_per_base = VALUES(price_per_base),
       base_unit      = VALUES(base_unit),
       image_url      = VALUES(image_url),
       product_url    = VALUES(product_url),
       is_available   = TRUE,
       scraped_at     = CURRENT_TIMESTAMP`,
    [
      supermarket_id, productId, category_id ?? null, external_id,
      name, brand ?? null,
      price, unit_price ?? null, unit ?? null,
      price_per_base ?? null, base_unit ?? null,
      image_url ?? null, product_url ?? null,
    ],
  );

  const offerId = offerResult.insertId;

  // Log price history only when price changes (or first scrape)
  const [lastPrice] = await pool.execute(
    'SELECT price FROM product_price_history WHERE product_offer_id = ? ORDER BY captured_at DESC LIMIT 1',
    [offerId],
  );

  if (!lastPrice.length || parseFloat(lastPrice[0].price) !== price) {
    await pool.execute(
      'INSERT INTO product_price_history (product_offer_id, price, unit_price, price_per_base) VALUES (?, ?, ?, ?)',
      [offerId, price, unit_price ?? null, price_per_base ?? null],
    );
  }
}
