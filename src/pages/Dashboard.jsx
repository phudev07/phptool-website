import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Layout/Navbar';
import { Wallet, Key, ShoppingCart, Clock, Package, TrendingUp, ArrowRight } from 'lucide-react';
import './Dashboard.css';

// Products configuration matching landing page
const PRODUCTS = [
  { 
    id: 'regfb', 
    name: 'Tool Auto Reg/Very FB LD và Phone', 
    tagline: '⭐ Best Seller',
    image: '/tool-screenshot.png',
    status: 'available'
  },
  { 
    id: 'clonetk', 
    name: 'Clone TikTok Tool', 
    tagline: '🔜 Sắp ra mắt',
    image: null,
    status: 'coming_soon'
  },
  { 
    id: 'seoyt', 
    name: 'YouTube SEO Tool', 
    tagline: '🔜 Sắp ra mắt',
    image: null,
    status: 'coming_soon'
  }
];

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();
  const [licenses, setLicenses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!currentUser) return;

      try {
        // Fetch licenses
        const licensesQuery = query(
          collection(db, 'licenses'),
          where('userId', '==', currentUser.uid)
        );
        const licensesSnapshot = await getDocs(licensesQuery);
        let licensesData = licensesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        licensesData.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
        setLicenses(licensesData);

        // Fetch transactions
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', currentUser.uid)
        );
        const transactionsSnapshot = await getDocs(transactionsQuery);
        let transactionsData = transactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        transactionsData.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
        transactionsData = transactionsData.slice(0, 5);
        setTransactions(transactionsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }

      setLoading(false);
    }

    fetchData();
  }, [currentUser]);

  function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
  }

  function getProductLicense(productId) {
    return licenses.find(l => l.productId === productId && l.status === 'active');
  }

  const balance = userProfile?.balance || 0;
  const activeLicenses = licenses.filter(l => l.status === 'active').length;

  return (
    <div className="dashboard-page">
      <Navbar />

      <div className="dashboard-container">
        {/* Welcome Header */}
        <div className="dashboard-header">
          <div className="header-greeting">
            <h1>Xin chào, {userProfile?.displayName || 'User'}! 👋</h1>
            <p>Quản lý license và tài khoản của bạn</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="overview-grid">
          <div className="overview-card balance">
            <div className="overview-icon">
              <Wallet size={24} />
            </div>
            <div className="overview-content">
              <span className="overview-label">Số dư</span>
              <span className="overview-value">{formatMoney(balance)}đ</span>
            </div>
            <Link to="/wallet" className="overview-action">
              Nạp tiền <ArrowRight size={16} />
            </Link>
          </div>

          <div className="overview-card licenses">
            <div className="overview-icon">
              <Key size={24} />
            </div>
            <div className="overview-content">
              <span className="overview-label">License đang hoạt động</span>
              <span className="overview-value">{activeLicenses}</span>
            </div>
            <Link to="/my-licenses" className="overview-action">
              Quản lý <ArrowRight size={16} />
            </Link>
          </div>

          <div className="overview-card transactions">
            <div className="overview-icon">
              <TrendingUp size={24} />
            </div>
            <div className="overview-content">
              <span className="overview-label">Giao dịch gần đây</span>
              <span className="overview-value">{transactions.length}</span>
            </div>
            <Link to="/profile" className="overview-action">
              Xem tất cả <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Products Section - Like Landing Page */}
        <section className="dash-section">
          <div className="section-header">
            <h2><Package size={24} /> Sản phẩm</h2>
            <p>Click vào sản phẩm để xem chi tiết</p>
          </div>

          <div className="products-showcase">
            {PRODUCTS.map(product => {
              const hasLicense = getProductLicense(product.id);
              
              return (
                <Link 
                  key={product.id}
                  to={product.status === 'available' ? `/buy/${product.id}` : '#'}
                  className={`product-showcase-card ${product.status} ${hasLicense ? 'owned' : ''}`}
                  onClick={(e) => product.status !== 'available' && e.preventDefault()}
                >
                  <div className="product-showcase-visual">
                    {product.image ? (
                      <img src={product.image} alt={product.name} />
                    ) : (
                      <div className="product-placeholder">
                        <Package size={48} />
                      </div>
                    )}
                    {hasLicense && (
                      <div className="owned-badge">✓ Đã mua</div>
                    )}
                  </div>
                  <div className="product-showcase-info">
                    <h3>{product.name}</h3>
                    <span className="product-showcase-tagline">{product.tagline}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="dash-section">
          <div className="section-header">
            <h2><Clock size={24} /> Thao tác nhanh</h2>
          </div>
          <div className="quick-actions">
            <Link to="/wallet" className="quick-action-btn">
              <Wallet size={20} />
              <span>Nạp tiền</span>
            </Link>
            <Link to="/my-licenses" className="quick-action-btn">
              <Key size={20} />
              <span>License của tôi</span>
            </Link>
            <Link to="/profile" className="quick-action-btn">
              <TrendingUp size={20} />
              <span>Lịch sử giao dịch</span>
            </Link>
            <Link to="/buy" className="quick-action-btn primary">
              <ShoppingCart size={20} />
              <span>Mua license</span>
            </Link>
          </div>
        </section>

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <section className="dash-section">
            <div className="section-header">
              <h2><TrendingUp size={24} /> Giao dịch gần đây</h2>
              <Link to="/profile" className="see-all">Xem tất cả →</Link>
            </div>
            <div className="transactions-list">
              {transactions.map(tx => (
                <div key={tx.id} className="transaction-row">
                  <div className="tx-type">
                    {tx.type === 'deposit' ? '💰' : tx.type === 'license_purchase' ? '🛒' : '📅'}
                  </div>
                  <div className="tx-details">
                    <span className="tx-desc">{tx.description}</span>
                    <span className="tx-date">
                      {tx.createdAt?.toDate?.().toLocaleDateString('vi-VN') || 'N/A'}
                    </span>
                  </div>
                  <div className={`tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                    {tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount)}đ
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
}
