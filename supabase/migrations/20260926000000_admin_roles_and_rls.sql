-- ====================================================================
-- POULTRY BHAI — ADMIN PRIVILEGES, ROLES & RLS POLICIES MIGRATION
-- Migration: 20260926000000_admin_roles_and_rls.sql
-- ====================================================================
-- This migration establishes the private administrator authorization
-- infrastructure for Poultry Bhai without dropping, altering, or recreating
-- any existing customer tables or modifying public customer RLS policies.
-- Customer storefront security is 100% preserved.
-- ====================================================================

-- 1. Create Admin Registry with Email Restriction
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'admin', 'manager')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Safely add email column if admin_users was created in an earlier step without it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'admin_users' 
          AND column_name = 'email'
    ) THEN
        ALTER TABLE public.admin_users ADD COLUMN email TEXT;
        UPDATE public.admin_users a
        SET email = lower(u.email)
        FROM auth.users u
        WHERE a.user_id = u.id;
        ALTER TABLE public.admin_users ALTER COLUMN email SET NOT NULL;
        ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_email_key UNIQUE (email);
    END IF;
END $$;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
CREATE POLICY "Admins can view admin_users"
    ON public.admin_users FOR SELECT
    USING (auth.uid() = user_id);

-- 2. Server-side Helper Function to Check Admin Privileges
-- Verifies that auth.uid() exists in admin_users AND matches the authenticated account email
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

-- 3. PRODUCTS: Admin Full Access (Create, Read inactive, Update, Delete)
-- Note: Existing customer policy ("Anyone can view active products") remains 100% active.
DROP POLICY IF EXISTS "Admins have full access to products" ON public.products;
CREATE POLICY "Admins have full access to products"
    ON public.products FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 4. CATEGORIES: Admin Full Access
-- Note: Existing customer policy ("Anyone can view active categories") remains 100% active.
DROP POLICY IF EXISTS "Admins have full access to categories" ON public.categories;
CREATE POLICY "Admins have full access to categories"
    ON public.categories FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 5. PRODUCT IMAGES: Admin Full Access
DROP POLICY IF EXISTS "Admins have full access to product_images" ON public.product_images;
CREATE POLICY "Admins have full access to product_images"
    ON public.product_images FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 6. ORDERS: Admin Full Access (View all customer orders, update statuses)
DROP POLICY IF EXISTS "Admins can view and update all orders" ON public.orders;
CREATE POLICY "Admins can view and update all orders"
    ON public.orders FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 7. ORDER ITEMS: Admin Full Access
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items"
    ON public.order_items FOR SELECT
    USING (public.is_admin());

-- 8. PROFILES: Admin Can View All Profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_admin());

-- 9. ADDRESSES: Admin Can View All Addresses
DROP POLICY IF EXISTS "Admins can view all addresses" ON public.addresses;
CREATE POLICY "Admins can view all addresses"
    ON public.addresses FOR SELECT
    USING (public.is_admin());

-- 10. INVENTORY TRANSACTIONS: Admin Can View & Insert
DROP POLICY IF EXISTS "Admins can view inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Admins can view inventory transactions"
    ON public.inventory_transactions FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Admins can insert inventory transactions"
    ON public.inventory_transactions FOR INSERT
    WITH CHECK (public.is_admin());

-- 11. ATOMIC STOCK ADJUSTMENT RPC (Keeps product stock and ledger in lock-step)
CREATE OR REPLACE FUNCTION public.admin_adjust_stock(
    p_product_id UUID,
    p_quantity_change INT,
    p_transaction_type TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_new_stock INT;
    v_product_name TEXT;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Admin privileges required';
    END IF;

    IF p_transaction_type NOT IN ('RESTOCK', 'ADJUSTMENT') THEN
        RAISE EXCEPTION 'Invalid transaction type for manual adjustment';
    END IF;

    UPDATE public.products
    SET stock_quantity = stock_quantity + p_quantity_change,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_product_id
    RETURNING stock_quantity, name INTO v_new_stock, v_product_name;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Adjustment would result in negative stock (%) for %', v_new_stock, v_product_name;
    END IF;

    INSERT INTO public.inventory_transactions (
        product_id,
        quantity_change,
        transaction_type,
        note
    ) VALUES (
        p_product_id,
        p_quantity_change,
        p_transaction_type,
        p_note
    );

    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'new_stock', v_new_stock
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. HELPER FUNCTION TO AUTHORIZE YOUR ADMIN EMAIL IN ONE STEP
CREATE OR REPLACE FUNCTION public.register_admin_email(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
    v_user RECORD;
BEGIN
    SELECT id, email INTO v_user
    FROM auth.users
    WHERE lower(email) = lower(trim(p_email));

    IF NOT FOUND THEN
        RETURN 'Error: No Supabase Auth account found for email: ' || p_email || '. Please create your email + password user in Supabase Dashboard (Authentication -> Users -> Add User) first.';
    END IF;

    INSERT INTO public.admin_users (user_id, email, role)
    VALUES (v_user.id, lower(v_user.email), 'super_admin')
    ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email, role = EXCLUDED.role;

    RETURN 'SUCCESS: Authorized ' || v_user.email || ' as super_admin in public.admin_users.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 13. STORAGE BUCKET: product-images & STORAGE RLS POLICIES
-- ====================================================================
-- Dedicated public bucket for product imagery (WebP, JPG, PNG)
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

-- Public read access: Customers and storefront can load product images
DROP POLICY IF EXISTS "Public can view product-images bucket" ON storage.objects;
CREATE POLICY "Public can view product-images bucket"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'product-images');

-- Admin write access: Only authorized admins can upload, update, or remove images
DROP POLICY IF EXISTS "Admins can upload to product-images" ON storage.objects;
CREATE POLICY "Admins can upload to product-images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'product-images'
        AND public.is_admin()
    );

DROP POLICY IF EXISTS "Admins can update product-images" ON storage.objects;
CREATE POLICY "Admins can update product-images"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'product-images' AND public.is_admin())
    WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete product-images" ON storage.objects;
CREATE POLICY "Admins can delete product-images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'product-images'
        AND public.is_admin()
    );

-- ====================================================================
-- INSTRUCTIONS TO ACTIVATE YOUR ADMIN ACCESS:
-- 1. Create your admin user in Supabase Dashboard -> Authentication -> Users -> "Add User" (Create user with email + password).
-- 2. Run this migration in your Supabase SQL Editor.
-- 3. In the SQL Editor, execute:
--    SELECT public.register_admin_email('YOUR_EMAIL@EXAMPLE.COM');
-- ====================================================================

