import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
import {
  MOCK_CATEGORIES,
  MOCK_PRODUCTS,
  MOCK_ORDERS,
  MOCK_CUSTOMERS,
  MOCK_INVENTORY_TRANSACTIONS,
} from '../data/mockData';

// Local storage keys for persistent demo edits when Supabase is unconfigured
const STORAGE_PRODUCTS_KEY = 'pb_admin_products';
const STORAGE_CATEGORIES_KEY = 'pb_admin_categories';
const STORAGE_ORDERS_KEY = 'pb_admin_orders';
const STORAGE_INVENTORY_KEY = 'pb_admin_inventory';

function getStored<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    if (val) return JSON.parse(val);
  } catch {
    // ignore
  }
  return fallback;
}

function setStored<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// ==========================================
// 1. DASHBOARD METRICS & RECENT ACTIVITY
// ==========================================
export async function getDashboardMetrics(): Promise<{
  metrics: DashboardMetrics;
  recentOrders: Order[];
  lowStockItems: Product[];
}> {
  if (!isSupabaseConfigured) {
    const products = getStored<Product[]>(STORAGE_PRODUCTS_KEY, MOCK_PRODUCTS);
    const categories = getStored<Category[]>(STORAGE_CATEGORIES_KEY, MOCK_CATEGORIES);
    const orders = getStored<Order[]>(STORAGE_ORDERS_KEY, MOCK_ORDERS);
    const customers = MOCK_CUSTOMERS;

    const completedOrders = orders.filter(
      (o) => o.order_status === 'Delivered' || o.payment_status === 'Paid'
    ).length;
    const pendingOrders = orders.filter(
      (o) => o.order_status === 'Pending' || o.order_status === 'Confirmed' || o.order_status === 'Processing'
    ).length;
    const cancelledOrders = orders.filter((o) => o.order_status === 'Cancelled').length;

    const totalRevenue = orders
      .filter((o) => o.order_status !== 'Cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const lowStockItems = products.filter((p) => p.stock_quantity <= 10);

    return {
      metrics: {
        totalProducts: products.length,
        activeProducts: products.filter((p) => p.is_active).length,
        totalCategories: categories.length,
        totalOrders: orders.length,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue,
        totalCustomers: customers.length,
        lowStockCount: lowStockItems.length,
      },
      recentOrders: [...orders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 5),
      lowStockItems: lowStockItems.slice(0, 5),
    };
  }

  try {
    // 1. Fetch Orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total, order_status, payment_status, created_at, order_number, customer_name, customer_phone')
      .order('created_at', { ascending: false });

    if (ordersError) throw ordersError;

    // 2. Fetch Products
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, sku, stock_quantity, is_active, price, discount_price, image_url, unit');

    if (prodError) throw prodError;

    // 3. Fetch Categories
    const { count: catCount, error: catError } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true });

    if (catError) throw catError;

    // 4. Fetch Customers count
    const { count: userCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    const safeOrders = orders || [];
    const safeProducts = products || [];

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

    const lowStock = (safeProducts as Product[]).filter((p) => (p.stock_quantity ?? 0) <= 10);

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
  } catch (err) {
    console.warn('[adminApi] Supabase query failed (falling back to local cache):', err);
    return getDashboardMetricsLocal();
  }
}

