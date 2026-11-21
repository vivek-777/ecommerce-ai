import { Request, Response } from 'express';
import { z } from 'zod';
import { Store, StoreCity } from '../models/Store';
import { Product, StockStatus } from '../models/Product';
import { asyncHandler } from '../utils/asyncHandler';

const VALID_STORES: StoreCity[] = ['hyderabad', 'bengaluru', 'mumbai', 'delhi'];

const updateInventorySchema = z.object({
  storeId: z.enum(['hyderabad', 'bengaluru', 'mumbai', 'delhi']),
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
});

function computeStockStatus(quantity: number): StockStatus {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= 5) return 'low_stock';
  return 'in_stock';
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const getStores = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const stores = await Store.find({}).lean();
    res.json({ stores });
  }
);

export const getProducts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const storeParam = typeof req.query.store === 'string' ? req.query.store : undefined;
    const searchParam =
      typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const categoryParam =
      typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : '';

    const query: Record<string, unknown> = {};
    if (categoryParam && categoryParam !== 'all') {
      query.category = new RegExp(`^${escapeRegex(categoryParam)}$`, 'i');
    }
    if (searchParam) {
      const regex = new RegExp(escapeRegex(searchParam), 'i');
      query.$or = [{ name: regex }, { category: regex }, { description: regex }];
    }

    const products = await Product.find(query).lean();

    const formatted = products.map((product) => {
      const storeFilter =
        storeParam && VALID_STORES.includes(storeParam as StoreCity)
          ? (storeParam as StoreCity)
          : undefined;

      return {
        ...product,
        activeStoreStock: storeFilter
          ? product.storeInventory?.[storeFilter] ?? { quantity: 0, status: 'out_of_stock' }
          : undefined,
      };
    });

    res.json({ products: formatted });
  }
);

export const getProductById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const product = await Product.findOne({ id: req.params.id }).lean();
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json({ product });
  }
);

export const updateProductInventory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const parsed = updateInventorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        issues: parsed.error.issues,
      });
      return;
    }

    const { storeId, quantity } = parsed.data;
    const status = computeStockStatus(quantity);

    const updatedProduct = await Product.findOneAndUpdate(
      { id: req.params.id },
      {
        $set: {
          [`storeInventory.${storeId}`]: { quantity, status },
        },
      },
      { new: true }
    ).lean();

    if (!updatedProduct) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json({ product: updatedProduct });
  }
);