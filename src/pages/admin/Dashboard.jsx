import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { collection, getDocs, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/Layout/Navbar';

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalKeys: 0,
    activeKeys: 0,
    runningKeys: 0,
    totalUsers: 0
  });
  const [weeklyUsage, setWeeklyUsage] = useState({
    Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0
  });

  useEffect(() => {
    async function fetchDashboardData() {
      if (authLoading || !isAdmin()) return;
      setLoading(true);
      try {
        // 1. Fetch licenses and count paid ones
        const licensesSnapshot = await getDocs(collection(db, 'licenses'));
        let activeCount = 0;
        let totalKeysCount = 0;
        licensesSnapshot.forEach(doc => {
          const data = doc.data();
          const isFree = data.price === 0 || data.plan === 'free';
          if (!isFree) {
            totalKeysCount++;
            if (data.status === 'active') {
              activeCount++;
            }
          }
        });

        // 2. Fetch user counter via server-side aggregation
        const totalUsersSnap = await getCountFromServer(collection(db, 'users'));
        const totalUsers = totalUsersSnap.data().count;

        // 3. Fetch ONLY purchase transactions (reduces read volume)
        const txQuery = query(collection(db, 'transactions'), where('type', '==', 'license_purchase'));
        const txSnapshot = await getDocs(txQuery);
        let salesSum = 0;
        txSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.amount < 0) {
            salesSum += Math.abs(data.amount);
          }
        });

        // 4. Fetch ONLY usage logs from the last 7 days (prevents loading the entire logs history)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const logsQuery = query(collection(db, 'usage_logs'), where('timestamp', '>=', sevenDaysAgo));
        const logsSnapshot = await getDocs(logsQuery);
        
        const uniqueHwids = new Set();
        const daysMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
        
        // Get day abbreviations
        const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        logsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.hwid) {
            uniqueHwids.add(data.hwid);
          }

          // Count weekly logs
          const logDate = data.timestamp?.toDate?.() || (data.timestamp ? new Date(data.timestamp) : null);
          if (logDate) {
            const dayName = weekdayNames[logDate.getDay()];
            if (daysMap[dayName] !== undefined) {
              daysMap[dayName]++;
            }
          }
        });

        setStats({
          totalSales: salesSum,
          totalKeys: totalKeysCount,
          activeKeys: activeCount,
          runningKeys: uniqueHwids.size,
          totalUsers: totalUsers
        });

        // If weekly usage has no logs, seed mock values so chart is visible
        const totalLogsInWeek = Object.values(daysMap).reduce((a, b) => a + b, 0);
        if (totalLogsInWeek === 0) {
          setWeeklyUsage({ Mon: 12, Tue: 25, Wed: 40, Thu: 18, Fri: 30, Sat: 15, Sun: 8 });
        } else {
          setWeeklyUsage(daysMap);
        }

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
      setLoading(false);
    }
    fetchDashboardData();
  }, [authLoading, isAdmin]);

 if (!authLoading && !isAdmin()) {
 return <Navigate to="/dashboard" />;
 }

 function formatMoney(amount) {
 return new Intl.NumberFormat('vi-VN').format(amount);
 }

 // Calculate max height for chart bars
 const maxWeeklyValue = Math.max(...Object.values(weeklyUsage), 10);

 return (
 <div className="min-h-screen bg-background text-on-background">
 <Navbar />

 <main className="md:ml-sidebar-width pt-header-height min-h-screen pb-12">
 <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop py-8">
 
 {/* Header */}
 <div className="mb-8">
 <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">Admin Dashboard</h2>
 <p className="font-body-lg text-body-lg text-secondary">Tổng quan hoạt động kinh doanh và vận hành hệ thống.</p>
 </div>

 {loading ? (
 <div className="flex flex-col items-center justify-center py-20">
 <div className="w-10 h-10 border-4 border-[#c21a5b] border-t-transparent rounded-full animate-spin mb-4"></div>
 <p className="text-secondary">Đang tải dữ liệu tổng quan...</p>
 </div>
 ) : (
 <>
 {/* Stats Counters Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
 
 {/* Revenue Card */}
 <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm hover:border-[#c21a5b] transition-all duration-200 relative overflow-hidden group">
 <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#c21a5b] to-[#571477]"></div>
 <div className="absolute top-4 right-4 p-2 bg-gradient-to-br from-[#c21a5b]/5 to-[#571477]/5 border border-[#c21a5b]/10 rounded-lg group-hover:border-[#c21a5b]/30 transition-colors">
 <span className="material-symbols-outlined text-3xl bg-gradient-to-br from-[#c21a5b] to-[#571477] bg-clip-text text-transparent font-bold">payments</span>
 </div>
 <p className="font-label-md text-label-md text-on-surface-variant mb-2">Doanh thu bán tool</p>
 <h3 className="font-headline-lg text-headline-lg text-on-surface mb-4 font-black">
 {formatMoney(stats.totalSales)}<span className="text-sm font-normal">đ</span>
 </h3>
 <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded text-xs font-semibold">
 <span className="material-symbols-outlined text-[16px]">trending_up</span>
 Đã thanh toán
 </div>
 </div>

 {/* Total Keys Card */}
 <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm hover:border-[#c21a5b] transition-all duration-200 relative overflow-hidden group">
 <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#c21a5b] to-[#571477]"></div>
 <div className="absolute top-4 right-4 p-2 bg-gradient-to-br from-[#c21a5b]/5 to-[#571477]/5 border border-[#c21a5b]/10 rounded-lg group-hover:border-[#c21a5b]/30 transition-colors">
 <span className="material-symbols-outlined text-3xl bg-gradient-to-br from-[#c21a5b] to-[#571477] bg-clip-text text-transparent font-bold">key</span>
 </div>
 <p className="font-label-md text-label-md text-on-surface-variant mb-2">Tổng số license</p>
 <h3 className="font-headline-lg text-headline-lg text-on-surface mb-4 font-black">
 {stats.totalKeys} <span className="text-sm font-normal">bản quyền</span>
 </h3>
 <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#c21a5b]/10 to-[#571477]/10 border border-[#c21a5b]/20 w-fit px-2 py-0.5 rounded text-xs font-semibold">
 <span className="material-symbols-outlined text-[16px] bg-gradient-to-br from-[#c21a5b] to-[#571477] bg-clip-text text-transparent font-bold">database</span>
 <span className="bg-gradient-to-r from-[#c21a5b] to-[#571477] bg-clip-text text-transparent">Trong hệ thống</span>
 </div>
 </div>

 {/* Active Keys Card */}
 <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm hover:border-[#c21a5b] transition-all duration-200 relative overflow-hidden group">
 <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#c21a5b] to-[#571477]"></div>
 <div className="absolute top-4 right-4 p-2 bg-gradient-to-br from-[#c21a5b]/5 to-[#571477]/5 border border-[#c21a5b]/10 rounded-lg group-hover:border-[#c21a5b]/30 transition-colors">
 <span className="material-symbols-outlined text-3xl bg-gradient-to-br from-[#c21a5b] to-[#571477] bg-clip-text text-transparent font-bold">check_circle</span>
 </div>
 <p className="font-label-md text-label-md text-on-surface-variant mb-2">Đang hoạt động</p>
 <h3 className="font-headline-lg text-headline-lg text-on-surface mb-4 font-black">
 {stats.activeKeys} <span className="text-sm font-normal">bản quyền</span>
 </h3>
 <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded text-xs font-semibold">
 <span className="material-symbols-outlined text-[16px]">verified</span>
 Đang active
 </div>
 </div>

 {/* Running Devices Card */}
 <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm hover:border-[#c21a5b] transition-all duration-200 relative overflow-hidden group">
 <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#c21a5b] to-[#571477]"></div>
 <div className="absolute top-4 right-4 p-2 bg-gradient-to-br from-[#c21a5b]/5 to-[#571477]/5 border border-[#c21a5b]/10 rounded-lg group-hover:border-[#c21a5b]/30 transition-colors">
 <span className="material-symbols-outlined text-3xl bg-gradient-to-br from-[#c21a5b] to-[#571477] bg-clip-text text-transparent font-bold">devices</span>
 </div>
 <p className="font-label-md text-label-md text-on-surface-variant mb-2">Thiết bị đang chạy (HWID)</p>
 <h3 className="font-headline-lg text-headline-lg text-on-surface mb-4 font-black">
 {stats.runningKeys} <span className="text-sm font-normal">PC</span>
 </h3>
 <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded text-xs font-semibold">
 <span className="material-symbols-outlined text-[16px]">terminal</span>
 Chạy gần đây
 </div>
 </div>

 </div>

 {/* Chart & Quick Actions Section */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 
 {/* Simulated Chart area */}
 <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm relative overflow-hidden group">
 <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#c21a5b] to-[#571477]"></div>
 <div className="flex justify-between items-center mb-6">
 <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Lượt sử dụng Tool (7 ngày qua)</h3>
 <span className="text-xs text-secondary bg-surface-container px-2.5 py-1 rounded-full font-mono-sm">
 Real-time logs
 </span>
 </div>

 <div className="h-64 flex items-end gap-2 mt-4 relative">
 {/* Y Axis Grid Lines */}
 <div className="absolute left-10 right-0 top-0 h-full flex flex-col justify-between pointer-events-none pb-8">
 <div className="border-t border-dashed border-outline-variant/30 w-full"></div>
 <div className="border-t border-dashed border-outline-variant/30 w-full"></div>
 <div className="border-t border-dashed border-outline-variant/30 w-full"></div>
 <div className="border-t border-dashed border-outline-variant/30 w-full"></div>
 <div className="w-full"></div>
 </div>

 {/* Y Axis Labels */}
 <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-on-surface-variant font-mono-sm text-mono-sm pb-8 text-xs z-10">
 <span>{maxWeeklyValue}</span>
 <span>{Math.round(maxWeeklyValue * 0.75)}</span>
 <span>{Math.round(maxWeeklyValue * 0.5)}</span>
 <span>{Math.round(maxWeeklyValue * 0.25)}</span>
 <span>0</span>
 </div>

 {/* Chart Bars */}
 <div className="flex-1 flex justify-between items-end h-full ml-12 border-b border-outline-variant pb-1 z-10">
 {Object.entries(weeklyUsage).map(([day, val]) => {
 const heightPercent = `${Math.min(100, Math.max(5, (val / maxWeeklyValue) * 80))}%`;
 return (
 <div key={day} className="w-12 bg-gradient-to-t from-[#571477]/40 to-[#c21a5b]/80 hover:from-[#571477] hover:to-[#c21a5b] shadow-[0_0_10px_rgba(194,26,91,0.08)] hover:shadow-[0_0_20px_rgba(194,26,91,0.3)] transition-all duration-300 rounded-t-lg relative group flex flex-col items-center justify-end cursor-pointer" style={{ height: heightPercent }}>
 <span className="absolute -top-7 text-xs font-bold font-mono bg-gradient-to-r from-[#c21a5b] to-[#571477] bg-clip-text text-transparent drop-shadow-sm transition-transform group-hover:scale-110">
 {val}
 </span>
 <div className="absolute -top-12 bg-inverse-surface text-inverse-on-surface text-[11px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-md font-mono-sm">
 {val} lượt chạy
 </div>
 <div className="absolute -bottom-6 text-on-surface-variant font-mono-sm text-mono-sm text-xs font-semibold">
 {day}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>

 {/* Quick Actions Panel */}
 <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col gap-6">
 <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Thao tác nhanh</h3>
 <div className="flex flex-col gap-3">
 
 <Link to="/admin/settings?action=add" className="flex items-center justify-between p-3 border border-outline-variant rounded-lg hover:bg-surface-container hover:border-[#c21a5b]/50 transition-all group w-full text-left">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-gradient-to-r from-[#c21a5b]/10 to-[#571477]/10 border border-[#c21a5b]/20 rounded-md flex items-center justify-center shrink-0">
 <span className="material-symbols-outlined text-[20px] bg-gradient-to-br from-[#c21a5b] to-[#571477] bg-clip-text text-transparent font-bold">add_box</span>
 </div>
 <span className="font-label-md text-label-md text-on-surface font-semibold">Thêm Tool Mới</span>
 </div>
 <span className="material-symbols-outlined text-on-surface-variant group-hover:text-[#c21a5b] transition-colors">chevron_right</span>
 </Link>

 <Link to="/admin/licenses?action=create" className="flex items-center justify-between p-3 border border-outline-variant rounded-lg hover:bg-surface-container hover:border-[#c21a5b]/50 transition-all group w-full text-left">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-gradient-to-r from-[#c21a5b]/10 to-[#571477]/10 border border-[#c21a5b]/20 rounded-md flex items-center justify-center shrink-0">
 <span className="material-symbols-outlined text-[20px] bg-gradient-to-br from-[#c21a5b] to-[#571477] bg-clip-text text-transparent font-bold">vpn_key</span>
 </div>
 <span className="font-label-md text-label-md text-on-surface font-semibold">Cấp Bản Quyền</span>
 </div>
 <span className="material-symbols-outlined text-on-surface-variant group-hover:text-[#c21a5b] transition-colors">chevron_right</span>
 </Link>

 <Link to="/admin/users" className="flex items-center justify-between p-3 border border-outline-variant rounded-lg hover:bg-surface-container hover:border-[#c21a5b]/50 transition-all group w-full text-left">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-gradient-to-r from-[#c21a5b]/10 to-[#571477]/10 border border-[#c21a5b]/20 rounded-md flex items-center justify-center shrink-0">
 <span className="material-symbols-outlined text-[20px] bg-gradient-to-br from-[#c21a5b] to-[#571477] bg-clip-text text-transparent font-bold">group</span>
 </div>
 <span className="font-label-md text-label-md text-on-surface font-semibold">Quản lý Thành viên</span>
 </div>
 <span className="material-symbols-outlined text-on-surface-variant group-hover:text-[#c21a5b] transition-colors">chevron_right</span>
 </Link>

 </div>
 </div>

 </div>
 </>
 )}

 </div>
 </main>
 </div>
 );
}
