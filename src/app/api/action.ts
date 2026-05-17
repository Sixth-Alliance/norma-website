import { logger } from '@/src/utils/logger';
// Centralized token helpers (import into local scope and re-export)
import { getCookie, getAuthToken, getCartToken, setCartToken, attachCartTokenHeader, TokenManager, clearAuthCookies } from '@/src/lib/tokens';
export { getCookie, getAuthToken, getCartToken, setCartToken, attachCartTokenHeader, clearAuthCookies };
import { ApiError, parseApiError } from '@/src/lib/apiErrors';
export { ApiError, parseApiError };
// Centralized API error handling

// Standardized response handler (uses centralized parseApiError/ApiError)
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await parseApiError(response);
    throw new ApiError(message, response.status, response);
  }
  const data = await response.json();
  return data?.data || data; // Handle both wrapped and unwrapped responses
}

export interface Category {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_pic?: string;
  role: string;
  marketing_consent?: boolean;
  is_email_verified: boolean;
  is_phone_verified?: boolean;
  two_factor_enabled?: boolean;
  is_verified?: boolean; // Some legacy code uses is_verified
  created_at: string;
  addresses?: any[]; // For saved addresses
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number; // Fixed: number instead of string to match backend
  main_image: string;
  main_image_url: string;
  images: string[] | null;
  variants: any[] | null;
  options: any[] | null;
  dietary_labels: any[] | null;
  is_active: boolean;
  outlet: string;
  outlet_name: string;
  category: string;
  category_name: string;
  availability_status: string;
  categories_for_outlet: Category[];
  created_at: string;
  updated_at: string;
}
export interface CartItemRequest {
  product_id: string;
  outlet_id: string;
  quantity: number;
  size?: string; // OPTIONAL: Product size/variant (max 20 chars)
  extras?: Record<string, any>; // OPTIONAL: Additional options/extras (JSON object)
  special_notes?: string; // OPTIONAL: Customer instructions (max 500 chars)
}
export interface CartItem {
  id: string;
  product_id: string;
  outlet: string;
  product_name: string;
  product_price: number; // Fixed: number instead of string
  product_image: string;
  quantity: number;
  size: string | null;
  extras: Record<string, any> | null; // Fixed: better typing instead of string
  special_notes: string | null;
  unit_price: number; // Fixed: number instead of string
  total_price: number; // Fixed: number instead of string
  is_available: boolean; // Fixed: boolean instead of string
  created_at: string;
}

export interface CartResponse {
  id: string;
  outlet: string;
  outlet_name: string;
  items: CartItem[];
  total_items: number; // Fixed: number instead of string
  subtotal: number; // Fixed: number instead of string
  created_at: string;
  updated_at: string;
  cart_token?: string;
}
export interface SessionInfo {
  session_id: string;
  is_authenticated: boolean;
  user_id: string | null;
  user_email: string | null;
  session_data: Record<string, any>;
  instructions: {
    anonymous_cart: string;
    cookie_name: string;
    browser_storage: string;
  };
}
export interface DeliveryFeeRequest {
  cart_id: string;
  delivery_address_text: string;
  delivery_latitude?: number | string | null;
  delivery_longitude?: number | string | null;
  fulfillment_mode: "delivery" | "pickup";
}

export interface DeliveryFeeResponse {
  cart_id: string;
  delivery_fee: number;
  estimated_delivery_time: string;
  distance_km: number;
  subtotal: number;
  total: number;
  currency: string;
  is_deliverable: boolean;
  delivery_area_message?: string;
}
export interface CheckoutRequest {
  cart_id: string;
  fulfillment_mode: "delivery" | "pickup";
  user_address_id?: string;
  delivery_address_text?: string;
  delivery_latitude?: number | string | null;
  delivery_longitude?: number | string | null;
  customer_phone: string;
  special_instructions?: string;
  promo_code?: string;
}

export interface CheckoutResponse {
  order_id: string;
  cart_id: string;
  order_number: string;
  status:
  | "pending_payment"
  | "placed"
  | "paid"
  | "confirmed"
  | "preparing"
  | "ready_pickup"
  | "ready_delivery"
  | "out_for_delivery"
  | "completed"
  | "delivered"
  | "cancelled"
  | "failed"
  | "pending"; // Keep pending for legacy compatibility
  total_amount: number;
  delivery_fee: number;
  subtotal: number;
  estimated_delivery_time: string;
  payment_reference?: string;
  payment_url?: string;
  fulfillment_mode: "delivery" | "pickup";
}

// Consistent API base URL from environment variable with fallback
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://norma-api.up.railway.app/api/v1';

// Helper to quantize coordinates to 6 decimal places (match backend DecimalField precision)
const quantizeCoord = (v?: number | null): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 1e6) / 1e6;
};

//get all public outlets:
//https://norma-api.up.railway.app/api/v1/outlets/outlets/public/

export async function getAllOutlets() {
  try {
    // Use proxy in development to avoid CORS issues
    const isDevelopment = process.env.NODE_ENV === 'development';
    const url = isDevelopment
      ? '/api/proxy/outlets'
      : `${BASE_URL}/outlets/outlets/public/`;

    // logger.debug('🌐 Fetching outlets from:', url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    // logger.info('✅ Outlets response:', responseData);
    return responseData.data || responseData;
  } catch (error: any) {
    logger.error("Error fetching external data:", error.message);
    throw error;
  }
}

//get session info
///orders/session/info/

// Session cache to avoid multiple calls to session API
let sessionCache: {
  session_id: string;
  expires: number;
  isValid: () => boolean;
} | null = null;

