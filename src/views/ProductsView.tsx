import { useState, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Star,
  AlertTriangle,
  UploadCloud,
  X,
  RefreshCw,
} from 'lucide-react';
import type { Product, Category } from '../types/database';
import { useToast } from '../context/ToastContext';
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/adminApi';
import {
  optimizeProductImage,
  validateImageFile,
  formatBytes,
  type ImageOptimizationResult,
} from '../utils/imageOptimizer';
import {
  uploadProductImage,
  deleteStorageImageIfManaged,
  isManagedStorageUrl,
} from '../services/storageService';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Image upload states
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [optimizedBlob, setOptimizedBlob] = useState<Blob | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageStats, setImageStats] = useState<ImageOptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isImageRemoved, setIsImageRemoved] = useState<boolean>(false);

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
    setSelectedImageFile(null);
    setOptimizedBlob(null);
    setImagePreviewUrl(null);
    setImageStats(null);
    setIsOptimizing(false);
    setIsUploading(false);
    setIsImageRemoved(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openCreate = () => {
    resetForm();
    setEditingProduct(null);
    onOpenCreateModal();
  };

  const openEdit = (prod: Product) => {
    resetForm();
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
    setImagePreviewUrl(prod.image_url || null);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error('Invalid Image', validation.error || 'Please select a valid image file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsOptimizing(true);
      const result = await optimizeProductImage(file, 1200, 0.82);
      setSelectedImageFile(file);
      setOptimizedBlob(result.blob);
      setImageStats(result);
      setIsImageRemoved(false);

      // Create instant local preview URL
      const preview = URL.createObjectURL(result.blob);
      setImagePreviewUrl(preview);

      toast.success(
        'Image Optimized',
        `Ready for upload: WebP (${formatBytes(result.optimizedSize)}, reduced by ${result.reductionPercentage}%)`
      );
    } catch (err: any) {
      toast.error('Optimization Failed', err.message || 'Failed to process image file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setOptimizedBlob(null);
    setImagePreviewUrl(null);
    setImageStats(null);
    setIsImageRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sku.trim()) {
      toast.error('Validation Error', 'Product name and SKU are required.');
      return;
    }

    try {
      setSubmitting(true);

      // 1. Resolve product image URL
      let finalImageUrl: string | null = formData.image_url.trim() || null;

      if (isImageRemoved) {
        // If image was explicitly removed by admin
        if (editingProduct?.image_url && isManagedStorageUrl(editingProduct.image_url)) {
          await deleteStorageImageIfManaged(editingProduct.image_url);
        }
        finalImageUrl = null;
      } else if (optimizedBlob) {
        // Upload new optimized WebP to Supabase Storage
        setIsUploading(true);
        try {
          const { publicUrl } = await uploadProductImage(
            optimizedBlob,
            formData.slug || formData.name || 'product'
          );

          // If updating and previously had an old storage image that's now replaced, clean up old file
          if (editingProduct?.image_url && isManagedStorageUrl(editingProduct.image_url)) {
            await deleteStorageImageIfManaged(editingProduct.image_url);
          }

          finalImageUrl = publicUrl;
        } catch (uploadErr: any) {
          toast.error('Image Upload Error', uploadErr.message || 'Failed to upload to Supabase Storage.');
          setSubmitting(false);
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      // 2. Prepare payload
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
        image_url: finalImageUrl,
        is_featured: formData.is_featured,
        is_active: formData.is_active,
      };

      // 3. Save to Supabase
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
      setIsUploading(false);
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

        // Clean up storage object if image was hosted in product-images bucket
        if (prod.image_url && isManagedStorageUrl(prod.image_url)) {
          await deleteStorageImageIfManaged(prod.image_url);
        }

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
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Product Catalog & Pricing
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Manage store catalog, prices, discount rates, inventory, and product imagery.
          </p>
        </div>

        <button onClick={openCreate} className="btn btn-primary">
          <Plus size={16} />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          background: 'var(--bg-card)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-dim)',
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.4rem' }}
            placeholder="Search by product name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Category:</span>
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Status:</span>
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="table-container">
        <div className="table-toolbar">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing <strong>{filteredProducts.length}</strong> of{' '}
            <strong>{products.length}</strong> catalog items
          </div>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '38%' }}>Product / SKU</th>
                <th>Category</th>
                <th>Base Price</th>
                <th>Selling Price</th>
                <th>Stock</th>
                <th>Store Visibility</th>
                <th>Featured</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div style={{ color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                      <Package size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                      <div>No products matched your search or filter criteria.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const hasDiscount =
                    prod.discount_price !== null &&
                    prod.discount_price !== undefined &&
                    Number(prod.discount_price) < Number(prod.price);
                  const isOutOfStock = prod.stock_quantity <= 0;
                  const isLowStock = prod.stock_quantity > 0 && prod.stock_quantity <= 10;

                  return (
                    <tr key={prod.id}>
                      {/* Product Name & SKU */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--bg-input)',
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
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{prod.name}</div>
                            {prod.weight && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                Pack: {prod.weight}
                              </div>
                            )}
                            <span className="sku-tag">{prod.sku}</span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {prod.category?.name || 'Uncategorized'}
                        </span>
                      </td>

                      {/* Base Price */}
                      <td>
                        <span
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: hasDiscount ? 'var(--text-dim)' : 'var(--text-main)',
                            textDecoration: hasDiscount ? 'line-through' : 'none',
                          }}
                        >
                          ₹{Number(prod.price).toFixed(2)}
                        </span>
                      </td>

                      {/* Selling / Discount Price */}
                      <td>
                        {hasDiscount ? (
                          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--primary)' }}>
                            ₹{Number(prod.discount_price).toFixed(2)}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>

                      {/* Stock Quantity */}
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: isOutOfStock
                              ? 'rgba(239, 68, 68, 0.15)'
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
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
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

                {/* Local Image Upload Area connected to Supabase Storage */}
                <div className="form-group">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.4rem',
                    }}
                  >
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Product Image (Local Upload → Supabase Storage)
                    </label>
                    {imageStats && (
                      <span style={{ fontSize: '0.74rem', color: '#34D399', fontWeight: 600 }}>
                        WebP Optimized ({formatBytes(imageStats.optimizedSize)}, -{imageStats.reductionPercentage}%)
                      </span>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    onChange={handleFileSelect}
                  />

                  {imagePreviewUrl ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.25rem',
                        padding: '0.85rem',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div
                        style={{
                          width: '72px',
                          height: '72px',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={imagePreviewUrl}
                          alt="Product Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span
                            style={{
                              fontSize: '0.84rem',
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {selectedImageFile ? selectedImageFile.name : 'Current Catalog Image'}
                          </span>
                          {selectedImageFile && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#34D399',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              WebP Ready
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>
                          {selectedImageFile && imageStats
                            ? `Original: ${formatBytes(imageStats.originalSize)} → WebP: ${formatBytes(imageStats.optimizedSize)}`
                            : 'Hosted on Supabase Storage bucket (product-images)'}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.55rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isOptimizing || submitting}
                          >
                            <UploadCloud size={13} />
                            <span>Change Image</span>
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            style={{ color: '#FB7185', padding: '0.35rem' }}
                            onClick={handleRemoveImage}
                            title="Remove image"
                            disabled={isOptimizing || submitting}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => !isOptimizing && fileInputRef.current?.click()}
                      style={{
                        border: '1.5px dashed var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.5rem',
                        textAlign: 'center',
                        background: 'var(--bg-input)',
                        cursor: isOptimizing ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isOptimizing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <RefreshCw size={24} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            Compressing & Converting to WebP...
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: 'rgba(255, 255, 255, 0.05)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-muted)',
                              marginBottom: '0.2rem',
                            }}
                          >
                            <UploadCloud size={20} />
                          </div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            Choose an image from your computer
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            JPG, PNG, WebP, AVIF up to 15 MB • Automatically optimized & resized for store
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                  disabled={submitting || isOptimizing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || isOptimizing}
                >
                  {submitting ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>{isUploading ? 'Uploading Image to Supabase...' : 'Saving Product...'}</span>
                    </div>
                  ) : editingProduct ? (
                    'Update Product'
                  ) : (
                    'Create Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
