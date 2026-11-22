import { Order } from '../models/Order';
import { IProduct, Product } from '../models/Product';
import { StoreCity } from '../models/Store';
import { computeStockStatus } from '../utils/inventory';
import {
  FulfillmentStage,
  GST_RATE,
  INITIAL_FULFILLMENT_STAGE,
} from '../constants/order';

export interface CustomerInput {
  fullName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  pincode: string;
}

export interface OrderItemInput {
  productId: string;
  storeId: StoreCity;
  quantity: number;
}

export class OrderDomainError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'OrderDomainError';
  }
}

export async function createOrderRecord(input: {
  customer: CustomerInput;
  items: OrderItemInput[];
}) {
  const { customer, items } = input;
  const resolvedItems: {
    productId: string;
    productName: string;
    storeId: StoreCity;
    quantity: number;
    unitPrice: number;
  }[] = [];

  let subtotal = 0;

  for (const item of items) {
    const product = (await Product.findOne({
      id: item.productId,
    }).lean()) as IProduct | null;
    if (!product) {
      throw new OrderDomainError(404, `Product ${item.productId} not found`);
    }

    const storeStock = product.storeInventory[item.storeId];
    if (!storeStock || storeStock.quantity < item.quantity) {
      throw new OrderDomainError(
        409,
        `Insufficient stock for ${product.name} at ${item.storeId} store`
      );
    }

    const nextQty = storeStock.quantity - item.quantity;
    await Product.updateOne(
      { id: item.productId },
      {
        $set: {
          [`storeInventory.${item.storeId}`]: {
            quantity: nextQty,
            status: computeStockStatus(nextQty),
          },
        },
      }
    );

    subtotal += product.price * item.quantity;
    resolvedItems.push({
      productId: product.id,
      productName: product.name,
      storeId: item.storeId,
      quantity: item.quantity,
      unitPrice: product.price,
    });
  }

  const gstAmount = Math.round(subtotal * GST_RATE);
  const totalAmount = subtotal + gstAmount;
  const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

  return await Order.create({
    orderId,
    customer,
    items: resolvedItems,
    subtotal,
    gstAmount,
    totalAmount,
    fulfillmentStage: INITIAL_FULFILLMENT_STAGE,
  });
}

export async function findOrderById(rawOrderId: string) {
  const orderId = rawOrderId.trim().toUpperCase();
  const order = await Order.findOne({ orderId }).lean();
  if (!order) {
    throw new OrderDomainError(404, 'Order not found');
  }
  return order;
}

export async function updateOrderFulfillmentStage(
  rawOrderId: string,
  fulfillmentStage: FulfillmentStage
) {
  const orderId = rawOrderId.trim().toUpperCase();
  const updatedOrder = await Order.findOneAndUpdate(
    { orderId },
    { fulfillmentStage },
    { new: true }
  ).lean();

  if (!updatedOrder) {
    throw new OrderDomainError(404, 'Order not found');
  }

  return updatedOrder;
}