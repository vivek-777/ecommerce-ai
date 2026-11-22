'use client';

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { useStore } from '@/context/StoreContext';
import { useCart } from '@/context/CartContext';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import {
  AgentHistoryItem,
  AgentRecommendationItem,
  sendAgentMessage,
  StoreCity,
} from '@/lib/api';
import { Product as StoreProduct, StockStatus } from '@/types/store';

const VALID_CITIES: StoreCity[] = [
  'hyderabad',
  'bengaluru',
  'mumbai',
  'delhi',
];

interface Message {
  id: string;
  sender: 'agent' | 'user';
  text: string;
  recommendations?: AgentRecommendationItem[];
}

interface ShoppingAgentDrawerProps {
  open: boolean;
  onClose: () => void;
}

function toCartProduct(
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
      if (entry && VALID_CITIES.includes(entry.storeId)) {
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

export default function ShoppingAgentDrawer({
  open,
  onClose,
}: ShoppingAgentDrawerProps) {
  const { selectedStore, activeStoreInfo } = useStore();
  const { addToCart } = useCart();

  const resolvedStoreId: StoreCity = VALID_CITIES.includes(
    (activeStoreInfo?.id ?? selectedStore) as StoreCity
  )
    ? ((activeStoreInfo?.id ?? selectedStore) as StoreCity)
    : 'bengaluru';

  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'agent',
      text: 'Hi! I am your OmniStore AI assistant. Ask me about live product stock, prices in ₹, or availability across Hyderabad, Bengaluru, Mumbai, and Delhi.',
    },
  ]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || sending) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: trimmed,
    };

    const history: AgentHistoryItem[] = messages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setSending(true);
    setErrorMsg(null);

    try {
      const res = await sendAgentMessage({
        message: trimmed,
        storeId: resolvedStoreId,
        history,
      });

      const replyMsg: Message = {
        id: `a-${Date.now() + 1}`,
        sender: 'agent',
        text: res.reply,
        recommendations: res.recommendations,
      };

      setMessages((prev) => [...prev, replyMsg]);
    } catch (err: unknown) {
      const messageText =
        err instanceof Error ? err.message : 'Failed to reach shopping agent';
      setErrorMsg(messageText);
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now() + 2}`,
          sender: 'agent',
          text: `Sorry, I couldn't complete that request right now: ${messageText}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 410 },
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          },
        },
      }}
    >
      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1.5,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'flex-start' }}
        >
          <SmartToyIcon color="secondary" />
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, textAlign: 'left' }}
          >
            AI Shopping Agent
          </Typography>
        </Stack>

        <IconButton onClick={onClose} aria-label="Close AI Agent Drawer">
          <CloseIcon />
        </IconButton>
      </Stack>

      <Alert severity="info" sx={{ mb: 2, fontWeight: 500 }}>
        Connected to {activeStoreInfo?.cityLabel || resolvedStoreId.toUpperCase()} Store Hub.
      </Alert>

      <Divider sx={{ mb: 2 }} />

      {/* Messages List */}
      <Stack
        spacing={1.5}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          mb: 2,
          pr: 0.5,
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <Box
              key={msg.id}
              sx={{
                maxWidth: '90%',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  bgcolor: isUser ? 'primary.main' : 'grey.100',
                  color: isUser ? 'common.white' : 'text.primary',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isUser ? 500 : 400,
                    textAlign: isUser ? 'right' : 'left',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.text}
                </Typography>
              </Paper>

              {!isUser && msg.recommendations && msg.recommendations.length > 0 && (
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {msg.recommendations.map((item) => {
                    const arrayInv = Array.isArray(item.storeInventory)
                      ? item.storeInventory.find(
                          (entry) => entry.storeId === resolvedStoreId
                        )
                      : undefined;

                    const qty =
                      typeof item.quantity === 'number'
                        ? item.quantity
                        : (arrayInv?.quantity ?? 0);

                    const itemStore = item.storeId ?? resolvedStoreId;

                    return (
                      <Paper
                        key={`${item.id}-${itemStore}`}
                        variant="outlined"
                        sx={{ p: 1.25, bgcolor: 'background.paper' }}
                      >
                        <Stack
                          direction="row"
                          sx={{
                            justifyContent: 'space-between',
                            alignItems: 'center',
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
                              {itemStore.toUpperCase()} ({qty} units)
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

                          <Chip
                            size="small"
                            label={qty > 0 ? 'In Stock' : 'Out of Stock'}
                            color={qty > 0 ? 'success' : 'default'}
                          />
                        </Stack>

                        {qty > 0 && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AddShoppingCartIcon />}
                            sx={{ mt: 1, fontWeight: 600 }}
                            onClick={() =>
                              addToCart(
                                toCartProduct(item, itemStore, qty),
                                itemStore,
                                1
                              )
                            }
                          >
                            Add to Cart
                          </Button>
                        )}
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Box>
          );
        })}

        {sending && (
          <Box sx={{ alignSelf: 'flex-start', px: 1 }}>
            <CircularProgress size={20} />
          </Box>
        )}
      </Stack>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 1.5, py: 0.5, fontWeight: 500 }}>
          {errorMsg}
        </Alert>
      )}

      {/* Input Box */}
      <Box component="form" onSubmit={handleSend}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <TextField
            size="small"
            fullWidth
            placeholder="Ask about stock or orders..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={sending}
          />
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            endIcon={<SendIcon />}
            disabled={sending || !prompt.trim()}
            sx={{ fontWeight: 600, textAlign: 'center', minWidth: 92, height: 40 }}
          >
            {sending ? '...' : 'Send'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}