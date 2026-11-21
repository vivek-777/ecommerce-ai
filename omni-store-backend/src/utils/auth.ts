import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { StoreCity } from '../models/Store.js';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  preferredStore: StoreCity;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalKey] = storedHash.split(':');
  if (!salt || !originalKey) return false;

  const derivedBuffer = crypto.scryptSync(password, salt, 64);
  const originalBuffer = Buffer.from(originalKey, 'hex');

  if (derivedBuffer.length !== originalBuffer.length) return false;
  return crypto.timingSafeEqual(derivedBuffer, originalBuffer);
}

export function signAuthToken(payload: AuthTokenPayload): string {
  const secret = process.env.JWT_SECRET || 'dev_omnistore_jwt_secret';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}