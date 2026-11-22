import { z } from 'zod';
import { StoreCity } from '../models/Store';

export const STORE_CITIES = [
  'hyderabad',
  'bengaluru',
  'mumbai',
  'delhi',
] as const satisfies readonly StoreCity[];

export const DEFAULT_STORE: StoreCity = 'bengaluru';

export const LOW_STOCK_THRESHOLD = 5;

export const storeCitySchema = z.enum(STORE_CITIES);