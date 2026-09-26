import { useState } from 'react';
import {
  ShoppingBag,
  Search,
  Eye,
  MapPin,
  Phone,
  User,
  Printer,
} from 'lucide-react';
import type { Order, OrderStatus, PaymentStatus } from '../types/database';
import { useToast } from '../context/ToastContext';
import { updateOrderStatus, updatePaymentStatus } from '../services/adminApi';

interface OrdersViewProps {
  orders: Order[];
  onRefresh: () => void;
  selectedOrder: Order | null;
  onSelectOrder: (order: Order | null) => void;
}

const ALL_ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

const ALL_PAYMENT_STATUSES: PaymentStatus[] = ['Pending', 'Paid', 'Failed', 'Refunded'];

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  onRefresh,
  selectedOrder,
  onSelectOrder,
}) => {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');
  const [updating, setUpdating] = useState(false);

  // Filtered orders list
  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'All' && o.order_status !== statusFilter) return false;
    if (paymentFilter !== 'All' && o.payment_status !== paymentFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchNum = o.order_number.toLowerCase().includes(q);
      const matchName = o.customer_name.toLowerCase().includes(q);
      const matchPhone = o.customer_phone.toLowerCase().includes(q);
      if (!matchNum && !matchName && !matchPhone) return false;
    }
    return true;
  });

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!selectedOrder) return;
    try {
      setUpdating(true);
      await updateOrderStatus(selectedOrder.id, newStatus);
      toast.success(
        'Order Status Updated',
        `Order ${selectedOrder.order_number} changed to ${newStatus}`
      );
      onSelectOrder({ ...selectedOrder, order_status: newStatus });
      onRefresh();
    } catch (err: any) {
      toast.error('Failed to update status', err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handlePaymentStatusChange = async (newStatus: PaymentStatus) => {
    if (!selectedOrder) return;
    try {
      setUpdating(true);
      await updatePaymentStatus(selectedOrder.id, newStatus);
      toast.success(
        'Payment Status Updated',
        `Order ${selectedOrder.order_number} payment changed to ${newStatus}`
      );
      onSelectOrder({ ...selectedOrder, payment_status: newStatus });
      onRefresh();
    } catch (err: any) {
      toast.error('Failed to update payment status', err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      {/* Header bar */}
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
            Customer Orders Management
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Track, verify, process fulfillment, and update order lifecycles.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              background: 'var(--bg-card)',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Total: <strong>{filteredOrders.length}</strong> orders
          </span>
        </div>
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
              placeholder="Search by order #, customer, or phone..."
              className="table-search-input"
              style={{ width: '320px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="table-filters">
            <select
              className="select-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Order Statuses</option>
              {ALL_ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              className="select-filter"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="All">All Payment Statuses</option>
              {ALL_PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  Payment: {s}
                </option>
              ))}
            </select>

            {(statusFilter !== 'All' || paymentFilter !== 'All' || searchTerm) && (
              <button
                onClick={() => {
                  setStatusFilter('All');
                  setPaymentFilter('All');
                  setSearchTerm('');
                }}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer</th>
                <th>Items Count</th>
                <th>Order Status</th>
                <th>Payment</th>
                <th>Total (₹)</th>
                <th>Timestamp</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <ShoppingBag size={40} className="empty-state-icon" />
                      <div className="empty-state-title">No orders found</div>
                      <div className="empty-state-desc">
                        No customer orders match the current filter or search criteria.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusClass = order.order_status.toLowerCase().replace(/\s+/g, '-');
                  return (
                    <tr
                      key={order.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onSelectOrder(order)}
                    >
                      <td style={{ fontWeight: 700, color: '#FFF', fontFamily: 'var(--font-mono)' }}>
                        {order.order_number}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{order.customer_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {order.customer_phone}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {order.items ? `${order.items.length} item(s)` : '1 item'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${statusClass}`}>{order.order_status}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                            {order.payment_method}
                          </span>
                          <span
                            className={`status-pill ${
                              order.payment_status === 'Paid' ? 'paid' : 'unpaid'
                            }`}
                            style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}
                          >
                            {order.payment_status}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#34D399', fontSize: '0.95rem' }}>
                        ₹{Number(order.total).toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectOrder(order)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                        >
                          <Eye size={13} />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => onSelectOrder(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '780px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h3 className="modal-title">Order {selectedOrder.order_number}</h3>
                  <span
                    className={`status-pill ${selectedOrder.order_status
                      .toLowerCase()
                      .replace(/\s+/g, '-')}`}
                  >
                    {selectedOrder.order_status}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Placed on {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                </div>
              </div>
              <button
                className="btn-icon"
                onClick={() => onSelectOrder(null)}
                title="Close"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Status Update Quick Bar */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    UPDATE FULFILLMENT STATUS
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                    <select
                      className="select-filter"
                      style={{ padding: '0.45rem 1.75rem 0.45rem 0.75rem' }}
                      value={selectedOrder.order_status}
                      disabled={updating}
                      onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                    >
                      {ALL_ORDER_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    PAYMENT STATUS ({selectedOrder.payment_method})
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                    <select
                      className="select-filter"
                      style={{ padding: '0.45rem 1.75rem 0.45rem 0.75rem' }}
                      value={selectedOrder.payment_status}
                      disabled={updating}
                      onChange={(e) => handlePaymentStatusChange(e.target.value as PaymentStatus)}
                    >
                      {ALL_PAYMENT_STATUSES.map((ps) => (
                        <option key={ps} value={ps}>
                          {ps}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Customer and Delivery Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div
                  style={{
                    padding: '1rem',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      marginBottom: '0.65rem',
                    }}
                  >
                    <User size={15} color="var(--primary)" />
                    <span>Customer Details</span>
                  </div>
                  <div style={{ fontWeight: 700, color: '#FFF', fontSize: '1rem' }}>
                    {selectedOrder.customer_name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                    <Phone size={13} />
                    <span>{selectedOrder.customer_phone}</span>
                  </div>
                </div>

                <div
                  style={{
                    padding: '1rem',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      marginBottom: '0.65rem',
                    }}
                  >
                    <MapPin size={15} color="var(--accent-blue)" />
                    <span>Shipping Destination</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#FFF', lineHeight: 1.4 }}>
                    {selectedOrder.shipping_address?.address_line || 'Address provided'}
                    <br />
                    {selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state} -{' '}
                    {selectedOrder.shipping_address?.postal_code}
                    {selectedOrder.shipping_address?.landmark && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                        Landmark: {selectedOrder.shipping_address.landmark}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items List */}
              <div>
                <h4
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: '0.75rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  Ordered Items
                </h4>

                <div
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                  }}
                >
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product & SKU</th>
                        <th>Unit Price</th>
                        <th>Quantity</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <div style={{ fontWeight: 600, color: '#FFF' }}>{item.product_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                SKU: {item.sku}
                              </div>
                            </td>
                            <td>₹{Number(item.unit_price).toLocaleString('en-IN')}</td>
                            <td>
                              <span
                                style={{
                                  fontWeight: 700,
                                  background: 'rgba(255,255,255,0.06)',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: 'var(--radius-sm)',
                                }}
                              >
                                {item.quantity}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#34D399' }}>
                              ₹{Number(item.total_price).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                            No line item records attached.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation Summary */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  padding: '1rem',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                    <span style={{ fontWeight: 600 }}>
                      ₹{Number(selectedOrder.subtotal).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Delivery Fee:</span>
                    <span style={{ fontWeight: 600 }}>
                      {Number(selectedOrder.delivery_fee) === 0
                        ? 'FREE'
                        : `₹${Number(selectedOrder.delivery_fee).toLocaleString('en-IN')}`}
                    </span>
                  </div>

                  {Number(selectedOrder.discount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#FB7185' }}>
                      <span>Discount:</span>
                      <span>-₹{Number(selectedOrder.discount).toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: '#FFF',
                    }}
                  >
                    <span>Grand Total:</span>
                    <span style={{ color: '#34D399' }}>
                      ₹{Number(selectedOrder.total).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button
                onClick={() => window.print()}
                className="btn btn-secondary"
                style={{ marginRight: 'auto' }}
              >
                <Printer size={15} />
                <span>Print Invoice</span>
              </button>
              <button onClick={() => onSelectOrder(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