function getDashboardMetricsLocal() {
  const products = getStored<Product[]>(STORAGE_PRODUCTS_KEY, MOCK_PRODUCTS);
  const categories = getStored<Category[]>(STORAGE_CATEGORIES_KEY, MOCK_CATEGORIES);
  const orders = getStored<Order[]>(STORAGE_ORDERS_KEY, MOCK_ORDERS);
  const customers = MOCK_CUSTOMERS;

  const lowStock = products.filter((p) => p.stock_quantity <= 10);

  return {
    metrics: {
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.is_active).length,
      totalCategories: categories.length,
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.order_status === 'Pending' || o.order_status === 'Confirmed').length,
      completedOrders: orders.filter((o) => o.order_status === 'Delivered').length,
      cancelledOrders: orders.filter((o) => o.order_status === 'Cancelled').length,
      totalRevenue: orders
        .filter((o) => o.order_status !== 'Cancelled')
        .reduce((sum, o) => sum + Number(o.total), 0),
      totalCustomers: customers.length,
      lowStockCount: lowStock.length,
    },
    recentOrders: orders.slice(0, 5),
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
  if (!isSupabaseConfigured) {
    let prods = getStored<Product[]>(STORAGE_PRODUCTS_KEY, MOCK_PRODUCTS);
    const cats = getStored<Category[]>(STORAGE_CATEGORIES_KEY, MOCK_CATEGORIES);

    // Attach category
    prods = prods.map((p) => ({
      ...p,
      category: cats.find((c) => c.id === p.category_id),
    }));

    if (options?.categoryId) {
      prods = prods.filter((p) => p.category_id === options.categoryId);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      prods = prods.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q)
      );
    }
    if (options?.status && options.status !== 'all') {
      prods = prods.filter((p) => (options.status === 'active' ? p.is_active : !p.is_active));
    }
    if (options?.stockStatus && options.stockStatus !== 'all') {
      if (options.stockStatus === 'out_of_stock') {
        prods = prods.filter((p) => p.stock_quantity === 0);
      } else if (options.stockStatus === 'low_stock') {
        prods = prods.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= 10);
      } else if (options.stockStatus === 'in_stock') {
        prods = prods.filter((p) => p.stock_quantity > 10);
      }
    }

    return prods;
  }

  try {
    let query = supabase
      .from('products')
      .select('*, category:categories(id, name, slug)')
      .order('created_at', { ascending: false });

    if (options?.categoryId) {
      query = query.eq('category_id', options.categoryId);
    }
    if (options?.search) {
      query = query.or(`name.ilike.%${options.search}%,sku.ilike.%${options.search}%`);
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
    if (error) throw error;
    return (data || []) as Product[];
  } catch (err) {
    console.warn('[adminApi] Supabase getProducts failed, using local:', err);
    return getStored<Product[]>(STORAGE_PRODUCTS_KEY, MOCK_PRODUCTS);
  }
}

export async function createProduct(payload: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'>): Promise<Product> {
  const newProduct: Product = {
    ...payload,
    id: isSupabaseConfigured ? undefined as unknown as string : 'prod_' + Date.now(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('products')
      .insert([payload])
      .select('*, category:categories(id, name, slug)')
      .single();

    if (error) throw error;

    // Log initial stock inventory transaction if stock > 0
    if (payload.stock_quantity > 0 && data?.id) {
      await supabase.from('inventory_transactions').insert([
        {
          product_id: data.id,
          quantity_change: payload.stock_quantity,
          transaction_type: 'RESTOCK',
          note: 'Initial catalog creation stock intake',
        },
      ]);
    }

    return data as Product;
  }

  // Local fallback
  const prods = getStored<Product[]>(STORAGE_PRODUCTS_KEY, MOCK_PRODUCTS);
  prods.unshift(newProduct);
  setStored(STORAGE_PRODUCTS_KEY, prods);

  if (payload.stock_quantity > 0) {
    const txs = getStored<InventoryTransaction[]>(STORAGE_INVENTORY_KEY, MOCK_INVENTORY_TRANSACTIONS);
    txs.unshift({
      id: 'tx_' + Date.now(),
      product_id: newProduct.id,
      quantity_change: payload.stock_quantity,
      transaction_type: 'RESTOCK',
      reference_id: null,
      note: 'Initial catalog creation stock intake',
      created_at: new Date().toISOString(),
    });
    setStored(STORAGE_INVENTORY_KEY, txs);
  }

  return newProduct;
}

export async function updateProduct(
  id: string,
  updates: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>
): Promise<Product> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, category:categories(id, name, slug)')
      .single();

    if (error) throw error;
    return data as Product;
  }

  const prods = getStored<Product[]>(STORAGE_PRODUCTS_KEY, MOCK_PRODUCTS);
  const index = prods.findIndex((p) => p.id === id);
  if (index === -1) throw new Error('Product not found');

  prods[index] = {
    ...prods[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  setStored(STORAGE_PRODUCTS_KEY, prods);
  return prods[index];
}

export async function deleteProduct(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return;
  }

  let prods = getStored<Product[]>(STORAGE_PRODUCTS_KEY, MOCK_PRODUCTS);
  prods = prods.filter((p) => p.id !== id);
  setStored(STORAGE_PRODUCTS_KEY, prods);
}

// ==========================================
// 3. CATEGORIES MANAGEMENT
// ==========================================
export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured) {
    const cats = getStored<Category[]>(STORAGE_CATEGORIES_KEY, MOCK_CATEGORIES);
    const prods = getStored<Product[]>(STORAGE_PRODUCTS_KEY, MOCK_PRODUCTS);

    return cats.map((c) => ({
      ...c,
      product_count: prods.filter((p) => p.category_id === c.id).length,
    }));
  }

  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*, products:products(id)')
      .order('name', { ascending: true });

    if (error) throw error;

    return (categories || []).map((c: any) => ({
      ...c,
      product_count: Array.isArray(c.products) ? c.products.length : 0,
    }));
  } catch (err) {
    console.warn('[adminApi] getCategories error, using local fallback:', err);
    return getStored<Category[]>(STORAGE_CATEGORIES_KEY, MOCK_CATEGORIES);
  }
}

