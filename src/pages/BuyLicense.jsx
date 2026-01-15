import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useAntiSpam } from '../hooks/useAntiSpam';
import Navbar from '../components/Layout/Navbar';
import { Check, Download, BookOpen, Shield, Zap, RefreshCw, Headphones, ArrowLeft, CreditCard } from 'lucide-react';
import './BuyLicense.css';

// Product details with full information
const PRODUCTS = {
  'regfb': {
    name: 'Tool Auto Reg/Very FB LD và Phone',
    tagline: '⭐ Best Seller',
    image: '/tool-screenshot.png',
    description: 'Tool tự động đăng ký và xác minh tài khoản Facebook hàng loạt với tỷ lệ thành công cao nhất thị trường. Hỗ trợ chạy trên LDPlayer và điện thoại thật.',
    features: [
      'Đăng ký tài khoản Facebook tự động',
      'Xác minh qua Hotmail, Gmail, SMS',
      'Hỗ trợ chạy trên LDPlayer (LD) và điện thoại',
      'Bind HWID bảo mật cao',
      'Cập nhật liên tục theo chính sách Facebook',
      'Hỗ trợ kỹ thuật 24/7'
    ],
    highlights: [
      { icon: Zap, title: 'Tốc độ cao', desc: 'Reg hàng trăm acc/ngày' },
      { icon: Shield, title: 'Bảo mật HWID', desc: 'Chống share key' },
      { icon: RefreshCw, title: 'Update liên tục', desc: 'Luôn ổn định' },
      { icon: Headphones, title: 'Hỗ trợ 24/7', desc: 'Support nhiệt tình' }
    ],
    plans: {
      'daily': { name: 'Theo ngày', price: 10000, days: 0, description: 'Trừ 10k/ngày khi sử dụng' },
      'monthly': { name: '1 Tháng', price: 200000, days: 30, popular: true },
      'yearly': { name: '1 Năm', price: 500000, days: 365, save: '58%' },
      'lifetime': { name: 'Vĩnh viễn', price: 600000, days: -1, best: true }
    }
  },
  'clonetk': {
    name: 'Clone TikTok Tool',
    tagline: '🔜 Sắp ra mắt',
    image: null,
    description: 'Công cụ clone video TikTok không watermark, quản lý nhiều tài khoản cùng lúc.',
    features: ['Clone video không logo', 'Multi accounts', 'Auto upload'],
    highlights: [],
    comingSoon: true,
    plans: {}
  },
  'seoyt': {
    name: 'YouTube SEO Tool',
    tagline: '🔜 Sắp ra mắt',
    image: null,
    description: 'Tối ưu SEO video YouTube, nghiên cứu từ khóa và tăng view.',
    features: ['Keyword research', 'Tag optimizer', 'Analytics'],
    highlights: [],
    comingSoon: true,
    plans: {}
  }
};

