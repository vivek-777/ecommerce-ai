'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Container,
  FormControlLabel,
  Grid,
  InputAdornment,
  LinearProgress,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ProductCard from '@/components/products/ProductCard';
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

export default function ProductsPage() {
  const { selectedStore, activeStoreInfo } = useStore();

  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyAvailableInStore, setOnlyAvailableInStore] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      setLoading(true);
      setApiError(null);

      try {
        const res = await fetchProducts({
          store: selectedStore,
          search: searchQuery,
          category: selectedCategory === 'All' ? undefined : selectedCategory,
        });
        if (!active) return;

        const rawList = Array.isArray(res) ? res : res.products || [];
        if (rawList.length > 0) {
          setProducts(rawList.map(mapApiProduct));
        }
      } catch (err: unknown) {
        if (!active) return;
        setApiError(
          err instanceof Error
            ? err.message
            : 'Using local catalog fallback while backend is unreachable.'
        );
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
  }, [selectedStore, searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category)));
    return ['All', ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.shortDescription.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q);

      const stockQty = product.storeInventory[selectedStore]?.quantity ?? 0;
      const matchesStock = !onlyAvailableInStore || stockQty > 0;

      return matchesCategory && matchesSearch && matchesStock;
    });
  }, [
    products,
    searchQuery,
    selectedCategory,
    onlyAvailableInStore,
    selectedStore,
  ]);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Stack spacing={1} sx={{ mb: 4, textAlign: 'left' }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 800, textAlign: 'left' }}
        >
          Product Catalog
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ fontWeight: 400, textAlign: 'left' }}
        >
          Showing stock status for{' '}
          <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {activeStoreInfo.name}
          </Box>{' '}
          — open any product to inspect all 4 city stores side by side.
        </Typography>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {apiError && (
        <Alert severity="info" sx={{ mb: 3, fontWeight: 500 }}>
          {apiError}
        </Alert>
      )}

      {/* Filters Bar */}
      <Stack
        spacing={2.5}
        sx={{
          mb: 4,
          p: 2.5,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
          }}
        >
          <TextField
            placeholder="Search products by name, feature, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{
              minWidth: { xs: '100%', md: 360 },
              fontWeight: 400,
              textAlign: 'left',
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={onlyAvailableInStore}
                onChange={(e) => setOnlyAvailableInStore(e.target.checked)}
                color="secondary"
              />
            }
            label={`Available in ${activeStoreInfo.cityLabel}`}
            sx={{ '& .MuiFormControlLabel-label': { fontWeight: 600 } }}
          />
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'flex-start' }}
        >
          {categories.map((category) => {
            const active = selectedCategory === category;
            return (
              <Chip
                key={category}
                label={category}
                clickable
                color={active ? 'primary' : 'default'}
                variant={active ? 'filled' : 'outlined'}
                onClick={() => setSelectedCategory(category)}
                sx={{ fontWeight: 600 }}
              />
            );
          })}
        </Stack>
      </Stack>

      {/* Results Count */}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontWeight: 600, textAlign: 'left', mb: 2.5 }}
      >
        {filteredProducts.length}{' '}
        {filteredProducts.length === 1 ? 'product' : 'products'} found
      </Typography>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ fontWeight: 600, textAlign: 'center' }}
          >
            No products match your current filters.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredProducts.map((product) => (
            <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <ProductCard product={product} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}