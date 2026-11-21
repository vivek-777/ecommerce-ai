import { Product, StockStatus, StoreCity, StoreInfo } from '@/types/store';

export const STORES: StoreInfo[] = [
  {
    id: 'hyderabad',
    name: 'OmniStore Hyderabad',
    cityLabel: 'Hyderabad',
    address: 'Banjara Hills, Road No. 12, Hyderabad',
  },
  {
    id: 'bengaluru',
    name: 'OmniStore Bengaluru',
    cityLabel: 'Bengaluru',
    address: 'Indiranagar, 100 Feet Road, Bengaluru',
  },
  {
    id: 'mumbai',
    name: 'OmniStore Mumbai',
    cityLabel: 'Mumbai',
    address: 'Bandra West, Linking Road, Mumbai',
  },
  {
    id: 'delhi',
    name: 'OmniStore Delhi',
    cityLabel: 'Delhi',
    address: 'Connaught Place, Inner Circle, New Delhi',
  },
];

export function getStockStatus(quantity: number): StockStatus {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= 5) return 'low_stock';
  return 'in_stock';
}

function createInventory(
  counts: Record<StoreCity, number>
): Product['storeInventory'] {
  return {
    hyderabad: {
      storeId: 'hyderabad',
      quantity: counts.hyderabad,
      status: getStockStatus(counts.hyderabad),
    },
    bengaluru: {
      storeId: 'bengaluru',
      quantity: counts.bengaluru,
      status: getStockStatus(counts.bengaluru),
    },
    mumbai: {
      storeId: 'mumbai',
      quantity: counts.mumbai,
      status: getStockStatus(counts.mumbai),
    },
    delhi: {
      storeId: 'delhi',
      quantity: counts.delhi,
      status: getStockStatus(counts.delhi),
    },
  };
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    slug: 'wireless-anc-headphones',
    name: 'AeroSound Pro ANC Headphones',
    category: 'Audio',
    price: 7999,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    shortDescription: 'Active noise cancellation with 40-hour battery life.',
    description:
      'Over-ear wireless headphones with hybrid active noise cancellation, multipoint Bluetooth, and fast USB-C charging.',
    storeInventory: createInventory({
      hyderabad: 18,
      bengaluru: 3,
      mumbai: 0,
      delhi: 12,
    }),
  },
  {
    id: 'prod-2',
    slug: 'mechanical-keychron-style-keyboard',
    name: 'KeyCraft 75% Mechanical Keyboard',
    category: 'Peripherals',
    price: 5499,
    image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=800&q=80',
    shortDescription: 'Hot-swappable tactile switches with aluminum frame.',
    description:
      'Compact 75% wireless mechanical keyboard supporting Windows, macOS, and Linux with per-key white backlight.',
    storeInventory: createInventory({
      hyderabad: 0,
      bengaluru: 14,
      mumbai: 4,
      delhi: 9,
    }),
  },
  {
    id: 'prod-3',
    slug: 'smart-fitness-watch-x2',
    name: 'PulseTrack X2 Smart Watch',
    category: 'Wearables',
    price: 4299,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    shortDescription: 'AMOLED display, GPS tracking, and 7-day battery.',
    description:
      'Lightweight smartwatch with heart-rate and SpO2 sensors, workout auto-detection, and water resistance.',
    storeInventory: createInventory({
      hyderabad: 6,
      bengaluru: 0,
      mumbai: 11,
      delhi: 2,
    }),
  },
  {
    id: 'prod-4',
    slug: 'usb-c-gaN-fast-charger-100w',
    name: 'VoltCore 100W GaN 3-Port Charger',
    category: 'Accessories',
    price: 2999,
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&q=80',
    shortDescription: 'Charge laptop, tablet, and phone simultaneously.',
    description:
      'Compact Gallium Nitride desktop and travel adapter with dual USB-C PD ports and one USB-A port.',
    storeInventory: createInventory({
      hyderabad: 22,
      bengaluru: 19,
      mumbai: 8,
      delhi: 0,
    }),
  },
];