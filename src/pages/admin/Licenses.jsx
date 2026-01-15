import { useState, useEffect } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
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

export default function AdminLicenses() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [licenses, setLicenses] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newLicense, setNewLicense] = useState({
    plan: '1_month',
    userId: '',
    userEmail: '',
    hwid: ''  // HWID từ tool của user
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Fetch users for mapping
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersMap = {};
      usersSnapshot.docs.forEach(doc => {
        usersMap[doc.id] = doc.data();
      });
      setUsers(usersMap);

      // Fetch licenses
      const q = query(collection(db, 'licenses'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const licensesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLicenses(licensesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  }

  async function handleCreateLicense() {
    try {
      const plan = newLicense.plan;
      
      // Calculate expiry date
      let expiresAt = null;
      if (plan === 'daily') {
        // Daily: expires end of tomorrow
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1);
        expiresAt.setHours(23, 59, 59, 999);
      } else if (plan === '1_month') {
        expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      // Nếu có HWID hoặc userId thì status = active
      const hasHwid = newLicense.hwid && newLicense.hwid.trim() !== '';
      const isActive = hasHwid || newLicense.userId;

      const licenseData = {
        licenseKey: generateKey(),
        productId: 'regfb', // Default product
        plan: plan,
        status: isActive ? 'active' : 'pending',
        userId: newLicense.userId || null,
        hwid: hasHwid ? newLicense.hwid.trim() : null,
        hwidHistory: [],
        createdAt: serverTimestamp(),
        activatedAt: isActive ? serverTimestamp() : null,
        expiresAt: expiresAt
      };

      const docRef = await addDoc(collection(db, 'licenses'), licenseData);
      
      setLicenses([{ id: docRef.id, ...licenseData, createdAt: new Date() }, ...licenses]);
      setShowModal(false);
      setNewLicense({ plan: '1_month', userId: '', userEmail: '', hwid: '' });
    } catch (error) {
      console.error('Error creating license:', error);
    }
  }

  async function handleToggleStatus(licenseId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'revoked' : 'active';
    try {
      await updateDoc(doc(db, 'licenses', licenseId), { status: newStatus });
      setLicenses(licenses.map(l => l.id === licenseId ? { ...l, status: newStatus } : l));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  async function handleResetHWID(licenseId, currentHwid) {
    try {
      const license = licenses.find(l => l.id === licenseId);
      const hwidHistory = license.hwidHistory || [];
      if (currentHwid) {
        hwidHistory.push(currentHwid);
      }
      
      await updateDoc(doc(db, 'licenses', licenseId), { 
        hwid: null,
        hwidHistory: hwidHistory
      });
      setLicenses(licenses.map(l => l.id === licenseId ? { ...l, hwid: null, hwidHistory } : l));
    } catch (error) {
      console.error('Error resetting HWID:', error);
    }
  }

  async function handleDeleteLicense(licenseId) {
    try {
      await deleteDoc(doc(db, 'licenses', licenseId));
      setLicenses(licenses.filter(l => l.id !== licenseId));
    } catch (error) {
      console.error('Error deleting license:', error);
    }
  }

  if (!authLoading && !isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  const filteredLicenses = licenses.filter(license => {
    const key = license.licenseKey || license.key || '';
    return key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      users[license.userId]?.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="admin-page">
      <Navbar />
      
      <div className="admin-container">
        <div className="admin-header">
          <div className="header-content">
            <h1>🔑 Quản lý Licenses</h1>
            <p>Tổng cộng: {licenses.length} licenses</p>
          </div>
          
          <div className="header-actions">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Tìm theo key hoặc email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn-create" onClick={() => setShowModal(true)}>
              ➕ Tạo License
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Đang tải...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="data-table-wrapper desktop-only">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Gói</th>
                    <th>Trạng thái</th>
                    <th>User</th>
                    <th>HWID</th>
                    <th>Hết hạn</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLicenses.map(license => (
                    <tr key={license.id}>
                      <td className="key-cell">
                        <code>{license.licenseKey || license.key}</code>
                        <button 
                          className="btn-copy-small"
                          onClick={() => navigator.clipboard.writeText(license.licenseKey || license.key)}
                        >
                          📋
                        </button>
                      </td>
                      <td>
                        <span className={`plan-badge plan-${license.plan}`}>
                          {license.plan === 'daily' && '⚡ Ngày'}
                          {license.plan === '1_month' && '🌟 1 Tháng'}
                          {license.plan === 'monthly' && '🌟 1 Tháng'}
                          {license.plan === 'yearly' && '💎 1 Năm'}
                          {license.plan === 'lifetime' && '👑 Vĩnh viễn'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${license.status}`}>
                          {license.status === 'active' && '✅ Active'}
                          {license.status === 'pending' && '⏳ Pending'}
                          {license.status === 'expired' && '❌ Expired'}
                          {license.status === 'revoked' && '🚫 Revoked'}
                        </span>
                      </td>
                      <td>
                        {license.userId 
                          ? users[license.userId]?.email || license.userId.substring(0, 8) + '...'
                          : <span className="no-user">Chưa gán</span>}
                      </td>
                      <td>
                        {license.hwid ? (
                          <span className="hwid-value" title={license.hwid}>
                            {license.hwid.substring(0, 10)}...
                          </span>
                        ) : (
                          <span className="no-hwid">-</span>
                        )}
                      </td>
                      <td>
                        {license.plan === 'lifetime' 
                          ? '∞'
                          : license.expiresAt?.toDate 
                            ? license.expiresAt.toDate().toLocaleDateString('vi-VN')
                            : license.expiresAt 
                              ? new Date(license.expiresAt).toLocaleDateString('vi-VN')
                              : '-'}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-action"
                          onClick={() => handleToggleStatus(license.id, license.status)}
                          title={license.status === 'active' ? 'Thu hồi' : 'Kích hoạt'}
                        >
                          {license.status === 'active' ? '🚫' : '✅'}
                        </button>
                        {license.hwid && (
                          <button
                            className="btn-action"
                            onClick={() => handleResetHWID(license.id, license.hwid)}
                            title="Reset HWID"
                          >
                            🔄
                          </button>
                        )}
                        <button
                          className="btn-action btn-delete"
                          onClick={() => handleDeleteLicense(license.id)}
                          title="Xóa"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="mobile-cards mobile-only">
              {filteredLicenses.map(license => (
                <div key={license.id} className={`mobile-card status-${license.status}`}>
                  <div className="mobile-card-header">
                    <code className="license-key-mobile">{license.licenseKey || license.key}</code>
                    <span className={`status-badge status-${license.status}`}>
                      {license.status === 'active' && '✅'}
                      {license.status === 'pending' && '⏳'}
                      {license.status === 'expired' && '❌'}
                      {license.status === 'revoked' && '🚫'}
                    </span>
                  </div>
                  
                  <div className="mobile-card-body">
                    <div className="mobile-card-row">
                      <span className="label">Gói:</span>
                      <span className={`plan-badge plan-${license.plan}`}>
                        {license.plan === 'daily' && '⚡ Ngày'}
                        {license.plan === '1_month' && '🌟 1 Tháng'}
                        {license.plan === 'monthly' && '🌟 1 Tháng'}
                        {license.plan === 'yearly' && '💎 1 Năm'}
                        {license.plan === 'lifetime' && '👑 Vĩnh viễn'}
                      </span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="label">User:</span>
                      <span className="value">
                        {license.userId 
                          ? users[license.userId]?.email || license.userId.substring(0, 12) + '...'
                          : 'Chưa gán'}
                      </span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="label">HWID:</span>
                      <span className="value">{license.hwid ? license.hwid.substring(0, 12) + '...' : '-'}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="label">Hết hạn:</span>
                      <span className="value">
                        {license.plan === 'lifetime' 
                          ? '∞ Vĩnh viễn'
                          : license.expiresAt?.toDate?.().toLocaleDateString('vi-VN') || '-'}
                      </span>
                    </div>
                  </div>

                  <div className="mobile-card-actions">
                    <button 
                      className={license.status === 'active' ? 'btn-reject-mobile' : 'btn-confirm-mobile'}
                      onClick={() => handleToggleStatus(license.id, license.status)}
                    >
                      {license.status === 'active' ? '🚫 THU HỒI' : '✅ KÍCH HOẠT'}
                    </button>
                    {license.hwid && (
                      <button 
                        className="btn-secondary-mobile"
                        onClick={() => handleResetHWID(license.id, license.hwid)}
                      >
                        🔄 RESET
                      </button>
                    )}
                    <button 
                      className="btn-delete-mobile"
                      onClick={() => handleDeleteLicense(license.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create License Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Tạo License Mới</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Gói License</label>
                <select 
                  value={newLicense.plan}
                  onChange={(e) => setNewLicense({...newLicense, plan: e.target.value})}
                >
                  <option value="daily">⚡ Theo ngày - 10,000đ/ngày</option>
                  <option value="1_month">🌟 1 Tháng - 200,000đ</option>
                  <option value="lifetime">👑 Vĩnh viễn - 600,000đ</option>
                </select>
              </div>
              <div className="form-group">
                <label>Gán cho User (tùy chọn)</label>
                <select 
                  value={newLicense.userId}
                  onChange={(e) => setNewLicense({...newLicense, userId: e.target.value})}
                >
                  <option value="">-- Không gán --</option>
                  {Object.entries(users).map(([id, user]) => (
                    <option key={id} value={id}>{user.email}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>HWID máy tính (copy từ tool)</label>
                <input
                  type="text"
                  placeholder="Paste HWID từ tool vào đây..."
                  value={newLicense.hwid}
                  onChange={(e) => setNewLicense({...newLicense, hwid: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem'
                  }}
                />
                <small style={{color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem'}}>
                  User mở tool → Copy HWID → Paste vào đây
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>
                Hủy
              </button>
              <button className="btn-submit" onClick={handleCreateLicense}>
                Tạo License
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
