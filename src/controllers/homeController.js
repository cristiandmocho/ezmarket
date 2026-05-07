import { getDeals, getSupermarkets, getPriceCount, getDefaultList, getListBasket } from '../services/productService.js';

export async function index(req, res, next) {
  try {
    const [deals, supermarkets, priceCount, list] = await Promise.all([
      getDeals(8),
      getSupermarkets(),
      getPriceCount(),
      getDefaultList(),
    ]);

    let basket = null;
    if (list) {
      const stores = await getListBasket(list.id);
      if (stores) {
        basket = { label: list.name, itemCount: Number(list.itemCount), stores };
      }
    }

    res.render('pages/home', {
      title: 'Quanto Fica? — Compare preços nos supermercados',
      pageClass: 'page-home',
      currentPage: 'home',
      deals,
      basket,
      supermarkets,
      stats: { pricesUpdated: priceCount },
    });
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
