import { requireSupabase } from '../lib/supabase';
import type {
  Product,
  Category,
  Order,
  InventoryTransaction,
  Profile,
  DashboardMetrics,
  OrderStatus,
  PaymentStatus,
  CustomerStats,
} from '../types/database';

// ==========================================
// 1. DASHBOARD METRICS & RECENT ACTIVITY
// ==========================================
export async function getDashboardMetrics(): Promise<{
  metrics: DashboardMetrics;
  recentOrders: Order[];
  lowStockItems: Product[];
}> {
  const supabase = requireSupabase();

  // 1. Fetch Orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, total, order_status, payment_status, created_at, order_number, customer_name, customer_phone')
    .order('created_at', { ascending: false });

  if (ordersError) {
    throw new Error(`Failed to load orders from Supabase: ${ordersError.message}`);
  }

  // 2. Fetch Products
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, sku, stock_quantity, is_active, price, discount_price, image_url, unit')
    .order('created_at', { ascending: false });

  if (prodError) {
    throw new Error(`Failed to load products from Supabase: ${prodError.message}`);
  }

  // 3. Fetch Categories count
  const { count: catCount, error: catError } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true });

  if (catError) {
    throw new Error(`Failed to load categories count from Supabase: ${catError.message}`);
  }

  // 4. Fetch Customers count
  const { count: userCount, error: userError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  if (userError) {
    throw new Error(`Failed to load customer profiles from Supabase: ${userError.message}`);
  }

  const safeOrders = orders || [];
  const safeProducts = (products || []) as Product[];

  const completed = safeOrders.filter(
    (o) => o.order_status === 'Delivered' || o.payment_status === 'Paid'
  ).length;
  const pending = safeOrders.filter(
    (o) =>
      o.order_status === 'Pending' ||
      o.order_status === 'Confirmed' ||
      o.order_status === 'Processing'
  ).length;
  const cancelled = safeOrders.filter((o) => o.order_status === 'Cancelled').length;

  const totalRev = safeOrders
    .filter((o) => o.order_status !== 'Cancelled')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const lowStock = safeProducts.filter((p) => (p.stock_quantity ?? 0) <= 10);

  return {
    metrics: {
      totalProducts: safeProducts.length,
      activeProducts: safeProducts.filter((p) => p.is_active).length,
      totalCategories: catCount || 0,
      totalOrders: safeOrders.length,
      pendingOrders: pending,
      completedOrders: completed,
      cancelledOrders: cancelled,
      totalRevenue: totalRev,
      totalCustomers: userCount || 0,
      lowStockCount: lowStock.length,
    },
    recentOrders: (safeOrders as Order[]).slice(0, 5),
    lowStockItems: lowStock.slice(0, 5),
  };
}

