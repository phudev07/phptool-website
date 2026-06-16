import { useState, useEffect } from'react';
import { Link } from'react-router-dom';
import { collection, query, where, getDocs } from'firebase/firestore';
import { db } from'../services/firebase';
import { useAuth } from'../contexts/AuthContext';
import Navbar from'../components/Layout/Navbar';
import { getProducts } from'../services/productsService';

export default function Dashboard() {
 const { currentUser, userProfile } = useAuth();
 const [licenses, setLicenses] = useState([]);
 const [transactions, setTransactions] = useState([]);
 const [productsMap, setProductsMap] = useState({});
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 async function fetchData() {
 if (!currentUser) return;
 setLoading(true);

 try {
 // 1. Fetch products map
 const productsList = await getProducts();
 const pMap = {};
 productsList.forEach(p => {
 pMap[p.id] = p;
 });
 setProductsMap(pMap);

 // 2. Fetch licenses for current user
 const licensesQuery = query(
 collection(db,'licenses'),
 where('userId','==', currentUser.uid)
 );
 const licensesSnapshot = await getDocs(licensesQuery);
 let licensesData = licensesSnapshot.docs.map(doc => ({
 id: doc.id,
 ...doc.data()
 }));
 setLicenses(licensesData);

 // 3. Fetch recent transactions
 const transactionsQuery = query(
 collection(db,'transactions'),
 where('userId','==', currentUser.uid)
 );
 const transactionsSnapshot = await getDocs(transactionsQuery);
 let transactionsData = transactionsSnapshot.docs.map(doc => ({
 id: doc.id,
 ...doc.data()
 }));
 
 // Sort client side
 transactionsData.sort((a, b) => {
 const dateA = a.createdAt?.toDate?.() || new Date(0);
 const dateB = b.createdAt?.toDate?.() || new Date(0);
 return dateB - dateA;
 });
 setTransactions(transactionsData.slice(0, 5));
 } catch (error) {
 console.error('Error fetching dashboard user data:', error);
 }

 setLoading(false);
 }

 fetchData();
 }, [currentUser]);

 function formatMoney(amount) {
 return new Intl.NumberFormat('vi-VN').format(amount);
 }

 const balance = userProfile?.balance || 0;
 const activeLicensesCount = licenses.filter(l => l.status ==='active').length;

 return (
 <div className="min-h-screen bg-background text-on-background">
 <Navbar />

 <main className="md:ml-sidebar-width pt-header-height min-h-screen pb-12">
 <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop py-8">
 
 {/* Welcome Header */}
 <div className="mb-8">
 <h1 className="font-headline-xl text-headline-xl text-on-surface mb-1">
 Xin chào, {userProfile?.displayName ||'Thành viên'}! 👋
 </h1>
 <p className="text-secondary font-body-lg text-body-lg">Chào mừng quay trở lại cửa hàng. Quản lý bản quyền và số dư của bạn tại đây.</p>
 </div>

 {loading ? (
 <div className="flex flex-col items-center justify-center py-20">
 <div className="w-10 h-10 border-4 border-[#c21a5b] border-t-transparent rounded-full animate-spin mb-4"></div>
 <p className="text-secondary">Đang tải dữ liệu tài khoản...</p>
 </div>
 ) : (
 <div className="space-y-8 animate-fadeIn">
 
 {/* Stats Overview Grid */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 
 {/* Balance Card */}
 <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden pt-7 hover:border-[#c21a5b] transition-all duration-200">
 <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-[#c21a5b] to-[#571477]"></div>
 <div>
 <div className="text-secondary font-label-md text-label-md uppercase">Số dư ví</div>
 <div className="font-headline-lg text-headline-lg font-black bg-gradient-to-r from-[#c21a5b] to-[#571477] bg-clip-text text-transparent mt-1">
 {formatMoney(balance)}<span className="text-sm font-normal ml-0.5 bg-gradient-to-r from-[#c21a5b] to-[#571477] bg-clip-text text-transparent">đ</span>
 </div>
 <Link to="/wallet" className="text-xs font-bold mt-2 inline-block bg-gradient-to-r from-[#c21a5b] to-[#571477] bg-clip-text text-transparent hover:opacity-80 transition-opacity">
 Nạp thêm tiền →
 </Link>
 </div>
 <div className="w-12 h-12 bg-gradient-to-br from-[#c21a5b]/10 to-[#571477]/10 border border-[#c21a5b]/20 rounded-full flex items-center justify-center shrink-0">
 <span className="material-symbols-outlined text-2xl bg-gradient-to-br from-[#c21a5b] to-[#571477] bg-clip-text text-transparent font-bold">account_balance_wallet</span>
 </div>
 </div>
 
 {/* Active Licenses Card */}
 <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden pt-7 hover:border-emerald-500 transition-all duration-200">
 <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-[#10b981] to-[#059669]"></div>
 <div>
 <div className="text-secondary font-label-md text-label-md uppercase">Key Đang Chạy</div>
 <div className="font-headline-lg text-headline-lg font-black text-emerald-600 mt-1">
 {activeLicensesCount} <span className="text-sm font-normal text-secondary">keys</span>
 </div>
 <Link to="/my-licenses" className="text-xs text-emerald-600 font-bold hover:underline mt-2 inline-block">
 Quản lý Key →
 </Link>
 </div>
 <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center shrink-0">
 <span className="material-symbols-outlined text-2xl">vpn_key</span>
 </div>
 </div>
 
 {/* Purchase Count Card */}
 <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden pt-7 hover:border-purple-500 transition-all duration-200">
 <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed]"></div>
 <div>
 <div className="text-secondary font-label-md text-label-md uppercase">Lượt mua bản quyền</div>
 <div className="font-headline-lg text-headline-lg font-black text-purple-600 mt-1">
 {licenses.length} <span className="text-sm font-normal text-secondary">lần</span>
 </div>
 <Link to="/profile" className="text-xs text-purple-600 font-bold hover:underline mt-2 inline-block">
 Lịch sử mua →
 </Link>
 </div>
 <div className="w-12 h-12 bg-purple-50 text-purple-600 border border-purple-200 rounded-full flex items-center justify-center shrink-0">
 <span className="material-symbols-outlined text-2xl">shopping_cart</span>
 </div>
 </div>
 
 </div>
 
 {/* Showcase & Quick Actions grid */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 
 {/* Left: Quick Actions buttons list */}
 <div className="lg:col-span-1 space-y-6">
 <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4 relative overflow-hidden pt-7">
 <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#c21a5b] to-[#571477]"></div>
 <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Thao tác nhanh</h3>
 <div className="flex flex-col gap-2">
 <Link to="/" className="w-full bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white font-label-md text-label-md py-3 rounded-lg hover:opacity-95 transition-all flex items-center justify-center gap-2 font-bold text-center shadow-sm">
 <span className="material-symbols-outlined">shopping_cart</span>
 Mua Tool Bản Quyền
 </Link>
 <Link to="/my-licenses" className="w-full bg-surface-container-lowest border border-outline-variant hover:border-[#c21a5b]/40 hover:bg-surface-container-low font-label-md text-label-md py-3 rounded-lg transition-all flex items-center justify-center gap-2 font-bold text-center shadow-sm group">
 <span className="material-symbols-outlined bg-gradient-to-br from-[#c21a5b] to-[#571477] bg-clip-text text-transparent font-bold">key</span>
 <span className="bg-gradient-to-r from-[#c21a5b] to-[#571477] bg-clip-text text-transparent">Quản lý Key đã mua</span>
 </Link>
 <Link to="/wallet" className="w-full bg-surface-container-lowest border border-outline-variant hover:border-[#c21a5b]/40 hover:bg-surface-container-low font-label-md text-label-md py-3 rounded-lg transition-all flex items-center justify-center gap-2 font-bold text-center shadow-sm group">
 <span className="material-symbols-outlined bg-gradient-to-br from-[#c21a5b] to-[#571477] bg-clip-text text-transparent font-bold">account_balance_wallet</span>
 <span className="bg-gradient-to-r from-[#c21a5b] to-[#571477] bg-clip-text text-transparent">Nạp tiền vào ví</span>
 </Link>
 </div>
 </div>
 </div>
 
 {/* Right: Recent Transaction logs */}
 <div className="lg:col-span-2">
 <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm relative pt-[4px]">
 <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#c21a5b] to-[#571477]"></div>
 <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
 <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Giao dịch gần đây</h3>
 <Link to="/profile" className="text-xs font-bold bg-gradient-to-r from-[#c21a5b] to-[#571477] bg-clip-text text-transparent hover:opacity-85 transition-opacity">
 Xem tất cả →
 </Link>
 </div>
 {transactions.length === 0 ? (
 <p className="text-secondary text-sm py-8 text-center bg-surface-container-lowest">Chưa thực hiện giao dịch nào.</p>
 ) : (
 <div className="divide-y divide-outline-variant/60 bg-surface-container-lowest">
 {transactions.map(tx => (
 <div key={tx.id} className="p-4 flex items-center justify-between gap-4 hover:bg-surface-container-low transition-colors">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-gradient-to-br from-[#c21a5b]/10 to-[#571477]/10 border border-[#c21a5b]/20 rounded-lg flex items-center justify-center shrink-0">
 <span className="material-symbols-outlined text-lg bg-gradient-to-br from-[#c21a5b] to-[#571477] bg-clip-text text-transparent font-bold">
 {tx.type ==='deposit' ?'payments' :'shopping_cart'}
 </span>
 </div>
 <div>
 <div className="font-label-md text-label-md font-bold text-on-surface">
 {tx.type ==='deposit' ?'Nạp tiền' :'Mua License'}
 </div>
 <div className="text-secondary text-xs mt-0.5">{tx.description}</div>
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
 
 </div>
 )}

 </div>
 </main>
 </div>
 );
}
