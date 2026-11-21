export type StoreCity = 'hyderabad' | 'bengaluru' | 'mumbai' | 'delhi';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface StoreInfo {
  id: StoreCity;
  name: string;
  cityLabel: string;
  address: string;
}

export interface StoreStockItem {
  storeId: StoreCity;
  quantity: number;
  status: StockStatus;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  image: string;
  shortDescription: string;
  description: string;
  storeInventory: Record<StoreCity, StoreStockItem>;
}

export interface CartItem {
  product: Product;
  storeId: StoreCity;
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
}