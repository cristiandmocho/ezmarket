import { getOfferBySlug, getOfferById, getPriceHistory } from '../services/productService.js';

export async function show(req, res, next) {
  try {
    const offer = await getOfferBySlug(req.params.slug);
    if (!offer) return res.status(404).render('pages/404', { title: 'Not found — ezMarkets' });
    const history = await getPriceHistory(offer.id, 90);
    res.render('pages/product', { title: `${offer.listing_name} — ezMarkets`, offer, history });
  } catch (err) {
    next(err);
  }
}

export async function apiShow(req, res, next) {
  try {
    const offer = await getOfferById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Not found' });
    const history = await getPriceHistory(offer.id, 90);
    res.json({ offer, history });
  } catch (err) {
    next(err);
  }
}

export async function apiHistory(req, res, next) {
  try {
    const days = Math.min(parseInt(req.query.days) || 90, 365);
    const history = await getPriceHistory(req.params.id, days);
    res.json(history);
  } catch (err) {
    next(err);
  }
}
