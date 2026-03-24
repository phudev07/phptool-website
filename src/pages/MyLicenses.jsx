import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Layout/Navbar';
import './MyLicenses.css';

// Renewal pricing options
const RENEWAL_OPTIONS = {
  'regfb': {
    '1_month': { name: '1 Tháng', price: 200000, days: 30 },
    '1_year': { name: '1 Năm', price: 500000, days: 365 }
  },
  'clonetk': {
    '1_month': { name: '1 Tháng', price: 300000, days: 30 },
    '1_year': { name: '1 Năm', price: 700000, days: 365 }
  },
  'seoyt': {
    '1_month': { name: '1 Tháng', price: 400000, days: 30 },
    '1_year': { name: '1 Năm', price: 900000, days: 365 }
  }
};

export default function MyLicenses() {
  const { currentUser, userProfile } = useAuth();
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [hwidInput, setHwidInput] = useState({});  // { licenseId: 'hwid value' }
  const [savingHwid, setSavingHwid] = useState(null);  // licenseId being saved
  const [toast, setToast] = useState(null);  // { type: 'success'|'error', message: string }
  const [renewModal, setRenewModal] = useState(null);  // license to renew
  const [renewPlan, setRenewPlan] = useState('1_month');
  const [renewLoading, setRenewLoading] = useState(false);

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    async function fetchLicenses() {
      if (!currentUser) return;

      try {
        // Simple query without orderBy to avoid index requirement
        const q = query(
          collection(db, 'licenses'),
          where('userId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(q);
        let licensesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Normalize: use licenseKey or key
          licenseKey: doc.data().licenseKey || doc.data().key
        }));
        
        // Sort client-side by createdAt desc
        licensesData.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
        
        console.log('MyLicenses fetched:', licensesData);
        setLicenses(licensesData);
      } catch (error) {
        console.error('Error fetching licenses:', error);
        alert('Lỗi tải licenses: ' + error.message);
      }

      setLoading(false);
    }

    fetchLicenses();
  }, [currentUser]);

  function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
  }

  function getLicenseStatus(license) {
    if (license.status === 'revoked') return { text: 'Đã thu hồi', class: 'status-revoked' };
    if (license.plan === 'lifetime') return { text: 'Vĩnh viễn', class: 'status-lifetime' };

    const now = new Date();
    const expiry = license.expiresAt?.toDate?.() || (license.expiresAt ? new Date(license.expiresAt) : null);

    if (!expiry) {
      // No expiry set - for old daily licenses
      if (license.plan === 'daily') return { text: 'Theo ngày', class: 'status-daily' };
      return { text: 'Đang hoạt động', class: 'status-active' };
    }

    if (now >= expiry) return { text: 'Hết hạn', class: 'status-expired' };
    
    const diff = expiry - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (license.plan === 'daily') {
      // Show remaining time for daily
      if (days === 0) return { text: `Còn ${hours}h`, class: 'status-warning' };
      return { text: `Còn ${days}d ${hours}h`, class: 'status-daily' };
    }
    
    if (days <= 3) return { text: `Còn ${days} ngày`, class: 'status-warning' };
    return { text: 'Đang hoạt động', class: 'status-active' };
  }

  function getProductName(productId) {
    const products = {
      'regfb': 'Reg Facebook Tool',
      'clonetk': 'Clone TikTok Tool',
      'seoyt': 'YouTube SEO Tool'
    };
    return products[productId] || productId;
  }

  function getPlanName(plan) {
    const plans = {
      'daily': 'Theo ngày',
      'monthly': '1 tháng',
      'yearly': '1 năm',
      'lifetime': 'Vĩnh viễn'
    };
    return plans[plan] || plan;
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert('Đã copy!');
  }

  // User tự reset HWID (không cần admin duyệt)
  async function resetHwid(licenseId) {
    setSavingHwid(licenseId);
    try {
      // Get current license to save old HWID to history
      const license = licenses.find(l => l.id === licenseId);
      const currentHwid = license?.hwid;
      
      // Update: set hwid to null and add old hwid to history
      const updateData = {
        hwid: null,
        hwidResetRequested: false
      };
      
      // If there was an HWID, add it to history to prevent reuse
      if (currentHwid) {
        const { arrayUnion } = await import('firebase/firestore');
        updateData.hwidHistory = arrayUnion(currentHwid);
      }
      
      await updateDoc(doc(db, 'licenses', licenseId), updateData);
      
      setLicenses(prev => prev.map(l => 
        l.id === licenseId ? { 
          ...l, 
          hwid: null, 
          hwidResetRequested: false,
          hwidHistory: [...(l.hwidHistory || []), currentHwid].filter(Boolean)
        } : l
      ));
      
      setToast({ type: 'success', message: 'Đã reset HWID. Bạn có thể gán máy mới.' });
    } catch (error) {
      console.error('Error resetting HWID:', error);
      setToast({ type: 'error', message: 'Lỗi reset HWID: ' + error.message });
    }
    setSavingHwid(null);
  }

  // User tự gán HWID vào license
  async function saveHwid(licenseId) {
    const hwid = hwidInput[licenseId]?.trim();
    if (!hwid || hwid.length < 20) {
      setToast({ type: 'error', message: 'HWID không hợp lệ! Vui lòng nhập đúng HWID từ tool.' });
      return;
    }

    setSavingHwid(licenseId);
    
    try {
      // IMPORTANT: Check if HWID is already used by another license
      const existingQuery = query(
        collection(db, 'licenses'),
        where('hwid', '==', hwid)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      // Check if any existing license with this HWID belongs to different user
      const existingLicense = existingSnapshot.docs.find(doc => doc.id !== licenseId);
      
      if (existingLicense) {
        const existingData = existingLicense.data();
        setToast({ 
          type: 'error', 
          message: `HWID này đã được đăng ký bởi tài khoản khác (${existingData.userEmail || 'unknown'})! Mỗi HWID chỉ có thể kích hoạt 1 license.`
        });
        setSavingHwid(null);
        return;
      }
      
      // SECURITY: Check if HWID was previously used and reset by ANOTHER USER
      const allLicenses = await getDocs(collection(db, 'licenses'));
      for (const licDoc of allLicenses.docs) {
        const licData = licDoc.data();
        const hwidHistory = licData.hwidHistory || [];
        
        // If this HWID is in history of a license belonging to DIFFERENT user, block it
        // Allow same user to reuse their own HWID
        if (hwidHistory.includes(hwid) && licDoc.id !== licenseId && licData.userId !== currentUser.uid) {
          setToast({ 
            type: 'error', 
            message: 'HWID này đã từng được sử dụng bởi tài khoản khác! Không thể gán.'
          });
          setSavingHwid(null);
          return;
        }
      }
      
      await updateDoc(doc(db, 'licenses', licenseId), {
        hwid: hwid,
        status: 'active',
        activatedAt: new Date()
      });
      
      setLicenses(prev => prev.map(l => 
        l.id === licenseId ? { ...l, hwid: hwid, status: 'active' } : l
      ));
      
      setHwidInput(prev => ({ ...prev, [licenseId]: '' }));
      setToast({ type: 'success', message: 'Kích hoạt license thành công! Vui lòng khởi động lại tool để sử dụng.' });
    } catch (error) {
      console.error('Error saving HWID:', error);
      setToast({ type: 'error', message: 'Lỗi kích hoạt: ' + error.message });
    }
    
    setSavingHwid(null);
  }

  // Gia hạn gói ngày (10k/ngày) - cộng thêm 1 ngày
  async function renewDaily(licenseId) {
    if (!currentUser) return;
    
    setSavingHwid(licenseId);
    
    try {
      const renewLicenseFunc = httpsCallable(functions, 'renewLicense');
      const response = await renewLicenseFunc({
        licenseId,
        renewType: 'daily'
      });
      
      const responseData = response.data.data || response.data;
      const newExpiryDate = new Date(responseData.newExpiryDate);
      
      setLicenses(prev => prev.map(l => 
        l.id === licenseId ? { ...l, expiresAt: newExpiryDate, status: 'active' } : l
      ));
      
      const expiryStr = newExpiryDate.toLocaleDateString('vi-VN');
      setToast({ type: 'success', message: `Gia hạn thành công! Hết hạn: ${expiryStr}` });
    } catch (error) {
      console.error('Error renewing daily:', error);
      setToast({ type: 'error', message: error.message || 'Lỗi hệ thống khi gia hạn.' });
    }
    
    setSavingHwid(null);
  }

  // Gia hạn license
  async function renewLicense() {
    if (!renewModal || !currentUser) return;
    
    if (!renewPlan) {
      setToast({ type: 'error', message: 'Vui lòng chọn gói gia hạn!' });
      return;
    }
    
    setRenewLoading(true);
    
    try {
      const renewLicenseFunc = httpsCallable(functions, 'renewLicense');
      const response = await renewLicenseFunc({
        licenseId: renewModal.id,
        renewType: 'standard',
        planKey: renewPlan
      });
      
      const responseData = response.data.data || response.data;
      const newExpiryDate = new Date(responseData.newExpiryDate);

      setLicenses(prev => prev.map(l => 
        l.id === renewModal.id 
          ? { ...l, expiresAt: newExpiryDate, status: 'active' } 
          : l
      ));
      
      setToast({ 
        type: 'success', 
        message: `Gia hạn thành công! License mới hết hạn: ${newExpiryDate.toLocaleDateString('vi-VN')}` 
      });
      setRenewModal(null);
      
    } catch (error) {
      console.error('Error renewing license:', error);
      setToast({ type: 'error', message: error.message || 'Lỗi hệ thống khi gia hạn.' });
    }
    
    setRenewLoading(false);
  }

  return (
    <div className="licenses-page">
      <Navbar />

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{toast.type === 'success' ? '✅' : '❌'}</span>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      <div className="licenses-container">
        <div className="page-header">
          <Link to="/dashboard" className="back-link">← Quay lại</Link>
          <h1>🔑 License của tôi</h1>
        </div>

        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : licenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h2>Chưa có license nào</h2>
            <p>Mua license để bắt đầu sử dụng các công cụ của chúng tôi!</p>
            <Link to="/buy" className="btn-buy">🛒 Mua license ngay</Link>
          </div>
        ) : (
          <>
            <div className="licenses-grid">
            {licenses.map(license => {
              const status = getLicenseStatus(license);
              return (
                <div key={license.id} className="license-card">
                  <div className="license-header">
                    <h3>{getProductName(license.productId)}</h3>
                    <span className={`license-status ${status.class}`}>{status.text}</span>
                  </div>
                  
                  <div className="license-body">
                    <div className="license-key-section">
                      <label>License Key:</label>
                      <div className="key-display">
                        <code>{license.licenseKey}</code>
                        <button 
                          className="btn-copy"
                          onClick={() => copyToClipboard(license.licenseKey)}
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    <div className="license-details">
                      <div className="detail-row">
                        <span className="label">Gói:</span>
                        <span className="value">{getPlanName(license.plan)}</span>
                      </div>
                      {license.expiresAt && license.plan !== 'daily' && (
                        <div className="detail-row">
                          <span className="label">Hết hạn:</span>
                          <span className="value">
                            {license.expiresAt?.toDate?.().toLocaleDateString('vi-VN') || 'N/A'}
                          </span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span className="label">HWID:</span>
                        {license.hwid ? (
                          <span className="value hwid" title={license.hwid}>
                            {license.hwid.substring(0, 20)}...
                          </span>
                        ) : (
                          <span className="value hwid-pending">Chưa kích hoạt</span>
                        )}
                      </div>
                    </div>

                    {/* Nếu chưa có HWID → Hiện form nhập HWID */}
                    {!license.hwid && license.status !== 'revoked' && (
                      <div className="hwid-activation-section">
                        <p className="hwid-instruction">
                          📌 Mở tool → Copy HWID → Paste vào đây để kích hoạt:
                        </p>
                        <div className="hwid-input-group">
                          <input
                            type="text"
                            placeholder="Paste HWID từ tool vào đây..."
                            value={hwidInput[license.id] || ''}
                            onChange={(e) => setHwidInput(prev => ({
                              ...prev,
                              [license.id]: e.target.value
                            }))}
                            className="hwid-input"
                          />
                          <button
                            className="btn-activate"
                            onClick={() => saveHwid(license.id)}
                            disabled={savingHwid === license.id}
                          >
                            {savingHwid === license.id ? '⏳' : '✓'} Kích hoạt
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Nếu đã có HWID → Hiện nút reset */}
                    {license.hwid && license.status === 'active' && (
                      <button 
                        className="btn-reset-hwid"
                        onClick={() => resetHwid(license.id)}
                        disabled={savingHwid === license.id}
                      >
                        {savingHwid === license.id ? '⏳' : '🔄'} Đổi máy
                      </button>
                    )}

                    {/* Renewal button for monthly/yearly plans */}
                    {license.plan !== 'lifetime' && license.plan !== 'daily' && license.status !== 'revoked' && (
                      <button 
                        className="btn-renew"
                        onClick={() => { setRenewModal(license); setRenewPlan('1_month'); }}
                      >
                        ⏰ Gia hạn
                      </button>
                    )}

                    {/* Daily renewal button - 10k per day */}
                    {license.plan === 'daily' && license.hwid && license.status !== 'revoked' && (
                      <button 
                        className="btn-renew btn-daily"
                        onClick={() => renewDaily(license.id)}
                        disabled={savingHwid === license.id}
                      >
                        {savingHwid === license.id ? '⏳' : '⚡'} Gia hạn ngày (10.000đ)
                      </button>
                    )}
                  </div>

                  <div className="license-footer">
                    <span className="created-date">
                      Mua ngày: {license.createdAt?.toDate?.().toLocaleDateString('vi-VN') || 'N/A'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      {/* Renewal Modal */}
      {renewModal && (
        <div className="modal-overlay" onClick={() => setRenewModal(null)}>
          <div className="renew-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⏰ Gia hạn License</h2>
              <button className="modal-close" onClick={() => setRenewModal(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="renew-info">
                <p><strong>Sản phẩm:</strong> {getProductName(renewModal.productId)}</p>
                <p><strong>License:</strong> {renewModal.licenseKey}</p>
                <p><strong>Hết hạn:</strong> {renewModal.expiresAt?.toDate?.().toLocaleDateString('vi-VN') || 'N/A'}</p>
              </div>
              
              <div className="renew-options">
                <h3>Chọn gói gia hạn:</h3>
                {RENEWAL_OPTIONS[renewModal.productId] && Object.entries(RENEWAL_OPTIONS[renewModal.productId]).map(([key, option]) => (
                  <label 
                    key={key} 
                    className={`renew-option ${renewPlan === key ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="renewPlan"
                      value={key}
                      checked={renewPlan === key}
                      onChange={() => setRenewPlan(key)}
                    />
                    <span className="option-name">{option.name}</span>
                    <span className="option-price">{formatMoney(option.price)}đ</span>
                  </label>
                ))}
              </div>
              
              <div className="renew-balance">
                <span>Số dư hiện tại:</span>
                <span className="balance-amount">{formatMoney(userProfile?.balance || 0)}đ</span>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => setRenewModal(null)}
              >
                Hủy
              </button>
              <button 
                className="btn-confirm"
                onClick={renewLicense}
                disabled={renewLoading}
              >
                {renewLoading ? '⏳ Đang xử lý...' : '✓ Xác nhận gia hạn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
