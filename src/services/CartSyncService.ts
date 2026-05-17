import Image5 from "@/src/assets/images/image_food.svg";
import { 
  getCurrentCart, 
  addToCart as addToCartAPI, 
  removeCartItem,
  CartResponse 
} from "@/src/app/api/action";
import { setCartToken } from '@/src/lib/tokens';
import { setCartId, getCartId, removeCartId } from '@/src/lib/cartPersistence';
import { SessionManager } from "@/src/utils/session";
import { logger } from "@/src/utils/logger";
import { CartItem } from "@/src/types/CartTypes";

export interface SyncResult {
  items: CartItem[];
  backendCartId: string | null;
  currentOutletId: string;
  lastInitializedOutlet: string | null;
  wasIntentionallyCleared: boolean;
  shouldReSync?: boolean;
}

export class CartSyncService {
  /**
   * Initializes the cart for a specific outlet, handling session creation,
   * token rotation, and syncing with the backend.
   */
  static async initializeCart(
    outletId: string,
    currentItems: CartItem[],
    currentBackendId: string | null,
    wasIntentionallyCleared: boolean
  ): Promise<SyncResult | null> {
    
    // 🚨 CRITICAL: If cart was intentionally cleared, don't restore
    if (wasIntentionallyCleared) {
      return {
        items: [], // Keep empty
        backendCartId: null,
        currentOutletId: outletId,
        lastInitializedOutlet: outletId,
        wasIntentionallyCleared: false // Reset flag
      };
    }

    try {
      // Initialize session first
      const sessionManager = SessionManager.getInstance();
      const sessionInfo = await sessionManager.getOrCreateSession(outletId);

      // Check for token rotation
      const storedToken = typeof window !== 'undefined' ? window.localStorage.getItem('cart_token') : null;
      const tokenChanged = storedToken && storedToken !== sessionInfo.session_id;

      if (tokenChanged) {
        if (typeof window !== 'undefined') {
          try { window.localStorage.setItem('cart_token', sessionInfo.session_id); } catch (e) { }
        }
        // Signal caller to re-sync after a short delay if needed
        // For strict correctness, we should probably continue init with new token
      } else {
         if (typeof window !== 'undefined') {
            try { window.localStorage.setItem('cart_token', sessionInfo.session_id); } catch (e) { }
         }
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // Get cart from backend
      const backendCart = await getCurrentCart(outletId);

      // Stale token detection
      if (backendCart && backendCart.outlet && backendCart.outlet !== outletId) {
        logger.warn("🔀 Detected backend cart for different outlet. Rotating token.", {
            requestedOutlet: outletId,
            backendOutlet: backendCart.outlet
        });
        try {
            if (typeof window !== 'undefined') removeCartId();
            setCartToken(null);
        } catch (e) { logger.warn('Failed during stale token rotation', e); }
        
        // Treat as no backend cart (fall through)
      } else if (backendCart && backendCart.items && backendCart.items.length > 0) {
        // Validation of stored ID
        const storedCartId = getCartId();
        if (storedCartId && backendCart.id !== storedCartId) {
            logger.warn("⚠️ Backend cart ID differs from stored cart ID");
        }

        const transformedItems = CartSyncService.transformBackendItems(backendCart.items);
        
        if (typeof window !== 'undefined' && backendCart.id) {
            try { setCartId(backendCart.id); } catch (e) { }
        }

        return {
            items: transformedItems,
            backendCartId: backendCart.id,
            currentOutletId: outletId,
            lastInitializedOutlet: outletId,
            wasIntentionallyCleared: false
        };
      }

      // No backend cart found
      
      // Attempt recovery from local items if present
      if (currentItems.length > 0) {
        const fallbackBackendId = currentBackendId || getCartId();
        
        if (!fallbackBackendId) {
            logger.warn("⚠️ Backend cart missing but local items exist - attempting recovery");
            const recovered = await CartSyncService.recoverBackendCart(outletId, currentItems);
            
            if (recovered) {
                 if (typeof window !== 'undefined' && recovered.id) {
                    try { setCartId(recovered.id); } catch (e) { }
                 }
                 return {
                    items: CartSyncService.transformBackendItems(recovered.items || []),
                    backendCartId: recovered.id,
                    currentOutletId: outletId,
                    lastInitializedOutlet: outletId,
                    wasIntentionallyCleared: false
                 };
            }
            // Recovery failed
            logger.warn('CartStore: could not create backend cart from local items; preserving local state');
        }

        // Return state preserving local items
        return {
            items: currentItems.map(item => ({ ...item })),
            backendCartId: fallbackBackendId || null,
            currentOutletId: outletId,
            lastInitializedOutlet: outletId,
            wasIntentionallyCleared: false
        };
      } else {
        // Empty cart
        return {
            items: [],
            backendCartId: null,
            currentOutletId: outletId,
            lastInitializedOutlet: outletId,
            wasIntentionallyCleared: false
        };
      }

    } catch (error: any) {
        logger.error("❌ Failed to initialize cart:", error);
        // On error, preserve existing state conservatively
        return null; // Signal caller to handle failure (preserve existing)
    }
  }

  static async reSync(outletId: string, wasIntentionallyCleared: boolean): Promise<SyncResult | null> {
    try {
        const backendCart = await getCurrentCart(outletId);
        
        if (backendCart && backendCart.items && backendCart.items.length > 0) {
            const transformedItems = CartSyncService.transformBackendItems(backendCart.items);
            if (typeof window !== 'undefined' && backendCart.id) {
                try { setCartId(backendCart.id); } catch (e) { }
            }
            return {
                items: transformedItems,
                backendCartId: backendCart.id,
                currentOutletId: outletId,
                lastInitializedOutlet: outletId,
                wasIntentionallyCleared: false
            };
        } else {
             // Backend empty. Check if we should clear local.
             if (CartSyncService.checkIfShouldClearLocal(wasIntentionallyCleared)) {
                CartSyncService.clearLocalPersistence();
                return {
                    items: [],
                    backendCartId: null,
                    currentOutletId: outletId,
                    lastInitializedOutlet: outletId,
                    wasIntentionallyCleared: false
                };
             }
             return null; // Caller should decide specific fallback logic or keep existing
        }
    } catch (e) {
        logger.error("❌ RE-SYNC - Failed to re-sync cart:", e);
        return null;
    }
  }

  private static transformBackendItems(backendItems: any[]): CartItem[] {
    return backendItems.map((item) => ({
        id: item.product_id,
        title: item.product_name,
        sub_title: "Product",
        price: Number(item.product_price) || 0,
        image: item.product_image || Image5,
        quantity: Number(item.quantity) || 1,
        backendCartItemId: item.id,
    }));
  }

  private static async recoverBackendCart(outletId: string, items: CartItem[]): Promise<CartResponse | null> {
    try {
        for (const it of items) {
            try {
                await addToCartAPI({ 
                    product_id: String(it.id), 
                    outlet_id: outletId, 
                    quantity: it.quantity || 1, 
                    special_notes: '' 
                }, outletId);
            } catch (e) {
                logger.warn('CartStore: failed to add local item during recovery', { item: it.id });
            }
        }
        return await getCurrentCart(outletId);
    } catch (e) {
        logger.warn('CartStore: recovery attempt failed', e);
        return null;
    }
  }

  private static checkIfShouldClearLocal(wasIntentionallyCleared: boolean): boolean {
      if (wasIntentionallyCleared) return true;
      if (typeof window !== 'undefined') {
          return !!(window.localStorage.getItem('pending_order_payment') || window.localStorage.getItem('cart_cleared_marker'));
      }
      return false;
  }

  private static clearLocalPersistence() {
     if (typeof window !== 'undefined') {
        const allKeys = Object.keys(window.localStorage || {});
        const cartKeys = allKeys.filter(key => key.startsWith('cart_'));
        cartKeys.forEach(key => {
            try { window.localStorage.removeItem(key); } catch (e) { }
        });
        try { window.localStorage.removeItem('cart-storage'); } catch (e) { }
        try { removeCartId(); } catch (e) { }
     }
  }
}
