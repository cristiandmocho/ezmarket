CREATE DATABASE IF NOT EXISTS ezmarkets
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ezmarkets;

CREATE TABLE IF NOT EXISTS supermarkets (
  id   TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  base_url VARCHAR(255) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supermarket_id TINYINT UNSIGNED NOT NULL,
  name           VARCHAR(150) NOT NULL,
  parent_id      INT UNSIGNED NULL,
  FOREIGN KEY (supermarket_id) REFERENCES supermarkets (id),
  FOREIGN KEY (parent_id)      REFERENCES categories   (id)
);

-- external_id is the scraper-assigned unique key per product per supermarket
-- (SKU when available, otherwise a stable slug derived from the product URL)
CREATE TABLE IF NOT EXISTS products (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supermarket_id TINYINT UNSIGNED NOT NULL,
  category_id    INT UNSIGNED NULL,
  external_id    VARCHAR(255) NOT NULL,
  name           VARCHAR(255) NOT NULL,
  brand          VARCHAR(100) NULL,
  barcode        VARCHAR(50)  NULL,
  price          DECIMAL(10,2) NOT NULL,
  unit_price     DECIMAL(10,2) NULL,
  unit           VARCHAR(30)   NULL,
  image_url      VARCHAR(1000) NULL,
  product_url    VARCHAR(1000) NULL,
  scraped_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_product (supermarket_id, external_id),
  FOREIGN KEY (supermarket_id) REFERENCES supermarkets (id),
  FOREIGN KEY (category_id)    REFERENCES categories   (id)
);

INSERT IGNORE INTO supermarkets (name, base_url, slug) VALUES
  ('Continente', 'https://www.continente.pt', 'continente'),
  ('Pingo Doce',  'https://www.pingodoce.pt',  'pingo-doce'),
  ('Auchan',      'https://www.auchan.pt',      'auchan');
