import { useState, useEffect } from 'react';
import {
  Boxes,
  PlusCircle,
  Search,
  History,
} from 'lucide-react';
import type { Product, InventoryTransaction } from '../types/database';
import { useToast } from '../context/ToastContext';
import { adjustProductStock } from '../services/adminApi';

interface InventoryViewProps {
  products: Product[];
  transactions: InventoryTransaction[];
  onRefresh: () => void;
  targetProductForAdjustment?: Product | null;
  onClearTargetProduct?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  transactions,
  onRefresh,
  targetProductForAdjustment,
  onClearTargetProduct,
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'levels' | 'history'>('levels');
  const [filterThreshold, setFilterThreshold] = useState<'all' | 'low' | 'out'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Adjustment modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(Boolean(targetProductForAdjustment));
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    targetProductForAdjustment || products[0] || null
  );
  const [qtyDelta, setQtyDelta] = useState<number>(10);
  const [adjustType, setAdjustType] = useState<'RESTOCK' | 'ADJUSTMENT'>('RESTOCK');
  const [reasonNote, setReasonNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If parent passed in a product to quickly restock
  useEffect(() => {
    if (targetProductForAdjustment) {
      setSelectedProduct(targetProductForAdjustment);
      setAdjustType('RESTOCK');
      setQtyDelta(20);
      setAdjustModalOpen(true);
    }
  }, [targetProductForAdjustment]);

  const openAdjustmentModal = (prod?: Product) => {
    if (prod) {
      setSelectedProduct(prod);
    } else if (products.length > 0) {
      setSelectedProduct(products[0]);
    }
    setQtyDelta(10);
    setAdjustType('RESTOCK');
    setReasonNote('');
    setAdjustModalOpen(true);
  };

  const handleCloseModal = () => {
    setAdjustModalOpen(false);
    if (onClearTargetProduct) onClearTargetProduct();
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (qtyDelta === 0) {
      toast.error('Invalid Quantity', 'Adjustment quantity cannot be zero.');
      return;
    }

    const effectiveDelta = adjustType === 'RESTOCK' ? Math.abs(qtyDelta) : qtyDelta;

    try {
      setSubmitting(true);
      const res = await adjustProductStock({
        productId: selectedProduct.id,
        quantityChange: effectiveDelta,
        type: adjustType,
        note: reasonNote.trim() || undefined,
      });

      toast.success(
        'Stock Adjusted',
        `${selectedProduct.name}: New stock is now ${res.newStock} ${selectedProduct.unit}`
      );
      handleCloseModal();
      onRefresh();
    } catch (err: any) {
      toast.error('Adjustment Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (filterThreshold === 'low' && (p.stock_quantity > 10 || p.stock_quantity === 0)) return false;
    if (filterThreshold === 'out' && p.stock_quantity !== 0) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    }
    return true;
  });

  const lowStockCount = products.filter((p) => p.stock_quantity <= 10 && p.stock_quantity > 0).length;
  const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;

  return (
    <div>
      {/* Top ribbon */}
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
            Inventory Management & Stock Ledger
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Real-time warehouse stock tracking, threshold warnings, and audit history.
          </p>
        </div>

        <button onClick={() => openAdjustmentModal()} className="btn btn-primary">
          <PlusCircle size={16} />
          <span>Adjust Stock / Intake</span>
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '1.5rem',
        }}
      >
        <button
          onClick={() => setActiveTab('levels')}
          style={{
            padding: '0.65rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'levels' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'levels' ? '#FFF' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Boxes size={16} />
          <span>Current Stock Levels ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '0.65rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'history' ? '#FFF' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <History size={16} />
          <span>Transaction Audit History ({transactions.length})</span>
        </button>
      </div>

      {/* Current Stock Levels View */}
      {activeTab === 'levels' && (
        <div className="table-container">
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
                placeholder="Search stock by product or SKU..."
                className="table-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="table-filters">
              <select
                className="select-filter"
                value={filterThreshold}
                onChange={(e) => setFilterThreshold(e.target.value as any)}
              >
                <option value="all">All Inventory ({products.length})</option>
                <option value="low">Low Stock Only ({lowStockCount})</option>
                <option value="out">Out of Stock ({outOfStockCount})</option>
              </select>
            </div>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Current Stock</th>
                  <th>Status</th>
                  <th>Unit Type</th>
                  <th>Price</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const isOut = p.stock_quantity === 0;
                  const isLow = p.stock_quantity > 0 && p.stock_quantity <= 10;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: '#FFF' }}>{p.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        {p.sku}
                      </td>
                      <td style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                        <span
                          style={{
                            color: isOut ? '#FB7185' : isLow ? '#FBBF24' : '#34D399',
                          }}
                        >
                          {p.stock_quantity}
                        </span>{' '}
                        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-dim)' }}>
                          {p.unit}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: isOut
                              ? 'rgba(244, 63, 94, 0.15)'
                              : isLow
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(16, 185, 129, 0.15)',
                            color: isOut ? '#FB7185' : isLow ? '#FBBF24' : '#34D399',
                          }}
                        >
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock Warning' : 'Optimal'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.unit}</td>
                      <td>₹{Number(p.discount_price || p.price).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => openAdjustmentModal(p)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction History Ledger View */}
      {activeTab === 'history' && (
        <div className="table-container">
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Quantity Delta</th>
                  <th>Note / Justification</th>
                  <th>Reference ID</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                      No inventory movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isPositive = tx.quantity_change > 0;
                    return (
                      <tr key={tx.id}>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(tx.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td style={{ fontWeight: 600, color: '#FFF' }}>
                          {tx.product?.name || `Product (${tx.product_id?.slice(0, 8)}...)`}
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background:
                                tx.transaction_type === 'RESTOCK'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : tx.transaction_type === 'ORDER_PLACED'
                                  ? 'rgba(59, 130, 246, 0.15)'
                                  : 'rgba(245, 158, 11, 0.15)',
                              color:
                                tx.transaction_type === 'RESTOCK'
                                  ? '#34D399'
                                  : tx.transaction_type === 'ORDER_PLACED'
                                  ? '#60A5FA'
                                  : '#FBBF24',
                            }}
                          >
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.95rem',
                              color: isPositive ? '#34D399' : '#FB7185',
                            }}
                          >
                            {isPositive ? `+${tx.quantity_change}` : tx.quantity_change}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {tx.note || '—'}
                        </td>
                        <td style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                          {tx.reference_id ? tx.reference_id.slice(0, 8) + '...' : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModalOpen && selectedProduct && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal-content"
            style={{ maxWidth: '540px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">Adjust Product Inventory</h3>
              <button className="btn-icon" onClick={handleCloseModal}>
                &times;
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Selected Product</label>
                  <select
                    className="form-select"
                    value={selectedProduct.id}
                    onChange={(e) => {
                      const p = products.find((prod) => prod.id === e.target.value);
                      if (p) setSelectedProduct(p);
                    }}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Current: {p.stock_quantity} {p.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Current Available Stock:
                  </span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFF' }}>
                    {selectedProduct.stock_quantity} {selectedProduct.unit}
                  </span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Transaction Type</label>
                    <select
                      className="form-select"
                      value={adjustType}
                      onChange={(e) => setAdjustType(e.target.value as any)}
                    >
                      <option value="RESTOCK">Restock (Add to stock)</option>
                      <option value="ADJUSTMENT">Manual Adjustment (+ / -)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      {adjustType === 'RESTOCK' ? 'Quantity to Add' : 'Stock Change (+/-)'}
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      required
                      value={qtyDelta}
                      onChange={(e) => setQtyDelta(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Audit Reason / Note *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Supplier Batch Invoice #402 / Warehouse Count"
                    required
                    value={reasonNote}
                    onChange={(e) => setReasonNote(e.target.value)}
                  />
                </div>

                {/* Calculation preview */}
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', color: '#34D399', fontWeight: 600 }}>
                    Projected New Stock:
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34D399' }}>
                    {Math.max(
                      0,
                      selectedProduct.stock_quantity +
                        (adjustType === 'RESTOCK' ? Math.abs(qtyDelta) : qtyDelta)
                    )}{' '}
                    {selectedProduct.unit}
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Applying Adjustment...' : 'Confirm Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
