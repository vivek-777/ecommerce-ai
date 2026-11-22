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

export const CHECK_STORE_INVENTORY_DESCRIPTION =
  'Search Omni Store catalog by keyword, category, max price in INR, stock availability, and target store city';

export function buildGreetingReply(store: StoreCity): string {
  return `Hi! I'm your OmniStore shopping assistant (currently viewing ${store.toUpperCase()}). Ask me about available products, prices in ₹, or stock across Hyderabad, Bengaluru, Mumbai, and Delhi!`;
}

export function buildAgentSystemPrompt(defaultStore: StoreCity): string {
  return `You are the Omni Store shopping assistant across Hyderabad, Bengaluru, Mumbai, and Delhi stores.
          - For greetings, thanks, or general chitchat, reply warmly in 1-2 sentences WITHOUT calling any tools.
          - Only call checkStoreInventory when the user asks about products, prices, stock, availability, or recommendations.
          - When the user asks for "in-stock" or "available" items, set inStockOnly: true so out-of-stock items are excluded.
          - Never invent product names, prices, or stock counts.
          - Default store if the user does not name a city: ${defaultStore}.
          - Keep replies concise, clear, and helpful, mentioning prices in ₹ (INR) and alternative cities if a specific item is out of stock in the selected store.`;
}