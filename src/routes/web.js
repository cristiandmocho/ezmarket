import { Router } from 'express';
import * as homeController from '../controllers/homeController.js';
import * as searchController from '../controllers/searchController.js';
import * as productController from '../controllers/productController.js';
import * as authController from '../controllers/authController.js';

const router = Router();

router.get('/', homeController.index);
router.get('/search', searchController.index);
router.get('/product/:slug', productController.show);

router.get('/login', authController.loginPage);
router.post('/login', authController.loginSubmit);
router.get('/login/google', authController.loginGoogle);
router.get('/login/microsoft', authController.loginMicrosoft);

export default router;
