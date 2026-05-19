// store/CartStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import Image5 from "@/src/assets/images/image_food.svg";
import {
  calculateDeliveryFee,
  checkoutCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart as clearCartAPI,
  getCurrentCart,
  getSingleProduct,
  addToCart as addToCartAPI,
  CheckoutRequest,
  CheckoutResponse,
  DeliveryFeeResponse,
  User,
  CartResponse
} from "@/src/app/api/action";
import { getCartToken, setCartToken } from '@/src/lib/tokens';
import { setCartId, getCartId, removeCartId } from '@/src/lib/cartPersistence';
import { showSimpleToast } from "@/src/utils/alertFunctions";
import { SessionManager } from "@/src/utils/session";
import { logger } from "@/src/utils/logger";
import { CartItem } from "@/src/types/CartTypes";
import { CartSyncService } from "@/src/services/CartSyncService";

// Re-export CartItem for backward compatibility with existing component imports
export type { CartItem };

// Define the backend cart item interface separately
interface BackendCartItem {
  id: string;
  product_id: string;
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

// Delivery Fee Interfaces
// Use canonical API types from action.ts for requests/responses in store

// Request deduplication map for cart initialization
const cartInitPromises = new Map<string, Promise<void>>();

interface CartState {
  // Cart Items (outlet-specific)
  items: CartItem[];
  backendCartId: string | null;
  currentOutletId: string | null;
  isInitializing: boolean;
  lastInitializedOutlet: string | null;
  lastToastTime: number; // Add timestamp to prevent duplicate toasts
  wasIntentionallyCleared: boolean; // Track if cart was cleared after payment
  deliveryFee: number;

  // Delivery & Checkout
  // Removed isResyncing: boolean; (legacy resync logic)
  deliveryAddress: string;
  fulfillment: "delivery" | "pickup" | null;
  checkoutLoading: boolean;
  deliveryFeeLoading: boolean;
  deliveryAvailability: {
    isDeliverable: boolean;
    message?: string;
    estimatedTime?: string;
  };

  // Cart Actions
  addItem: (item: Omit<CartItem, "quantity">, outletId: string, productId?: string, quantity?: number, extras?: Record<string, any>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: (outletId?: string) => Promise<void>;
  getTotalQuantity: () => number;
  getTotalItemQuantity: () => number;
  syncCartFromBackend: (backendCart: CartResponse) => void;
  initializeCartForOutlet: (outletId: string) => Promise<void>;
  reSyncCartWithBackend: (outletId: string, options?: { silent?: boolean }) => Promise<void>;
  // Legacy local cart sync/merge logic removed
  switchOutlet: (outletId: string) => Promise<void>;
  clearCartIdsAfterLogin: () => void;

  // Removed mergeLocalItemsToUserCart and createCartFromLocalItems (legacy logic)
  setFulfillmentMode: (mode: "delivery" | "pickup") => void;
  setDeliveryAddress: (address: string) => void;
  calculateDeliveryFee: (
    address: string,
    latitude?: number,
    longitude?: number
  ) => Promise<DeliveryFeeResponse>;
  proceedToCheckout: (
    checkoutData: Omit<CheckoutRequest, "cart_id">
  ) => Promise<CheckoutResponse>;

  // Utility Getters
  getSubtotal: () => number;
  getGrandTotal: () => number;

  // Helper Functions
  showThrottledToast: (message: string, type: "success" | "failed" | "info", throttleMs?: number) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // Initial State
      items: [],
      backendCartId: null,
      currentOutletId: null,
      isInitializing: false,
      lastInitializedOutlet: null,
      lastToastTime: 0,
      wasIntentionallyCleared: false,
      deliveryFee: 0,
      deliveryAddress: "",
      fulfillment: null,
      checkoutLoading: false,
      deliveryFeeLoading: false,
      deliveryAvailability: {
        isDeliverable: false,
        message: "",
        estimatedTime: "",
      },

      // Helper function to prevent duplicate toasts
      showThrottledToast: (message: string, type: "success" | "failed" | "info", throttleMs = 3000) => {
        const now = Date.now();
        const state = get();

        // Only show toast if enough time has passed since last toast
        if (now - state.lastToastTime > throttleMs) {
          showSimpleToast(message, type);
          set({ lastToastTime: now });
        }
      },

      // Cart Actions with API integration
      addItem: async (newItem, outletId, productId, quantity = 1, extras?) => {
        // Strictly backend-driven: add item via API, then sync cart from backend response
        let resolvedOutletId = outletId || get().currentOutletId;
        if (!resolvedOutletId) {
          try {
            const so = require('@/src/store/OutletStore').useOutletStore.getState().selectedOutlet;
            resolvedOutletId = so?.id || null;
          } catch (e) {
            resolvedOutletId = null;
          }
        }
        if (!resolvedOutletId) {
          throw new Error("No outlet selected. Please select an outlet first.");
        }
        await get().initializeCartForOutlet(resolvedOutletId);

        // Defensive logging / instrumentation: record product/outlet before calling API
        const requestProductId = productId || newItem.id.toString();
        logger.info("📦 CartStore.addItem - beginning", { productId: requestProductId, outlet: resolvedOutletId, quantity });

        // Validate UUID format to catch UI/stale-id bugs early
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!requestProductId || !uuidRegex.test(String(requestProductId))) {
          logger.error("Bad product id format in CartStore.addItem", { productId: requestProductId, outlet: resolvedOutletId });
          showSimpleToast("Failed to add item to cart: invalid product identifier", "failed");
          return;
        }

        // Preflight: fetch single product to fail fast if product doesn't exist or belongs to another outlet
        try {
          const prod = await getSingleProduct(requestProductId);
          // If the product exists but includes an outlet field, check outlet membership
          try {
            const prodOutlet = (prod as any)?.outlet || (prod as any)?.outlet_uuid || (prod as any)?.outlet_id;
            if (prodOutlet && String(prodOutlet) !== String(resolvedOutletId)) {
              logger.warn("Product belongs to a different outlet during preflight", { productId: requestProductId, productOutlet: prodOutlet, requestedOutlet: resolvedOutletId });
              showSimpleToast("Item unavailable for this outlet", "failed");
              return;
            }
          } catch (e) {
            // ignore outlet check errors and proceed
          }
        } catch (err: any) {
          logger.error("Product preflight failed in CartStore.addItem", { productId: requestProductId, err });
          showSimpleToast("Item not found. Please refresh and try again.", "failed");
          return;
        }

        let backendResponse: any;
        try {
          backendResponse = await addToCartAPI({
            product_id: requestProductId,
            outlet_id: resolvedOutletId,
            quantity: quantity || 1,
            extras: extras && Object.keys(extras).length > 0 ? extras : undefined,
            special_notes: ""
          }, resolvedOutletId);
          logger.info("📦 CartStore.addItem - addToCartAPI response", { backendCartId: backendResponse?.id, items: backendResponse?.items?.length });
        } catch (err) {
          logger.error("❌ CartStore.addItem - addToCartAPI failed", err);
          throw err; // propagate to caller so UI can handle
        }
        if (backendResponse && backendResponse.id) {
          set({
            backendCartId: backendResponse.id,
            currentOutletId: resolvedOutletId,
            items: (backendResponse.items || []).map((item: any) => ({
              id: item.product_id,
              title: item.product_name,
              sub_title: "Product",
              // Defensive: coerce backend values to numbers to avoid NaN in UI
              price: Number(item.product_price) || 0,
              image: item.product_image || Image5,
              quantity: Number(item.quantity) || 1,
              backendCartItemId: item.id,
            })),
          });
          if (typeof window !== 'undefined' && backendResponse.id) {
            setCartId(backendResponse.id);
          }
          get().showThrottledToast("Item added to cart!", "success", 1000);
        } else {
          showSimpleToast("Failed to add item to cart", "failed");
        }
      },

