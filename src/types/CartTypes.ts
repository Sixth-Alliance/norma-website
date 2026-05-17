
export interface CartItem {
  id: string; // Changed from number to string to support UUIDs
  title: string;
  sub_title: string;
  price: number;
  image: any;
  quantity: number;
  backendCartItemId?: string; // Store the backend cart item ID for API operations
}

// Define the backend cart item interface separately
export interface BackendCartItem {
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
