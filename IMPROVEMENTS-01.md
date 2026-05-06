The structure is already solid for an MVP, especially because you separated:

* supermarkets
* categories
* products

and kept foreign keys consistent.

There are, however, a few structural issues that will become painful very quickly once you start comparing products across supermarkets at scale.

The biggest problem is this:

> Your current `products` table represents a supermarket listing, not a canonical product.

That distinction matters a lot.

Right now:

* “Coca-Cola 1.5L” from Continente
* “Coca Cola Original 1,5L” from Pingo Doce
* “Coca-Cola PET 1.5 LT” from Auchan

would become 3 completely separate products.

That makes:

* price comparison
* historical tracking
* alerts
* product matching
* barcode-based searches
* AI similarity
* basket optimisation

much harder later.

You should separate:

1. Canonical products
2. Supermarket listings/offers

## Recommended architecture

## 1. Supermarkets

Your current table is good.

```sql
CREATE TABLE supermarkets (
  id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  base_url VARCHAR(255) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_slug (slug)
);
```

---

## 2. Categories

Current structure is fine.

Add:

```sql
slug VARCHAR(150)
```

This becomes useful for URLs and caching.

Also consider:

```sql
full_path VARCHAR(500)
```

Example:

```text
Beverages > Soft Drinks > Cola
```

Very useful for:

* searching
* debugging
* exports
* AI classification

---

## 3. Canonical Products

This is the missing piece.

```sql
CREATE TABLE products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  barcode VARCHAR(50),

  normalized_name VARCHAR(255),

  size_value DECIMAL(10,3),
  size_unit VARCHAR(20),

  image_url VARCHAR(1000),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  UNIQUE KEY uq_barcode (barcode),
  KEY idx_name (normalized_name)
);
```

This table represents:

> “The actual real-world product”

Examples:

* Coca-Cola 1.5L
* Nutella 350g
* Lay’s Classic 200g

independent of supermarket.

---

## 4. Product Offers / Listings

This is what your current `products` table actually is.

Rename it to:

```sql
product_offers
```

Example:

```sql
CREATE TABLE product_offers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  supermarket_id TINYINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,

  category_id INT UNSIGNED,

  external_id VARCHAR(255) NOT NULL,

  supermarket_name VARCHAR(255) NOT NULL,

  price DECIMAL(10,2) NOT NULL,

  unit_price DECIMAL(10,4),
  unit VARCHAR(30),

  product_url VARCHAR(1000),
  image_url VARCHAR(1000),

  is_available BOOLEAN DEFAULT TRUE,

  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  UNIQUE KEY uq_offer (supermarket_id, external_id),

  KEY idx_product (product_id),
  KEY idx_price (price),

  CONSTRAINT fk_offer_supermarket
    FOREIGN KEY (supermarket_id)
    REFERENCES supermarkets(id),

  CONSTRAINT fk_offer_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)
);
```

This becomes:

| Canonical Product | Supermarket Offer  |
| ----------------- | ------------------ |
| Coca-Cola 1.5L    | Continente listing |
| Coca-Cola 1.5L    | Auchan listing     |
| Coca-Cola 1.5L    | Lidl listing       |

This is the correct long-term architecture.

## Critical improvement: price history

You absolutely want this from the beginning.

Do not overwrite prices permanently.

Add:

```sql
CREATE TABLE product_price_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  product_offer_id BIGINT UNSIGNED NOT NULL,

  price DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,4),

  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  KEY idx_offer_date (product_offer_id, captured_at),

  CONSTRAINT fk_price_offer
    FOREIGN KEY (product_offer_id)
    REFERENCES product_offers(id)
);
```

This unlocks:

* price charts
* cheapest day
* inflation tracking
* “lowest price in last 30 days”
* alerts
* Black Friday analysis
* supermarket pricing patterns

Without this, you'll regret it later.

## Very important: units normalisation

This matters enormously for comparisons.

Right now:

```text
€2.99 / unit
€1.89 / kg
€0.45 / 100g
```

are inconsistent.

You should internally normalise:

* weight → grams
* liquid → millilitres

Examples:

| Product | Stored  |
| ------- | ------- |
| 1.5L    | 1500 ml |
| 750g    | 750 g   |

Then generate display formatting later.

This makes:

* sorting by cheapest per unit
* basket optimisation
* comparisons

much easier.

## Recommended additional tables

## Product aliases

Useful for AI matching and scraper inconsistencies.

```sql
CREATE TABLE product_aliases (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  product_id BIGINT UNSIGNED NOT NULL,

  alias VARCHAR(255) NOT NULL,

  FOREIGN KEY (product_id)
    REFERENCES products(id)
);
```

---

## Promotions

Very useful in Portugal because supermarkets constantly rotate campaigns.

```sql
CREATE TABLE promotions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  product_offer_id BIGINT UNSIGNED NOT NULL,

  promo_type VARCHAR(50),

  original_price DECIMAL(10,2),
  discounted_price DECIMAL(10,2),

  starts_at DATETIME,
  ends_at DATETIME,

  FOREIGN KEY (product_offer_id)
    REFERENCES product_offers(id)
);
```

---

## Users + watchlists

Eventually:

```text
Alert me when:
- Coke < €1.50
- Chicken breast < €5/kg
```

## Performance considerations

You will eventually hit:

* hundreds of thousands of offers
* millions of price history rows

So:

### Use BIGINT for

* products
* offers
* history

### Add indexes early

Especially:

```sql
(product_id, supermarket_id)
(barcode)
(normalized_name)
(scraped_at)
```

### Avoid deep recursive category queries

Consider storing:

* `path`
* `depth`
* `root_category_id`

## Future AI opportunities

Your project is actually ideal for AI-assisted matching.

Eventually you can:

* auto-match similar products
* detect duplicate listings
* estimate missing unit prices
* cluster private labels
* suggest cheaper alternatives

Example:

```text
“Milbona Milk 1L”
≈
“Continente Milk 1L”
≈
“Mimosa Milk 1L”
```

## Final assessment

Your current structure is:

* clean
* consistent
* well-normalised for a first version

But it is still:

> a scraper database

not yet:

> a comparison engine database

The canonical product + offers separation is the most important architectural upgrade you can make right now before data volume explodes.
