import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import {
  fulfillmentStageSchema,
  orderStoreCitySchema,
} from '../constants/order';
import {
  createOrderRecord,
  findOrderById,
  OrderDomainError,
  updateOrderFulfillmentStage,
} from '../services/orderService';

export const createOrderSchema = z.object({
  customer: z.object({
    fullName: z.string().trim().min(2, 'Full name is required'),
    email: z.string().trim().email('Valid email is required'),
    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, 'Valid 10-digit mobile number required'),
    addressLine: z.string().trim().min(5, 'Street address is required'),
    city: z.string().trim().min(2, 'City is required'),
    pincode: z.string().trim().regex(/^\d{6}$/, 'Valid 6-digit pincode required'),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        storeId: orderStoreCitySchema,
        quantity: z.number().int().min(1),
      })
    )
    .min(1, 'At least one cart item is required'),
});

export const updateStageSchema = z.object({
  fulfillmentStage: fulfillmentStageSchema,
});

function handleOrderError(res: Response, err: unknown): boolean {
  if (err instanceof OrderDomainError) {
    res.status(err.statusCode).json({ error: err.message });
    return true;
  }
  return false;
}

export const createOrder = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const order = await createOrderRecord(req.body);
      res.status(201).json({ order });
    } catch (err) {
      if (!handleOrderError(res, err)) throw err;
    }
  }
);

export const getOrderById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const order = await findOrderById(req.params.orderId);
      res.json({ order });
    } catch (err) {
      if (!handleOrderError(res, err)) throw err;
    }
  }
);

export const updateOrderStage = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const order = await updateOrderFulfillmentStage(
        req.params.orderId,
        req.body.fulfillmentStage
      );
      res.json({ order });
    } catch (err) {
      if (!handleOrderError(res, err)) throw err;
    }
  }
);