import { useState, useEffect } from'react';
import { Link, Navigate } from'react-router-dom';
import { collection, query, getDocs, orderBy, doc, updateDoc, increment, addDoc, serverTimestamp, limit, startAfter, getCountFromServer, where } from 'firebase/firestore';
import { db } from'../../services/firebase';
import { useAuth } from'../../contexts/AuthContext';
import Navbar from'../../components/Layout/Navbar';

export default function AdminDeposits() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [processing, setProcessing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination & counts states
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({
    pending: 0,
    completed: 0,
    rejected: 0
  });

  useEffect(() => {
    fetchDeposits();
  }, [filter]);

  async function fetchDeposits() {
    setLoading(true);
    try {
      // 1. Fetch total counts using server aggregation (quota-friendly)
      const totalCountSnap = await getCountFromServer(collection(db, 'deposits'));
      setTotalCount(totalCountSnap.data().count);

      const pendingSnap = await getCountFromServer(query(collection(db, 'deposits'), where('status', '==', 'pending')));
      const completedSnap = await getCountFromServer(query(collection(db, 'deposits'), where('status', '==', 'completed')));
      const rejectedSnap = await getCountFromServer(query(collection(db, 'deposits'), where('status', '==', 'rejected')));
      setCounts({
        pending: pendingSnap.data().count,
        completed: completedSnap.data().count,
        rejected: rejectedSnap.data().count
      });

      // 2. Fetch deposits (limit to 50)
      let q;
      if (filter === 'all') {
        q = query(collection(db, 'deposits'), orderBy('createdAt', 'desc'), limit(50));
      } else {
        q = query(collection(db, 'deposits'), where('status', '==', filter), orderBy('createdAt', 'desc'), limit(50));
      }

      const snapshot = await getDocs(q);
      const depositsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDeposits(depositsData);

      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 50);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching deposits:', error);
      // Fallback if index is not created
      try {
        if (filter !== 'all') {
          const fallbackQ = query(collection(db, 'deposits'), where('status', '==', filter), limit(50));
          const snapshot = await getDocs(fallbackQ);
          const depositsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })).sort((a, b) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return timeB - timeA;
          });
          setDeposits(depositsData);
          if (snapshot.docs.length > 0) {
            setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === 50);
          } else {
            setHasMore(false);
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback fetch failed:', fallbackErr);
      }
    }
    setLoading(false);
  }

  async function handleLoadMore() {
    if (!lastVisible || loadingMore) return;
    setLoadingMore(true);
    try {
      let q;
      if (filter === 'all') {
        q = query(collection(db, 'deposits'), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(50));
      } else {
        q = query(collection(db, 'deposits'), where('status', '==', filter), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(50));
      }
      const snapshot = await getDocs(q);
      const newDeposits = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDeposits(prev => [...prev, ...newDeposits]);

      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 50);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more deposits:', error);
      // Fallback
      try {
        if (filter !== 'all') {
          const fallbackQ = query(collection(db, 'deposits'), where('status', '==', filter), startAfter(lastVisible), limit(50));
          const snapshot = await getDocs(fallbackQ);
          const newDeposits = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setDeposits(prev => {
            const merged = [...prev, ...newDeposits];
            return merged.sort((a, b) => {
              const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
              const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
              return timeB - timeA;
            });
          });
          if (snapshot.docs.length > 0) {
            setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === 50);
          } else {
            setHasMore(false);
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback load more failed:', fallbackErr);
      }
    }
    setLoadingMore(false);
  }

 function getFilteredDeposits() {
 let list = deposits;
 if (filter !=='all') {
 list = list.filter(d => d.status === filter);
 }
 if (searchTerm.trim() !=='') {
 list = list.filter(d => {
 const email = d.userEmail ||'';
 const userId = d.userId ||'';
 const orderId = d.orderId ||'';
 const memo = d.memo ||'';
 return email.toLowerCase().includes(searchTerm.toLowerCase()) ||
 userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
 orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
 memo.toLowerCase().includes(searchTerm.toLowerCase());
 });
 }
 return list;
 }

 async function handleConfirmDeposit(deposit) {
 setProcessing(deposit.id);

 try {
 // 1. Update deposit status
 await updateDoc(doc(db,'deposits', deposit.id), {
 status:'completed',
 completedAt: serverTimestamp()
 });

 // 2. Add balance to user
 await updateDoc(doc(db,'users', deposit.userId), {
 balance: increment(deposit.amount)
 });

 // 3. Create transaction record
 await addDoc(collection(db,'transactions'), {
 userId: deposit.userId,
 type:'deposit',
 amount: deposit.amount,
 description: `Nạp tiền - Mã GD: ${deposit.orderId || deposit.id.substring(0,8)}`,
 createdAt: serverTimestamp()
 });

 alert('Đã duyệt giao dịch nạp tiền thành công!');
 fetchDeposits();
 } catch (error) {
 console.error('Error confirming deposit:', error);
 alert('Duyệt thất bại:' + error.message);
 }
 setProcessing(null);
 }

 async function handleRejectDeposit(deposit) {
 setProcessing(deposit.id);

 try {
 await updateDoc(doc(db,'deposits', deposit.id), {
 status:'rejected',
 rejectedAt: serverTimestamp()
 });

 alert('Đã từ chối giao dịch.');
 fetchDeposits();
 } catch (error) {
 console.error('Error rejecting deposit:', error);
 alert('Không thể từ chối:' + error.message);
 }
 setProcessing(null);
 }

 function formatMoney(amount) {
 return new Intl.NumberFormat('vi-VN').format(amount);
 }

 if (!authLoading && !isAdmin()) {
 return <Navigate to="/dashboard" />;
 }

 const filteredDeposits = getFilteredDeposits();

 return (
 <div className="min-h-screen bg-background text-on-background">
 <Navbar />

 <main className="md:ml-sidebar-width pt-header-height min-h-screen pb-12">
 <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop py-8">
 
 {/* Page Header */}
 <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">Quản lý nạp tiền</h2>
 <p className="font-body-lg text-body-lg text-secondary">Phê duyệt và từ chối các giao dịch nạp tiền của người dùng.</p>
 </div>
 <button 
 onClick={fetchDeposits}
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

  <div className="flex items-center gap-2 mb-6 border-b border-outline-variant pb-px overflow-x-auto">
  <button 
  className={`px-4 py-2 border-b-2 font-label-md text-label-md transition-colors whitespace-nowrap ${filter ==='all' ?'border-[#c21a5b] text-[#c21a5b] font-bold' :'border-transparent text-secondary hover:text-[#c21a5b]'}`}
  onClick={() => setFilter('all')}
  >
  Tất cả ({totalCount})
  </button>
  <button 
  className={`px-4 py-2 border-b-2 font-label-md text-label-md transition-colors whitespace-nowrap ${filter ==='pending' ?'border-[#c21a5b] text-[#c21a5b] font-bold' :'border-transparent text-secondary hover:text-[#c21a5b]'}`}
  onClick={() => setFilter('pending')}
  >
  Chờ xử lý ({counts.pending})
  </button>
  <button 
  className={`px-4 py-2 border-b-2 font-label-md text-label-md transition-colors whitespace-nowrap ${filter ==='completed' ?'border-[#c21a5b] text-[#c21a5b] font-bold' :'border-transparent text-secondary hover:text-[#c21a5b]'}`}
  onClick={() => setFilter('completed')}
  >
  Đã hoàn thành ({counts.completed})
  </button>
  <button 
  className={`px-4 py-2 border-b-2 font-label-md text-label-md transition-colors whitespace-nowrap ${filter ==='rejected' ?'border-[#c21a5b] text-[#c21a5b] font-bold' :'border-transparent text-secondary hover:text-[#c21a5b]'}`}
  onClick={() => setFilter('rejected')}
  >
  Đã từ chối ({counts.rejected})
  </button>
  </div>

 {loading ? (
 <div className="flex flex-col items-center justify-center py-20">
 <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
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
 <th className="px-6 py-4">Mã Giao Dịch</th>
 <th className="px-6 py-4">Tài khoản User</th>
 <th className="px-6 py-4">Số Tiền</th>
 <th className="px-6 py-4">Nội Dung</th>
 <th className="px-6 py-4">Thời gian</th>
 <th className="px-6 py-4">Trạng thái</th>
 <th className="px-6 py-4 text-center">Phê duyệt</th>
 </tr>
 </thead>
 <tbody className="font-body-md text-body-md divide-y divide-outline-variant text-sm text-on-surface">
 {filteredDeposits.length > 0 ? (
 filteredDeposits.map(dep => (
 <tr key={dep.id} className="hover:bg-surface-container-low transition-colors">
 <td className="px-6 py-4 font-mono-sm text-xs font-semibold">
   <div className="max-w-[150px] break-all">
     {dep.orderId || dep.id.substring(0, 10).toUpperCase()}
   </div>
 </td>
 <td className="px-6 py-4 text-xs font-semibold">
   <div className="max-w-[200px] break-all">
     {dep.userEmail || dep.userId}
   </div>
 </td>
 <td className="px-6 py-4 font-bold text-[#c21a5b]">
   <div className="max-w-[150px] break-all">
     +{formatMoney(dep.amount)}đ
   </div>
 </td>
 <td className="px-6 py-4 text-on-surface-variant text-xs">
   <div className="max-w-[220px] break-words">
     {dep.memo || dep.description ||'Nạp số dư'}
   </div>
 </td>
 <td className="px-6 py-4 text-on-surface-variant text-xs">
 {dep.createdAt?.toDate 
 ? dep.createdAt.toDate().toLocaleString('vi-VN')
 : dep.createdAt ? new Date(dep.createdAt).toLocaleString('vi-VN') :'-'}
 </td>
 <td className="px-6 py-4">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${dep.status ==='completed' ?'bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]' : dep.status ==='rejected' ?'bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]' :'bg-[#fef3c7] text-[#92400e] border border-[#fde68a]'}`}>
 {dep.status ==='completed' ?'Thành công' : dep.status ==='rejected' ?'Đã từ chối' :'Chờ duyệt'}
 </span>
 </td>
 <td className="px-6 py-4 text-center">
 {dep.status ==='pending' ? (
 <div className="flex items-center justify-center gap-2">
 <button
 onClick={() => handleConfirmDeposit(dep)}
 disabled={processing === dep.id}
 className="px-2.5 py-1 bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white rounded text-xs hover:opacity-95 transition-all disabled:opacity-50 font-bold"
 >
 Duyệt
 </button>
 <button
 onClick={() => handleRejectDeposit(dep)}
 disabled={processing === dep.id}
 className="px-2.5 py-1 bg-surface border border-outline-variant text-error rounded text-xs hover:bg-error-container/20 hover:border-error transition-colors disabled:opacity-50 font-bold"
 >
 Hủy
 </button>
 </div>
 ) : (
 <span className="text-secondary text-xs font-semibold uppercase">Done</span>
 )}
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan="7" className="px-6 py-8 text-center text-secondary">
 Chưa có lịch sử nạp tiền nào phù hợp.
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
