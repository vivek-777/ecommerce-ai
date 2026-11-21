'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import Link from '@/components/common/Link';
import StoreInventorySelector from '@/components/products/StoreInventorySelector';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import { useStore } from '@/context/StoreContext';
import { useCart } from '@/context/CartContext';
import { fetchProductById, Product as ApiProduct } from '@/lib/api';
import { Product, StockStatus, StoreCity, StoreInfo } from '@/types/store';

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

function mapApiProduct(item: ApiProduct, fallback?: Product): Product {
  const base = fallback ?? MOCK_PRODUCTS[0];
  return {
    ...base,
    id: item.id || base.id,
    name: item.name || base.name,
    shortDescription:
      item.description || base.shortDescription || base.description,
    description: item.description || base.description || base.shortDescription,
    category: item.category || base.category,
    price: typeof item.price === 'number' ? item.price : base.price,
    image: item.image || base.image,
    storeInventory: normalizeStoreInventory(item.storeInventory, base),
  };
}

interface ProductDetailsContentProps {
  product: Product;
  initialStore: StoreCity;
  stores: StoreInfo[];
}

function ProductDetailsContent({
  product,
  initialStore,
  stores,
}: ProductDetailsContentProps) {
  const router = useRouter();
  const { setSelectedStore } = useStore();
  const { addToCart } = useCart();

  const [chosenStore, setChosenStore] = useState<StoreCity>(initialStore);
  const [quantity, setQuantity] = useState<number>(1);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const activeInventory = product.storeInventory[chosenStore] ?? {
    quantity: 0,
    status: 'out_of_stock' as StockStatus,
  };
  const maxAvailable = activeInventory.quantity;
  const isOutOfStock = maxAvailable <= 0;
  const chosenStoreObj =
    stores.find((s) => s.id === chosenStore) ?? stores[0];

  const handleStoreChange = (storeId: StoreCity) => {
    setChosenStore(storeId);
    setSelectedStore(storeId);
    setQuantity(1);
  };

  const handleAddToCart = () => {
    const result = addToCart(product, chosenStore, quantity);
    if (!result.ok) {
      setFeedback({
        open: true,
        message: result.message || 'Unable to add item to cart.',
        severity: 'error',
      });
      return;
    }
    setFeedback({
      open: true,
      message: `Added ${quantity} × ${product.name} from ${chosenStoreObj.cityLabel} Store to cart.`,
      severity: 'success',
    });
  };

  const handleBuyNow = () => {
    const result = addToCart(product, chosenStore, quantity);
    if (result.ok) {
      router.push('/cart');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Button
        component={Link}
        href="/products"
        startIcon={<ArrowBackIcon />}
        sx={{ fontWeight: 600, textAlign: 'left', mb: 3 }}
      >
        Back to Catalog
      </Button>

      <Grid container spacing={4}>
        {/* Product Image */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper
            elevation={2}
            sx={{
              overflow: 'hidden',
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Box
              component="img"
              src={product.image}
              alt={product.name}
              sx={{
                width: '100%',
                height: { xs: 300, md: 420 },
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </Paper>
        </Grid>

        {/* Product Info & 4-Store Selector */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack
            spacing={1.5}
            sx={{ textAlign: 'left', alignItems: 'flex-start' }}
          >
            <Chip
              label={product.category}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />

            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 800, textAlign: 'left' }}
            >
              {product.name}
            </Typography>

            <Typography
              variant="h5"
              color="primary.main"
              sx={{ fontWeight: 700, textAlign: 'left' }}
            >
              ₹{product.price.toLocaleString('en-IN')}
            </Typography>

            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontWeight: 400, textAlign: 'left' }}
            >
              {product.description}
            </Typography>
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          {/* 4-Store Availability & Selector */}
          <StoreInventorySelector
            product={product}
            chosenStore={chosenStore}
            onSelectStore={handleStoreChange}
          />

          {/* Quantity & Purchase Actions */}
          <Paper
            variant="outlined"
            sx={{ mt: 3, p: 2.5, bgcolor: 'background.paper' }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ textAlign: 'left' }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontWeight: 500, textAlign: 'left' }}
                >
                  Buying From
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, textAlign: 'left' }}
                >
                  {chosenStoreObj.name} ({maxAvailable} in stock)
                </Typography>
              </Box>

              {/* Quantity Stepper */}
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', justifyContent: 'flex-start' }}
              >
                <IconButton
                  size="small"
                  disabled={isOutOfStock || quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  sx={{ border: '1px solid', borderColor: 'divider' }}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>

                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    textAlign: 'center',
                    minWidth: 32,
                  }}
                >
                  {isOutOfStock ? 0 : quantity}
                </Typography>

                <IconButton
                  size="small"
                  disabled={isOutOfStock || quantity >= maxAvailable}
                  onClick={() =>
                    setQuantity((q) => Math.min(maxAvailable, q + 1))
                  }
                  aria-label="Increase quantity"
                  sx={{ border: '1px solid', borderColor: 'divider' }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ mt: 2.5, alignItems: 'stretch' }}
            >
              <Button
                variant="outlined"
                size="large"
                fullWidth
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                sx={{ fontWeight: 700, textAlign: 'center' }}
              >
                {isOutOfStock ? 'Out of Stock at Store' : 'Add to Cart'}
              </Button>

              <Button
                variant="contained"
                color="secondary"
                size="large"
                fullWidth
                disabled={isOutOfStock}
                startIcon={<ShoppingCartCheckoutIcon />}
                onClick={handleBuyNow}
                sx={{ fontWeight: 700, textAlign: 'center' }}
              >
                Buy Now
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={feedback.open}
        autoHideDuration={3500}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={feedback.severity}
          variant="filled"
          sx={{ fontWeight: 600 }}
          onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

