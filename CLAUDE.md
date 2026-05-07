# CLAUDE.md — ezMarkets / Quanto Fica?

This is the primary briefing document for every Claude session on this project.
Read it at the start of any new conversation before writing a single line of code.

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

---

## What this is

`ezmarkets` is a PT-PT supermarket price comparison app, branded **"Quanto Fica?"** ("How much does it come to?"). Portuguese consumers build shopping lists and instantly see which supermarket gives the cheapest total basket.

Two subsystems:

1. **Scraper** — Playwright headless scrapers that populate a MySQL database with live product prices.
2. **Web server** — Express + EJS SSR app serving price comparison pages, with a JSON API alongside.

---

## What we're building

Mobile-first web app. Core loop: user creates a shopping list → app compares the basket total across Continente, Pingo Doce, Auchan, Lidl, etc. → user goes to the cheapest store.

Pages (in build order):

| Page | Route | Status |
| --- | --- | --- |
| Home / landing | `/` | ✅ Done |
| User profile | `/perfil` | ✅ Done |
| Search results | `/search?q=` | 🔲 Next |
| Product detail | `/product/:slug` | 🔲 Next |
| Shopping list dashboard | `/listas` | 🔲 Phase 2 |
| Create list | `/listas/nova` | 🔲 Phase 2 |

---

## Current state

### Database schema (`src/db/schema.sql`)

| Table | Purpose |
| --- | --- |
| `supermarkets` | Store name, slug, base URL |
| `categories` | Per-supermarket category tree |
| `products` | Canonical real-world products |
| `product_offers` | Supermarket-specific listings with price |
| `product_price_history` | Price snapshots over time |
| `users` | Auth0-linked users (auth0_id, email, display_name) |
| `shopping_lists` | User-owned lists (user_id FK) |
| `shopping_list_items` | List items (product_id + quantity) |

### What's built

- ✅ Playwright scrapers: Continente, Pingo Doce, Auchan, Lidl
- ✅ Express 5 + EJS SSR scaffold — `server.js`, `routes/`, `controllers/`, `middleware/`
- ✅ Auth0 via `express-openid-connect`; `syncUser` middleware upserts Auth0 profile into `users` table; `req.user` / `res.locals.user` available on every request; `/login` and `/logout` handled automatically
- ✅ Multi-tenant schema — every user-owned table has a `user_id` FK; product catalog is global
- ✅ Home page (PT-PT): hero + search, basket comparison card (DB-driven, shows empty-state for unauthenticated), "Poupar em três passos", supermarkets strip (DB-driven), promo cards
- ✅ Mobile nav: top bar (primary green background, hamburger | brand | login/logout + settings) + fixed bottom nav with active state from `currentPage`
- ✅ User profile page (`/perfil`): avatar + initials fallback, preferred stores toggles (cookie-persisted), app preferences, logout
- ✅ `.toggle` switch component (in `_profile.scss`) — reusable checkbox-as-switch
- ✅ `prefs.preferredStores` (string[]) and `prefs.priceAlerts` (boolean) in preferences middleware
- ✅ SCSS design system: palette dual-tokens, 8px grid, Manrope + Inter, MDI icons, BEM, `_home.scss`, `_nav.scss`, `_bottom-nav.scss`, `_footer.scss`, `_grid.scss`, `_profile.scss`
- ✅ LRU cache (5-min TTL) on all DB queries in `productService.js`
- ✅ `compression` middleware (gzip/brotli)

### Key service functions (`src/services/productService.js`)

| Function | What it does |
| --- | --- |
| `searchProducts({ q, supermarket, limit, offset })` | Full-text search on listing_name + brand |
| `getDeals(limit)` | Most recently scraped available offers |
| `getOfferBySlug(slug)` | Look up offer by URL slug |
| `getOfferById(id)` | Look up offer by ID |
| `getSupermarkets()` | All supermarkets ordered by name |
| `getPriceCount()` | Formatted count of available offers (e.g. "1,2M") |
| `getPriceHistory(offerId, days)` | Price snapshots for last N days |
| `getDefaultList(userId)` | Most-recent list for a user, or null |
| `getListBasket(listId)` | Basket totals per supermarket with diff/trend |

