'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CartItem, Product, StoreCity } from '@/types/store';

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addToCart: (product: Product, storeId: StoreCity, quantity?: number) => {
    ok: boolean;
    message?: string;
  };
  removeFromCart: (productId: string, storeId: StoreCity) => void;
  updateQuantity: (productId: string, storeId: StoreCity, quantity: number) => void;
  clearCart: () => void;
}

const CART_STORAGE_KEY = 'omnistore_cart';

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota errors
    }
  }, [items]);

  const addToCart = useCallback(
    (product: Product, storeId: StoreCity, quantity = 1) => {
      const available = product.storeInventory[storeId]?.quantity ?? 0;
      if (available <= 0) {
        return {
          ok: false,
          message: 'This item is out of stock at the selected store.',
        };
      }

      setItems((prev) => {
        const existingIndex = prev.findIndex(
          (i) => i.product.id === product.id && i.storeId === storeId
        );

        if (existingIndex > -1) {
          const updated = [...prev];
          const nextQty = Math.min(
            updated[existingIndex].quantity + quantity,
            available
          );
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: nextQty,
          };
          return updated;
        }

        return [
          ...prev,
          { product, storeId, quantity: Math.min(quantity, available) },
        ];
      });

      return { ok: true };
    },
    []
  );

  const removeFromCart = useCallback(
    (productId: string, storeId: StoreCity) => {
      setItems((prev) =>
        prev.filter(
          (i) => !(i.product.id === productId && i.storeId === storeId)
        )
      );
    },
    []
  );

  const updateQuantity = useCallback(
    (productId: string, storeId: StoreCity, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(productId, storeId);
        return;
      }
      setItems((prev) =>
        prev.map((i) => {
          if (i.product.id === productId && i.storeId === storeId) {
            const maxStock =
              i.product.storeInventory[storeId]?.quantity ?? quantity;
            return { ...i, quantity: Math.min(quantity, maxStock) };
          }
          return i;
        })
      );
    },
    [removeFromCart]
  );

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      totalItems,
      subtotal,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    }),
    [items, totalItems, subtotal, addToCart, removeFromCart, updateQuantity, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}