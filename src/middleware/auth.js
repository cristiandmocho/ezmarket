import { auth } from 'express-openid-connect';
import pool from '../db/connection.js';

export const oidc = auth({
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET,
  baseURL: process.env.AUTH0_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  routes: { login: '/auth/login' },
  authorizationParams: {
    response_type: 'code',
  },
});

export async function syncUser(req, res, next) {
  if (!req.oidc.isAuthenticated()) {
    req.user = null;
    res.locals.user = null;
    return next();
  }

  try {
    const { sub, email, name } = req.oidc.user;

    const [result] = await pool.query(
      `INSERT INTO users (auth0_id, email, display_name)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         email        = VALUES(email),
         display_name = VALUES(display_name),
         id           = LAST_INSERT_ID(id)`,
      [sub, email ?? null, name ?? null]
    );

    req.user = { id: result.insertId, email: email ?? null, display_name: name ?? null };
    res.locals.user = req.user;
    next();
  } catch (err) {
    next(err);
  }
}
