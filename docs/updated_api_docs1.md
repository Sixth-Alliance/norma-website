 the full customer journey from anonymous browsing to order completion:

# 🚀 **NORMA BACKEND - COMPLETE API FLOW DOCUMENTATION**

## 📋 **OVERVIEW & ARCHITECTURE**

### **Session Management:**

- **Anonymous Users**: Get automatic session ID for cart persistence (2 weeks expiration). In addition, anonymous carts are identified server-side with a generated UUID called `cart_token` that is returned as a cookie and may also be surfaced in responses.
- **Authenticated Users**: Cart data transfers from session to user account. The backend will attempt a server-side, atomic merge of any anonymous cart (identified by `cart_token` or `session_id`) into the user's cart at login.
- **Cart Isolation**: Each outlet has a separate cart (multi-outlet ordering).
- **Session Persistence**: Sessions survive browser restarts and system reboots.

Notes on `cart_token` and session handling:

- `cart_token` is a server-authoritative UUID assigned to anonymous carts. The backend sets a `cart_token` cookie on responses when a session-based cart is created. Cookie properties: SameSite=Lax, Secure=true, Max-Age ~14 days. The frontend may read this cookie (or use the `X-Cart-Token` header) to include it in subsequent cart requests.
- Preferred server lookup order: `X-Cart-Token` header -> `cart_token` cookie -> `session_id`. Use the header in single-page apps to avoid cookie parsing issues.
- Merge behavior: On successful authentication the backend will call a transactional merge routine (Cart.merge_carts) to combine the anonymous cart into the authenticated user's cart. An explicit endpoint is also provided for manual merge: POST `/api/v1/orders/cart/merge/` (requires authentication).
- Pruning: Old anonymous carts are cleaned up by a management command `manage.py prune_anonymous_carts --days 14` (or run via a scheduled job). See "Maintenance" below.

---

## 🔥 **PHASE 1: ANONYMOUS BROWSING (No Authentication Required)**

### **1.1 Initialize Session**

```http
GET /api/v1/orders/session/info/
```

**Purpose**: Get session ID for anonymous cart tracking
**Response**:

```json
{
  "session_id": "abc123xyz789",
  "is_authenticated": false,
  "user_id": null,
  "user_email": null,
  "session_data": {},
  "instructions": {
    "anonymous_cart": "Use session_id to track anonymous user carts",
    "cookie_name": "sessionid",
    "browser_storage": "Session persists until browser closes or cookies cleared"
  }
}
```

### **1.2 Browse Outlets**

```http
GET /api/v1/outlets/outlets/public/
```

**Purpose**: Get list of available outlets
**Response**:

```json
{
  "status": "success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Mario's Pizza Palace",
      "description": "Authentic Italian pizza",
      "address": "123 Lagos Street, VI",
      "phone": "+234 123 456 7890",
      "is_delivery_active": true,
      "is_pickup_active": true,
      "delivery_fee": "500.00",
      "delivery_radius_km": "10.0",
      "opening_hours": {...},
      "image": "https://cloudinary.com/..."
    }
  ]
}
```

### **1.3 Browse Products**

```http
GET /api/v1/products/products/?outlet={outlet_id}
```

**Purpose**: Get products for selected outlet
**Response**:

```json
{
  "status": "success",
  "data": [
    {
      "id": "abc123-def456",
      "title": "Margherita Pizza",
      "description": "Fresh tomatoes, mozzarella, basil",
      "price": "2500.00",
      "category": "Pizza",
      "is_available": true,
      "images": ["https://cloudinary.com/..."],
      "sizes": ["small", "medium", "large"],
      "extras": ["extra_cheese", "pepperoni"]
    }
  ]
}
```

---

## 🛒 **PHASE 2: CART MANAGEMENT (No Authentication Required)**

### **2.0 Cart identification: cart_token vs session_id**

The API supports two ways to identify anonymous carts. The backend prefers the `cart_token` identifier but will fall back to `session_id` for backward compatibility:

- cart_token (preferred): a server-generated UUID assigned to an anonymous cart and returned as a cookie named `cart_token` or exposed in response bodies/headers. You can also pass it explicitly on requests using the `X-Cart-Token` header.
- session_id (legacy): the Django session id (cookie `sessionid`) used previously. If both are present the backend uses `cart_token`.

Frontend guidance:

- When an anonymous cart is created the server will set the `cart_token` cookie on the response. Persist this token in your client state if you prefer (localStorage) and include it as `X-Cart-Token` in subsequent requests.
- If you need to support older clients rely on `session_id` until they are upgraded.

Behaviour on authentication:

- On successful authentication the backend will automatically try to merge the anonymous cart identified by `cart_token` (or `session_id`) into the user's existing cart. The merge is atomic and will transfer/merge items by product+variant, summing quantities and preserving extras/special notes where possible.
- If you prefer to trigger the merge explicitly after other client-side work (for example to refresh addresses first), call POST `/api/v1/orders/cart/merge/` while authenticated. The endpoint will return the updated user cart and will clear the `cart_token` cookie in its response.

### **2.1 Get Current Cart**

```http
GET /api/v1/orders/cart/current/?outlet_id={outlet_id}
```

**Response (Empty Cart)**:

```json
{
  "status": "success",
  "message": "Cart retrieved successfully",
  "data": {
    "id": null,
    "outlet": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Mario's Pizza Palace"
    },
    "items": [],
    "total_items": 0,
    "subtotal": "0.00",
    "created_at": null,
    "updated_at": null
  }
}
```

**Response (Cart with Items)**:

