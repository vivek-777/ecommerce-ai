import { Schema, model, models } from 'mongoose';
import { StoreCity } from './Store';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface StoreStockEntry {
  quantity: number;
  status: StockStatus;
}

export interface IProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  imageUrl: string;
  storeInventory: Record<StoreCity, StoreStockEntry>;
}

const StockEntrySchema = new Schema<StoreStockEntry>(
  {
    quantity: { type: Number, required: true, min: 0, default: 0 },
    status: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      required: true,
      default: 'out_of_stock',
    },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    storeInventory: {
      hyderabad: { type: StockEntrySchema, required: true },
      bengaluru: { type: StockEntrySchema, required: true },
      mumbai: { type: StockEntrySchema, required: true },
      delhi: { type: StockEntrySchema, required: true },
    },
  },
  { timestamps: true }
);

export const Product = models.Product || model<IProduct>('Product', ProductSchema);