      // Create backend cart by sequentially adding local items

      // Initialize cart for a specific outlet
      initializeCartForOutlet: async (outletId: string) => {
        // Deduplicate concurrent initialization requests
        if (cartInitPromises.has(outletId)) {
          logger.debug('🔄 Cart init already in progress, reusing existing promise for outlet:', outletId);
          return cartInitPromises.get(outletId);
        }

        const state = get();

        // Prevent multiple initializations for the same outlet
        if (state.isInitializing) {
          // logger.info("🔄 Cart initialization already in progress, skipping");
          return;
        }

        // If we already have a cart for this outlet with valid data, don't re-initialize
        if (state.lastInitializedOutlet === outletId && state.items.length > 0 && state.backendCartId) {
          // logger.info("🔄 Cart already initialized for outlet:", outletId, "with", state.items.length, "items");
          return;
        }

        const initPromise = (async () => {
          set({ isInitializing: true });

          try {
            const result = await CartSyncService.initializeCart(
              outletId,
              state.items,
              state.backendCartId,
              state.wasIntentionallyCleared
            );

            if (result) {
              set({
                items: result.items,
                backendCartId: result.backendCartId,
                currentOutletId: result.currentOutletId,
                lastInitializedOutlet: result.lastInitializedOutlet,
                wasIntentionallyCleared: result.wasIntentionallyCleared,
                isInitializing: false
              });

              if (result.shouldReSync) {
                // Schedule re-sync
                setTimeout(() => get().reSyncCartWithBackend(outletId), 50);
              }
            } else {
              // Error or conservative fallback (preserve existing)
              // Be conservative - preserve any existing items on error
              const currentItems = get().items || [];
              if (currentItems.length > 0) {
                set({
                  items: currentItems.map(item => ({ ...item, backendCartItemId: undefined })),
                  backendCartId: null,
                  currentOutletId: outletId,
                  isInitializing: false,
                  lastInitializedOutlet: null,
                });
              } else {
                set({
                  items: [],
                  backendCartId: null,
                  currentOutletId: outletId,
                  isInitializing: false,
                  lastInitializedOutlet: null,
                });
              }
            }
          } catch (error) {
            logger.error("❌ Failed to initialize cart using CartSyncService:", error);
            // Be conservative - preserve any existing items on error
            const currentItems = get().items || [];
            if (currentItems.length > 0) {
              logger.warn("⚠️ Cart initialization failed but preserving", currentItems.length, "existing items");
              set({
                items: currentItems.map(item => ({ ...item, backendCartItemId: undefined })),
                backendCartId: null,
                currentOutletId: outletId,
                isInitializing: false,
                lastInitializedOutlet: null, // Don't mark as initialized on error
              });
            } else {
              // logger.info("🆕 Cart initialization failed, starting with empty cart");
              set({
                items: [],
                backendCartId: null,
                currentOutletId: outletId,
                isInitializing: false,
                lastInitializedOutlet: null, // Don't mark as initialized on error
              });
            }
          }
        })();

        // Store promise and clean up after completion
        cartInitPromises.set(outletId, initPromise);
        try {
          await initPromise;
        } finally {
          cartInitPromises.delete(outletId);
        }
      },