// ==========================================
// 2. PRODUCTS MANAGEMENT
// ==========================================
export async function getProducts(options?: {
  categoryId?: string;
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
}): Promise<Product[]> {
  const supabase = requireSupabase();

  let query = supabase
    .from('products')
    .select('*, category:categories(id, name, slug)')
    .order('created_at', { ascending: false });

  if (options?.categoryId && options.categoryId !== 'All') {
    query = query.eq('category_id', options.categoryId);
  }
  if (options?.search) {
    const q = options.search.trim();
    query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
  }
  if (options?.status && options.status !== 'all') {
    query = query.eq('is_active', options.status === 'active');
  }
  if (options?.stockStatus && options.stockStatus !== 'all') {
    if (options.stockStatus === 'out_of_stock') {
      query = query.eq('stock_quantity', 0);
    } else if (options.stockStatus === 'low_stock') {
      query = query.gt('stock_quantity', 0).lte('stock_quantity', 10);
    } else if (options.stockStatus === 'in_stock') {
      query = query.gt('stock_quantity', 10);
    }
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Supabase error loading products: ${error.message}`);
  }

  return (data || []) as Product[];
}

export async function createProduct(
  payload: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'>
): Promise<Product> {
  const supabase = requireSupabase();

  // Validate required columns matching Supabase schema
  if (!payload.name?.trim()) throw new Error('Product name is required.');
  if (!payload.sku?.trim()) throw new Error('Product SKU is required.');
  if (!payload.slug?.trim()) throw new Error('Product slug is required.');
  if (payload.price === undefined || payload.price === null || payload.price < 0) {
    throw new Error('Valid price (>= 0) is required.');
  }

  const insertData = {
    name: payload.name.trim(),
    slug: payload.slug.trim(),
    sku: payload.sku.trim(),
    category_id: payload.category_id || null,
    description: payload.description?.trim() || null,
    price: Number(payload.price),
    discount_price:
      payload.discount_price !== null && payload.discount_price !== undefined && payload.discount_price !== ('' as any)
        ? Number(payload.discount_price)
        : null,
    stock_quantity: Number(payload.stock_quantity ?? 0),
    unit: payload.unit?.trim() || 'kg',
    weight: payload.weight?.trim() || null,
    image_url: payload.image_url?.trim() || null,
    is_featured: Boolean(payload.is_featured),
    is_active: Boolean(payload.is_active ?? true),
  };

  const { data, error } = await supabase
    .from('products')
    .insert([insertData])
    .select('*, category:categories(id, name, slug)')
    .single();

  if (error) {
    throw new Error(`Failed to insert product into Supabase: ${error.message}`);
  }

  // Record initial stock transaction in inventory_transactions if stock > 0
  if (insertData.stock_quantity > 0 && data?.id) {
    await supabase.from('inventory_transactions').insert([
      {
        product_id: data.id,
        quantity_change: insertData.stock_quantity,
        transaction_type: 'RESTOCK',
        note: 'Initial catalog creation stock intake',
      },
    ]);
  }

  return data as Product;
}

export async function updateProduct(
  id: string,
  updates: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>
): Promise<Product> {
  const supabase = requireSupabase();

  const updateData = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select('*, category:categories(id, name, slug)')
    .single();

  if (error) {
    throw new Error(`Failed to update product in Supabase: ${error.message}`);
  }

  return data as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = requireSupabase();

  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) {
    throw new Error(`Failed to delete product from Supabase: ${error.message}`);
  }
}

// ==========================================
// 3. CATEGORIES MANAGEMENT
// ==========================================
export async function getCategories(): Promise<Category[]> {
  const supabase = requireSupabase();

  const { data: categories, error } = await supabase
    .from('categories')
    .select('*, products:products(id)')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to load categories from Supabase: ${error.message}`);
  }

  return (categories || []).map((c: any) => ({
    ...c,
    product_count: Array.isArray(c.products) ? c.products.length : 0,
  }));
}

export async function createCategory(
  payload: Omit<Category, 'id' | 'created_at' | 'updated_at' | 'product_count'>
): Promise<Category> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('categories')
    .insert([payload])
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create category in Supabase: ${error.message}`);
  }

  return { ...data, product_count: 0 } as Category;
}

export async function updateCategory(
  id: string,
  updates: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>
): Promise<Category> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('categories')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update category in Supabase: ${error.message}`);
  }

  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = requireSupabase();

  // Safety check: verify no products are assigned
  const { data: prods, error: countError } = await supabase
    .from('products')
    .select('id')
    .eq('category_id', id)
    .limit(1);

  if (countError) {
    throw new Error(`Safety check failed: ${countError.message}`);
  }

  if (prods && prods.length > 0) {
    throw new Error(
      'Cannot delete category: Existing products are assigned to this category. Please reassign or delete them first.'
    );
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) {
    throw new Error(`Failed to delete category: ${error.message}`);
  }
}

// ==========================================
// 4. ORDERS MANAGEMENT
// ==========================================
export async function getOrders(options?: {
  status?: OrderStatus | 'All';
  paymentStatus?: PaymentStatus | 'All';
  search?: string;
}): Promise<Order[]> {
  const supabase = requireSupabase();

  let query = supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .order('created_at', { ascending: false });

  if (options?.status && options.status !== 'All') {
    query = query.eq('order_status', options.status);
  }
  if (options?.paymentStatus && options.paymentStatus !== 'All') {
    query = query.eq('payment_status', options.paymentStatus);
  }
  if (options?.search) {
    const q = options.search.trim();
    query = query.or(
      `order_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load orders from Supabase: ${error.message}`);
  }

  return (data || []) as Order[];
}