```json
{
  "status": "success",
  "message": "Cart retrieved successfully",
  "data": {
    "id": "cart-uuid-123",
    "outlet": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Mario's Pizza Palace"
    },
    "items": [
      {
        "id": "item-uuid-456",
        "product_id": "abc123-def456",
        "product_name": "Margherita Pizza",
        "product_price": "2500.00",
        "product_image": "https://cloudinary.com/image.jpg",
        "quantity": 2,
        "size": "large",
        "extras": ["extra_cheese"],
        "special_notes": "No onions please",
        "unit_price": "2500.00",
        "total_price": "5000.00",
        "is_available": true,
        "created_at": "2025-10-09T12:00:00Z"
      }
    ],
    "total_items": 2,
    "subtotal": "5000.00",
    "created_at": "2025-10-09T12:00:00Z",
    "updated_at": "2025-10-09T12:15:00Z"
  }
}
```

### **2.2 Add Items to Cart**

```http
POST /api/v1/orders/cart/add/
Content-Type: application/json

{
  "outlet_id": "550e8400-e29b-41d4-a716-446655440000",
  "product_id": "abc123-def456",
  "quantity": 2,
  "size": "large",
  "extras": ["extra_cheese"],
  "special_notes": "No onions please"
}
```

**Response**:

```json
{
  "status": "success",
  "message": "Item added to cart",
  "data": {
    "id": "cart-uuid-123",
    "outlet": {...},
    "items": [
      {
        "id": "item-uuid-456",
        "product": {
          "id": "abc123-def456",
          "title": "Margherita Pizza",
          "price": "2500.00"
        },
        "quantity": 2,
        "size": "large",
        "unit_price": "2500.00",
        "total_price": "5000.00",
        "extras": ["extra_cheese"],
        "special_notes": "No onions please"
      }
    ],
    "total_items": 2,
    "subtotal": "5000.00"
  }
}
```

### **2.3 Cart Item Calculations**

**Individual Item Price Calculation:**
```javascript
// Base price from product
const basePrice = product.price;

// Size modifications (if applicable)
const sizeMultiplier = getSizeMultiplier(selectedSize);
const adjustedPrice = basePrice * sizeMultiplier;

// Extras costs
const extrasTotal = extras.reduce((sum, extra) => sum + extra.price, 0);

// Final unit price
const unitPrice = adjustedPrice + extrasTotal;

// Total for this cart item
const totalPrice = unitPrice * quantity;
```

**Cart Subtotal Calculation:**
```javascript
const subtotal = cartItems.reduce((sum, item) => {
  return sum + item.total_price;
}, 0);
```

### **2.4 Update Cart Item Quantity**

```http
PUT /api/v1/orders/cart/update-item/{item_id}/
Content-Type: application/json

{
  "quantity": 3
}
```

### **2.5 Remove Cart Item**

```http
DELETE /api/v1/orders/cart/remove-item/{item_id}/
```

### **2.6 Clear Cart**

```http
POST /api/v1/orders/cart/clear/
Content-Type: application/json

{
  "outlet_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 🔐 **PHASE 3: AUTHENTICATION (Required for Checkout)**

### **3.1 Request OTP (Magic Auth)**

```http
POST /api/v1/users/request-otp/
Content-Type: application/json

{
  "email": "customer@example.com",
  "purpose": "magic_auth"
}
```

**Response**:

```json
{
  "status": "success",
  "message": "OTP sent to email"
}
```

### **3.2 Verify OTP & Login**

```http
POST /api/v1/users/verify-otp/
Content-Type: application/json

{
  "email": "customer@example.com",
  "otp": "123456",
  "purpose": "magic_auth",
  "session_id": "abc123xyz789"
}
```

**Response**:

```json
{
  "status": "success",
  "message": "Authentication successful",
  "data": {
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "990e8400-e29b-41d4-a716-446655440000",
      "email": "customer@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+234 123 456 7890",
      "role": "customer",
      "is_email_verified": true,
      "addresses": [...]
    }
  }
}
```

**Note**: Anonymous cart automatically transfers to user account upon authentication.

---

## 📍 **PHASE 4: ADDRESS MANAGEMENT (For Delivery)**

### **4.1 Get User Addresses**

```http
GET /api/v1/users/addresses/
Authorization: Bearer {access_token}
```

### **4.2 Add New Address (Google Places Integration)**

```http
POST /api/v1/users/addresses/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "address_text": "123 Main Street, Victoria Island, Lagos",
  "latitude": 6.4281,
  "longitude": 3.4219,
  "label": "Home",
  "is_default": true
}
```

---

## 🚚 **PHASE 5: FULFILLMENT MODE & DELIVERY**

### **5.1 Calculate Delivery Fee (Method 1: Cart-Based)**

```http
POST /api/v1/orders/cart/{cart_id}/delivery_fee/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "delivery_address": "123 Main Street, Victoria Island, Lagos",
  "fulfillment_mode": "delivery",
  "latitude": 6.4281,
  "longitude": 3.4219
}
```

**Response**:

```json
{
  "success": true,
  "delivery_fee": "650.00",
  "breakdown": {
    "base_fee": "500.00",
    "distance_fee": "150.00",
    "total": "650.00"
  },
  "distance_km": 5.2,
  "fulfillment_mode": "delivery",
  "message": "Delivery fee calculated successfully"
}
```

### **5.2 Calculate Delivery Fee (Method 2: Direct Calculation)**

```http
POST /api/v1/orders/delivery/calculate-fee/
Content-Type: application/json

