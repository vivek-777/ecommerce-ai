'use client';

import React, { useEffect, useState } from 'react';
import {
  AuthUser,
  fetchCurrentUser,
  loginUser,
  setAuthToken,
  signupUser,
  StoreCity,
  updatePreferredStore,
} from '@/lib/api';

const STORE_CITIES: StoreCity[] = [
  'hyderabad',
  'bengaluru',
  'mumbai',
  'delhi',
];

interface AuthPanelProps {
  onAuthChange?: (user: AuthUser | null) => void;
}

export function AuthPanel({ onAuthChange }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredStore, setPreferredStore] = useState<StoreCity>('bengaluru');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const res = await fetchCurrentUser();
        if (!active) return;
        setUser(res.user);
        setPreferredStore(res.user.preferredStore);
        onAuthChange?.(res.user);
      } catch {
        if (!active) return;
        setAuthToken(null);
        setUser(null);
        onAuthChange?.(null);
      }
    }

    void restoreSession();

    return () => {
      active = false;
    };
  }, [onAuthChange]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const authRes =
        mode === 'signup'
          ? await signupUser({ fullName, email, password, preferredStore })
          : await loginUser({ email, password });

      setUser(authRes.user);
      setPreferredStore(authRes.user.preferredStore);
      onAuthChange?.(authRes.user);
      setPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStoreUpdate(nextStore: StoreCity) {
    setPreferredStore(nextStore);
    setError(null);
    if (!user) return;

    try {
      const updated = await updatePreferredStore(nextStore);
      setUser(updated.user);
      onAuthChange?.(updated.user);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Could not update preferred store'
      );
    }
  }

  function handleLogout() {
    setAuthToken(null);
    setUser(null);
    onAuthChange?.(null);
  }

  if (user) {
    return (
      <div>
        <p>
          Signed in as <strong>{user.name}</strong> ({user.email})
        </p>

        <div>
          <label htmlFor="auth-preferred-store">Preferred Store: </label>
          <select
            id="auth-preferred-store"
            value={preferredStore}
            onChange={(e) => handleStoreUpdate(e.target.value as StoreCity)}
          >
            {STORE_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <button type="button" onClick={handleLogout}>
          Log out
        </button>

        {error && <p role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div>
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError(null);
          }}
          disabled={mode === 'login'}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setError(null);
          }}
          disabled={mode === 'signup'}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <div>
            <label htmlFor="auth-name">Full Name</label>
            <input
              id="auth-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
        )}

        <div>
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {mode === 'signup' && (
          <div>
            <label htmlFor="auth-store">Preferred Store</label>
            <select
              id="auth-store"
              value={preferredStore}
              onChange={(e) => setPreferredStore(e.target.value as StoreCity)}
            >
              {STORE_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" disabled={submitting}>
          {submitting
            ? 'Please wait...'
            : mode === 'signup'
              ? 'Create Account'
              : 'Login'}
        </button>

        {error && <p role="alert">{error}</p>}
      </form>
    </div>
  );
}