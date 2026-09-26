export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  sku: string;
  price: number;
  discount_price: number | null;
  stock_quantity: number;
  unit: string;
  weight: string | null;
  image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  landmark: string | null;
  address_type: 'Home' | 'Work' | 'Farm' | 'Other';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShippingAddressData {
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  landmark?: string;
  address_type?: string;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export type PaymentMethod = 'COD' | 'ONLINE';

export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  address_id: string | null;
  customer_name: string;
  customer_phone: string;
  shipping_address: ShippingAddressData;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  product?: Product;
}

export type InventoryTransactionType =
  | 'ORDER_PLACED'
  | 'ORDER_CANCELLED'
  | 'RESTOCK'
  | 'ADJUSTMENT';

export interface InventoryTransaction {
  id: string;
  product_id: string;
  quantity_change: number;
  transaction_type: InventoryTransactionType;
  reference_id: string | null;
  note: string | null;
  created_at: string;
  product?: Product;
}

export interface AdminUser {
  user_id: string;
  role: 'super_admin' | 'admin' | 'manager';
  created_at: string;
}

export interface CustomerStats extends Profile {
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
}

export interface DashboardMetrics {
  totalProducts: number;
  activeProducts: number;
  totalCategories: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  lowStockCount: number;
}