{
  "outlet_id": "550e8400-e29b-41d4-a716-446655440000",
  "order_subtotal": "5000.00",
  "delivery_latitude": 6.4281,
  "delivery_longitude": 3.4219
}
```

**Response**:

```json
{
  "fee": "650.00",
  "is_free": false,
  "can_deliver": true,
  "distance_km": 5.2,
  "breakdown": {
    "base_fee": "500.00",
    "distance_fee": "150.00"
  },
  "reason": "Standard delivery fee"
}
```

### **5.3 Free Delivery Logic**

**Free delivery is triggered when:**
- Order subtotal ≥ Platform free delivery threshold (e.g., ₦5,000)
- Distance within free delivery zone (e.g., 2km from outlet)

**Response for Free Delivery**:

```json
{
  "fee": "0.00",
  "is_free": true,
  "can_deliver": true,
  "distance_km": 1.8,
  "breakdown": {
    "base_fee": "500.00",
    "distance_fee": "0.00",
    "total": "0.00"
  },
  "reason": "Free delivery for orders ≥ ₦5,000"
}
```

### **5.4 For Pickup Mode**

```http
POST /api/v1/orders/cart/{cart_id}/delivery_fee/
Content-Type: application/json

{
  "fulfillment_mode": "pickup"
}
```

**Response**:

```json
{
  "success": true,
  "delivery_fee": "0.00",
  "fulfillment_mode": "pickup",
  "message": "No delivery fee for pickup orders"
}
```

### **5.5 Delivery Fee Calculation Logic**

**Base Fee Structure:**
- **Outlet Base Fee**: Set per outlet (e.g., ₦500)
- **Platform Default**: Fallback if outlet has no specific fee
- **Distance-Based Pricing**: Additional fee per km beyond free zone
- **Free Delivery Threshold**: Minimum order amount for free delivery

**Distance Calculation:**
- Uses Haversine formula for precise distance calculation
- Factors in outlet coordinates vs delivery coordinates
- Considers delivery radius limits per outlet

**Platform Configuration:**
```json
{
  "free_delivery_threshold": "5000.00",
  "free_distance_km": "2.0",
  "distance_fee_per_km": "50.00",
  "default_delivery_fee": "500.00",
  "max_delivery_radius_km": "15.0"
}
```

---

## 🛍️ **PHASE 6: CHECKOUT & ORDER CREATION**

### **6.1 Promo Code Validation (Optional)**

```http
POST /api/v1/platform-configs/promo-codes/validate/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "code": "WELCOME20",
  "cart_total": "5000.00"
}
```

**Response (Valid Promo)**:

```json
{
  "success": true,
  "message": "Promo code is valid",
  "data": {
    "code": "WELCOME20",
    "discount_amount": "1000.00",
    "new_total": "4000.00",
    "description": "20% off for new customers"
  }
}
```

**Response (Invalid Promo)**:

```json
{
  "success": false,
  "message": "Promo code validation failed",
  "data": {
    "errors": ["Promo code has expired", "Minimum order amount not met"]
  }
}
```

### **6.2 Checkout Cart**

```http
POST /api/v1/orders/cart/checkout/
Authorization: Bearer {access_token}
Content-Type: application/json

// For Delivery with Address Coordinates
{
  "cart_id": "cart-uuid-123",
  "fulfillment_mode": "delivery",
  "delivery_address_text": "123 Main Street, Victoria Island, Lagos",
  "delivery_latitude": 6.4281,
  "delivery_longitude": 3.4219,
  "customer_phone": "+234 123 456 7890",
  "special_instructions": "Ring doorbell twice",
  "promo_code": "WELCOME20"
}

// For Delivery with Saved Address
{
  "cart_id": "cart-uuid-123", 
  "fulfillment_mode": "delivery",
  "user_address_id": "address-uuid-456",
  "customer_phone": "+234 123 456 7890",
  "special_instructions": "Ring doorbell twice",
  "promo_code": "WELCOME20"
}

// For Pickup
{
  "cart_id": "cart-uuid-123",
  "fulfillment_mode": "pickup",
  "customer_phone": "+234 123 456 7890",
  "special_instructions": "Please prepare order by 2 PM",
  "promo_code": "WELCOME20"
}
```

**Response (with Complete Calculation Breakdown)**:

```json
{
  "status": "success",
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": "order-uuid-789",
      "order_code": "ORD-2025-001234",
      "status": "pending_payment",
      "fulfillment_mode": "delivery",
      "items": [
        {
          "product_id": "abc123-def456",
          "product_name": "Margherita Pizza",
          "quantity": 2,
          "unit_price": "2500.00",
          "total_price": "5000.00",
          "size": "large",
          "extras": ["extra_cheese"],
          "special_notes": "No onions please"
        }
      ],
      "pricing_breakdown": {
        "subtotal": "5000.00",
        "promo_code": "WELCOME20",
        "promo_discount": "1000.00",
        "discounted_subtotal": "4000.00",
        "delivery_fee": "650.00",
        "delivery_breakdown": {
          "base_fee": "500.00",
          "distance_fee": "150.00",
          "distance_km": 5.2
        },
        "tax": "348.75",
        "tax_rate": "7.5%",
        "total": "4998.75"
      },
      "delivery_address": "123 Main Street, Victoria Island, Lagos",
      "delivery_coordinates": {
        "latitude": "6.4281",
        "longitude": "3.4219"
      },
      "customer_phone": "+234 123 456 7890",
      "special_instructions": "Ring doorbell twice",
      "estimated_delivery_time": "2025-10-09T14:30:00Z",
      "estimated_prep_time": "25-30 minutes"
    },
    "payment_url": "https://checkout.paystack.com/xyz123",
    "paystack_ref": "ref_abc123xyz789"
  }
}
```

### **6.3 Address Handling Options**

**Option 1: Direct Coordinates (Recommended)**
- Use Google Places Autocomplete to get precise coordinates
- Provides most accurate delivery fee calculation
- Required: `delivery_address_text`, `delivery_latitude`, `delivery_longitude`

**Option 2: Saved User Address**
- Reference previously saved address for authenticated users
- Address coordinates retrieved from user's address book
- Required: `user_address_id`

**Option 3: Address Text Only (Fallback)**
- Less accurate delivery fee calculation
- May result in higher delivery fees due to distance estimation
- Required: `delivery_address_text`

### **6.4 Order Calculation Logic**

**Step-by-Step Calculation:**
```javascript
// 1. Calculate cart subtotal
const subtotal = cart.items.reduce((sum, item) => sum + item.total_price, 0);

