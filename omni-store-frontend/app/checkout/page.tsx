'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import Link from '@/components/common/Link';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useStore } from '@/context/StoreContext';
import { createOrder, OrderRecord } from '@/lib/api';
import { CheckoutInput, checkoutSchema } from '@/lib/validations/checkout';

type FieldErrors = Partial<Record<keyof CheckoutInput, string>>;

const emptySubscribe = () => () => {};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { stores } = useStore();

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [formData, setFormData] = useState<CheckoutInput>({
    fullName: '',
    email: '',
    phone: '',
    addressLine: '',
    city: '',
    pincode: '',
  });
  const [touchedFields, setTouchedFields] = useState<{
    fullName?: boolean;
    email?: boolean;
  }>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const effectiveFormData: CheckoutInput = {
    ...formData,
    fullName: touchedFields.fullName
      ? formData.fullName
      : (formData.fullName || user?.name || ''),
    email: touchedFields.email
      ? formData.email
      : (formData.email || user?.email || ''),
  };

  const gstAmount = Math.round(subtotal * 0.18);
  const grandTotal = subtotal + gstAmount;

  if (!isClient) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <LinearProgress />
      </Container>
    );
  }

  if (items.length === 0) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ fontWeight: 700, textAlign: 'center' }}
        >
          No Items to Checkout
        </Typography>
        <Button
          component={Link}
          href="/products"
          variant="contained"
          sx={{ fontWeight: 700, textAlign: 'center', mt: 2 }}
        >
          Browse Products
        </Button>
      </Container>
    );
  }

  const handleChange = (field: keyof CheckoutInput, value: string) => {
    if (field === 'fullName' || field === 'email') {
      setTouchedFields((prev) => ({ ...prev, [field]: true }));
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    const parsed = checkoutSchema.safeParse(effectiveFormData);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CheckoutInput;
        if (key && !errors[key]) {
          errors[key] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      const res = await createOrder({
        customer: parsed.data,
        items: items.map((item) => ({
          productId: item.product.id,
          storeId: item.storeId,
          quantity: item.quantity,
        })),
      });

      const createdOrder: OrderRecord = 'order' in res ? res.order : res;
      const orderId =
        createdOrder.orderId ||
        `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          `order_${orderId}`,
          JSON.stringify({
            ...createdOrder,
            orderId,
            customer: parsed.data,
            items,
            totalAmount: createdOrder.totalAmount ?? grandTotal,
            createdAt: createdOrder.createdAt ?? new Date().toISOString(),
            status: createdOrder.fulfillmentStage ?? 'Order Placed',
          })
        );
      }

      clearCart();
      router.push(`/orders/${orderId}`);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Failed to place order. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Typography
        variant="h4"
        component="h1"
        sx={{ fontWeight: 800, textAlign: 'left', mb: 3 }}
      >
        Checkout
      </Typography>

      <Grid
        container
        spacing={4}
        component="form"
        onSubmit={handlePlaceOrder}
        noValidate
      >
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={2} sx={{ p: 3.5 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontWeight: 700, textAlign: 'left', mb: 2.5 }}
            >
              Shipping & Contact Details
            </Typography>

            {formError && (
              <Alert severity="error" sx={{ mb: 2.5, fontWeight: 600 }}>
                {formError}
              </Alert>
            )}

            <Stack spacing={2.5}>
              <TextField
                label="Full Name"
                fullWidth
                required
                value={effectiveFormData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                error={Boolean(fieldErrors.fullName)}
                helperText={fieldErrors.fullName}
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Email Address"
                    type="email"
                    fullWidth
                    required
                    value={effectiveFormData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    error={Boolean(fieldErrors.email)}
                    helperText={fieldErrors.email}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Mobile Number (10 digits)"
                    fullWidth
                    required
                    value={effectiveFormData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    error={Boolean(fieldErrors.phone)}
                    helperText={fieldErrors.phone}
                  />
                </Grid>
              </Grid>

              <TextField
                label="Street Address / House / Flat No."
                fullWidth
                required
                multiline
                rows={2}
                value={effectiveFormData.addressLine}
                onChange={(e) => handleChange('addressLine', e.target.value)}
                error={Boolean(fieldErrors.addressLine)}
                helperText={fieldErrors.addressLine}
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="City"
                    fullWidth
                    required
                    value={effectiveFormData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    error={Boolean(fieldErrors.city)}
                    helperText={fieldErrors.city}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Pincode"
                    fullWidth
                    required
                    value={effectiveFormData.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value)}
                    error={Boolean(fieldErrors.pincode)}
                    helperText={fieldErrors.pincode}
                  />
                </Grid>
              </Grid>
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
              Order Summary
            </Typography>

            <Stack spacing={1.5} sx={{ mb: 2 }}>
              {items.map((item) => {
                const storeLabel =
                  stores.find((s) => s.id === item.storeId)?.cityLabel ??
                  item.storeId;
                return (
                  <Stack
                    key={`${item.product.id}-${item.storeId}`}
                    direction="row"
                    sx={{
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, textAlign: 'left' }}
                      >
                        {item.product.name} × {item.quantity}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 500, textAlign: 'left' }}
                      >
                        From {storeLabel} Store
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, textAlign: 'right' }}
                    >
                      ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1} sx={{ mb: 2 }}>
              <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontWeight: 500, textAlign: 'left' }}
                >
                  Subtotal
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, textAlign: 'right' }}
                >
                  ₹{subtotal.toLocaleString('en-IN')}
                </Typography>
              </Stack>

              <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontWeight: 500, textAlign: 'left' }}
                >
                  GST (18%)
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, textAlign: 'right' }}
                >
                  ₹{gstAmount.toLocaleString('en-IN')}
                </Typography>
              </Stack>
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
                Total Amount
              </Typography>
              <Typography
                variant="h6"
                color="primary.main"
                sx={{ fontWeight: 800, textAlign: 'right' }}
              >
                ₹{grandTotal.toLocaleString('en-IN')}
              </Typography>
            </Stack>

            <Button
              type="submit"
              variant="contained"
              color="secondary"
              size="large"
              fullWidth
              disabled={submitting}
              startIcon={<CheckCircleOutlineIcon />}
              sx={{ fontWeight: 700, textAlign: 'center', py: 1.4 }}
            >
              {submitting
                ? 'Placing Order...'
                : `Place Order (₹${grandTotal.toLocaleString('en-IN')})`}
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}