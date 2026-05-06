Modern browsers already give you extremely good native performance primitives now. With your stack, you can achieve excellent performance without frameworks.

For your project specifically, focus on:

* reducing network payload
* avoiding unnecessary JS
* minimising layout shifts
* improving perceived speed
* optimising rendering

not “frontend cleverness”.

# Native Image Lazy Loading

Simplest possible solution:

```html id="g6j77q"
<img
  src="/images/product.jpg"
  loading="lazy"
  decoding="async"
  width="300"
  height="300"
  alt="Product name">
```

That alone already gives:

* lazy loading
* async decoding
* layout stability

Most modern browsers support it.

For your supermarket app:
this is probably enough initially.

Very important:
always define:

```html id="x36yvv"
width
height
```

Otherwise:

* layout shifts
* bad CLS score
* jumping UI

---

# Better Lazy Loading Strategy

Use:

* tiny placeholder
* fade-in
* intersection observer

Example:

```html id="v5q8w9"
<img
  class="lazy-image"
  data-src="/images/product.jpg"
  src="/images/placeholder.webp"
  width="300"
  height="300"
  alt="Milk">
```

Then:

```js id="3lc3p7"
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    const img = entry.target;

    img.src = img.dataset.src;

    img.onload = () => {
      img.classList.add('loaded');
    };

    observer.unobserve(img);
  });
});

document.querySelectorAll('.lazy-image').forEach(img => {
  observer.observe(img);
});
```

CSS:

```css id="nnl53r"
.lazy-image {
  opacity: 0;
  transition: opacity .2s ease;
}

.lazy-image.loaded {
  opacity: 1;
}
```

This creates:

* smooth loading
* lower bandwidth
* better perceived UX

Excellent for product grids.

# Critical Front-End Optimisations

# 1. Use Modern Image Formats

Mandatory.

Prefer:

* AVIF
* WebP

Fallback:

* JPEG

Example:

```html id="4obn12"
<picture>
  <source srcset="milk.avif" type="image/avif">
  <source srcset="milk.webp" type="image/webp">

  <img
    src="milk.jpg"
    loading="lazy"
    width="300"
    height="300"
    alt="Milk">
</picture>
```

This can reduce payload massively.

---

# 2. Serve Correct Image Sizes

Do NOT serve:

```text id="jlwm7p"
2000px image into 200px card
```

This is one of the biggest performance killers.

Generate:

* thumbnails
* medium
* full

Example:

```text id="mj7gya"
/images/products/
  milk-200.webp
  milk-400.webp
  milk-800.webp
```

Then:

```html id="v4b6l4"
<img
  srcset="
    milk-200.webp 200w,
    milk-400.webp 400w,
    milk-800.webp 800w
  "
  sizes="(max-width: 768px) 200px, 400px"
  src="milk-400.webp"
  loading="lazy"
  alt="Milk">
```

Huge bandwidth savings.

---

# 3. Avoid Large JS Bundles

With vanilla JS:
you already win massively.

Keep:

* modules small
* page-specific JS
* no giant “app.js”

Example:

```html id="gg0yq2"
<script type="module" src="/js/product-page.js"></script>
```

only on product pages.

---

# 4. Use Native ES Modules

Perfect for your stack.

Example:

```js id="5lg9b9"
import ShoppingList from './components/shopping-list.js';
```

No bundler required initially.

Very underrated approach now.

---

# 5. Use Event Delegation

Instead of:

```js id="qtm3na"
button.addEventListener(...)
```

500 times.

Use:

```js id="ql64fe"
document.addEventListener('click', e => {
  if (!e.target.matches('.remove-item')) return;

  // Handle
});
```

Huge memory/performance improvement on dynamic lists.

Especially:

* shopping lists
* comparison tables
* product grids

---

# 6. Use Content Visibility

Massive hidden gem.

Example:

```css id="26o4vr"
.product-grid {
  content-visibility: auto;
  contain-intrinsic-size: 1000px;
}
```

Browser skips rendering offscreen content.

Incredible for:

* long product lists
* search pages

Huge rendering gains.

---

