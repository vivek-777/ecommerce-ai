import { tool } from 'ai';
import { z } from 'zod';
import { StoreCity } from '../models/Store';
import {
  CHECK_STORE_INVENTORY_DESCRIPTION,
  storeCitySchema,
} from '../constants/agent';
import {
  RecommendationItem,
  runDeterministicInventorySearch,
} from './agentInventory';

export const checkStoreInventoryInputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe(
      'Product name or category keyword, e.g. "laptop", "headphones". Leave empty when listing all products in a store.'
    ),
  maxPrice: z.number().optional().describe('Maximum budget in INR'),
  inStockOnly: z
    .boolean()
    .optional()
    .describe(
      'Set to true when the user asks only for in-stock or available items'
    ),
  city: storeCitySchema.optional().describe('Target store city'),
});

export function createCheckStoreInventoryTool(params: {
  defaultTargetStore: StoreCity;
  inferredInStockOnly: boolean;
  onStoreResolved: (store: StoreCity) => void;
  onRecommendationsUpdated: (items: RecommendationItem[]) => void;
}) {
  const {
    defaultTargetStore,
    inferredInStockOnly,
    onStoreResolved,
    onRecommendationsUpdated,
  } = params;

  return tool({
    description: CHECK_STORE_INVENTORY_DESCRIPTION,
    inputSchema: checkStoreInventoryInputSchema,
    execute: async ({ query, maxPrice, inStockOnly, city }) => {
      const targetStore: StoreCity = city || defaultTargetStore;
      const effectiveInStockOnly = inStockOnly ?? inferredInStockOnly;

      onStoreResolved(targetStore);

      const recommendations = await runDeterministicInventorySearch(
        query ?? '',
        targetStore,
        {
          maxPrice,
          inStockOnly: effectiveInStockOnly,
        }
      );

      onRecommendationsUpdated(recommendations);

      return {
        storeId: targetStore,
        inStockOnly: effectiveInStockOnly,
        recommendations,
      };
    },
  });
}