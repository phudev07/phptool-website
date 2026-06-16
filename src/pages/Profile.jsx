import { useState, useEffect } from'react';
import { Link } from'react-router-dom';
import { collection, query, where, getDocs } from'firebase/firestore';
import { db } from'../services/firebase';
import { useAuth } from'../contexts/AuthContext';
import Navbar from'../components/Layout/Navbar';

export default function Profile() {
 const { currentUser, userProfile } = useAuth();
 const [transactions, setTransactions] = useState([]);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState('all');

 useEffect(() => {
 async function fetchTransactions() {
 if (!currentUser) return;
 try {
 const q = query(
 collection(db,'transactions'),
 where('userId','==', currentUser.uid)
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
 
 setTransactions(transactionsData);
 } catch (error) {
 console.error('Error fetching user transactions:', error);
 }
 setLoading(false);
 }
 fetchTransactions();
 }, [currentUser]);

 function formatMoney(amount) {
 return new Intl.NumberFormat('vi-VN').format(amount);
 }

 function getFilteredTransactions() {
 if (activeTab ==='all') return transactions;
 if (activeTab ==='tool_history') return transactions.filter(tx => tx.type ==='license_purchase' || tx.type ==='daily_deduct');
 return transactions.filter(tx => tx.type === activeTab);
 }

 function getTransactionIcon(type) {
 switch (type) {
 case'deposit': return'payments';
 case'license_purchase': return'shopping_cart';
 case'daily_deduct': return'calendar_today';
 default: return'credit_card';
 }
 }

 function getTransactionLabel(type) {
 switch (type) {
 case'deposit': return'Nạp tiền';
 case'license_purchase': return'Mua license';
 case'daily_deduct': return'Trừ ngày';
 default: return type;
 }
 }

 const balance = userProfile?.balance || 0;
 const filteredTransactions = getFilteredTransactions();

 return (
 <div className="min-h-screen bg-background text-on-background">
 <Navbar />

 <main className="md:ml-sidebar-width pt-header-height min-h-screen">
 <div className="max-w-container-max mx-auto p-4 md:p-gutter pb-20">
 
 {/* Page Header */}
 <div className="mb-8">
 <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Thông tin tài khoản</h2>
 <p className="font-body-md text-body-md text-secondary">Xem hồ sơ cá nhân và lịch sử biến động số dư.</p>
 </div>

 <div className="space-y-6">
 
 {/* User Info Card */}
 <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
 <div className="flex items-center gap-4">
 <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-container border-2 border-outline-variant shrink-0">
 <img 
 src={`https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(currentUser?.uid || currentUser?.email ||'user')}&backgroundColor=transparent`} 
 alt="Avatar" 
 className="w-full h-full object-cover" 
 />
 </div>
 <div>
 <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
 {userProfile?.displayName ||'User'}
 </h3>
 <p className="text-secondary text-sm font-mono-sm mt-0.5">{currentUser?.email}</p>
 <p className="text-on-surface-variant text-xs mt-1">
 Ngày đăng ký: {userProfile?.createdAt?.toDate ? userProfile.createdAt.toDate().toLocaleDateString('vi-VN') :'N/A'}
 </p>
 </div>
 </div>

 <div className="flex flex-col md:items-end gap-2 bg-surface-container-low border border-outline-variant rounded-xl p-4 min-w-[200px]">
 <div className="text-secondary text-xs uppercase font-label-md">Số dư ví</div>
 <div className="font-headline-lg text-headline-lg font-bold text-[#c21a5b]">
 {formatMoney(balance)}<span className="text-xs font-normal ml-0.5">đ</span>
 </div>
 <Link to="/wallet" className="bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white font-label-md text-label-md py-1.5 px-4 rounded-lg hover:bg-on-primary-fixed-variant transition-colors text-center text-xs font-bold mt-1">
 Nạp thêm tiền
 </Link>
 </div>
 </div>

 {/* Transaction History Section */}
 <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden shadow-sm">
 <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
 <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Lịch sử giao dịch ví</h3>
 </div>
 
 {/* Tabs Filter */}
 <div className="flex items-center gap-2 px-6 py-3 border-b border-outline-variant bg-surface-container-lowest/50 overflow-x-auto">
 <button 
 className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab ==='all' ?'bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white' :'text-secondary hover:bg-surface-container-low'}`}
 onClick={() => setActiveTab('all')}
 >
 Tất cả ({transactions.length})
 </button>
 <button 
 className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab ==='deposit' ?'bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white' :'text-secondary hover:bg-surface-container-low'}`}
 onClick={() => setActiveTab('deposit')}
 >
 Nạp tiền ({transactions.filter(t => t.type ==='deposit').length})
 </button>
 <button 
 className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab ==='tool_history' ?'bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white' :'text-secondary hover:bg-surface-container-low'}`}
 onClick={() => setActiveTab('tool_history')}
 >
 Lịch sử mua tool ({transactions.filter(t => t.type ==='license_purchase' || t.type ==='daily_deduct').length})
 </button>
 </div>

 {/* Transaction list */}
 {loading ? (
 <div className="flex flex-col items-center justify-center py-10">
 <div className="w-8 h-8 border-4 border-[#c21a5b] border-t-transparent rounded-full animate-spin"></div>
 <p className="text-secondary text-sm mt-3">Đang tải lịch sử...</p>
 </div>
 ) : filteredTransactions.length === 0 ? (
 <p className="text-secondary text-sm py-8 text-center bg-surface-container-lowest">Chưa có giao dịch nào phù hợp.</p>
 ) : (
 <div className="divide-y divide-outline-variant/60 bg-surface-container-lowest">
 {filteredTransactions.map(tx => (
 <div key={tx.id} className="p-4 flex items-center justify-between gap-4 hover:bg-surface-container-low transition-colors">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-[#c21a5b]/5 text-[#c21a5b] rounded-lg flex items-center justify-center shrink-0">
 <span className="material-symbols-outlined text-lg">
 {getTransactionIcon(tx.type)}
 </span>
 </div>
 <div>
 <div className="font-label-md text-label-md font-bold text-on-surface">
 {getTransactionLabel(tx.type)}
 </div>
 <div className="text-secondary text-xs mt-0.5">{tx.description}</div>
 <div className="text-on-surface-variant text-[10px] font-mono-sm mt-1">
 {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString('vi-VN') :'-'}
 </div>
 </div>
 </div>
 <div className={`font-bold text-sm shrink-0 ${tx.amount >= 0 ?'text-emerald-600' :'text-error'}`}>
 {tx.amount >= 0 ?'+' :''}{formatMoney(tx.amount)}đ
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 </div>

 </div>
 </main>
 </div>
 );
}
