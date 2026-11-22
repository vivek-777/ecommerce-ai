'use client';

import React, { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import {
  AgentRecommendationItem,
  sendAgentMessage,
  StoreCity,
} from '@/lib/api';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import { useCart } from '@/context/CartContext';
import { Product as StoreProduct, StockStatus } from '@/types/store';

const STORE_CITIES: StoreCity[] = [
  'hyderabad',
  'bengaluru',
  'mumbai',
  'delhi',
];

const STARTER_PROMPTS = [
  'Show available products in this store',
  'What is under ₹2,000?',
  'Check stock in Mumbai',
];

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  recommendations?: AgentRecommendationItem[];
}

interface ShoppingAgentChatProps {
  defaultStore?: StoreCity;
}

function toStoreProduct(
  item: AgentRecommendationItem,
  fallbackStore: StoreCity,
  resolvedQty: number
): StoreProduct {
  const matchedMock =
    MOCK_PRODUCTS.find((p) => p.id === item.id) ?? MOCK_PRODUCTS[0];

  const baseInventory: StoreProduct['storeInventory'] = matchedMock
    ? {
        hyderabad: {
          ...matchedMock.storeInventory.hyderabad,
          storeId: 'hyderabad',
        },
        bengaluru: {
          ...matchedMock.storeInventory.bengaluru,
          storeId: 'bengaluru',
        },
        mumbai: {
          ...matchedMock.storeInventory.mumbai,
          storeId: 'mumbai',
        },
        delhi: {
          ...matchedMock.storeInventory.delhi,
          storeId: 'delhi',
        },
      }
    : {
        hyderabad: { storeId: 'hyderabad', quantity: 0, status: 'out_of_stock' },
        bengaluru: { storeId: 'bengaluru', quantity: 0, status: 'out_of_stock' },
        mumbai: { storeId: 'mumbai', quantity: 0, status: 'out_of_stock' },
        delhi: { storeId: 'delhi', quantity: 0, status: 'out_of_stock' },
      };

  if (Array.isArray(item.storeInventory)) {
    for (const entry of item.storeInventory) {
      if (entry && STORE_CITIES.includes(entry.storeId)) {
        const qty = typeof entry.quantity === 'number' ? entry.quantity : 0;
        const status: StockStatus =
          entry.status ||
          (qty <= 0 ? 'out_of_stock' : qty <= 5 ? 'low_stock' : 'in_stock');
        baseInventory[entry.storeId] = {
          storeId: entry.storeId,
          quantity: qty,
          status,
        };
      }
    }
  } else {
    const targetStore = item.storeId ?? fallbackStore;
    const status: StockStatus =
      item.status ||
      (resolvedQty <= 0
        ? 'out_of_stock'
        : resolvedQty <= 5
          ? 'low_stock'
          : 'in_stock');
    baseInventory[targetStore] = {
      storeId: targetStore,
      quantity: resolvedQty,
      status,
    };
  }

  return {
    ...matchedMock,
    id: item.id,
    slug:
      matchedMock?.slug ||
      item.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') ||
      item.id,
    name: item.name,
    shortDescription:
      item.description ||
      matchedMock?.shortDescription ||
      matchedMock?.description ||
      item.name,
    description:
      item.description ||
      matchedMock?.description ||
      matchedMock?.shortDescription ||
      item.name,
    category: item.category || matchedMock?.category || 'General',
    price: item.price,
    image: item.image || matchedMock?.image || '/images/placeholder.jpg',
    storeInventory: baseInventory,
  };
}

