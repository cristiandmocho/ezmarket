import express from 'express';
import expressLayouts from 'express-ejs-layouts';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './middleware/logger.js';
import { preferences } from './middleware/preferences.js';
import { oidc, syncUser } from './middleware/auth.js';
import webRouter from './routes/web.js';
import apiRouter from './routes/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

app.use(oidc);
app.use(logger);
app.use(preferences);
app.use(syncUser);

app.use('/', webRouter);
app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`ezMarkets running at http://localhost:${PORT}`);
});
