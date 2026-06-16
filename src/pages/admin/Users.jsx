import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, query, orderBy, limit, startAfter, getCountFromServer } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Navbar from '../../components/Layout/Navbar';

export default function AdminUsers() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination states
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      // Get total count of users
      const countSnap = await getCountFromServer(collection(db, 'users'));
      setTotalCount(countSnap.data().count);

      // Fetch first 50 users
      const q = query(
        collection(db, 'users'), 
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);

      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 50);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setLoading(false);
  }

  async function handleLoadMore() {
    if (!lastVisible || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const newUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(prev => [...prev, ...newUsers]);

      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 50);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more users:', error);
    }
    setLoadingMore(false);
  }


  async function handleDeleteUser(userId) {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thành viên này? Hành động này không thể hoàn tác!')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(users.filter(u => u.id !== userId));
      setTotalCount(prev => prev - 1);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Xóa thất bại: ' + error.message);
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
    <div className="min-h-screen bg-background text-on-background">
      <Navbar />

      <main className="md:ml-sidebar-width pt-header-height min-h-screen pb-12">
        <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop py-8">
          
          {/* Page Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">Thành viên</h2>
              <p className="font-body-lg text-body-lg text-secondary">
                Quản lý người dùng. Tổng cộng: <strong>{totalCount}</strong> thành viên
              </p>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input
                type="text"
                placeholder="Tìm kiếm theo email, tên..."
                className="w-full bg-surface border border-outline-variant rounded-lg pl-10 pr-4 py-2 font-body-md text-on-surface focus:border-[#c21a5b] focus:ring-1 focus:ring-[#c21a5b] outline-none transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-[#c21a5b] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-secondary">Đang tải danh sách thành viên...</p>
            </div>
          ) : (
            <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm relative pt-[4px]">
              <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#c21a5b] to-[#571477]"></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-xs">
                      <th className="px-6 py-4">Tài khoản Email</th>
                      <th className="px-6 py-4">Họ tên</th>
                      <th className="px-6 py-4">Vai trò</th>
                      <th className="px-6 py-4 text-right">Số dư</th>
                      <th className="px-6 py-4">Ngày tham gia</th>
                      <th className="px-6 py-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-md text-body-md divide-y divide-outline-variant text-sm text-on-surface">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="px-6 py-4 font-semibold font-mono-sm text-xs">
                            {user.email}
                          </td>
                          <td className="px-6 py-4">
                            {user.displayName || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
                              {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-[#c21a5b]">
                            {user.balance?.toLocaleString('vi-VN') || 0}đ
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant text-xs">
                            {user.createdAt?.toDate 
                              ? user.createdAt.toDate().toLocaleDateString('vi-VN') + ' ' + user.createdAt.toDate().toLocaleTimeString('vi-VN')
                              : '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded transition-colors inline-flex items-center justify-center"
                              title="Xóa tài khoản"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-secondary">
                          Không tìm thấy thành viên nào phù hợp.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {hasMore && (
                <div className="flex justify-center py-4 border-t border-outline-variant bg-surface-container-low/20">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-2 bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white rounded-lg hover:opacity-90 transition-all font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {loadingMore ? '⏳ Đang tải...' : 'Xem thêm'}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
