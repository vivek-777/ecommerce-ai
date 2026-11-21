'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  fetchCurrentUser,
  getAuthToken,
  loginUser,
  setAuthToken,
  signupUser,
} from '@/lib/api';
import { useStore } from '@/context/StoreContext';
import { StoreCity, User } from '@/types/store';

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    name: string,
    email: string,
    password: string,
    preferredStore?: StoreCity
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const { selectedStore, setSelectedStore } = useStore();

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!getAuthToken()) return;

      try {
        const res = await fetchCurrentUser();
        if (!active || !res?.user) return;

        setUser({
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
        });

        if (res.user.preferredStore) {
          setSelectedStore(res.user.preferredStore);
        }
      } catch {
        if (!active) return;
        setAuthToken(null);
        setUser(null);
      }
    }

    void restoreSession();

    return () => {
      active = false;
    };
  }, [setSelectedStore]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await loginUser({ email, password });
      setUser({
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
      });
      if (res.user.preferredStore) {
        setSelectedStore(res.user.preferredStore);
      }
    },
    [setSelectedStore]
  );

  const signup = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      preferredStore?: StoreCity
    ) => {
      const storeToSave = preferredStore ?? selectedStore;
      const res = await signupUser({
        fullName: name,
        email,
        password,
        preferredStore: storeToSave,
      });
      setUser({
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
      });
      setSelectedStore(res.user.preferredStore ?? storeToSave);
    },
    [selectedStore, setSelectedStore]
  );

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, signup, logout }),
    [user, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}