export default function BuyLicense() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const { productId } = useParams();
  
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(null);
  const [softwareInfo, setSoftwareInfo] = useState(null);
  const [showChangelog, setShowChangelog] = useState(false);

  const product = PRODUCTS[productId] || PRODUCTS['regfb'];
  const plan = product?.plans?.[selectedPlan];
  const balance = userProfile?.balance || 0;
  
  const { validateSubmission, recordAttempt } = useAntiSpam({
    maxAttempts: 3,
    windowMs: 3600000,
    cooldownMs: 3600000
  });

  useEffect(() => {
    async function fetchSoftwareInfo() {
      try {
        const docRef = doc(db, 'settings', 'software');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSoftwareInfo(docSnap.data());
        }
      } catch (error) {
        console.error('Error fetching software info:', error);
      }
    }
    fetchSoftwareInfo();
  }, []);

  function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
  }

  function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (i < 3) key += '-';
    }
    return key;
  }

  function getExpiryDate(days) {
    if (days <= 0) return null;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  async function handlePurchase() {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (product.comingSoon) {
      alert('Sản phẩm này sắp ra mắt!');
      return;
    }

    if (balance < plan.price) {
      alert('Số dư không đủ! Vui lòng nạp thêm tiền.');
      navigate('/wallet');
      return;
    }
    
    const spamCheck = validateSubmission();
    if (!spamCheck.valid) {
      alert(spamCheck.error);
      return;
    }
    recordAttempt();

    setLoading(true);

    try {
      const licenseKey = generateLicenseKey();
      
      let expiryDate;
      if (selectedPlan === 'daily') {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 1);
        expiryDate.setHours(23, 59, 59, 999);
      } else {
        expiryDate = getExpiryDate(plan.days);
      }

      await addDoc(collection(db, 'licenses'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        productId: productId || 'regfb',
        licenseKey: licenseKey,
        plan: selectedPlan,
        planName: plan.name,
        price: plan.price,
        status: 'active',
        hwid: null,
        expiresAt: expiryDate,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'users', currentUser.uid), {
        balance: increment(-plan.price)
      });

      await addDoc(collection(db, 'transactions'), {
        userId: currentUser.uid,
        type: 'license_purchase',
        amount: -plan.price,
        productId: productId || 'regfb',
        description: `Mua ${product.name} - ${plan.name}`,
        createdAt: serverTimestamp()
      });

      setPurchaseSuccess({
        product: product.name,
        plan: plan.name,
        licenseKey: licenseKey,
        expiresAt: expiryDate
      });

      setShowConfirm(false);

    } catch (error) {
      console.error('Error purchasing license:', error);
      alert('Có lỗi xảy ra. Vui lòng thử lại!');
    }

    setLoading(false);
  }

  function copyLicenseKey() {
    if (purchaseSuccess?.licenseKey) {
      navigator.clipboard.writeText(purchaseSuccess.licenseKey);
      alert('Đã copy license key!');
    }
  }

  // Success screen
  if (purchaseSuccess) {
    return (
      <div className="product-page">
        <Navbar />
        <div className="product-container">
          <div className="success-card">
            <div className="success-icon">✅</div>
            <h1>Mua License Thành Công!</h1>
            <p>Cảm ơn bạn đã mua {purchaseSuccess.product}</p>

            <div className="license-display">
              <label>License Key của bạn:</label>
              <div className="license-key">
                <code>{purchaseSuccess.licenseKey}</code>
                <button onClick={copyLicenseKey} className="btn-copy">📋 Copy</button>
              </div>
            </div>

            <div className="purchase-info">
              <div className="info-row">
                <span>Sản phẩm:</span>
                <span>{purchaseSuccess.product}</span>
              </div>
              <div className="info-row">
                <span>Gói:</span>
                <span>{purchaseSuccess.plan}</span>
              </div>
              {purchaseSuccess.expiresAt && (
                <div className="info-row">
                  <span>Hết hạn:</span>
                  <span>{purchaseSuccess.expiresAt.toLocaleDateString('vi-VN')}</span>
                </div>
              )}
            </div>

            <div className="success-actions">
              <Link to="/my-licenses" className="btn-primary">
                Quản lý License
              </Link>
              <Link to="/dashboard" className="btn-secondary">
                Về Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Coming soon
  if (product.comingSoon) {
    return (
      <div className="product-page">
        <Navbar />
        <div className="product-container">
          <Link to="/dashboard" className="back-btn">
            <ArrowLeft size={20} /> Quay lại
          </Link>
          <div className="coming-soon-card">
            <h1>{product.name}</h1>
            <p>{product.tagline}</p>
            <p className="coming-desc">{product.description}</p>
            <button className="btn-notify" disabled>🔔 Thông báo khi ra mắt</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-page">
      <Navbar />

      <div className="product-container">
        <Link to="/dashboard" className="back-btn">
          <ArrowLeft size={20} /> Quay lại
        </Link>

        {/* Product Hero */}
        <div className="product-hero">
          <div className="product-hero-image">
            {product.image ? (
              <img src={product.image} alt={product.name} />
            ) : (
              <div className="placeholder-image">
                <Download size={64} />
              </div>
            )}
          </div>
          <div className="product-hero-info">
            <span className="product-tagline">{product.tagline}</span>
            <h1>{product.name}</h1>
            <p className="product-desc">{product.description}</p>
            
            {/* Version Display */}
            {softwareInfo?.version && (
              <div className="version-wrapper">
                <button 
                  className="product-version" 
                  onClick={() => setShowChangelog(!showChangelog)}
                >
                  <span>📦 Version: <strong>{softwareInfo.version}</strong></span>
                  <span className={`version-arrow ${showChangelog ? 'open' : ''}`}>▼</span>
                </button>
                {showChangelog && softwareInfo.changelog && (
                  <div className="changelog-panel">
                    <h4>📋 Changelog</h4>
                    <pre>{softwareInfo.changelog}</pre>
                  </div>
                )}
              </div>
            )}
            
            {/* Quick Actions for owners */}
            <div className="product-quick-actions">
              {softwareInfo?.downloadUrl && (
                <a href={softwareInfo.downloadUrl} target="_blank" rel="noopener noreferrer" className="action-link">
                  <Download size={18} /> Tải phần mềm
                </a>
              )}
              <Link to={`/guide/${productId || 'regfb'}`} className="action-link">
                <BookOpen size={18} /> Hướng dẫn sử dụng
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="product-section">
          <h2>Tính năng chính</h2>
          <ul className="feature-list">
            {product.features.map((feature, idx) => (
              <li key={idx}>
                <Check size={18} className="check-icon" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Highlights */}
        {product.highlights?.length > 0 && (
          <div className="product-section">
            <h2>Tại sao chọn tool này?</h2>
            <div className="highlights-grid">
              {product.highlights.map((h, idx) => (
                <div key={idx} className="highlight-card">
                  <h.icon size={28} className="highlight-icon" />
                  <h4>{h.title}</h4>
                  <p>{h.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="product-section pricing">
          <h2>Chọn gói License</h2>
          <p className="section-subtitle">Số dư hiện tại: <strong>{formatMoney(balance)}đ</strong></p>
          
          <div className="pricing-grid">
            {Object.entries(product.plans).map(([key, planItem]) => (
              <div 
                key={key}
                className={`pricing-card ${selectedPlan === key ? 'selected' : ''} ${planItem.popular ? 'popular' : ''} ${planItem.best ? 'best' : ''}`}
                onClick={() => setSelectedPlan(key)}
              >
                {planItem.popular && <div className="badge popular-badge">Phổ biến</div>}
                {planItem.best && <div className="badge best-badge">Tốt nhất</div>}
                {planItem.save && <div className="badge save-badge">Tiết kiệm {planItem.save}</div>}
                
                <h3>{planItem.name}</h3>
                <div className="pricing-amount">
                  <span className="price">{formatMoney(planItem.price)}</span>
                  <span className="currency">đ</span>
                </div>
                {planItem.description && <p className="pricing-desc">{planItem.description}</p>}
                
                <ul className="pricing-features">
                  <li><Check size={14} /> Toàn bộ tính năng</li>
                  <li><Check size={14} /> Hỗ trợ 24/7</li>
                  <li><Check size={14} /> Cập nhật miễn phí</li>
                  {key === 'lifetime' && <li><Check size={14} /> Không giới hạn thời gian</li>}
                </ul>

                <div className="pricing-select">
                  {selectedPlan === key ? '✓ Đã chọn' : 'Chọn gói này'}
                </div>
              </div>
            ))}
          </div>

          {/* Checkout */}
          <div className="checkout-bar">
            <div className="checkout-info">
              <span>Tổng thanh toán:</span>
              <span className="checkout-total">{formatMoney(plan?.price || 0)}đ</span>
            </div>
            <button 
              className="btn-checkout"
              onClick={() => setShowConfirm(true)}
              disabled={loading || balance < (plan?.price || 0)}
            >
              {balance < (plan?.price || 0) ? (
                <>Nạp thêm tiền</>
              ) : (
                <><CreditCard size={20} /> Mua ngay</>
              )}
            </button>
          </div>

          {balance < (plan?.price || 0) && (
            <div className="insufficient-notice">
              ⚠️ Số dư không đủ. <Link to="/wallet">Nạp thêm {formatMoney((plan?.price || 0) - balance)}đ</Link>
            </div>
          )}
        </div>

        {/* Confirm Modal */}
        {showConfirm && (
          <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>Xác nhận mua hàng</h2>
              <div className="confirm-details">
                <p><strong>Sản phẩm:</strong> {product.name}</p>
                <p><strong>Gói:</strong> {plan.name}</p>
                <p><strong>Giá:</strong> {formatMoney(plan.price)}đ</p>
                <p><strong>Số dư sau khi mua:</strong> {formatMoney(balance - plan.price)}đ</p>
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowConfirm(false)}>
                  Hủy
                </button>
                <button className="btn-confirm" onClick={handlePurchase} disabled={loading}>
                  {loading ? 'Đang xử lý...' : 'Xác nhận mua'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
