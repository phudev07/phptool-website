import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Layout/Navbar';
import './Profile.css';

export default function Profile() {
  const { currentUser, userProfile } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    async function fetchTransactions() {
      if (!currentUser) return;

      try {
        // Simple query without orderBy to avoid index requirement
        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(q);
        let transactionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort client-side by createdAt desc
        transactionsData.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
        
        console.log('Transactions fetched:', transactionsData);
        setTransactions(transactionsData);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        alert('Lỗi tải giao dịch: ' + error.message);
      }

      setLoading(false);
    }

    fetchTransactions();
  }, [currentUser]);

  function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
  }

  function getFilteredTransactions() {
    if (activeTab === 'all') return transactions;
    return transactions.filter(tx => tx.type === activeTab);
  }

  function getTransactionIcon(type) {
    switch (type) {
      case 'deposit': return '💰';
      case 'license_purchase': return '🛒';
      case 'daily_deduct': return '📅';
      default: return '💳';
    }
  }

  function getTransactionLabel(type) {
    switch (type) {
      case 'deposit': return 'Nạp tiền';
      case 'license_purchase': return 'Mua license';
      case 'daily_deduct': return 'Trừ ngày';
      default: return type;
    }
  }

  const balance = userProfile?.balance || 0;
  const filteredTransactions = getFilteredTransactions();

  return (
    <div className="profile-page">
      <Navbar />

      <div className="profile-container">
        <div className="page-header">
          <Link to="/dashboard" className="back-link">← Quay lại</Link>
          <h1>👤 Thông tin tài khoản</h1>
        </div>

        {/* User Info Card */}
        <div className="user-info-card">
          <div className="avatar">
            <span>{userProfile?.displayName?.[0]?.toUpperCase() || '?'}</span>
          </div>
          <div className="user-details">
            <h2>{userProfile?.displayName || 'User'}</h2>
            <p className="email">{currentUser?.email}</p>
            <p className="member-since">
              Thành viên từ: {userProfile?.createdAt?.toDate?.().toLocaleDateString('vi-VN') || 'N/A'}
            </p>
          </div>
          <div className="balance-section">
            <div className="balance-label">Số dư</div>
            <div className="balance-amount">{formatMoney(balance)}đ</div>
            <Link to="/wallet" className="btn-deposit">Nạp tiền</Link>
          </div>
        </div>

        {/* Transaction History */}
        <div className="transactions-section">
          <h2>📜 Lịch sử giao dịch</h2>

          {/* Tabs */}
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Tất cả
            </button>
            <button 
              className={`tab ${activeTab === 'deposit' ? 'active' : ''}`}
              onClick={() => setActiveTab('deposit')}
            >
              Nạp tiền
            </button>
            <button 
              className={`tab ${activeTab === 'license_purchase' ? 'active' : ''}`}
              onClick={() => setActiveTab('license_purchase')}
            >
              Mua license
            </button>
            <button 
              className={`tab ${activeTab === 'daily_deduct' ? 'active' : ''}`}
              onClick={() => setActiveTab('daily_deduct')}
            >
              Trừ ngày
            </button>
          </div>

          {/* Transactions List */}
          {loading ? (
            <div className="loading">Đang tải...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="empty-text">Chưa có giao dịch nào</div>
          ) : (
            <div className="transactions-list">
              {filteredTransactions.map(tx => (
                <div key={tx.id} className="transaction-item">
                  <div className="tx-icon">{getTransactionIcon(tx.type)}</div>
                  <div className="tx-info">
                    <div className="tx-type">{getTransactionLabel(tx.type)}</div>
                    <div className="tx-desc">{tx.description}</div>
                    <div className="tx-date">
                      {tx.createdAt?.toDate?.().toLocaleString('vi-VN') || 'N/A'}
                    </div>
                  </div>
                  <div className={`tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                    {tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount)}đ
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
