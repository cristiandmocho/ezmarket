import { getUserLists, getListBasket, getListById, getListItems, updateListItem } from '../services/productService.js';

function relativeTime(date) {
  const ms = Date.now() - new Date(date).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 2)  return 'agora mesmo';
  if (min < 60) return `há ${min} minutos`;
  const h = Math.round(min / 60);
  if (h < 24)   return `há ${h} hora${h !== 1 ? 's' : ''}`;
  const d = Math.round(h / 24);
  if (d === 1)  return 'há 1 dia';
  if (d < 30)   return `há ${d} dias`;
  const m = Math.round(d / 30);
  return m === 1 ? 'há 1 mês' : `há ${m} meses`;
}

const EUR = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
function formatEur(n) { return EUR.format(n); }

export async function index(req, res, next) {
  try {
    if (!req.oidc.isAuthenticated()) {
      return res.oidc.login({ returnTo: '/listas' });
    }

    const userId = req.user?.id ?? null;
    if (!userId) return res.oidc.login({ returnTo: '/listas' });

    const rawLists = await getUserLists(userId);
    const baskets  = await Promise.all(rawLists.map(l => getListBasket(l.id)));

    const lists = rawLists.map((l, i) => ({
      id:         l.id,
      name:       l.name,
      itemCount:  Number(l.item_count),
      updatedAt:  relativeTime(l.updated_at),
      basket:     baskets[i],
      savings:    0,
      cardType:   'compact',
      bestPrice:  '',
      savingsStr: '',
    }));

    // Classify cards — featured = highest savings delta across stores
    let maxSavings = 0, featuredIdx = -1;
    lists.forEach((list, i) => {
      if (!list.basket || list.basket.length < 2) return;
      const s = list.basket.at(-1).price - list.basket[0].price;
      list.savings = s;
      if (s > maxSavings) { maxSavings = s; featuredIdx = i; }
    });

    lists.forEach((list, i) => {
      if (!list.basket) {
        list.cardType = 'compact';
      } else {
        list.cardType   = i === featuredIdx ? 'featured' : 'expanded';
        list.bestPrice  = formatEur(list.basket[0].price);
        list.savingsStr = list.savings > 0.01
          ? `Poupas ${formatEur(list.savings)}`
          : 'Melhor preço disponível';
      }
    });

    // Savings insight card — aggregate across all lists
    const totalItems = lists.reduce((s, l) => s + l.itemCount, 0);
    let totalSavings = 0;
    const wins = {}, worsts = {};
    lists.forEach(l => {
      if (!l.basket || l.basket.length < 2) return;
      const best  = l.basket[0].name;
      const worst = l.basket.at(-1).name;
      wins[best]    = (wins[best]    || 0) + 1;
      worsts[worst] = (worsts[worst] || 0) + 1;
      totalSavings += l.basket.at(-1).price - l.basket[0].price;
    });
    const bestStore  = Object.entries(wins).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const worstStore = Object.entries(worsts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const insight = totalSavings > 0.01 && bestStore && worstStore
      ? { totalItems, bestStore, worstStore, totalSavings: formatEur(totalSavings) }
      : null;

    res.render('pages/listas', {
      title: 'As Suas Listas — Quanto Fica?',
      pageClass: 'page-listas',
      currentPage: 'lists',
      lists,
      insight,
    });
  } catch (err) {
    next(err);
  }
}

export async function show(req, res, next) {
  try {
    if (!req.oidc.isAuthenticated()) {
      return res.oidc.login({ returnTo: `/listas/${req.params.id}` });
    }
    const userId = req.user?.id ?? null;
    if (!userId) return res.oidc.login({ returnTo: `/listas/${req.params.id}` });

    const listId = Number(req.params.id);
    if (!listId) return res.redirect('/listas');

    const [list, rawItems, basket] = await Promise.all([
      getListById(listId, userId),
      getListItems(listId),
      getListBasket(listId),
    ]);

    if (!list) return res.redirect('/listas');

    const items = rawItems.map(r => {
      const price = r.price ? Number(r.price) : 0;
      const avg   = r.avg_price ? Number(r.avg_price) : price;
      const trend = avg > 0 && price < avg * 0.95 ? 'down'
                  : avg > 0 && price > avg * 1.05 ? 'up'
                  : 'avg';
      return {
        itemId:         r.item_id,
        quantity:       Number(r.quantity),
        productId:      r.product_id,
        name:           r.listing_name ?? 'Produto',
        brand:          r.brand ?? '',
        priceFormatted: price > 0 ? formatEur(price) : '—',
        unit:           r.unit ?? '',
        imageUrl:       r.image_url ?? '',
        trend,
      };
    });

    const cheapest = basket?.[0] ?? null;
    const savings  = basket?.length >= 2 ? basket.at(-1).price - basket[0].price : 0;

    const comparisonRows = basket?.map((store, i) => ({
      name:       store.name,
      slug:       store.slug,
      initials:   store.initials,
      price:      formatEur(store.price),
      diffLabel:  i === 0
        ? 'Preço mais baixo da cesta'
        : `+${formatEur(store.price - basket[0].price)} vs mais barato`,
      itemsFound: store.itemsFound,
      isCheapest: i === 0,
    })) ?? [];

    res.render('pages/lista', {
      title: `${list.name} — Quanto Fica?`,
      currentPage: 'lists',
      backNav: { href: '/listas', title: list.name },
      list: { id: list.id, name: list.name },
      items,
      comparisonRows,
      hero: cheapest ? {
        storeName: cheapest.name,
        price:     formatEur(cheapest.price),
        savings:   savings > 0.01 ? formatEur(savings) : null,
      } : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function apiUpdateItem(req, res, next) {
  try {
    if (!req.oidc.isAuthenticated()) return res.status(401).json({ error: 'Não autorizado' });
    const userId = req.user?.id ?? null;
    if (!userId) return res.status(401).json({ error: 'Não autorizado' });

    const listId  = Number(req.params.id);
    const itemId  = Number(req.params.itemId);
    const quantity = Number(req.body.quantity);

    if (!listId || !itemId || isNaN(quantity)) {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }

    const list = await getListById(listId, userId);
    if (!list) return res.status(404).json({ error: 'Lista não encontrada' });

    await updateListItem(itemId, listId, userId, quantity);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
