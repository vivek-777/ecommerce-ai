import { Request, Response } from 'express';
import { generateText, stepCountIs, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { Product } from '../models/Product';
import { StoreCity } from '../models/Store';
import { asyncHandler } from '../utils/asyncHandler';

const VALID_STORES: StoreCity[] = ['hyderabad', 'bengaluru', 'mumbai', 'delhi'];

const GREETING_REGEX =
  /^(hi|hello|hey|hii+|hola|namaste|good\s*(morning|afternoon|evening)|how\s*are\s*you|what'?s\s*up|sup)[!.?\s]*$/i;

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

const STOP_WORDS = new Set([
  'show',
  'me',
  'the',
  'in',
  'stock',
  'instock',
  'available',
  'products',
  'product',
  'items',
  'item',
  'for',
  'at',
  'from',
  'under',
  'below',
  'less',
  'than',
  'what',
  'which',
  'are',
  'is',
  'have',
  'do',
  'you',
  'can',
  'get',
  'find',
  'list',
  'all',
  'only',
  'please',
  ...VALID_STORES,
]);

function extractSearchKeywords(rawQuery: string): string[] {
  return rawQuery
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));
}

function detectsInStockIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\b(in[\s-]?stock|available|availability)\b/.test(lower) &&
    !/\bout[\s-]?of[\s-]?stock\b/.test(lower)
  );
}

async function runDeterministicInventorySearch(
  query: string,
  targetStore: StoreCity,
  options?: {
    maxPrice?: number;
    inStockOnly?: boolean;
  }
): Promise<RecommendationItem[]> {
  const products = await Product.find({}).lean();
  const keywords = extractSearchKeywords(query);
  const maxPrice = options?.maxPrice;
  const inStockOnly = Boolean(options?.inStockOnly);

  let filtered = products.filter((p) => {
    const activeStock = p.storeInventory?.[targetStore] ?? {
      quantity: 0,
      status: 'out_of_stock' as const,
    };

    if (inStockOnly && activeStock.quantity <= 0) {
      return false;
    }

    if (typeof maxPrice === 'number' && p.price > maxPrice) {
      return false;
    }

    if (keywords.length === 0) {
      return true;
    }

    const nameLower = p.name.toLowerCase();
    const categoryLower = p.category.toLowerCase();
    const descLower = (p.description || '').toLowerCase();

    return keywords.some(
      (kw) =>
        nameLower.includes(kw) ||
        categoryLower.includes(kw) ||
        descLower.includes(kw)
    );
  });

  if (filtered.length === 0 && keywords.length > 0 && !maxPrice && !inStockOnly) {
    filtered = products;
  }

  return filtered.slice(0, 6).map((product) => {
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

    // Handle pure greetings immediately without fetching or showing product cards
    if (GREETING_REGEX.test(message.trim())) {
      res.json({
        reply: `Hi! I'm your OmniStore shopping assistant (currently viewing ${defaultTargetStore.toUpperCase()}). Ask me about available products, prices in ₹, or stock across Hyderabad, Bengaluru, Mumbai, and Delhi!`,
        storeId: defaultTargetStore,
        recommendations: [],
      });
      return;
    }

    const inferredInStockOnly = detectsInStockIntent(message);
    let resolvedStore: StoreCity = defaultTargetStore;
    let latestRecommendations: RecommendationItem[] = [];

    try {
      const result = await generateText({
        model: google('gemini-3.5-flash-lite'),
        stopWhen: stepCountIs(3),
        system: `You are the Omni Store shopping assistant across Hyderabad, Bengaluru, Mumbai, and Delhi stores.
- For greetings, thanks, or general chitchat, reply warmly in 1-2 sentences WITHOUT calling any tools.
- Only call checkStoreInventory when the user asks about products, prices, stock, availability, or recommendations.
- When the user asks for "in-stock" or "available" items, set inStockOnly: true so out-of-stock items are excluded.
- Never invent product names, prices, or stock counts.
- Default store if the user does not name a city: ${defaultTargetStore}.
- Keep replies concise, clear, and helpful, mentioning prices in ₹ (INR) and alternative cities if a specific item is out of stock in the selected store.`,
        messages: [
          ...history.slice(-8),
          { role: 'user', content: message },
        ],
        tools: {
          checkStoreInventory: tool({
            description:
              'Search Omni Store catalog by keyword, category, max price in INR, stock availability, and target store city',
            inputSchema: z.object({
              query: z
                .string()
                .optional()
                .describe(
                  'Product name or category keyword, e.g. "laptop", "headphones". Leave empty when listing all products in a store.'
                ),
              maxPrice: z
                .number()
                .optional()
                .describe('Maximum budget in INR'),
              inStockOnly: z
                .boolean()
                .optional()
                .describe(
                  'Set to true when the user asks only for in-stock or available items'
                ),
              city: z
                .enum(['hyderabad', 'bengaluru', 'mumbai', 'delhi'])
                .optional()
                .describe('Target store city'),
            }),
            execute: async ({ query, maxPrice, inStockOnly, city }) => {
              const targetStore: StoreCity = city || defaultTargetStore;
              resolvedStore = targetStore;

              const recommendations = await runDeterministicInventorySearch(
                query ?? '',
                targetStore,
                {
                  maxPrice,
                  inStockOnly: inStockOnly ?? inferredInStockOnly,
                }
              );

              latestRecommendations = recommendations;

              return {
                storeId: targetStore,
                inStockOnly: inStockOnly ?? inferredInStockOnly,
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

      const priceMatch = lower.match(/(?:under|below|less\s*than)\s*₹?\s*(\d[\d,]*)/);
      const parsedMaxPrice = priceMatch
        ? Number(priceMatch[1].replace(/,/g, ''))
        : undefined;

      const fallbackRecommendations = await runDeterministicInventorySearch(
        message,
        defaultTargetStore,
        {
          maxPrice: parsedMaxPrice,
          inStockOnly: inferredInStockOnly,
        }
      );

      const fallbackReply =
        fallbackRecommendations.length > 0
          ? `Here ${inferredInStockOnly ? 'are the in-stock items' : 'is the stock check'} for ${defaultTargetStore.toUpperCase()} (${fallbackRecommendations.length} item${fallbackRecommendations.length === 1 ? '' : 's'}): ${fallbackRecommendations
              .map(
                (r) =>
                  `${r.name} (₹${r.price.toLocaleString('en-IN')}) — ${r.quantity} units (${r.status})`
              )
              .join('; ')}.`
          : `No ${inferredInStockOnly ? 'in-stock ' : ''}products matched your request in ${defaultTargetStore.toUpperCase()}.`;

      res.json({
        reply: fallbackReply,
        storeId: defaultTargetStore,
        recommendations: fallbackRecommendations,
      });
    }
  }
);