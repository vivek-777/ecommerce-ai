import { Request, Response } from 'express';
import { z } from 'zod';
import { DEFAULT_STORE, storeCitySchema } from '../constants/agent';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import {
  AuthDomainError,
  getUserProfile,
  loginUser,
  signupUser,
  updateUserPreferredStore,
} from '../services/authService';

const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  preferredStore: storeCitySchema.default(DEFAULT_STORE),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const updateStoreSchema = z.object({
  preferredStore: storeCitySchema,
});

function handleAuthError(res: Response, err: unknown): boolean {
  if (err instanceof AuthDomainError) {
    res.status(err.statusCode).json({ error: err.message });
    return true;
  }
  return false;
}

export const signup = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        issues: parsed.error.issues,
      });
      return;
    }

    try {
      const payload = await signupUser(parsed.data);
      res.status(201).json(payload);
    } catch (err) {
      if (!handleAuthError(res, err)) throw err;
    }
  }
);

export const login = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        issues: parsed.error.issues,
      });
      return;
    }

    try {
      const payload = await loginUser(parsed.data);
      res.json(payload);
    } catch (err) {
      if (!handleAuthError(res, err)) throw err;
    }
  }
);

export const getCurrentUser = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const payload = await getUserProfile(req.user?.userId);
      res.json(payload);
    } catch (err) {
      if (!handleAuthError(res, err)) throw err;
    }
  }
);

export const updatePreferredStore = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const parsed = updateStoreSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        issues: parsed.error.issues,
      });
      return;
    }

    try {
      const payload = await updateUserPreferredStore(
        req.user?.userId,
        parsed.data.preferredStore
      );
      res.json(payload);
    } catch (err) {
      if (!handleAuthError(res, err)) throw err;
    }
  }
);