# 7. Avoid Layout Thrashing

Avoid:

```js id="esjlwm"
element.offsetHeight
```

inside loops with DOM writes.

Batch:

* reads
* writes

Use:

```js id="k9m6yx"
requestAnimationFrame()
```

for visual updates.

---

# 8. Debounce Search

Critical for your app.

Example:

```js id="jlwm7m"
function debounce(fn, delay = 300) {
  let timeout;

  return (...args) => {
    clearTimeout(timeout);

    timeout = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}
```

Prevents:

* API spam
* UI lag

---

# 9. Skeleton Loading Instead of Spinners

Avoid:

```text id="jlwm7n"
Loading...
```

Use:

* grey placeholders
* shimmer cards

Feels MUCH faster psychologically.

Very important for:

* search
* basket recalculation

---

# 10. Minimise Reflows

Instead of:

```js id="6wsb7m"
list.innerHTML += item;
```

Use:

```js id="jlwm7o"
DocumentFragment
```

Example:

```js id="c9msql"
const fragment = document.createDocumentFragment();

items.forEach(item => {
  fragment.appendChild(renderItem(item));
});

list.appendChild(fragment);
```

Very important for:

* long shopping lists
* product results

---

# 11. Prefer CSS Over JS

Many developers massively overuse JS now.

Examples:

* transitions
* accordions
* sticky headers
* modals
* responsive layouts

can mostly be:

* CSS
* `<dialog>`
* `position: sticky`
* `:has()`
* container queries

Modern CSS is extremely powerful now.

---

# 12. Use Passive Event Listeners

Example:

```js id="7v44jq"
window.addEventListener('scroll', handler, {
  passive: true
});
```

Improves scrolling performance.

---

# 13. Preload Critical Assets

Example:

```html id="5y0yhs"
<link
  rel="preload"
  href="/fonts/inter.woff2"
  as="font"
  type="font/woff2"
  crossorigin>
```

Very useful for:

* fonts
* hero images

---

# 14. Use Font Subsetting

Huge win.

Do NOT load:

```text id="jlwm7r"
entire Google Fonts families
```

Generate:

* latin subset only
* required weights only

Can reduce:

```text id="jlwm7s"
500KB → 40KB
```

---

# 15. Avoid Third-Party Scripts

Biggest hidden performance killer.

Avoid:

* analytics overload
* chat widgets
* trackers
* A/B testing scripts

These destroy performance.

For your MVP:
keep third-party JS nearly zero.

# Most Important Optimisation For Your App

Honestly?

Probably:

# Server-rendered HTML

combined with:

# aggressive image optimisation

That alone already beats most modern frontend stacks.

Because your app is:

* mostly read-heavy
* catalogue-driven
* SEO-sensitive

not:

* animation-heavy
* realtime-heavy

# Performance mindset

Your stack’s biggest strength is:

> simplicity

Do not accidentally recreate:

* frontend frameworks
* reactive runtimes
* virtual DOM systems

with homemade abstractions.

Keep:

* HTML-first
* server-first
* progressive enhancement
* tiny JS islands

and your app will likely feel dramatically faster than most competitors.

the data already contains the image being served. Example: <https://www.continente.pt/dw/image/v2/BDVS_PRD/on/demandware.static/-/Sites-col-master-catalog/default/dw04a544a4/images/col/200/2003646-frente.png?sw=280&sh=280>

That is actually very good news.

Because the supermarket is already:

* hosting the CDN
* resizing the image
* optimising delivery

You should absolutely leverage that.

Your example already exposes resize parameters:

```text id="zib6cv"
?sw=280&sh=280
```

which likely means:

* server width
* server height

So you can dynamically request properly sized images instead of downloading gigantic originals.

That’s ideal.

# Recommended strategy

# 1. Store Original URL

Keep the canonical image URL exactly as scraped.

Example:

```text id="93h2d3"
https://www.continente.pt/...png?sw=280&sh=280
```

---

# 2. Generate Responsive Variants Dynamically

If the CDN supports it, generate sizes yourself.

Example helper:

