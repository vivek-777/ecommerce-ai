'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { STORES } from '@/data/mockProducts';
import {
  fetchCurrentUser,
  fetchStores,
  getAuthToken,
  updatePreferredStore,
} from '@/lib/api';
import { StoreCity, StoreInfo } from '@/types/store';

interface StoreContextValue {
  selectedStore: StoreCity;
  setSelectedStore: (store: StoreCity) => void;
  activeStoreInfo: StoreInfo;
  stores: StoreInfo[];
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [selectedStore, setSelectedStoreState] = useState<StoreCity>('delhi');
  const [stores, setStores] = useState<StoreInfo[]>(STORES);

  useEffect(() => {
    let active = true;

    async function hydrateStoreState() {
      try {
        const storesRes = await fetchStores();
        const remoteStores = Array.isArray(storesRes)
          ? storesRes
          : storesRes.stores || [];

        if (active && remoteStores.length > 0) {
          setStores((prev) =>
            prev.map((localStore) => {
              const match = remoteStores.find(
                (rs) => (rs.id || rs.city) === localStore.id
              );
              return match
                ? {
                    ...localStore,
                    name: match.name || localStore.name,
                    address: match.address || localStore.address,
                  }
                : localStore;
            })
          );
        }
      } catch {
        // Keep local STORES fallback if backend is unreachable
      }

      if (getAuthToken()) {
        try {
          const meRes = await fetchCurrentUser();
          if (active && meRes?.user?.preferredStore) {
            setSelectedStoreState(meRes.user.preferredStore);
          }
        } catch {
          // Ignore invalid/expired token
        }
      }
    }

    void hydrateStoreState();

    return () => {
      active = false;
    };
  }, []);

  const setSelectedStore = useCallback((store: StoreCity) => {
    setSelectedStoreState(store);

    if (getAuthToken()) {
      void updatePreferredStore(store).catch(() => {
        // Keep local store selection even if network/auth sync fails
      });
    }
  }, []);

  const activeStoreInfo = useMemo(
    () => stores.find((s) => s.id === selectedStore) ?? stores[3] ?? stores[0],
    [stores, selectedStore]
  );

  const value = useMemo(
    () => ({
      selectedStore,
      setSelectedStore,
      activeStoreInfo,
      stores,
    }),
    [selectedStore, setSelectedStore, activeStoreInfo, stores]
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}