      removeItem: async (id) => {
        const state = get();
        // Support calling removeItem with either product id (item.id) or backendCartItemId
        const item = state.items.find((item) => item.id === id || item.backendCartItemId === id);

        // Optimistic update - remove from local state immediately; remove by either identifier
        set((state) => ({
          items: state.items.filter((item) => item.id !== id && item.backendCartItemId !== id),
        }));

        // Try to sync with API if we have a backend cart
        if (state.backendCartId && item && item.backendCartItemId) {
          try {
            await removeCartItem(item.backendCartItemId);
            // logger.info("✅ Item removed from backend cart");
          } catch (error: any) {
            logger.error("❌ Failed to remove item from backend:", error);

            // If we get 404 errors, it might mean cart is out of sync
            if (error.message && (error.message.includes("No CartItem matches") || error.message.includes("404"))) {
              // logger.info("🔄 Cart appears to be out of sync during remove, triggering full re-sync");

              if (state.currentOutletId) {
                await get().reSyncCartWithBackend(state.currentOutletId);
                // logger.info("✅ Cart re-synchronized after remove 404 error");
                return;
              }
            }

            // For other errors, restore item (maintain original id ordering)
            set((state) => ({
              items: [...state.items, item].sort((a, b) => (a.title || '').localeCompare(b.title || '')),
            }));
            showSimpleToast("Failed to remove item from cart", "failed");
          }
        } else if (state.backendCartId && item && !item.backendCartItemId) {
          logger.warn("⚠️ No backend cart item ID found for item:", item.title);
          // Attempt to recover by creating (upsert) the missing backend item, then removing it
          try {
            const outlet = state.currentOutletId || "";
            logger.info("🔁 Attempting upsert for missing backend item before remove", { product_id: item.id, outlet });
            const upsertResp = await addToCartAPI({ product_id: item.id, outlet_id: outlet, quantity: item.quantity || 1, special_notes: "" }, outlet);
            // Try to find the created backend cart item id
            const createdItem = upsertResp?.items?.find((it: any) => String(it.product_id) === String(item.id));
            if (createdItem && createdItem.id) {
              logger.info("🔁 Upsert created backend item, proceeding to remove by backend id", { backendItemId: createdItem.id });
              try {
                await removeCartItem(createdItem.id);
                // After successful remove, re-sync state
                if (state.currentOutletId) await get().reSyncCartWithBackend(state.currentOutletId);
                return;
              } catch (err) {
                logger.error("❌ Failed to remove item after upsert:", err);
                // fall through to re-sync below
              }
            } else {
              logger.warn("⚠️ Upsert did not return created item id, performing re-sync");
              if (state.currentOutletId) await get().reSyncCartWithBackend(state.currentOutletId);
              return;
            }
          } catch (err: any) {
            logger.error("❌ Upsert attempt failed:", err);
            // As a fallback, attempt a re-sync so frontend gets canonical mapping
            if (state.currentOutletId) await get().reSyncCartWithBackend(state.currentOutletId);
            // Restore item locally on failure
            set((s) => ({ items: [...s.items, item] }));
            showSimpleToast("Failed to remove item from cart", "failed");
            return;
          }
        }
      },

      // Add a function to force re-sync when cart items become invalid
      reSyncCartWithBackend: async (outletId: string, options: { silent?: boolean } = { silent: false }) => {
        try {
          const result = await CartSyncService.reSync(outletId, get().wasIntentionallyCleared);
          
          if (result) {
             set({
                 items: result.items,
                 backendCartId: result.backendCartId,
                 currentOutletId: result.currentOutletId,
                 wasIntentionallyCleared: result.wasIntentionallyCleared
             });
          } else {
             // Service returned null = backend cart is empty or error occurred
             // CRITICAL: Clear all backendCartItemId mappings to prevent 404 errors
             const state = get();
             
             if (state.items.length > 0) {
                logger.warn('⚠️ Backend cart empty but local items exist. Clearing backend IDs to prevent stale references.');
                // Remove ALL backend references and let next add/update re-create them
                set({
                    items: state.items.map(item => ({ 
                        ...item, 
                        backendCartItemId: undefined  // ← THIS IS CRITICAL
                    })),
                    backendCartId: null,
                    currentOutletId: outletId,
                });
             } else {
                set({ items: [], backendCartId: null, currentOutletId: outletId });
             }
          }
        } catch (error) {
          logger.error("❌ RE-SYNC - Failed to re-sync cart:", error);
        }
      },

