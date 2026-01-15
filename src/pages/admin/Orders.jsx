import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Navbar from '../../components/Layout/Navbar';
import './Admin.css';

// Generate random license key
function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [];
  for (let i = 0; i < 4; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return segments.join('-');
}

export default function AdminOrders() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Fetch users for mapping userId to email/name
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersMap = {};
      usersSnapshot.docs.forEach(doc => {
        usersMap[doc.id] = doc.data();
      });
      setUsers(usersMap);

      // Query transactions collection to show all user transactions
      const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Fetched transactions:', ordersData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
    setLoading(false);
  }

  // Xác nhận thanh toán thủ công và tạo license
  async function handleConfirmPayment(order) {
    try {
      // 1. Update order status
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'paid',
        paidAt: serverTimestamp()
      });

      // 2. Create license
      const plan = order.plan;
      const days = plan === '1_day' ? 1 : plan === '1_month' ? 30 : -1;
      const expiresAt = days > 0 
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
        : null;

      await addDoc(collection(db, 'licenses'), {
        licenseKey: generateKey(),
        productId: 'regfb',
        plan: plan,
        status: 'active',
        userId: order.userId,
        hwid: null,
        hwidHistory: [],
        createdAt: serverTimestamp(),
        activatedAt: serverTimestamp(),
        expiresAt: expiresAt,
        orderId: order.orderId
      });

      // 3. Update local state
      setOrders(orders.map(o => 
        o.id === order.id ? { ...o, status: 'paid', paidAt: new Date() } : o
      ));
    } catch (error) {
      console.error('Error confirming payment:', error);
    }
  }

  async function handleCancelOrder(orderId) {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled' });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  }

  if (!authLoading && !isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  // Filter by transaction type instead of status
  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.type === statusFilter);

  const depositCount = orders.filter(o => o.type === 'deposit').length;
  const purchaseCount = orders.filter(o => o.type === 'license_purchase').length;

  function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  return (
    <div className="admin-page">
      <Navbar />
      
      <div className="admin-container">
        <div className="admin-header">
          <div className="header-content">
            <h1>💰 Lịch sử Giao dịch</h1>
            <p>
              Tổng cộng: {orders.length} giao dịch
            </p>
          </div>
          
          <div className="filter-tabs">
            <button 
              className={`tab ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              Tất cả ({orders.length})
            </button>
            <button 
              className={`tab ${statusFilter === 'deposit' ? 'active' : ''}`}
              onClick={() => setStatusFilter('deposit')}
            >
              💰 Nạp tiền ({depositCount})
            </button>
            <button 
              className={`tab ${statusFilter === 'license_purchase' ? 'active' : ''}`}
              onClick={() => setStatusFilter('license_purchase')}
            >
              🔑 Mua license ({purchaseCount})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Đang tải...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <h3>Chưa có giao dịch nào</h3>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="data-table-wrapper desktop-only">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Loại</th>
                    <th>User</th>
                    <th>Mô tả</th>
                    <th>Số tiền</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(tx => (
                    <tr key={tx.id}>
                      <td>
                        {tx.type === 'deposit' && '💰 Nạp tiền'}
                        {tx.type === 'license_purchase' && '🔑 Mua license'}
                        {tx.type === 'daily_renewal' && '⚡ Gia hạn ngày'}
                        {tx.type === 'renewal' && '🔄 Gia hạn'}
                        {!['deposit', 'license_purchase', 'daily_renewal', 'renewal'].includes(tx.type) && `📝 ${tx.type}`}
                      </td>
                      <td className="email-cell">
                        {users[tx.userId]?.displayName || users[tx.userId]?.email || tx.userEmail || '-'}
                      </td>
                      <td>{tx.description || '-'}</td>
                      <td style={{color: tx.amount > 0 ? '#00ff88' : '#ff6b6b', fontWeight: 600}}>
                        {tx.amount > 0 ? '+' : ''}{formatMoney(tx.amount)}
                      </td>
                      <td>
                        {tx.createdAt?.toDate 
                          ? tx.createdAt.toDate().toLocaleString('vi-VN')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="mobile-cards mobile-only">
              {filteredOrders.map(tx => (
                <div key={tx.id} className={`mobile-card ${tx.amount > 0 ? 'status-paid' : 'status-pending'}`}>
                  <div className="mobile-card-header">
                    <span className="license-key-mobile">
                      {tx.type === 'deposit' && '💰 Nạp tiền'}
                      {tx.type === 'license_purchase' && '🔑 Mua license'}
                      {tx.type === 'daily_renewal' && '⚡ Gia hạn ngày'}
                      {tx.type === 'renewal' && '🔄 Gia hạn'}
                      {!['deposit', 'license_purchase', 'daily_renewal', 'renewal'].includes(tx.type) && `📝 ${tx.type}`}
                    </span>
                    <span style={{color: tx.amount > 0 ? '#00ff88' : '#ff6b6b', fontWeight: 700}}>
                      {tx.amount > 0 ? '+' : ''}{formatMoney(tx.amount)}
                    </span>
                  </div>
                  
                  <div className="mobile-card-body">
                    <div className="mobile-card-row">
                      <span className="label">User:</span>
                      <span className="value">{users[tx.userId]?.displayName || users[tx.userId]?.email || tx.userEmail || '-'}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="label">Mô tả:</span>
                      <span className="value">{tx.description || '-'}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="label">Thời gian:</span>
                      <span className="value">
                        {tx.createdAt?.toDate 
                          ? tx.createdAt.toDate().toLocaleString('vi-VN')
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
