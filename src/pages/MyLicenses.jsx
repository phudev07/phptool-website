import { useState, useEffect } from'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, setDoc, serverTimestamp } from'firebase/firestore';
import { db } from'../services/firebase';
import { useAuth } from'../contexts/AuthContext';
import Navbar from'../components/Layout/Navbar';
import { getProducts } from'../services/productsService';

export default function MyLicenses() {
 const { currentUser } = useAuth();
 const [licenses, setLicenses] = useState([]);
 const [productsMap, setProductsMap] = useState({});
 const [selectedLicense, setSelectedLicense] = useState(null);
 const [loading, setLoading] = useState(true);
 
 // HWID input for each license
 const [hwidInput, setHwidInput] = useState('');
 const [activating, setActivating] = useState(false);
 const [resetting, setResetting] = useState(false);
 const [showInstructions, setShowInstructions] = useState(false);
 const [copiedKey, setCopiedKey] = useState(false);
 const [secureDownloadUrl, setSecureDownloadUrl] = useState('');

 useEffect(() => {
 async function loadData() {
 if (!currentUser) return;
 setLoading(true);
 try {
 // 1. Fetch products to get latest downloadUrls and versions
 const productsList = await getProducts();
 const pMap = {};
 productsList.forEach(p => {
 pMap[p.id] = p;
 });
 setProductsMap(pMap);

 // 2. Fetch licenses for current user
 const q = query(
 collection(db,'licenses'),
 where('userId','==', currentUser.uid)
 );
 const snapshot = await getDocs(q);
 const licensesData = snapshot.docs.map(doc => ({
 id: doc.id,
 ...doc.data(),
 licenseKey: doc.data().licenseKey || doc.data().key
 }));
 
 // Sort descending by creation date
 licensesData.sort((a, b) => {
 const dateA = a.createdAt?.toDate?.() || new Date(0);
 const dateB = b.createdAt?.toDate?.() || new Date(0);
 return dateB - dateA;
 });

 // 3. Fetch active tools mapping
 const activeToolsSnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'active_tools'));
 const activeToolsSet = new Set(activeToolsSnapshot.docs.map(d => d.id));

 // Backward compatibility: verify active_tools records for any active licenses
 try {
   const activeLicenses = licensesData.filter(l => l.status === 'active');
   for (const lic of activeLicenses) {
     if (!activeToolsSet.has(lic.productId)) {
       const activeToolRef = doc(db, 'users', currentUser.uid, 'active_tools', lic.productId);
       await setDoc(activeToolRef, { 
         active: true, 
         licenseId: lic.id, 
         updatedAt: serverTimestamp() 
       });
       activeToolsSet.add(lic.productId);
     }
   }
 } catch (err) {
   console.error("Error updating active tools for backward compatibility:", err);
 }

  // Add virtual licenses for tools owned via active_tools but having no key (requireHwid === false)
  activeToolsSnapshot.docs.forEach(d => {
    const prodId = d.id;
    const activeData = d.data();
    const alreadyListed = licensesData.some(l => l.productId === prodId);
    const prod = pMap[prodId];
    if (!alreadyListed && activeData.active === true && prod?.requireHwid === false) {
      licensesData.push({
        id: `virtual_${prodId}`,
        userId: currentUser.uid,
        productId: prodId,
        productName: prod?.name || prodId,
        licenseKey: 'Không yêu cầu (Direct Run)',
        plan: activeData.plan || 'lifetime',
        planName: activeData.plan === 'lifetime' ? 'Vĩnh viễn' : (activeData.plan === 'monthly' ? 'Gói tháng' : 'Gói của bạn'),
        price: 0,
        status: 'active',
        hwid: null,
        expiresAt: null,
        createdAt: activeData.updatedAt || null
      });
    }
  });

 // Re-sort including virtual licenses
 licensesData.sort((a, b) => {
   const dateA = a.createdAt?.toDate?.() || new Date(0);
   const dateB = b.createdAt?.toDate?.() || new Date(0);
   return dateB - dateA;
 });

 setLicenses(licensesData);

 // Auto-select license if productId is passed in query string
 const urlParams = new URLSearchParams(window.location.search);
 const targetProdId = urlParams.get('productId');
 if (targetProdId) {
   const matchedLic = licensesData.find(l => l.productId === targetProdId);
   if (matchedLic) {
     setSelectedLicense(matchedLic);
     setHwidInput(matchedLic.hwid || '');
     // Fetch secure URL
     try {
       const secureDocRef = doc(db, 'products_secure', matchedLic.productId);
       const secureDocSnap = await getDoc(secureDocRef);
       if (secureDocSnap.exists()) {
         setSecureDownloadUrl(secureDocSnap.data().downloadUrl || '');
       }
     } catch (err) {
       console.error("Error fetching secure download URL on auto-select:", err);
     }
   } else {
     setSelectedLicense(null);
     setHwidInput('');
   }
 } else {
   setSelectedLicense(null);
   setHwidInput('');
 }
 } catch (error) {
 console.error('Error fetching user licenses:', error);
 }
 setLoading(false);
 }
 loadData();
 }, [currentUser]);

 function formatMoney(amount) {
 return new Intl.NumberFormat('vi-VN').format(amount);
 }

 function getPlanLabel(lic) {
  if (lic.planName) return lic.planName;
  if (lic.plan === 'lifetime') return 'Vĩnh viễn';
  if (lic.plan === 'free') return 'Miễn phí';
  if (lic.plan === 'daily') return 'Theo ngày';
  if (lic.plan === 'monthly') return 'Gói tháng';
  return 'Gói tháng';
 }

 function getExpiryStatus(license) {
 if (license.status ==='revoked') return { text:'Đã thu hồi', class:'bg-error-container text-error border-error/20' };
 if (license.plan ==='lifetime') return { text:'Vĩnh viễn', class:'bg-[#dcfce7] text-[#166534] border-[#bbf7d0]' };

 const now = new Date();
 const expiry = license.expiresAt?.toDate?.() || (license.expiresAt ? new Date(license.expiresAt) : null);

 if (!expiry) {
 return { text:'Đang hoạt động', class:'bg-[#dcfce7] text-[#166534] border-[#bbf7d0]' };
 }

 if (now >= expiry) return { text:'Hết hạn', class:'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]' };
 
 const diff = expiry - now;
 const days = Math.floor(diff / (1000 * 60 * 60 * 24));
 
 if (days <= 3) return { text: `Còn ${days} ngày`, class:'bg-amber-100 text-amber-800 border-amber-200' };
 return { text:'Đang hoạt động', class:'bg-[#dcfce7] text-[#166534] border-[#bbf7d0]' };
 }

 function copyToClipboard(text) {
 navigator.clipboard.writeText(text);
 setCopiedKey(true);
 setTimeout(() => setCopiedKey(false), 2000);
 }

  async function handleActivateHwid() {
    if (!selectedLicense || !hwidInput.trim()) return;
    setActivating(true);
    try {
      const docRef = doc(db,'licenses', selectedLicense.id);
      const updatePayload = {
        hwid: hwidInput.trim()
      };
      if (selectedLicense.status !== 'active') {
        updatePayload.status = 'active';
      }
      await updateDoc(docRef, updatePayload);

      // Update state
      const updatedLicenses = licenses.map(l => {
        if (l.id === selectedLicense.id) {
          const updated = { ...l, hwid: hwidInput.trim(), status:'active' };
          setSelectedLicense(updated);
          return updated;
        }
        return l;
      });
      setLicenses(updatedLicenses);
      alert('Đã kích hoạt HWID thành công!');
    } catch (error) {
      console.error('Error activating HWID:', error);
      alert('Kích hoạt thất bại:' + error.message);
    }
    setActivating(false);
  }

  async function handleResetHwid() {
    if (!selectedLicense) return;

    const hwidHistory = selectedLicense.hwidHistory || [];
    const limit = selectedLicense.plan === 'lifetime' ? 6 : 3;
    
    // Count resets in last 30 days
    const resetsInLast30Days = hwidHistory.filter(entry => {
      if (!entry) return false;
      if (typeof entry === 'string') return true; // Legacy format
      const resetDate = entry.resetAt ? new Date(entry.resetAt) : new Date(0);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return resetDate >= thirtyDaysAgo;
    }).length;

    if (resetsInLast30Days >= limit) {
      alert(`Bạn đã đạt giới hạn đổi máy tối đa (${limit} lần / tháng). Vui lòng liên hệ Admin để được hỗ trợ.`);
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn reset HWID cho key này? (Giới hạn: đổi tối đa ${limit} lần / tháng. Trong 30 ngày qua bạn đã đổi ${resetsInLast30Days} lần)`)) return;
    setResetting(true);
    try {
      const currentHwid = selectedLicense.hwid;
      const updatedHistory = [...hwidHistory];
      if (currentHwid) {
        updatedHistory.push({
          hwid: currentHwid,
          resetAt: new Date().toISOString()
        });
      }

      const docRef = doc(db,'licenses', selectedLicense.id);
      await updateDoc(docRef, {
        hwid: null,
        hwidHistory: updatedHistory
      });

      // Update state
      const updatedLicenses = licenses.map(l => {
        if (l.id === selectedLicense.id) {
          const updated = { ...l, hwid: null, hwidHistory: updatedHistory };
          setSelectedLicense(updated);
          setHwidInput('');
          return updated;
        }
        return l;
      });
      setLicenses(updatedLicenses);
      alert('Đã reset HWID thành công! Bạn có thể gán HWID thiết bị mới.');
    } catch (error) {
      console.error('Error resetting HWID:', error);
      alert('Reset thất bại: ' + error.message);
    }
    setResetting(false);
  }

 async function handleSelectLicense(lic) {
    setSelectedLicense(lic);
    setHwidInput(lic.hwid ||'');
    setShowInstructions(false);
    setSecureDownloadUrl('');

    if (lic && lic.productId) {
      try {
        const secureDocRef = doc(db, 'products_secure', lic.productId);
        const secureDocSnap = await getDoc(secureDocRef);
        if (secureDocSnap.exists()) {
          setSecureDownloadUrl(secureDocSnap.data().downloadUrl || '');
        }
      } catch (err) {
        console.error("Error fetching secure download URL:", err);
      }
    }
 }

 const selectedProduct = selectedLicense ? productsMap[selectedLicense.productId] : null;

 return (
 <div className="min-h-screen bg-background text-on-background">
 <Navbar />

 <main className="md:ml-sidebar-width pt-header-height min-h-screen bg-background">
 <div className="max-w-container-max mx-auto p-4 md:p-gutter">
 
 <div className="mb-8">
 <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Quản lý Tool</h2>
 <p className="font-body-lg text-body-lg text-secondary">Quản lý danh sách phần mềm đã mua và kích hoạt bản quyền.</p>
 </div>

 {loading ? (
 <div className="flex flex-col items-center justify-center py-20">
 <div className="w-10 h-10 border-4 border-[#c21a5b] border-t-transparent rounded-full animate-spin"></div>
 <p className="text-secondary mt-4">Đang tải giấy phép sử dụng...</p>
 </div>
 ) : licenses.length === 0 ? (
 <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant rounded-xl max-w-xl mx-auto">
 <span className="material-symbols-outlined text-[64px] text-secondary mb-3">vpn_key</span>
 <h3 className="text-lg font-bold text-on-surface mb-1">Chưa mua bản quyền nào</h3>
 <p className="text-secondary mb-6 text-sm">Bạn chưa sở hữu bản quyền tool nào của chúng tôi.</p>
 <a href="/" className="bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white font-label-md text-label-md px-6 py-2.5 rounded-lg hover:bg-on-primary-fixed-variant transition-colors shadow-sm">
 Mua Tool Ngay
 </a>
 </div>
 ) : !selectedLicense ? (
 /* Purchase/Order History Table View */
 <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
 <div className="p-6 border-b border-outline-variant bg-surface-container-low/50">
 <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Đơn hàng của bạn</h3>
 <p className="text-secondary text-sm mt-1">Lịch sử giao dịch và kích hoạt HWID cho các phần mềm đã mua.</p>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-surface-container-low border-b border-outline-variant font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-xs">
 <th className="px-6 py-4">Tên Tool</th>
 <th className="px-6 py-4">Gói</th>
 <th className="px-6 py-4">Ngày mua</th>
 <th className="px-6 py-4">Hạn dùng</th>
 <th className="px-6 py-4">Trạng thái</th>
 <th className="px-6 py-4 text-center">Thao tác</th>
 </tr>
 </thead>
 <tbody className="font-body-md text-body-md divide-y divide-outline-variant text-sm text-on-surface">
 {licenses.map(lic => {
 const prod = productsMap[lic.productId];
 const status = getExpiryStatus(lic);
 const purchaseDate = lic.createdAt?.toDate?.().toLocaleDateString('vi-VN') ||'N/A';
 const expiryDate = lic.plan ==='lifetime' ?'Vĩnh viễn' : lic.expiresAt?.toDate?.().toLocaleDateString('vi-VN') ||'N/A';

 return (
 <tr key={lic.id} className="hover:bg-surface-container-low/30 transition-colors">
 <td className="px-6 py-4 font-semibold flex items-center gap-3">
 <div className="w-8 h-8 rounded overflow-hidden flex items-center justify-center shrink-0 border border-outline-variant bg-surface-container">
    {prod?.image ? (
      <img src={prod.image} alt={prod?.name} className="w-full h-full object-fill" />
    ) : (
      <div className="w-full h-full bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white flex items-center justify-center font-bold">
        <span className="material-symbols-outlined text-[18px]">
          {prod?.icon ||'terminal'}
        </span>
      </div>
    )}
  </div>
 <span>{prod?.name || lic.productName || lic.productId}</span>
 </td>
 <td className="px-6 py-4 uppercase font-bold text-xs">
 {getPlanLabel(lic)}
 </td>
 <td className="px-6 py-4 text-secondary">
 {purchaseDate}
 </td>
 <td className="px-6 py-4 text-secondary">
 {expiryDate}
 </td>
 <td className="px-6 py-4">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${status.class}`}>
 {status.text}
 </span>
 </td>
 <td className="px-6 py-4 text-center">
 <button
 onClick={() => handleSelectLicense(lic)}
 className="bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white font-label-md text-xs px-4 py-2 rounded-lg hover:opacity-95 transition-all shadow-sm font-bold"
 >
 Chi tiết
 </button>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 
 {/* Left Column: Detailed View of Selected License */}
 <div className="lg:col-span-8 space-y-6">
 {selectedLicense && (
 <div className="bg-surface-bright border border-outline-variant rounded-xl p-6 shadow-sm">
 
 {/* Back to list button */}
 <button 
 onClick={() => setSelectedLicense(null)} 
 className="flex items-center gap-2 text-secondary hover:text-[#c21a5b] transition-colors mb-6 font-semibold text-sm focus:outline-none"
 >
 <span className="material-symbols-outlined text-[18px]">arrow_back</span>
 Quay lại danh sách đơn hàng
 </button>

 {/* Header */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-outline-variant/60">
 <div className="flex items-center gap-4">
 <div className="w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-outline-variant bg-surface-container">
    {selectedProduct?.image ? (
      <img src={selectedProduct.image} alt={selectedProduct?.name} className="w-full h-full object-fill" />
    ) : (
      <div className="w-full h-full bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white flex items-center justify-center font-bold">
        <span className="material-symbols-outlined text-3xl">
          {selectedProduct?.icon ||'terminal'}
        </span>
      </div>
    )}
  </div>
 <div>
 <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
 {selectedProduct?.name || selectedLicense.productName ||'Bản quyền phần mềm'}
 </h3>
 <p className="font-body-md text-body-md text-secondary mt-1">
 {selectedProduct?.tagline ||'Phiên bản chuyên nghiệp'}
 </p>
 </div>
 </div>
 <span className={`px-3 py-1 rounded-full font-label-md text-label-md border flex items-center gap-1 ${getExpiryStatus(selectedLicense).class}`}>
 {getExpiryStatus(selectedLicense).text}
 </span>
 </div>

 {/* Usage Info Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
 <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
 <div className="font-label-md text-label-md text-secondary mb-1">Gói</div>
 <div className="font-body-lg text-body-lg text-on-surface font-bold uppercase">
 {getPlanLabel(selectedLicense)}
 </div>
 </div>
 <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
 <div className="font-label-md text-label-md text-secondary mb-1">Hạn dùng</div>
 <div className="font-body-lg text-body-lg text-on-surface font-bold">
 {selectedLicense.plan ==='lifetime' ?'Vĩnh viễn' : selectedLicense.expiresAt?.toDate?.().toLocaleDateString('vi-VN') ||'N/A'}
 </div>
 </div>
 <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
 <div className="font-label-md text-label-md text-secondary mb-1">Thiết bị</div>
 <div className="font-body-lg text-body-lg text-on-surface font-bold">
 {selectedProduct?.requireHwid === false ? 'Không yêu cầu' : (selectedLicense.hwid ? '1/1 PC (Đã gắn)' : '0/1 PC (Chưa gắn)')}
 </div>
 </div>
 </div>

 {/* Download Section */}
 <div className="mb-8">
 <h4 className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-4">Tải về &amp; Cài đặt</h4>
 <div className="flex flex-col sm:flex-row gap-4">
 <a 
 href={secureDownloadUrl ||'#'} 
 target="_blank" 
 rel="noopener noreferrer"
 className={`flex-1 font-label-md text-label-md py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm text-center ${secureDownloadUrl ?'bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white hover:opacity-95' :'bg-surface-container-high text-secondary cursor-not-allowed border border-outline-variant'}`}
 onClick={(e) => !secureDownloadUrl && e.preventDefault()}
 >
 <span className="material-symbols-outlined">download</span>
 Tải phần mềm {selectedProduct?.version ? `v${selectedProduct.version}` :''}
 </a>
 <button 
 onClick={() => setShowInstructions(!showInstructions)}
 className="flex-1 bg-surface text-[#c21a5b] border border-[#c21a5b] font-label-md text-label-md py-3 px-6 rounded-lg flex items-center justify-center gap-2 hover:bg-surface-container transition-colors"
 >
 <span className="material-symbols-outlined">menu_book</span>
 {showInstructions ?'Đóng hướng dẫn' :'Hướng dẫn sử dụng'}
 </button>
 </div>

 {/* Expanded In-place Instructions */}
 {showInstructions && (
 <div className="mt-4 p-5 bg-surface-container-low border border-outline-variant rounded-xl space-y-4 animate-fadeIn">
 <h5 className="font-label-md text-label-md text-on-surface font-bold">📋 Các bước kích hoạt tool:</h5>
 {selectedProduct?.requireHwid === false ? (
    <ol className="list-decimal pl-5 space-y-2 text-on-surface-variant font-body-md">
      <li>Nhấn nút <strong>Tải phần mềm</strong> ở trên để tải file nén.</li>
      <li>Giải nén ra thư mục trên máy tính của bạn.</li>
      <li>Mở phần mềm lên và bắt đầu sử dụng trực tiếp mà không cần kích hoạt thiết bị!</li>
    </ol>
  ) : (
    <ol className="list-decimal pl-5 space-y-2 text-on-surface-variant font-body-md">
      <li>Nhấn nút <strong>Tải phần mềm</strong> ở trên để tải file nén.</li>
      <li>Giải nén và chạy file thực thi client của tool.</li>
      <li>Tool khi chạy lên sẽ tự động hiển thị <strong>HWID (Hardware ID)</strong> của máy bạn. Copy dòng HWID đó.</li>
      <li>Quay lại trang này, dán HWID vào ô <strong>HWID (Hardware ID)</strong> bên dưới và nhấn <strong>Kích hoạt</strong>.</li>
      <li>Khởi động lại tool trên máy tính để bắt đầu sử dụng!</li>
    </ol>
  )}
 
 {selectedProduct?.videoTutorial && (
 <div className="pt-4 border-t border-outline-variant/60">
 <h5 className="font-label-md text-label-md text-on-surface font-bold mb-3">🎥 Video hướng dẫn chi tiết:</h5>
 <div className="aspect-video w-full rounded-lg overflow-hidden border border-outline-variant bg-surface-container">
 <iframe 
 src={selectedProduct.videoTutorial} 
 title="YouTube video player" 
 className="w-full h-full border-none" 
 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
 allowFullScreen
 />
 </div>
 </div>
 )}
 </div>
 )}
 </div>

 {/* License/HWID Section */}
 <div>
 <h4 className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-4">Quản lý Bản quyền</h4>
  <div className="space-y-4">
  {selectedProduct?.requireHwid === false ? (
    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
      <div className="flex items-center gap-2 font-bold mb-1">
        <span className="material-symbols-outlined text-emerald-400">check_circle</span>
        <span>Phần mềm không yêu cầu HWID</span>
      </div>
      <p className="text-xs text-secondary mt-1">
        Giấy phép này có thể sử dụng trên nhiều máy tính cùng một lúc mà không bị giới hạn phần cứng. Bạn chỉ cần tải phần mềm về và mở lên chạy trực tiếp.
      </p>
    </div>
  ) : (
    <div>
      {/* HWID Binding */}
      <div className="space-y-2">
      <label className="block font-label-md text-label-md text-secondary mb-2 flex justify-between">
      <span>HWID (Hardware ID)</span>
      <button onClick={() => setShowInstructions(true)} className="text-[#c21a5b] hover:underline text-xs">
      Cách lấy HWID?
      </button>
      </label>

      {selectedLicense.hwid ? (
      /* Bound HWID State */
      <div className="flex flex-col sm:flex-row gap-3">
      <input 
      className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg py-3 px-4 font-mono-sm text-mono-sm text-secondary" 
      readOnly 
      type="text" 
      value={selectedLicense.hwid}
      />
      <button 
      onClick={handleResetHwid}
      disabled={resetting}
      className="bg-error text-on-error font-label-md text-label-md py-3 px-6 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
      >
      {resetting ? (
      <div className="w-5 h-5 border-2 border-on-error border-t-transparent rounded-full animate-spin"></div>
      ) : (
      <>
      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
      Reset HWID
      </>
      )}
      </button>
      </div>
      ) : (
      /* Unbound HWID State: Activate input */
      <div className="flex gap-3">
      <input 
      className="flex-1 bg-surface border border-outline-variant rounded-lg py-3 px-4 font-mono-sm text-mono-sm text-on-surface focus:outline-none focus:border-[#c21a5b] focus:ring-1 focus:ring-primary" 
      placeholder="Dán HWID máy tính của bạn vào đây..." 
      type="text"
      value={hwidInput}
      onChange={(e) => setHwidInput(e.target.value)}
      />
      <button 
      onClick={handleActivateHwid}
      disabled={activating || !hwidInput.trim()}
      className="bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white font-label-md text-label-md py-3 px-6 rounded-lg hover:bg-on-primary-fixed-variant transition-colors whitespace-nowrap disabled:bg-surface-container-high disabled:text-secondary disabled:cursor-not-allowed flex items-center justify-center"
      >
      {activating ? (
      <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
      ) : (
      'Kích hoạt'
      )}
      </button>
      </div>
      )}

      <p className="font-body-md text-body-md text-secondary mt-2 text-xs">
      Lưu ý: Sau khi kích hoạt HWID, giấy phép sẽ được khóa cố định vào thiết bị này. Nếu cần đổi thiết bị khác, hãy nhấn nút <strong>Reset HWID</strong> trước khi gán.
      {selectedLicense.plan && (
        <span className="block mt-1 text-[#c21a5b] font-semibold">
          Số lần đổi máy còn lại trong 30 ngày: {Math.max(0, (selectedLicense.plan === 'lifetime' ? 6 : 3) - (selectedLicense.hwidHistory || []).filter(entry => {
            if (!entry) return false;
            if (typeof entry === 'string') return true;
            const resetDate = entry.resetAt ? new Date(entry.resetAt) : new Date(0);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return resetDate >= thirtyDaysAgo;
          }).length)} / {selectedLicense.plan === 'lifetime' ? 6 : 3} lần.
        </span>
      )}
      </p>
      </div>
    </div>
  )}
  </div>
  </div>
  </div>
  )}
  </div>

 {/* Right Column: Other purchased tools list */}
 <div className="lg:col-span-4 space-y-4">
 <h3 className="font-label-md text-label-md text-secondary uppercase tracking-wider mb-2">Bản quyền của bạn</h3>
 <div className="flex flex-col gap-3">
 {licenses.map(lic => {
 const prod = productsMap[lic.productId];
 const isSelected = selectedLicense?.id === lic.id;
 const status = getExpiryStatus(lic);

 return (
 <div 
 key={lic.id} 
 onClick={() => handleSelectLicense(lic)}
 className={`border rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all group ${isSelected ?'bg-surface-container-lowest border-[#c21a5b] shadow-sm' :'bg-surface-bright border-outline-variant hover:border-[#c21a5b] hover:bg-surface-container-lowest'}`}
 >
 <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-outline-variant bg-surface-container">
    {prod?.image ? (
      <img src={prod.image} alt={prod?.name} className="w-full h-full object-fill" />
    ) : (
      <div className="w-full h-full bg-gradient-to-r from-[#c21a5b] to-[#571477]/10 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[#c21a5b] text-xl">
          {prod?.icon ||'terminal'}
        </span>
      </div>
    )}
  </div>
 <div className="flex-1 min-w-0">
 <h4 className="font-label-md text-label-md text-on-surface font-bold truncate group-hover:text-[#c21a5b] transition-colors">
 {prod?.name || lic.productName ||'Bản quyền tool'}
 </h4>
 <div className="flex items-center gap-1.5 mt-1 flex-wrap">
 <span className="font-body-md text-body-md text-secondary text-xs">
 {lic.plan ==='lifetime' ?'Vĩnh viễn' : `Hạn: ${lic.expiresAt?.toDate?.().toLocaleDateString('vi-VN') ||'N/A'}`}
 </span>
 <span className="w-1 h-1 bg-outline-variant rounded-full"></span>
 <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${status.class}`}>
 {status.text}
 </span>
 </div>
 </div>
 <span className="material-symbols-outlined text-outline-variant group-hover:text-[#c21a5b] transition-colors">
 chevron_right
 </span>
 </div>
 );
 })}
 </div>
 </div>

 </div>
 )}

 </div>
 </main>
 </div>
 );
}
