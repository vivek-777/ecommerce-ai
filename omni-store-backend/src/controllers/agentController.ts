import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { DEFAULT_STORE, storeCitySchema } from '../constants/agent';
import { runAgentChat } from '../services/agentService';

const agentChatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required'),
  storeId: storeCitySchema.default(DEFAULT_STORE),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
});

export const chatWithAgent = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const parsed = agentChatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        issues: parsed.error.issues,
      });
      return;
    }

    const result = await runAgentChat(parsed.data);
    res.json(result);
  }
);