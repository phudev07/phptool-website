import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Navbar from '../../components/Layout/Navbar';
import './Admin.css';

export default function AdminUsers() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setLoading(false);
  }

  async function handleToggleRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error('Error updating role:', error);
    }
  }

  async function handleDeleteUser(userId) {
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  }

  // Check admin permission
  if (!authLoading && !isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-page">
      <Navbar />
      
      <div className="admin-container">
        <div className="admin-header">
          <div className="header-content">
            <h1>👥 Quản lý Users</h1>
            <p>Tổng cộng: {users.length} users</p>
          </div>
          
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm theo email hoặc tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
                    <th>Email</th>
                    <th>Tên</th>
                    <th>Vai trò</th>
                    <th>Balance</th>
                    <th>Ngày tạo</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td className="email-cell">{user.email}</td>
                      <td>{user.displayName || '-'}</td>
                      <td>
                        <span className={`role-badge role-${user.role}`}>
                          {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                        </span>
                      </td>
                      <td>{user.balance?.toLocaleString('vi-VN') || 0}đ</td>
                      <td>
                        {user.createdAt?.toDate 
                          ? user.createdAt.toDate().toLocaleDateString('vi-VN')
                          : '-'}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-action btn-toggle"
                          onClick={() => handleToggleRole(user.id, user.role)}
                          title={user.role === 'admin' ? 'Hạ xuống User' : 'Nâng lên Admin'}
                        >
                          {user.role === 'admin' ? '⬇️' : '⬆️'}
                        </button>
                        <button
                          className="btn-action btn-delete"
                          onClick={() => handleDeleteUser(user.id)}
                          title="Xóa user"
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
              {filteredUsers.map(user => (
                <div key={user.id} className={`mobile-card role-${user.role}`}>
                  <div className="mobile-card-header">
                    <span className={`role-badge role-${user.role}`}>
                      {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                    </span>
                  </div>
                  
                  <div className="mobile-card-body">
                    <div className="mobile-card-row">
                      <span className="label">Email:</span>
                      <span className="value">{user.email}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="label">Tên:</span>
                      <span className="value">{user.displayName || '-'}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="label">Số dư:</span>
                      <span className="value amount">{user.balance?.toLocaleString('vi-VN') || 0}đ</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="label">Ngày tạo:</span>
                      <span className="value">
                        {user.createdAt?.toDate?.().toLocaleDateString('vi-VN') || '-'}
                      </span>
                    </div>
                  </div>

                  <div className="mobile-card-actions">
                    <button 
                      className={user.role === 'admin' ? 'btn-reject-mobile' : 'btn-confirm-mobile'}
                      onClick={() => handleToggleRole(user.id, user.role)}
                    >
                      {user.role === 'admin' ? '⬇️ HẠ QUYỀN' : '⬆️ NÂNG ADMIN'}
                    </button>
                    <button 
                      className="btn-delete-mobile"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      🗑️ XÓA
                    </button>
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
