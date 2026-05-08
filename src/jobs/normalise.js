/**
 * Product name normalisation and similarity utilities for the matching job.
 *
 * All functions are pure (no DB access) so they are easy to unit-test.
 */

// Tokens that indicate pack multiplier or unit size — stripped before comparison
const SIZE_RE = /\b\d+(?:[.,]\d+)?\s*x\s*\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|cl|un)\b|\b\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|cl|un)\b/gi;

/**
 * Lowercase, strip diacritics, keep only [a-z0-9 ].
 */
export function normaliseText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalise a product name for comparison:
 *   1. Strip diacritics + lowercase
 *   2. Remove the brand substring
 *   3. Remove size tokens (e.g. "1L", "500g", "4x125g")
 *   4. Remove stray digits
 *   5. Sort remaining tokens alphabetically (handles word-order variation)
 *
 * Returns a canonical string; identical output = same product (within a brand group).
 */
export function normaliseProductName(name, brand) {
  let n = normaliseText(name);

  if (brand) {
    const b = normaliseText(brand);
    // Escape regex metacharacters in brand before using it as a pattern
    const escaped = b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    n = n.replace(new RegExp(`\\b${escaped}\\b`, 'g'), ' ');
  }

  n = n.replace(SIZE_RE, ' ');
  n = n.replace(/\b\d+\b/g, ' ');

  const tokens = n
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .sort();

  return tokens.join(' ');
}

/**
 * Extract a normalised pack size string from product metadata.
 * Returns values in base units: "1000ml", "500g", "1980ml", etc.
 * Returns null when no size can be determined.
 */
export function extractPackSize(listingName, unit, unitPrice) {
  const text = listingName ?? '';

  // Multi-pack: "6x33cl", "4x125g", "2x1L"
  const multi = text.match(/\b(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|cl)\b/i);
  if (multi) {
    const count = parseInt(multi[1], 10);
    const val   = parseFloat(multi[2].replace(',', '.'));
    const u     = multi[3].toLowerCase();
    return formatSize(count * val, u);
  }

  // Single size: "1.5L", "500g", "330ml"
  const single = text.match(/\b(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|cl)\b/i);
  if (single) {
    const val = parseFloat(single[1].replace(',', '.'));
    const u   = single[2].toLowerCase();
    return formatSize(val, u);
  }

  // Fall back: infer from scraper unit (un/piece — not a size signal, skip)
  return null;
}

function formatSize(val, unit) {
  switch (unit) {
    case 'kg': return `${Math.round(val * 1000)}g`;
    case 'l':  return `${Math.round(val * 1000)}ml`;
    case 'cl': return `${Math.round(val * 10)}ml`;
    default:   return `${Math.round(val)}${unit}`;
  }
}

/**
 * Return the set of 3-character trigrams for a string.
 * Pads with spaces so edge characters are represented.
 */
export function trigrams(str) {
  const set = new Set();
  if (!str) return set;
  const padded = `  ${str}  `;
  for (let i = 0; i < padded.length - 2; i++) {
    set.add(padded.slice(i, i + 3));
  }
  return set;
}

/**
 * Dice coefficient on trigram sets: 2|A∩B| / (|A| + |B|).
 * Returns a value in [0, 1]; 1 = identical.
 */
export function trigramSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ta = trigrams(a);
  const tb = trigrams(b);
  let intersection = 0;
  for (const t of ta) {
    if (tb.has(t)) intersection++;
  }
  return (2 * intersection) / (ta.size + tb.size);
}
