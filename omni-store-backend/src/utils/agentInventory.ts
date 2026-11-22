import { Product } from '../models/Product';
import { StoreCity } from '../models/Store';
import { getStoreStock } from './inventory';
import { VALID_STORES } from './store';

export type RecommendationItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  storeId: StoreCity;
  quantity: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  otherAvailableStores: StoreCity[];
};

const STOP_WORDS = new Set([
  'show',
  'me',
  'the',
  'in',
  'stock',
  'instock',
  'available',
  'products',
  'product',
  'items',
  'item',
  'for',
  'at',
  'from',
  'under',
  'below',
  'less',
  'than',
  'what',
  'which',
  'are',
  'is',
  'have',
  'do',
  'you',
  'can',
  'get',
  'find',
  'list',
  'all',
  'only',
  'please',
  ...VALID_STORES,
]);

export function extractSearchKeywords(rawQuery: string): string[] {
  return rawQuery
    .toLowerCase()
    .split(/\W+/)
    .filter(
      (word) => word.length > 2 && !STOP_WORDS.has(word) && !/^\d+$/.test(word)
    );
}

export function detectsInStockIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\b(in[\s-]?stock|available|availability)\b/.test(lower) &&
    !/\bout[\s-]?of[\s-]?stock\b/.test(lower)
  );
}

export function resolveMentionedStore(
  text: string,
  fallbackStore: StoreCity
): StoreCity {
  const lower = text.toLowerCase();
  return VALID_STORES.find((city) => lower.includes(city)) || fallbackStore;
}

export function parseMaxPriceFromText(text: string): number | undefined {
  const priceMatch = text
    .toLowerCase()
    .match(/(?:under|below|less\s*than)\s*₹?\s*(\d[\d,]*)/);
  return priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : undefined;
}

export async function runDeterministicInventorySearch(
  query: string,
  targetStore: StoreCity,
  options?: {
    maxPrice?: number;
    inStockOnly?: boolean;
  }
): Promise<RecommendationItem[]> {
  const products = await Product.find({}).lean();
  const keywords = extractSearchKeywords(query);
  const maxPrice = options?.maxPrice;
  const inStockOnly = Boolean(options?.inStockOnly);

  let filtered = products.filter((p) => {
    const activeStock = getStoreStock(p.storeInventory, targetStore);

    if (inStockOnly && activeStock.quantity <= 0) {
      return false;
    }

    if (typeof maxPrice === 'number' && p.price > maxPrice) {
      return false;
    }

    if (keywords.length === 0) {
      return true;
    }

    const nameLower = p.name.toLowerCase();
    const categoryLower = p.category.toLowerCase();
    const descLower = (p.description || '').toLowerCase();

    return keywords.some(
      (kw) =>
        nameLower.includes(kw) ||
        categoryLower.includes(kw) ||
        descLower.includes(kw)
    );
  });

  if (filtered.length === 0 && keywords.length > 0 && !maxPrice && !inStockOnly) {
    filtered = products;
  }

  return filtered.slice(0, 6).map((product) => {
    const activeStock = getStoreStock(product.storeInventory, targetStore);

    const otherAvailableStores = VALID_STORES.filter((c) => {
      if (c === targetStore) return false;
      const entry = getStoreStock(product.storeInventory, c);
      return entry.quantity > 0;
    });

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      storeId: targetStore,
      quantity: activeStock.quantity,
      status: activeStock.status,
      otherAvailableStores,
    };
  });
}

export function buildFallbackReply(
  recommendations: RecommendationItem[],
  targetStore: StoreCity,
  inStockOnly: boolean
): string {
  if (recommendations.length === 0) {
    return `No ${inStockOnly ? 'in-stock ' : ''}products matched your request in ${targetStore.toUpperCase()}.`;
  }

  return `Here ${inStockOnly ? 'are the in-stock items' : 'is the stock check'} for ${targetStore.toUpperCase()} (${recommendations.length} item${recommendations.length === 1 ? '' : 's'}): ${recommendations
    .map(
      (r) =>
        `${r.name} (₹${r.price.toLocaleString('en-IN')}) — ${r.quantity} units (${r.status})`
    )
    .join('; ')}.`;
}