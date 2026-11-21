'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Link as MuiLink,
} from '@mui/material';
import NextLink from 'next/link';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth } from '@/context/AuthContext';
import { useStore } from '@/context/StoreContext';
import { STORES } from '@/data/mockProducts';
import { signupSchema, SignupFormValues } from '@/lib/validations/auth';
import { StoreCity } from '@/types/store';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const { selectedStore, setSelectedStore } = useStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [authError, setAuthError] = useState('');

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      preferredStore: selectedStore || 'bengaluru',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setAuthError('');
    try {
      const preferredStore = data.preferredStore as StoreCity;
      setSelectedStore(preferredStore);
      await signup(data.fullName, data.email, data.password, preferredStore);
      router.push('/products');
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Unable to create account.'
      );
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 7 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Stack spacing={1} sx={{ mb: 3, alignItems: 'center', textAlign: 'center' }}>
          <PersonAddAltIcon color="secondary" fontSize="large" />
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontWeight: 800, textAlign: 'center' }}
          >
            Create Your OmniStore Account
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 400, textAlign: 'center' }}
          >
            Register your profile and pick your home retail hub across 4 cities.
          </Typography>
        </Stack>

        {authError && (
          <Alert severity="error" sx={{ mb: 2.5, fontWeight: 600, textAlign: 'left' }}>
            {authError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2.5}>
            <TextField
              label="Full Name"
              fullWidth
              required
              autoComplete="name"
              {...register('fullName')}
              error={Boolean(errors.fullName)}
              helperText={errors.fullName?.message}
              sx={{ fontWeight: 400, textAlign: 'left' }}
            />

            <Controller
              name="preferredStore"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={Boolean(errors.preferredStore)}>
                  <InputLabel id="preferred-store-label">Preferred Store Hub</InputLabel>
                  <Select
                    {...field}
                    labelId="preferred-store-label"
                    label="Preferred Store Hub"
                    sx={{ fontWeight: 500, textAlign: 'left' }}
                  >
                    {STORES.map((store) => (
                      <MenuItem key={store.id} value={store.id}>
                        {store.name} — {store.address}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText sx={{ fontWeight: 400, textAlign: 'left' }}>
                    {errors.preferredStore?.message}
                  </FormHelperText>
                </FormControl>
              )}
            />

            <TextField
              label="Email Address"
              type="email"
              fullWidth
              required
              autoComplete="email"
              {...register('email')}
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              sx={{ fontWeight: 400, textAlign: 'left' }}
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              required
              autoComplete="new-password"
              {...register('password')}
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
              sx={{ fontWeight: 400, textAlign: 'left' }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                        aria-label="Toggle password visibility"
                        sx={{ fontWeight: 500, textAlign: 'center' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Confirm Password"
              type={showConfirm ? 'text' : 'password'}
              fullWidth
              required
              autoComplete="new-password"
              {...register('confirmPassword')}
              error={Boolean(errors.confirmPassword)}
              helperText={errors.confirmPassword?.message}
              sx={{ fontWeight: 400, textAlign: 'left' }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirm((prev) => !prev)}
                        edge="end"
                        aria-label="Toggle confirm password visibility"
                        sx={{ fontWeight: 500, textAlign: 'center' }}
                      >
                        {showConfirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              color="secondary"
              size="large"
              fullWidth
              disabled={isSubmitting}
              sx={{ fontWeight: 700, textAlign: 'center', py: 1.3 }}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
          </Stack>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 400, textAlign: 'center', mt: 3 }}
        >
          Already have an account?{' '}
          <MuiLink
            component={NextLink}
            href="/login"
            sx={{ fontWeight: 700, textAlign: 'center', textDecoration: 'none', color: 'primary.main' }}
          >
            Sign in
          </MuiLink>
        </Typography>
      </Paper>
    </Container>
  );
}