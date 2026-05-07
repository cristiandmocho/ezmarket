export const loginPage = (req, res) => {
  if (req.oidc.isAuthenticated()) return res.redirect('/');
  res.render('pages/login', { title: 'Entrar — Quanto Fica?' });
};

export const loginSubmit = (req, res) => {
  const hint = req.body?.email || '';
  const params = hint ? `?login_hint=${encodeURIComponent(hint)}` : '';
  res.redirect(`/auth/login${params}`);
};

export const loginGoogle = (req, res) =>
  res.oidc.login({ returnTo: '/', authorizationParams: { connection: 'google-oauth2' } });

export const loginMicrosoft = (req, res) =>
  res.oidc.login({ returnTo: '/', authorizationParams: { connection: 'windowslive' } });
