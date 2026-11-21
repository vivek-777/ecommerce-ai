'use client';

import React, { useState } from 'react';
import {
  Product,
  sendAgentMessage,
  StoreCity,
} from '@/lib/api';

const STORE_CITIES: StoreCity[] = [
  'hyderabad',
  'bengaluru',
  'mumbai',
  'delhi',
];

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  recommendations?: Product[];
}

interface ShoppingAgentChatProps {
  defaultStore?: StoreCity;
}

export function ShoppingAgentChat({
  defaultStore = 'bengaluru',
}: ShoppingAgentChatProps) {
  const [storeId, setStoreId] = useState<StoreCity>(defaultStore);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userTurn: ChatTurn = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userTurn]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const res = await sendAgentMessage({
        message: trimmed,
        storeId,
      });

      const assistantTurn: ChatTurn = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        text: res.reply,
        recommendations: res.recommendations,
      };

      setMessages((prev) => [...prev, assistantTurn]);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to reach shopping agent'
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h3>Shopping Assistant</h3>

      <div>
        <label htmlFor="agent-store">Active Store Hub: </label>
        <select
          id="agent-store"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value as StoreCity)}
        >
          {STORE_CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      <div>
        {messages.length === 0 && (
          <p>
            Ask about product availability across <strong>{storeId}</strong>,{' '}
            <strong>hyderabad</strong>, <strong>bengaluru</strong>, or{' '}
            <strong>mumbai</strong>.
          </p>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            <p>
              <strong>{msg.role === 'user' ? 'You' : 'Agent'}:</strong>{' '}
              {msg.text}
            </p>

            {msg.recommendations && msg.recommendations.length > 0 && (
              <ul>
                {msg.recommendations.map((item) => {
                  const inv = item.storeInventory?.find(
                    (entry) => entry.storeId === storeId
                  );
                  return (
                    <li key={item.id}>
                      <strong>{item.name}</strong> — ₹{item.price}
                      {inv ? ` (${inv.status}, qty: ${inv.quantity})` : ''}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Ask about stock or products..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !input.trim()}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}