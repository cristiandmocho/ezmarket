export function preferences(req, res, next) {
  res.locals.prefs = {
    supermarket: req.cookies?.supermarket ?? null,
    theme: req.cookies?.theme ?? 'light',
    preferredStores: req.cookies?.preferred_stores
      ? req.cookies.preferred_stores.split(',').filter(Boolean)
      : [],
    priceAlerts: req.cookies?.price_alerts === '1',
  };
  next();
}