// 2. Apply promo code discount (if valid)
let promo_discount = 0;
if (promo_code && isValidPromoCode(promo_code, subtotal)) {
  if (promo_code.discount_type === 'percentage') {
    promo_discount = subtotal * (promo_code.discount_value / 100);
  } else if (promo_code.discount_type === 'fixed') {
    promo_discount = Math.min(promo_code.discount_value, subtotal);
  }
}

// 3. Calculate discounted subtotal
const discounted_subtotal = subtotal - promo_discount;

// 4. Calculate delivery fee (if delivery mode)
let delivery_fee = 0;
if (fulfillment_mode === 'delivery') {
  delivery_fee = calculateDeliveryFee(outlet, delivery_coordinates, discounted_subtotal);
}

// 5. Calculate tax (7.5% VAT on discounted subtotal + delivery fee)
const taxable_amount = discounted_subtotal + delivery_fee;
const tax = taxable_amount * 0.075;

// 6. Calculate final total
const total = discounted_subtotal + delivery_fee + tax;
```

**Tax Calculation (7.5% VAT):**
```javascript
// Applied to discounted subtotal + delivery fee
const taxableAmount = discountedSubtotal + deliveryFee;
const tax = taxableAmount * 0.075; // 7.5%
const total = discountedSubtotal + deliveryFee + tax;
```

**Promo Code Discount Types:**
- **Percentage**: E.g., 20% off total order
- **Fixed Amount**: E.g., ₦500 off order
- **Outlet-Specific**: Valid only for specific outlets
- **Global**: Valid across all outlets

**Order Total Formula:**
```
1. Subtotal = Sum of all cart item prices
2. Promo Discount = Apply promo code discount to subtotal
3. Discounted Subtotal = Subtotal - Promo Discount
4. Delivery Fee = Calculate based on distance/outlet settings
5. Tax = (Discounted Subtotal + Delivery Fee) × 0.075
6. Final Total = Discounted Subtotal + Delivery Fee + Tax
```
      "tax": "0.00",
      "total": "5500.00",
      "delivery_address": "123 Main Street, Victoria Island, Lagos",
      "customer_phone": "+234 123 456 7890",
      "estimated_delivery_time": "2025-10-09T14:30:00Z"
    },
    "payment_url": "https://checkout.paystack.com/xyz123",
    "instructions": {
      "next_step": "Complete payment using the payment URL",
      "cart_status": "Cart preserved until payment completion"
    }
  }
}
```

---

## 💳 **PHASE 7: PAYMENT PROCESSING**

### **7.1 Get Payment Configuration**

```http
GET /api/v1/orders/payments/config/
```

**Response**:

```json
{
  "status": "success",
  "data": {
    "public_key": "pk_test_xxxxxx",
    "currency": "NGN",
    "supported_channels": ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"]
  }
}
```

### **7.2 Initialize Payment**

```http
POST /api/v1/orders/payments/initialize/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "order_id": "order-uuid-789",
  "callback_url": "https://yourapp.com/payment/callback"
}
```

**Response**:

```json
{
  "status": "success",
  "data": {
    "authorization_url": "https://checkout.paystack.com/xyz123",
    "access_code": "xyz123abc",
    "reference": "ref_123456789"
  }
}
```

### **7.3 Frontend Payment Integration**

```javascript
// Using Paystack Popup
PaystackPop.setup({
  key: 'pk_test_xxxxxx',
  email: 'customer@example.com',
  amount: 550000, // Amount in kobo (5500 * 100)
  ref: 'ref_123456789',
  callback: function(response) {
    // Payment successful
    verifyPayment(response.reference, orderId);
  }
}).openIframe();
```

### **7.4 Verify Payment**

```http
POST /api/v1/orders/payments/verify/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "reference": "ref_123456789",
  "order_id": "order-uuid-789"
}
```

**Response**:

```json
{
  "status": "success",
  "data": {
    "verified": true,
    "reference": "ref_123456789",
    "amount": "5500.00",
    "currency": "NGN",
    "order_status": "placed",
    "transaction_date": "2025-10-09T12:30:00Z",
    "message": "Payment verified successfully"
  }
}
```

---

## 📦 **PHASE 8: ORDER TRACKING & MANAGEMENT**

### **8.1 Get User Orders**

```http
GET /api/v1/orders/
Authorization: Bearer {access_token}
```

**Response**:

```json
{
  "status": "success",
  "data": {
    "results": [
      {
        "id": "order-uuid-789",
        "order_code": "ORD-2025-001234",
        "status": "preparing",
        "fulfillment_mode": "delivery",
        "outlet": {
          "name": "Mario's Pizza Palace",
          "phone": "+234 123 456 7890"
        },
        "total": "5500.00",
        "placed_at": "2025-10-09T12:30:00Z",
        "estimated_delivery_time": "2025-10-09T14:30:00Z"
      }
    ]
  }
}
```

### **8.2 Get Order Details**

```http
GET /api/v1/orders/{order_id}/
Authorization: Bearer {access_token}
```

**Response**:

