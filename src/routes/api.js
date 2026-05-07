import { Router } from 'express';
import * as homeController from '../controllers/homeController.js';
import * as searchController from '../controllers/searchController.js';
import * as productController from '../controllers/productController.js';
import * as listController from '../controllers/listController.js';

const router = Router();

router.get('/search', searchController.apiSearch);
router.get('/deals', homeController.apiDeals);
router.get('/product/:id', productController.apiShow);
router.get('/product/:id/history', productController.apiHistory);

router.patch('/listas/:id/items/:itemId', listController.apiUpdateItem);

export default router;
