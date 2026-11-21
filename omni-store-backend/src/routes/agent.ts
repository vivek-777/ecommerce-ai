import { Router } from 'express';
import { chatWithAgent } from '../controllers/agentController';

const router = Router();

router.post('/agent/chat', chatWithAgent);

export default router;