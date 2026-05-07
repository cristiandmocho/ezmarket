import { searchProducts, getAutocomplete } from '../services/productService.js';

export async function index(req, res, next) {
  try {
    const { q = '', supermarket = '', page = 1 } = req.query;
    const results = q ? await searchProducts({ q, supermarket, limit: 24, offset: (page - 1) * 24 }) : [];
    res.render('pages/search', {
      title: q ? `"${q}" — Quanto Fica?` : 'Pesquisar — Quanto Fica?',
      currentPage: 'search',
      q,
      supermarket,
      results,
    });
  } catch (err) {
    next(err);
  }
}

export async function apiSearch(req, res, next) {
  try {
    const { q = '', supermarket = '', limit = 8 } = req.query;
    if (!q.trim()) return res.json({ results: [] });
    const results = await searchProducts({ q, supermarket, limit: Math.min(parseInt(limit), 50), offset: 0 });
    res.json({ results });
  } catch (err) {
    next(err);
  }
}

export async function apiAutocomplete(req, res, next) {
  try {
    const { q = '' } = req.query;
    if (!q.trim()) return res.json([]);
    const results = await getAutocomplete(q, 6);
    res.json(results);
  } catch (err) {
    next(err);
  }
}
