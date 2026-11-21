'use client';

import React, { useSyncExternalStore } from 'react';
import {
  AppBar,
  Badge,
  Box,
  Button,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import Link from '@/components/common/Link';
import { useStore } from '@/context/StoreContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { StoreCity } from '@/types/store';

const emptySubscribe = () => () => {};

export default function Navbar() {
  const { selectedStore, setSelectedStore, stores } = useStore();
  const { totalItems } = useCart();
  const { user, logout } = useAuth();

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const effectiveStore = isClient ? selectedStore : (stores[0]?.id ?? 'bengaluru');
  const effectiveUser = isClient ? user : null;

  return (
    <AppBar position="sticky" color="inherit" elevation={1}>
      <Toolbar sx={{ gap: 2, flexWrap: 'wrap', py: 1 }}>
        <Typography
          variant="h6"
          component={Link}
          href="/"
          sx={{ textDecoration: 'none', color: 'primary.main', fontWeight: 700, mr: 2 }}
        >
          OmniStore
        </Typography>

        <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
          <Button component={Link} href="/" color="inherit">
            Home
          </Button>
          <Button component={Link} href="/products" color="inherit">
            Products
          </Button>
          <Button component={Link} href="/orders/ORD-1001" color="inherit">
            Track Order
          </Button>
        </Stack>

        {/* City Store Selector */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorefrontOutlinedIcon fontSize="small" color="secondary" />
          <FormControl size="small" sx={{ minWidth: 145 }}>
            <Select
              value={effectiveStore}
              onChange={(e) => setSelectedStore(e.target.value as StoreCity)}
              aria-label="Select store city"
            >
              {stores.map((store) => (
                <MenuItem key={store.id} value={store.id}>
                  {store.cityLabel} Store
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Future AI Agent Hook */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<SmartToyOutlinedIcon />}
          onClick={() => alert('AI Shopping Agent will be connected in a future step!')}
        >
          AI Agent
        </Button>

        {/* Cart Button */}
        <IconButton component={Link} href="/cart" color="inherit" aria-label="Cart">
          <Badge badgeContent={isClient ? totalItems : 0} color="secondary">
            <ShoppingCartOutlinedIcon />
          </Badge>
        </IconButton>

        {/* Auth Actions */}
        {effectiveUser ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {effectiveUser.name}
            </Typography>
            <Button size="small" variant="outlined" onClick={logout}>
              Logout
            </Button>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button component={Link} href="/login" size="small" variant="text">
              Login
            </Button>
            <Button component={Link} href="/signup" size="small" variant="contained">
              Sign Up
            </Button>
          </Stack>
        )}
      </Toolbar>
    </AppBar>
  );
}