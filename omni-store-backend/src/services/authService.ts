import { Types } from 'mongoose';
import { IUser, User } from '../models/User';
import { StoreCity } from '../models/Store';
import { DEFAULT_STORE } from '../constants/agent';
import { hashPassword, signAuthToken, verifyPassword } from '../utils/auth';
import { formatUserResponse } from '../utils/formatters';

type LeanUser = Omit<IUser, 'passwordHash'> & {
  _id: Types.ObjectId;
};

export interface SignupInput {
  fullName: string;
  preferredStore?: StoreCity;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthDomainError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AuthDomainError';
  }
}

export async function signupUser({
  fullName,
  preferredStore = DEFAULT_STORE,
  email,
  password,
}: SignupInput) {
  const existing = await User.findOne({ email }).lean().exec();
  if (existing) {
    throw new AuthDomainError(409, 'An account with this email already exists');
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

  return {
    token,
    user: formatUserResponse(user),
  };
}

export async function loginUser({ email, password }: LoginInput) {
  const user = await User.findOne({ email }).exec();
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new AuthDomainError(401, 'Invalid email or password');
  }

  const token = signAuthToken({
    userId: user._id.toString(),
    email: user.email,
    preferredStore: user.preferredStore,
  });

  return {
    token,
    user: formatUserResponse(user),
  };
}

export async function getUserProfile(userId?: string) {
  if (!userId) {
    throw new AuthDomainError(401, 'Unauthorized');
  }

  const user = await User.findById(userId)
    .select('-passwordHash')
    .lean<LeanUser | null>()
    .exec();

  if (!user) {
    throw new AuthDomainError(404, 'User not found');
  }

  return {
    user: formatUserResponse(user),
  };
}

export async function updateUserPreferredStore(
  userId: string | undefined,
  preferredStore: StoreCity
) {
  if (!userId) {
    throw new AuthDomainError(401, 'Unauthorized');
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { preferredStore },
    { new: true }
  )
    .select('-passwordHash')
    .lean<LeanUser | null>()
    .exec();

  if (!updatedUser) {
    throw new AuthDomainError(404, 'User not found');
  }

  return {
    user: formatUserResponse(updatedUser),
  };
}