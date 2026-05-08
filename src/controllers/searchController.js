import { searchProducts, getAutocomplete } from '../services/productService.js';

const PAGE_SIZE = 24;

const VALID_SORTS = ['relevance', 'price_asc', 'price_desc', 'name_asc', 'name_desc'];

export async function index(req, res, next) {
  try {
    const { q: rawQ = '', supermarket = '', sort = 'relevance' } = req.query;
    const q = rawQ.trim();
    const validSort = VALID_SORTS.includes(sort) ? sort : 'relevance';
    const results = q ? await searchProducts({ q, supermarket, sort: validSort, limit: PAGE_SIZE, offset: 0 }) : [];
    res.render('pages/search', {
      title: q ? `"${q}" — Quanto Fica?` : 'Pesquisar — Quanto Fica?',
      currentPage: 'search',
      pageClass: 'page-search',
      q,
      supermarket,
      sort: validSort,
      results,
      hasMore: results.length === PAGE_SIZE,
      nextOffset: PAGE_SIZE,
    });
  } catch (err) {
    next(err);
  }
}

export async function apiSearch(req, res, next) {
  try {
    const { q: rawQ = '', supermarket = '', sort = 'relevance', limit = 8, offset = 0 } = req.query;
    const q = rawQ.trim();
    if (!q) return res.json({ results: [] });
    const parsedLimit = Math.min(parseInt(limit), 50);
    const parsedOffset = Math.max(parseInt(offset), 0);
    const validSort = VALID_SORTS.includes(sort) ? sort : 'relevance';
    const results = await searchProducts({ q, supermarket, sort: validSort, limit: parsedLimit, offset: parsedOffset });
    res.json({ results, hasMore: results.length === parsedLimit });
  } catch (err) {
    next(err);
  }
}

export async function apiAutocomplete(req, res, next) {
  try {
    const { q: rawQ = '' } = req.query;
    const q = rawQ.trim();
    if (!q) return res.json([]);
    const results = await getAutocomplete(q, 6);
    res.json(results);
  } catch (err) {
    next(err);
  }
}
