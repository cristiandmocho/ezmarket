export function preferences(req, res, next) {
  res.locals.prefs = {
    supermarket: req.cookies?.supermarket ?? null,
    theme: req.cookies?.theme ?? 'light',
  };
  next();
}
