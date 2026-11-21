'use client';

import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import Link from '@/components/common/Link';
import { useCart } from '@/context/CartContext';
import { useStore } from '@/context/StoreContext';

export default function CartPage() {
  const { items, subtotal, totalItems, updateQuantity, removeFromCart } = useCart();
  const { stores } = useStore();

  const gstAmount = Math.round(subtotal * 0.18);
  const grandTotal = subtotal + gstAmount;

  if (items.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 10 }}>
        <Paper
          variant="outlined"
          sx={{
            p: 6,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <ShoppingBagOutlinedIcon
            sx={{ fontSize: 56, color: 'text.secondary', mb: 1.5 }}
          />
          <Typography
            variant="h5"
            gutterBottom
            sx={{ fontWeight: 700, textAlign: 'center' }}
          >
            Your Cart is Empty
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 400, textAlign: 'center', mb: 3 }}
          >
            Browse products across Hyderabad, Bengaluru, Mumbai, and Delhi stores.
          </Typography>
          <Button
            component={Link}
            href="/products"
            variant="contained"
            size="large"
            sx={{ fontWeight: 700, textAlign: 'center' }}
          >
            Explore Products
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Typography
        variant="h4"
        component="h1"
        sx={{ fontWeight: 800, textAlign: 'left', mb: 3 }}
      >
        Shopping Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})
      </Typography>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2}>
            {items.map((item) => {
              const storeInfo = stores.find((s) => s.id === item.storeId);
              const maxStock = item.product.storeInventory[item.storeId]?.quantity ?? 1;

              return (
                <Card key={`${item.product.id}-${item.storeId}`} elevation={1}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={2.5}
                      sx={{
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        justifyContent: 'space-between',
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={2}
                        sx={{ alignItems: 'center', justifyContent: 'flex-start' }}
                      >
                        <Box
                          component="img"
                          src={item.product.image}
                          alt={item.product.name}
                          sx={{
                            width: 84,
                            height: 84,
                            borderRadius: 1.5,
                            objectFit: 'cover',
                          }}
                        />

                        <Box sx={{ textAlign: 'left' }}>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 700, textAlign: 'left' }}
                          >
                            {item.product.name}
                          </Typography>

                          <Chip
                            size="small"
                            label={`Fulfilled by ${storeInfo?.cityLabel ?? item.storeId} Store`}
                            color="secondary"
                            variant="outlined"
                            sx={{ fontWeight: 600, my: 0.75 }}
                          />

                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontWeight: 500, textAlign: 'left' }}
                          >
                            ₹{item.product.price.toLocaleString('en-IN')} each (Max {maxStock} in store)
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={2}
                        sx={{
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: { xs: '100%', sm: 'auto' },
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: 'center', justifyContent: 'center' }}
                        >
                          <IconButton
                            size="small"
                            onClick={() =>
                              updateQuantity(item.product.id, item.storeId, item.quantity - 1)
                            }
                            aria-label="Decrease quantity"
                            sx={{ border: '1px solid', borderColor: 'divider' }}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>

                          <Typography
                            variant="body1"
                            sx={{ fontWeight: 700, textAlign: 'center', minWidth: 24 }}
                          >
                            {item.quantity}
                          </Typography>

                          <IconButton
                            size="small"
                            disabled={item.quantity >= maxStock}
                            onClick={() =>
                              updateQuantity(item.product.id, item.storeId, item.quantity + 1)
                            }
                            aria-label="Increase quantity"
                            sx={{ border: '1px solid', borderColor: 'divider' }}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Stack>

                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 700, textAlign: 'right', minWidth: 90 }}
                        >
                          ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                        </Typography>

                        <IconButton
                          color="error"
                          onClick={() => removeFromCart(item.product.id, item.storeId)}
                          aria-label="Remove item"
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontWeight: 700, textAlign: 'left' }}
            >
              Price Summary
            </Typography>

            <Stack spacing={1.5} sx={{ my: 2 }}>
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
                  Estimated GST (18%)
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, textAlign: 'right' }}
                >
                  ₹{gstAmount.toLocaleString('en-IN')}
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
                  Store Dispatch / Delivery
                </Typography>
                <Typography
                  variant="body2"
                  color="success.main"
                  sx={{ fontWeight: 700, textAlign: 'right' }}
                >
                  FREE
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
                Total Payable
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
              component={Link}
              href="/checkout"
              variant="contained"
              color="secondary"
              size="large"
              fullWidth
              sx={{ fontWeight: 700, textAlign: 'center' }}
            >
              Proceed to Checkout
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}