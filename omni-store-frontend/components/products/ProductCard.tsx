'use client';

import React from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import Link from '@/components/common/Link';
import { Product, StockStatus } from '@/types/store';
import { useStore } from '@/context/StoreContext';

interface ProductCardProps {
  product: Product;
}

function getStockBadge(status: StockStatus, quantity: number) {
  switch (status) {
    case 'in_stock':
      return {
        label: `In Stock (${quantity})`,
        color: 'success' as const,
      };
    case 'low_stock':
      return {
        label: `Low Stock (${quantity} left)`,
        color: 'warning' as const,
      };
    case 'out_of_stock':
    default:
      return {
        label: 'Out of Stock',
        color: 'error' as const,
      };
  }
}

export default function ProductCard({ product }: ProductCardProps) {
  const { selectedStore, activeStoreInfo } = useStore();
  const storeStock = product.storeInventory[selectedStore];
  const badge = getStockBadge(storeStock.status, storeStock.quantity);

  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Box>
        <CardMedia
          component="img"
          height="190"
          image={product.image}
          alt={product.name}
          sx={{ objectFit: 'cover' }}
        />

        <CardContent>
          <Stack
            direction="row"
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, textAlign: 'left' }}
            >
              {product.category}
            </Typography>
            <Chip
              size="small"
              label={badge.label}
              color={badge.color}
              variant={storeStock.status === 'out_of_stock' ? 'outlined' : 'filled'}
            />
          </Stack>

          <Typography
            variant="h6"
            gutterBottom
            sx={{ fontWeight: 700, textAlign: 'left' }}
          >
            {product.name}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 400, textAlign: 'left', mb: 1.5 }}
          >
            {product.shortDescription}
          </Typography>

          <Typography
            variant="h6"
            color="primary.main"
            sx={{ fontWeight: 700, textAlign: 'left' }}
          >
            ₹{product.price.toLocaleString('en-IN')}
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 400, textAlign: 'left', display: 'block', mt: 0.5 }}
          >
            Checked for {activeStoreInfo.cityLabel} Store
          </Typography>
        </CardContent>
      </Box>

      <CardActions sx={{ px: 2, pb: 2, justifyContent: 'space-between' }}>
        <Button
          component={Link}
          href={`/products/${product.id}`}
          variant="contained"
          fullWidth
          sx={{ fontWeight: 600, textAlign: 'center' }}
        >
          View Details
        </Button>
      </CardActions>
    </Card>
  );
}