      // Merge local (anonymous) items into authenticated user's cart as a fallback
      // Robust deduplication: fetch backend cart, match by product_id (and size if available),
      // update quantities for existing backend items, add missing items, then re-sync.

      updateQuantity: async (id, quantity) => {
        const state = get();

        // Debug: Log what we're working with
        logger.debug("🔄 updateQuantity called", {
          id,
          quantity,
          backendCartId: state.backendCartId,
          currentOutletId: state.currentOutletId,
          itemsCount: state.items.length
        });

        // Support id being either the UI product id or the backendCartItemId
        let item = state.items.find((item) => item.id === id || item.backendCartItemId === id);

        // Optimistic UI Update: update state immediately before API call determines success/failure
        if (item) {
          set((state) => ({
            items: state.items.map((it) =>
              (it.id === id || it.backendCartItemId === id) ? { ...it, quantity: quantity } : it
            )
          }));
        }

        logger.debug("🔍 Found item:", {
          found: !!item,
          itemId: item?.id,
          backendCartItemId: item?.backendCartItemId,
          itemQuantity: quantity // Log the new quantity
        });

        // If we don't have backendCartId or backendCartItemId, try to recover:
        if (!state.backendCartId || !item?.backendCartItemId) {
          // Attempt to initialize session/cart and push local items to backend
          logger.warn("⚠️ Backend cart or item mapping missing - attempting recovery", {
            hasBackendCartId: !!state.backendCartId,
            hasItem: !!item,
            hasBackendCartItemId: !!item?.backendCartItemId
          });
          try {
            const outletId = state.currentOutletId;
            if (outletId) {
              // Ensure session / cart exist, then re-sync local state from backend
              await get().initializeCartForOutlet(outletId);
              await get().reSyncCartWithBackend(outletId);
              // Re-fetch refreshed state and item mapping
              const refreshed = get();
              const refreshedItem = refreshed.items.find((it) => it.id === id);
              if (refreshedItem) item = refreshedItem;
            }
          } catch (err) {
            logger.error("❌ Failed to recover backend cart/item mapping:", err);
          }
        }

        // Try API update if we now have backend ids
        const refreshedState = get();
        if (!refreshedState.backendCartId) {
          const persistedBackendId = getCartId();
          if (persistedBackendId) {
            set({ backendCartId: persistedBackendId });
          }
        }

        const refreshedItem = refreshedState.items.find(it => it.id === id);

        if (refreshedItem && refreshedItem.backendCartItemId && quantity > 0) {
          try {
            logger.debug("🔄 updateQuantity - calling API with refreshed backendCartItemId", { uiId: id, backendCartItemId: refreshedItem.backendCartItemId, quantity, outlet: refreshedState.currentOutletId });
            const returned = await updateCartItemQuantity(refreshedItem.backendCartItemId, quantity, refreshedState.currentOutletId || "");
            logger.info("✅ Item quantity updated in backend cart", returned);

            if (returned && returned.items) {
              // Maintain original order by updating only the changed item
              const currentItems = get().items;
              const updatedItems = currentItems.map((item) => {
                // Find matching item from backend response
                const backendItem = returned.items.find((bi: any) =>
                  bi.product_id === item.id || bi.id === item.backendCartItemId
                );

                if (backendItem) {
                  // Update this item with backend data
                  return {
                    id: item.id, // Keep original product ID
                    title: backendItem.product_name,
                    sub_title: 'Product',
                    price: parseFloat(backendItem.product_price),
                    image: backendItem.product_image || item.image, // Fallback to existing image
                    quantity: backendItem.quantity,
                    backendCartItemId: backendItem.id,
                  };
                }

                // Item wasn't in backend response, keep as is
                return item;
              });

              set({ items: updatedItems, backendCartId: returned.id });
            }

            return;
          } catch (error: any) {
            logger.error("❌ Failed to update item quantity in backend:", error);

            // If the item doesn't exist in backend (404 error), trigger full re-sync and bail
            if (error.message && (error.message.includes("No CartItem matches") || error.message.includes("404"))) {
              logger.info("🔄 Cart appears to be out of sync, triggering full re-sync");
              if (refreshedState.currentOutletId) {
                // Attempt a full re-sync to refresh backend IDs and then retry the update once
                const outletToResync = refreshedState.currentOutletId;
                await get().reSyncCartWithBackend(outletToResync);
                logger.info("✅ Cart re-synchronized after 404 error - attempting retry");

                // After re-sync, try to find the item's new backendCartItemId and retry the update
                const afterSync = get();
                const retriedItem = afterSync.items.find(it => it.id === id);
                if (retriedItem && retriedItem.backendCartItemId) {
                  try {
                    logger.info("🔁 Retrying update with refreshed backendCartItemId:", retriedItem.backendCartItemId);
                    const returned = await updateCartItemQuantity(retriedItem.backendCartItemId, quantity, outletToResync || "");
                    logger.info("✅ Retry succeeded - backend updated", returned);

                    if (returned && returned.items) {
                      // Maintain original order by updating only the changed item
                      const currentItems = get().items;
                      const updatedItems = currentItems.map((item) => {
                        const backendItem = returned.items.find((bi: any) =>
                          bi.product_id === item.id || bi.id === item.backendCartItemId
                        );

                        if (backendItem) {
                          return {
                            id: item.id,
                            title: backendItem.product_name,
                            sub_title: 'Product',
                            price: parseFloat(backendItem.product_price),
                            image: backendItem.product_image || item.image,
                            quantity: backendItem.quantity,
                            backendCartItemId: backendItem.id,
                          };
                        }

                        return item;
                      });

                      set({ items: updatedItems, backendCartId: returned.id });
                    }
                    return;
                  } catch (retryErr) {
                    logger.error("❌ Retry after re-sync failed:", retryErr);
                    // fall through to trigger a full re-sync message to user
                    return;
                  }
                }
                // If we couldn't find a backend id after resync, bail out (frontend will re-sync state)
                logger.warn("⚠️ After re-sync no backendCartItemId found for item, aborting update retry");
                return;
              }
            }

            // For other errors, restore original quantity
            showSimpleToast("Failed to update item quantity", "failed");
            return;
          }
        }

        // If we have a backend cart but the specific item's backend ID is missing,
        // attempt to upsert (create) the backend item and then perform the quantity update.
        if (refreshedItem && !refreshedItem.backendCartItemId && quantity > 0) {
          try {
            const outlet = refreshedState.currentOutletId || state.currentOutletId || "";
            if (!outlet) {
              logger.warn("⚠️ Cannot upsert cart item - outlet missing", { product_id: refreshedItem.id });
              return;
            }
            logger.info("🔁 Attempting upsert for missing backend item before update", { product_id: refreshedItem.id, outlet, quantity });
            const upsertResp = await addToCartAPI({ product_id: refreshedItem.id, outlet_id: outlet, quantity: quantity, special_notes: "" }, outlet);
            const created = upsertResp?.items?.find((it: any) => String(it.product_id) === String(refreshedItem.id));
            if (created && created.id) {
              logger.info("🔁 Upsert created backend item, now updating quantity by backend id", { backendItemId: created.id });
              const returned = await updateCartItemQuantity(created.id, quantity, outlet);
              if (returned && returned.items) {
                // Maintain original order by updating only the changed item
                const currentItems = get().items;
                const updatedItems = currentItems.map((item) => {
                  const backendItem = returned.items.find((bi: any) =>
                    bi.product_id === item.id || bi.id === item.backendCartItemId
                  );

                  if (backendItem) {
                    return {
                      id: item.id,
                      title: backendItem.product_name,
                      sub_title: 'Product',
                      price: parseFloat(backendItem.product_price),
                      image: backendItem.product_image || item.image,
                      quantity: backendItem.quantity,
                      backendCartItemId: backendItem.id,
                    };
                  }

                  return item;
                });

                set({ items: updatedItems, backendCartId: returned.id });
                get().showThrottledToast("Cart updated!", "success", 1000);
                return;
              }
            } else {
              logger.warn("⚠️ Upsert didn't return created item id; re-syncing instead");
              if (refreshedState.currentOutletId) await get().reSyncCartWithBackend(refreshedState.currentOutletId);
              return;
            }
          } catch (err) {
            logger.error("❌ Upsert before update failed:", err);
            // fall through to the final failure message below
          }
        }
        // If we still couldn't sync to backend, provide a friendly message and restore original quantity
        logger.warn("⚠️ Unable to synchronize quantity change to backend - final fallback", {
          hasBackendCartId: !!refreshedState.backendCartId,
          hasItem: !!refreshedItem,
          hasBackendItemId: !!refreshedItem?.backendCartItemId,
          quantity,
          currentOutletId: refreshedState.currentOutletId
        });
        showSimpleToast("Unable to update cart on server. Please try again.", "failed");
      },

