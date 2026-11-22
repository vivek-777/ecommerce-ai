'use client';

import React from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Radio,
  Stack,
  Typography,
} from '@mui/material';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { STORES } from '@/data/mockProducts';
import { Product, StockStatus, StoreCity } from '@/types/store';

interface StoreInventorySelectorProps {
  product: Product;
  chosenStore: StoreCity;
  onSelectStore: (storeId: StoreCity) => void;
}

function getStatusDisplay(status: StockStatus, quantity: number) {
  switch (status) {
    case 'in_stock':
      return {
        label: 'Available Stock',
        unitsText: `${quantity} units available`,
        color: 'success' as const,
      };
    case 'low_stock':
      return {
        label: 'Low Stock',
        unitsText: `Only ${quantity} ${quantity === 1 ? 'unit' : 'units'} left`,
        color: 'warning' as const,
      };
    case 'out_of_stock':
    default:
      return {
        label: 'Out of Stock',
        unitsText: '0 units available',
        color: 'error' as const,
      };
  }
}

export default function StoreInventorySelector({
  product,
  chosenStore,
  onSelectStore,
}: StoreInventorySelectorProps) {
  return (
    <Box sx={{ mt: 3 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'flex-start', mb: 1.5 }}
      >
        <StorefrontOutlinedIcon color="primary" fontSize="small" />
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, textAlign: 'left' }}
        >
          Select Store & Check Live Stock
        </Typography>
      </Stack>

      <Grid container spacing={1.5}>
        {STORES.map((store) => {
          const stock = product.storeInventory[store.id];
          const isOutOfStock = stock.status === 'out_of_stock' || stock.quantity <= 0;
          const isSelected = chosenStore === store.id;
          const statusMeta = getStatusDisplay(stock.status, stock.quantity);

          return (
            <Grid key={store.id} size={{ xs: 12, sm: 6 }}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected
                    ? 'secondary.main'
                    : isOutOfStock
                    ? 'divider'
                    : 'grey.300',
                  bgcolor: isOutOfStock ? 'action.hover' : 'background.paper',
                  opacity: isOutOfStock ? 0.72 : 1,
                }}
              >
                <CardActionArea
                  disabled={isOutOfStock}
                  onClick={() => onSelectStore(store.id)}
                  sx={{ height: '100%', alignItems: 'flex-start' }}
                >
                  <CardContent sx={{ p: 2, textAlign: 'left' }}>
                    <Stack
                      direction="row"
                      sx={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 0.5,
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ alignItems: 'center', justifyContent: 'flex-start' }}
                      >
                        <Radio
                          checked={isSelected}
                          disabled={isOutOfStock}
                          size="small"
                          color="secondary"
                          sx={{ p: 0, mr: 0.75 }}
                        />
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 700, textAlign: 'left' }}
                        >
                          {store.cityLabel} Store
                        </Typography>
                      </Stack>

                      <Chip
                        size="small"
                        label={statusMeta.label}
                        color={statusMeta.color}
                        variant={isOutOfStock ? 'outlined' : 'filled'}
                        sx={{ fontWeight: 600 }}
                      />
                    </Stack>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 400,
                        textAlign: 'left',
                        display: 'block',
                        mb: 1,
                      }}
                    >
                      {store.address}
                    </Typography>

                    <Typography
                      variant="body2"
                      color={isOutOfStock ? 'error.main' : 'text.primary'}
                      sx={{ fontWeight: 700, textAlign: 'left' }}
                    >
                      Stock Count: {statusMeta.unitsText}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}