import { Schema, model, models } from 'mongoose';
import { StoreCity } from './Store';

export interface IOrderItem {
  productId: string;
  productName: string;
  storeId: StoreCity;
  quantity: number;
  unitPrice: number;
}

export interface IOrder {
  orderId: string;
  customer: {
    fullName: string;
    email: string;
    phone: string;
    addressLine: string;
    city: string;
    pincode: string;
  };
  items: IOrderItem[];
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  fulfillmentStage: 'Order Placed' | 'Packed at Store' | 'Out for Delivery' | 'Delivered';
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    storeId: {
      type: String,
      enum: ['hyderabad', 'bengaluru', 'mumbai', 'delhi'],
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    customer: {
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine: { type: String, required: true },
      city: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    gstAmount: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    fulfillmentStage: {
      type: String,
      enum: ['Order Placed', 'Packed at Store', 'Out for Delivery', 'Delivered'],
      default: 'Order Placed',
    },
  },
  { timestamps: true }
);

export const Order = models.Order || model<IOrder>('Order', OrderSchema);