import { Store, StoreCity } from '../models/Store';
import { Product } from '../models/Product';
import { computeStockStatus, getStoreStock } from '../utils/inventory';
import { escapeRegex } from '../utils/regex';
import { isValidStoreCity } from '../utils/store';

export interface GetProductsQuery {
  store?: unknown;
  search?: unknown;
  category?: unknown;
}

export class CatalogDomainError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'CatalogDomainError';
  }
}

export async function listStores() {
  return Store.find({}).lean();
}

export async function listProducts({
  store,
  search,
  category,
}: GetProductsQuery) {
  const storeParam = typeof store === 'string' ? store : undefined;
  const searchParam =
    typeof search === 'string' ? search.trim().toLowerCase() : '';
  const categoryParam =
    typeof category === 'string' ? category.trim().toLowerCase() : '';

  const query: Record<string, unknown> = {};
  if (categoryParam && categoryParam !== 'all') {
    query.category = new RegExp(`^${escapeRegex(categoryParam)}$`, 'i');
  }
  if (searchParam) {
    const regex = new RegExp(escapeRegex(searchParam), 'i');
    query.$or = [{ name: regex }, { category: regex }, { description: regex }];
  }

  const products = await Product.find(query).lean();
  const storeFilter: StoreCity | undefined = isValidStoreCity(storeParam)
    ? storeParam
    : undefined;

  return products.map((product) => ({
    ...product,
    activeStoreStock: storeFilter
      ? getStoreStock(product.storeInventory, storeFilter)
      : undefined,
  }));
}

export async function findProductById(productId: string) {
  const product = await Product.findOne({ id: productId }).lean();
  if (!product) {
    throw new CatalogDomainError(404, 'Product not found');
  }
  return product;
}

export async function setProductInventory(
  productId: string,
  storeId: StoreCity,
  quantity: number
) {
  const status = computeStockStatus(quantity);

  const updatedProduct = await Product.findOneAndUpdate(
    { id: productId },
    {
      $set: {
        [`storeInventory.${storeId}`]: { quantity, status },
      },
    },
    { new: true }
  ).lean();

  if (!updatedProduct) {
    throw new CatalogDomainError(404, 'Product not found');
  }

  return updatedProduct;
}