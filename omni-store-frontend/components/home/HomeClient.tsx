'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import Link from '@/components/common/Link';
import ProductCard from '@/components/products/ProductCard';
import ShoppingAgentDrawer from '@/components/agents/ShoppingAgentDrawer';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import { useStore } from '@/context/StoreContext';
import { fetchProducts, Product as ApiProduct } from '@/lib/api';
import { Product, StockStatus, StoreCity } from '@/types/store';

const ALL_STORES: StoreCity[] = ['hyderabad', 'bengaluru', 'mumbai', 'delhi'];

function normalizeStoreInventory(
  rawInv: ApiProduct['storeInventory'] | Product['storeInventory'] | undefined,
  fallbackProduct?: Product
): Product['storeInventory'] {
  const base: Product['storeInventory'] = fallbackProduct?.storeInventory
    ? {
        hyderabad: {
          ...fallbackProduct.storeInventory.hyderabad,
          storeId: 'hyderabad',
        },
        bengaluru: {
          ...fallbackProduct.storeInventory.bengaluru,
          storeId: 'bengaluru',
        },
        mumbai: {
          ...fallbackProduct.storeInventory.mumbai,
          storeId: 'mumbai',
        },
        delhi: {
          ...fallbackProduct.storeInventory.delhi,
          storeId: 'delhi',
        },
      }
    : {
        hyderabad: { storeId: 'hyderabad', quantity: 0, status: 'out_of_stock' },
        bengaluru: { storeId: 'bengaluru', quantity: 0, status: 'out_of_stock' },
        mumbai: { storeId: 'mumbai', quantity: 0, status: 'out_of_stock' },
        delhi: { storeId: 'delhi', quantity: 0, status: 'out_of_stock' },
      };

  if (!rawInv) return base;

  if (Array.isArray(rawInv)) {
    for (const entry of rawInv) {
      if (entry && ALL_STORES.includes(entry.storeId)) {
        const qty = typeof entry.quantity === 'number' ? entry.quantity : 0;
        const status: StockStatus =
          entry.status ||
          (qty <= 0 ? 'out_of_stock' : qty <= 5 ? 'low_stock' : 'in_stock');
        base[entry.storeId] = { storeId: entry.storeId, quantity: qty, status };
      }
    }
    return base;
  }

  if (typeof rawInv === 'object') {
    for (const city of ALL_STORES) {
      const entry = (
        rawInv as Partial<
          Record<
            StoreCity,
            { storeId?: StoreCity; quantity?: number; status?: StockStatus }
          >
        >
      )[city];
      if (entry && typeof entry.quantity === 'number') {
        base[city] = {
          storeId: city,
          quantity: entry.quantity,
          status:
            entry.status ||
            (entry.quantity <= 0
              ? 'out_of_stock'
              : entry.quantity <= 5
                ? 'low_stock'
                : 'in_stock'),
        };
      }
    }
  }

  return base;
}

function mapApiProduct(item: ApiProduct, index: number): Product {
  const matchedMock =
    MOCK_PRODUCTS.find((p) => p.id === item.id) ??
    MOCK_PRODUCTS[index % MOCK_PRODUCTS.length];

  return {
    ...matchedMock,
    id: item.id || matchedMock.id,
    name: item.name || matchedMock.name,
    shortDescription:
      item.description || matchedMock.shortDescription || matchedMock.description,
    description:
      item.description || matchedMock.description || matchedMock.shortDescription,
    category: item.category || matchedMock.category,
    price: typeof item.price === 'number' ? item.price : matchedMock.price,
    image: item.image || matchedMock.image,
    storeInventory: normalizeStoreInventory(item.storeInventory, matchedMock),
  };
}

