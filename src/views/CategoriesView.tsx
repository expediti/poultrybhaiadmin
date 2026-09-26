import { useState } from 'react';
import { Layers, Plus, Edit2, Trash2, Package } from 'lucide-react';
import type { Category } from '../types/database';
import { useToast } from '../context/ToastContext';
import { createCategory, updateCategory, deleteCategory } from '../services/adminApi';

interface CategoriesViewProps {
  categories: Category[];
  onRefresh: () => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({ categories, onRefresh }) => {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    description: string;
    image_url: string;
    is_active: boolean;
  }>({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    is_active: true,
  });

  const openCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image_url: cat.image_url || '',
      is_active: cat.is_active,
    });
    setModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: !editingCategory
        ? val
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
        : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      toast.error('Validation Error', 'Category name and slug are required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        image_url: formData.image_url.trim() || null,
        is_active: formData.is_active,
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
        toast.success('Category Updated', `Updated "${payload.name}" successfully`);
      } else {
        await createCategory(payload);
        toast.success('Category Created', `Added category "${payload.name}"`);
      }

      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error('Save Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (cat: Category) => {
    try {
      const next = !cat.is_active;
      await updateCategory(cat.id, { is_active: next });
      toast.success(
        next ? 'Category Activated' : 'Category Deactivated',
        `"${cat.name}" is now ${next ? 'active' : 'inactive'}`
      );
      onRefresh();
    } catch (err: any) {
      toast.error('Failed to toggle status', err.message);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (cat.product_count && cat.product_count > 0) {
      toast.error(
        'Cannot Delete Category',
        `This category has ${cat.product_count} product(s) assigned to it. Please reassign or delete the products first.`
      );
      return;
    }

    if (window.confirm(`Delete category "${cat.name}"?`)) {
      try {
        await deleteCategory(cat.id);
        toast.success('Category Deleted', `Removed "${cat.name}"`);
        onRefresh();
      } catch (err: any) {
        toast.error('Deletion Failed', err.message);
      }
    }
  };

  return (
    <div>
      {/* Header ribbon */}
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
            Product Categories
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Organize catalog groupings, category images, and customer browse menus.
          </p>
        </div>

        <button onClick={openCreate} className="btn btn-primary">
          <Plus size={16} />
          <span>New Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {categories.map((cat) => (
          <div
            key={cat.id}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'var(--transition-smooth)',
            }}
          >
            {/* Category image banner */}
            <div
              style={{
                height: '120px',
                background: '#0F172A',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {cat.image_url ? (
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-dim)',
                  }}
                >
                  <Layers size={36} />
                </div>
              )}

              {/* Status pill on image */}
              <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                <span className={`status-pill ${cat.is_active ? 'active' : 'inactive'}`}>
                  {cat.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Content body */}
            <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '0.4rem',
                }}
              >
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFF' }}>{cat.name}</h3>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    color: 'var(--accent-purple)',
                    background: 'rgba(139, 92, 246, 0.1)',
                    padding: '0.2rem 0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                  }}
                >
                  <Package size={12} />
                  <span>{cat.product_count || 0} products</span>
                </span>
              </div>

              <div
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-dim)',
                  marginBottom: '0.75rem',
                }}
              >
                slug: /{cat.slug}
              </div>

              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                  flex: 1,
                  marginBottom: '1.25rem',
                }}
              >
                {cat.description || 'No description provided for this category.'}
              </p>

              {/* Actions footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '0.85rem',
                }}
              >
                <button
                  onClick={() => handleToggleStatus(cat)}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                >
                  {cat.is_active ? 'Deactivate' : 'Activate'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button onClick={() => openEdit(cat)} className="btn-icon" title="Edit category">
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="btn-icon"
                    style={{ color: '#FB7185' }}
                    title={
                      cat.product_count && cat.product_count > 0
                        ? 'Cannot delete category with products'
                        : 'Delete category'
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '540px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button className="btn-icon" onClick={() => setModalOpen(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Broiler Equipment"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
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

                <div className="form-group">
                  <label className="form-label">Image URL / Asset Path</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="/assets/products/equipment-category.jpg"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    placeholder="Describe products grouped under this category..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>Active in Store Navigation</span>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingCategory ? 'Update' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
