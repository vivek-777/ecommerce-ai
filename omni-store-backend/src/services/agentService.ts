import { generateText, stepCountIs, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { StoreCity } from '../models/Store';
import {
  AGENT_HISTORY_LIMIT,
  AGENT_MAX_STEPS,
  AGENT_MODEL,
  DEFAULT_STORE,
  storeCitySchema,
} from '../constants/agent';
import {
  buildFallbackReply,
  detectsInStockIntent,
  parseMaxPriceFromText,
  RecommendationItem,
  resolveMentionedStore,
  runDeterministicInventorySearch,
} from '../utils/agentInventory';
import { GREETING_REGEX } from '../utils/regex';

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentChatInput {
  message: string;
  storeId?: StoreCity;
  history?: ChatHistoryItem[];
}

export interface AgentChatResult {
  reply: string;
  storeId: StoreCity;
  recommendations: RecommendationItem[];
}

export async function runAgentChat({
  message,
  storeId = DEFAULT_STORE,
  history = [],
}: AgentChatInput): Promise<AgentChatResult> {
  const defaultTargetStore = resolveMentionedStore(message, storeId);

  if (GREETING_REGEX.test(message.trim())) {
    return {
      reply: `Hi! I'm your OmniStore shopping assistant (currently viewing ${defaultTargetStore.toUpperCase()}). Ask me about available products, prices in ₹, or stock across Hyderabad, Bengaluru, Mumbai, and Delhi!`,
      storeId: defaultTargetStore,
      recommendations: [],
    };
  }

  const inferredInStockOnly = detectsInStockIntent(message);
  let resolvedStore: StoreCity = defaultTargetStore;
  let latestRecommendations: RecommendationItem[] = [];

  try {
    const result = await generateText({
      model: google(AGENT_MODEL),
      stopWhen: stepCountIs(AGENT_MAX_STEPS),
      system: `You are the Omni Store shopping assistant across Hyderabad, Bengaluru, Mumbai, and Delhi stores.
          - For greetings, thanks, or general chitchat, reply warmly in 1-2 sentences WITHOUT calling any tools.
          - Only call checkStoreInventory when the user asks about products, prices, stock, availability, or recommendations.
          - When the user asks for "in-stock" or "available" items, set inStockOnly: true so out-of-stock items are excluded.
          - Never invent product names, prices, or stock counts.
          - Default store if the user does not name a city: ${defaultTargetStore}.
          - Keep replies concise, clear, and helpful, mentioning prices in ₹ (INR) and alternative cities if a specific item is out of stock in the selected store.`,
      messages: [
        ...history.slice(-AGENT_HISTORY_LIMIT),
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
            city: storeCitySchema.optional().describe('Target store city'),
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

    return {
      reply: result.text,
      storeId: resolvedStore,
      recommendations: latestRecommendations,
    };
  } catch (aiError) {
    console.warn('Gemini fallback triggered:', aiError);

    const fallbackRecommendations = await runDeterministicInventorySearch(
      message,
      defaultTargetStore,
      {
        maxPrice: parseMaxPriceFromText(message),
        inStockOnly: inferredInStockOnly,
      }
    );

    return {
      reply: buildFallbackReply(
        fallbackRecommendations,
        defaultTargetStore,
        inferredInStockOnly
      ),
      storeId: defaultTargetStore,
      recommendations: fallbackRecommendations,
    };
  }
}