export default function HomeClient() {
  const { stores, selectedStore, setSelectedStore, activeStoreInfo } = useStore();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>(() =>
    MOCK_PRODUCTS.slice(0, 3)
  );
  const [agentOpen, setAgentOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadFeatured() {
      try {
        const res = await fetchProducts({ store: selectedStore });
        if (!active) return;
        const rawList = Array.isArray(res) ? res : res.products || [];
        if (rawList.length > 0) {
          setFeaturedProducts(rawList.slice(0, 3).map(mapApiProduct));
        }
      } catch {
        // Keep MOCK_PRODUCTS fallback when backend is offline
      }
    }

    void loadFeatured();

    return () => {
      active = false;
    };
  }, [selectedStore]);

  return (
    <Box sx={{ pb: 8 }}>
      {/* Hero Banner */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'primary.main',
          color: 'common.white',
          py: { xs: 6, md: 8 },
          borderRadius: 0,
        }}
      >
        <Container maxWidth="lg">
          <Stack
            spacing={2.5}
            sx={{ alignItems: 'flex-start', textAlign: 'left', maxWidth: 720 }}
          >
            <Chip
              icon={<StorefrontIcon />}
              label={`Active Store: ${activeStoreInfo.name}`}
              color="secondary"
              sx={{ fontWeight: 600, color: 'common.white' }}
            />

            <Typography
              variant="h3"
              component="h1"
              sx={{ fontWeight: 800, textAlign: 'left' }}
            >
              Multi-City Shopping Across Hyderabad, Bengaluru, Mumbai & Delhi
            </Typography>

            <Typography
              variant="h6"
              sx={{
                fontWeight: 400,
                textAlign: 'left',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              Check live store stock counts, spot low-stock items before checkout,
              and shop seamlessly with built-in readiness for Razorpay and AI Agent
              assistance.
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ pt: 1, alignItems: 'stretch' }}
            >
              <Button
                component={Link}
                href="/products"
                variant="contained"
                color="secondary"
                size="large"
                sx={{ fontWeight: 700, textAlign: 'center' }}
              >
                Browse Products
              </Button>
              <Button
                variant="contained"
                color="inherit"
                size="large"
                startIcon={<SmartToyIcon />}
                onClick={() => setAgentOpen(true)}
                sx={{
                  fontWeight: 700,
                  textAlign: 'center',
                  color: 'primary.main',
                }}
              >
                Ask AI Agent
              </Button>
              <Button
                component={Link}
                href="/orders/ORD-1001"
                variant="outlined"
                color="inherit"
                size="large"
                sx={{ fontWeight: 600, textAlign: 'center' }}
              >
                Track Sample Order
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Paper>

      {/* 4 Store Quick Switcher */}
      <Container maxWidth="lg" sx={{ mt: 5 }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ fontWeight: 700, textAlign: 'left', mb: 2 }}
        >
          Our 4 Retail Hubs
        </Typography>

        <Grid container spacing={2.5}>
          {stores.map((store) => {
            const isSelected = store.id === selectedStore;
            return (
              <Grid key={store.id} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card
                  elevation={isSelected ? 4 : 1}
                  sx={{
                    height: '100%',
                    border: isSelected ? '2px solid' : '1px solid',
                    borderColor: isSelected ? 'secondary.main' : 'divider',
                  }}
                >
                  <CardContent sx={{ textAlign: 'left' }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, textAlign: 'left' }}
                    >
                      {store.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: 400, textAlign: 'left', mt: 0.5, mb: 2 }}
                    >
                      {store.address}
                    </Typography>
                    <Button
                      size="small"
                      variant={isSelected ? 'contained' : 'outlined'}
                      color={isSelected ? 'secondary' : 'primary'}
                      onClick={() => setSelectedStore(store.id)}
                      sx={{ fontWeight: 600, textAlign: 'center' }}
                    >
                      {isSelected ? 'Selected Store' : `Set ${store.cityLabel}`}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Featured Products */}
        <Box sx={{ mt: 6 }}>
          <Stack
            direction="row"
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2.5,
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, textAlign: 'left' }}
            >
              Featured Products
            </Typography>
            <Button
              component={Link}
              href="/products"
              variant="text"
              sx={{ fontWeight: 600, textAlign: 'right' }}
            >
              View All Products →
            </Button>
          </Stack>

          <Grid container spacing={3}>
            {featuredProducts.map((product) => (
              <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <ProductCard product={product} />
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* AI Agent Live Status Notice */}
        <Paper
          variant="outlined"
          sx={{
            mt: 6,
            p: 3,
            bgcolor: 'background.paper',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <SmartToyIcon color="secondary" fontSize="large" />
              <Box sx={{ textAlign: 'left' }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, textAlign: 'left' }}
                >
                  AI Shopping Agent Connected
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontWeight: 400, textAlign: 'left' }}
                >
                  Query live store stock across Hyderabad, Bengaluru, Mumbai, and
                  Delhi, get product recommendations, and track orders via your
                  OmniStore backend.
                </Typography>
              </Box>
            </Stack>

            <Button
              variant="contained"
              color="secondary"
              startIcon={<SmartToyIcon />}
              onClick={() => setAgentOpen(true)}
              sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              Open AI Assistant
            </Button>
          </Stack>
        </Paper>
      </Container>

      <ShoppingAgentDrawer
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
      />
    </Box>
  );
}