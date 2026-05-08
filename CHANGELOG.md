# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.15.0] — 2026-05-08

### Added

- Product deduplication pipeline: `src/jobs/matchProducts.js` — Union-Find + trigram similarity (≥ 0.85) to identify canonical products across supermarkets; redirects `product_offers` and `shopping_list_items` FKs, deletes orphaned duplicates
- `src/jobs/normalise.js` — pure utility functions: `normaliseText`, `normaliseProductName`, `extractPackSize`, `trigrams`, `trigramSimilarity`
- `src/db/migrate-canonical.js` — idempotent migration adding `normalised_name` and `pack_size` columns + `idx_norm` index to `products` table
- `src/__tests__/normalise.test.js` — Jest unit tests for all normalisation and similarity functions
- `npm run db:migrate` script — runs the canonical migration
- `npm run match` script — runs the product matching job
- `npm test` — Jest via `--experimental-vm-modules` (ES module support)

### Changed

- `src/models/offer.js` — `normalizeUnitPrice()` converts scraped unit prices to base units (g / ml) and stores `price_per_base` + `base_unit`
- `src/db/schema.sql` — `products` table gains `normalised_name VARCHAR(255)`, `pack_size VARCHAR(30)`, and `idx_norm` index
- All scrapers: improved category hierarchy extraction (3-level GTM data on Auchan, GA impressions on Continente, virtual-scroll dedup on Lidl, DOM-snapshot debug logging on Pingo Doce)
- `jest` added as devDependency

---

## [0.12.0] — 2026-05-07

### Added

- User profile page at `GET /perfil` (`profileController.show`); unauthenticated users redirected to `/login`
- Profile card: Auth0 avatar (with initials fallback), display name, plan label, "Editar Perfil" link
- Stats row: Poupança Mensal + Melhor Loja cards (placeholder until savings tracking is built)
- Preferred stores section: toggles per supermarket (DB-driven list), state persisted in `preferred_stores` cookie
- App preferences section: price alerts toggle (`price_alerts` cookie), static currency + language rows
- "Gerar Relatório Completo (PDF)" CTA button (stub)
- Logout button linking to `/logout`
- `.toggle` switch component in `_profile.scss` (reusable)
- Extended `preferences` middleware: `prefs.preferredStores` (string[]) and `prefs.priceAlerts` (boolean) from cookies

### Changed

- Nav header background changed from `surface-container-lowest` to `var(--primary)`; all nav text/icons updated to `var(--on-primary)`
- Version bump method: use `npm version [major|minor|patch]` going forward

---

## [0.9.0] — 2026-05-07

### Added

- Auth0 integration via `express-openid-connect`
- `users.auth0_id` column (OIDC `sub` claim, unique key)
- `src/middleware/auth.js` — `oidc` middleware (OIDC config) + `syncUser` (upserts Auth0 profile into `users` table on every authenticated request)
- `req.user` / `res.locals.user` available on every request; null for unauthenticated
- Nav shows logout icon when authenticated, Login link when not
- Auth0 env vars documented in `.env.example`

---

## [0.8.0] — 2026-05-07

### Added

- Multi-tenant schema: `users` table (auth0_id, email, display_name)
- `shopping_lists.user_id` FK → `users(id) ON DELETE CASCADE`
- `getDefaultList(userId)` scopes list query by user; cache key includes userId
- `homeController` reads `req.user?.id`; unauthenticated requests skip basket query and show empty-state card

---

## [0.7.0] — 2026-05-07

### Added

- Home page fully built in PT-PT: hero + search, basket comparison card, "Poupar em três passos", supermarkets strip, promo cards
- Mobile nav: top bar (brand left-aligned) + fixed bottom nav with active state from `currentPage`
- Store badge: logo image (`slug.avif`) with brand-colour initials fallback via `onerror`
- Supermarkets list and price count read from DB (not hardcoded)
- `shopping_lists` + `shopping_list_items` schema tables
- `getDefaultList(userId)` + `getListBasket(listId)` service queries
- Basket card driven by DB: cheapest offer per product per supermarket, diff/trend arrows
- Empty-state basket card shown when no lists exist or user is unauthenticated
- Supermarket logo files added to `src/public/images/logos/` (auchan, continente, lidl, pingo-doce)
- `$brand-*` palette variables for supermarket brand colours

---

## [0.6.0] and earlier

### Added

- Express 5 + EJS SSR scaffold: `server.js`, `routes/web.js`, `routes/api.js`, controllers, middleware
- SCSS design system: dual-token palette, 8px grid, Manrope + Inter typography, MDI icons, BEM layout and component partials
- `productService.js` with LRU cache (5-min TTL): search, deals, offer lookup, price history, supermarkets, price count
- `middleware/logger.js` — coloured HTTP request logger
- `middleware/preferences.js` — user preferences (supermarket, theme) from cookies → `res.locals.prefs`
- `compression` middleware (gzip/brotli)
- Playwright scrapers: Continente, Pingo Doce, Auchan, Lidl
- MySQL schema: `supermarkets`, `categories`, `products`, `product_offers`, `product_price_history`