export async function createCategory(
  payload: Omit<Category, 'id' | 'created_at' | 'updated_at' | 'product_count'>
): Promise<Category> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('categories')
      .insert([payload])
      .select('*')
      .single();

    if (error) throw error;
    return { ...data, product_count: 0 } as Category;
  }

  const cats = getStored<Category[]>(STORAGE_CATEGORIES_KEY, MOCK_CATEGORIES);
  const newCategory: Category = {
    ...payload,
    id: 'cat_' + Date.now(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    product_count: 0,
  };
  cats.push(newCategory);
  setStored(STORAGE_CATEGORIES_KEY, cats);
  return newCategory;
}

export async function updateCategory(
  id: string,
  updates: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>
): Promise<Category> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('categories')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as Category;
  }

  const cats = getStored<Category[]>(STORAGE_CATEGORIES_KEY, MOCK_CATEGORIES);
  const idx = cats.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('Category not found');

  cats[idx] = {
    ...cats[idx],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  setStored(STORAGE_CATEGORIES_KEY, cats);
  return cats[idx];
}

export async function deleteCategory(id: string): Promise<void> {
  // Safe deletion guard: check if any products are assigned to this category
  if (isSupabaseConfigured) {
    const { data: prods, error: countError } = await supabase
      .from('products')
      .select('id')
      .eq('category_id', id)
      .limit(1);

    if (countError) throw countError;
    if (prods && prods.length > 0) {
      throw new Error('Cannot delete category: Existing products are assigned to this category. Please reassign or delete them first.');
    }

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    return;
  }

  const prods = getStored<Product[]>(STORAGE_PRODUCTS_KEY, MOCK_PRODUCTS);
  const hasProducts = prods.some((p) => p.category_id === id);
  if (hasProducts) {
    throw new Error('Cannot delete category: Existing products are assigned to this category.');
  }

  let cats = getStored<Category[]>(STORAGE_CATEGORIES_KEY, MOCK_CATEGORIES);
  cats = cats.filter((c) => c.id !== id);
  setStored(STORAGE_CATEGORIES_KEY, cats);
}

