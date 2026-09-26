import React from 'react';
import {
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  Users,
  ArrowUpRight,
  CheckCircle2,
  TrendingUp,
  PlusCircle,
  Eye,
  Boxes,
} from 'lucide-react';
import type { DashboardMetrics, Order, Product } from '../types/database';
import type { AdminTab } from '../components/layout/AdminSidebar';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  recentOrders: Order[];
  lowStockItems: Product[];
  onNavigateTab: (tab: AdminTab) => void;
  onOpenOrder: (order: Order) => void;
  onOpenProductModal: () => void;
  onQuickRestock: (product: Product) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  recentOrders,
  lowStockItems,
  onNavigateTab,
  onOpenOrder,
  onOpenProductModal,
  onQuickRestock,
}) => {
  if (!metrics) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading dashboard metrics...
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Revenue',
      value: `₹${metrics.totalRevenue.toLocaleString('en-IN')}`,
      icon: <DollarSign size={20} />,
      meta: 'From confirmed & completed orders',
      accent: 'var(--primary)',
      glow: 'rgba(16, 185, 129, 0.25)',
      onClick: () => onNavigateTab('analytics'),
    },
    {
      label: 'Total Orders',
      value: metrics.totalOrders,
      icon: <ShoppingBag size={20} />,
      meta: `${metrics.pendingOrders} pending, ${metrics.completedOrders} completed`,
      accent: 'var(--accent-blue)',
      glow: 'transparent',
      onClick: () => onNavigateTab('orders'),
    },
    {
      label: 'Catalog Products',
      value: metrics.totalProducts,
      icon: <Package size={20} />,
      meta: `${metrics.activeProducts} active on store / ${metrics.totalCategories} categories`,
      accent: 'var(--accent-purple)',
      glow: 'transparent',
      onClick: () => onNavigateTab('products'),
    },
    {
      label: 'Low Stock Alerts',
      value: metrics.lowStockCount,
      icon: <AlertTriangle size={20} />,
      meta: metrics.lowStockCount > 0 ? 'Urgent attention required' : 'All stocks healthy',
      accent: metrics.lowStockCount > 0 ? 'var(--accent-rose)' : 'var(--accent-amber)',
      glow: 'rgba(244, 63, 94, 0.25)',
      onClick: () => onNavigateTab('inventory'),
    },
    {
      label: 'Registered Customers',
      value: metrics.totalCustomers,
      icon: <Users size={20} />,
      meta: 'Customer accounts across farms',
      accent: 'var(--accent-cyan)',
      glow: 'rgba(6, 182, 212, 0.25)',
      onClick: () => onNavigateTab('customers'),
    },
  ];

  return (
    <div>
      {/* Quick Action Ribbon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF' }}>
            Store Performance Overview
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Real-time operations, inventory thresholds, and customer orders.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={onOpenProductModal} className="btn btn-primary">
            <PlusCircle size={16} />
            <span>Add Product</span>
          </button>
          <button onClick={() => onNavigateTab('orders')} className="btn btn-secondary">
            <ShoppingBag size={16} />
            <span>Process Orders</span>
          </button>
          <button onClick={() => onNavigateTab('inventory')} className="btn btn-secondary">
            <Boxes size={16} />
            <span>Stock Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="stat-card"
            onClick={card.onClick}
            style={
              {
                cursor: 'pointer',
                '--accent-color': card.accent,
                '--accent-glow': card.glow,
              } as React.CSSProperties
            }
          >
            <div className="stat-header">
              <span className="stat-label">{card.label}</span>
              <div className="stat-icon-wrap">{card.icon}</div>
            </div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-meta">
              <span>{card.meta}</span>
              <ArrowUpRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Visual Analytics & Distribution */}
      <div className="charts-grid">
        {/* Orders Pipeline Breakdown */}
        <div className="card-panel">
          <div className="card-panel-header">
            <div>
              <div className="card-panel-title">
                <TrendingUp size={18} color="var(--primary)" />
                <span>Order Status Distribution</span>
              </div>
              <span className="card-panel-subtitle">Current fulfillment pipeline</span>
            </div>
            <button
              onClick={() => onNavigateTab('orders')}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            >
              Manage All
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
            {/* Horizontal progress bar */}
            <div
              style={{
                height: '14px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.06)',
                overflow: 'hidden',
                display: 'flex',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
              }}
            >
              <div
                title={`Pending: ${metrics.pendingOrders}`}
                style={{
                  width: `${(metrics.pendingOrders / (metrics.totalOrders || 1)) * 100}%`,
                  background: '#FBBF24',
                }}
              />
              <div
                title={`Completed: ${metrics.completedOrders}`}
                style={{
                  width: `${(metrics.completedOrders / (metrics.totalOrders || 1)) * 100}%`,
                  background: '#10B981',
                }}
              />
              <div
                title={`Cancelled: ${metrics.cancelledOrders}`}
                style={{
                  width: `${(metrics.cancelledOrders / (metrics.totalOrders || 1)) * 100}%`,
                  background: '#F43F5E',
                }}
              />
            </div>

            {/* Pipeline Legend */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                paddingTop: '0.5rem',
              }}
            >
              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#FCD34D', fontWeight: 600 }}>PENDING</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF' }}>
                  {metrics.pendingOrders}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Awaiting action</div>
              </div>

              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#34D399', fontWeight: 600 }}>COMPLETED</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF' }}>
                  {metrics.completedOrders}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Delivered & paid</div>
              </div>

              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(244, 63, 94, 0.08)',
                  border: '1px solid rgba(244, 63, 94, 0.2)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#FB7185', fontWeight: 600 }}>CANCELLED</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF' }}>
                  {metrics.cancelledOrders}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Returned / voided</div>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Warning Card */}
        <div className="card-panel">
          <div className="card-panel-header">
            <div>
              <div className="card-panel-title">
                <AlertTriangle size={18} color="#FB7185" />
                <span>Low Stock Watchlist</span>
              </div>
              <span className="card-panel-subtitle">Items &le; 10 units in stock</span>
            </div>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            >
              View All
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} color="#10B981" style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 600, color: '#FFF' }}>All Stock Levels Good</div>
              <div style={{ fontSize: '0.8rem' }}>No products are currently under threshold.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-sm)',
                        background: '#0F172A',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package size={16} color="var(--text-dim)" />
                      )}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#FFF',
                          maxWidth: '180px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        SKU: {item.sku}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '999px',
                        background: 'rgba(244, 63, 94, 0.15)',
                        color: '#FB7185',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        border: '1px solid rgba(244, 63, 94, 0.3)',
                      }}
                    >
                      {item.stock_quantity} {item.unit}
                    </span>
                    <button
                      onClick={() => onQuickRestock(item)}
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                      title="Quick stock adjustment"
                    >
                      Restock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFF' }}>Recent Customer Orders</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Most recent purchases placed through customer checkout
            </p>
          </div>
          <button onClick={() => onNavigateTab('orders')} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
            <span>View All Orders</span>
          </button>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer</th>
                <th>Payment</th>
                <th>Fulfillment Status</th>
                <th>Total</th>
                <th>Placed At</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    No orders recorded yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => {
                  const statusClass = order.order_status.toLowerCase().replace(/\s+/g, '-');
                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 700, color: '#FFF', fontFamily: 'var(--font-mono)' }}>
                        {order.order_number}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{order.customer_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {order.customer_phone}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                            {order.payment_method}
                          </span>
                          <span
                            className={`status-pill ${
                              order.payment_status === 'Paid' ? 'paid' : 'unpaid'
                            }`}
                            style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}
                          >
                            {order.payment_status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${statusClass}`}>{order.order_status}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#34D399' }}>
                        ₹{Number(order.total).toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => onOpenOrder(order)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