// Simplified session initialization
export async function initializeAnonymousSession(outletId: string): Promise<SessionInfo> {
  try {
    // logger.debug("🔐 INIT ANONYMOUS SESSION - Starting for outlet:", outletId);

    const response = await fetch(`${BASE_URL}/orders/session/info/?outlet_id=${encodeURIComponent(outletId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
      cache: "no-cache"
    });

    return await handleResponse<SessionInfo>(response);
  } catch (error: any) {
    logger.error("❌ Failed to initialize anonymous session:", error.message);
    throw error;
  }
}

// Simplified session info getter
export async function getSessionInfo(outletId: string): Promise<SessionInfo> {
  try {
    // Check if we have a valid cached session
    if (sessionCache && sessionCache.isValid()) {
      // logger.debug("🔐 Using cached session:", sessionCache.session_id);
      return {
        session_id: sessionCache.session_id,
        is_authenticated: false,
        user_id: null,
        user_email: null,
        session_data: {},
        instructions: {
          anonymous_cart: 'Use cached cart_token to track anonymous user carts',
          cookie_name: 'cart_token',
          browser_storage: 'Persist cart_token in cookie/localStorage'
        }
      };
    }

    const sessionData = await initializeAnonymousSession(outletId);

    // Cache the session
    sessionCache = {
      session_id: sessionData.session_id,
      expires: Date.now() + (5 * 60 * 1000), // 5 minutes
      isValid: function () { return Date.now() < this.expires; }
    };

    // Persist cart_token if returned by server
    const cartToken = sessionData.session_id;
    if (cartToken) {
      setCartToken(cartToken);
    }

    // logger.info("✅ Anonymous session initialized:", sessionData.session_id);
    return sessionData;
  } catch (error: any) {
    logger.error("❌ Error fetching session info:", error.message);
    throw error;
  }
}

//get all product:
//api/v1/products/products/

export async function getAllProducts(
  outletId?: string,
  page: number = 1,
  pageSize: number = 20,
  category?: string
) {
  try {
    let url = `${BASE_URL}/products/products/?page=${page}&page_size=${pageSize}`;
    if (outletId) {
      url += `&outlet=${encodeURIComponent(outletId)}`;
    }
    if (category) {
      url += `&category=${encodeURIComponent(category)}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData;
  } catch (error: any) {
    logger.error("Error fetching products:", error.message);
    throw error;
  }
}

// ⚡ OPTIMIZED: Get all products in one request (much faster!)
export async function getAllProductsOptimized(
  outletId?: string,
  category?: string,
  search?: string
) {
  try {
    let url = `${BASE_URL}/products/products/all/`;
    const params = new URLSearchParams();

    if (outletId) {
      params.append('outlet', outletId);
    }
    if (category) {
      params.append('category', category);
    }
    if (search) {
      params.append('search', search);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    logger.debug('🚀 Fetching ALL products from:', url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`❌ Failed to fetch products: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();

    // The /all/ endpoint returns {data: Product[], message: string}
    const products = responseData.data || responseData;

    logger.info(`✅ Fetched ${products.length} products successfully`);

    return {
      results: products,
      count: products.length,
      page_info: {
        total_pages: 1,
        current_page: 1,
        page_size: products.length,
        has_next: false,
        has_previous: false,
        next: null,
        previous: null
      }
    };
  } catch (error: any) {
    logger.error("Error fetching all products:", error.message);
    throw error;
  }
}
export async function getSingleProduct(productId: string): Promise<Product> {
  try {
    const response = await fetch(
      `${BASE_URL}/products/products/${productId}/`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();

    // Return the product data - adjust based on actual API response structure
    if (responseData.data) {
      return responseData.data as Product;
    } else if (responseData) {
      return responseData as Product;
    } else {
      throw new Error("No product data found in response");
    }
  } catch (error: any) {
    logger.error(`Error fetching product ${productId}:`, error.message);
    throw error;
  }
}


export async function addToCart(
  cartItem: CartItemRequest,
  outletId: string
): Promise<CartResponse> {
  logger.debug("📦 ADD TO CART - Starting operation...");
  logger.debug("📦 ADD TO CART - Item:", cartItem);
  logger.debug("📦 ADD TO CART - Outlet:", outletId);

  // UPDATED: Build the request body according to updated CUSTOMER_FLOW.md
  // Now includes outlet_id as required field
  const requestBody = {
    outlet_id: outletId, // REQUIRED: Target outlet for this cart item
    product_id: cartItem.product_id,
    quantity: cartItem.quantity,
    size: cartItem.size || undefined, // OPTIONAL: Product size/variant
    extras: cartItem.extras || undefined, // OPTIONAL: Additional options/extras
    special_notes: cartItem.special_notes || undefined // OPTIONAL: Customer instructions
  };

  logger.debug("📦 ADD TO CART - Request Body:", requestBody);

  try {
    // Ensure session is initialized before making the request so the server
    // can set cart_token and any required session fields (prevents DB null issues)
    try {
      await getSessionInfo(outletId);
    } catch (sessErr) {
      logger.warn("⚠️ Session initialization failed (will still attempt add):", (sessErr as any)?.message || sessErr);
    }

    // Helper to perform the actual fetch (wrapped so we can retry)
    const doFetch = async () => {
      return await fetch(`${BASE_URL}/orders/cart/add/`, {
        method: "POST",
        headers: {
          ...attachCartTokenHeader({
            "Content-Type": "application/json",
            Accept: "application/json",
          }),
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });
    };

    // Try up to 2 attempts (initial + one retry) with small backoff for network/5xx errors
    let attempts = 0;
    let response: Response | null = null;
    let lastErrorMessage = '';

    while (attempts < 2) {
      attempts += 1;
      try {
        response = await doFetch();
        logger.debug("📦 ADD TO CART - Attempt", attempts, "Status:", response.status);

        if (response.ok) break; // success

        // For server 5xx or network-like issues, parse and possibly retry
        if (response.status >= 500) {
          const parsed = await parseApiError(response);
          lastErrorMessage = parsed;

          // If DB is_active problem, try init session before retry
          if (/null value in column \"is_active\"/i.test(parsed) && attempts < 2) {
            logger.info("📦 ADD TO CART - Detected is_active DB issue. Initializing session before retrying...");
            try { await initializeAnonymousSession(outletId); } catch (e) { logger.warn('Session init during retry failed', e); }
            // small backoff
            await new Promise(r => setTimeout(r, 250 * attempts));
            continue;
          }

          // Otherwise, backoff and retry once
          if (attempts < 2) await new Promise(r => setTimeout(r, 250 * attempts));
          continue;
        }

        // For 4xx errors, parse and return immediately (don't retry)
        const parsed = await parseApiError(response);
        throw new Error(parsed || `HTTP ${response.status}`);
      } catch (err: any) {
        lastErrorMessage = err?.message || String(err);
        logger.error("📦 ADD TO CART - Attempt error:", lastErrorMessage);
        if (attempts < 2) {
          await new Promise(r => setTimeout(r, 200 * attempts));
          continue;
        }
        throw err;
      }
    }

    if (!response) throw new Error('No response from add-to-cart');

    if (!response.ok) {
      const parsed = await parseApiError(response);
      throw new Error(parsed || `Failed to add item to cart: ${response.status}`);
    }

    const responseData = await response.json();
    logger.info("✅ Add to Cart API Response:", responseData);

    // If server rotated the cart token, accept X-New-Cart-Token header first
    try {
      const newToken = response.headers.get('X-New-Cart-Token');
      if (newToken) {
        setCartToken(newToken);
        logger.info('📣 Received X-New-Cart-Token from server, updated local token');
      }
    } catch (e) {
      logger.warn('Unable to read X-New-Cart-Token header', e);
    }

    // Persist cart_token if returned in body
    try {
      const cartTokenFromData = responseData?.data?.cart_token || responseData?.cart_token || null;
      if (cartTokenFromData) {
        setCartToken(cartTokenFromData);
      }
    } catch (e) {
      logger.warn('Unable to persist cart_token from addToCart response', e);
    }

    if (responseData.status === 'success' && responseData.data) {
      return responseData.data as CartResponse;
    } else if (responseData) {
      return responseData as CartResponse;
    } else {
      throw new Error("No cart data found in response");
    }

  } catch (error: any) {
    logger.error("❌ Error adding item to cart:", error?.message || error);
    throw error;
  }
}


export async function getCurrentCart(outletId: string): Promise<CartResponse> {
  try {
    // Get session info first to ensure we have the correct session
    const sessionInfo = await getSessionInfo(outletId);
    // logger.debug("🔐 GET CART - Using session:", sessionInfo.session_id);
    // logger.debug("🔐 GET CART - Outlet ID:", outletId);

    // Small delay to ensure session cookie is properly set
    await new Promise(resolve => setTimeout(resolve, 100));

    // UPDATED: Build URL with /current/ endpoint as per updated CUSTOMER_FLOW.md
    const url = `${BASE_URL}/orders/cart/current/?outlet_id=${outletId}`;
    // logger.debug("🔐 GET CART - Request URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...attachCartTokenHeader({ Accept: "application/json" }),
      },
      credentials: "include", // This will automatically handle session cookies
    });

    // logger.debug("🔐 GET CART - Response Status:", response.status);
    // logger.debug("🔐 GET CART - Response Headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("🔐 GET CART - Error Response:", errorText);

      // If we get 401, it means session is not working properly
      if (response.status === 401) {
        logger.warn("🔐 GET CART - Session authentication failed, clearing cache and retrying...");
        // Clear session cache and try once more
        sessionCache = null;

        // For anonymous users, if cart doesn't exist, return empty cart structure
        // logger.debug("🔐 GET CART - Returning empty cart for anonymous user");
        return {
          id: "",
          outlet: outletId,
          outlet_name: "Selected Outlet",
          items: [],
          total_items: 0, // Fixed: number instead of string
          subtotal: 0, // Fixed: number instead of string
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as CartResponse;
      }

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(
          errorData?.message ||
          errorData?.detail ||
          `HTTP error! status: ${response.status}`
        );
      } catch {
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
    }

    const responseData = await response.json();
    // logger.info("✅ Get Current Cart API Response:", responseData);

    // Persist cart_token if server returned one alongside cart response
    try {
      // Prefer explicit header X-New-Cart-Token (server rotates token)
      const newToken = response.headers.get('X-New-Cart-Token');
      if (newToken) {
        setCartToken(newToken);
        // logger.info('🔐 GET CART - received X-New-Cart-Token header, updated token');
      } else {
        // Fallback: Prefer cookie (server sets it). Fallback to body token if present.
        const cartTokenFromCookie = getCookie('cart_token');
        const cartTokenFromData = responseData?.data?.cart_token || responseData?.cart_token || null;
        const cartToken = cartTokenFromCookie || cartTokenFromData;
        if (cartToken) {
          // logger.info('🔐 GET CART - received cart_token (cookie or body):', cartToken);
          setCartToken(cartToken);
        }
      }
    } catch (e) {
      logger.warn('Unable to persist cart_token from getCurrentCart response', e);
    }

    if (responseData.status === 'success' && responseData.data) {
      return responseData.data as CartResponse;
    } else if (responseData) {
      return responseData as CartResponse;
    } else {
      throw new Error("No cart data found in response");
    }
  } catch (error: any) {
    logger.error("❌ Error fetching current cart:", error.message);
    throw error;
  }
}

//calculate delivery fee for cart
// /orders/cart/{id}/delivery_fee/
const deliveryFeeCache = new Map<
  string,
  { data: DeliveryFeeResponse; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
export async function calculateDeliveryFee(
  request: DeliveryFeeRequest
): Promise<DeliveryFeeResponse> {
  try {
    // Create cache key based on cart_id and address
    const cacheKey = `${request.cart_id}-${request.delivery_address_text}`;

    // Check cache first
    const cached = deliveryFeeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      // logger.debug("🚚 DELIVERY FEE - Using cached result");
      return cached.data;
    }

    // logger.debug("🚚 DELIVERY FEE - Calculating for cart:", request.cart_id);
    // logger.debug("🚚 DELIVERY FEE - Address:", request.delivery_address_text);

    // Map frontend request shape to backend expected keys and include credentials
    // If coordinates are present but no textual address was provided, synthesize
    // a fallback delivery_address so backend handlers that expect a non-empty
    // text field still receive something meaningful (e.g. 'coords:lat,lng').
    const fallbackAddress = (typeof request.delivery_latitude === 'number' && typeof request.delivery_longitude === 'number')
      ? `coords:${request.delivery_latitude},${request.delivery_longitude}`
      : '';

    const payload: any = {
      fulfillment_mode: request.fulfillment_mode,
      delivery_address: request.delivery_address_text || fallbackAddress || '',
      latitude: typeof request.delivery_latitude === 'number' ? quantizeCoord(request.delivery_latitude) : null,
      longitude: typeof request.delivery_longitude === 'number' ? quantizeCoord(request.delivery_longitude) : null,
      cart_id: request.cart_id,
    };

    const response = await fetch(
      `${BASE_URL}/orders/cart/${request.cart_id}/delivery_fee/`,
      {
        method: "POST",
        headers: {
          ...attachCartTokenHeader({
            "Content-Type": "application/json",
            Accept: "application/json",
          }),
          ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const parsed = await parseApiError(response).catch(() => null);

      // Handle specific error scenarios
      if (response.status === 400) {
        throw new Error("Address outside delivery area");
      } else if (response.status === 403) {
        throw new Error("Outlet not delivering currently");
      } else if (response.status === 422) {
        throw new Error("Invalid address or coordinates");
      }

      throw new Error(parsed || `HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    logger.info("✅ Delivery Fee API Response:", responseData);

    let deliveryFeeData: DeliveryFeeResponse;

    if (responseData.data) {
      deliveryFeeData = responseData.data as DeliveryFeeResponse;
    } else if (responseData) {
      deliveryFeeData = responseData as DeliveryFeeResponse;
    } else {
      throw new Error("No delivery fee data found in response");
    }

    // Normalize numeric fields which may be returned as strings by the API
    deliveryFeeData.delivery_fee = typeof (deliveryFeeData as any).delivery_fee === 'string'
      ? parseFloat((deliveryFeeData as any).delivery_fee)
      : (deliveryFeeData as any).delivery_fee;
    deliveryFeeData.subtotal = typeof (deliveryFeeData as any).subtotal === 'string'
      ? parseFloat((deliveryFeeData as any).subtotal)
      : (deliveryFeeData as any).subtotal;
    // total may be named 'total' or 'total_amount' depending on API; prefer total if present
    if ((deliveryFeeData as any).total !== undefined) {
      (deliveryFeeData as any).total = typeof (deliveryFeeData as any).total === 'string'
        ? parseFloat((deliveryFeeData as any).total)
        : (deliveryFeeData as any).total;
    }
    deliveryFeeData.distance_km = typeof (deliveryFeeData as any).distance_km === 'string'
      ? parseFloat((deliveryFeeData as any).distance_km)
      : (deliveryFeeData as any).distance_km;

    // Cache the successful result
    deliveryFeeCache.set(cacheKey, {
      data: deliveryFeeData,
      timestamp: Date.now(),
    });

    return deliveryFeeData;
  } catch (error: any) {
    logger.error("❌ Error calculating delivery fee:", error.message);

    // Clear cache for this address on error
    const cacheKey = `${request.cart_id}-${request.delivery_address_text}`;
    deliveryFeeCache.delete(cacheKey);

    throw error;
  }
}
//checkout api
// /orders/cart/checkout/
export async function checkoutCart(
  checkoutRequest: CheckoutRequest
): Promise<CheckoutResponse> {
  try {
    const token = getAuthToken();

    if (!token) {
      throw new Error("Authentication required for checkout");
    }

    logger.info("💰 CHECKOUT - Starting checkout process");
    logger.debug("💰 CHECKOUT - Cart ID:", checkoutRequest.cart_id);
    logger.debug(
      "💰 CHECKOUT - Fulfillment Mode:",
      checkoutRequest.fulfillment_mode
    );
    logger.debug(
      "💰 CHECKOUT - Customer Phone:",
      checkoutRequest.customer_phone
    );

    const response = await fetch(`${BASE_URL}/orders/cart/checkout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(checkoutRequest),
    });

    if (!response.ok) {
      // Clone response because parseApiError consumes the body stream
      const parsed = await parseApiError(response.clone()).catch(() => null);

      // If backend indicates the cart was already consumed and includes order info
      // (HTTP 409 as used by the API), return the parsed body to the caller so
      // the UI can handle it (clear local cart, redirect to orders/tracking).
      if (response.status === 409) {
        const body = await response.json().catch(() => null);
        logger.warn('💰 CHECKOUT - Server returned 409 - cart already consumed', body);
        return body as any;
      }

      // Handle specific checkout errors
      if (response.status === 400) {
        // Attempt to extract structured errors returned by the API so the UI
        // can surface field-level validation messages.
        const body = await response.json().catch(() => null);
        const message = body?.message || 'Invalid checkout data';
        const errors = body?.errors || body?.detail || null;
        throw new ApiError(message, 400, response, errors);
      } else if (response.status === 404) {
        throw new Error("Cart not found");
      } else if (response.status === 422) {
        throw new Error("Delivery address not valid for checkout");
      }

      throw new Error(parsed || `HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json().catch(() => null);
    logger.info("✅ Checkout API Response:", responseData);

    const order = responseData?.order || responseData?.data?.order || null;
    const paymentUrl = responseData?.payment_url || responseData?.data?.payment_url || null;

    if (!order) {
      // Fallback: return raw response for caller to inspect
      return responseData as any;
    }

    const mapped: CheckoutResponse = {
      order_id: order.id,
      cart_id: checkoutRequest.cart_id,
      order_number: order.order_code || order.order_number || "",
      status: order.status || "pending",
      total_amount: typeof order.total === 'string' ? parseFloat(order.total) : order.total || 0,
      delivery_fee: order.delivery_fee ? (typeof order.delivery_fee === 'string' ? parseFloat(order.delivery_fee) : order.delivery_fee) : 0,
      subtotal: order.subtotal ? (typeof order.subtotal === 'string' ? parseFloat(order.subtotal) : order.subtotal) : 0,
      estimated_delivery_time: order.estimated_delivery_time || "",
      // Prefer canonical paystack_ref, fallback to transaction_reference or legacy payment_reference
      payment_reference: order.paystack_ref || order.transaction_reference || order.payment_reference,
      payment_url: paymentUrl || null,
      fulfillment_mode: order.fulfillment_mode || checkoutRequest.fulfillment_mode,
    };

    return mapped;
  } catch (error: any) {
    logger.error("❌ Error during checkout:", error.message);
    throw error;
  }
}

//get user profile
export async function getUserProfile(): Promise<User> {
  try {
    // Get token if available (for Authorization header)
    const token = getAuthToken();

    // Always try the request - we rely on credentials: 'include' to send httpOnly cookies
    // The backend will respond with 401 if not authenticated (expected for anonymous users)
    const response = await fetch(`${BASE_URL}/users/profile/`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      // Include cookies for cookie-based auth (server-set httpOnly cookies)
      credentials: 'include',
    });

    if (!response.ok) {
      // 401 is expected for anonymous users - throw a specific error
      if (response.status === 401) {
        throw new Error("No authentication token found");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    logger.debug("🔐 USER PROFILE API - Response:", responseData);

    if (responseData.data) {
      return responseData.data as User;
    } else if (responseData) {
      return responseData as User;
    } else {
      throw new Error("No user data found in response");
    }
  } catch (error: any) {
    // 401 errors are expected for anonymous/unauthenticated users - suppress in production
    if (error.message && error.message.includes('401')) {
      if (process.env.NODE_ENV !== 'production') {
        logger.debug("No active session (expected for anonymous users)");
      }
    } else if (process.env.NODE_ENV !== 'production') {
      logger.error("Error fetching user profile:", error.message);
    }
    throw error;
  }
}

//logout user
export async function logoutUser(): Promise<void> {
  try {
    // Don't require a JS-readable token here. If the app uses httpOnly
    // cookies (recommended), the server can read the refresh token from the
    // cookie. Make the request with credentials: 'include' so cookies are
    // sent. If a JS-readable token exists, still include it as a header.
    const token = getAuthToken();
    const refreshToken = getCookie("refresh_token") || getCookie("refreshToken");

    const response = await fetch(`${BASE_URL}/users/logout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      logger.warn("Logout API failed, but proceeding with local cleanup");
    }

    // Centralized cleanup for auth cookies, localStorage and in-memory tokens
    clearAuthCookies();

    logger.info("✅ User logged out successfully");
  } catch (error: any) {
    logger.error("❌ Error during logout:", error.message);
    // Still clear cookies even if API call fails
    clearAuthCookies();
    throw error;
  }
}

// =============================================================================
// CART MANAGEMENT FUNCTIONS
// =============================================================================

//remove cart item
export async function removeCartItem(itemId: string): Promise<void> {
  try {
    const token = getAuthToken();

    const response = await fetch(`${BASE_URL}/orders/cart/remove-item/${itemId}/`, {
      method: "DELETE",
      headers: {
        ...attachCartTokenHeader({ Accept: "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const parsed = await parseApiError(response).catch(() => null);
      throw new Error(parsed || `HTTP error! status: ${response.status}`);
    }

    logger.info("✅ Cart item removed successfully");
  } catch (error: any) {
    logger.error("❌ Error removing cart item:", error.message);
    throw error;
  }
}

//clear entire cart
export interface ClearCartResponse {
  success: boolean;
  cleared_items?: number;
  cart_id?: string | null;
  outlet_name?: string | null;
  message?: string;
}

export async function clearCart(outletId: string): Promise<ClearCartResponse> {
  try {
    const token = getAuthToken();
    // Backend expects POST with JSON body { outlet_id }
    const response = await fetch(`${BASE_URL}/orders/cart/clear/`, {
      method: "POST",
      headers: {
        ...attachCartTokenHeader({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
      body: JSON.stringify({ outlet_id: outletId }),
    });

    if (!response.ok) {
      const parsed = await parseApiError(response).catch(() => null);
      throw new Error(parsed || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json().catch(() => null);
    logger.info("✅ Cart cleared successfully", data);
    // Normalize response shape
    return {
      success: data?.success ?? true,
      cleared_items: data?.cleared_items ?? data?.removed_items ?? 0,
      cart_id: data?.cart_id ?? null,
      outlet_name: data?.outlet_name ?? null,
      message: data?.message ?? null,
    } as ClearCartResponse;
  } catch (error: any) {
    logger.error("❌ Error clearing cart:", error.message);
    throw error;
  }
}

// Merge anonymous cart (identified by cart_token) into authenticated user's cart
// POST /orders/cart/merge/  (requires Authentication)
export async function mergeAnonymousCartIntoUser(outletId?: string): Promise<CartResponse | null> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required to merge carts');
    }

    // Require outletId to be provided by the caller
    const bodyPayload: any = {};
    if (outletId) bodyPayload.outlet_id = outletId;
    else throw new Error('mergeAnonymousCartIntoUser requires outletId as argument');

    const response = await fetch(`${BASE_URL}/orders/cart/merge/`, {
      method: 'POST',
      headers: {
        ...attachCartTokenHeader({
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }),
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      const parsed = await parseApiError(response).catch(() => null);
      logger.warn('Merge API failed:', response.status, parsed);
      throw new Error(parsed || `Merge failed with status ${response.status}`);
    }

    const data = await response.json().catch(() => null);
    // Server may clear cart_token cookie; clear local copy as well
    try { setCartToken(null); } catch (e) { /* ignore */ }

    if (data?.status === 'success' && data?.data) return data.data as CartResponse;
    if (data) return data as CartResponse;
    return null;
  } catch (error: any) {
    logger.error('❌ Error merging anonymous cart:', error.message);
    throw error;
  }
}

// =============================================================================
// ORDER MANAGEMENT FUNCTIONS
// =============================================================================

export interface Order {
  id: string;
  order_number: string;
  status: "pending_payment" | "placed" | "paid" | "confirmed" | "preparing" | "ready_pickup" | "ready_delivery" | "out_for_delivery" | "completed" | "delivered" | "cancelled" | "failed";
  items: OrderItem[];
  total_amount: number;
  delivery_fee: number;
  subtotal: number;
  tax: number;
  outlet: {
    id: string;
    name: string;
    address_text: string;
  };
  delivery_address?: string;
  estimated_delivery_time: string;
  fulfillment_mode: "delivery" | "pickup";
  customer_phone: string;
  special_instructions?: string;
  payment_ref?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  product: {
    id: string;
    title: string;
    image: string;
    price: string;
  };
  quantity: number;
  unit_price: string;
  total_price: string;
  special_instructions?: string;
}

export interface OrdersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Order[];
}

// Normalize order object from backend to the frontend Order interface
export function normalizeOrder(raw: any): Order {
  // Helper function to transform backend items to frontend OrderItem format
  const normalizeItems = (backendItems: any[]): OrderItem[] => {
    if (!Array.isArray(backendItems)) return [];

    return backendItems.map((item, index) => ({
      id: item.product_id || `item-${index}`,
      product: {
        id: item.product_id || '',
        title: item.product_name || 'Unknown Item',
        image: '', // Backend doesn't provide image in order items
        price: String(item.unit_price || 0)
      },
      quantity: Number(item.quantity || 0),
      unit_price: String(item.unit_price || 0),
      total_price: String(item.total_price || 0),
      special_instructions: item.special_notes || item.special_instructions || ''
    }));
  };

  if (!raw) {
    // return a minimal empty order shape to avoid crashes
    return {
      id: raw?.id || "",
      order_number: raw?.order_code || raw?.order_number || "",
      status: raw?.status || "pending",
      items: normalizeItems(raw?.items || []),
      total_amount: Number(raw?.total ?? raw?.total_amount ?? 0),
      delivery_fee: Number(raw?.delivery_fee ?? 0),
      subtotal: Number(raw?.subtotal ?? 0),
      tax: Number(raw?.tax ?? 0),
      outlet: raw?.outlet || { id: "", name: "Outlet", address_text: "" },
      delivery_address: raw?.delivery_address || raw?.delivery_address_text || "",
      estimated_delivery_time: raw?.estimated_delivery_time || "",
      fulfillment_mode: raw?.fulfillment_mode || raw?.fulfillment_mode || "delivery",
      customer_phone: raw?.customer_phone || "",
      created_at: raw?.created_at || raw?.placed_at || new Date().toISOString(),
      updated_at: raw?.updated_at || new Date().toISOString(),
    } as Order;
  }

  return {
    id: raw.id,
    order_number: raw.order_code || raw.order_number || "",
    status: raw.status || "pending",
    items: normalizeItems(raw.items || []),
    total_amount: Number(raw.total ?? raw.total_amount ?? 0),
    delivery_fee: Number(raw.delivery_fee ?? 0),
    subtotal: Number(raw.subtotal ?? 0),
    tax: Number(raw.tax ?? 0),
    outlet: raw.outlet || { id: "", name: "Outlet", address_text: "" },
    delivery_address: raw.delivery_address || raw.delivery_address_text || "",
    estimated_delivery_time: raw.estimated_delivery_time || "",
    fulfillment_mode: raw.fulfillment_mode || "delivery",
    customer_phone: raw.customer_phone || "",
    payment_ref: raw.payment_reference || raw.payment_info?.reference || raw.paystack_ref || "",
    created_at: raw.created_at || raw.placed_at || new Date().toISOString(),
    updated_at: raw.updated_at || new Date().toISOString(),
  } as Order;
}

//get user orders
export async function getUserOrders(
  page: number = 1,
  status?: string
): Promise<OrdersResponse> {
  try {
    const token = getAuthToken();

    if (!token) {
      throw new Error("No authentication token found");
    }

    let url = `${BASE_URL}/orders/orders/?page=${page}`;
    if (status) {
      url += `&status=${status}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    logger.debug("✅ User orders fetched successfully");

    // Normalize results to avoid runtime crashes when backend fields differ
    const data = responseData as OrdersResponse;
    if (data?.results && Array.isArray(data.results)) {
      data.results = data.results.map(normalizeOrder);
    }
    return data;
  } catch (error: any) {
    logger.error("❌ Error fetching user orders:", error.message);
    throw error;
  }
}

//get order details
export async function getOrderDetails(orderId: string): Promise<Order> {
  try {
    const token = getAuthToken();

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}/orders/${orderId}/`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    logger.debug("✅ Order details fetched successfully");

    const raw = responseData?.data ?? responseData;
    if (!raw) throw new Error("No order data found in response");
    return normalizeOrder(raw);
  } catch (error: any) {
    logger.error("❌ Error fetching order details:", error.message);
    throw error;
  }
}

//get payment status
export async function getPaymentStatus(orderId: string): Promise<{
  order_id: string;
  payment_status: string;
  payment_reference?: string;
  order_status: string;
}> {
  try {
    logger.debug("🔍 Getting payment status via order details for:", orderId);

    // Get order details which should include payment information
    const orderDetails = await getOrderDetails(orderId);

    logger.debug("✅ Payment status extracted from order details");

    // Extract payment information from order details
    // The backend should include payment info in the order response
    const payment_status = (orderDetails as any).payment_status ||
      (orderDetails as any).payment?.status ||
      'pending';
    const payment_reference = (orderDetails as any).payment_reference ||
      (orderDetails as any).payment?.paystack_ref ||
      (orderDetails as any).paystack_ref;
    const order_status = orderDetails.status || 'pending';

    return {
      order_id: orderDetails.id.toString(),
      payment_status,
      payment_reference,
      order_status
    };
  } catch (error: any) {
    logger.error("❌ Error fetching payment status:", error.message);
    throw error;
  }
}

// Get payment configuration (public keys, supported channels)
export async function getPaymentConfig(): Promise<{ public_key: string; currency: string; supported_channels: string[] }> {
  try {
    const response = await fetch(`${BASE_URL}/orders/payment/config/`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    if (data?.data) return data.data;
    return data;
  } catch (error: any) {
    logger.error('❌ Error fetching payment config:', error.message);
    throw error;
  }
}

// Initialize payment for an order - returns authorization_url / reference
export async function initializePayment(orderId: string, callbackUrl: string): Promise<{ authorization_url?: string; access_code?: string; reference?: string; amount?: number; amount_kobo?: number }> {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication required to initialize payment');

    const bodyPayload: any = { order_id: orderId, callback_url: callbackUrl };

    const response = await fetch(`${BASE_URL}/orders/payment/initialize/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => null);
      throw new Error(`Initialize payment failed: ${response.status} ${err || ''}`);
    }

    const data = await response.json();
    if (data?.data) return data.data;
    return data;
  } catch (error: any) {
    logger.error('❌ Error initializing payment:', error.message);
    throw error;
  }
}

// =============================================================================
// NOTIFICATION MANAGEMENT FUNCTIONS
// =============================================================================

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "order_update" | "promotion" | "system" | "delivery";
  is_read: boolean;
  order_id?: string;
  created_at: string;
  data?: any;
}

export interface NotificationsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
}

//get notifications
export async function getNotifications(
  page: number = 1,
  unread_only?: boolean
): Promise<NotificationsResponse> {
  try {
    const token = getAuthToken();

    if (!token) {
      // Return empty response for anonymous users instead of throwing
      return {
        count: 0,
        next: null,
        previous: null,
        results: []
      };
    }

    // backend registers PushNotificationViewSet under 'push-notifications'
    let url = `${BASE_URL}/notifications/push-notifications/?page=${page}`;
    if (unread_only) {
      url += `&is_read=false`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    logger.debug("✅ Notifications fetched successfully");

    return responseData as NotificationsResponse;
  } catch (error: any) {
    logger.error("❌ Error fetching notifications:", error.message);
    throw error;
  }
}

//mark notification as read
export async function markNotificationRead(id: string): Promise<void> {
  try {
    const token = getAuthToken();

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}/notifications/push-notifications/${id}/mark_read/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    logger.debug("✅ Notification marked as read");
  } catch (error: any) {
    logger.error("❌ Error marking notification as read:", error.message);
    throw error;
  }
}

//mark all notifications as read
export async function markAllNotificationsRead(): Promise<void> {
  try {
    const token = getAuthToken();

    if (!token) {
      throw new Error("No authentication token found");
    }

    // action is on the PushNotificationViewSet
    const response = await fetch(`${BASE_URL}/notifications/push-notifications/mark_all_read/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    logger.debug("✅ All notifications marked as read");
  } catch (error: any) {
    logger.error("❌ Error marking all notifications as read:", error.message);
    throw error;
  }
}

//get unread notification count
export async function getUnreadNotificationCount(): Promise<{ count: number }> {
  try {
    const token = getAuthToken();

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}/notifications/push-notifications/unread_count/`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    logger.debug("✅ Unread notification count fetched");

    if (responseData.data) {
      return responseData.data;
    } else if (responseData) {
      return responseData;
    } else {
      return { count: 0 };
    }
  } catch (error: any) {
    logger.error("❌ Error fetching unread notification count:", error.message);
    return { count: 0 }; // Return 0 on error to prevent UI breaks
  }
}

// =============================================================================
// ADDRESS MANAGEMENT FUNCTIONS
// =============================================================================

export interface Address {
  id: string;
  address_text: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  label?: string;
  created_at: string;
}

export interface AddressRequest {
  address_text: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
  label?: string;
}

//get user addresses
export async function getUserAddresses(): Promise<Address[]> {
  try {
    const token = getAuthToken();

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}/users/addresses/`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    logger.debug("✅ User addresses fetched successfully");

    if (responseData.data) {
      return responseData.data as Address[];
    } else if (Array.isArray(responseData)) {
      return responseData as Address[];
    } else {
      return [];
    }
  } catch (error: any) {
    logger.error("❌ Error fetching user addresses:", error.message);
    throw error;
  }
}

//add user address
export async function addUserAddress(address: AddressRequest): Promise<Address> {
  try {
    const token = getAuthToken();

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}/users/addresses/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(address),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message ||
        errorData?.detail ||
        `HTTP error! status: ${response.status}`
      );
    }

    const responseData = await response.json();
    logger.debug("✅ Address added successfully");

    if (responseData.data) {
      return responseData.data as Address;
    } else if (responseData) {
      return responseData as Address;
    } else {
      throw new Error("No address data found in response");
    }
  } catch (error: any) {
    logger.error("❌ Error adding address:", error.message);
    throw error;
  }
}

//update user address
export async function updateUserAddress(id: string, address: AddressRequest): Promise<Address> {
  try {
    const token = getAuthToken();

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}/users/addresses/${id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(address),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message ||
        errorData?.detail ||
        `HTTP error! status: ${response.status}`
      );
    }

    const responseData = await response.json();
    logger.debug("✅ Address updated successfully");

    if (responseData.data) {
      return responseData.data as Address;
    } else if (responseData) {
      return responseData as Address;
    } else {
      throw new Error("No address data found in response");
    }
  } catch (error: any) {
    logger.error("❌ Error updating address:", error.message);
    throw error;
  }
}

//delete user address
export async function deleteUserAddress(id: string): Promise<void> {
  try {
    const token = getAuthToken();

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}/users/addresses/${id}/`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    logger.debug("✅ Address deleted successfully");
  } catch (error: any) {
    logger.error("❌ Error deleting address:", error.message);
    throw error;
  }
}

// =============================================================================
// PROFILE MANAGEMENT FUNCTIONS
// =============================================================================

//update user profile (PATCH)
// This function has been moved to the end of the file with the new API structure

//upload profile picture
export async function uploadProfilePicture(file: File): Promise<{ profile_pic: string }> {
  try {
    const token = getAuthToken();

    if (!token) {
      throw new Error("No authentication token found");
    }

    const formData = new FormData();
    formData.append("profile_pic", file);

    const response = await fetch(`${BASE_URL}/users/profile/`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message ||
        errorData?.detail ||
        `HTTP error! status: ${response.status}`
      );
    }

    const responseData = await response.json();
    logger.debug("✅ Profile picture uploaded successfully");

    const userData = responseData.data || responseData;
    return { profile_pic: userData.profile_pic };
  } catch (error: any) {
    logger.error("❌ Error uploading profile picture:", error.message);
    throw error;
  }
}

