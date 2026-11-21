'use client';

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
import { useStore } from '@/context/StoreContext';

interface Message {
  id: string;
  sender: 'agent' | 'user';
  text: string;
}

interface ShoppingAgentDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function ShoppingAgentDrawer({
  open,
  onClose,
}: ShoppingAgentDrawerProps) {
  const { activeStoreInfo } = useStore();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'agent',
      text: 'Hi! I am your OmniStore AI assistant placeholder. Once your Node.js + Neon DB backend and agent API are connected, I will check live stock across Hyderabad, Bengaluru, Mumbai, and Delhi and help track orders.',
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: trimmed,
    };

    const replyMsg: Message = {
      id: `a-${Date.now() + 1}`,
      sender: 'agent',
      text: `Noted your query for ${activeStoreInfo.name}: "${trimmed}". Agent backend integration is scheduled after the Node.js + Neon DB setup.`,
    };

    setMessages((prev) => [...prev, userMsg, replyMsg]);
    setPrompt('');
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 390 },
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
        UI placeholder active ({activeStoreInfo.cityLabel} Store). Connect agent API later.
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
            <Paper
              key={msg.id}
              elevation={0}
              sx={{
                p: 1.5,
                maxWidth: '88%',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                bgcolor: isUser ? 'primary.main' : 'grey.100',
                color: isUser ? 'common.white' : 'text.primary',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isUser ? 500 : 400,
                  textAlign: isUser ? 'right' : 'left',
                }}
              >
                {msg.text}
              </Typography>
            </Paper>
          );
        })}
      </Stack>

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
          />
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            endIcon={<SendIcon />}
            sx={{ fontWeight: 600, textAlign: 'center', minWidth: 92, height: 40 }}
          >
            Send
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}