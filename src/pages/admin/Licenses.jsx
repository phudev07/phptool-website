import { useState, useEffect } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, limit, startAfter, getCountFromServer, where, documentId, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Navbar from '../../components/Layout/Navbar';
import { getProducts } from '../../services/productsService';

function generateKey() {
 const chars ='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
 const segments = [];
 for (let i = 0; i < 4; i++) {
 let segment ='';
 for (let j = 0; j < 4; j++) {
 segment += chars.charAt(Math.floor(Math.random() * chars.length));
 }
 segments.push(segment);
 }
 return segments.join('-');
}

export default function AdminLicenses() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [licenses, setLicenses] = useState([]);
  const [users, setUsers] = useState({});
  const [products, setProducts] = useState([]);
  const [productsMap, setProductsMap] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null);
  const [editDateInput, setEditDateInput] = useState('');
  const [editIsLifetime, setEditIsLifetime] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [toolFilter, setToolFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [newLicense, setNewLicense] = useState({
    productId: 'regfb',
    userId: '',
    hwid: '',
    expiryDate: '',
    isLifetime: false
  });

  // Pagination states
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // User search states for modal
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Reset user search states when modal is closed
  useEffect(() => {
    if (!showModal) {
      setUserSearchTerm('');
      setSearchedUsers([]);
    }
  }, [showModal]);

  // Debounced user search inside modal
  useEffect(() => {
    if (userSearchTerm.trim().length < 2) {
      setSearchedUsers([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const termLower = userSearchTerm.toLowerCase().trim();
        const termCapitalized = termLower.charAt(0).toUpperCase() + termLower.slice(1);
        const termUpper = userSearchTerm.toUpperCase().trim();
        
        const queryTerms = Array.from(new Set([termLower, termCapitalized, termUpper]));
        
        // Fetch matching users in parallel across possible case prefixes
        const promises = queryTerms.map(term => {
          const q = query(
            collection(db, 'users'),
            where('email', '>=', term),
            where('email', '<=', term + '\uf8ff'),
            limit(5)
          );
          return getDocs(q);
        });
        
        const snaps = await Promise.all(promises);
        const resultsMap = {};
        
        snaps.forEach(snap => {
          snap.docs.forEach(doc => {
            resultsMap[doc.id] = { id: doc.id, ...doc.data() };
          });
        });
        
        const results = Object.values(resultsMap).slice(0, 5);
        setSearchedUsers(results);
      } catch (error) {
        console.error('Error searching users:', error);
      }
      setIsSearchingUsers(false);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [userSearchTerm]);

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
      // 1. Fetch products
      const productsList = await getProducts();
      const hwidProducts = productsList.filter(p => p.requireHwid !== false);
      setProducts(hwidProducts);
      const pMap = {};
      productsList.forEach(p => {
        pMap[p.id] = p;
      });
      setProductsMap(pMap);
      if (hwidProducts.length > 0) {
        setNewLicense(prev => ({ ...prev, productId: hwidProducts[0].id }));
      }

      // 2. Fetch total count
      const countSnap = await getCountFromServer(collection(db, 'licenses'));
      setTotalCount(countSnap.data().count);

      // 3. Fetch licenses
      const q = query(collection(db, 'licenses'), orderBy('createdAt', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const licensesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLicenses(licensesData);

      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 50);
      } else {
        setHasMore(false);
      }

      // 4. Fetch users for these licenses only
      const userIds = licensesData.map(l => l.userId);
      const updatedUsersMap = await fetchUsersForIds(userIds, {});
      setUsers(updatedUsersMap);
    } catch (error) {
      console.error('Error fetching admin license data:', error);
    }
    setLoading(false);
  }

  async function handleLoadMore() {
    if (!lastVisible || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(collection(db, 'licenses'), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(50));
      const snapshot = await getDocs(q);
      const newLicenses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLicenses(prev => [...prev, ...newLicenses]);

      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 50);
      } else {
        setHasMore(false);
      }

      // Fetch users for new licenses
      const userIds = newLicenses.map(l => l.userId);
      const updatedUsersMap = await fetchUsersForIds(userIds, users);
      setUsers(updatedUsersMap);
    } catch (error) {
      console.error('Error loading more licenses:', error);
    }
    setLoadingMore(false);
  }

 async function handleCreateLicense() {
 try {
 let expiresAt = null;
 if (!newLicense.isLifetime && newLicense.expiryDate) {
 expiresAt = new Date(newLicense.expiryDate);
 expiresAt.setHours(23, 59, 59, 999);
 }

 const hasHwid = newLicense.hwid && newLicense.hwid.trim() !=='';
 const isLinkedUser = newLicense.userId && newLicense.userId !=='';

 const targetProduct = productsMap[newLicense.productId];

 const licenseData = {
 licenseKey: generateKey(),
 productId: newLicense.productId,
 productName: targetProduct?.name ||'Unknown Tool',
 plan: newLicense.isLifetime ?'lifetime' :'custom',
 planName: newLicense.isLifetime ?'Vĩnh viễn' :'Gói tùy chỉnh',
 status: hasHwid || isLinkedUser ?'active' :'pending',
 userId: isLinkedUser ? newLicense.userId : null,
 userEmail: isLinkedUser ? users[newLicense.userId]?.email : null,
 hwid: hasHwid ? newLicense.hwid.trim() : null,
 ...(targetProduct?.requireDeviceBinding === true ? { devicePublicKey: null } : {}),
 hwidHistory: [],
 createdAt: serverTimestamp(),
 activatedAt: hasHwid || isLinkedUser ? serverTimestamp() : null,
 expiresAt: expiresAt
 };

 const docRef = await addDoc(collection(db,'licenses'), licenseData);

  if (isLinkedUser) {
    try {
      const activeToolRef = doc(db, 'users', newLicense.userId, 'active_tools', newLicense.productId);
      await setDoc(activeToolRef, { 
        active: true, 
        licenseId: docRef.id, 
        updatedAt: serverTimestamp() 
      });
    } catch (err) {
      console.error("Error setting active tool link:", err);
    }
  }
 
 setLicenses([{ id: docRef.id, ...licenseData, createdAt: new Date() }, ...licenses]);
 setShowModal(false);
 setNewLicense({
 productId: products[0]?.id ||'regfb',
 userId:'',
 hwid:'',
 expiryDate:'',
 isLifetime: false
 });
 } catch (error) {
 console.error('Error creating license:', error);
 alert('Không thể tạo license:' + error.message);
 }
 }

 function openEditDateModal(license) {
 setEditingLicense(license);
 setEditIsLifetime(license.plan ==='lifetime');
 if (license.expiresAt) {
 const expDate = license.expiresAt.toDate ? license.expiresAt.toDate() : new Date(license.expiresAt);
 const year = expDate.getFullYear();
 const month = String(expDate.getMonth() + 1).padStart(2,'0');
 const day = String(expDate.getDate()).padStart(2,'0');
 setEditDateInput(`${year}-${month}-${day}`);
 } else {
 setEditDateInput('');
 }
 setShowEditModal(true);
 }

 async function handleSaveExpiryDate() {
 if (!editingLicense) return;
 try {
 let expiresAt = null;
 if (!editIsLifetime && editDateInput) {
 expiresAt = new Date(editDateInput);
 expiresAt.setHours(23, 59, 59, 999);
 }

 const updatedFields = {
 plan: editIsLifetime ?'lifetime' :'custom',
 planName: editIsLifetime ?'Vĩnh viễn' :'Gói tùy chỉnh',
 expiresAt: expiresAt
 };

 // If the license had expired and we extend it, set status to active
 if (editingLicense.status ==='expired' && (editIsLifetime || (expiresAt && expiresAt > new Date()))) {
 updatedFields.status ='active';
 }

 await updateDoc(doc(db,'licenses', editingLicense.id), updatedFields);

 setLicenses(licenses.map(l => {
 if (l.id === editingLicense.id) {
 return { ...l, ...updatedFields };
 }
 return l;
 }));

 setShowEditModal(false);
 alert('Đã cập nhật ngày hết hạn thành công!');
 } catch (error) {
 console.error('Error saving expiry date:', error);
 alert('Không thể cập nhật:' + error.message);
 }
 }

 async function handleToggleStatus(licenseId, currentStatus) {
 const newStatus = currentStatus ==='active' ?'revoked' :'active';
 try {
 await updateDoc(doc(db,'licenses', licenseId), { status: newStatus });
 setLicenses(licenses.map(l => l.id === licenseId ? { ...l, status: newStatus } : l));
 } catch (error) {
 console.error('Error updating status:', error);
 }
 }

 async function handleResetHWID(licenseId, currentHwid) {
 try {
 const license = licenses.find(l => l.id === licenseId);
 const hwidHistory = license.hwidHistory || [];
 if (currentHwid) {
 hwidHistory.push(currentHwid);
 }
 
 const updatePayload = {
 hwid: null,
 hwidHistory: hwidHistory
 };
 if (license?.productId && productsMap[license.productId]?.requireDeviceBinding === true) {
   updatePayload.devicePublicKey = null;
 }
 await updateDoc(doc(db,'licenses', licenseId), updatePayload);
 setLicenses(licenses.map(l => l.id === licenseId ? { ...l, ...updatePayload } : l));
 alert('Reset HWID thành công!');
 } catch (error) {
 console.error('Error resetting HWID:', error);
 }
 }

  async function handleDeleteLicense(licenseId) {
    if (!window.confirm('Bạn có chắc chắn muốn xóa key này? Giao dịch này sẽ thu hồi quyền sở hữu tải tool của user.')) return;
    try {
      // Find the license details first
      const licenseToDelete = licenses.find(l => l.id === licenseId);
      
      // Delete the license doc
      await deleteDoc(doc(db, 'licenses', licenseId));
      
      // If the license is linked to a user, delete the active_tools document too
      if (licenseToDelete && licenseToDelete.userId) {
        try {
          const activeToolRef = doc(db, 'users', licenseToDelete.userId, 'active_tools', licenseToDelete.productId);
          await deleteDoc(activeToolRef);
        } catch (activeToolErr) {
          console.error('Error deleting active tool mapping:', activeToolErr);
        }
      }
      
      setLicenses(licenses.filter(l => l.id !== licenseId));
      alert('Đã xóa key và hủy liên kết sản phẩm thành công!');
    } catch (error) {
      console.error('Error deleting license:', error);
      alert('Xóa key thất bại: ' + error.message);
    }
  }
  if (!authLoading && !isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  const filteredLicenses = licenses.filter(license => {
    // Skip if the product does not require HWID
    const product = productsMap[license.productId];
    if (product && product.requireHwid === false) return false;

    const licId = license.id || '';
    const hwid = license.hwid || '';
    const email = license.userEmail || users[license.userId]?.email || '';
    
    const matchesSearch = licId.toLowerCase().includes(searchTerm.toLowerCase()) || 
      hwid.toLowerCase().includes(searchTerm.toLowerCase()) || 
      email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTool = toolFilter === '' ? true : license.productId === toolFilter;
    const matchesStatus = statusFilter === '' ? true : license.status === statusFilter;

    return matchesSearch && matchesTool && matchesStatus;
  });

 return (
 <div className="min-h-screen bg-background text-on-background">
 <Navbar />

 <main className="md:ml-sidebar-width pt-header-height min-h-screen pb-12">
 <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop py-8">
 
 {/* Page Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
 <div>
 <h2 className="font-headline-lg text-headline-lg font-bold text-on-background">Quản lý Bản Quyền</h2>
 <p className="text-on-surface-variant mt-1">Cấp phát, gia hạn, thu hồi bản quyền phần mềm. Tổng cộng: <strong>{totalCount}</strong> bản quyền.</p>
 </div>
 <button 
 onClick={() => setShowModal(true)}
 className="bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-label-md text-label-md px-6 py-3 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
 >
 <span className="material-symbols-outlined" style={{ fontSize:'20px' }}>add</span>
 Cấp Bản Quyền Mới
 </button>
 </div>

 {/* Filter Bar */}
 <div className="bg-surface border border-outline-variant rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end shadow-sm">
 <div>
 <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5">Tìm kiếm</label>
 <div className="relative">
 <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
 <input 
 className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body-md text-body-md text-on-surface placeholder:text-outline transition-all" 
 placeholder="Mã đơn hàng, HWID hoặc email..." 
 type="text"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 </div>

 <div>
 <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5">Lọc theo Tool</label>
 <div className="relative">
 <select 
 className="w-full pl-4 pr-10 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body-md text-body-md text-on-surface appearance-none cursor-pointer"
 value={toolFilter}
 onChange={(e) => setToolFilter(e.target.value)}
 >
 <option value="">Tất cả các Tool</option>
 {products.map(p => (
 <option key={p.id} value={p.id}>{p.name}</option>
 ))}
 </select>
 <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
 </div>
 </div>

 <div>
 <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5">Trạng thái</label>
 <div className="relative">
 <select 
 className="w-full pl-4 pr-10 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body-md text-body-md text-on-surface appearance-none cursor-pointer"
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 >
 <option value="">Tất cả trạng thái</option>
 <option value="active">Active (Đang chạy)</option>
 <option value="pending">Pending (Chưa kích hoạt)</option>
 <option value="expired">Expired (Hết hạn)</option>
 <option value="revoked">Revoked (Thu hồi)</option>
 </select>
 <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
 </div>
 </div>

 <button 
 onClick={() => { setSearchTerm(''); setToolFilter(''); setStatusFilter(''); }}
 className="px-4 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 h-[42px] transition-colors"
 >
 <span className="material-symbols-outlined" style={{ fontSize:'18px' }}>filter_alt_off</span>
 Xóa Bộ Lọc
 </button>
 </div>

 {loading ? (
 <div className="flex flex-col items-center justify-center py-20">
 <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
 <p className="text-secondary">Đang tải danh sách key...</p>
 </div>
 ) : (
 /* Data Table Card */
 <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-surface-container-low border-b border-outline-variant font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-xs">
 <th className="px-6 py-4">Tên Tool</th>
 <th className="px-6 py-4">Trạng thái</th>
 <th className="px-6 py-4">User</th>
 <th className="px-6 py-4">HWID</th>
 <th className="px-6 py-4">Ngày Hết Hạn</th>
 <th className="px-6 py-4 text-center">Thao tác</th>
 </tr>
 </thead>
 <tbody className="font-body-md text-body-md divide-y divide-outline-variant text-sm text-on-surface">
 {filteredLicenses.length > 0 ? (
 filteredLicenses.map(license => {
 const product = productsMap[license.productId];
 return (
 <tr key={license.id} className="hover:bg-surface-container-low transition-colors">
 <td className="px-6 py-4 font-semibold">
 {product?.name || license.productName || license.productId}
 </td>
 <td className="px-6 py-4">
 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${license.status ==='active' ?'bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]' : license.status ==='expired' ?'bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]' :'bg-[#fef3c7] text-[#92400e] border border-[#fde68a]'}`}>
 {license.status ==='active' ?'Active' : license.status ==='expired' ?'Expired' : license.status ==='revoked' ?'Revoked' :'Pending'}
 </span>
 </td>
 <td className="px-6 py-4 text-on-surface-variant text-xs break-all">
 {license.userEmail || users[license.userId]?.email || (license.userId ? `ID: ${license.userId}` :'Chưa gán')}
 </td>
 <td className="px-6 py-4 font-mono text-xs text-on-surface-variant truncate max-w-[120px]" title={license.hwid ||'Chưa gắn'}>
 {license.hwid ||'-'}
 </td>
 <td className="px-6 py-4 text-on-surface-variant font-semibold">
 {license.plan ==='lifetime' ?'Vĩnh viễn' : license.expiresAt?.toDate ? license.expiresAt.toDate().toLocaleDateString('vi-VN') : license.expiresAt ? new Date(license.expiresAt).toLocaleDateString('vi-VN') :'Không giới hạn'}
 </td>
 <td className="px-6 py-4 text-center">
 <div className="flex items-center justify-center gap-1.5">
 <button 
 onClick={() => handleToggleStatus(license.id, license.status)}
 className={`p-1.5 rounded transition-colors inline-flex items-center justify-center ${license.status ==='active' ?'text-error hover:bg-error-container/20' :'text-emerald-600 hover:bg-emerald-50'}`}
 title={license.status ==='active' ?'Thu hồi' :'Kích hoạt'}
 >
 <span className="material-symbols-outlined text-[18px]">
 {license.status ==='active' ?'block' :'play_arrow'}
 </span>
 </button>
 {license.hwid && (
 <button 
 onClick={() => handleResetHWID(license.id, license.hwid)}
 className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded transition-colors inline-flex items-center justify-center"
 title="Reset HWID"
 >
 <span className="material-symbols-outlined text-[18px]">restart_alt</span>
 </button>
 )}
 <button 
 onClick={() => openEditDateModal(license)}
 className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded transition-colors inline-flex items-center justify-center"
 title="Sửa ngày hết hạn"
 >
 <span className="material-symbols-outlined text-[18px]">edit_calendar</span>
 </button>
 <button 
 onClick={() => handleDeleteLicense(license.id)}
 className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded transition-colors inline-flex items-center justify-center"
 title="Xóa Bản Quyền"
 >
 <span className="material-symbols-outlined text-[18px]">delete</span>
 </button>
 </div>
 </td>
 </tr>
 );
 })
 ) : (
 <tr>
 <td colSpan="7" className="px-6 py-8 text-center text-secondary">
 Không tìm thấy bản quyền nào phù hợp.
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

 {/* Create Key Modal */}
 {showModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
 <div className="bg-surface-bright border border-outline-variant rounded-xl w-full max-w-md overflow-hidden shadow-xl animate-scaleIn">
 <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
 <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Cấp Bản Quyền / Đơn Hàng Mới</h3>
 <button onClick={() => setShowModal(false)} className="text-secondary hover:text-on-surface text-lg">✕</button>
 </div>
 <div className="p-6 space-y-4">
 
 <div>
 <label className="block font-label-md text-label-md text-secondary mb-1.5">Chọn Sản Phẩm (Tool)</label>
 <div className="relative">
 <select 
 className="w-full pl-4 pr-10 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface"
 value={newLicense.productId}
 onChange={(e) => setNewLicense({ ...newLicense, productId: e.target.value })}
 >
 {products.map(p => (
 <option key={p.id} value={p.id}>{p.name}</option>
 ))}
 </select>
 </div>
 </div>

 <div>
 <label className="block font-label-md text-label-md text-secondary mb-1.5 flex justify-between items-center">
 <span>Ngày Hết Hạn</span>
 <div className="flex items-center gap-1">
 <input 
 type="checkbox" 
 id="createIsLifetime" 
 checked={newLicense.isLifetime} 
 onChange={(e) => setNewLicense({ ...newLicense, isLifetime: e.target.checked })} 
 className="rounded text-primary focus:ring-primary"
 />
 <label htmlFor="createIsLifetime" className="text-xs font-semibold text-on-surface-variant cursor-pointer select-none">Vĩnh viễn</label>
 </div>
 </label>
 <input 
 type="date"
 disabled={newLicense.isLifetime}
 className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:border-primary disabled:bg-surface-container-high disabled:text-secondary"
 value={newLicense.expiryDate}
 onChange={(e) => setNewLicense({ ...newLicense, expiryDate: e.target.value })}
 />
 </div>

            <div>
              <label className="block font-label-md text-label-md text-secondary mb-1.5">Gán cho thành viên (Tùy chọn)</label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Nhập email thành viên để tìm kiếm..."
                  className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:border-primary text-sm placeholder:text-secondary/60"
                  value={userSearchTerm}
                  onChange={(e) => {
                    setUserSearchTerm(e.target.value);
                    if (e.target.value === '') {
                      setNewLicense(prev => ({ ...prev, userId: '' }));
                    }
                  }}
                />
                {isSearchingUsers && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {searchedUsers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-surface-container border border-outline-variant rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {searchedUsers.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setNewLicense(prev => ({ ...prev, userId: u.id }));
                          setUsers(prev => ({ ...prev, [u.id]: u }));
                          setUserSearchTerm(u.email);
                          setSearchedUsers([]);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-surface-container-high text-xs text-on-surface border-b border-outline-variant/30 last:border-0"
                      >
                        <span className="font-bold">{u.email}</span> {u.displayName ? `(${u.displayName})` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {newLicense.userId && (
                <div className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Đã chọn: {users[newLicense.userId]?.email}
                </div>
              )}
            </div>

 <div>
 <label className="block font-label-md text-label-md text-secondary mb-1.5">HWID thiết bị khóa (Tùy chọn)</label>
 <input 
 type="text" 
 placeholder="Để trống để user tự kích hoạt..."
 className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:border-primary font-mono-sm text-xs"
 value={newLicense.hwid}
 onChange={(e) => setNewLicense({ ...newLicense, hwid: e.target.value })}
 />
 </div>

 </div>
 <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3">
 <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
 Hủy
 </button>
 <button onClick={handleCreateLicense} className="px-5 py-2 bg-primary text-on-primary rounded-lg hover:bg-on-primary-fixed-variant transition-colors font-bold">
 Tạo Đơn Hàng
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Edit Expiry Date Modal */}
 {showEditModal && editingLicense && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
 <div className="bg-surface-bright border border-outline-variant rounded-xl w-full max-w-md overflow-hidden shadow-xl animate-scaleIn">
 <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
 <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Cập nhật Ngày Hết Hạn</h3>
 <button onClick={() => setShowEditModal(false)} className="text-secondary hover:text-on-surface text-lg">✕</button>
 </div>
 <div className="p-6 space-y-4">
 
 <div>
 <label className="block text-secondary text-xs uppercase mb-1">Mã đơn hàng (ID)</label>
 <div className="font-mono text-sm font-bold text-on-surface bg-surface-container px-3 py-2 rounded border border-outline-variant select-all">
 {editingLicense.id}
 </div>
 </div>

 <div>
 <label className="block font-label-md text-label-md text-secondary mb-1.5 flex justify-between items-center">
 <span>Ngày Hết Hạn Mới</span>
 <div className="flex items-center gap-1">
 <input 
 type="checkbox" 
 id="editIsLifetime" 
 checked={editIsLifetime} 
 onChange={(e) => setEditIsLifetime(e.target.checked)} 
 className="rounded text-primary focus:ring-primary"
 />
 <label htmlFor="editIsLifetime" className="text-xs font-semibold text-on-surface-variant cursor-pointer select-none">Vĩnh viễn</label>
 </div>
 </label>
 <input 
 type="date"
 disabled={editIsLifetime}
 className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:border-primary disabled:bg-surface-container-high disabled:text-secondary"
 value={editDateInput}
 onChange={(e) => setEditDateInput(e.target.value)}
 />
 </div>

 </div>
 <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3">
 <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
 Hủy
 </button>
 <button onClick={handleSaveExpiryDate} className="px-5 py-2 bg-primary text-on-primary rounded-lg hover:bg-on-primary-fixed-variant transition-colors font-bold">
 Lưu Thay Đổi
 </button>
 </div>
 </div>
 </div>
 )}

 </div>
 );
}
