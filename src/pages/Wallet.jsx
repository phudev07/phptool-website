import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Layout/Navbar';
import './Wallet.css';

export default function Wallet() {
  const { currentUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [currentDeposit, setCurrentDeposit] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Bank info
  const BANK_INFO = {
    bankId: 'MB',
    accountNo: '1444488888888',
    accountName: 'PHAM HAI PHU',
    template: 'compact2'
  };

  // Realtime listener for user balance
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
      if (doc.exists()) {
        setBalance(doc.data().balance || 0);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Realtime listener for deposits
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'deposits'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let depositsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort client-side
      depositsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      // Check if currentDeposit is now completed
      if (currentDeposit && showQR) {
        const found = depositsData.find(d => d.orderId === currentDeposit.orderId);
        if (found && found.status === 'completed') {
          // Payment successful!
          setSuccessMessage(`🎉 Nạp tiền thành công! +${new Intl.NumberFormat('vi-VN').format(found.actualAmount || found.amount)}đ`);
          setShowQR(false);
          setCurrentDeposit(null);
          // Auto hide after 5 seconds
          setTimeout(() => setSuccessMessage(''), 5000);
        }
      }
      
      setDeposits(depositsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, currentDeposit, showQR]);

  function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
  }

  function generateOrderId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `NAP${timestamp}${random}`;
  }

  // Gửi thông báo Telegram (lấy config từ Firebase để bảo mật token)
  async function sendTelegramNotification(message) {
    try {
      // Fetch Telegram config from Firestore (protected collection)
      const telegramDoc = await getDoc(doc(db, 'settings', 'telegram'));
      if (!telegramDoc.exists()) {
        console.error('Telegram config not found in Firestore');
        return;
      }
      
      const { botToken, chatId } = telegramDoc.data();
      if (!botToken || !chatId) {
        console.error('Telegram botToken or chatId missing');
        return;
      }
      
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });
    } catch (error) {
      console.error('Telegram notification error:', error);
    }
  }

  async function handleCreateDeposit() {
    const amount = parseInt(depositAmount);
    if (!amount || amount < 10000) {
      alert('Số tiền nạp tối thiểu là 10,000đ');
      return;
    }
    
    // Anti-spam: Check pending deposit limit (max 3 pending)
    const pendingDeposits = deposits.filter(d => d.status === 'pending');
    if (pendingDeposits.length >= 3) {
      alert('Bạn đã có 3 yêu cầu nạp tiền đang chờ xử lý. Vui lòng đợi admin xác nhận trước khi tạo yêu cầu mới.');
      return;
    }

    try {
      const orderId = generateOrderId();
      const depositData = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        amount: amount,
        orderId: orderId,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'deposits'), depositData);
      
      setCurrentDeposit({ ...depositData, amount });
      setShowQR(true);
    } catch (error) {
      console.error('Error creating deposit:', error);
      alert('Có lỗi xảy ra. Vui lòng thử lại!');
    }
  }

  function getSepayQRUrl() {
    if (!currentDeposit) return '';
    const { bankId, accountNo, template, accountName } = BANK_INFO;
    return `https://qr.sepay.vn/img?bank=${bankId}&acc=${accountNo}&template=${template}&amount=${currentDeposit.amount}&des=${currentDeposit.orderId}&accountName=${encodeURIComponent(accountName)}`;
  }



  return (
    <div className="wallet-page">
      <Navbar />

      {/* Success Toast */}
      {successMessage && (
        <div className="success-toast">
          {successMessage}
        </div>
      )}

      <div className="wallet-container">
        <div className="page-header">
          <Link to="/dashboard" className="back-link">← Quay lại</Link>
          <h1>💰 Nạp tiền</h1>
        </div>

        {/* Current Balance */}
        <div className="balance-section">
          <div className="balance-display">
            <span className="balance-label">Số dư hiện tại</span>
            <span className="balance-amount">{formatMoney(balance)}đ</span>
          </div>
        </div>

        {/* Deposit Form or QR */}
        {!showQR ? (
          <div className="deposit-form-section">
            <h2>Chọn số tiền nạp</h2>
            
            <div className="amount-presets">
              {[50000, 100000, 200000, 500000, 1000000].map(amount => (
                <button
                  key={amount}
                  className={`preset-btn ${depositAmount === amount.toString() ? 'active' : ''}`}
                  onClick={() => setDepositAmount(amount.toString())}
                >
                  {formatMoney(amount)}đ
                </button>
              ))}
            </div>

            <div className="custom-amount">
              <label>Hoặc nhập số tiền khác:</label>
              <div className="input-group">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Nhập số tiền"
                  min="10000"
                />
                <span className="currency">đ</span>
              </div>
            </div>

            <button 
              className="btn-create-deposit"
              onClick={handleCreateDeposit}
              disabled={!depositAmount || parseInt(depositAmount) < 10000}
            >
              Tạo lệnh nạp tiền
            </button>
          </div>
        ) : (
          <div className="qr-section">
            <h2>Quét mã QR để thanh toán</h2>
            
            <div className="qr-card">
              <img src={getSepayQRUrl()} alt="QR Code" className="qr-image" />
              
              <div className="payment-info">
                <div className="info-row">
                  <span className="label">Ngân hàng:</span>
                  <span className="value">MB Bank</span>
                </div>
                <div className="info-row">
                  <span className="label">Số tài khoản:</span>
                  <span className="value">{BANK_INFO.accountNo}</span>
                </div>
                <div className="info-row">
                  <span className="label">Chủ tài khoản:</span>
                  <span className="value">{BANK_INFO.accountName}</span>
                </div>
                <div className="info-row highlight">
                  <span className="label">Số tiền:</span>
                  <span className="value">{formatMoney(currentDeposit?.amount || 0)}đ</span>
                </div>
                <div className="info-row highlight">
                  <span className="label">Nội dung CK:</span>
                  <span className="value code">{currentDeposit?.orderId}</span>
                </div>
              </div>

              <div className="warning-box">
                ⚠️ Vui lòng chuyển <strong>đúng số tiền</strong> và <strong>đúng nội dung</strong> để được cộng tiền tự động!
              </div>
            </div>

            <button className="btn-back" onClick={() => { setShowQR(false); setCurrentDeposit(null); }}>
              ← Quay lại
            </button>
          </div>
        )}

        {/* Deposit History */}
        <div className="history-section">
          <h2>📜 Lịch sử nạp tiền</h2>
          
          {loading ? (
            <div className="loading">Đang tải...</div>
          ) : deposits.length === 0 ? (
            <p className="empty-text">Chưa có lịch sử nạp tiền</p>
          ) : (
            <div className="deposits-list">
              {deposits.map(deposit => (
                <div key={deposit.id} className="deposit-item">
                  <div className="deposit-info">
                    <div className="deposit-id">{deposit.orderId}</div>
                    <div className="deposit-date">
                      {deposit.createdAt?.toDate?.().toLocaleString('vi-VN') || 'N/A'}
                    </div>
                  </div>
                  <div className="deposit-amount">+{formatMoney(deposit.amount)}đ</div>
                  <div className={`deposit-status status-${deposit.status}`}>
                    {deposit.status === 'completed' ? '✅ Thành công' : 
                     deposit.status === 'rejected' ? '❌ Từ chối' : '⏳ Đang chờ'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
