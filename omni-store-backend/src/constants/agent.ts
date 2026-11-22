import { z } from 'zod';
import { StoreCity } from '../models/Store';

export const STORE_CITIES = [
  'hyderabad',
  'bengaluru',
  'mumbai',
  'delhi',
] as const satisfies readonly StoreCity[];

export const DEFAULT_STORE: StoreCity = 'bengaluru';

export const storeCitySchema = z.enum(STORE_CITIES);

export const AGENT_MODEL = 'gemini-3.5-flash-lite';
export const AGENT_MAX_STEPS = 3;
export const AGENT_HISTORY_LIMIT = 8;