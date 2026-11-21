import { Request, Response } from 'express';
import { z } from 'zod';
import { Product } from '../models/Product';
import { StoreCity } from '../models/Store';
import { asyncHandler } from '../utils/asyncHandler';

const VALID_STORES: StoreCity[] = ['hyderabad', 'bengaluru', 'mumbai', 'delhi'];

const agentChatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required'),
  storeId: z.enum(['hyderabad', 'bengaluru', 'mumbai', 'delhi']).default('bengaluru'),
});

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

    const { message, storeId } = parsed.data;
    const lower = message.toLowerCase();

    const mentionedStore = VALID_STORES.find((city) => lower.includes(city));
    const targetStore: StoreCity = mentionedStore || storeId;

    const products = await Product.find({}).lean();

    const matchingProducts = products.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(lower);
      const categoryMatch = p.category.toLowerCase().includes(lower);
      const wordMatch = lower
        .split(/\W+/)
        .filter((w) => w.length > 2)
        .some(
          (w) =>
            p.name.toLowerCase().includes(w) || p.category.toLowerCase().includes(w)
        );
      return nameMatch || categoryMatch || wordMatch;
    });

    const itemsToReport = matchingProducts.length > 0 ? matchingProducts : products;

    const recommendations = itemsToReport.slice(0, 4).map((product) => {
      const activeStock = product.storeInventory?.[targetStore] ?? {
        quantity: 0,
        status: 'out_of_stock' as const,
      };

      const otherAvailableStores = VALID_STORES.filter((city) => {
        if (city === targetStore) return false;
        const entry = product.storeInventory?.[city];
        return entry && entry.quantity > 0;
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

    const reply =
      recommendations.length > 0
        ? `Here is the live stock check for ${targetStore.toUpperCase()} across ${recommendations.length} item(s): ${recommendations
            .map(
              (r) =>
                `${r.name} (₹${r.price.toLocaleString('en-IN')}) — ${r.quantity} units (${r.status})`
            )
            .join('; ')}.`
        : `No matching products found in the catalog for "${message}" at ${targetStore}.`;

    res.json({
      reply,
      storeId: targetStore,
      recommendations,
    });
  }
);