// filepath: /src/components/examples/CartExample.tsx
// 🎯 EXAMPLE COMPONENT - Shows correct API usage pattern
// All frontend components should follow this structure

'use client';

import React, { useState } from 'react';
import { useApi, useApiMutation } from '@/src/hooks/useApi';
import { cartService, outletsService, checkoutService } from '@/src/api/services';
import { logger } from '@/src/utils/logger';
import * as API from '@/src/types/api';

/**
 * CORRECT PATTERN: Cart component using unified API layer
 * 
 * ✅ DO:
 * - Import from cartService (NOT direct fetch)
 * - Use useApi/useApiMutation hooks
 * - Handle loading/error states
 * - Let backend manage business logic
 * 
 * ❌ DON'T:
 * - Direct fetch() calls
 * - Duplicated token management
 * - Frontend retry logic
 * - Mixing multiple API clients
 */
export function CartExample({ outletId }: { outletId: string }) {
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<API.DeliveryOption | null>(null);

  // === FETCH DATA WITH LOADING/ERROR HANDLING ===
  // This replaces: const [cart, setCart] = useState(); useEffect(() => { fetch(...) }, [])
  const { data: cart, loading: cartLoading, error: cartError, refetch: refetchCart } = useApi(
    () => cartService.getCart(outletId),
    {
      onSuccess: (data) => logger.info('Cart loaded', data),
      onError: (error) => logger.error('Failed to load cart', error),
      dependencies: [outletId],
    }
  );

  const { data: deliveryOptions, loading: optionsLoading } = useApi(
    () => cartService.getDeliveryOptions(outletId),
    { dependencies: [outletId] }
  );

  const { data: paymentConfig } = useApi(() => checkoutService.getPaymentConfig(), { dependencies: [] });

  // === MUTATIONS WITH AUTOMATIC STATE MANAGEMENT ===
  const { mutate: addToCart, loading: isAdding } = useApiMutation(
    (item: any) => cartService.addToCart(outletId, item),
    {
      onSuccess: () => {
        refetchCart(); // Refresh cart after adding item
      },
    }
  );

  const { mutate: removeItem, loading: isRemoving } = useApiMutation(
    (itemId: string) => cartService.removeCartItem(itemId),
    { onSuccess: refetchCart }
  );

  const { mutate: updateQuantity, loading: isUpdating } = useApiMutation(
    (params: { itemId: string; quantity: number }) =>
      cartService.updateCartItem(params.itemId, params.quantity),
    { onSuccess: refetchCart }
  );

  // === HANDLE DELIVERY FEE CALCULATION ===
  const handleDeliveryOptionSelect = async (option: API.DeliveryOption) => {
    setSelectedDeliveryOption(option);

    if (option.type === 'delivery') {
      try {
        const fee = await cartService.calculateDeliveryFee(
          outletId,
          'delivery',
          'Sample Address', // In real app, get from user
          6.4281, // lat
          3.4219  // lng
        );
        logger.info('Delivery fee calculated:', fee);
      } catch (error) {
        logger.error('Failed to calculate fee:', error);
      }
    }
  };

  // === RENDER ===
  if (cartLoading) return <div className="p-4">Loading cart...</div>;
  if (cartError) return <div className="p-4 text-red-500">Error: {cartError.message}</div>;
  if (!cart) return <div className="p-4">Cart is empty</div>;

  return (
    <div className="cart-container p-4 space-y-4">
      <h1 className="text-2xl font-bold">Shopping Cart</h1>

      {/* === CART ITEMS === */}
      <div className="cart-items border rounded-lg p-4">
        <h2 className="font-bold mb-4">Items ({cart.item_count})</h2>

        {cart.items.length === 0 ? (
          <p className="text-gray-500">Your cart is empty</p>
        ) : (
          <div className="space-y-3">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b pb-3">
                <div className="flex-1">
                  <h3 className="font-semibold">{item.product_name}</h3>
                  <p className="text-sm text-gray-600">
                    ₦{item.price} x {item.quantity} = ₦{item.subtotal}
                  </p>
                </div>

                <div className="flex gap-2">
                  {/* Update Quantity */}
                  <select
                    value={item.quantity}
                    onChange={(e) =>
                      updateQuantity({
                        itemId: item.id,
                        quantity: parseInt(e.target.value),
                      })
                    }
                    disabled={isUpdating}
                    className="px-2 py-1 border rounded"
                  >
                    {[1, 2, 3, 4, 5].map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={isRemoving}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    {isRemoving ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === DELIVERY OPTIONS === */}
      {optionsLoading ? (
        <div>Loading delivery options...</div>
      ) : (
        <div className="delivery-options border rounded-lg p-4">
          <h2 className="font-bold mb-4">Delivery Method</h2>
          <div className="space-y-2">
            {deliveryOptions?.map((option) => (
              <button
                key={option.type}
                onClick={() => handleDeliveryOptionSelect(option)}
                className={`w-full p-3 border rounded-lg text-left transition ${
                  selectedDeliveryOption?.type === option.type
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{option.label}</h3>
                    <p className="text-sm text-gray-600">
                      {option.estimated_time_min}-{option.estimated_time_max} mins
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₦{option.fee}</p>
                    {option.type === 'pickup' && (
                      <p className="text-xs text-gray-500">{option.pickup_address}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* === ORDER SUMMARY === */}
      <div className="order-summary border-t pt-4 bg-gray-50 p-4 rounded-lg">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₦{cart.subtotal}</span>
          </div>
          {selectedDeliveryOption && selectedDeliveryOption.fee !== '0' && (
            <div className="flex justify-between">
              <span>Delivery Fee:</span>
              <span>₦{selectedDeliveryOption.fee}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Tax ({paymentConfig?.tax_rate || 7.5}%):</span>
            <span>₦{cart.tax}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total:</span>
            <span>₦{cart.total}</span>
          </div>
        </div>

        <button
          onClick={() => {
            logger.info('Proceeding to checkout');
            // Next: Call checkout flow
          }}
          disabled={cart.item_count === 0 || isAdding}
          className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAdding ? 'Processing...' : 'Proceed to Checkout'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MIGRATION GUIDE: From OLD pattern to NEW pattern
// ============================================================================

/**
 * ❌ OLD (Don't do this anymore):
 * 
 * export function OldCartComponent() {
 *   const [cart, setCart] = useState(null);
 *   const [loading, setLoading] = useState(true);
 *   const [error, setError] = useState(null);
 * 
 *   useEffect(() => {
 *     setLoading(true);
 *     fetch(`${BASE_URL}/orders/cart/current/?outlet_id=...`)
 *       .then(res => res.json())
 *       .then(data => setCart(data.data))
 *       .catch(err => setError(err))
 *       .finally(() => setLoading(false));
 *   }, []);
 * 
 *   return (
 *     loading ? <p>Loading...</p> : 
 *     error ? <p>Error: {error}</p> :
 *     <div>{cart?.item_count} items</div>
 *   );
 * }
 * 
 * Problems:
 * - Duplicated token management
 * - No retry on network failure
 * - Manual loading/error states
 * - No caching
 * - Difficult to test
 * 
 * ============================================================================
 * 
 * ✅ NEW (Do this instead):
 * 
 * export function NewCartComponent() {
 *   const { data: cart, loading, error } = useApi(
 *     () => cartService.getCart(outletId),
 *     { dependencies: [outletId] }
 *   );
 * 
 *   if (loading) return <p>Loading...</p>;
 *   if (error) return <p>Error: {error.message}</p>;
 *   return <div>{cart?.item_count} items</div>;
 * }
 * 
 * Benefits:
 * - ✅ Automatic retry on failures
 * - ✅ Built-in caching
 * - ✅ Token management handled
 * - ✅ Consistent loading/error handling
 * - ✅ Easier to test
 * - ✅ Single source of truth (backend)
 */
