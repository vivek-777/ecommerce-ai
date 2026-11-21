import { Request, Response } from 'express';
import { z } from 'zod';
import { Order } from '../models/Order';
import { Product, StockStatus } from '../models/Product';
import { StoreCity } from '../models/Store';
import { asyncHandler } from '../utils/asyncHandler';

const createOrderSchema = z.object({
  customer: z.object({
    fullName: z.string().trim().min(2, 'Full name is required'),
    email: z.string().trim().email('Valid email is required'),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Valid 10-digit mobile number required'),
    addressLine: z.string().trim().min(5, 'Street address is required'),
    city: z.string().trim().min(2, 'City is required'),
    pincode: z.string().trim().regex(/^\d{6}$/, 'Valid 6-digit pincode required'),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        storeId: z.enum(['hyderabad', 'bengaluru', 'mumbai', 'delhi']),
        quantity: z.number().int().min(1),
      })
    )
    .min(1, 'At least one cart item is required'),
});

const updateStageSchema = z.object({
  fulfillmentStage: z.enum([
    'Order Placed',
    'Packed at Store',
    'Out for Delivery',
    'Delivered',
  ]),
});

function computeStockStatus(quantity: number): StockStatus {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= 5) return 'low_stock';
  return 'in_stock';
}

export const createOrder = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        issues: parsed.error.issues,
      });
      return;
    }

    const { customer, items } = parsed.data;
    const resolvedItems: {
      productId: string;
      productName: string;
      storeId: StoreCity;
      quantity: number;
      unitPrice: number;
    }[] = [];

    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findOne({ id: item.productId });
      if (!product) {
        res.status(404).json({ error: `Product ${item.productId} not found` });
        return;
      }

      const storeStock = product.storeInventory[item.storeId];
      if (!storeStock || storeStock.quantity < item.quantity) {
        res.status(409).json({
          error: `Insufficient stock for ${product.name} at ${item.storeId} store`,
        });
        return;
      }

      const nextQty = storeStock.quantity - item.quantity;
      product.storeInventory[item.storeId] = {
        quantity: nextQty,
        status: computeStockStatus(nextQty),
      };
      await product.save();

      subtotal += product.price * item.quantity;
      resolvedItems.push({
        productId: product.id,
        productName: product.name,
        storeId: item.storeId,
        quantity: item.quantity,
        unitPrice: product.price,
      });
    }

    const gstAmount = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + gstAmount;
    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    const createdOrder = await Order.create({
      orderId,
      customer,
      items: resolvedItems,
      subtotal,
      gstAmount,
      totalAmount,
      fulfillmentStage: 'Order Placed',
    });

    res.status(201).json({ order: createdOrder });
  }
);

export const getOrderById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const orderId = req.params.orderId.trim().toUpperCase();
    const order = await Order.findOne({ orderId }).lean();
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json({ order });
  }
);

export const updateOrderStage = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const parsed = updateStageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        issues: parsed.error.issues,
      });
      return;
    }

    const orderId = req.params.orderId.trim().toUpperCase();
    const updatedOrder = await Order.findOneAndUpdate(
      { orderId },
      { fulfillmentStage: parsed.data.fulfillmentStage },
      { new: true }
    ).lean();

    if (!updatedOrder) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json({ order: updatedOrder });
  }
);