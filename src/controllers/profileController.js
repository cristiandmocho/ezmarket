import { getSupermarkets } from '../services/productService.js';

export async function show(req, res, next) {
  try {
    if (!req.oidc.isAuthenticated()) {
      return res.redirect('/login');
    }

    const supermarkets = await getSupermarkets();
    const avatarUrl = req.oidc.user?.picture ?? null;

    res.render('pages/profile', {
      title: 'O Meu Perfil — Quanto Fica?',
      currentPage: 'profile',
      supermarkets,
      avatarUrl,
    });
  } catch (err) {
    next(err);
  }
}
