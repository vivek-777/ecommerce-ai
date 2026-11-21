import { z } from 'zod';

export const checkoutSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name is required'),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  addressLine: z
    .string()
    .trim()
    .min(5, 'Street address is required'),
  city: z
    .string()
    .trim()
    .min(2, 'City is required'),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;