export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to load order ${id}: ${error.message}`);
  }

  return data as Order;
}

export async function updateOrderStatus(id: string, newStatus: OrderStatus): Promise<void> {
  const supabase = requireSupabase();

  const { error } = await supabase
    .from('orders')
    .update({
      order_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update order status in Supabase: ${error.message}`);
  }
}

export async function updatePaymentStatus(id: string, newStatus: PaymentStatus): Promise<void> {
  const supabase = requireSupabase();

  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update payment status in Supabase: ${error.message}`);
  }
}

// ==========================================
// 5. INVENTORY & STOCK ADJUSTMENTS
// ==========================================
export async function getInventoryHistory(productId?: string): Promise<InventoryTransaction[]> {
  const supabase = requireSupabase();

  let query = supabase
    .from('inventory_transactions')
    .select('*, product:products(id, name, sku, stock_quantity, unit)')
    .order('created_at', { ascending: false });

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load inventory history from Supabase: ${error.message}`);
  }

  return (data || []) as InventoryTransaction[];
}

export async function adjustProductStock(params: {
  productId: string;
  quantityChange: number;
  type: 'RESTOCK' | 'ADJUSTMENT';
  note?: string;
}): Promise<{ newStock: number }> {
  const { productId, quantityChange, type, note } = params;
  const supabase = requireSupabase();

  // Try the atomic RPC function if applied
  try {
    const { data, error: rpcError } = await supabase.rpc('admin_adjust_stock', {
      p_product_id: productId,
      p_quantity_change: quantityChange,
      p_transaction_type: type,
      p_note: note || null,
    });

    if (!rpcError && data?.success) {
      return { newStock: data.new_stock };
    }
  } catch {
    // fallback to direct table transaction
  }

  // Direct table update
  const { data: prod, error: fetchErr } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('id', productId)
    .single();

  if (fetchErr) throw new Error(`Product not found in Supabase: ${fetchErr.message}`);

  const newStock = Math.max(0, (prod.stock_quantity || 0) + quantityChange);

  const { error: updErr } = await supabase
    .from('products')
    .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
    .eq('id', productId);

  if (updErr) throw new Error(`Stock update failed: ${updErr.message}`);

  const { error: txErr } = await supabase.from('inventory_transactions').insert([
    {
      product_id: productId,
      quantity_change: quantityChange,
      transaction_type: type,
      note: note || null,
    },
  ]);

  if (txErr) {
    console.warn('Inventory transaction log warning:', txErr.message);
  }

  return { newStock };
}

// ==========================================
// 6. CUSTOMER MANAGEMENT
// ==========================================
export async function getCustomers(search?: string): Promise<CustomerStats[]> {
  const supabase = requireSupabase();

  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

  if (search) {
    const q = search.trim();
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data: profiles, error } = await query;
  if (error) {
    throw new Error(`Failed to load customer profiles from Supabase: ${error.message}`);
  }

  // Fetch orders to compute customer lifetime value and order frequency
  const { data: orders, error: ordErr } = await supabase
    .from('orders')
    .select('user_id, total, order_status, created_at');

  if (ordErr) {
    throw new Error(`Failed to load customer orders for lifetime value calculation: ${ordErr.message}`);
  }

  const safeOrders = orders || [];

  const stats: CustomerStats[] = (profiles || []).map((p: Profile) => {
    const userOrders = safeOrders.filter((o) => o.user_id === p.id);
    const totalSpent = userOrders
      .filter((o) => o.order_status !== 'Cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const lastOrder = userOrders.length > 0 ? userOrders[0].created_at : null;

    return {
      ...p,
      total_orders: userOrders.length,
      total_spent: totalSpent,
      last_order_at: lastOrder,
    };
  });

  return stats;
}
