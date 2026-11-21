'use client';

import React, { useEffect, useState } from 'react';
import {
  AuthUser,
  fetchCurrentUser,
  fetchProducts,
  fetchStores,
  Product,
  StoreCity,
  StoreHub,
  updatePreferredStore,
} from '@/lib/api';

export function StorefrontCatalog() {
  const [stores, setStores] = useState<StoreHub[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreCity>('bengaluru');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      try {
        const [storesRes, meRes] = await Promise.allSettled([
          fetchStores(),
          fetchCurrentUser(),
        ]);

        if (!active) return;

        if (storesRes.status === 'fulfilled') {
          const list = Array.isArray(storesRes.value)
            ? storesRes.value
            : storesRes.value.stores || [];
          setStores(list);
        }

        if (meRes.status === 'fulfilled' && meRes.value?.user) {
          setUser(meRes.value.user);
          setSelectedStore(meRes.value.user.preferredStore);
        }
      } catch {
        // Ignore initial background fetch errors
      }
    }

    void loadInitial();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetchProducts({ store: selectedStore, search });
        if (!active) return;
        const list = Array.isArray(res) ? res : res.products || [];
        setProducts(list);
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      active = false;
    };
  }, [selectedStore, search]);

  async function handleStoreChange(nextStore: StoreCity) {
    setSelectedStore(nextStore);
    if (user) {
      try {
        const updated = await updatePreferredStore(nextStore);
        setUser(updated.user);
      } catch {
        // Keep UI store selection even if token expired
      }
    }
  }

  return (
    <div>
      <div>
        <label htmlFor="store-select">Store Hub: </label>
        <select
          id="store-select"
          value={selectedStore}
          onChange={(e) => handleStoreChange(e.target.value as StoreCity)}
        >
          {(stores.length > 0
            ? stores
                .map((s) => (s.city || s.id) as StoreCity | undefined)
                .filter((city): city is StoreCity => Boolean(city))
            : (['hyderabad', 'bengaluru', 'mumbai', 'delhi'] as StoreCity[])
          ).map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>

        <input
          type="search"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p role="alert">{error}</p>}
      {loading && <p>Loading products...</p>}

      <ul>
        {products.map((product) => {
          const rawInv = product.storeInventory as unknown;
          const inv = Array.isArray(rawInv)
            ? (rawInv as Product['storeInventory']).find(
                (item) => item.storeId === selectedStore
              )
            : rawInv && typeof rawInv === 'object'
              ? (
                  rawInv as Partial<
                    Record<
                      StoreCity,
                      { quantity?: number; status?: string }
                    >
                  >
                )[selectedStore]
              : undefined;

          return (
            <li key={product.id || product._id}>
              <strong>{product.name}</strong> — ₹{product.price} (
              {inv?.status
                ? `${inv.status}${typeof inv.quantity === 'number' ? ` (${inv.quantity})` : ''}`
                : 'no stock info'}
              )
            </li>
          );
        })}
      </ul>
    </div>
  );
}