```json
{
  "status": "success",
  "data": {
    "id": "order-uuid-789",
    "order_code": "ORD-2025-001234",
    "status": "preparing",
    "fulfillment_mode": "delivery",
    "items": [
      {
        "product_name": "Margherita Pizza",
        "quantity": 2,
        "size": "large",
        "unit_price": "2500.00",
        "total_price": "5000.00"
      }
    ],
    "subtotal": "5000.00",
    "delivery_fee": "500.00",
    "total": "5500.00",
    "delivery_address": "123 Main Street, Victoria Island, Lagos",
    "customer_phone": "+234 123 456 7890",
    "placed_at": "2025-10-09T12:30:00Z",
    "estimated_delivery_time": "2025-10-09T14:30:00Z",
    "status_timeline": [
      {
        "status": "placed",
        "timestamp": "2025-10-09T12:30:00Z",
        "description": "Order placed successfully"
      },
      {
        "status": "preparing",
        "timestamp": "2025-10-09T12:45:00Z",
        "description": "Order is being prepared"
      }
    ]
  }
}
```

### **8.3 Order Status Flow**

```
pending_payment → placed → preparing → ready_pickup/ready_delivery → 
out_for_delivery (delivery only) → completed
```

### **8.4 Public Order Tracking (No Auth Required)**

```http
GET /api/v1/orders/track/{order_code}/
```

**Response**:

```json
{
  "status": "success",
  "data": {
    "order_code": "ORD-2025-001234",
    "status": "preparing",
    "fulfillment_mode": "delivery",
    "customer_name": "John Doe",
    "outlet_name": "Mario's Pizza Palace",
    "outlet_phone": "+234 123 456 7890",
    "placed_at": "2025-10-09T12:30:00Z",
    "estimated_delivery_time": "2025-10-09T14:30:00Z",
    "status_timeline": [...]
  }
}
```

---

## 🔔 **PHASE 9: NOTIFICATIONS & UPDATES**

### **9.1 Get Notifications**

```http
GET /api/v1/notifications/
Authorization: Bearer {access_token}
```

### **9.2 Real-time Updates**

- Push notifications sent automatically on order status changes
- Email notifications for major status updates
- SMS notifications for delivery updates

---

## 🔄 **SESSION & CART BEHAVIOR**

### **Anonymous User Sessions:**

- **Duration**: 2 weeks (1,209,600 seconds)
- **Persistence**: Survives browser restarts and system reboots
- **Storage**: Server-side session store
- **Cart Retention**: Up to 2 weeks of inactivity

### **User Login Behavior:**

- **Cart Transfer**: Anonymous cart automatically transfers to user account
- **Cart Merge**: If user has existing cart, items are merged intelligently
- **Session Cleanup**: Anonymous session cleaned after successful login

### **User Logout Behavior:**

- **Cart Preservation**: User cart remains in database
- **Session Cleanup**: JWT tokens invalidated
- **Re-login**: User can access same cart items upon re-authentication

### **Cart Expiration:**

- **Anonymous**: 2 weeks of inactivity
- **Authenticated**: No expiration (permanent until user deletes)
- **Payment Pending**: Cart preserved until payment completion or failure

---

## ⚙️ **PLATFORM CONFIGURATION ENDPOINTS**

### **10.1 Delivery Settings (Admin Only)**

```http
GET /api/v1/platform-configs/delivery-settings/
Authorization: Bearer {admin_token}
```

**Response**:

```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "Global Delivery Settings",
      "free_delivery_threshold": "5000.00",
      "free_distance_km": "2.0",
      "distance_fee_per_km": "50.00",
      "default_delivery_fee": "500.00",
      "max_delivery_radius_km": "15.0",
      "enable_surge_pricing": false,
      "surge_multiplier": "1.5",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-10-09T12:00:00Z"
    }
  ]
}
```

### **10.2 Promo Codes Management (Admin Only)**

**List Promo Codes:**
```http
GET /api/v1/platform-configs/promo-codes/
Authorization: Bearer {admin_token}
```

**Create Promo Code:**
```http
POST /api/v1/platform-configs/promo-codes/
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "code": "NEWUSER25",
  "outlet": null,
  "discount_type": "percentage",
  "discount_value": "25.00",
  "valid_from": "2025-10-01T00:00:00Z",
  "valid_until": "2025-12-31T23:59:59Z",
  "max_uses": 500,
  "is_active": true
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 123,
    "code": "NEWUSER25",
    "outlet": null,
    "outlet_name": null,
    "discount_type": "percentage",
    "discount_value": "25.00",
    "valid_from": "2025-10-01T00:00:00Z",
    "valid_until": "2025-12-31T23:59:59Z",
    "max_uses": 500,
    "current_uses": 0,
    "is_active": true,
    "created_at": "2025-10-09T12:00:00Z",
    "updated_at": "2025-10-09T12:00:00Z"
  }
}
```

### **10.3 Outlet-Specific Settings**

**Get Outlet Delivery Settings:**
```http
GET /api/v1/outlets/{outlet_id}/delivery-settings/
Authorization: Bearer {token}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "outlet_id": "550e8400-e29b-41d4-a716-446655440000",
    "outlet_name": "Mario's Pizza Palace",
    "is_delivery_active": true,
    "is_pickup_active": true,
    "delivery_fee": "500.00",
    "delivery_radius_km": "10.0",
    "coordinates": {
      "latitude": "6.5244",
      "longitude": "3.3792"
    },
    "operating_hours": {
      "monday": {"open": "09:00", "close": "22:00"},
      "tuesday": {"open": "09:00", "close": "22:00"},
      "wednesday": {"open": "09:00", "close": "22:00"},
      "thursday": {"open": "09:00", "close": "22:00"},
      "friday": {"open": "09:00", "close": "23:00"},
      "saturday": {"open": "10:00", "close": "23:00"},
      "sunday": {"open": "10:00", "close": "21:00"}
    }
  }
}
```

---

## 🚨 **ERROR HANDLING**

### **Common Error Responses:**

```json
{
  "status": "error", 
  "message": "Human readable error message",
  "error_code": "CART_EMPTY",
  "details": {
    "field": "specific error details"
  }
}
```

