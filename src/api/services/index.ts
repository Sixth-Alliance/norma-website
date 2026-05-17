// filepath: /src/api/services/index.ts
// 🎯 API SERVICE LAYER - Typed functions for all backend operations
// These are the ONLY functions frontend components should import
// Each service maps to a backend module (auth, cart, orders, etc)

import { apiClient, TokenManager } from '../client';
import * as API from '@/src/types/api';

// ============================================================================
// AUTH SERVICE
// ============================================================================

export const authService = {
  async requestOTP(phone: string): Promise<{ message: string }> {
    return apiClient.post('/users/request-otp/', { phone });
  },

  async verifyOTP(phone: string, otp: string): Promise<API.OTPVerifyResponse> {
    const response = await apiClient.post<API.OTPVerifyResponse>('/users/verify-otp/', {
      phone,
      otp,
    });

    // Save tokens
    if (response.access) {
      TokenManager.setAccessToken(response.access);
    }

    return response;
  },

  async getProfile(): Promise<API.User> {
    return apiClient.get('/users/profile/', {
      cacheKey: 'user_profile',
      cacheTTL: 10 * 60 * 1000, // 10 minutes
    });
  },

  async updateProfile(data: Partial<API.User>): Promise<API.User> {
    const response = await apiClient.patch('/users/profile/', data);
    apiClient.invalidateCache('user_profile');
    return response;
  },

  async logout(): Promise<{ message: string }> {
    const response = await apiClient.post('/users/logout/', {});
    TokenManager.setAccessToken('');
    apiClient.invalidateCache();
    return response;
  },
};

// ============================================================================
// CART SERVICE
// ============================================================================

export const cartService = {
  async validateToken(): Promise<API.CartToken> {
    return apiClient.get('/orders/cart/validate/');
  },

  async rotateToken(): Promise<{ new_token: string }> {
    return apiClient.post('/orders/cart/rotate-token/', {});
  },

  async getCart(outletId: string): Promise<API.Cart> {
    return apiClient.get('/orders/cart/current/', {
      params: { outlet_id: outletId },
      cacheKey: `cart_${outletId}`,
      cacheTTL: 30 * 1000, // 30 seconds
    });
  },

  async addToCart(outletId: string, item: any): Promise<API.Cart> {
    const response = await apiClient.post('/orders/cart/add/', {
      outlet_id: outletId,
      ...item,
    });
    apiClient.invalidateCache(`cart_${outletId}`);
    return response;
  },

  async updateCartItem(itemId: string, quantity: number): Promise<API.Cart> {
    return apiClient.patch(`/orders/cart/update-item/${itemId}/`, { quantity });
  },

  async removeCartItem(itemId: string): Promise<API.Cart> {
    return apiClient.delete(`/orders/cart/remove-item/${itemId}/`);
  },

  async clearCart(outletId: string): Promise<{ message: string }> {
    const response = await apiClient.post('/orders/cart/clear/', { outlet_id: outletId });
    apiClient.invalidateCache(`cart_${outletId}`);
    return response;
  },

  async mergeCart(cartId: string): Promise<API.Cart> {
    return apiClient.post('/orders/cart/merge/', { cart_id: cartId });
  },

  async getDeliveryOptions(outletId: string): Promise<API.DeliveryOption[]> {
    return apiClient.get('/orders/cart/delivery-options/', {
      params: { outlet_id: outletId },
      cacheKey: `delivery_options_${outletId}`,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
    });
  },

  async calculateDeliveryFee(
    outletId: string,
    mode: 'delivery' | 'pickup',
    address?: string,
    latitude?: number,
    longitude?: number
  ): Promise<{
    delivery_fee: string;
    breakdown: Record<string, any>;
    distance_km: number;
  }> {
    return apiClient.post(`/orders/cart/{cartId}/delivery_fee/`, {
      fulfillment_mode: mode,
      delivery_address: address,
      delivery_latitude: latitude,
      delivery_longitude: longitude,
    });
  },
};

