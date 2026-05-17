// Centralized cart persistence helpers
export const CART_ID_SESSION_KEY = 'norma_cart_id';

export function setCartId(id: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (id === null) {
      sessionStorage.removeItem(CART_ID_SESSION_KEY);
    } else {
      sessionStorage.setItem(CART_ID_SESSION_KEY, String(id));
    }
  } catch (e) {
    // best-effort
    // console.warn('Failed to set cart id', e);
  }
}

export function getCartId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(CART_ID_SESSION_KEY);
  } catch (e) {
    return null;
  }
}

export function removeCartId() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CART_ID_SESSION_KEY);
  } catch (e) {
    // best-effort
  }
}