function ProductDetailsLoader() {
  const params = useParams<{ id: string }>();
  const { selectedStore, stores } = useStore();

  const mockMatch = useMemo(
    () => MOCK_PRODUCTS.find((p) => p.id === params.id),
    [params.id]
  );

  const [remoteProduct, setRemoteProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    if (!params.id) return;

    async function loadProduct() {
      setLoading(true);
      try {
        const res = await fetchProductById(params.id);
        if (!active) return;
        const raw: ApiProduct = 'product' in res ? res.product : res;
        if (raw && (raw.id || raw.name)) {
          setRemoteProduct(mapApiProduct(raw, mockMatch));
        } else {
          setRemoteProduct(null);
        }
      } catch {
        if (active) {
          setRemoteProduct(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProduct();

    return () => {
      active = false;
    };
  }, [params.id, mockMatch]);

  const product =
    remoteProduct && remoteProduct.id === params.id ? remoteProduct : mockMatch;

  const initialStore = useMemo<StoreCity>(() => {
    if (!product) return selectedStore;
    if ((product.storeInventory[selectedStore]?.quantity ?? 0) > 0) {
      return selectedStore;
    }
    const firstAvailable = stores.find(
      (s) => (product.storeInventory[s.id]?.quantity ?? 0) > 0
    );
    return firstAvailable ? firstAvailable.id : selectedStore;
  }, [product, selectedStore, stores]);

  if (!product && !loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ fontWeight: 700, textAlign: 'center' }}
        >
          Product Not Found
        </Typography>
        <Button
          component={Link}
          href="/products"
          variant="contained"
          sx={{ fontWeight: 600, textAlign: 'center', mt: 2 }}
        >
          Back to Products
        </Button>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <ProductDetailsContent
      key={`${product.id}-${initialStore}`}
      product={product}
      initialStore={initialStore}
      stores={stores}
    />
  );
}

export default function ProductDetailsPage() {
  return (
    <Suspense
      fallback={
        <Container maxWidth="lg" sx={{ py: 6 }}>
          <LinearProgress />
        </Container>
      }
    >
      <ProductDetailsLoader />
    </Suspense>
  );
}