// ============================================================================
// CHECKOUT & PAYMENT SERVICE
// ============================================================================

export const checkoutService = {
  async checkout(data: API.CheckoutRequest): Promise<API.CheckoutResponse> {
    return apiClient.post('/orders/cart/checkout/', data);
  },

  async getPaymentConfig(): Promise<API.PaymentConfig> {
    return apiClient.get('/orders/payment/config/', {
      cacheKey: 'payment_config',
      cacheTTL: 60 * 60 * 1000, // 1 hour
    });
  },

  async initializePayment(data: API.PaymentInitRequest): Promise<API.PaymentInitResponse> {
    return apiClient.post('/orders/payment/initialize/', data);
  },

  async verifyPayment(data: API.PaymentVerifyRequest): Promise<API.PaymentVerifyResponse> {
    return apiClient.post('/orders/payment/verify/', data);
  },
};

// ============================================================================
// ORDERS SERVICE
// ============================================================================

export const ordersService = {
  async getOrder(orderId: string): Promise<API.OrderDetail> {
    return apiClient.get(`/orders/${orderId}/`, {
      cacheKey: `order_${orderId}`,
      cacheTTL: 30 * 1000, // 30 seconds
    });
  },

  async listOrders(page: number = 1, status?: string): Promise<API.PagedResponse<API.Order>> {
    return apiClient.get('/orders/', {
      params: { page, ...(status && { status }) },
    });
  },

  async trackOrder(orderId: string): Promise<API.OrderDetail> {
    return apiClient.get(`/orders/track/`, {
      params: { order_id: orderId },
    });
  },

  async cancelOrder(orderId: string): Promise<{ message: string }> {
    return apiClient.delete(`/orders/${orderId}/`);
  },

  async reorder(orderId: string): Promise<{ cart: API.Cart; warnings: any[] }> {
    return apiClient.post(`/orders/${orderId}/reorder/`, {});
  },
};

// ============================================================================
// PRODUCTS SERVICE
// ============================================================================

export const productsService = {
  async listProducts(
    outletId: string,
    category?: string,
    page: number = 1
  ): Promise<API.PagedResponse<API.Product>> {
    return apiClient.get('/products/products/', {
      params: { outlet: outletId, category, page },
      cacheKey: `products_${outletId}_${category}`,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
    });
  },

  async getProduct(productId: string): Promise<API.ProductDetail> {
    return apiClient.get(`/products/products/${productId}/`, {
      cacheKey: `product_${productId}`,
      cacheTTL: 10 * 60 * 1000, // 10 minutes
    });
  },

  async toggleLike(productId: string): Promise<{ is_liked: boolean }> {
    const response = await apiClient.post(`/products/products/${productId}/toggle_like/`, {});
    apiClient.invalidateCache('favorites');
    return response;
  },

  async getFavorites(): Promise<API.Product[]> {
    return apiClient.get('/products/products/favorites/', {
      cacheKey: 'favorites',
      cacheTTL: 5 * 60 * 1000,
    });
  },
};

// ============================================================================
// OUTLETS SERVICE
// ============================================================================

export const outletsService = {
  async listOutlets(
    searchQuery?: string,
    isDeliveryActive?: boolean,
    isPickupActive?: boolean
  ): Promise<API.PagedResponse<API.Outlet>> {
    return apiClient.get('/outlets/outlets/public/', {
      params: {
        ...(searchQuery && { search: searchQuery }),
        ...(isDeliveryActive !== undefined && { is_delivery_active: isDeliveryActive }),
        ...(isPickupActive !== undefined && { is_pickup_active: isPickupActive }),
      },
      cacheKey: `outlets_${searchQuery}`,
      cacheTTL: 5 * 60 * 1000,
    });
  },

  async getOutlet(outletId: string): Promise<API.Outlet> {
    return apiClient.get(`/outlets/outlets/${outletId}/public-detail/`, {
      cacheKey: `outlet_${outletId}`,
      cacheTTL: 10 * 60 * 1000,
    });
  },

  async getNearbyOutlets(latitude: number, longitude: number): Promise<API.Outlet[]> {
    return apiClient.get('/outlets/outlets/nearby/', {
      params: { latitude, longitude },
    });
  },
};