//quick phone update for checkout
export async function updatePhoneForCheckout(phone: string): Promise<{ phone: string }> {
  try {
    const token = getAuthToken();

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}/users/profile/quick-phone-update/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ phone }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message ||
        errorData?.detail ||
        `HTTP error! status: ${response.status}`
      );
    }

    const responseData = await response.json();
    logger.debug("✅ Phone updated for checkout");

    if (responseData.data) {
      return responseData.data;
    } else if (responseData) {
      return responseData;
    } else {
      return { phone };
    }
  } catch (error: any) {
    logger.error("❌ Error updating phone for checkout:", error.message);
    throw error;
  }
}

// =============================================================================
// PRODUCT ENHANCEMENT FUNCTIONS
// =============================================================================

//toggle product like
export async function toggleProductLike(productId: string): Promise<{ liked: boolean }> {
  try {
    const token = getAuthToken();

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}/products/products/${productId}/toggle_like/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    logger.debug("✅ Product like toggled successfully");

    if (responseData.data) {
      return responseData.data;
    } else if (responseData) {
      return responseData;
    } else {
      return { liked: false };
    }
  } catch (error: any) {
    logger.error("❌ Error toggling product like:", error.message);
    throw error;
  }
}

//get liked products
export async function getLikedProducts(): Promise<Product[]> {
  try {
    const token = getAuthToken();

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}/products/products/favorites/`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    logger.debug("✅ Liked products fetched successfully");

    if (responseData.data) {
      return responseData.data as Product[];
    } else if (Array.isArray(responseData)) {
      return responseData as Product[];
    } else {
      throw new Error("No liked products found");
    }
  } catch (error: any) {
    logger.error("❌ Error fetching liked products:", error.message);
    throw error;
  }
}

// Update cart item quantity according to CUSTOMER_FLOW.md
export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number,
  outletId: string
): Promise<any | void> {
  try {
    const sessionInfo = await getSessionInfo(outletId);

    const response = await fetch(`${BASE_URL}/orders/cart/update-item/${cartItemId}/`, {
      method: "PUT", // Changed from PATCH to PUT as per API documentation
      headers: {
        ...attachCartTokenHeader({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        ...(getAuthToken() && { Authorization: `Bearer ${getAuthToken()}` }),
      },
      credentials: "include",
      body: JSON.stringify({ quantity }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `Failed to update cart item: ${response.status}`
      );
    }

    const responseData = await response.json().catch(() => null);
    logger.debug("✅ Cart item quantity updated successfully", responseData);

    // Backend returns { message, cart }
    if (responseData?.cart) return responseData.cart;
    if (responseData?.data) return responseData.data;
    return;
  } catch (error: any) {
    logger.error("❌ Error updating cart item quantity:", error.message);
    throw error;
  }
}

// Request OTP for authentication according to CUSTOMER_FLOW.md
export type OTPPurpose = "magic_auth" | "password_reset" | "email_verify" | "phone_verify";

export async function requestOTP(email: string, purpose: OTPPurpose = "magic_auth"): Promise<{ success: boolean; status?: number; message?: string; data?: any; errors?: any }> {
  try {
    const response = await fetch(`${BASE_URL}/users/request-otp/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, purpose }),
    });

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      logger.warn("🚫 OTP request failed", { status: response.status, body: responseData });
      return {
        success: false,
        status: response.status,
        message: responseData?.message || `Failed to request OTP: ${response.status}`,
        errors: responseData?.errors || null,
      };
    }

    logger.info("✅ OTP requested successfully", { body: responseData });
    return { success: true, status: response.status, data: responseData, message: responseData?.message || "OTP requested" };
  } catch (error: any) {
    logger.error("❌ Error requesting OTP:", error?.message || error);
    return { success: false, message: error?.message || "Request failed" };
  }
}