---

## What's next

Build pages in this order as mockups arrive (user provides one screenshot at a time):

1. **`/search?q=`** — search results: persistent search bar, summary card, product grid, filter chips by supermarket/category, skeleton loading
2. **`/product/:slug`** — product detail: price comparison table, Chart.js price history (last 30/90 days), unit price, "best deal" badge, alternatives
3. **`/listas`** — authenticated dashboard: list editor, all user lists
4. **`/listas/nova`** — create new list (CTA on home empty-state already links here)

---

## Architecture & code rules

- **ES modules only** — `import`/`export` everywhere; never `require`
- **No nodemon** — `node --watch --env-file=.env src/server.js`
- **No CSS source maps** — `--no-source-map`
- **SCSS BEM** — `block__element--modifier`; elements are nested as `&__element` inside the block rule. Searching for `.hero__headline` won't find it in SCSS — search for `&__headline` instead
- **Colour tokens** — declared twice in `_palette.scss`: `$scss-var` for `.scss` files, `--css-var` on `:root` for EJS/JS/Web Components
- **`pageClass` pattern** — controllers pass `pageClass: 'page-home'` to override global layout padding on full-bleed pages
- **`currentPage` string** — drives bottom nav active state; set in every controller render call
- **Store badge fallback** — `onerror` JS adds `store-badge--no-logo` class and removes the `<img>`; brand colour fills the badge via `$brand-*` palette vars
- **Images** — always `loading="lazy"` + `decoding="async"` + explicit `width`/`height`; `object-fit: contain` on containers
- **Vanilla JS only** — no frameworks, no bundles; plain ES modules in `src/public/js/`
- **Chart.js** — for price history graphs; import via CDN in the layout or on the product page only
- **Basket query** — `getListBasket(listId)` joins items → cheapest offer per product per supermarket via correlated subquery; diff/trend computed in JS from the average total
- **Cache invalidation** — LRU cache TTL is 5 min; restart server to clear during development. Cache key format: `cacheKey('prefix', ...parts)`

---

## Personal / session instructions

- **Always use the Bash tool** — never PowerShell; user is on Bash
- **Bump `package.json` version on every push** — run `npm version minor` for features, `npm version patch` for fixes; include the bump in the same commit
- **Update CHANGELOG.md and CLAUDE.md after every push** — log what changed in the changelog; update "What's built" and page table in CLAUDE.md
- **Build views image by image** — user provides one mockup screenshot at a time; implement it fully before moving on
- **All UI copy is PT-PT Portuguese** — translate any placeholder text
- **Run `npm run db:init` after any schema change** — it drops and recreates the full DB; scrapers must re-run to repopulate product data
- **Run `npm run build:css` after any SCSS change** — verify clean compile before committing
- **No comments** unless the WHY is non-obvious (hidden constraint, workaround, subtle invariant)
- **No error handling for impossible cases** — trust framework guarantees; only validate at system boundaries

---

## Commands

```bash
# Install dependencies
npm install

# Start dev server (hot-reloads on file change, loads .env automatically)
npm run dev

# Compile SCSS → CSS (one-shot, no source maps)
npm run build:css

# Watch SCSS for changes
npm run watch:css

# Initialise / migrate database schema (DROPS AND RECREATES — re-run scrapers after)
npm run db:init

# Run all scrapers (or pass a slug: node src/index.js continente)
npm run scrape

# Run tests
npm test
```

---

## Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js, ES modules (`"type": "module"`) |
| Web | Express 5, EJS, express-ejs-layouts |
| Auth | Auth0 via express-openid-connect |
| Styles | SCSS (Dart Sass) → `src/public/css/main.css` |
| Database | MySQL via mysql2/promise pool |
| Caching | lru-cache v11 (in-process, 5-min TTL) |
| Scraping | Playwright (Chromium) |
| Icons | Material Design Icons via Google Fonts CDN + `.mdi` class |
| Fonts | Manrope (headlines/prices) + Inter (body/labels) via Google Fonts |
| Charts | Chart.js (price history — not yet wired) |

---

## Project structure