```js id="jlwm7u"
function resizeImage(url, width, height = width) {
  const parsed = new URL(url);

  parsed.searchParams.set('sw', width);
  parsed.searchParams.set('sh', height);

  return parsed.toString();
}
```

Then:

```js id="5vjlwm"
resizeImage(product.image_url, 200);
resizeImage(product.image_url, 400);
```

This is MUCH better than self-hosting initially.

---

# 3. Use Responsive Images

Example:

```ejs id="jlwm7w"
<img
  src="<%= resizeImage(product.image_url, 280) %>"
  srcset="
    <%= resizeImage(product.image_url, 140) %> 140w,
    <%= resizeImage(product.image_url, 280) %> 280w,
    <%= resizeImage(product.image_url, 560) %> 560w
  "
  sizes="(max-width: 768px) 140px, 280px"
  loading="lazy"
  decoding="async"
  width="280"
  height="280"
  alt="<%= product.name %>">
```

This gives:

* smaller payloads
* responsive optimisation
* browser-selected best image

Huge improvement.

---

# 4. Add Fallback Handling

Very important because supermarket CDNs WILL occasionally fail.

Example:

```html id="jlwm7x"
<img
  src="..."
  onerror="this.src='/images/fallback-product.webp'">
```

Or cleaner:

```js id="jlwm7y"
document.addEventListener('error', e => {
  if (!e.target.matches('img')) return;

  e.target.src = '/images/fallback-product.webp';
}, true);
```

---

# 5. Use Aspect Ratio

Prevent layout shifts.

Example:

```css id="jlwm7z"
.product-image {
  aspect-ratio: 1 / 1;
  object-fit: contain;
}
```

This is VERY important for product grids.

---

# 6. Use `object-fit`

Mandatory for supermarket products.

Example:

```css id="qjlwm7"
.product-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
```

because:

* packaging varies wildly
* image dimensions inconsistent

---

# 7. Add Blur-Up Placeholder (Optional)

Very nice perceived-performance improvement.

Initial:

```text id="jlwm80"
tiny blurred 20px image
```

Then:

* replace with full image

This is optional for MVP though.

---

# 8. Use Native Lazy Loading First

Honestly:
start simple.

This alone already helps enormously:

```html id="jlwm81"
loading="lazy"
```

Do NOT over-engineer immediately.

---

# 9. Preload Above-The-Fold Images

For hero products:

```html id="jlwm82"
<link
  rel="preload"
  as="image"
  href="...">
```

Useful for:

* homepage featured products
* top deals

---

# 10. Consider Proxying Later

Eventually you may want:

```text id="jlwm83"
/img/products/123.webp
```

instead of direct supermarket URLs.

Reasons:

* CDN control
* cache control
* format conversion
* broken upstream images
* avoiding third-party dependency

BUT:
not needed for MVP.

# Very important consideration

You are depending on external supermarket CDNs.

That means:

* URLs may change
* anti-hotlinking may appear
* formats may change
* rate limits may happen

For MVP:
fine.

Long-term:
you may eventually want:

* local image mirroring
  or
* image proxy caching

But:
that’s infrastructure complexity.

Avoid it initially.

# Recommended MVP image strategy

# Do this now

* use supermarket image URLs directly
* use responsive sizes
* use lazy loading
* use width/height
* use object-fit
* use fallbacks

That is enough.

# Example final MVP image component

```ejs id="jlwm84"
<img
  class="product-image"
  src="<%= resizeImage(product.image_url, 280) %>"

  srcset="
    <%= resizeImage(product.image_url, 140) %> 140w,
    <%= resizeImage(product.image_url, 280) %> 280w,
    <%= resizeImage(product.image_url, 560) %> 560w
  "

  sizes="(max-width: 768px) 140px, 280px"

  loading="lazy"
  decoding="async"

  width="280"
  height="280"

  alt="<%= product.name %>">
```

Combined with:

```css id="jlwm85"
.product-image {
  aspect-ratio: 1;
  object-fit: contain;
}
```

That is already:

* modern
* performant
* SEO-friendly
* lightweight
* maintainable
* production-grade.
