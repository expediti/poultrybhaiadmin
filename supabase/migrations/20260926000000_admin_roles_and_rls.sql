-- ====================================================================
-- POULTRY BHAI — ADMIN PRIVILEGES, ROLES & RLS POLICIES MIGRATION
-- Migration: 20260926000000_admin_roles_and_rls.sql
-- ====================================================================
-- This migration enables secure administration of the existing Poultry Bhai
-- database without putting any service_role or secret key in the browser.
-- Customer storefront security is 100% preserved.
-- ====================================================================

-- 1. Create Admin Registry
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'manager')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
CREATE POLICY "Admins can view admin_users"
    ON public.admin_users FOR SELECT
    USING (auth.uid() = user_id);

-- Helper function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. PRODUCTS: Admin Full Access (Read Inactive, Create, Update, Delete)
DROP POLICY IF EXISTS "Admins have full access to products" ON public.products;
CREATE POLICY "Admins have full access to products"
    ON public.products FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 3. CATEGORIES: Admin Full Access
DROP POLICY IF EXISTS "Admins have full access to categories" ON public.categories;
CREATE POLICY "Admins have full access to categories"
    ON public.categories FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 4. PRODUCT IMAGES: Admin Full Access
DROP POLICY IF EXISTS "Admins have full access to product_images" ON public.product_images;
CREATE POLICY "Admins have full access to product_images"
    ON public.product_images FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 5. ORDERS: Admin Full Access (View all customer orders, update statuses)
DROP POLICY IF EXISTS "Admins can view and update all orders" ON public.orders;
CREATE POLICY "Admins can view and update all orders"
    ON public.orders FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 6. ORDER ITEMS: Admin Full Access
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items"
    ON public.order_items FOR SELECT
    USING (public.is_admin());

-- 7. PROFILES: Admin Can View Customer Profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_admin());

-- 8. ADDRESSES: Admin Can View Customer Addresses
DROP POLICY IF EXISTS "Admins can view all addresses" ON public.addresses;
CREATE POLICY "Admins can view all addresses"
    ON public.addresses FOR SELECT
    USING (public.is_admin());

-- 9. INVENTORY TRANSACTIONS: Admin Can View & Insert
DROP POLICY IF EXISTS "Admins can view inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Admins can view inventory transactions"
    ON public.inventory_transactions FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Admins can insert inventory transactions"
    ON public.inventory_transactions FOR INSERT
    WITH CHECK (public.is_admin());

-- 10. ATOMIC STOCK ADJUSTMENT RPC (Ensures stock and ledger stay 100% in sync)
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
