import { Router } from 'express';
import * as homeController from '../controllers/homeController.js';
import * as searchController from '../controllers/searchController.js';
import * as productController from '../controllers/productController.js';

const router = Router();

router.get('/', homeController.index);
router.get('/search', searchController.index);
router.get('/product/:slug', productController.show);

export default router;
