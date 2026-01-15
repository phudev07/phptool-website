import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, orderBy, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/Layout/Navbar';
import './Admin.css';

export default function AdminDeposits() {
  const { isAdmin } = useAuth();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchDeposits();
  }, []);

  async function fetchDeposits() {
    setLoading(true);
    try {
      // Fetch all deposits and filter client-side to avoid index issues
      const q = query(collection(db, 'deposits'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const depositsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Fetched deposits:', depositsData);
      setDeposits(depositsData);
    } catch (error) {
      console.error('Error fetching deposits:', error);
    }
    setLoading(false);
  }

  // Filter client-side instead of Firestore to avoid index issues
  function getFilteredDeposits() {
    if (filter === 'all') return deposits;
    return deposits.filter(d => d.status === filter);
  }

  async function handleConfirmDeposit(deposit) {
    console.log('Confirm clicked for deposit:', deposit);
    
    setProcessing(deposit.id);

    try {
      console.log('Updating deposit:', deposit.id);
      
      // Update deposit status
      await updateDoc(doc(db, 'deposits', deposit.id), {
        status: 'completed',
        completedAt: serverTimestamp()
      });
      console.log('Deposit updated');

      // Add balance to user
      console.log('Updating user balance:', deposit.userId);
      await updateDoc(doc(db, 'users', deposit.userId), {
        balance: increment(deposit.amount)
      });
      console.log('User balance updated');

      // Create transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: deposit.userId,
        type: 'deposit',
        amount: deposit.amount,
        description: `Nạp tiền - Mã GD: ${deposit.orderId}`,
        createdAt: serverTimestamp()
      });
      console.log('Transaction created');

      fetchDeposits();
    } catch (error) {
      console.error('Error confirming deposit:', error);
    }

    setProcessing(null);
  }

  async function handleRejectDeposit(deposit) {
    console.log('Reject clicked for deposit:', deposit);
    
    setProcessing(deposit.id);

    try {
      await updateDoc(doc(db, 'deposits', deposit.id), {
        status: 'rejected',
        rejectedAt: serverTimestamp()
      });

      fetchDeposits();
    } catch (error) {
      console.error('Error rejecting deposit:', error);
    }

    setProcessing(null);
  }

  function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
  }

  if (!isAdmin()) {
    return (
      <div className="admin-page">
        <Navbar />
        <div className="admin-container">
          <div className="access-denied">
            <h1>⛔ Không có quyền truy cập</h1>
            <p>Bạn cần quyền Admin để xem trang này.</p>
            <Link to="/dashboard">Về Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredDeposits = getFilteredDeposits();

  return (
    <div className="admin-page">
      <Navbar />

      <div className="admin-container">
        <div className="admin-header">
          <h1>💰 Quản lý nạp tiền</h1>
          <button className="btn-refresh" onClick={fetchDeposits}>🔄 Làm mới</button>
        </div>

        <div className="filter-tabs">
          <button 
            className={`tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tất cả ({deposits.length})
          </button>
          <button 
            className={`tab ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Chờ xử lý ({deposits.filter(d => d.status === 'pending').length})
          </button>
          <button 
            className={`tab ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Đã nạp ({deposits.filter(d => d.status === 'completed').length})
          </button>
        </div>

        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : filteredDeposits.length === 0 ? (
          <div className="empty">Không có yêu cầu nạp tiền nào</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="table-container desktop-only">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Mã GD</th>
                    <th>Email</th>
                    <th>Số tiền</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeposits.map(deposit => (
                    <tr key={deposit.id}>
                      <td className="order-id">{deposit.orderId}</td>
                      <td>{deposit.userEmail}</td>
                      <td className="amount">{formatMoney(deposit.amount)}đ</td>
                      <td className="date">
                        {deposit.createdAt?.toDate?.().toLocaleString('vi-VN') || 'N/A'}
                      </td>
                      <td>
                        <span className={`status-badge status-${deposit.status}`}>
                          {deposit.status === 'pending' && '⏳ Chờ xử lý'}
                          {deposit.status === 'completed' && '✅ Đã nạp'}
                          {deposit.status === 'rejected' && '❌ Từ chối'}
                        </span>
                      </td>
                      <td className="actions">
                        {deposit.status === 'pending' && (
                          <>
                            <button 
                              className="btn-confirm"
                              onClick={() => handleConfirmDeposit(deposit)}
                              disabled={processing === deposit.id}
                            >
                              {processing === deposit.id ? '...' : '✓ Xác nhận'}
                            </button>
                            <button 
                              className="btn-reject"
                              onClick={() => handleRejectDeposit(deposit)}
                              disabled={processing === deposit.id}
                            >
                              ✕ Từ chối
                            </button>
                          </>
                        )}
                        {deposit.status !== 'pending' && (
                          <span className="processed">Đã xử lý</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="mobile-cards mobile-only">
              {filteredDeposits.map(deposit => (
                <div key={deposit.id} className={`mobile-card status-${deposit.status}`}>
                  <div className="mobile-card-header">
                    <span className="mobile-card-id">{deposit.orderId}</span>
                    <span className={`status-badge status-${deposit.status}`}>
                      {deposit.status === 'pending' && '⏳ Chờ'}
                      {deposit.status === 'completed' && '✅ Done'}
                      {deposit.status === 'rejected' && '❌ Reject'}
                    </span>
                  </div>
                  
                  <div className="mobile-card-body">
                    <div className="mobile-card-row">
                      <span className="label">Email:</span>
                      <span className="value">{deposit.userEmail}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="label">Số tiền:</span>
                      <span className="value amount">{formatMoney(deposit.amount)}đ</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="label">Thời gian:</span>
                      <span className="value">{deposit.createdAt?.toDate?.().toLocaleString('vi-VN') || 'N/A'}</span>
                    </div>
                  </div>

                  {deposit.status === 'pending' && (
                    <div className="mobile-card-actions">
                      <button 
                        className="btn-confirm-mobile"
                        onClick={() => handleConfirmDeposit(deposit)}
                        disabled={processing === deposit.id}
                      >
                        {processing === deposit.id ? '⏳' : '✓'} XÁC NHẬN
                      </button>
                      <button 
                        className="btn-reject-mobile"
                        onClick={() => handleRejectDeposit(deposit)}
                        disabled={processing === deposit.id}
                      >
                        ✕ TỪ CHỐI
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
