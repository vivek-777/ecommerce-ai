import { Router } from 'express';
import {
  getProductById,
  getProducts,
  getStores,
  updateProductInventory,
} from '../controllers/catalogController';

const router = Router();

router.get('/stores', getStores);
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.patch('/products/:id/inventory', updateProductInventory);

export default router;