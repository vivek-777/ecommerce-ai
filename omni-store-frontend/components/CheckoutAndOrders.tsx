'use client';

import React, { useState } from 'react';
import {
  createOrder,
  fetchOrderById,
  FulfillmentStage,
  OrderRecord,
  StoreCity,
  updateOrderStage,
} from '@/lib/api';

const STORE_CITIES: StoreCity[] = [
  'hyderabad',
  'bengaluru',
  'mumbai',
  'delhi',
];

const STAGES: FulfillmentStage[] = [
  'Order Placed',
  'Packed at Store',
  'Out for Delivery',
  'Delivered',
];

interface CheckoutAndOrdersProps {
  defaultStore?: StoreCity;
  defaultProductId?: string;
}

export function CheckoutAndOrders({
  defaultStore = 'bengaluru',
  defaultProductId = 'prod-1',
}: CheckoutAndOrdersProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [pincode, setPincode] = useState('');
  const [productId, setProductId] = useState(defaultProductId);
  const [storeId, setStoreId] = useState<StoreCity>(defaultStore);
  const [quantity, setQuantity] = useState(1);

  const [lookupOrderId, setLookupOrderId] = useState('');
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stageUpdating, setStageUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function extractOrder(
    res: { order: OrderRecord } | OrderRecord
  ): OrderRecord {
    return 'order' in res ? res.order : res;
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await createOrder({
        customer: {
          fullName,
          email,
          phone,
          addressLine,
          city,
          pincode,
        },
        items: [
          {
            productId: productId.trim(),
            storeId,
            quantity: Math.max(1, Number(quantity) || 1),
          },
        ],
      });

      const created = extractOrder(res);
      setActiveOrder(created);
      setLookupOrderId(created.orderId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLookupOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupOrderId.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetchOrderById(lookupOrderId.trim());
      setActiveOrder(extractOrder(res));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Order not found');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStageChange(nextStage: FulfillmentStage) {
    if (!activeOrder) return;
    setStageUpdating(true);
    setError(null);

    try {
      const res = await updateOrderStage(activeOrder.orderId, nextStage);
      setActiveOrder(extractOrder(res));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to update fulfillment stage'
      );
    } finally {
      setStageUpdating(false);
    }
  }

  return (
    <div>
      <h3>Place Order</h3>
      <form onSubmit={handleCreateOrder}>
        <div>
          <label htmlFor="order-fullname">Full Name</label>
          <input
            id="order-fullname"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="order-email">Email</label>
          <input
            id="order-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="order-phone">Phone</label>
          <input
            id="order-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="order-address">Address</label>
          <input
            id="order-address"
            type="text"
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="order-city">City</label>
          <input
            id="order-city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="order-pincode">Pincode</label>
          <input
            id="order-pincode"
            type="text"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="order-product-id">Product ID</label>
          <input
            id="order-product-id"
            type="text"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="order-store">Fulfillment Store</label>
          <select
            id="order-store"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value as StoreCity)}
          >
            {STORE_CITIES.map((hub) => (
              <option key={hub} value={hub}>
                {hub}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="order-qty">Quantity</label>
          <input
            id="order-qty"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />
        </div>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Placing Order...' : 'Place Order'}
        </button>
      </form>

      <hr />

      <h3>Track or Update Order</h3>
      <form onSubmit={handleLookupOrder}>
        <label htmlFor="lookup-order-id">Order ID (e.g. ORD-XXXX): </label>
        <input
          id="lookup-order-id"
          type="text"
          value={lookupOrderId}
          onChange={(e) => setLookupOrderId(e.target.value)}
        />
        <button type="submit" disabled={submitting}>
          Fetch Order
        </button>
      </form>

      {error && <p role="alert">{error}</p>}

      {activeOrder && (
        <div>
          <p>
            <strong>Order ID:</strong> {activeOrder.orderId}
          </p>
          <p>
            <strong>Stage:</strong> {activeOrder.fulfillmentStage}
          </p>
          {typeof activeOrder.totalAmount === 'number' && (
            <p>
              <strong>Total:</strong> ₹{activeOrder.totalAmount}
            </p>
          )}

          <div>
            <label htmlFor="order-stage-select">Advance Stage: </label>
            <select
              id="order-stage-select"
              value={activeOrder.fulfillmentStage}
              disabled={stageUpdating}
              onChange={(e) =>
                handleStageChange(e.target.value as FulfillmentStage)
              }
            >
              {STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}