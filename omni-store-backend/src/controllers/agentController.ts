import { Request, Response } from 'express';
import { generateText, stepCountIs, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { Product } from '../models/Product';
import { StoreCity } from '../models/Store';
import { asyncHandler } from '../utils/asyncHandler';

const VALID_STORES: StoreCity[] = ['hyderabad', 'bengaluru', 'mumbai', 'delhi'];

const agentChatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required'),
  storeId: z
    .enum(['hyderabad', 'bengaluru', 'mumbai', 'delhi'])
    .default('bengaluru'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
});

type RecommendationItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  storeId: StoreCity;
  quantity: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  otherAvailableStores: StoreCity[];
};

async function runDeterministicInventorySearch(
  query: string,
  targetStore: StoreCity,
  maxPrice?: number
): Promise<RecommendationItem[]> {
  const products = await Product.find({}).lean();
  const q = query.trim().toLowerCase();

  let filtered = products.filter((p) => {
    if (typeof maxPrice === 'number' && p.price > maxPrice) {
      return false;
    }
    if (!q) return true;

    const nameMatch = p.name.toLowerCase().includes(q);
    const categoryMatch = p.category.toLowerCase().includes(q);
    const wordMatch = q
      .split(/\W+/)
      .filter((w) => w.length > 2)
      .some(
        (w) =>
          p.name.toLowerCase().includes(w) ||
          p.category.toLowerCase().includes(w)
      );

    return nameMatch || categoryMatch || wordMatch;
  });

  if (filtered.length === 0 && !maxPrice) {
    filtered = products;
  }

  return filtered.slice(0, 4).map((product) => {
    const activeStock = product.storeInventory?.[targetStore] ?? {
      quantity: 0,
      status: 'out_of_stock' as const,
    };

    const otherAvailableStores = VALID_STORES.filter((c) => {
      if (c === targetStore) return false;
      const entry = product.storeInventory?.[c];
      return Boolean(entry && entry.quantity > 0);
    });

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      storeId: targetStore,
      quantity: activeStock.quantity,
      status: activeStock.status,
      otherAvailableStores,
    };
  });
}

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

    const { message, storeId, history = [] } = parsed.data;
    const lower = message.toLowerCase();

    const mentionedStore = VALID_STORES.find((city) => lower.includes(city));
    const defaultTargetStore: StoreCity = mentionedStore || storeId;

    let resolvedStore: StoreCity = defaultTargetStore;
    let latestRecommendations: RecommendationItem[] = [];

    try {
      const result = await generateText({
        model: google('gemini-3.5-flash-lite'),
        stopWhen: stepCountIs(3),
        system: `You are the Omni Store shopping assistant across Hyderabad, Bengaluru, Mumbai, and Delhi stores.
- Always call the checkStoreInventory tool before answering questions about products, prices, or stock.
- Never invent product names, prices, or stock counts.
- Default store if the user does not name a city: ${defaultTargetStore}.
- Keep replies concise, clear, and helpful, mentioning prices in ₹ (INR) and alternative cities if an item is out of stock in the selected store.`,
        messages: [
          ...history.slice(-8),
          { role: 'user', content: message },
        ],
        tools: {
          checkStoreInventory: tool({
            description:
              'Search Omni Store catalog by keyword, category, max price in INR, and target store city',
            inputSchema: z.object({
              query: z
                .string()
                .optional()
                .describe(
                  'Product name or category keyword, e.g. "laptop", "headphones"'
                ),
              maxPrice: z
                .number()
                .optional()
                .describe('Maximum budget in INR'),
              city: z
                .enum(['hyderabad', 'bengaluru', 'mumbai', 'delhi'])
                .optional()
                .describe('Target store city'),
            }),
            execute: async ({ query, maxPrice, city }) => {
              const targetStore: StoreCity = city || defaultTargetStore;
              resolvedStore = targetStore;

              const recommendations = await runDeterministicInventorySearch(
                query ?? '',
                targetStore,
                maxPrice
              );

              latestRecommendations = recommendations;

              return {
                storeId: targetStore,
                recommendations,
              };
            },
          }),
        },
      });

      res.json({
        reply: result.text,
        storeId: resolvedStore,
        recommendations: latestRecommendations,
      });
    } catch (aiError) {
      console.warn('Gemini fallback triggered:', aiError);

      const fallbackRecommendations = await runDeterministicInventorySearch(
        message,
        defaultTargetStore
      );

      const fallbackReply =
        fallbackRecommendations.length > 0
          ? `Here is the live stock check for ${defaultTargetStore.toUpperCase()} across ${fallbackRecommendations.length} item(s): ${fallbackRecommendations
              .map(
                (r) =>
                  `${r.name} (₹${r.price.toLocaleString('en-IN')}) — ${r.quantity} units (${r.status})`
              )
              .join('; ')}.`
          : `No matching products found in the catalog for "${message}" at ${defaultTargetStore}.`;

      res.json({
        reply: fallbackReply,
        storeId: defaultTargetStore,
        recommendations: fallbackRecommendations,
      });
    }
  }
);