### **Delivery Fee Calculation Errors:**

**Address Outside Delivery Radius:**
```json
{
  "success": false,
  "error": "Cannot deliver to this address",
  "reason": "Address outside delivery radius",
  "delivery_fee_details": {
    "fee": null,
    "can_deliver": false,
    "distance_km": 18.5,
    "max_radius_km": 15.0
  }
}
```

**Outlet Not Delivering:**
```json
{
  "success": false,
  "error": "Delivery not available",
  "reason": "Outlet has disabled delivery service"
}
```

**Invalid Coordinates:**
```json
{
  "error": "delivery_address is required for delivery mode",
  "message": "Address coordinates missing"
}
```

### **Cart & Checkout Errors:**

**Empty Cart:**
```json
{
  "error": "Cart is empty",
  "message": "Cannot proceed to checkout with empty cart"
}
```

**Product Unavailable:**
```json
{
  "error": "Some items are no longer available",
  "unavailable_items": [
    {
      "product_id": "abc123",
      "product_name": "Pizza Margherita",
      "reason": "Out of stock"
    }
  ]
}
```

**Authentication Errors:**
```json
{
  "error": "Authentication credentials were not provided.",
  "error_code": "AUTHENTICATION_REQUIRED"
}
```

### **Promo Code Validation Errors:**

```json
{
  "success": false,
  "message": "Promo code validation failed",
  "data": {
    "errors": [
      "Promo code has expired",
      "Maximum usage limit reached",
      "Minimum order amount not met"
    ]
  }
}
```

### **HTTP Status Codes:**

- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (missing/invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **500**: Internal Server Error

---

## 🔧 **TECHNICAL IMPLEMENTATION NOTES**

### **Cart & Pricing Calculations:**

**Cart Item Total Price:**
```javascript
// Individual cart item calculation
const cartItem = {
  unit_price: product.price + extras_total,
  total_price: (product.price + extras_total) * quantity
};
```

**Cart Subtotal:**
```javascript
const subtotal = cart.items.reduce((sum, item) => {
  return sum + item.total_price;
}, 0);
```

**Delivery Fee Calculation Steps:**
1. **Base Fee**: Get from outlet settings or platform default
2. **Distance Calculation**: Use Haversine formula between outlet and delivery coordinates
3. **Distance Fee**: Apply per-km charge beyond free distance zone
4. **Free Delivery Check**: Apply if order meets minimum threshold
5. **Final Fee**: `base_fee + distance_fee` (unless free delivery applies)

**Tax Calculation (7.5% VAT):**
```javascript
// Tax applied to: (subtotal - promo_discount) + delivery_fee
const taxable_amount = (subtotal - promo_discount) + delivery_fee;
const tax = taxable_amount * 0.075; // 7.5% VAT
```

**Order Total Formula:**
```javascript
const order_total = (subtotal - promo_discount) + delivery_fee + tax;
```

**Promo Code Logic:**
- **Percentage Discount**: `discount = subtotal * (discount_value / 100)`
- **Fixed Discount**: `discount = discount_value`
- **Validation**: Check expiry, usage limits, outlet restrictions
- **Application**: Applied to subtotal before tax calculation

### **Authentication:**

- JWT tokens for authenticated users
- Session-based for anonymous users
- Token refresh mechanism implemented
- Cart ownership validation on checkout

### **Cart Management:**

- One cart per outlet per user/session
- Real-time pricing calculations with product availability validation
- Cart item price updates when product prices change
- Automatic cart cleanup for expired anonymous sessions

### **Delivery Fee Architecture:**

**Platform-Level Settings:**
- **Free Delivery Threshold**: Global minimum order amount
- **Default Delivery Fee**: Fallback when outlet has no specific fee
- **Max Delivery Radius**: Platform-wide limit for delivery coverage
- **Distance-Based Pricing**: Per-km charges beyond free delivery zone

**Outlet-Level Settings:**
- **Custom Delivery Fee**: Override platform default
- **Delivery Radius**: Outlet-specific coverage area (within platform limit)
- **Coordinates**: Precise location for distance calculations
- **Active Status**: Enable/disable delivery per outlet

**Real-time Calculation:**
```javascript
// DeliveryFeeCalculator logic
function calculateDeliveryFee(outlet, delivery_coordinates, order_subtotal) {
  // 1. Check if delivery is active
  if (!outlet.is_delivery_active) return null;
  
  // 2. Calculate distance using Haversine formula
  const distance = calculateDistance(outlet.coordinates, delivery_coordinates);
  
  // 3. Check if within delivery radius
  if (distance > outlet.delivery_radius_km) return null;
  
  // 4. Get base fee (outlet or platform default)
  const base_fee = outlet.delivery_fee || platform_settings.default_delivery_fee;
  
  // 5. Calculate distance fee
  const free_distance = platform_settings.free_distance_km;
  const distance_fee = Math.max(0, (distance - free_distance)) * platform_settings.distance_fee_per_km;
  
  // 6. Check for free delivery
  if (order_subtotal >= platform_settings.free_delivery_threshold) {
    return { fee: 0, is_free: true, reason: "Free delivery threshold met" };
  }
  
  // 7. Return calculated fee
  return {
    fee: base_fee + distance_fee,
    breakdown: { base_fee, distance_fee },
    distance_km: distance,
    is_free: false
  };
}
```

### **Payment Security:**

- Paystack webhook signature validation
- Duplicate payment prevention via transaction references
- Order status locked during payment processing
- Transaction verification before order confirmation

### **Performance Optimizations:**

- Database indexing on critical fields (cart ownership, product lookups)
- Prefetched related objects for cart serialization efficiency
- Pagination for large result sets
- Caching for delivery settings and outlet configurations

### **Session Management:**

- **Anonymous Sessions**: 2-week expiration with automatic cleanup
- **Cart Transfer**: Seamless migration from anonymous to authenticated state
- **Session Security**: HttpOnly cookies with CSRF protection
- **Persistence**: Server-side session storage for reliability

---

## 🌟 **CUSTOMER FLOW ENDPOINTS**

### 📋 **Order Management**

#### Get Order List
```http
GET /api/v1/orders/
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status`: Filter by order status (placed, confirmed, preparing, ready, dispatched, delivered, cancelled)
- `outlet_id`: Filter by specific outlet
- `page`: Pagination (1-based)

**Response:**
```json
{
  "count": 25,
  "next": "http://api/orders/?page=2",
  "previous": null,
  "results": [
    {
      "id": "uuid",
      "order_number": "ORD-2024-001",
      "status": "delivered",
      "outlet": {
        "id": "uuid",
        "name": "Mario's Pizza Palace"
      },
      "total_amount": "45.50",
      "items_count": 3,
      "created_at": "2024-01-15T10:30:00Z",
      "estimated_delivery": "2024-01-15T11:00:00Z"
    }
  ]
}
```

#### Get Order Details
```http
GET /api/v1/orders/{order_id}/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "id": "uuid",
  "order_number": "ORD-2024-001",
  "status": "delivered",
  "outlet": {
    "id": "uuid",
    "name": "Mario's Pizza Palace",
    "address": "123 Main Street"
  },
  "items": [
    {
      "id": "uuid",
      "product": {
        "id": "uuid",
        "name": "Margherita Pizza",
        "price": "25.00"
      },
      "quantity": 2,
      "unit_price": "25.00",
      "total_price": "50.00",
      "extras": ["extra_cheese"],
      "special_notes": "Extra crispy"
    }
  ],
  "subtotal": "50.00",
  "delivery_fee": "5.00",
  "tax_amount": "4.13",
  "promo_discount": "0.00",
  "total_amount": "59.13",
  "delivery_address": {
    "address_text": "456 Oak Street, Lagos",
    "latitude": 6.5244,
    "longitude": 3.3792
  },
  "payment": {
    "method": "paystack",
    "status": "completed",
    "reference": "PAY_abc123"
  },
  "created_at": "2024-01-15T10:30:00Z",
  "estimated_delivery": "2024-01-15T11:00:00Z",
  "delivered_at": "2024-01-15T10:55:00Z"
}
```

### 💳 **Payment History**

#### Get Payment History
```http
GET /api/v1/orders/payment/history/
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `page`: Pagination (1-based)
- `start_date`: Filter from date (YYYY-MM-DD)
- `end_date`: Filter to date (YYYY-MM-DD)

**Response:**
```json
{
  "count": 15,
  "next": "http://api/orders/payment/history/?page=2",
  "previous": null,
  "results": [
    {
      "id": "uuid",
      "order_number": "ORD-2024-001",
      "payment_reference": "PAY_abc123",
      "amount": "59.13",
      "status": "completed",
      "payment_method": "paystack",
      "created_at": "2024-01-15T10:30:00Z",
      "receipt_url": "/api/v1/orders/payment/receipt/PAY_abc123/"
    }
  ]
}
```

#### Get Payment Configuration
```http
GET /api/v1/orders/payment/config/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "paystack": {
    "public_key": "pk_test_xxxxx",
    "currency": "NGN",
    "supported_channels": ["card", "bank", "ussd", "qr"]
  },
  "tax_rate": 0.075,
  "minimum_order_amount": "10.00"
}
```

### 🔔 **Notifications**

#### Get Push Notifications
```http
GET /api/v1/notifications/push/
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `unread_only`: Show only unread notifications (true/false)
- `page`: Pagination (1-based)

