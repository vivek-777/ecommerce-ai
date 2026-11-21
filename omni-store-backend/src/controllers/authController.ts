import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { IUser, User } from '../models/User';
import { hashPassword, signAuthToken, verifyPassword } from '../utils/auth';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

type LeanUser = Omit<IUser, 'passwordHash'> & {
  _id: Types.ObjectId;
};

const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  preferredStore: z
    .enum(['hyderabad', 'bengaluru', 'mumbai', 'delhi'])
    .default('bengaluru'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const updateStoreSchema = z.object({
  preferredStore: z.enum(['hyderabad', 'bengaluru', 'mumbai', 'delhi']),
});

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

    const { fullName, preferredStore, email, password } = parsed.data;

    const existing = await User.findOne({ email }).lean().exec();
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = hashPassword(password);

    const user = await User.create({
      fullName,
      email,
      passwordHash,
      preferredStore,
    });

    const token = signAuthToken({
      userId: user._id.toString(),
      email: user.email,
      preferredStore: user.preferredStore,
    });

    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        name: user.fullName,
        email: user.email,
        preferredStore: user.preferredStore,
      },
    });
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

    const { email, password } = parsed.data;

    const user = await User.findOne({ email }).exec();
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signAuthToken({
      userId: user._id.toString(),
      email: user.email,
      preferredStore: user.preferredStore,
    });

    res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.fullName,
        email: user.email,
        preferredStore: user.preferredStore,
      },
    });
  }
);

export const getCurrentUser = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await User.findById(userId)
      .select('-passwordHash')
      .lean<LeanUser | null>()
      .exec();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user._id.toString(),
        name: user.fullName,
        email: user.email,
        preferredStore: user.preferredStore,
      },
    });
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

    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { preferredStore: parsed.data.preferredStore },
      { new: true }
    )
      .select('-passwordHash')
      .lean<LeanUser | null>()
      .exec();

    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        email: updatedUser.email,
        preferredStore: updatedUser.preferredStore,
      },
    });
  }
);