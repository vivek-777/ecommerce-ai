import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getCurrentUser,
  login,
  signup,
  updatePreferredStore,
} from '../controllers/authController';

const router = Router();

router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.get('/auth/me', requireAuth, getCurrentUser);
router.patch('/auth/preferred-store', requireAuth, updatePreferredStore);

export default router;