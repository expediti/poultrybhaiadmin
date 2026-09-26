import { useState } from 'react';
import {
  Database,
  ShieldCheck,
  Copy,
  Check,
  User,
  Terminal,
  Lock,
  Sun,
  Moon,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useTheme } from '../context/ThemeContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

export const SettingsView: React.FC = () => {
  const { user, adminRole, configuredAdminEmail } = useAdminAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const migrationSql = `-- ====================================================================
-- POULTRY BHAI — ADMIN PRIVILEGES, ROLES & RLS POLICIES MIGRATION
-- Migration: 20260926000000_admin_roles_and_rls.sql
-- ====================================================================

-- 1. Create Admin Registry with Email Restriction
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'admin', 'manager')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
CREATE POLICY "Admins can view admin_users"
    ON public.admin_users FOR SELECT
    USING (auth.uid() = user_id);

-- 2. Server-side Helper Function to Check Admin Privileges
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.admin_users a
        JOIN auth.users u ON u.id = a.user_id
        WHERE a.user_id = auth.uid()
          AND lower(u.email) = lower(a.email)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Core Admin Policies (Products, Categories, Orders, Inventory)
CREATE POLICY "Admins have full access to products" ON public.products FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins have full access to categories" ON public.categories FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins have full access to product_images" ON public.product_images FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can view and update all orders" ON public.orders FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can view all addresses" ON public.addresses FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can view inventory transactions" ON public.inventory_transactions FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert inventory transactions" ON public.inventory_transactions FOR INSERT WITH CHECK (public.is_admin());

-- 4. Helper function to authorize your owner email in one command
CREATE OR REPLACE FUNCTION public.register_admin_email(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
    v_user RECORD;
BEGIN
    SELECT id, email INTO v_user FROM auth.users WHERE lower(email) = lower(trim(p_email));
    IF NOT FOUND THEN
        RETURN 'Error: User not found in auth.users for ' || p_email || '. Create user in Supabase Auth first.';
    END IF;
    INSERT INTO public.admin_users (user_id, email, role)
    VALUES (v_user.id, lower(v_user.email), 'super_admin')
    ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role;
    RETURN 'SUCCESS: Authorized ' || v_user.email || ' as super_admin.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Storage Bucket: product-images (Public Read, Admin Write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view product-images bucket" ON storage.objects;
CREATE POLICY "Public can view product-images bucket" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admins can upload to product-images" ON storage.objects;
CREATE POLICY "Admins can upload to product-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update product-images" ON storage.objects;
CREATE POLICY "Admins can update product-images" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND public.is_admin()) WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete product-images" ON storage.objects;
CREATE POLICY "Admins can delete product-images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND public.is_admin());`;

  const copySql = () => {
    navigator.clipboard.writeText(migrationSql);
    setCopied(true);
    toast.success('SQL Copied', 'Paste into your Supabase SQL Editor to execute.');
    setTimeout(() => setCopied(false), 3000);
  };

  const dbTables = [
    { name: 'profiles', rls: 'Protected by RLS', purpose: 'Customer accounts linked to auth.users' },
    { name: 'categories', rls: 'Protected by RLS', purpose: 'Product categories & store catalog tree' },
    { name: 'products', rls: 'Protected by RLS', purpose: 'Items, pricing, stock levels, units' },
    { name: 'product_images', rls: 'Protected by RLS', purpose: 'Gallery imagery per product' },
    { name: 'addresses', rls: 'Protected by RLS', purpose: 'Customer saved delivery destinations' },
    { name: 'orders', rls: 'Protected by RLS', purpose: 'Checkouts, delivery fees, payment states' },
    { name: 'order_items', rls: 'Protected by RLS', purpose: 'Line items and server snapshot prices' },
    { name: 'inventory_transactions', rls: 'Protected by RLS', purpose: 'Stock deduction and restocking ledger' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top ribbon */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF' }}>
          Database Architecture & Admin Settings
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Environment configuration, database security validation, and role credentials.
        </p>
      </div>

      {/* Admin Profile Card */}
      <div className="card-panel">
        <div className="card-panel-header">
          <div className="card-panel-title">
            <User size={18} color="var(--primary)" />
            <span>Administrator Credentials</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Full Name
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFF', marginTop: '0.2rem' }}>
              {user?.full_name || 'Poultry Bhai Administrator'}
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Email Address
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFF', marginTop: '0.2rem' }}>
              {user?.email || 'admin@poultrybhai.com'}
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Assigned Role
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#34D399', textTransform: 'uppercase', marginTop: '0.2rem' }}>
              {adminRole || 'SUPER ADMIN'}
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Authorized Owner Email (ENV)
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {configuredAdminEmail || 'Not restricted (VITE_ADMIN_EMAIL unset)'}
            </div>
          </div>
        </div>
      </div>

      {/* Appearance / Theme Mode */}
      <div className="card-panel">
        <div className="card-panel-header">
          <div className="card-panel-title">
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            <span>Interface Theme Appearance</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Active: <strong>{theme === 'dark' ? 'Pitch Black' : 'Clean White'}</strong>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            style={{
              padding: '1.25rem',
              background: '#000000',
              border: theme === 'dark' ? '2px solid #FFFFFF' : '1px solid #222222',
              borderRadius: 'var(--radius-md)',
              color: '#FFFFFF',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Moon size={16} />
                <span>Pitch Black Mode</span>
              </div>
              {theme === 'dark' && <Check size={16} color="#10B981" />}
            </div>
            <p style={{ fontSize: '0.78rem', color: '#888888', margin: 0 }}>
              Pure black background, high contrast, clean minimalist styling.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setTheme('light')}
            style={{
              padding: '1.25rem',
              background: '#FFFFFF',
              border: theme === 'light' ? '2px solid #000000' : '1px solid #D4D4D8',
              borderRadius: 'var(--radius-md)',
              color: '#09090B',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Sun size={16} />
                <span>Clean White Mode</span>
              </div>
              {theme === 'light' && <Check size={16} color="#059669" />}
            </div>
            <p style={{ fontSize: '0.78rem', color: '#71717A', margin: 0 }}>
              Bright clean white surfaces, crisp grey dividers, day-friendly.
            </p>
          </button>
        </div>
      </div>

      {/* Supabase Connection State */}
      <div className="card-panel">
        <div className="card-panel-header">
          <div className="card-panel-title">
            <Database size={18} color={isSupabaseConfigured ? '#34D399' : '#FBBF24'} />
            <span>Supabase Database Connection</span>
          </div>
          <span
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: isSupabaseConfigured ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: isSupabaseConfigured ? '#34D399' : '#FBBF24',
              border: isSupabaseConfigured ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            {isSupabaseConfigured ? 'LIVE POSTGRESQL' : 'DEMO PERSISTENCE'}
          </span>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          This admin panel connects directly to the <strong>exact same Supabase project</strong> as the customer website via <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.
          Authorization is strictly enforced by PostgreSQL Row Level Security (RLS). No service_role key is ever exposed to the client browser.
        </p>

        {/* Database Tables Checklist */}
        <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Table Name</th>
                <th>Security</th>
                <th>Database Purpose</th>
              </tr>
            </thead>
            <tbody>
              {dbTables.map((t, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600, color: '#FFF', fontFamily: 'var(--font-mono)' }}>
                    {t.name}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#34D399',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <ShieldCheck size={13} />
                      <span>{t.rls}</span>
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {t.purpose}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SQL Migration Helper */}
      <div className="card-panel">
        <div className="card-panel-header">
          <div>
            <div className="card-panel-title">
              <Terminal size={18} color="var(--primary)" />
              <span>Admin Role & RLS Policies Migration SQL</span>
            </div>
            <span className="card-panel-subtitle">
              Saved in <code>supabase/migrations/20260926000000_admin_roles_and_rls.sql</code>
            </span>
          </div>
          <button onClick={copySql} className="btn btn-secondary" style={{ fontSize: '0.78rem' }}>
            {copied ? <Check size={14} color="#34D399" /> : <Copy size={14} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy SQL'}</span>
          </button>
        </div>

        <div className="code-box">
          <pre>{migrationSql}</pre>
        </div>
      </div>

      {/* Store Delivery Rules Info */}
      <div className="card-panel">
        <div className="card-panel-header">
          <div className="card-panel-title">
            <Lock size={18} color="var(--primary)" />
            <span>Store Configuration (Hardcoded in Database RPC)</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>DEFAULT CURRENCY</div>
            <div style={{ fontWeight: 700, color: '#FFF', fontSize: '1rem', marginTop: '0.2rem' }}>
              ₹ INR (Indian Rupee)
            </div>
          </div>

          <div style={{ padding: '0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>DELIVERY PRICING</div>
            <div style={{ fontWeight: 700, color: '#FFF', fontSize: '0.9rem', marginTop: '0.2rem' }}>
              Free above ₹999 (else ₹50 flat)
            </div>
          </div>

          <div style={{ padding: '0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>ORDER ID FORMAT</div>
            <div style={{ fontWeight: 700, color: '#FFF', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
              PB-YYYY-000001
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
