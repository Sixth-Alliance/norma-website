// filepath: /src/types/api.ts
// 🎯 CENTRALIZED API TYPES - Single source of truth for all request/response types
// Generate types from backend using OpenAPI schema when possible

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface OTPRequest {
  phone: string;
}

export interface OTPVerifyRequest {
  phone: string;
  otp: string;
}

export interface OTPVerifyResponse {
  user: {
    id: string;
    email: string;
    phone: string;
    first_name: string;
    last_name: string;
  };
  access: string;
  refresh: string;
}

export interface User {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  is_authenticated: boolean;
  created_at: string;
}

// ============================================================================
// CART & CHECKOUT TYPES
// ============================================================================

export interface CartToken {
  valid: boolean;
  cart_id?: string;
  outlet_id?: string;
  item_count?: number;
  expires_at?: string;
  is_authenticated: boolean;
}

export interface DeliveryOption {
  type: 'delivery' | 'pickup';
  label: string;
  fee: string;
  estimated_time_min: number;
  estimated_time_max: number;
  available: boolean;
  min_order_amount: string;
  pickup_address?: string;
}

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: string;
  subtotal: string;
  image_url?: string;
}

export interface Cart {
  id: string;
  outlet_id: string;
  items: CartItem[];
  subtotal: string;
  tax: string;
  total: string;
  item_count: number;
  created_at: string;
  updated_at: string;
  cart_token?: string;
}

export interface CheckoutRequest {
  cart_id: string;
  fulfillment_mode: 'delivery' | 'pickup';
  delivery_address?: string;
  delivery_latitude?: number | string;
  delivery_longitude?: number | string;
  customer_notes?: string;
  phone?: string;
}

export interface CheckoutResponse {
  order_id: string;
  order_code: string;
  status: string;
  total_amount: string;
  created_at: string;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export interface PaymentConfig {
  paystack: {
    public_key: string;
    currency: string;
    supported_channels: string[];
  };
  tax_rate: number;
  minimum_order_amount: string;
}

export interface PaymentInitRequest {
  order_code?: string;
  order_id?: string;
  amount?: number;
  email?: string;
  phone?: string;
  metadata?: Record<string, any>;
  callback_url?: string;
}

export interface PaymentInitResponse {
  authorization_url: string;
  reference: string;
  access_code: string;
  amount: number;
}

export interface PaymentVerifyRequest {
  reference: string;
  // Optional order id to help backend match the payment to the correct order
  order_id?: string;
}

export interface PaymentVerifyResponse {
  status: 'success' | 'failed' | 'pending';
  amount: number;
  reference: string;
  message: string;
}

// ============================================================================
// ORDER TYPES
// ============================================================================

export interface Order {
  id: string;
  order_code: string;
  outlet_id: string;
  outlet_name: string;
  status: string;
  total: string;
  items: CartItem[];
  fulfillment_mode: 'delivery' | 'pickup';
  delivery_address?: string;
  estimated_delivery?: string;
  special_instructions?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderDetail extends Order {
  timeline: OrderTimeline[];
  driver?: DriverInfo;
  payment_status: string;
  payment_method: string;
}

export interface OrderTimeline {
  status: string;
  timestamp: string;
  message: string;
}

export interface DriverInfo {
  name: string;
  phone: string;
  vehicle: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface Product {
  id: string;
  outlet_id: string;
  title: string;
  description: string;
  price: string;
  category: string;
  images: string[];
  is_available: boolean;
  created_at: string;
}

export interface ProductDetail extends Product {
  sizes?: string[];
  extras?: Extra[];
  is_liked: boolean;
}

export interface Extra {
  id: string;
  name: string;
  price: string;
  description: string;
}

// ============================================================================
// ADDRESS TYPES
// ============================================================================

export interface Address {
  id: string;
  address_text: string;
  latitude: number;
  longitude: number;
  label: string;
  is_default: boolean;
  created_at: string;
}

export interface AddressCreateRequest {
  address_text: string;
  latitude: number;
  longitude: number;
  label: string;
  is_default?: boolean;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'promo' | 'system';
  is_read: boolean;
  created_at: string;
}

export interface UnreadCount {
  count: number;
}

// ============================================================================
// OUTLET TYPES
// ============================================================================

export interface Outlet {
  id: string;
  name: string;
  description?: string;
  address?: string; // For list view
  address_text?: string; // For detail view
  latitude?: string;
  longitude?: string;
  phone?: string;
  image?: string | null;
  location?: string;
  is_active?: boolean;
  is_delivery_active: boolean;
  is_pickup_active: boolean;
  delivery_fee: string;
  delivery_radius_km: string;
  delivery_hours?: Record<string, OutletHours>;
  pickup_hours?: Record<string, OutletHours>;
  opening_hours?: Record<string, OpeningHours>; // Legacy support
  active_categories?: OutletCategory[];
  is_currently_open_delivery?: boolean;
  is_currently_open_pickup?: boolean;
  estimated_delivery_time?: string;
}

export interface OutletCategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface OutletHours {
  open: string;
  close: string;
  prep_time_mins: number;
}

export interface OpeningHours {
  open: string;
  close: string;
  is_open: boolean;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface SalesAnalytics {
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  daily: DailySales[];
  weekly: WeeklySales[];
  monthly: MonthlySales[];
}

export interface DailySales {
  date: string;
  revenue: number;
  orders: number;
}

export interface WeeklySales {
  week: string;
  revenue: number;
  orders: number;
}

export interface MonthlySales {
  month: string;
  revenue: number;
  orders: number;
}

export interface ItemAnalytics {
  product_id: string;
  product_name: string;
  total_sold: number;
  total_revenue: number;
  trend: 'up' | 'down' | 'stable';
}

export interface LocationAnalytics {
  outlet_id: string;
  outlet_name: string;
  total_revenue: number;
  total_orders: number;
  growth_rate: number;
}

// ============================================================================
// ADMIN TYPES
// ============================================================================

export interface AdminUser extends User {
  role: 'admin' | 'outlet_manager' | 'superadmin';
  permissions: string[];
}

export interface PagedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