      clearCart: async (outletId?: string) => {
        const state = get();
        const originalItems = [...state.items];
        const targetOutlet = outletId || state.currentOutletId || "";

        // Optimistic update - clear local state immediately
        set({
          items: [],
          backendCartId: null,
          deliveryFee: 0,
          deliveryAddress: "",
          fulfillment: null,
          wasIntentionallyCleared: true, // Mark as intentionally cleared
          deliveryAvailability: {
            isDeliverable: false,
            message: "",
            estimatedTime: "",
          },
        });

        // 🔥 CRITICAL FIX: Clear ALL persisted cart data from localStorage
        try {
          if (typeof window !== 'undefined') {
            // Clear specific outlet cart if provided
            if (targetOutlet) {
              const persistenceKey = `cart_${targetOutlet}`;
              localStorage.removeItem(persistenceKey);
              logger.info("🗑️ Cleared persisted cart data for outlet:", targetOutlet);
            }

            // 🚨 IMPORTANT: Also clear ALL outlet carts to prevent cross-contamination
            // This ensures that switching between outlets after payment doesn't restore old carts
            const allKeys = Object.keys(localStorage);
            const cartKeys = allKeys.filter(key => key.startsWith('cart_'));
            cartKeys.forEach(key => {
              localStorage.removeItem(key);
              logger.info("🗑️ Cleared persisted cart data:", key);
            });

            // Clear session storage cart ID
            try { removeCartId(); } catch (e) { /* best-effort */ }
            logger.info("🗑️ Cleared session cart ID");

            // Clear cart token to force fresh session on next initialization
            localStorage.removeItem('cart_token');
            logger.info("🗑️ Cleared cart token");
            // Also remove the persisted cart-storage used by zustand/persist so
            // the store does not rehydrate old cart data after we cleared it.
            try {
              localStorage.removeItem('cart-storage');
              logger.info('🗑️ Cleared persisted "cart-storage"');
            } catch (e) {
              logger.warn('⚠️ Failed to remove cart-storage from localStorage', e);
            }
          }
        } catch (error) {
          logger.warn("⚠️ Failed to clear persisted cart data:", error);
        }

        // Always attempt to clear backend cart for the given outlet.
        // Even if we don't have a backendCartId in state, the server can
        // locate an anonymous cart using the cart token (cookie/localStorage)
        // or create a new empty cart and return success. Calling the API
        // ensures the backend canonical state is cleared and prevents the
        // backend from resurrecting items later.
        try {
          if (typeof window !== 'undefined') {
            try { window.localStorage.setItem('cart_cleared_marker', String(Date.now())); } catch (e) { logger.warn('Failed to set cart_cleared_marker', e); }
          }

          const clearResp = await clearCartAPI(targetOutlet);
          logger.info("✅ Backend cart cleared", clearResp);

          if (!clearResp || !clearResp.success) {
            logger.error('Backend clearCart responded with failure', clearResp);
            // Restore items on error
            set({
              items: originalItems,
              backendCartId: state.backendCartId,
            });
            showSimpleToast('Failed to clear cart on server', 'failed');
          }
        } catch (error) {
          logger.error("❌ Failed to clear backend cart:", error);
          // Restore items on error
          set({
            items: originalItems,
            backendCartId: state.backendCartId,
          });
          showSimpleToast("Failed to clear cart", "failed");
        }
      },

