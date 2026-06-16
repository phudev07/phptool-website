import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Layout/Navbar';

export default function Wallet() {
  const { currentUser, userProfile } = useAuth();
  const [balance, setBalance] = useState(0);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('100000');
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

  // Realtime user balance listener
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().balance || 0);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Realtime user deposits listener
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

      // Sort client-side by descending creation date
      depositsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      // Auto success toast on balance update
      if (currentDeposit && showQR) {
        const found = depositsData.find(d => d.orderId === currentDeposit.orderId);
        if (found && found.status === 'completed') {
          setSuccessMessage(`🎉 Nạp tiền thành công! +${formatMoney(found.amount)}đ`);
          setShowQR(false);
          setCurrentDeposit(null);
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

  async function handleCreateDeposit() {
    const amount = parseInt(depositAmount);
    if (!amount || amount < 10000) {
      alert('Số tiền nạp tối thiểu là 10.000đ');
      return;
    }
    
    // Limit pending request count
    const pendingDeposits = deposits.filter(d => d.status === 'pending');
    if (pendingDeposits.length >= 3) {
      alert('Bạn đang có 3 yêu cầu nạp tiền chưa xử lý. Vui lòng đợi admin xác nhận.');
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
      alert('Không thể tạo yêu cầu nạp. Vui lòng thử lại!');
    }
  }

  function getSepayQRUrl() {
    if (!currentDeposit) return '';
    const { bankId, accountNo, template, accountName } = BANK_INFO;
    return `https://qr.sepay.vn/img?bank=${bankId}&acc=${accountNo}&template=${template}&amount=${currentDeposit.amount}&des=${currentDeposit.orderId}&accountName=${encodeURIComponent(accountName)}`;
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Navbar />

      <main className="md:ml-sidebar-width pt-header-height min-h-screen">
        <div className="max-w-container-max mx-auto p-4 md:p-gutter pb-20">
          
          {/* Success Toast banner */}
          {successMessage && (
            <div className="fixed top-4 right-4 z-50 bg-[#dcfce7] border border-[#bbf7d0] text-[#166534] px-6 py-4 rounded-xl shadow-lg font-bold flex items-center gap-2 animate-slideIn">
              <span className="material-symbols-outlined">check_circle</span>
              {successMessage}
            </div>
          )}

          {/* Page Header */}
          <div className="mb-8">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Ví & Nạp Tiền</h2>
            <p className="font-body-md text-body-md text-secondary">Nạp tiền vào tài khoản để đăng ký các gói bản quyền.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Form / QR Code block */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Balance card */}
              <div className="bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white rounded-xl p-6 shadow-sm border border-[#c21a5b]/20 flex justify-between items-center">
                <div>
                  <div className="font-label-md text-label-md text-white/80 uppercase tracking-wider">Số dư hiện tại</div>
                  <h3 className="font-headline-xl text-headline-xl font-black mt-1 text-white">
                    {formatMoney(balance)}<span className="text-xl font-normal ml-0.5">đ</span>
                  </h3>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
                </div>
              </div>

              {/* Deposit creation box */}
              {!showQR ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold mb-4">Chọn số tiền muốn nạp</h3>
                  
                  {/* Preset list */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
                    {[50000, 100000, 200000, 500000, 1000000].map(amount => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setDepositAmount(amount.toString())}
                        className={`py-2 px-3 rounded-lg border text-sm font-semibold transition-all text-center ${depositAmount === amount.toString() ? 'border-[#c21a5b] bg-[#c21a5b]/5 text-[#c21a5b]' : 'border-outline-variant hover:bg-surface-container-low text-on-surface'}`}
                      >
                        {formatMoney(amount)}đ
                      </button>
                    ))}
                  </div>

                  {/* Input amount */}
                  <div className="mb-6">
                    <label className="block font-label-md text-label-md text-secondary mb-2">Hoặc tự nhập số tiền khác (Tối thiểu 10.000đ):</label>
                    <div className="relative">
                      <input 
                        type="number"
                        placeholder="Nhập số tiền"
                        className="w-full bg-surface border border-outline-variant rounded-lg py-3 px-4 pr-10 font-bold text-on-surface focus:outline-none focus:border-[#c21a5b] focus:ring-1 focus:ring-primary"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        min="10000"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-secondary">đ</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateDeposit}
                    disabled={!depositAmount || parseInt(depositAmount) < 10000}
                    className="w-full bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white font-label-md text-label-md py-3 rounded-lg hover:bg-on-primary-fixed-variant transition-colors flex items-center justify-center gap-1.5 font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined">add_circle</span>
                    Tạo Yêu Cầu Nạp Tiền
                  </button>
                </div>
              ) : (
                /* QR Scan detail block */
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Quét mã QR để chuyển khoản</h3>
                    <button 
                      onClick={() => { setShowQR(false); setCurrentDeposit(null); }}
                      className="text-[#c21a5b] hover:underline text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                      Chọn số tiền khác
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    
                    {/* QR block */}
                    <div className="bg-white p-4 rounded-xl border border-outline-variant flex flex-col items-center shadow-inner">
                      <img src={getSepayQRUrl()} alt="Sepay QR Code" className="w-56 h-56 object-contain" />
                      <div className="text-[10px] text-gray-500 font-mono-sm mt-2">Mã QR tự động chứa nội dung chuyển khoản</div>
                    </div>

                    {/* Text detail list */}
                    <div className="space-y-4 font-body-md text-body-md">
                      <div className="flex justify-between items-center pb-2 border-b border-outline-variant/60">
                        <span className="text-secondary">Ngân hàng:</span>
                        <span className="font-bold text-on-surface">MB Bank</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-outline-variant/60">
                        <span className="text-secondary">Số tài khoản:</span>
                        <span className="font-bold text-on-surface font-mono select-all">{BANK_INFO.accountNo}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-outline-variant/60">
                        <span className="text-secondary">Chủ tài khoản:</span>
                        <span className="font-bold text-on-surface uppercase">{BANK_INFO.accountName}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-outline-variant/60 bg-[#c21a5b]/5 px-2 py-1.5 rounded">
                        <span className="text-[#c21a5b] font-semibold">Số tiền:</span>
                        <span className="font-bold text-[#c21a5b] font-mono text-lg">{formatMoney(currentDeposit?.amount)}đ</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-outline-variant/60 bg-amber-500/5 px-2 py-1.5 rounded">
                        <span className="text-amber-700 font-semibold">Nội dung CK:</span>
                        <span className="font-bold text-amber-700 font-mono select-all text-base">{currentDeposit?.orderId}</span>
                      </div>
                    </div>

                  </div>

                  <div className="bg-amber-100 border border-amber-200 text-amber-800 p-4 rounded-lg text-xs leading-relaxed">
                    ⚠️ <strong>Lưu ý quan trọng:</strong> Quý khách vui lòng chuyển khoản <strong>chính xác số tiền</strong> và điền <strong>chính xác nội dung chuyển khoản</strong> ở trên để hệ thống tự động nhận diện và cộng tiền trong vòng 1-3 phút.
                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Deposit History list */}
            <div className="lg:col-span-4">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                <h3 className="font-headline-md text-headline-md text-on-surface font-bold mb-4">Lịch sử nạp tiền</h3>
                
                {deposits.length === 0 ? (
                  <p className="text-secondary text-sm py-4 text-center">Chưa có lịch sử nạp tiền nào.</p>
                ) : (
                  <div className="divide-y divide-outline-variant/60 max-h-[450px] overflow-y-auto pr-1">
                    {deposits.map(dep => (
                      <div key={dep.id} className="py-3 flex justify-between items-start gap-2">
                        <div>
                          <div className="font-mono text-xs font-bold text-on-surface">{dep.orderId}</div>
                          <div className="text-secondary text-[11px] mt-0.5">
                            {dep.createdAt?.toDate ? dep.createdAt.toDate().toLocaleString('vi-VN') : '-'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[#c21a5b]">+{formatMoney(dep.amount)}đ</div>
                          <div className={`text-[10px] font-semibold mt-0.5 ${dep.status === 'completed' ? 'text-emerald-600' : dep.status === 'rejected' ? 'text-error' : 'text-amber-600'}`}>
                            {dep.status === 'completed' ? 'Thành công' : dep.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