```text
src/
├── server.js                   # Express entry point
├── routes/
│   ├── web.js                  # SSR routes
│   └── api.js                  # JSON API routes
├── controllers/
│   ├── homeController.js
│   ├── searchController.js
│   └── productController.js
├── middleware/
│   ├── auth.js                 # oidc (express-openid-connect) + syncUser
│   ├── logger.js               # Coloured HTTP request logger → console
│   └── preferences.js          # User preferences → res.locals.prefs
├── services/
│   └── productService.js       # All DB queries with LRU cache
├── db/
│   ├── connection.js           # mysql2 pool (reads DB_* from env)
│   ├── init.js                 # Schema migration runner
│   └── schema.sql              # Full DB schema
├── scrapers/                   # One directory per supermarket
├── models/                     # Scraper-side DB models
├── views/
│   ├── layouts/main.ejs        # Base HTML layout (head, nav, footer, bottom-nav)
│   ├── pages/                  # One EJS file per page
│   └── partials/               # nav.ejs, footer.ejs, bottom-nav.ejs, product-card.ejs
├── public/
│   ├── css/main.css            # Compiled output — do not edit manually
│   ├── js/                     # Vanilla ES modules
│   └── images/logos/           # Supermarket logo files (slug.avif)
└── scss/
    ├── main.scss
    ├── base/
    │   ├── _palette.scss       # Colour tokens: $scss-vars AND :root CSS vars
    │   ├── _variables.scss     # Spacing, radius, transitions
    │   ├── _reset.scss
    │   ├── _typography.scss
    │   └── _icons.scss         # .mdi utility class
    ├── layout/                 # _grid, _nav, _bottom-nav, _footer
    ├── components/             # _button, _card, _chip, _input, _price-row
    └── pages/                  # _home, _search, _product
```

---

## Route naming convention

```text
GET  /                        → homeController.index
GET  /search                  → searchController.index
GET  /product/:slug           → productController.show
GET  /listas                  → listController.index        (Phase 2)
GET  /listas/nova             → listController.create       (Phase 2)

GET  /api/search              → searchController.apiSearch
GET  /api/deals               → homeController.apiDeals
GET  /api/product/:id         → productController.apiShow
GET  /api/product/:id/history → productController.apiHistory
```

---

## Design system

### Colour tokens (`src/scss/base/_palette.scss`)

Every token declared twice — SCSS var for `.scss` files, CSS custom property for EJS/components:

```scss
$primary: #0f5238;            --primary: #0f5238
$primary-container: #2d6a4f   --primary-container: #2d6a4f
$secondary: #1261a3;          --secondary: #1261a3
$background: #fcf9f8;         --background: #fcf9f8
$on-surface: #1c1b1b;         --on-surface: #1c1b1b
$outline-variant: #bfc9c1;    --outline-variant: #bfc9c1
```

Supermarket brand colours: `$brand-pingo-doce`, `$brand-continente`, `$brand-auchan`, `$brand-lidl`, `$brand-aldi`, `$brand-minipreco`

### Typography

Manrope (headlines, prices) + Inter (body, labels). Scale: `headline-xl/lg/md`, `body-lg/md/sm`, `label-md/sm`, `price-display`.

### Spacing (8px grid)

`$space-xs: 4px` / `$space-sm: 12px` / `$space-md: 24px` / `$space-lg: 32px` / `$space-xl: 48px`
Outer margin: `$space-margin: 20px`. Gutter: 16px.

### Radius

`$radius-sm: 4px` / `$radius: 8px` / `$radius-md: 12px` / `$radius-lg: 16px` / `$radius-full: 999px`

---

## Environment

`.env` file required (see `.env.example`):

```env
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASS=
DB_NAME=ezmarkets
PORT=3000

AUTH0_SECRET=              # openssl rand -hex 32
AUTH0_BASE_URL=http://localhost:3000
AUTH0_CLIENT_ID=
AUTH0_ISSUER_BASE_URL=     # https://YOUR_TENANT.auth0.com
```

Auth0 app settings required:

- Allowed Callback URLs: `http://localhost:3000/callback`
- Allowed Logout URLs: `http://localhost:3000`

The `dev` script uses `--env-file=.env` — dotenv package not required at runtime.