      getTotalQuantity: () => {
        const state = get();
        const uniqueItemCount = state.items.length; // Count unique items, not total quantity
        // logger.info("🔢 TOTAL UNIQUE ITEMS - Items:", state.items);
        // logger.info("🔢 TOTAL UNIQUE ITEMS - Individual quantities:", state.items.map(item => `${item.title}: ${item.quantity}`));
        // logger.info("🔢 TOTAL UNIQUE ITEMS - Unique item count:", uniqueItemCount);
        return uniqueItemCount;
      },

      // Add a separate function for total quantity if needed elsewhere
      getTotalItemQuantity: () => {
        const state = get();
        const totalQuantity = state.items.reduce((total, item) => total + item.quantity, 0);
        // logger.info("🔢 TOTAL QUANTITY - Sum of all quantities:", totalQuantity);
        return totalQuantity;
      },

      syncCartFromBackend: (backendCart) =>
        set((state) => {
          // logger.info("🔄 Syncing cart from backend:", backendCart);

          if (backendCart.items && backendCart.items.length > 0) {
            const transformedItems = backendCart.items.map((item) => ({
              id: item.product_id, // Use the UUID string directly, not parseInt
              title: item.product_name,
              sub_title: "Product",
              price: item.product_price, // No need to parseFloat since it's already a number
              image: item.product_image || Image5,
              quantity: item.quantity,
              backendCartItemId: item.id, // Store the backend cart item ID
            }));

            return {
              items: transformedItems,
              backendCartId: backendCart.id,
            };
          }

          // If backend cart is empty but we have local items, decide whether
          // to preserve them or to honor an intentional clear (payment flow).
          if (!backendCart.items || backendCart.items.length === 0) {
            try {
              const pendingMarker = typeof window !== 'undefined' && (window.localStorage.getItem('pending_order_payment') || window.localStorage.getItem('cart_cleared_marker'));
              const wasCleared = state.wasIntentionallyCleared;
              if (pendingMarker || wasCleared) {
                // Clear persisted cart keys and return an empty cart
                if (typeof window !== 'undefined') {
                  const allKeys = Object.keys(window.localStorage || {});
                  const cartKeys = allKeys.filter(key => key.startsWith('cart_'));
                  cartKeys.forEach(key => {
                    try { window.localStorage.removeItem(key); } catch (e) { logger.warn('Failed to remove persisted cart key', key, e); }
                  });
                  try { window.localStorage.removeItem('cart-storage'); } catch (e) { logger.warn('Failed to remove cart-storage', e); }
                }
                try { removeCartId(); } catch (e) { /* best-effort */ }
                logger.info('Detected checkout/cleared marker - clearing local persisted cart data and using empty cart (syncCartFromBackend)');
                return { items: [], backendCartId: null };
              }
            } catch (e) {
              logger.warn('Failed while checking pending payment marker in syncCartFromBackend', e);
            }

            if (state.items.length > 0) {
              logger.info("🔄 Backend cart empty, keeping local cart items");
              return state;
            }
          }

          // Both are empty, return empty array
          return {
            items: [],
            backendCartId: null,
          };
        }),

