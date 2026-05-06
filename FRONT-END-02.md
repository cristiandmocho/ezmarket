Font-end teck-stack will be Node, NPM, MySQL, Express, EJS, EJS Layouts, SCSS, HTML and vanilla JS (ECMA2026)

You are building:

* a data platform
* a shopping utility
* an SSR-heavy product

Your stack is also ideal for:

* long-term ownership
* low dependency churn
* predictable upgrades
* small bundle sizes
* excellent Lighthouse scores

# Recommended architecture

# Backend Structure

```text id="chx6bo"
/src
  /config
  /controllers
  /services
  /repositories
  /routes
  /middlewares
  /views
  /public
  /components
  /helpers
  /validators
```

Keep:

* controllers thin
* services with business logic
* repositories/data access isolated

Very important once:

* basket comparison
* product matching
* caching
* pricing logic

grow.

---

# EJS Organisation

Strongly recommend:

```text id="wwx7fq"
/views
  /layouts
  /pages
  /partials
  /components
```

Example:

```text id="nslvys"
/components/product-card.ejs
/components/price-comparison-table.ejs
/components/shopping-list-item.ejs
```

Treat EJS includes like server-side components.

This helps enormously.

---

# SCSS Structure

You already know discipline matters here.

Recommended:

```text id="e7f8tp"
/scss
  /base
  /layout
  /components
  /pages
  /utilities
  /themes
```

Use:

* CSS variables
* modern CSS features
* container queries
* logical properties

Avoid:

* utility-class explosions
* over-nesting

---

# Front-End JS Philosophy

Very important.

Do NOT turn vanilla JS into:

* homemade React
* homemade Vue
* homemade framework

Keep it:

* modular
* event-driven
* enhancement-oriented

Good candidates for Web Components:

* autocomplete
* shopping-list editor
* product comparison table
* modal dialogs
* quantity controls

Bad candidates:

* entire page rendering
* routing
* global app state

---

# API Strategy

Even with SSR:
build clean JSON APIs.

Example:

```text id="l28b74"
/api/products/search
/api/shopping-lists
/api/basket/calculate
```

Then:

* SSR pages consume services
* JS enhancements consume APIs

This future-proofs:

* mobile apps
* browser extensions
* integrations

without changing backend architecture later.

# Recommended MVP pages

# Public

```text id="qrxslz"
/                  -> landing
/search            -> product search
/product/:slug     -> comparison page
```

---

# Authenticated

```text id="q1oz5w"
/dashboard
/lists
/lists/:id
/account
```

---

# Optional

```text id="u7phs3"
/supermarkets/:slug
/categories/:slug
```

These become useful later for SEO.

# Most important MVP feature technically

Your shopping list system.

Design it carefully from the start.

You already identified the correct cultural behaviour:

* Portugal/Brazil monthly shopping
* stocking non-perishables
* repeat purchasing patterns

That means:
lists are NOT secondary.

They are:

* retention mechanism
* comparison mechanism
* habit mechanism

This is likely your real product core.

# Recommended shopping list schema

You’ll probably want:

```sql id="jlwm7q"
shopping_lists
shopping_list_items
```

Where:

* list belongs to user
* item references canonical product
* quantity stored separately

Example:

| Product | Qty |
| ------- | --- |
| Rice    | 2   |
| Milk    | 12  |
| Coffee  | 3   |

Then calculation becomes:

```text id="t5jlwm"
SUM(lowest_offer.price * quantity)
```

Very straightforward.

# Critical UX recommendation

Avoid:

* “Add to cart” e-commerce mentality

Instead use:

* “Add to shopping list”

That distinction changes the entire feel of the product.

You are:

* planning purchases
* not selling groceries

This matters psychologically.

# Performance recommendations

Your stack can become EXTREMELY fast.

Do:

* fragment caching
* gzip/brotli
* image lazy-loading
* server-side pagination
* query caching

Avoid:

* large frontend bundles
* hydration frameworks
* client-rendered tables

Your architecture should comfortably achieve:

* near-instant first render
* excellent Core Web Vitals

# Final assessment

You now have:

* a very sensible stack
* a realistic MVP scope
* a strong differentiator
* a maintainable architecture

This is the kind of project that can evolve cleanly for years without requiring:

