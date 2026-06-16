import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Navbar from '../../components/Layout/Navbar';
import { getProducts } from '../../services/productsService';

export default function AdminStats() {
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);
  const [productsMap, setProductsMap] = useState({});
  const [products, setProducts] = useState([]);
  const [toolFilter, setToolFilter] = useState('');
  const [displayLimit, setDisplayLimit] = useState(50);
  const [stats, setStats] = useState({
    todayCount: 0,
    monthCount: 0,
    totalCount: 0
  });

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        // 1. Fetch products
        const productsList = await getProducts();
        setProducts(productsList);
        const pMap = {};
        productsList.forEach(p => {
          pMap[p.id] = p;
        });
        setProductsMap(pMap);

        // 2. Fetch recent 500 logs
        const qLogs = query(
          collection(db, 'usage_logs'),
          orderBy('timestamp', 'desc'),
          limit(500)
        );
        const logsSnapshot = await getDocs(qLogs);
        const logs = logsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentLogs(logs);

      } catch (error) {
        console.error('Error loading initial stats data:', error);
      }
      setLoading(false);
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    async function fetchStatsCounts() {
      setStatsLoading(true);
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        const monthStr = `${year}-${month}`;

        let totalQuery, todayQuery, monthQuery;

        if (toolFilter === '') {
          totalQuery = collection(db, 'usage_logs');
          todayQuery = query(collection(db, 'usage_logs'), where('date', '==', todayStr));
          monthQuery = query(collection(db, 'usage_logs'), where('month', '==', monthStr));
        } else {
          totalQuery = query(collection(db, 'usage_logs'), where('productId', '==', toolFilter));
          todayQuery = query(collection(db, 'usage_logs'), where('date', '==', todayStr), where('productId', '==', toolFilter));
          monthQuery = query(collection(db, 'usage_logs'), where('month', '==', monthStr), where('productId', '==', toolFilter));
        }

        const [totalCountSnapshot, todaySnapshot, monthSnapshot] = await Promise.all([
          getCountFromServer(totalQuery),
          getCountFromServer(todayQuery),
          getCountFromServer(monthQuery)
        ]);

        setStats({
          todayCount: todaySnapshot.data().count,
          monthCount: monthSnapshot.data().count,
          totalCount: totalCountSnapshot.data().count
        });
      } catch (error) {
        console.error('Error fetching stats counts:', error);
      }
      setStatsLoading(false);
    }

    if (!loading) {
      fetchStatsCounts();
    }
  }, [toolFilter, loading]);

  // Reset display limit when tool filter changes
  useEffect(() => {
    setDisplayLimit(50);
  }, [toolFilter]);

  function handleLoadMore() {
    setDisplayLimit(prev => prev + 50);
  }

  function formatTime(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('vi-VN');
  }

  const filteredLogs = toolFilter === ''
    ? recentLogs
    : recentLogs.filter(log => log.productId === toolFilter);

  const displayedLogs = filteredLogs.slice(0, displayLimit);
  const hasMore = filteredLogs.length > displayLimit;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Navbar />

      <main className="md:ml-sidebar-width pt-header-height min-h-screen pb-12">
        <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop py-8">
          
          {/* Page Header */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">Thống kê sử dụng</h2>
              <p className="font-body-lg text-body-lg text-secondary">Theo dõi hoạt động chạy Tool của khách hàng.</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white hover:opacity-95 font-label-md text-label-md px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm font-bold"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Làm mới
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-[#c21a5b] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-secondary">Đang tải số liệu thống kê...</p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Stats Counters Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#c21a5b] to-[#571477]"></div>
                  <div className="w-12 h-12 bg-gradient-to-br from-[#c21a5b]/10 to-[#571477]/10 text-[#c21a5b] border border-[#c21a5b]/20 rounded-lg flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl bg-gradient-to-br from-[#c21a5b] to-[#571477] bg-clip-text text-transparent font-bold">today</span>
                  </div>
                  <div>
                    <div className="text-secondary font-label-md text-label-md uppercase">Hôm nay</div>
                    <div className={`font-headline-lg text-headline-lg font-black text-on-surface mt-1 transition-opacity duration-200 ${statsLoading ? 'opacity-50' : 'opacity-100'}`}>
                      {stats.todayCount} <span className="text-sm font-normal text-secondary">lượt</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#c21a5b] to-[#571477]"></div>
                  <div className="w-12 h-12 bg-gradient-to-br from-[#c21a5b]/10 to-[#571477]/10 text-[#c21a5b] border border-[#c21a5b]/20 rounded-lg flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl bg-gradient-to-br from-[#c21a5b] to-[#571477] bg-clip-text text-transparent font-bold">calendar_month</span>
                  </div>
                  <div>
                    <div className="text-secondary font-label-md text-label-md uppercase">Tháng này</div>
                    <div className={`font-headline-lg text-headline-lg font-black text-on-surface mt-1 transition-opacity duration-200 ${statsLoading ? 'opacity-50' : 'opacity-100'}`}>
                      {stats.monthCount} <span className="text-sm font-normal text-secondary">lượt</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#c21a5b] to-[#571477]"></div>
                  <div className="w-12 h-12 bg-gradient-to-br from-[#c21a5b]/10 to-[#571477]/10 text-[#c21a5b] border border-[#c21a5b]/20 rounded-lg flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl bg-gradient-to-br from-[#c21a5b] to-[#571477] bg-clip-text text-transparent font-bold">analytics</span>
                  </div>
                  <div>
                    <div className="text-secondary font-label-md text-label-md uppercase">Tổng số lượt chạy</div>
                    <div className={`font-headline-lg text-headline-lg font-black text-on-surface mt-1 transition-opacity duration-200 ${statsLoading ? 'opacity-50' : 'opacity-100'}`}>
                      {stats.totalCount} <span className="text-sm font-normal text-secondary">lượt</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logs Table Card */}
              <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden shadow-sm relative">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#c21a5b] to-[#571477]"></div>
                <div className="px-6 py-5 border-b border-outline-variant bg-surface-container-low flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Nhật ký lượt sử dụng</h3>
                    <p className="text-secondary text-xs mt-1">Hiển thị lịch sử chạy tool thực tế của khách hàng.</p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <label className="text-xs font-bold text-secondary whitespace-nowrap">Lọc theo Tool:</label>
                    <div className="relative w-full sm:w-48">
                      <select 
                        className="w-full pl-3 pr-8 py-1.5 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:border-[#c21a5b] text-xs appearance-none cursor-pointer text-on-surface"
                        value={toolFilter}
                        onChange={(e) => setToolFilter(e.target.value)}
                      >
                        <option value="">Tất cả các Tool</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-sm">expand_more</span>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-xs">
                        <th className="px-6 py-4">Thời gian</th>
                        <th className="px-6 py-4">Tài khoản Email</th>
                        <th className="px-6 py-4">Mã máy HWID</th>
                        <th className="px-6 py-4">Tên Tool</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono-sm text-mono-sm text-on-surface divide-y divide-outline-variant text-xs">
                      {displayedLogs.length > 0 ? (
                        displayedLogs.map(log => {
                          const product = productsMap[log.productId];
                          return (
                            <tr key={log.id} className="hover:bg-surface-container-low transition-colors">
                              <td className="px-6 py-3.5 text-on-surface-variant">
                                {formatTime(log.timestamp)}
                              </td>
                              <td className="px-6 py-3.5 font-body-md text-body-md font-medium text-on-surface">
                                {log.userEmail || log.userName || 'Unknown'}
                              </td>
                              <td className="px-6 py-3.5 text-on-surface-variant font-mono truncate max-w-[150px]" title={log.hwid}>
                                {log.hwid}
                              </td>
                              <td className="px-6 py-3.5 font-body-md text-body-md font-bold text-[#c21a5b]">
                                {product?.name || log.productId || 'Unknown Tool'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-8 text-center text-secondary font-body-md">
                            Chưa có nhật ký sử dụng nào phù hợp với sản phẩm này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  
                  {hasMore && (
                    <div className="flex justify-center py-4 border-t border-outline-variant bg-surface-container-low/20">
                      <button
                        onClick={handleLoadMore}
                        className="px-6 py-2 bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white rounded-lg hover:opacity-90 transition-all font-bold text-xs flex items-center gap-1.5"
                      >
                        Xem thêm
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
