import { z } from 'zod';
import { StoreCity } from '../models/Store';

export const VALID_STORES: StoreCity[] = [
  'hyderabad',
  'bengaluru',
  'mumbai',
  'delhi',
];

export const storeCitySchema = z.enum([
  'hyderabad',
  'bengaluru',
  'mumbai',
  'delhi',
]);

export function isValidStoreCity(value: unknown): value is StoreCity {
  return typeof value === 'string' && VALID_STORES.includes(value as StoreCity);
}