import { StockStatus } from '../models/Product';
import { StoreCity } from '../models/Store';

export interface StoreStockEntry {
  quantity: number;
  status: StockStatus;
}

export function computeStockStatus(quantity: number): StockStatus {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= 5) return 'low_stock';
  return 'in_stock';
}

export function getStoreStock(
  storeInventory: Partial<Record<StoreCity, StoreStockEntry>> | undefined,
  storeId: StoreCity
): StoreStockEntry {
  return (
    storeInventory?.[storeId] ?? {
      quantity: 0,
      status: 'out_of_stock',
    }
  );
}