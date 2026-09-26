import React, { useState, useEffect, useCallback } from 'react';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { AdminSidebar, type AdminTab } from './components/layout/AdminSidebar';
import { AdminHeader } from './components/layout/AdminHeader';
import { DashboardView } from './views/DashboardView';
import { OrdersView } from './views/OrdersView';
import { ProductsView } from './views/ProductsView';
import { CategoriesView } from './views/CategoriesView';
import { InventoryView } from './views/InventoryView';
import { CustomersView } from './views/CustomersView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';
import { LoginView } from './views/LoginView';

import {
  getDashboardMetrics,
  getProducts,
  getCategories,
  getOrders,
  getInventoryHistory,
  getCustomers,
} from './services/adminApi';

import type {
  Product,
  Category,
  Order,
  InventoryTransaction,
  CustomerStats,
  DashboardMetrics,
} from './types/database';

const AdminAppContent: React.FC = () => {
  const { isAdmin, isLoading } = useAdminAuth();
  const toast = useToast();

  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Core data states
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [customers, setCustomers] = useState<CustomerStats[]>([]);

  // Cross-view interactive states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [inventoryTargetProduct, setInventoryTargetProduct] = useState<Product | null>(null);

  // Load all admin data
  const loadAllData = useCallback(async () => {
    try {
      const [metricsRes, prods, cats, ords, txs, custs] = await Promise.all([
        getDashboardMetrics(),
        getProducts(),
        getCategories(),
        getOrders(),
        getInventoryHistory(),
        getCustomers(),
      ]);

      setMetrics(metricsRes.metrics);
      setRecentOrders(metricsRes.recentOrders);
      setLowStockItems(metricsRes.lowStockItems);
      setProducts(prods);
      setCategories(cats);
      setOrders(ords);
      setTransactions(txs);
      setCustomers(custs);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      toast.error('Data Sync Warning', 'Failed to synchronize live records. Operating with local cache.');
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) {
      loadAllData();
    }
  }, [isAdmin, loadAllData]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg-main)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '3px solid var(--border-subtle)',
              borderTopColor: 'var(--primary)',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          <div>Initializing Poultry Bhai Admin...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <LoginView />;
  }

  // Cross navigation helpers
  const handleOpenOrder = (order: Order) => {
    setSelectedOrder(order);
    setCurrentTab('orders');
  };

  const handleQuickRestock = (product: Product) => {
    setInventoryTargetProduct(product);
    setCurrentTab('inventory');
  };

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        pendingOrdersCount={metrics?.pendingOrders}
        lowStockCount={metrics?.lowStockCount}
      />

      {/* Main Content Area */}
      <div className={`admin-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <AdminHeader
          currentTab={currentTab}
          onRefresh={loadAllData}
          onOpenSettings={() => setCurrentTab('settings')}
        />

        <main className="admin-content">
          {currentTab === 'dashboard' && (
            <DashboardView
              metrics={metrics}
              recentOrders={recentOrders}
              lowStockItems={lowStockItems}
              onNavigateTab={setCurrentTab}
              onOpenOrder={handleOpenOrder}
              onOpenProductModal={() => {
                setCurrentTab('products');
                setIsProductModalOpen(true);
              }}
              onQuickRestock={handleQuickRestock}
            />
          )}

          {currentTab === 'orders' && (
            <OrdersView
              orders={orders}
              onRefresh={loadAllData}
              selectedOrder={selectedOrder}
              onSelectOrder={setSelectedOrder}
            />
          )}

          {currentTab === 'products' && (
            <ProductsView
              products={products}
              categories={categories}
              onRefresh={loadAllData}
              isCreateModalOpen={isProductModalOpen}
              onOpenCreateModal={() => setIsProductModalOpen(true)}
              onCloseCreateModal={() => setIsProductModalOpen(false)}
            />
          )}

          {currentTab === 'categories' && (
            <CategoriesView categories={categories} onRefresh={loadAllData} />
          )}

          {currentTab === 'inventory' && (
            <InventoryView
              products={products}
              transactions={transactions}
              onRefresh={loadAllData}
              targetProductForAdjustment={inventoryTargetProduct}
              onClearTargetProduct={() => setInventoryTargetProduct(null)}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersView
              customers={customers}
              orders={orders}
              onOpenOrder={handleOpenOrder}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView
              orders={orders}
              products={products}
              categories={categories}
              customers={customers}
            />
          )}

          {currentTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AdminAuthProvider>
      <ToastProvider>
        <AdminAppContent />
      </ToastProvider>
    </AdminAuthProvider>
  );
}
