import pool from '../db/connection.js';

/**
 * Insert or update a product. Keyed on (supermarket_id, external_id).
 * @param {object} product
 */
export async function upsertProduct(product) {
  await pool.execute(
    `INSERT INTO products
       (supermarket_id, category_id, external_id, name, brand, barcode,
        price, unit_price, unit, image_url, product_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name        = VALUES(name),
       brand       = VALUES(brand),
       category_id = VALUES(category_id),
       price       = VALUES(price),
       unit_price  = VALUES(unit_price),
       unit        = VALUES(unit),
       image_url   = VALUES(image_url),
       product_url = VALUES(product_url),
       scraped_at  = CURRENT_TIMESTAMP`,
    [
      product.supermarket_id,
      product.category_id,
      product.external_id,
      product.name,
      product.brand,
      product.barcode ?? null,
      product.price,
      product.unit_price,
      product.unit,
      product.image_url,
      product.product_url,
    ],
  );
}