      // Delivery & Checkout Actions
      setFulfillmentMode: (mode) =>
        set((state) => ({
          fulfillment: mode,
          deliveryFee: mode === "pickup" ? 0 : state.deliveryFee,
          deliveryAvailability:
            mode === "pickup"
              ? {
                isDeliverable: true,
                message: "Pickup selected",
                estimatedTime: "Ready in 20-30 mins",
              }
              : state.deliveryAvailability,
        })),

      setDeliveryAddress: (address) => set({ deliveryAddress: address }),

      calculateDeliveryFee: async (
        address: string,
        latitude?: number,
        longitude?: number
      ) => {
        const state = get();
        if (!state.backendCartId) {
          throw new Error("No cart available for delivery fee calculation");
        }

        set({ deliveryFeeLoading: true });

        try {
          const deliveryFeeResponse = await calculateDeliveryFee({
            cart_id: state.backendCartId,
            delivery_address_text: address,
            delivery_latitude: latitude ?? null,
            delivery_longitude: longitude ?? null,
            fulfillment_mode: state.fulfillment || "delivery",
          });

          set({
            deliveryFee: typeof deliveryFeeResponse.delivery_fee === 'string' ? parseFloat(deliveryFeeResponse.delivery_fee) : deliveryFeeResponse.delivery_fee,
            deliveryAddress: address,
            deliveryAvailability: {
              isDeliverable: (deliveryFeeResponse as any).is_deliverable || (deliveryFeeResponse as any).success || false,
              message: (deliveryFeeResponse as any).delivery_area_message || (deliveryFeeResponse as any).message || "",
              estimatedTime: (deliveryFeeResponse as any).estimated_delivery_time || (deliveryFeeResponse as any).estimated_time || "",
            },
          });

          return deliveryFeeResponse;
        } catch (error: any) {
          // Reset delivery fee on error
          set({
            deliveryFee: 0,
            deliveryAvailability: {
              isDeliverable: false,
              message: error.message || "Delivery not available",
              estimatedTime: "",
            },
          });
          throw error;
        } finally {
          set({ deliveryFeeLoading: false });
        }
      },

      proceedToCheckout: async (checkoutData) => {
        const state = get();

        // If we don't have a backend cart, attempt to create/merge one before checkout
        if (!state.backendCartId) {
          logger.warn("⚠️ No backend cart available for checkout - attempting to initialize and sync local cart");
          try {
            const outletId = state.currentOutletId;
            if (outletId) {
              await get().initializeCartForOutlet(outletId);
              await get().reSyncCartWithBackend(outletId);
            }
          } catch (err) {
            logger.error("❌ Failed to prepare backend cart before checkout:", err);
          }
        }

        const refreshed = get();
        if (!refreshed.backendCartId) {
          throw new Error("No cart available for checkout");
        }

        try {
          set({ checkoutLoading: true });

          const checkoutRequest: CheckoutRequest = {
            cart_id: refreshed.backendCartId,
            // Ensure fulfillment_mode is present (fallback to store fulfillment or 'delivery')
            fulfillment_mode: (checkoutData as any).fulfillment_mode || state.fulfillment || 'delivery',
            // spread remaining optional fields
            user_address_id: (checkoutData as any).user_address_id,
            delivery_address_text: (checkoutData as any).delivery_address_text,
            // Normalize latitude/longitude to numbers
            // Quantize coordinates to 9 decimals to match backend precision
            delivery_latitude: (checkoutData as any).delivery_latitude ? Math.round(Number((checkoutData as any).delivery_latitude) * 1e9) / 1e9 : undefined,
            delivery_longitude: (checkoutData as any).delivery_longitude ? Math.round(Number((checkoutData as any).delivery_longitude) * 1e9) / 1e9 : undefined,
            customer_phone: (checkoutData as any).customer_phone,
            special_instructions: (checkoutData as any).special_instructions,
            promo_code: (checkoutData as any).promo_code,
          };

          const result = await checkoutCart(checkoutRequest);

          logger.info("✅ Checkout successful, attempting to clear backend cart and local state");

          // Attempt to clear backend cart for the current outlet (best-effort).
          try {
            const postCheckoutOutlet = refreshed.currentOutletId || state.currentOutletId;
            if (postCheckoutOutlet) {
              await clearCartAPI(postCheckoutOutlet);
              logger.info("✅ Backend cart cleared after checkout");
            }
          } catch (err) {
            // Log the error but don't block the user because checkout already succeeded.
            logger.warn("⚠️ Failed to clear backend cart after checkout:", err);
          }

          // DELAYED CLEARING: We do NOT clear the local state immediately here to prevent
          // a "flash of empty cart" while the user is being redirected to payment.
          // The backend cart is already cleared (by settings.py), so the next sync will
          // clean this up naturally when the user returns or navigates.
          /*
          set({
            items: [],
            backendCartId: null,
            deliveryFee: 0,
            deliveryAddress: "",
            fulfillment: null,
            checkoutLoading: false,
            deliveryAvailability: {
              isDeliverable: false,
              message: "",
              estimatedTime: "",
            },
            wasIntentionallyCleared: true,
          });
          */

          set({ checkoutLoading: false, wasIntentionallyCleared: true });

          // Remove persisted zustand store so it doesn't restore the cleared cart
          try {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('cart-storage');
              logger.info('🗑️ Removed persisted cart-storage after checkout');
            }
          } catch (e) {
            logger.warn('⚠️ Failed to remove persisted cart-storage after checkout', e);
          }

          return result;
        } catch (error) {
          set({ checkoutLoading: false });
          logger.error("❌ Checkout failed:", error);
          throw error;
        }
      },

