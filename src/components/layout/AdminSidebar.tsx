import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  Boxes,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Database,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

export type AdminTab =
  | 'dashboard'
  | 'orders'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'customers'
  | 'analytics'
  | 'settings';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  pendingOrdersCount?: number;
  lowStockCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  pendingOrdersCount = 0,
  lowStockCount = 0,
}) => {
  const { signOut, isConfigured, adminRole } = useAdminAuth();

  const navItems: {
    id: AdminTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeVariant?: 'warning' | 'danger';
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: <ShoppingBag size={20} />,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      badgeVariant: 'warning',
    },
    {
      id: 'products',
      label: 'Products',
      icon: <Package size={20} />,
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: <Layers size={20} />,
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: <Boxes size={20} />,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeVariant: 'danger',
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: <Users size={20} />,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 size={20} />,
    },
    {
      id: 'settings',
      label: 'Settings & DB',
      icon: <Settings size={20} />,
    },
  ];

  return (
    <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-badge">
          <div className="brand-logo-wrap">
            <span style={{ fontSize: '1.25rem', fontWeight: 900 }}>PB</span>
          </div>
          {!collapsed && (
            <div className="brand-info">
              <span className="brand-title">Poultry Bhai</span>
              <span className="brand-tag">Administration</span>
            </div>
          )}
        </div>
        <button
          className="collapse-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {!collapsed && <div className="nav-section-label">Operations</div>}
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <div style={{ flexShrink: 0 }}>{item.icon}</div>
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge !== undefined && (
                <span className={`nav-badge ${item.badgeVariant || ''}`}>{item.badge}</span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer & Actions */}
      <div className="sidebar-footer">
        {!collapsed && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.03)',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={14} color={!isConfigured ? '#FBBF24' : '#34D399'} />
              <span style={{ color: 'var(--text-muted)' }}>
                {!isConfigured ? 'Not Configured' : 'Live Supabase'}
              </span>
            </div>
            <span
              style={{
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: !isConfigured ? '#FBBF24' : '#34D399',
              }}
            >
              {adminRole || 'ADMIN'}
            </span>
          </div>
        )}

        <button
          onClick={signOut}
          className="nav-item"
          style={{ width: '100%', border: 'none', background: 'transparent' }}
          title="Sign out"
        >
          <LogOut size={18} color="#FB7185" />
          {!collapsed && <span style={{ color: '#FB7185' }}>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
