'use client';

import React, {
  Suspense,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import SearchIcon from '@mui/icons-material/Search';
import Link from '@/components/common/Link';
import { useStore } from '@/context/StoreContext';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import {
  fetchOrderById,
  FulfillmentStage,
  OrderRecord,
  updateOrderStage,
} from '@/lib/api';
import { CartItem, StoreCity } from '@/types/store';

interface TrackedOrder {
  orderId: string;
  customer: {
    fullName: string;
    email: string;
    phone: string;
    addressLine: string;
    city: string;
    pincode: string;
  };
  items: CartItem[];
  totalAmount: number;
  createdAt: string;
  activeStep: number;
}

const ORDER_STAGES: FulfillmentStage[] = [
  'Order Placed',
  'Packed at Store',
  'Out for Delivery',
  'Delivered',
];

const FALLBACK_ORDERS: Record<string, TrackedOrder> = {
  'ORD-1001': {
    orderId: 'ORD-1001',
    customer: {
      fullName: 'Rohan Sharma',
      email: 'rohan.sharma@example.com',
      phone: '9876543210',
      addressLine: '42 Connaught Outer Circle, Block B',
      city: 'New Delhi',
      pincode: '110001',
    },
    items: [
      {
        product: MOCK_PRODUCTS[0],
        storeId: 'delhi' as StoreCity,
        quantity: 1,
      },
      {
        product: MOCK_PRODUCTS[1],
        storeId: 'bengaluru' as StoreCity,
        quantity: 1,
      },
    ],
    totalAmount: 15926,
    createdAt: '2026-11-22T00:00:00.000Z',
    activeStep: 1,
  },
};

const emptySubscribe = () => () => {};

function stageToStepIndex(stage?: string): number {
  if (!stage) return 0;
  const idx = ORDER_STAGES.findIndex(
    (s) => s.toLowerCase() === stage.toLowerCase()
  );
  if (idx >= 0) return idx;
  if (stage.toLowerCase() === 'confirmed') return 0;
  return 0;
}

function OrderTrackingContent({ currentOrderId }: { currentOrderId: string }) {
  const router = useRouter();
  const { stores } = useStore();
  const [lookupId, setLookupId] = useState(currentOrderId);
  const [remoteOrder, setRemoteOrder] = useState<TrackedOrder | null>(null);
  const [stageUpdating, setStageUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const storedOrderJson = useSyncExternalStore(
    emptySubscribe,
    () => sessionStorage.getItem(`order_${currentOrderId}`),
    () => null
  );

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      try {
        const res = await fetchOrderById(currentOrderId);
        if (!active) return;

        const raw: OrderRecord = 'order' in res ? res.order : res;
        const mappedItems: CartItem[] = (raw.items || []).map((item, idx) => {
          const matchedMock =
            MOCK_PRODUCTS.find((p) => p.id === item.productId) ??
            MOCK_PRODUCTS[idx % MOCK_PRODUCTS.length];

          return {
            product: {
              ...matchedMock,
              id: item.productId || matchedMock.id,
              name: item.name || matchedMock.name,
              price: item.unitPrice ?? matchedMock.price,
            },
            storeId: item.storeId,
            quantity: item.quantity,
          };
        });

        setRemoteOrder({
          orderId: raw.orderId || currentOrderId,
          customer: raw.customer,
          items:
            mappedItems.length > 0
              ? mappedItems
              : FALLBACK_ORDERS['ORD-1001'].items,
          totalAmount:
            raw.totalAmount ?? FALLBACK_ORDERS['ORD-1001'].totalAmount,
          createdAt: raw.createdAt ?? new Date().toISOString(),
          activeStep: stageToStepIndex(raw.fulfillmentStage),
        });
      } catch {
        // Fall back to sessionStorage or local order when backend lookup fails
      }
    }

    void loadOrder();

    return () => {
      active = false;
    };
  }, [currentOrderId]);

  const fallbackOrder = useMemo<TrackedOrder>(() => {
    if (storedOrderJson) {
      try {
        const parsed = JSON.parse(storedOrderJson) as {
          orderId: string;
          customer: TrackedOrder['customer'];
          items: CartItem[];
          totalAmount: number;
          createdAt: string;
          status?: string;
        };
        return {
          ...parsed,
          activeStep: stageToStepIndex(parsed.status),
        };
      } catch {
        // Fall through to fallback order if JSON is invalid
      }
    }

    if (FALLBACK_ORDERS[currentOrderId]) {
      return FALLBACK_ORDERS[currentOrderId];
    }

    return {
      ...FALLBACK_ORDERS['ORD-1001'],
      orderId: currentOrderId,
    };
  }, [storedOrderJson, currentOrderId]);

  const order = remoteOrder ?? fallbackOrder;
  const currentStageLabel =
    ORDER_STAGES[order.activeStep] ?? 'Order Placed';
  const nextStage =
    order.activeStep < ORDER_STAGES.length - 1
      ? ORDER_STAGES[order.activeStep + 1]
      : null;

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = lookupId.trim().toUpperCase();
    if (!cleaned) return;
    router.push(`/orders/${cleaned}`);
  };

  const handleAdvanceStage = async () => {
    if (!nextStage || stageUpdating) return;
    setStageUpdating(true);
    setStatusMessage(null);

    try {
      const res = await updateOrderStage(order.orderId, nextStage);
      const updatedRaw: OrderRecord = 'order' in res ? res.order : res;
      const nextStep = stageToStepIndex(
        updatedRaw.fulfillmentStage || nextStage
      );

      setRemoteOrder((prev) => {
        const base = prev ?? order;
        const nextOrder: TrackedOrder = {
          ...base,
          activeStep: nextStep,
        };
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            `order_${nextOrder.orderId}`,
            JSON.stringify({
              ...nextOrder,
              status: ORDER_STAGES[nextStep],
            })
          );
        }
        return nextOrder;
      });
    } catch (err: unknown) {
      setStatusMessage(
        err instanceof Error
          ? err.message
          : 'Could not update order stage on backend.'
      );
    } finally {
      setStageUpdating(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      {/* Header & Order ID Search */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          mb: 4,
        }}
      >
        <Box sx={{ textAlign: 'left' }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'flex-start', mb: 0.5 }}
          >
            <LocalShippingOutlinedIcon color="secondary" />
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 800, textAlign: 'left' }}
            >
              Order Tracking
            </Typography>
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 500, textAlign: 'left' }}
          >
            Tracking ID:{' '}
            <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {order.orderId}
            </Box>
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          component="form"
          onSubmit={handleLookupSubmit}
          sx={{ alignItems: 'center', justifyContent: 'flex-start' }}
        >
          <TextField
            size="small"
            label="Order ID (e.g. ORD-1001)"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            sx={{ minWidth: 210 }}
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={<SearchIcon />}
            sx={{ fontWeight: 600, textAlign: 'center', height: 40 }}
          >
            Track
          </Button>
        </Stack>
      </Stack>

      {statusMessage && (
        <Alert severity="warning" sx={{ mb: 3, fontWeight: 600 }}>
          {statusMessage}
        </Alert>
      )}

      {/* Progress Stepper */}
      <Paper elevation={2} sx={{ p: 3.5, mb: 4 }}>
        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, textAlign: 'left' }}
          >
            Fulfillment Status
          </Typography>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Chip
              label={currentStageLabel}
              color="secondary"
              sx={{ fontWeight: 700 }}
            />
            {nextStage && (
              <Button
                size="small"
                variant="outlined"
                disabled={stageUpdating}
                onClick={handleAdvanceStage}
                sx={{ fontWeight: 600 }}
              >
                {stageUpdating ? 'Updating...' : `Advance to: ${nextStage}`}
              </Button>
            )}
          </Stack>
        </Stack>

        <Stepper activeStep={order.activeStep} alternativeLabel>
          {ORDER_STAGES.map((label) => (
            <Step key={label}>
              <StepLabel
                sx={{
                  '& .MuiStepLabel-label': {
                    fontWeight: 600,
                    textAlign: 'center',
                  },
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Items & Delivery Details */}
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={2} sx={{ p: 3.5 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontWeight: 700, textAlign: 'left', mb: 2.5 }}
            >
              Items & Store Fulfillment
            </Typography>

            <Stack spacing={2}>
              {order.items.map((item) => {
                const storeInfo = stores.find((s) => s.id === item.storeId);
                return (
                  <Card
                    key={`${item.product.id}-${item.storeId}`}
                    variant="outlined"
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        sx={{
                          justifyContent: 'space-between',
                          alignItems: { xs: 'flex-start', sm: 'center' },
                        }}
                      >
                        <Box sx={{ textAlign: 'left' }}>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 700, textAlign: 'left' }}
                          >
                            {item.product.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontWeight: 500, textAlign: 'left' }}
                          >
                            Qty: {item.quantity} × ₹
                            {item.product.price.toLocaleString('en-IN')}
                          </Typography>
                          <Chip
                            size="small"
                            label={`${storeInfo?.cityLabel ?? item.storeId} Store`}
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 600, mt: 1 }}
                          />
                        </Box>

                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 700, textAlign: 'right' }}
                        >
                          ₹
                          {(item.product.price * item.quantity).toLocaleString(
                            'en-IN'
                          )}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={2} sx={{ p: 3.5 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontWeight: 700, textAlign: 'left', mb: 2 }}
            >
              Delivery & Payment Summary
            </Typography>

            <Stack spacing={1} sx={{ mb: 2, textAlign: 'left' }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, textAlign: 'left' }}
              >
                {order.customer.fullName}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 400, textAlign: 'left' }}
              >
                {order.customer.addressLine}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 400, textAlign: 'left' }}
              >
                {order.customer.city} - {order.customer.pincode}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 400, textAlign: 'left' }}
              >
                Phone: {order.customer.phone}
              </Typography>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack
              direction="row"
              sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, textAlign: 'left' }}
              >
                Order Total
              </Typography>
              <Typography
                variant="h6"
                color="primary.main"
                sx={{ fontWeight: 800, textAlign: 'right' }}
              >
                ₹{order.totalAmount.toLocaleString('en-IN')}
              </Typography>
            </Stack>

            <Button
              component={Link}
              href="/products"
              variant="contained"
              fullWidth
              sx={{ fontWeight: 700, textAlign: 'center' }}
            >
              Continue Shopping
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

function OrderTrackingWithParams() {
  const params = useParams<{ orderId: string }>();
  const currentOrderId = params.orderId || 'ORD-1001';

  return (
    <OrderTrackingContent
      key={currentOrderId}
      currentOrderId={currentOrderId}
    />
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense
      fallback={
        <Container maxWidth="lg" sx={{ py: 6 }}>
          <LinearProgress />
        </Container>
      }
    >
      <OrderTrackingWithParams />
    </Suspense>
  );
}