# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`ezmarkets` is a Node.js (ES modules) supermarket price comparison app for the Portuguese market. It has two subsystems:

1. **Scraper** — Playwright-based headless scrapers that populate a MySQL database.
2. **Web server** — Express + EJS SSR app serving price comparison pages, with a JSON API alongside.

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

# Initialise / migrate database schema
npm run db:init

# Run all scrapers (or pass a slug: node src/index.js continente)
npm run scrape

# Run tests
npm test
```

## Stack

- **Runtime**: Node.js, ES modules (`"type": "module"` — use `import`/`export` everywhere)
- **Web**: Express 5, EJS templates, express-ejs-layouts
- **Styles**: SCSS (Dart Sass), compiled to `src/public/css/main.css`
- **Database**: MySQL via mysql2/promise pool (`src/db/connection.js`)
- **Scraping**: Playwright (Chromium)
- **Caching**: LRU cache (in-process, 5-min TTL) in `productService.js`
- **Compression**: `compression` middleware (gzip/brotli)
- **Icons**: Material Design Icons via Google Fonts CDN + `.mdi` utility class
- **Fonts**: Manrope (headlines, prices) + Inter (body, labels) via Google Fonts

## Project structure

```text
src/
├── server.js              # Express entry point
├── routes/
│   ├── web.js             # SSR routes (GET /, /search, /product/:slug)
│   └── api.js             # JSON API routes (GET /api/*)
├── controllers/           # Route handlers (one file per resource)
├── middleware/
│   ├── logger.js          # HTTP request logger → console
│   └── preferences.js     # User preferences → res.locals.prefs
├── services/
│   └── productService.js  # All DB queries with LRU cache
├── db/
│   ├── connection.js      # mysql2 pool (reads DB_* from env)
│   ├── init.js            # Schema migration runner
│   └── schema.sql         # Full DB schema
├── scrapers/              # One directory per supermarket
├── models/                # Scraper-side DB models (category, offer)
├── views/
│   ├── layouts/main.ejs   # Base HTML layout
│   ├── pages/             # One EJS file per page
│   └── partials/          # Shared fragments (nav, footer, product-card)
├── public/
│   ├── css/main.css       # Compiled output — do not edit manually
│   ├── js/                # Vanilla ES modules
│   └── images/logos/      # Supermarket SVG logos
└── scss/
    ├── main.scss           # Imports all partials
    ├── base/
    │   ├── _palette.scss   # Colour tokens: $scss-vars AND :root CSS vars
    │   ├── _variables.scss # Spacing, radius, shadows
    │   ├── _reset.scss
    │   ├── _typography.scss
    │   └── _icons.scss     # .mdi utility class
    ├── layout/             # _grid, _nav, _footer
    ├── components/         # _button, _card, _chip, _input, _price-row
    └── pages/              # _home, _search, _product
```

## Route naming convention

Both web and API routes follow the same pattern: `controller.method`.

```text
GET  /                        → homeController.index
GET  /search                  → searchController.index
GET  /product/:slug           → productController.show

GET  /api/search              → searchController.apiSearch
GET  /api/deals               → homeController.apiDeals
GET  /api/product/:id         → productController.apiShow
GET  /api/product/:id/history → productController.apiHistory
```

## Design system

Colour palette is defined in `src/scss/base/_palette.scss` as both SCSS variables (`$primary`) and CSS custom properties (`--primary`) on `:root`. Use CSS vars in Web Components and EJS inline styles; use SCSS vars inside `.scss` files.

Spacing follows an 8px grid. Typography: Manrope for headlines/prices, Inter for body/labels. See `DESIGN.md` for the full token list.

## Environment

Requires a `.env` file (see `.env.example`):

```env
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASS=
DB_NAME=ezmarkets
PORT=3000
```

The `dev` script uses `--env-file=.env` so dotenv is not required at runtime.

## Notes

- `package.json` uses `"type": "module"` — always use `import`/`export`, never `require`.
- Do not edit `src/public/css/main.css` directly; compile from SCSS.
- The LRU cache in `productService.js` has a 5-minute TTL. Restart the server to clear it during development.
