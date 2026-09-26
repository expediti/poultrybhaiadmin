import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Award,
  Layers,
  Info,
} from 'lucide-react';
import type { Order, Product, Category, CustomerStats } from '../types/database';

interface AnalyticsViewProps {
  orders: Order[];
  products: Product[];
  categories: Category[];
  customers: CustomerStats[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  orders,
  products,
  categories,
  customers,
}) => {
  // 1. Genuine Sales & Order Metrics
  const validOrders = orders.filter((o) => o.order_status !== 'Cancelled');
  const totalRevenue = validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const aov = validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;

  // 2. Repeat Customers Rate
  const repeatCustomersCount = customers.filter((c) => c.total_orders > 1).length;
  const repeatCustomerRate =
    customers.length > 0 ? Math.round((repeatCustomersCount / customers.length) * 100) : 0;

  // 3. Top Products by Quantity & Revenue
  const productSalesMap: Record<
    string,
    { name: string; sku: string; unitsSold: number; revenue: number }
  > = {};

  orders.forEach((o) => {
    if (o.order_status === 'Cancelled') return;
    if (o.items) {
      o.items.forEach((item) => {
        const pId = item.product_id || item.product_name;
        if (!productSalesMap[pId]) {
          productSalesMap[pId] = {
            name: item.product_name,
            sku: item.sku,
            unitsSold: 0,
            revenue: 0,
          };
        }
        productSalesMap[pId].unitsSold += item.quantity;
        productSalesMap[pId].revenue += Number(item.total_price);
      });
    }
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // 4. Category Performance
  const categorySalesMap: Record<string, { name: string; revenue: number; ordersCount: number }> = {};
  categories.forEach((c) => {
    categorySalesMap[c.id] = { name: c.name, revenue: 0, ordersCount: 0 };
  });

  orders.forEach((o) => {
    if (o.order_status === 'Cancelled') return;
    if (o.items) {
      o.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.product_id);
        const catId = prod?.category_id;
        if (catId && categorySalesMap[catId]) {
          categorySalesMap[catId].revenue += Number(item.total_price);
          categorySalesMap[catId].ordersCount += 1;
        }
      });
    }
  });

  const categoryPerformance = Object.values(categorySalesMap).sort(
    (a, b) => b.revenue - a.revenue
  );

  return (
    <div>
      {/* Top ribbon */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF' }}>
          Ecommerce Performance & Analytics
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Insights derived strictly from verifiable database orders and inventory records.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" style={{ '--accent-color': '#10B981', '--accent-glow': 'rgba(16, 185, 129, 0.2)' } as any}>
          <div className="stat-header">
            <span className="stat-label">Net Sales Revenue</span>
            <div className="stat-icon-wrap">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="stat-value">₹{totalRevenue.toLocaleString('en-IN')}</div>
          <div className="stat-meta highlight-green">
            <span>Verified from {validOrders.length} completed/active orders</span>
          </div>
        </div>

        <div className="stat-card" style={{ '--accent-color': '#3B82F6', '--accent-glow': 'rgba(59, 130, 246, 0.2)' } as any}>
          <div className="stat-header">
            <span className="stat-label">Average Order Value (AOV)</span>
            <div className="stat-icon-wrap">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="stat-value">₹{aov.toLocaleString('en-IN')}</div>
          <div className="stat-meta">
            <span>Average cart checkout amount</span>
          </div>
        </div>

        <div className="stat-card" style={{ '--accent-color': '#8B5CF6', '--accent-glow': 'rgba(139, 92, 246, 0.2)' } as any}>
          <div className="stat-header">
            <span className="stat-label">Repeat Customer Rate</span>
            <div className="stat-icon-wrap">
              <Users size={20} />
            </div>
          </div>
          <div className="stat-value">{repeatCustomerRate}%</div>
          <div className="stat-meta">
            <span>{repeatCustomersCount} customers placed multiple orders</span>
          </div>
        </div>

        <div className="stat-card" style={{ '--accent-color': '#06B6D4', '--accent-glow': 'rgba(6, 182, 212, 0.2)' } as any}>
          <div className="stat-header">
            <span className="stat-label">Total Completed Orders</span>
            <div className="stat-icon-wrap">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="stat-value">{validOrders.length}</div>
          <div className="stat-meta">
            <span>Excludes cancelled checkouts</span>
          </div>
        </div>
      </div>

      {/* Breakdowns Grid */}
      <div className="charts-grid" style={{ marginBottom: '2rem' }}>
        {/* Best-Selling Products */}
        <div className="card-panel">
          <div className="card-panel-header">
            <div>
              <div className="card-panel-title">
                <Award size={18} color="var(--primary)" />
                <span>Top Revenue Products</span>
              </div>
              <span className="card-panel-subtitle">Ranked by actual sales volume</span>
            </div>
          </div>

          {topProducts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No sales data recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {topProducts.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: idx === 0 ? '#10B981' : 'var(--bg-elevated)',
                        color: idx === 0 ? '#042F24' : '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#FFF', fontSize: '0.9rem' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        SKU: {p.sku} | {p.unitsSold} units ordered
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#34D399', fontSize: '1rem' }}>
                      ₹{p.revenue.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Contribution */}
        <div className="card-panel">
          <div className="card-panel-header">
            <div>
              <div className="card-panel-title">
                <Layers size={18} color="var(--accent-purple)" />
                <span>Sales by Category</span>
              </div>
              <span className="card-panel-subtitle">Revenue distribution</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {categoryPerformance.map((c, i) => {
              const pct = totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 100) : 0;
              return (
                <div key={i}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem',
                      marginBottom: '0.35rem',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#FFF' }}>{c.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      ₹{c.revenue.toLocaleString('en-IN')}{' '}
                      <strong style={{ color: '#34D399' }}>({pct}%)</strong>
                    </span>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      borderRadius: '999px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background:
                          i === 0
                            ? 'var(--primary)'
                            : i === 1
                            ? 'var(--accent-blue)'
                            : 'var(--accent-purple)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Critical Verification & Future Telemetry Notice */}
      <div
        style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <Info size={22} color="#60A5FA" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#93C5FD', marginBottom: '0.35rem' }}>
              Database Telemetry & Future Analytics Roadmap
            </h4>
            <p style={{ fontSize: '0.82rem', color: '#BFDBFE', lineHeight: 1.6 }}>
              In accordance with project policy, all metrics above are calculated directly from verified database transactions in the existing <code>orders</code>, <code>order_items</code>, and <code>products</code> tables.
            </p>
            <div
              style={{
                marginTop: '0.75rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                <strong style={{ color: '#FCD34D' }}>Most Viewed Products:</strong> Requires a future <code>product_views</code> table and client view beacon (currently not present in database).
              </div>
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                <strong style={{ color: '#FCD34D' }}>Search Analytics:</strong> Customer searches currently filter in client memory without logging queries to the database.
              </div>
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                <strong style={{ color: '#FCD34D' }}>Cart Abandonment:</strong> Shopping carts are stored in browser localStorage; requires future backend cart synchronization.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
