import { getDeals } from '../services/productService.js';

export async function index(req, res, next) {
  try {
    const deals = await getDeals(8);
    res.render('pages/home', { title: 'ezMarkets — Compare supermarket prices', deals });
  } catch (err) {
    next(err);
  }
}

export async function apiDeals(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 12, 50);
    const deals = await getDeals(limit);
    res.json({ results: deals });
  } catch (err) {
    next(err);
  }
}
