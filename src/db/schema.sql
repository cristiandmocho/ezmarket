DROP DATABASE IF EXISTS ezmarkets;

CREATE DATABASE ezmarkets
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ezmarkets;

CREATE TABLE supermarkets (
  id         TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  base_url   VARCHAR(255) NOT NULL,
  slug       VARCHAR(50)  NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_slug (slug)
);

CREATE TABLE categories (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supermarket_id TINYINT UNSIGNED NOT NULL,
  name           VARCHAR(150) NOT NULL,
  slug           VARCHAR(150) NULL,
  full_path      VARCHAR(500) NULL,
  depth          TINYINT UNSIGNED DEFAULT 0,
  parent_id      INT UNSIGNED NULL,
  FOREIGN KEY (supermarket_id) REFERENCES supermarkets(id),
  FOREIGN KEY (parent_id)      REFERENCES categories(id)
);

-- Canonical real-world products (1:1 with offers for now; a future matching job can merge rows)
CREATE TABLE products (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  brand      VARCHAR(100) NULL,
  barcode    VARCHAR(50)  NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_barcode (barcode)
);

-- Supermarket-specific listings keyed on (supermarket_id, external_id)
CREATE TABLE product_offers (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supermarket_id TINYINT UNSIGNED NOT NULL,
  product_id     BIGINT UNSIGNED  NOT NULL,
  category_id    INT UNSIGNED     NULL,
  external_id    VARCHAR(255)     NOT NULL,
  listing_name   VARCHAR(255)     NOT NULL,
  brand          VARCHAR(100)     NULL,
  price          DECIMAL(10,2)    NOT NULL,
  unit_price     DECIMAL(10,4)    NULL,
  unit           VARCHAR(30)      NULL,
  price_per_base DECIMAL(12,6)    NULL,
  base_unit      ENUM('g','ml')   NULL,
  image_url      VARCHAR(1000)    NULL,
  product_url    VARCHAR(1000)    NULL,
  is_available   BOOLEAN          DEFAULT TRUE,
  scraped_at     TIMESTAMP        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_offer (supermarket_id, external_id),
  KEY idx_product (product_id),
  KEY idx_price   (price),
  FOREIGN KEY (supermarket_id) REFERENCES supermarkets(id),
  FOREIGN KEY (product_id)     REFERENCES products(id),
  FOREIGN KEY (category_id)    REFERENCES categories(id)
);

CREATE TABLE product_price_history (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_offer_id BIGINT UNSIGNED NOT NULL,
  price            DECIMAL(10,2)  NOT NULL,
  unit_price       DECIMAL(10,4)  NULL,
  price_per_base   DECIMAL(12,6)  NULL,
  captured_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_offer_date (product_offer_id, captured_at),
  FOREIGN KEY (product_offer_id) REFERENCES product_offers(id)
);

INSERT INTO supermarkets (name, base_url, slug) VALUES
  ('Continente', 'https://www.continente.pt', 'continente'),
  ('Pingo Doce',  'https://www.pingodoce.pt',  'pingo-doce'),
  ('Auchan',      'https://www.auchan.pt',      'auchan'),
  ('Lidl',        'https://www.lidl.pt',        'lidl');