export function ShoppingAgentChat({
  defaultStore = 'bengaluru',
}: ShoppingAgentChatProps) {
  const { addToCart } = useCart();
  const turnCounterRef = useRef(0);

  const [storeId, setStoreId] = useState<StoreCity>(defaultStore);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextTurnId = (suffix: string) => {
    turnCounterRef.current += 1;
    return `turn-${turnCounterRef.current}-${suffix}`;
  };

  async function sendPrompt(promptText: string) {
    const trimmed = promptText.trim();
    if (!trimmed || sending) return;

    const userTurn: ChatTurn = {
      id: nextTurnId('user'),
      role: 'user',
      text: trimmed,
    };

    const history = messages.map((m) => ({
      role: m.role,
      content: m.text,
    }));

    setMessages((prev) => [...prev, userTurn]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const res = await sendAgentMessage({
        message: trimmed,
        storeId,
        history,
      });

      if (res.storeId && STORE_CITIES.includes(res.storeId)) {
        setStoreId(res.storeId);
      }

      const assistantTurn: ChatTurn = {
        id: nextTurnId('assistant'),
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

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    await sendPrompt(input);
  }

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        maxWidth: 720,
        mx: 'auto',
        borderRadius: 2,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <SmartToyIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'left' }}>
            Shopping Assistant
          </Typography>
        </Stack>

        <FormControl size="small" sx={{ minWidth: 190 }}>
          <InputLabel id="agent-store-label">Active Store Hub</InputLabel>
          <Select
            labelId="agent-store-label"
            id="agent-store"
            value={storeId}
            label="Active Store Hub"
            onChange={(e) => setStoreId(e.target.value as StoreCity)}
            startAdornment={
              <StorefrontIcon
                fontSize="small"
                sx={{ mr: 1, color: 'text.secondary' }}
              />
            }
          >
            {STORE_CITIES.map((city) => (
              <MenuItem key={city} value={city}>
                {city.charAt(0).toUpperCase() + city.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Box
        sx={{
          minHeight: 260,
          maxHeight: 420,
          overflowY: 'auto',
          p: 2,
          mb: 2,
          borderRadius: 1.5,
          bgcolor: 'grey.50',
        }}
      >
        {messages.length === 0 ? (
          <Stack spacing={1.5}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: 'left' }}
            >
              Ask about product availability, prices in ₹, or stock across{' '}
              <strong>hyderabad</strong>, <strong>bengaluru</strong>,{' '}
              <strong>mumbai</strong>, and <strong>delhi</strong>.
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              {STARTER_PROMPTS.map((prompt) => (
                <Chip
                  key={prompt}
                  label={prompt}
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => sendPrompt(prompt)}
                />
              ))}
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={2}>
            {messages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '90%',
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    px: 2,
                    py: 1.25,
                    borderRadius: 2,
                    bgcolor:
                      msg.role === 'user' ? 'primary.main' : 'background.paper',
                    color:
                      msg.role === 'user'
                        ? 'primary.contrastText'
                        : 'text.primary',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      fontWeight: 700,
                      opacity: 0.85,
                      mb: 0.25,
                      textAlign: 'left',
                    }}
                  >
                    {msg.role === 'user' ? 'You' : 'Agent'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}
                  >
                    {msg.text}
                  </Typography>
                </Paper>

                {msg.recommendations && msg.recommendations.length > 0 && (
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {msg.recommendations.map((item) => {
                      const arrayInv = Array.isArray(item.storeInventory)
                        ? item.storeInventory.find(
                            (entry) => entry.storeId === storeId
                          )
                        : undefined;

                      const qty =
                        typeof item.quantity === 'number'
                          ? item.quantity
                          : (arrayInv?.quantity ?? 0);

                      const status =
                        item.status ??
                        arrayInv?.status ??
                        (qty > 0 ? 'in_stock' : 'out_of_stock');

                      const itemStore = item.storeId ?? storeId;

                      return (
                        <Paper
                          key={`${item.id}-${itemStore}`}
                          variant="outlined"
                          sx={{ p: 1.5, bgcolor: 'background.paper' }}
                        >
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            sx={{
                              justifyContent: 'space-between',
                              alignItems: { xs: 'flex-start', sm: 'center' },
                              gap: 1,
                            }}
                          >
                            <Box sx={{ textAlign: 'left' }}>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 700, textAlign: 'left' }}
                              >
                                {item.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ textAlign: 'left' }}
                              >
                                ₹{item.price.toLocaleString('en-IN')} •{' '}
                                {itemStore.toUpperCase()} ({status}, qty: {qty})
                              </Typography>
                              {qty === 0 &&
                                item.otherAvailableStores &&
                                item.otherAvailableStores.length > 0 && (
                                  <Typography
                                    variant="caption"
                                    color="warning.main"
                                    sx={{
                                      display: 'block',
                                      fontWeight: 600,
                                      mt: 0.25,
                                    }}
                                  >
                                    Available in:{' '}
                                    {item.otherAvailableStores
                                      .map((s) => s.toUpperCase())
                                      .join(', ')}
                                  </Typography>
                                )}
                            </Box>

                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: 'center' }}
                            >
                              <Chip
                                size="small"
                                label={qty > 0 ? 'In Stock' : 'Out of Stock'}
                                color={qty > 0 ? 'success' : 'default'}
                              />
                              {qty > 0 && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<AddShoppingCartIcon />}
                                  onClick={() =>
                                    addToCart(
                                      toStoreProduct(item, itemStore, qty),
                                      itemStore,
                                      1
                                    )
                                  }
                                  sx={{ fontWeight: 600 }}
                                >
                                  Add
                                </Button>
                              )}
                            </Stack>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            ))}

            {sending && (
              <Box sx={{ alignSelf: 'flex-start', py: 0.5 }}>
                <CircularProgress size={22} />
              </Box>
            )}
          </Stack>
        )}
      </Box>

      {error && (
        <Alert severity="error" role="alert" sx={{ mb: 2, fontWeight: 600 }}>
          {error}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSend}
        sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Ask about stock or products..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <Button
          type="submit"
          variant="contained"
          endIcon={<SendIcon />}
          disabled={sending || !input.trim()}
          sx={{ fontWeight: 700, px: 3, whiteSpace: 'nowrap' }}
        >
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </Box>
    </Paper>
  );
}