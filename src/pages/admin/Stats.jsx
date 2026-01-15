import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Navbar from '../../components/Layout/Navbar';
import './Admin.css';

export default function AdminStats() {
  const [stats, setStats] = useState({
    today: 0,
    thisMonth: 0,
    total: 0,
    uniqueToday: 0,
    uniqueMonth: 0,
    uniqueTotal: 0,
    // Revenue stats
    revenueToday: 0,
    revenueMonth: 0,
    revenueTotal: 0,
    ordersToday: 0,
    ordersMonth: 0,
    ordersTotal: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    fetchStats();
  }, []);

  function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
  }

  async function fetchStats() {
    setLoading(true);
    try {
      const now = new Date();
      // Sử dụng local timezone (VN) thay vì UTC
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`; // YYYY-MM-DD local
      const thisMonth = `${year}-${month}`; // YYYY-MM local

      // Fetch all usage logs
      const logsRef = collection(db, 'usage_logs');
      const logsSnapshot = await getDocs(logsRef);
      
      let todayCount = 0;
      let monthCount = 0;
      let totalCount = 0;
      const uniqueHwidsToday = new Set();
      const uniqueHwidsMonth = new Set();
      const uniqueHwidsTotal = new Set();
      const logs = [];

      logsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        totalCount++;
        uniqueHwidsTotal.add(data.hwid);
        
        if (data.date === today) {
          todayCount++;
          uniqueHwidsToday.add(data.hwid);
        }
        
        if (data.month === thisMonth) {
          monthCount++;
          uniqueHwidsMonth.add(data.hwid);
        }
        
        logs.push({ id: doc.id, ...data });
      });

      // Sort logs by timestamp desc
      logs.sort((a, b) => {
        const dateA = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
        const dateB = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
        return dateB - dateA;
      });

      // Fetch transactions for revenue
      const txRef = collection(db, 'transactions');
      const txSnapshot = await getDocs(txRef);
      
      let revenueToday = 0, revenueMonth = 0, revenueTotal = 0;
      let ordersToday = 0, ordersMonth = 0, ordersTotal = 0;

      txSnapshot.docs.forEach(doc => {
        const data = doc.data();
        // Only count license_purchase (sales)
        if (data.type === 'license_purchase' && data.amount < 0) {
          const amount = Math.abs(data.amount);
          const txDate = data.createdAt?.toDate?.();
          
          if (txDate) {
            const dateStr = txDate.toISOString().split('T')[0];
            const monthStr = dateStr.substring(0, 7);
            
            revenueTotal += amount;
            ordersTotal++;
            
            if (dateStr === today) {
              revenueToday += amount;
              ordersToday++;
            }
            
            if (monthStr === thisMonth) {
              revenueMonth += amount;
              ordersMonth++;
            }
          } else {
            revenueTotal += amount;
            ordersTotal++;
          }
        }
      });

      setStats({
        today: todayCount,
        thisMonth: monthCount,
        total: totalCount,
        uniqueToday: uniqueHwidsToday.size,
        uniqueMonth: uniqueHwidsMonth.size,
        uniqueTotal: uniqueHwidsTotal.size,
        revenueToday,
        revenueMonth,
        revenueTotal,
        ordersToday,
        ordersMonth,
        ordersTotal
      });
      
      setRecentLogs(logs.slice(0, 20));
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
    setLoading(false);
  }

  return (
    <div className="admin-page">
      <Navbar />

      <div className="admin-container">
        <div className="admin-header">
          <Link to="/admin/users" className="back-link">← Admin</Link>
          <h1>📊 Thống kê</h1>
          <button className="btn-refresh" onClick={fetchStats}>🔄 Refresh</button>
        </div>

        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : (
          <>
            {/* Revenue Stats */}
            <h2 style={{color: '#fff', marginBottom: '1rem'}}>💰 Doanh thu</h2>
            <div className="stats-grid-admin">
              <div className="stat-card-admin revenue">
                <div className="stat-icon">💵</div>
                <div className="stat-content">
                  <div className="stat-number">{formatMoney(stats.revenueToday)}đ</div>
                  <div className="stat-label">Doanh thu hôm nay</div>
                  <div className="stat-sub">{stats.ordersToday} đơn hàng</div>
                </div>
              </div>

              <div className="stat-card-admin revenue">
                <div className="stat-icon">💳</div>
                <div className="stat-content">
                  <div className="stat-number">{formatMoney(stats.revenueMonth)}đ</div>
                  <div className="stat-label">Doanh thu tháng này</div>
                  <div className="stat-sub">{stats.ordersMonth} đơn hàng</div>
                </div>
              </div>

              <div className="stat-card-admin revenue">
                <div className="stat-icon">🏦</div>
                <div className="stat-content">
                  <div className="stat-number">{formatMoney(stats.revenueTotal)}đ</div>
                  <div className="stat-label">Tổng doanh thu</div>
                  <div className="stat-sub">{stats.ordersTotal} đơn hàng</div>
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            <h2 style={{color: '#fff', marginBottom: '1rem', marginTop: '2rem'}}>📈 Lượt sử dụng</h2>
            <div className="stats-grid-admin">
              <div className="stat-card-admin">
                <div className="stat-icon">📅</div>
                <div className="stat-content">
                  <div className="stat-number">{stats.today}</div>
                  <div className="stat-label">Lượt dùng hôm nay</div>
                  <div className="stat-sub">{stats.uniqueToday} người dùng</div>
                </div>
              </div>

              <div className="stat-card-admin">
                <div className="stat-icon">📆</div>
                <div className="stat-content">
                  <div className="stat-number">{stats.thisMonth}</div>
                  <div className="stat-label">Lượt dùng tháng này</div>
                  <div className="stat-sub">{stats.uniqueMonth} người dùng</div>
                </div>
              </div>

              <div className="stat-card-admin">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <div className="stat-number">{stats.total}</div>
                  <div className="stat-label">Tổng lượt dùng</div>
                  <div className="stat-sub">{stats.uniqueTotal} người dùng</div>
                </div>
              </div>
            </div>

            {/* Recent Usage Logs */}
            <div className="section-card" style={{marginTop: '2rem'}}>
              <h2>🕒 Lịch sử sử dụng gần đây</h2>
              
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>User</th>
                      <th>HWID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.map(log => (
                      <tr key={log.id}>
                        <td>
                          {log.timestamp?.toDate?.().toLocaleString('vi-VN') || 
                           new Date(log.timestamp).toLocaleString('vi-VN')}
                        </td>
                        <td>{log.userName || 'Unknown'}</td>
                        <td className="hwid-cell">
                          {log.hwid?.substring(0, 16)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
