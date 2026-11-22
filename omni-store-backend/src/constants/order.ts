import { z } from 'zod';
import { StoreCity } from '../models/Store';

export const ORDER_STORE_CITIES = [
  'hyderabad',
  'bengaluru',
  'mumbai',
  'delhi',
] as const satisfies readonly StoreCity[];

export const orderStoreCitySchema = z.enum(ORDER_STORE_CITIES);

export const FULFILLMENT_STAGES = [
  'Order Placed',
  'Packed at Store',
  'Out for Delivery',
  'Delivered',
] as const;

export type FulfillmentStage = (typeof FULFILLMENT_STAGES)[number];

export const fulfillmentStageSchema = z.enum(FULFILLMENT_STAGES);

export const GST_RATE = 0.18;
export const INITIAL_FULFILLMENT_STAGE: FulfillmentStage = 'Order Placed';