// Verify OTP and get authentication tokens according to CUSTOMER_FLOW.md
export async function verifyOTP(
  email: string,
  otp: string,
  purpose: OTPPurpose = "magic_auth"
): Promise<any> {
  try {
    // Include cart token when verifying OTP so backend can merge anonymous carts
    const cartToken = getCartToken();
    const response = await fetch(`${BASE_URL}/users/verify-otp/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: 'include',
      body: JSON.stringify({ email, otp, purpose, cart_token: cartToken }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `Failed to verify OTP: ${response.status}`
      );
    }

    const responseData = await response.json();
    logger.info("✅ OTP verified successfully");
    return responseData;
  } catch (error: any) {
    logger.error("❌ Error verifying OTP:", error.message);
    throw error;
  }
}

// Get user profile according to CUSTOMER_FLOW.md
export async function getUserProfileData(): Promise<User> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}/users/profile/`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `Failed to fetch profile: ${response.status}`
      );
    }

    const responseData = await response.json();
    logger.info("✅ User profile fetched successfully");

    if (responseData.status === 'success' && responseData.data) {
      return responseData.data as User;
    } else if (responseData) {
      return responseData as User;
    } else {
      throw new Error("No profile data found in response");
    }
  } catch (error: any) {
    logger.error("❌ Error fetching user profile:", error.message);
    throw error;
  }
}

// Update user profile according to CUSTOMER_FLOW.md
export async function updateUserProfile(profileData: Partial<User>): Promise<User> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}/users/profile/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `Failed to update profile: ${response.status}`
      );
    }

    const responseData = await response.json();
    logger.info("✅ User profile updated successfully");

    if (responseData.status === 'success' && responseData.data) {
      return responseData.data as User;
    } else if (responseData) {
      return responseData as User;
    } else {
      throw new Error("No profile data found in response");
    }
  } catch (error: any) {
    logger.error("❌ Error updating user profile:", error.message);
    throw error;
  }
}
