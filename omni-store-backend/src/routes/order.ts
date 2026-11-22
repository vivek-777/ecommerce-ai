import { Router } from 'express';
import {
  createOrder,
  createOrderSchema,
  getOrderById,
  updateOrderStage,
  updateStageSchema,
} from '../controllers/orderController';
import { validateBody } from '../middleware/validate';

const router = Router();

router.post('/orders', validateBody(createOrderSchema), createOrder);
router.get('/orders/:orderId', getOrderById);
router.patch(
  '/orders/:orderId/stage',
  validateBody(updateStageSchema),
  updateOrderStage
);

export default router;