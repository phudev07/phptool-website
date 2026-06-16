import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, startAfter, getCountFromServer, where, documentId } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Navbar from '../../components/Layout/Navbar';

export default function AdminOrders() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchUsersForIds(userIds, currentUsersMap = {}) {
    const uniqueUserIds = [...new Set(userIds.filter(id => id && !currentUsersMap[id]))];
    if (uniqueUserIds.length === 0) return currentUsersMap;

    const newUsersMap = { ...currentUsersMap };
    const chunks = [];
    for (let i = 0; i < uniqueUserIds.length; i += 30) {
      chunks.push(uniqueUserIds.slice(i, i + 30));
    }

    try {
      for (const chunk of chunks) {
        const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
        const snap = await getDocs(q);
        snap.docs.forEach(doc => {
          newUsersMap[doc.id] = doc.data();
        });
      }
    } catch (err) {
      console.error('Error fetching users batch:', err);
    }
    return newUsersMap;
  }

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Get total transaction count
      const countSnap = await getCountFromServer(collection(db, 'transactions'));
      setTotalCount(countSnap.data().count);

      // 2. Fetch first 50 transactions
      const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);

      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 50);
      } else {
        setHasMore(false);
      }

      // 3. Fetch users for these transactions only
      const userIds = ordersData.map(o => o.userId);
      const updatedUsersMap = await fetchUsersForIds(userIds, {});
      setUsers(updatedUsersMap);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
    setLoading(false);
  }

  async function handleLoadMore() {
    if (!lastVisible || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(50));
      const snapshot = await getDocs(q);
      const newOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(prev => [...prev, ...newOrders]);

      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 50);
      } else {
        setHasMore(false);
      }

      // Fetch users for new transactions
      const userIds = newOrders.map(o => o.userId);
      const updatedUsersMap = await fetchUsersForIds(userIds, users);
      setUsers(updatedUsersMap);
    } catch (error) {
      console.error('Error loading more transactions:', error);
    }
    setLoadingMore(false);
  }

  if (!authLoading && !isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  const filteredOrders = orders.filter(order => {
    const email = users[order.userId]?.email ||'';
    const desc = order.description ||'';
    const id = order.id ||'';
    
    const matchesSearch = email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter ==='all' || order.type === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const depositCount = orders.filter(o => o.type ==='deposit').length;
  const purchaseCount = orders.filter(o => o.type ==='license_purchase').length;

  function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) +'đ';
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Navbar />

      <main className="md:ml-sidebar-width pt-header-height min-h-screen pb-12">
        <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop py-8">
 
          {/* Page Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">Lịch sử giao dịch</h2>
              <p className="font-body-lg text-body-lg text-secondary">
                Xem toàn bộ lịch sử mua bản quyền và nạp tiền. Tổng cộng: <strong>{totalCount}</strong> giao dịch.
              </p>
            </div>
            <button 
              onClick={fetchData}
              className="bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white hover:opacity-95 font-label-md text-label-md px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm font-bold"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Làm mới
            </button>
          </div>

          {/* Search bar */}
          <div className="mb-6 max-w-md">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input 
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-[#c21a5b] focus:ring-1 focus:ring-[#c21a5b] font-body-md text-body-md text-on-surface placeholder:text-outline transition-all" 
                placeholder="Tìm kiếm theo email, mã GD hoặc nội dung..." 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Tabs Filter */}
          <div className="flex items-center gap-2 mb-6 border-b border-outline-variant pb-px overflow-x-auto">
            <button 
              className={`px-4 py-2 border-b-2 font-label-md text-label-md transition-colors whitespace-nowrap ${statusFilter ==='all' ?'border-[#c21a5b] text-[#c21a5b] font-bold' :'border-transparent text-secondary hover:text-[#c21a5b]'}`}
              onClick={() => setStatusFilter('all')}
            >
              Tất cả ({orders.length})
            </button>
            <button 
              className={`px-4 py-2 border-b-2 font-label-md text-label-md transition-colors whitespace-nowrap ${statusFilter ==='license_purchase' ?'border-[#c21a5b] text-[#c21a5b] font-bold' :'border-transparent text-secondary hover:text-[#c21a5b]'}`}
              onClick={() => setStatusFilter('license_purchase')}
            >
              🛒 Mua License ({purchaseCount})
            </button>
            <button 
              className={`px-4 py-2 border-b-2 font-label-md text-label-md transition-colors whitespace-nowrap ${statusFilter ==='deposit' ?'border-[#c21a5b] text-[#c21a5b] font-bold' :'border-transparent text-secondary hover:text-[#c21a5b]'}`}
              onClick={() => setStatusFilter('deposit')}
            >
              💰 Nạp tiền ({depositCount})
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-[#c21a5b] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-secondary">Đang tải lịch sử giao dịch...</p>
            </div>
          ) : (
            /* Data Table Card */
            <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm relative pt-[4px]">
              <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#c21a5b] to-[#571477]"></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-xs">
                      <th className="px-6 py-4">Mã GD / ID</th>
                      <th className="px-6 py-4">Tài khoản Email</th>
                      <th className="px-6 py-4">Loại giao dịch</th>
                      <th className="px-6 py-4">Chi Tiết Giao Dịch</th>
                      <th className="px-6 py-4 text-right">Số Tiền</th>
                      <th className="px-6 py-4">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-md text-body-md divide-y divide-outline-variant text-sm text-on-surface">
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map(order => (
                        <tr key={order.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="px-6 py-4 font-mono-sm text-xs font-semibold">
                            {order.id.substring(0, 10).toUpperCase()}
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold">
                            {users[order.userId]?.email ||'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${order.type ==='deposit' ?'bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]' :'bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]'}`}>
                              {order.type ==='deposit' ?'💰 NẠP TIỀN' :'🛒 MUA LICENSE'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant text-xs">
                            {order.description}
                          </td>
                          <td className={`px-6 py-4 text-right font-bold ${order.amount >= 0 ?'text-emerald-600' :'text-[#c21a5b]'}`}>
                            {order.amount >= 0 ?'+' :''}{formatMoney(order.amount)}
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant text-xs">
                            {order.createdAt?.toDate 
                              ? order.createdAt.toDate().toLocaleString('vi-VN')
                              : order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') :'-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-secondary">
                          Chưa có lịch sử giao dịch nào phù hợp.
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