**Response:**
```json
{
  "count": 8,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "uuid",
      "title": "Order Delivered! 🎉",
      "message": "Your order ORD-2024-001 has been delivered successfully",
      "notification_type": "order_delivered",
      "is_read": false,
      "order_id": "uuid",
      "created_at": "2024-01-15T10:55:00Z"
    },
    {
      "id": "uuid", 
      "title": "Payment Confirmed ✅",
      "message": "Payment for order ORD-2024-001 confirmed. Preparing your order!",
      "notification_type": "payment_confirmed",
      "is_read": true,
      "order_id": "uuid",
      "created_at": "2024-01-15T10:32:00Z"
    }
  ]
}
```

#### Mark Notification as Read
```http
POST /api/v1/notifications/push/{notification_id}/mark_read/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "status": "success",
  "message": "Notification marked as read"
}
```

#### Mark All Notifications as Read
```http
POST /api/v1/notifications/push/mark_all_read/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "status": "success",
  "message": "All notifications marked as read",
  "marked_count": 5
}
```

#### Get Unread Count
```http
GET /api/v1/notifications/push/unread_count/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "unread_count": 3
}
```

### 👤 **User Profile Management**

#### Get User Profile
```http
GET /api/v1/users/profile/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+2348123456789",
  "profile_pic": "https://cloudinary.com/image.jpg",
  "marketing_consent": true,
  "two_factor_enabled": false,
  "date_joined": "2024-01-01T00:00:00Z",
  "addresses": [
    {
      "id": "uuid",
      "address_text": "123 Main Street, Lagos",
      "latitude": 6.5244,
      "longitude": 3.3792,
      "label": "Home",
      "is_default": true
    }
  ]
}
```

#### Update User Profile
```http
PATCH /api/v1/users/profile/
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+2348123456789",
  "marketing_consent": false
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Smith",
    "phone": "+2348123456789",
    "marketing_consent": false
  }
}
```

### 🏠 **Address Management**

