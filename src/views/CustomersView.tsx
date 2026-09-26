import { useState } from 'react';
import { Users, Search, Phone, Mail, Eye } from 'lucide-react';
import type { CustomerStats, Order } from '../types/database';

interface CustomersViewProps {
  customers: CustomerStats[];
  orders: Order[];
  onOpenOrder: (order: Order) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  orders,
  onOpenOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerStats | null>(null);

  const filteredCustomers = customers.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    const matchName = c.full_name?.toLowerCase().includes(q);
    const matchEmail = c.email?.toLowerCase().includes(q);
    const matchPhone = c.phone?.includes(q);
    return matchName || matchEmail || matchPhone;
  });

  const customerOrders = selectedCustomer
    ? orders.filter(
        (o) =>
          o.user_id === selectedCustomer.id ||
          (selectedCustomer.phone && o.customer_phone === selectedCustomer.phone)
      )
    : [];

  return (
    <div>
      {/* Header */}
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
            Customer Accounts & Profiles
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Customer base, purchase frequency, and account order histories.
          </p>
        </div>

        <div
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            background: 'var(--bg-card)',
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          Total Customers: <strong>{customers.length}</strong>
        </div>
      </div>

      {/* Customer Directory Table */}
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
              placeholder="Search by customer name, email, or phone..."
              className="table-search-input"
              style={{ width: '320px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact Info</th>
                <th>Orders Count</th>
                <th>Total Spent</th>
                <th>Registered At</th>
                <th>Last Order</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="empty-state">
                      <Users size={36} className="empty-state-icon" />
                      <div className="empty-state-title">No customers match your search</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            color: '#FFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                          }}
                        >
                          {cust.full_name ? cust.full_name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#FFF' }}>
                            {cust.full_name || 'Anonymous Customer'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            ID: {cust.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      {cust.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                          <Phone size={12} color="var(--text-dim)" />
                          <span>{cust.phone}</span>
                        </div>
                      )}
                      {cust.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <Mail size={12} color="var(--text-dim)" />
                          <span>{cust.email}</span>
                        </div>
                      )}
                    </td>

                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          background: 'rgba(255,255,255,0.06)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {cust.total_orders}
                      </span>
                    </td>

                    <td style={{ fontWeight: 700, color: '#34D399' }}>
                      ₹{Number(cust.total_spent).toLocaleString('en-IN')}
                    </td>

                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(cust.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      {cust.last_order_at
                        ? new Date(cust.last_order_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : 'Never'}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedCustomer(cust)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        <Eye size={13} />
                        <span>Profile & Orders</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Profile & Order History Modal */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '680px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: '#042F24',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                  }}
                >
                  {selectedCustomer.full_name?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div>
                  <h3 className="modal-title">{selectedCustomer.full_name || 'Customer'}</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Customer Account details & order activity
                  </div>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setSelectedCustomer(null)}>
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Contact card */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  padding: '1rem',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Phone
                  </div>
                  <div style={{ fontWeight: 600, color: '#FFF', fontSize: '0.9rem' }}>
                    {selectedCustomer.phone || '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Email
                  </div>
                  <div style={{ fontWeight: 600, color: '#FFF', fontSize: '0.85rem' }}>
                    {selectedCustomer.email || '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Lifetime Spend
                  </div>
                  <div style={{ fontWeight: 800, color: '#34D399', fontSize: '1rem' }}>
                    ₹{Number(selectedCustomer.total_spent).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Order history */}
              <div>
                <h4
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#FFF',
                    marginBottom: '0.75rem',
                  }}
                >
                  Order History ({customerOrders.length})
                </h4>

                {customerOrders.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '2rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                    }}
                  >
                    No orders linked directly to this customer record.
                  </div>
                ) : (
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
                          <th>Order #</th>
                          <th>Status</th>
                          <th>Total</th>
                          <th>Placed At</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerOrders.map((ord) => (
                          <tr key={ord.id}>
                            <td style={{ fontWeight: 600, color: '#FFF', fontFamily: 'var(--font-mono)' }}>
                              {ord.order_number}
                            </td>
                            <td>
                              <span
                                className={`status-pill ${ord.order_status
                                  .toLowerCase()
                                  .replace(/\s+/g, '-')}`}
                              >
                                {ord.order_status}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: '#34D399' }}>
                              ₹{Number(ord.total).toLocaleString('en-IN')}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {new Date(ord.created_at).toLocaleDateString('en-IN')}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => {
                                  setSelectedCustomer(null);
                                  onOpenOrder(ord);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                              >
                                View Order
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedCustomer(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