* rewrites
* framework migrations
* frontend churn
* dependency firefighting

That is a massive long-term advantage.

For your MVP:

> start with simple in-process caching first

and only introduce Redis when you actually need distributed/shared caching.

You are very likely overestimating your initial caching requirements.

For your specific stack and product, the real bottlenecks initially will be:

* scraper throughput
* query quality
* product matching
* image delivery

not cache scalability.

# Recommended caching evolution

# Phase 1 — MVP

Use:

* in-memory cache
* simple TTL caching
* HTTP cache headers

This is enough for:

* thousands of users
* moderate traffic
* single instance deployment

Perfectly fine.

Something like:

* node-cache
* lru-cache
* memory-cache

is sufficient.

I’d personally recommend:
lru-cache

because:

* mature
* tiny
* fast
* predictable
* supports TTL
* memory-safe

Example use cases:

* product comparison responses
* supermarket totals
* autocomplete
* category trees

---

# Phase 2 — Add Fragment Caching

Very useful for SSR apps.

Example:

* cached product cards
* cached comparison tables
* cached supermarket totals

You can cache rendered HTML fragments.

This is incredibly effective with EJS.

Example:

```js id="w74rq7"
cache.get(`product:${id}:comparison`)
```

Then inject HTML directly.

Huge performance win.

---

# Phase 3 — Redis

Only when you need:

| Requirement            | Redis Needed? |
| ---------------------- | ------------- |
| Multiple app instances | Yes           |
| Shared sessions        | Usually       |
| Distributed cache      | Yes           |
| Queue system           | Yes           |
| Real-time pub/sub      | Yes           |
| Heavy rate limiting    | Often         |
| Job workers            | Usually       |

If you’re:

* single VPS
* single Node instance
* MVP traffic

Redis is optional.

# Why simple caching works very well for YOUR app

Your data is naturally cache-friendly.

Examples:

| Data              | Changes Often? |
| ----------------- | -------------- |
| Product details   | No             |
| Category trees    | Rarely         |
| Price comparisons | Moderately     |
| Search results    | Moderately     |
| Shopping lists    | User-specific  |

And importantly:
users EXPECT slight delays in supermarket pricing freshness.

This is not:

* stock trading
* live multiplayer
* real-time logistics

A few minutes of cache TTL is perfectly acceptable.

# Suggested MVP cache strategy

# Cache These

## Product comparison pages

TTL:

```text id="jlwm7v"
5–30 minutes
```

---

## Search autocomplete

TTL:

```text id="5u0qtg"
5 minutes
```

---

## Category trees

TTL:

```text id="g42qva"
24 hours
```

---

## Cheapest basket calculations

TTL:

```text id="cvxwt5"
5–15 minutes
```

Especially useful.

---

# Do NOT cache

## Auth/session-sensitive pages

Examples:

* account settings
* list editing

unless fragment-based.

---

# Use HTTP caching aggressively

Very important and often neglected.

Examples:

```http id="c8y1t0"
Cache-Control
ETag
Last-Modified
```

This alone dramatically reduces server load.

Especially for:

* product pages
* supermarket pages
* category pages

---

# Add CDN caching for static assets

Critical:

* product images
* CSS
* JS

Your architecture is actually ideal for CDN optimisation.

# Recommended libraries

# In-memory cache

Recommended:
lru-cache

Alternative:
node-cache

---

# HTTP caching

Recommended:
compression

and:
etag

---

# Optional response cache middleware

You *can* use:
apicache

but personally:

for your project,
I would rather:

* cache deliberately
* at service layer
* with explicit keys

instead of blanket route caching.

You’ll get:

* more control
* fewer invalidation surprises
* cleaner architecture

# Very important warning

Avoid:

> “cache everything automatically”

Supermarket data has:

* partial freshness
* scrape timing
* promotions
* stock inconsistencies

You need predictable invalidation.

Especially later:

* promotions
* price changes
* list recalculations

Explicit caching strategy wins long-term.

# My recommendation for your MVP

Use:

```text id="9oh0o5"
Express
EJS
lru-cache
HTTP caching
CDN/static caching
```

No Redis yet.

Add Redis later IF:

* you scale horizontally
* introduce queues
* add workers
* need distributed state

Until then:
simple caching is cleaner, easier, and perfectly sufficient.
