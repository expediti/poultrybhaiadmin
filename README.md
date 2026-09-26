# Poultry Bhai — Admin Dashboard

The dedicated, private administration dashboard for the **Poultry Bhai** ecommerce platform.

Built with **Vite + React 19 + TypeScript**, connecting to the exact same live PostgreSQL database via Supabase.

---

## Architecture & Security Model

- **Shared Backend**: Connects directly to the existing Poultry Bhai Supabase instance using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **Zero Client Secrets**: No `service_role` or secret keys are stored or exposed to the client browser.
- **Authorization Enforcement**: Privilege separation is strictly enforced at the PostgreSQL database level using **Row Level Security (RLS)** and the `public.is_admin()` security definer function.
- **Independent Deployment**: Deployed separately on Cloudflare Pages (`poultrybhaiadmin`), keeping customer storefront and internal operations decoupled.

---

## Core Admin Capabilities

1. **Executive Dashboard**: Real-time sales revenue, total order volume, active products count, low-stock alerts, customer count, order distribution pipeline, and recent orders.
2. **Product Catalog & Pricing**:
   - Create, edit, and deactivate products.
   - Configure prices and compare/discount prices.
   - Manage stock quantities, units (`kg`, `Bag`, `Piece`, `Can`, etc.), weights, and featured status.
3. **Category Management**:
   - Manage categories with image URLs and slugs.
   - Track product count per category.
   - Safe deletion guard preventing deletion of categories containing active products.
4. **Order Management & Fulfillment**:
   - Search orders by order number (`PB-YYYY-000001`), customer name, or phone.
   - Filter by fulfillment status (`Pending`, `Confirmed`, `Processing`, `Packed`, `Shipped`, `Out for Delivery`, `Delivered`, `Cancelled`).
   - Filter by payment status (`Pending`, `Paid`, `Failed`, `Refunded`).
   - Detailed order drawer with delivery address snapshot, line items breakdown, and invoice print view.
5. **Inventory Ledger & Stock Adjustments**:
   - Real-time stock level monitoring with low-stock warnings (≤ 10 units) and out-of-stock highlights.
   - Stock adjustment modal with audit reasoning (`RESTOCK` or `ADJUSTMENT`).
   - Full transaction audit history ledger (`inventory_transactions`).
6. **Customer Directory**:
   - Customer profile records from `profiles`.
   - Contact phone and email.
   - Lifetime spend and order frequency tracking per customer.
7. **Analytics & Performance**:
   - Net sales revenue, Average Order Value (AOV), and customer repeat rates.
   - Top-selling products by units and revenue.
   - Category sales breakdown.
   - Clear disclosure of future telemetry requirements (page views, search analytics, abandoned carts).
8. **Settings & Database Health**:
   - Administrator profile and assigned role (`super_admin`).
   - Live Supabase connection validation.
   - Database tables status checklist.
   - Embedded SQL migration copy tool.

---

## Setup & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

*(Note: If unconfigured, the application runs seamlessly in local demo persistence mode for testing and UI evaluation.)*

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

---

## Supabase Database Migration

To grant admin users the ability to manage products, orders, inventory, and categories safely through the public client, apply the migration file located at:

[`supabase/migrations/20260926000000_admin_roles_and_rls.sql`](supabase/migrations/20260926000000_admin_roles_and_rls.sql)

### Assigning an Admin User
After executing the migration, insert your Supabase Auth user ID into the `admin_users` table:
```sql
INSERT INTO public.admin_users (user_id, role)
VALUES ('<YOUR_AUTH_USER_ID>', 'super_admin')
ON CONFLICT (user_id) DO NOTHING;
```
