
export interface CartItemExtraSnapshot {
  extra_id: string;
  extra_title: string;
  option_id: string;
  option_name: string;
  option_unit_price: string;
  quantity: number;
  line_total: string;
}

export interface CartItem {
  id: string; // Changed from number to string to support UUIDs
  title: string;
  sub_title: string;
  price: number; // base_unit_price (product price without extras)
  unit_price: number; // price per unit including extras
  base_unit_price: number;
  extras_total: number; // extras cost per unit
  extras: CartItemExtraSnapshot[] | null;
  special_notes: string | null;
  image: any;
  quantity: number;
  backendCartItemId?: string; // Store the backend cart item ID for API operations
}

// Define the backend cart item interface separately
export interface BackendCartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  product_image: string;
  quantity: number;
  size: string | null;
  extras: CartItemExtraSnapshot[] | null;
  special_notes: string | null;
  base_unit_price: number;
  extras_total: number;
  unit_price: number;
  total_price: number;
  is_available: boolean;
  created_at: string;
}
