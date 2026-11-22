import { Request, Response } from 'express';
import { z } from 'zod';
import { storeCitySchema } from '../constants/agent';
import { asyncHandler } from '../utils/asyncHandler';
import {
  CatalogDomainError,
  findProductById,
  listProducts,
  listStores,
  setProductInventory,
} from '../services/catalogService';

const updateInventorySchema = z.object({
  storeId: storeCitySchema,
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
});

function handleCatalogError(res: Response, err: unknown): boolean {
  if (err instanceof CatalogDomainError) {
    res.status(err.statusCode).json({ error: err.message });
    return true;
  }
  return false;
}

export const getStores = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const stores = await listStores();
    res.json({ stores });
  }
);

export const getProducts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const products = await listProducts({
      store: req.query.store,
      search: req.query.search,
      category: req.query.category,
    });
    res.json({ products });
  }
);

export const getProductById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const product = await findProductById(req.params.id);
      res.json({ product });
    } catch (err) {
      if (!handleCatalogError(res, err)) throw err;
    }
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

    try {
      const product = await setProductInventory(
        req.params.id,
        parsed.data.storeId,
        parsed.data.quantity
      );
      res.json({ product });
    } catch (err) {
      if (!handleCatalogError(res, err)) throw err;
    }
  }
);