// ==========================================
// 4. ORDERS MANAGEMENT
// ==========================================
export async function getOrders(options?: {
  status?: OrderStatus | 'All';
  paymentStatus?: PaymentStatus | 'All';
  search?: string;
}): Promise<Order[]> {
  if (!isSupabaseConfigured) {
    let orders = getStored<Order[]>(STORAGE_ORDERS_KEY, MOCK_ORDERS);

    if (options?.status && options.status !== 'All') {
      orders = orders.filter((o) => o.order_status === options.status);
    }
    if (options?.paymentStatus && options.paymentStatus !== 'All') {
      orders = orders.filter((o) => o.payment_status === options.paymentStatus);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_phone.toLowerCase().includes(q)
      );
    }

    return [...orders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  try {
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
      query = query.or(
        `order_number.ilike.%${options.search}%,customer_name.ilike.%${options.search}%,customer_phone.ilike.%${options.search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Order[];
  } catch (err) {
    console.warn('[adminApi] getOrders error, using local fallback:', err);
    return getStored<Order[]>(STORAGE_ORDERS_KEY, MOCK_ORDERS);
  }
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Order;
  }

  const orders = getStored<Order[]>(STORAGE_ORDERS_KEY, MOCK_ORDERS);
  return orders.find((o) => o.id === id) || null;
}

export async function updateOrderStatus(id: string, newStatus: OrderStatus): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('orders')
      .update({
        order_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    return;
  }

  const orders = getStored<Order[]>(STORAGE_ORDERS_KEY, MOCK_ORDERS);
  const idx = orders.findIndex((o) => o.id === id);
  if (idx !== -1) {
    orders[idx].order_status = newStatus;
    orders[idx].updated_at = new Date().toISOString();
    setStored(STORAGE_ORDERS_KEY, orders);
  }
}

export async function updatePaymentStatus(id: string, newStatus: PaymentStatus): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    return;
  }

  const orders = getStored<Order[]>(STORAGE_ORDERS_KEY, MOCK_ORDERS);
  const idx = orders.findIndex((o) => o.id === id);
  if (idx !== -1) {
    orders[idx].payment_status = newStatus;
    orders[idx].updated_at = new Date().toISOString();
    setStored(STORAGE_ORDERS_KEY, orders);
  }
}

// ==========================================
// 5. INVENTORY & STOCK ADJUSTMENTS
// ==========================================
export async function getInventoryHistory(productId?: string): Promise<InventoryTransaction[]> {
  if (!isSupabaseConfigured) {
    let txs = getStored<InventoryTransaction[]>(STORAGE_INVENTORY_KEY, MOCK_INVENTORY_TRANSACTIONS);
    const prods = getStored<Product[]>(STORAGE_PRODUCTS_KEY, MOCK_PRODUCTS);

    txs = txs.map((t) => ({
      ...t,
      product: prods.find((p) => p.id === t.product_id),
    }));

    if (productId) {
      txs = txs.filter((t) => t.product_id === productId);
    }
    return [...txs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  try {
    let query = supabase
      .from('inventory_transactions')
      .select('*, product:products(id, name, sku, stock_quantity, unit)')
      .order('created_at', { ascending: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as InventoryTransaction[];
  } catch (err) {
    console.warn('[adminApi] getInventoryHistory error, using local fallback:', err);
    return getStored<InventoryTransaction[]>(STORAGE_INVENTORY_KEY, MOCK_INVENTORY_TRANSACTIONS);
  }
}

export async function adjustProductStock(params: {
  productId: string;
  quantityChange: number;
  type: 'RESTOCK' | 'ADJUSTMENT';
  note?: string;
}): Promise<{ newStock: number }> {
  const { productId, quantityChange, type, note } = params;

  if (isSupabaseConfigured) {
    // Try the atomic RPC function first
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

    // Direct transaction fallback
    const { data: prod, error: fetchErr } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single();

    if (fetchErr) throw fetchErr;

    const newStock = Math.max(0, (prod.stock_quantity || 0) + quantityChange);

    const { error: updErr } = await supabase
      .from('products')
      .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
      .eq('id', productId);

    if (updErr) throw updErr;

    await supabase.from('inventory_transactions').insert([
      {
        product_id: productId,
        quantity_change: quantityChange,
        transaction_type: type,
        note: note || null,
      },
    ]);

    return { newStock };
  }

  // Local storage mode
  const prods = getStored<Product[]>(STORAGE_PRODUCTS_KEY, MOCK_PRODUCTS);
  const pIdx = prods.findIndex((p) => p.id === productId);
  if (pIdx === -1) throw new Error('Product not found');

  const newStock = Math.max(0, prods[pIdx].stock_quantity + quantityChange);
  prods[pIdx].stock_quantity = newStock;
  prods[pIdx].updated_at = new Date().toISOString();
  setStored(STORAGE_PRODUCTS_KEY, prods);

  const txs = getStored<InventoryTransaction[]>(STORAGE_INVENTORY_KEY, MOCK_INVENTORY_TRANSACTIONS);
  txs.unshift({
    id: 'tx_' + Date.now(),
    product_id: productId,
    quantity_change: quantityChange,
    transaction_type: type,
    reference_id: null,
    note: note || null,
    created_at: new Date().toISOString(),
  });
  setStored(STORAGE_INVENTORY_KEY, txs);

  return { newStock };
}

// ==========================================
// 6. CUSTOMER MANAGEMENT
// ==========================================
export async function getCustomers(search?: string): Promise<CustomerStats[]> {
  if (!isSupabaseConfigured) {
    let customers = MOCK_CUSTOMERS;
    const orders = getStored<Order[]>(STORAGE_ORDERS_KEY, MOCK_ORDERS);

    let list: CustomerStats[] = customers.map((c) => {
      const userOrders = orders.filter((o) => o.user_id === c.id);
      const totalSpent = userOrders
        .filter((o) => o.order_status !== 'Cancelled')
        .reduce((sum, o) => sum + Number(o.total), 0);
      const lastOrder = userOrders.length > 0 ? userOrders[0].created_at : null;

      return {
        ...c,
        total_orders: userOrders.length,
        total_spent: totalSpent,
        last_order_at: lastOrder,
      };
    });

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.full_name && c.full_name.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q))
      );
    }

    return list;
  }

  try {
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: profiles, error } = await query;
    if (error) throw error;

    // Fetch orders to compute customer lifetime value and order frequency
    const { data: orders } = await supabase
      .from('orders')
      .select('user_id, total, order_status, created_at');

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
  } catch (err) {
    console.warn('[adminApi] getCustomers error, using local fallback:', err);
    return MOCK_CUSTOMERS.map((c) => ({
      ...c,
      total_orders: 1,
      total_spent: 1850,
      last_order_at: c.created_at,
    }));
  }
}
