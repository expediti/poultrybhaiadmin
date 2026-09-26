import { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Star,
  AlertTriangle,
} from 'lucide-react';
import type { Product, Category } from '../types/database';
import { useToast } from '../context/ToastContext';
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/adminApi';

interface ProductsViewProps {
  products: Product[];
  categories: Category[];
  onRefresh: () => void;
  isCreateModalOpen: boolean;
  onOpenCreateModal: () => void;
  onCloseCreateModal: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  onRefresh,
  isCreateModalOpen,
  onOpenCreateModal,
  onCloseCreateModal,
}) => {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    category_id: string;
    description: string;
    sku: string;
    price: number;
    discount_price: string | number;
    stock_quantity: number;
    unit: string;
    weight: string;
    image_url: string;
    is_featured: boolean;
    is_active: boolean;
  }>({
    name: '',
    slug: '',
    category_id: '',
    description: '',
    sku: '',
    price: 0,
    discount_price: '',
    stock_quantity: 0,
    unit: 'kg',
    weight: '',
    image_url: '',
    is_featured: false,
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      category_id: categories[0]?.id || '',
      description: '',
      sku: '',
      price: 0,
      discount_price: '',
      stock_quantity: 0,
      unit: 'kg',
      weight: '',
      image_url: '',
      is_featured: false,
      is_active: true,
    });
  };

  const openCreate = () => {
    resetForm();
    setEditingProduct(null);
    onOpenCreateModal();
  };

  const openEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      slug: prod.slug,
      category_id: prod.category_id || '',
      description: prod.description || '',
      sku: prod.sku,
      price: Number(prod.price),
      discount_price: prod.discount_price !== null ? Number(prod.discount_price) : '',
      stock_quantity: prod.stock_quantity,
      unit: prod.unit,
      weight: prod.weight || '',
      image_url: prod.image_url || '',
      is_featured: prod.is_featured,
      is_active: prod.is_active,
    });
    onOpenCreateModal();
  };

  const handleNameChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: !editingProduct
        ? val
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
        : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sku.trim()) {
      toast.error('Validation Error', 'Product name and SKU are required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        category_id: formData.category_id || null,
        description: formData.description.trim() || null,
        sku: formData.sku.trim(),
        price: Number(formData.price),
        discount_price:
          formData.discount_price !== '' ? Number(formData.discount_price) : null,
        stock_quantity: Number(formData.stock_quantity),
        unit: formData.unit.trim() || 'kg',
        weight: formData.weight.trim() || null,
        image_url: formData.image_url.trim() || null,
        is_featured: formData.is_featured,
        is_active: formData.is_active,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        toast.success('Product Updated', `Successfully updated "${payload.name}"`);
      } else {
        await createProduct(payload);
        toast.success('Product Created', `Successfully added "${payload.name}" to catalog`);
      }

      onCloseCreateModal();
      onRefresh();
    } catch (err: any) {
      toast.error('Action Failed', err.message || 'Could not save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (prod: Product) => {
    try {
      const nextStatus = !prod.is_active;
      await updateProduct(prod.id, { is_active: nextStatus });
      toast.success(
        nextStatus ? 'Product Published' : 'Product Deactivated',
        `"${prod.name}" is now ${nextStatus ? 'visible to customers' : 'hidden from catalog'}`
      );
      onRefresh();
    } catch (err: any) {
      toast.error('Failed to update status', err.message);
    }
  };

  const handleToggleFeatured = async (prod: Product) => {
    try {
      const next = !prod.is_featured;
      await updateProduct(prod.id, { is_featured: next });
      toast.success(
        next ? 'Marked as Featured' : 'Removed from Featured',
        `"${prod.name}" featured status updated`
      );
      onRefresh();
    } catch (err: any) {
      toast.error('Failed to update featured flag', err.message);
    }
  };

  const handleDelete = async (prod: Product) => {
    if (window.confirm(`Are you sure you want to permanently delete "${prod.name}"?`)) {
      try {
        await deleteProduct(prod.id);
        toast.success('Product Deleted', `Removed "${prod.name}" from catalog`);
        onRefresh();
      } catch (err: any) {
        toast.error('Deletion Failed', err.message);
      }
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'All' && p.category_id !== selectedCategory) return false;
    if (statusFilter !== 'all') {
      const matches = statusFilter === 'active' ? p.is_active : !p.is_active;
      if (!matches) return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      if (!matchName && !matchSku) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Title ribbon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF' }}>
            Products & Pricing Catalog
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Manage inventory units, price discounts, stock levels, and store visibility.
          </p>
        </div>

        <button onClick={openCreate} className="btn btn-primary">
          <Plus size={16} />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="table-container" style={{ marginBottom: '1.5rem' }}>
        <div className="table-toolbar">
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '0.8rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
              }}
            />
            <input
              type="text"
              placeholder="Search by product name, SKU..."
              className="table-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="table-filters">
            <select
              className="select-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className="select-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive / Draft</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price & Discount</th>
                <th>Stock Level</th>
                <th>Status</th>
                <th>Featured</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <Package size={40} className="empty-state-icon" />
                      <div className="empty-state-title">No products found</div>
                      <div className="empty-state-desc">
                        Try modifying search or add your first poultry product to the catalog.
                      </div>
                      <button onClick={openCreate} className="btn btn-primary">
                        Add Product
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const cat = categories.find((c) => c.id === prod.category_id);
                  const isLowStock = prod.stock_quantity <= 10;
                  const isOutOfStock = prod.stock_quantity === 0;

                  return (
                    <tr key={prod.id}>
                      {/* Product image & name */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: 'var(--radius-md)',
                              background: '#0F172A',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            {prod.image_url ? (
                              <img
                                src={prod.image_url}
                                alt={prod.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Package size={18} color="var(--text-dim)" />
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#FFF' }}>{prod.name}</div>
                            {prod.weight && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                Pack: {prod.weight}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {prod.sku}
                      </td>

                      {/* Category */}
                      <td>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            color: cat ? '#A78BFA' : 'var(--text-dim)',
                            background: cat ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-sm)',
                            border: cat ? '1px solid rgba(139, 92, 246, 0.2)' : 'none',
                          }}
                        >
                          {cat?.name || 'Unassigned'}
                        </span>
                      </td>

                      {/* Price & Discount */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                          {prod.discount_price !== null && prod.discount_price < prod.price ? (
                            <>
                              <span style={{ fontWeight: 700, color: '#34D399', fontSize: '0.95rem' }}>
                                ₹{Number(prod.discount_price).toLocaleString('en-IN')}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--text-dim)',
                                  textDecoration: 'line-through',
                                }}
                              >
                                ₹{Number(prod.price).toLocaleString('en-IN')}
                              </span>
                            </>
                          ) : (
                            <span style={{ fontWeight: 700, color: '#FFF', fontSize: '0.95rem' }}>
                              ₹{Number(prod.price).toLocaleString('en-IN')}
                            </span>
                          )}
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            /{prod.unit}
                          </span>
                        </div>
                      </td>

                      {/* Stock Level */}
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '999px',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            background: isOutOfStock
                              ? 'rgba(244, 63, 94, 0.15)'
                              : isLowStock
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(16, 185, 129, 0.15)',
                            color: isOutOfStock
                              ? '#FB7185'
                              : isLowStock
                              ? '#FBBF24'
                              : '#34D399',
                            border: isOutOfStock
                              ? '1px solid rgba(244, 63, 94, 0.3)'
                              : isLowStock
                              ? '1px solid rgba(245, 158, 11, 0.3)'
                              : '1px solid rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          {isLowStock && <AlertTriangle size={12} />}
                          {prod.stock_quantity} {prod.unit}
                        </span>
                      </td>

                      {/* Active Status */}
                      <td>
                        <button
                          onClick={() => handleToggleStatus(prod)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          title="Click to toggle publish status"
                        >
                          <span
                            className={`status-pill ${prod.is_active ? 'active' : 'inactive'}`}
                          >
                            {prod.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </button>
                      </td>

                      {/* Featured */}
                      <td>
                        <button
                          onClick={() => handleToggleFeatured(prod)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: prod.is_featured ? '#FBBF24' : 'var(--text-dim)',
                          }}
                          title="Click to toggle featured"
                        >
                          <Star size={18} fill={prod.is_featured ? '#FBBF24' : 'none'} />
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            onClick={() => openEdit(prod)}
                            className="btn-icon"
                            title="Edit product"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(prod)}
                            className="btn-icon"
                            style={{ color: '#FB7185' }}
                            title="Delete product"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Product Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={onCloseCreateModal}>
          <div
            className="modal-content"
            style={{ maxWidth: '680px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {editingProduct ? 'Edit Product Details' : 'Add New Product to Catalog'}
              </h3>
              <button className="btn-icon" onClick={onCloseCreateModal}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Product Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Broiler Starter Mash Feed 50kg"
                      required
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SKU (Unique Identifier) *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. PB-FEED-BSM-50"
                      required
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    >
                      <option value="">No Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">URL Slug *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Regular Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Discount / Selling Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      placeholder="Optional discount price"
                      value={formData.discount_price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_price: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Stock Quantity *</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      required
                      value={formData.stock_quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, stock_quantity: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit of Measure *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="kg, Bag, Piece, Can, Unit..."
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Package Weight / Specs</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 50 kg, 5 Liters, 175W"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Product Image Path / URL</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="/assets/products/starter-feed.jpg"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Product Description</label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    placeholder="Enter detailed description, dosage, or farming instructions..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2rem',
                    padding: '0.75rem',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <span>Active in Customer Storefront</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    />
                    <span>Featured on Home Page</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={onCloseCreateModal}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting
                    ? 'Saving...'
                    : editingProduct
                    ? 'Update Product'
                    : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