// ============================================================================
// ADDRESSES SERVICE
// ============================================================================

export const addressesService = {
  async listAddresses(): Promise<API.Address[]> {
    return apiClient.get('/users/addresses/', {
      cacheKey: 'addresses',
      cacheTTL: 5 * 60 * 1000,
    });
  },

  async createAddress(data: API.AddressCreateRequest): Promise<API.Address> {
    const response = await apiClient.post('/users/addresses/', data);
    apiClient.invalidateCache('addresses');
    return response;
  },

  async updateAddress(addressId: string, data: Partial<API.AddressCreateRequest>): Promise<API.Address> {
    const response = await apiClient.patch(`/users/addresses/${addressId}/`, data);
    apiClient.invalidateCache('addresses');
    return response;
  },

  async deleteAddress(addressId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/users/addresses/${addressId}/`);
    apiClient.invalidateCache('addresses');
    return response;
  },
};

// ============================================================================
// NOTIFICATIONS SERVICE
// ============================================================================

export const notificationsService = {
  async listNotifications(page: number = 1): Promise<API.PagedResponse<API.Notification>> {
    return apiClient.get('/notifications/push-notifications/', {
      params: { page },
    });
  },

  async getUnreadCount(): Promise<API.UnreadCount> {
    return apiClient.get('/notifications/push-notifications/unread_count/', {
      cacheKey: 'unread_count',
      cacheTTL: 10 * 1000, // 10 seconds
    });
  },

  async markAsRead(notificationId: string): Promise<{ message: string }> {
    const response = await apiClient.post(
      `/notifications/push-notifications/${notificationId}/mark_read/`,
      {}
    );
    apiClient.invalidateCache('unread_count');
    return response;
  },

  async markAllAsRead(): Promise<{ message: string }> {
    const response = await apiClient.post('/notifications/push-notifications/mark_all_read/', {});
    apiClient.invalidateCache('unread_count');
    return response;
  },
};

// ============================================================================
// ANALYTICS SERVICE
// ============================================================================

export const analyticsService = {
  async getSalesAnalytics(timeframe: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<API.SalesAnalytics> {
    return apiClient.get('/analytics/sales/', {
      params: { timeframe },
      cacheKey: `analytics_sales_${timeframe}`,
      cacheTTL: 15 * 60 * 1000,
    });
  },

  async getItemAnalytics(limit: number = 10): Promise<API.ItemAnalytics[]> {
    return apiClient.get('/analytics/items/', {
      params: { limit },
      cacheKey: 'analytics_items',
      cacheTTL: 15 * 60 * 1000,
    });
  },

  async getLocationAnalytics(): Promise<API.LocationAnalytics[]> {
    return apiClient.get('/analytics/locations/', {
      cacheKey: 'analytics_locations',
      cacheTTL: 15 * 60 * 1000,
    });
  },
};

// ============================================================================
// ADMIN SERVICE
// ============================================================================

export const adminService = {
  async listUsers(page: number = 1): Promise<API.PagedResponse<API.AdminUser>> {
    return apiClient.get('/users/admin/users/', { params: { page } });
  },

  async getUserDetail(userId: string): Promise<API.AdminUser> {
    return apiClient.get(`/users/admin/users/${userId}/`);
  },

  async createUser(data: any): Promise<API.AdminUser> {
    return apiClient.post('/users/admin/users/create/', data);
  },

  async updateUser(userId: string, data: any): Promise<API.AdminUser> {
    return apiClient.patch(`/users/admin/users/${userId}/`, data);
  },

  async deleteUser(userId: string): Promise<{ message: string }> {
    return apiClient.delete(`/users/admin/users/${userId}/`);
  },
};