      switchOutlet: async (outletId: string) => {
        const state = get();

        if (state.currentOutletId === outletId) {
          logger.info("🏪 Already on outlet:", outletId);
          return;
        }

        logger.info("🔄 Switching from outlet:", state.currentOutletId, "to:", outletId);

        // Persist current outlet cart to localStorage under a per-outlet key so
        // that switching back restores the previous cart (preserve per-outlet carts)
        // BUT: Don't persist if cart was intentionally cleared (after payment)
        try {
          if (typeof window !== 'undefined' && state.currentOutletId && !state.wasIntentionallyCleared) {
            const key = `cart_${state.currentOutletId}`;
            const payload = JSON.stringify({ items: state.items, backendCartId: state.backendCartId });
            localStorage.setItem(key, payload);
            logger.info('💾 Persisted cart for outlet', state.currentOutletId, 'to', key);
          } else if (state.wasIntentionallyCleared) {
            logger.info('🚫 Skipping cart persistence - cart was intentionally cleared');
          }
        } catch (e) {
          logger.warn('⚠️ Failed to persist current outlet cart before switching', e);
        }

        // Initialize cart for the new outlet without clearing other outlet data.
        // If we have a saved cart for the target outlet in localStorage, restore it
        // immediately to avoid a flash of empty cart and preserve UX.
        // BUT: Don't restore if this outlet's cart was previously cleared after payment
        try {
          if (typeof window !== 'undefined') {
            const key = `cart_${outletId}`;
            const saved = localStorage.getItem(key);
            if (saved) {
              const parsed = JSON.parse(saved);
              set(() => ({
                items: parsed.items || [],
                backendCartId: parsed.backendCartId || null,
                currentOutletId: outletId,
                wasIntentionallyCleared: false, // Reset flag when switching outlets
              }));
              logger.info('🔁 Restored saved cart for outlet', outletId);
              // Still attempt a background initialize to reconcile with backend
              state.initializeCartForOutlet(outletId).catch(err => logger.warn('Background init failed', err));
              return;
            }
          }
        } catch (e) {
          logger.warn('⚠️ Failed to restore saved cart for target outlet', e);
        }

        // No saved cart found - clear local items immediately to avoid showing
        // previous-outlet items while we initialize the new outlet's cart.
        set({
          items: [],
          backendCartId: null,
          currentOutletId: outletId,
          wasIntentionallyCleared: false // Reset flag when switching outlets
        });
        await state.initializeCartForOutlet(outletId);
      },

      // Clear cart IDs after login to force re-sync with merged cart
      clearCartIdsAfterLogin: () => {
        logger.info("🔄 Clearing cart IDs after login to fetch merged cart");
        set({
          backendCartId: null,
          lastInitializedOutlet: null
        });

        // Clear stored cart ID from localStorage/sessionStorage
        if (typeof window !== 'undefined') {
          try { removeCartId(); } catch (e) { /* best-effort */ }

          // 🔥 CRITICAL: Clear all persisted per-outlet carts from localStorage
          // This prevents switchOutlet() from restoring a stale anonymous cart
          // which would cause initializeCartForOutlet() to skip fetching the user's real cart.
          try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('cart_')) {
                keysToRemove.push(key);
              }
            }

            keysToRemove.forEach(key => {
              localStorage.removeItem(key);
              // logger.info("🗑️ Cleared stale local cart after login:", key);
            });

            if (keysToRemove.length > 0) {
              logger.info(`🗑️ Cleared ${keysToRemove.length} stale local outlet carts after login`);
            }
          } catch (e) {
            logger.warn('⚠️ Failed to clear stale local carts after login', e);
          }
        }
      },

      // Utility Getters
      getSubtotal: () => {
        const state = get();
        return state.items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },

      getGrandTotal: () => {
        const state = get();
        const subtotal = state.getSubtotal();
        return subtotal + state.deliveryFee;
      },
    }),
    {
      name: "cart-storage",
      // Only persist cart items, not loading states or temporary data
      partialize: (state) => ({
        items: state.items,
        backendCartId: state.backendCartId,
        currentOutletId: state.currentOutletId,
        deliveryFee: state.deliveryFee,
        deliveryAddress: state.deliveryAddress,
        fulfillment: state.fulfillment,
        deliveryAvailability: state.deliveryAvailability,
      }),
    }
  )
);
