'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  Link as MuiLink 
} from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import NextLink from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { loginSchema, LoginFormValues } from '@/lib/validations/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setAuthError('');
    try {
        await login(data.email, data.password);
        router.push('/products');
    } catch (err) {
        setAuthError(
        err instanceof Error ? err.message : 'Unable to sign in. Please try again.'
        );
    }
    };

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Stack spacing={1} sx={{ mb: 3, alignItems: 'center', textAlign: 'center' }}>
          <LockOpenIcon color="primary" fontSize="large" />
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontWeight: 800, textAlign: 'center' }}
          >
            Welcome Back
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 400, textAlign: 'center' }}
          >
            Sign in with your email and password to continue shopping.
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
              autoComplete="current-password"
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

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isSubmitting}
              sx={{ fontWeight: 700, textAlign: 'center', py: 1.3 }}
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
          </Stack>
        </Box>

        <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 400, textAlign: 'center', mt: 3 }}
            >
            New to OmniStore?{' '}
            <MuiLink
                component={NextLink}
                href="/signup"
                sx={{ fontWeight: 700, textAlign: 'center', textDecoration: 'none', color: 'primary.main' }}
            >
                Create an account
            </MuiLink>
        </Typography>
      </Paper>
    </Container>
  );
}