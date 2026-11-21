export type StoreCity = 'hyderabad' | 'bengaluru' | 'mumbai' | 'delhi';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type FulfillmentStage =
  | 'Order Placed'
  | 'Packed at Store'
  | 'Out for Delivery'
  | 'Delivered';

export interface StoreHub {
  _id?: string;
  id?: StoreCity;
  city?: StoreCity;
  name: string;
  address?: string;
}

export interface StoreInventoryItem {
  storeId: StoreCity;
  quantity: number;
  status: StockStatus;
}

export interface Product {
  _id?: string;
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  image?: string;
  storeInventory: StoreInventoryItem[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  preferredStore: StoreCity;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface OrderItemInput {
  productId: string;
  storeId: StoreCity;
  quantity: number;
}

export interface CreateOrderInput {
  customer: {
    fullName: string;
    email: string;
    phone: string;
    addressLine: string;
    city: string;
    pincode: string;
  };
  items: OrderItemInput[];
}

export interface OrderRecord {
  _id?: string;
  orderId: string;
  customer: CreateOrderInput['customer'];
  items: Array<{
    productId: string;
    name?: string;
    storeId: StoreCity;
    quantity: number;
    unitPrice?: number;
  }>;
  subtotal?: number;
  gstAmount?: number;
  totalAmount?: number;
  fulfillmentStage: FulfillmentStage;
  createdAt?: string;
}

export interface AgentChatResponse {
  reply: string;
  recommendations?: Product[];
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
).replace(/\/$/, '');

const TOKEN_STORAGE_KEY = 'omnistore_token';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function apiRequest<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = false, headers, ...rest } = init;
  const reqHeaders = new Headers(headers);

  if (!reqHeaders.has('Content-Type') && rest.body) {
    reqHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = getAuthToken();
    if (token) {
      reqHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: reqHeaders,
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data?.error === 'string'
        ? data.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

// Catalog & Stores
export function fetchStores(): Promise<{ stores: StoreHub[] } | StoreHub[]> {
  return apiRequest('/api/stores');
}

export function fetchProducts(params?: {
  store?: StoreCity;
  search?: string;
  category?: string;
}): Promise<{ products: Product[] } | Product[]> {
  const query = new URLSearchParams();
  if (params?.store) query.set('store', params.store);
  if (params?.search?.trim()) query.set('search', params.search.trim());
  if (params?.category && params.category !== 'all') {
    query.set('category', params.category);
  }
  const qs = query.toString();
  return apiRequest(`/api/products${qs ? `?${qs}` : ''}`);
}

export function fetchProductById(
  productId: string
): Promise<{ product: Product } | Product> {
  return apiRequest(`/api/products/${encodeURIComponent(productId)}`);
}

export function updateProductInventory(
  productId: string,
  payload: { storeId: StoreCity; quantity: number }
): Promise<{ product: Product } | Product> {
  return apiRequest(`/api/products/${encodeURIComponent(productId)}/inventory`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// Auth
export async function signupUser(payload: {
  fullName: string;
  preferredStore: StoreCity;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setAuthToken(res.token);
  return res;
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setAuthToken(res.token);
  return res;
}

export function fetchCurrentUser(): Promise<{ user: AuthUser }> {
  return apiRequest('/api/auth/me', { auth: true });
}

export function updatePreferredStore(
  preferredStore: StoreCity
): Promise<{ user: AuthUser }> {
  return apiRequest('/api/auth/preferred-store', {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ preferredStore }),
  });
}

// Orders
export function createOrder(
  payload: CreateOrderInput
): Promise<{ order: OrderRecord } | OrderRecord> {
  return apiRequest('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchOrderById(
  orderId: string
): Promise<{ order: OrderRecord } | OrderRecord> {
  return apiRequest(`/api/orders/${encodeURIComponent(orderId)}`);
}

export function updateOrderStage(
  orderId: string,
  fulfillmentStage: FulfillmentStage
): Promise<{ order: OrderRecord } | OrderRecord> {
  return apiRequest(`/api/orders/${encodeURIComponent(orderId)}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ fulfillmentStage }),
  });
}

// Shopping Agent
export function sendAgentMessage(payload: {
  message: string;
  storeId?: StoreCity;
}): Promise<AgentChatResponse> {
  return apiRequest('/api/agent/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}