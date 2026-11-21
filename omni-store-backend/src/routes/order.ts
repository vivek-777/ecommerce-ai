import { Router } from 'express';
import {
  createOrder,
  getOrderById,
  updateOrderStage,
} from '../controllers/orderController';

const router = Router();

router.post('/orders', createOrder);
router.get('/orders/:orderId', getOrderById);
router.patch('/orders/:orderId/stage', updateOrderStage);

export default router;