#### List User Addresses
```http
GET /api/v1/users/addresses/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "address_text": "123 Main Street, Victoria Island, Lagos",
      "latitude": 6.4281,
      "longitude": 3.4219,
      "label": "Home",
      "is_default": true,
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "address_text": "456 Office Building, Ikoyi, Lagos",
      "latitude": 6.4474,
      "longitude": 3.4553,
      "label": "Work",
      "is_default": false,
      "created_at": "2024-01-05T00:00:00Z"
    }
  ]
}
```

#### Create New Address
```http
POST /api/v1/users/addresses/
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "address_text": "789 New Street, Lekki, Lagos",
  "latitude": 6.4698,
  "longitude": 3.5852,
  "label": "Sister's Place",
  "is_default": false
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Address created successfully",
  "data": {
    "id": "uuid",
    "address_text": "789 New Street, Lekki, Lagos",
    "latitude": 6.4698,
    "longitude": 3.5852,
    "label": "Sister's Place",
    "is_default": false,
    "created_at": "2024-01-15T12:00:00Z"
  }
}
```

#### Update Address
```http
PUT /api/v1/users/addresses/{address_id}/
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "address_text": "789 Updated Street, Lekki, Lagos",
  "latitude": 6.4698,
  "longitude": 3.5852,
  "label": "Home Office",
  "is_default": false
}
```

#### Set Default Address
```http
POST /api/v1/users/addresses/{address_id}/set_default/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "status": "success",
  "message": "Default address updated",
  "address": {
    "id": "uuid",
    "address_text": "789 New Street, Lekki, Lagos",
    "is_default": true
  }
}
```

#### Get Default Address
```http
GET /api/v1/users/addresses/default/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "id": "uuid",
  "address_text": "123 Main Street, Victoria Island, Lagos",
  "latitude": 6.4281,
  "longitude": 3.4219,
  "label": "Home",
  "is_default": true
}
```

#### Delete Address
```http
DELETE /api/v1/users/addresses/{address_id}/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "status": "success",
  "message": "Address deleted successfully"
}
```

### ❤️ **Product Favorites**

#### Get User Favorites
```http
GET /api/v1/products/products/favorites/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "status": "success",
  "message": "Found 3 favorite products",
  "data": [
    {
      "id": "uuid",
      "title": "Margherita Pizza",
      "price": "25.00",
      "image_url": "https://cloudinary.com/pizza.jpg",
      "outlet": {
        "id": "uuid",
        "name": "Mario's Pizza Palace"
      },
      "is_available": true,
      "is_liked": true,
      "like_count": 45
    }
  ]
}
```

#### Toggle Product Like/Unlike
```http
POST /api/v1/products/products/{product_id}/toggle_like/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "status": "success",
  "message": "Product liked successfully",
  "is_liked": true,
  "like_count": 46
}
```

### 🛒 **Enhanced Cart Management**

#### Get Current Cart
```http
GET /api/v1/orders/cart/current/?outlet_id={outlet_id}
```

**Response:**
```json
{
  "id": "uuid",
  "outlet": {
    "id": "uuid",
    "name": "Mario's Pizza Palace",
    "is_open": true
  },
  "items": [
    {
      "id": "uuid",
      "product": {
        "id": "uuid",
        "title": "Margherita Pizza",
        "price": "25.00",
        "image_url": "https://cloudinary.com/pizza.jpg"
      },
      "quantity": 2,
      "unit_price": "25.00",
      "total_price": "50.00",
      "size": "large",
      "extras": ["extra_cheese"],
      "special_notes": "Extra crispy please"
    }
  ],
  "total_items": 2,
  "subtotal": "50.00",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:15:00Z"
}
```

#### Add Item to Cart
```http
POST /api/v1/orders/cart/add/
Content-Type: application/json
```

**Request Body:**
```json
{
  "outlet_id": "uuid",
  "product_id": "uuid",
  "quantity": 2,
  "size": "large",
  "extras": ["extra_cheese", "extra_pepperoni"],
  "special_notes": "Please make it extra crispy"
}
```

#### Update Cart Item Quantity
```http
POST /api/v1/orders/cart/update/
Content-Type: application/json
```

**Request Body:**
```json
{
  "item_id": "uuid",
  "quantity": 3
}
```

#### Remove Item from Cart
```http
DELETE /api/v1/orders/cart/remove-item/{item_id}/
```

**Response:**
```json
{
  "status": "success",
  "message": "Removed Margherita Pizza from cart",
  "cart": {
    "id": "uuid",
    "total_items": 1,
    "subtotal": "25.00"
  }
}
```

#### Clear Cart
```http
POST /api/v1/orders/cart/clear/
Content-Type: application/json
```

**Request Body:**
```json
{
  "outlet_id": "uuid"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Cleared 3 items from cart",
  "outlet_name": "Mario's Pizza Palace"
}
```

---

## 🔗 **Next Steps for Frontend Developers**

1. **Start with Authentication**: Implement OTP-based authentication flow
2. **Build User Profile**: Create profile management with address book
3. **Implement Favorites**: Add wishlist functionality with heart icons
4. **Build Shopping Cart**: Use outlet-specific cart management with real-time updates
5. **Add Notifications**: Implement push notification system with unread badges
6. **Create Order Tracking**: Build order list and detail pages with status updates
7. **Integrate Payments**: Implement Paystack checkout with payment history
8. **Test Delivery Calculations**: Ensure accurate delivery fee calculations
9. **Handle Edge Cases**: Implement proper error handling and validation

## 📞 **Support & Questions**

For implementation questions or clarification on any endpoints, please refer to the complete codebase documentation or contact the development team.

---

This comprehensive documentation covers the complete user journey from anonymous browsing to order completion, including all API endpoints, request/response formats, detailed calculation logic, and business rules. Frontend developers can use this as a complete reference for integration.
