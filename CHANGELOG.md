# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
