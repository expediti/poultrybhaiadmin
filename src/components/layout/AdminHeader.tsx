import { Search, ExternalLink, RefreshCw, Sun, Moon } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { AdminTab } from './AdminSidebar';

interface AdminHeaderProps {
  currentTab: AdminTab;
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
  onOpenSettings?: () => void;
}

const TAB_TITLES: Record<AdminTab, string> = {
  dashboard: 'Executive Dashboard',
  orders: 'Order Management',
  products: 'Product Catalog & Pricing',
  categories: 'Category Management',
  inventory: 'Inventory & Stock History',
  customers: 'Customer Directory',
  analytics: 'Analytics & Performance',
  settings: 'Database & Settings',
};

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentTab,
  onSearch,
  onRefresh,
  onOpenSettings,
}) => {
  const { user, adminRole, isConfigured } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="admin-header">
      <div className="header-left">
        <h1 className="header-page-title">{TAB_TITLES[currentTab]}</h1>
        {onSearch && (
          <div className="header-search">
            <Search size={16} className="header-search-icon" />
            <input
              type="text"
              placeholder={`Search in ${currentTab}...`}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="header-right">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="btn-icon"
            title="Refresh active view data"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            <RefreshCw size={16} />
          </button>
        )}

        {/* Theme Switcher */}
        <button
          className="theme-switch-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Clean White' : 'Pitch Black'} mode`}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          <span>{theme === 'dark' ? 'White Theme' : 'Pitch Black'}</span>
        </button>

        {/* Backend Status Pill */}
        <div
          className={`backend-status-pill ${!isConfigured ? 'demo' : ''}`}
          onClick={onOpenSettings}
          style={{ cursor: 'pointer' }}
          title={
            !isConfigured
              ? 'Click to configure live Supabase URL and Anon Key in .env'
              : 'Supabase Connected & Live'
          }
        >
          <span className="status-dot" />
          <span>{!isConfigured ? 'Not Configured' : 'Supabase Active'}</span>
        </div>

        {/* Customer Storefront Link */}
        <a
          href="https://github.com/expediti/poultrybhai"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
          title="Open Customer Front-end Repository"
        >
          <span>Storefront</span>
          <ExternalLink size={13} />
        </a>

        {/* User Badge */}
        <div className="admin-user-menu" onClick={onOpenSettings}>
          <div className="user-avatar">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.full_name || 'Admin'}</span>
            <span className="user-role">{adminRole || 'ADMIN'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
